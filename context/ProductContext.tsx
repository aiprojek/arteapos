
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext'; 
import { useCloudSync } from './CloudSyncContext'; 
import type { Product, RawMaterial, InventorySettings, StockAdjustment, StockTransferPayload } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface OpnameItem {
    id: string;
    type: 'product' | 'raw_material';
    systemStock: number;
    actualStock: number;
    name: string;
}

interface ProductContextType {
  products: Product[];
  categories: string[];
  rawMaterials: RawMaterial[];
  inventorySettings: InventorySettings;
  stockAdjustments: StockAdjustment[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  findProductByBarcode: (barcode: string) => Product | undefined;
  addRawMaterial: (material: Omit<RawMaterial, 'id'>) => void;
  updateRawMaterial: (material: RawMaterial) => void;
  deleteRawMaterial: (materialId: string) => void;
  updateInventorySettings: (settings: InventorySettings) => void;
  addStockAdjustment: (productId: string, quantity: number, notes?: string) => void;
  performStockOpname: (items: OpnameItem[], notes?: string) => void;
  bulkAddProducts: (newProducts: Product[]) => void;
  bulkAddRawMaterials: (newRawMaterials: RawMaterial[]) => void;
  isProductAvailable: (product: Product) => { available: boolean, reason: string };
  importStockAdjustments: (adjustments: StockAdjustment[]) => void;
  processIncomingTransfers: (transfers: StockTransferPayload[]) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

function base64ToBlob(base64: string): Blob {
    const [meta, data] = base64.split(',');
    if (!meta || !data) {
        return new Blob();
    }
    const mime = meta.match(/:(.*?);/)?.[1];
    const bstr = atob(data);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

export const ProductProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { data, setData } = useData();
  const { logAudit } = useAudit(); 
  const { triggerAutoSync } = useCloudSync(); 
  const { products, categories, rawMaterials, inventorySettings, stockAdjustments, receiptSettings } = data;
  const { showAlert } = useUI();
  const { currentUser } = useAuth();

  const getStaffName = () => currentUser?.name || 'Staff';

  // ... (Other functions unchanged: addProduct, updateProduct, etc.)
  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Date.now().toString() };
    setData(prev => ({ ...prev, products: [...prev.products, newProduct] }));
  }, [setData]);

  const updateProduct = useCallback((updatedProduct: Product) => {
    const oldProduct = products.find(p => p.id === updatedProduct.id);
    if (oldProduct && oldProduct.price !== updatedProduct.price) {
        const oldFmt = CURRENCY_FORMATTER.format(oldProduct.price);
        const newFmt = CURRENCY_FORMATTER.format(updatedProduct.price);
        logAudit(currentUser, 'UPDATE_PRICE', `Harga produk '${updatedProduct.name}' diubah dari ${oldFmt} menjadi ${newFmt}`, updatedProduct.id);
    }

    setData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    }));
  }, [setData, products, logAudit, currentUser]);

  const deleteProduct = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    showAlert({
      type: 'confirm',
      title: 'Hapus Produk?',
      message: 'Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat diurungkan.',
      onConfirm: () => {
        if(product) {
            logAudit(currentUser, 'DELETE_PRODUCT', `Produk '${product.name}' dihapus permanen.`, productId);
        }
        setData(prev => ({ ...prev, products: prev.products.filter(p => p.id !== productId) }));
      },
      confirmVariant: 'danger',
      confirmText: 'Ya, Hapus'
    });
  }, [setData, showAlert, products, logAudit, currentUser]);

  const addCategory = useCallback((category: string) => {
    setData(prev => {
        const lowerCaseCategories = prev.categories.map(c => c.toLowerCase());
        if (!lowerCaseCategories.includes(category.toLowerCase())) {
            return { ...prev, categories: [...prev.categories, category].sort() };
        }
        return prev;
    });
  }, [setData]);

  const deleteCategory = useCallback((categoryToDelete: string) => {
    setData(prev => ({ ...prev, categories: prev.categories.filter(c => c !== categoryToDelete) }));
  }, [setData]);

  const findProductByBarcode = useCallback((barcode: string) => {
    const currentStoreId = receiptSettings.storeId;
    return products.find(p => {
        if (p.barcode !== barcode) return false;
        if (p.validStoreIds && p.validStoreIds.length > 0 && currentStoreId) {
            return p.validStoreIds.includes(currentStoreId);
        }
        return true;
    });
  }, [products, receiptSettings.storeId]);

  const addRawMaterial = useCallback((material: Omit<RawMaterial, 'id'>) => {
    const newMaterial = { ...material, id: Date.now().toString() };
    setData(prev => ({ ...prev, rawMaterials: [...prev.rawMaterials, newMaterial] }));
  }, [setData]);

  const updateRawMaterial = useCallback((updatedMaterial: RawMaterial) => {
    setData(prev => ({
      ...prev,
      rawMaterials: prev.rawMaterials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m)
    }));
  }, [setData]);

  const deleteRawMaterial = useCallback((materialId: string) => {
    showAlert({
        type: 'confirm',
        title: 'Hapus Bahan Baku?',
        message: 'Apakah Anda yakin ingin menghapus bahan baku ini? Ini mungkin mempengaruhi resep produk.',
        onConfirm: () => {
            setData(prev => ({ ...prev, rawMaterials: prev.rawMaterials.filter(m => m.id !== materialId) }));
        },
        confirmVariant: 'danger',
        confirmText: 'Ya, Hapus'
    });
  }, [setData, showAlert]);
  
  const updateInventorySettings = useCallback((settings: InventorySettings) => {
    setData(prev => ({ ...prev, inventorySettings: settings }));
  }, [setData]);

  const addStockAdjustment = useCallback((productId: string, quantity: number, notes?: string) => {
    setData(prev => {
        const productIndex = prev.products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            const materialIndex = prev.rawMaterials.findIndex(m => m.id === productId);
            if (materialIndex === -1) return prev;

            const material = prev.rawMaterials[materialIndex];
            const newStock = (material.stock || 0) + quantity;
            const updatedMaterial = { ...material, stock: newStock };
            const updatedMaterials = [...prev.rawMaterials];
            updatedMaterials[materialIndex] = updatedMaterial;

            const newAdjustment: StockAdjustment = {
                id: Date.now().toString(),
                productId: material.id,
                productName: material.name,
                change: quantity,
                newStock,
                notes,
                createdAt: new Date().toISOString(),
            };
            
            return {
                ...prev,
                rawMaterials: updatedMaterials,
                stockAdjustments: [newAdjustment, ...(prev.stockAdjustments || [])]
            }
        }

        const product = prev.products[productIndex];
        const newStock = (product.stock || 0) + quantity;
        
        const updatedProduct: Product = { ...product, stock: newStock };
        const updatedProducts = [...prev.products];
        updatedProducts[productIndex] = updatedProduct;

        const newAdjustment: StockAdjustment = {
            id: Date.now().toString(),
            productId: product.id,
            productName: product.name,
            change: quantity,
            newStock,
            notes,
            createdAt: new Date().toISOString(),
        };

        const currentAdjustments = prev.stockAdjustments || [];

        return {
            ...prev,
            products: updatedProducts,
            stockAdjustments: [newAdjustment, ...currentAdjustments],
        };
    });
    setTimeout(() => triggerAutoSync(getStaffName()), 500);
  }, [setData, triggerAutoSync, currentUser]);

  const performStockOpname = useCallback((items: OpnameItem[], notes: string = '') => {
      // ... (unchanged)
      const count = items.filter(i => i.systemStock !== i.actualStock).length;
      if (count > 0) {
          logAudit(currentUser, 'STOCK_OPNAME', `Melakukan stock opname massal. ${count} item disesuaikan. ${notes}`, 'BATCH-OPNAME');
      }

      setData(prev => {
          let updatedProducts = [...prev.products];
          let updatedMaterials = [...prev.rawMaterials];
          let newAdjustments: StockAdjustment[] = [];
          const now = new Date().toISOString();

          items.forEach((item, index) => {
              const diff = item.actualStock - item.systemStock;
              if (diff === 0) return;

              if (item.type === 'product') {
                  const pIdx = updatedProducts.findIndex(p => p.id === item.id);
                  if (pIdx > -1) {
                      updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: item.actualStock };
                  }
              } else {
                  const mIdx = updatedMaterials.findIndex(m => m.id === item.id);
                  if (mIdx > -1) {
                      updatedMaterials[mIdx] = { ...updatedMaterials[mIdx], stock: item.actualStock };
                  }
              }

              newAdjustments.push({
                  id: `${Date.now()}-${index}`,
                  productId: item.id,
                  productName: item.name,
                  change: diff,
                  newStock: item.actualStock,
                  notes: `[Stock Opname] ${notes}`,
                  createdAt: now
              });
          });

          return {
              ...prev,
              products: updatedProducts,
              rawMaterials: updatedMaterials,
              stockAdjustments: [...newAdjustments, ...(prev.stockAdjustments || [])]
          };
      });
      setTimeout(() => triggerAutoSync(getStaffName()), 500);
  }, [setData, logAudit, currentUser, triggerAutoSync]);

  const bulkAddProducts = useCallback((newProducts: Product[]) => {
    setData(prev => {
        const productsWithBlobs = newProducts.map(p => {
            const prod: any = { ...p };
            if (prod.imageUrl && prod.imageUrl.startsWith('data:')) {
                prod.image = base64ToBlob(prod.imageUrl);
                delete prod.imageUrl;
            }
            return prod;
        });

        const productMap = new Map(prev.products.map(p => [p.id, p]));
        productsWithBlobs.forEach(p => productMap.set(p.id, p));
        return { ...prev, products: Array.from(productMap.values()) };
    });
  }, [setData]);

  const bulkAddRawMaterials = useCallback((newRawMaterials: RawMaterial[]) => {
    setData(prev => {
        const materialMap = new Map(prev.rawMaterials.map(m => [m.id, m]));
        newRawMaterials.forEach(m => materialMap.set(m.id, m));
        return { ...prev, rawMaterials: Array.from(materialMap.values()) };
    });
  }, [setData]);

  const isProductAvailable = useCallback((product: Product): { available: boolean, reason: string } => {
    if (!inventorySettings.enabled) return { available: true, reason: '' };
    if (!inventorySettings.preventNegativeStock) return { available: true, reason: '' };

    if (inventorySettings.trackIngredients && product.recipe && product.recipe.length > 0) {
      for (const recipeItem of product.recipe) {
        if (recipeItem.itemType === 'product' && recipeItem.productId) {
            const bundledProduct = products.find(p => p.id === recipeItem.productId);
            if (!bundledProduct) return { available: false, reason: 'Produk Komponen Hilang' };
            if (bundledProduct.trackStock && (bundledProduct.stock ?? 0) < recipeItem.quantity) {
                 return { available: false, reason: `Stok ${bundledProduct.name} Kurang` };
            }
            if (!bundledProduct.trackStock && bundledProduct.recipe?.length) {
                 const result = isProductAvailable(bundledProduct);
                 if(!result.available) return { available: false, reason: `Komponen ${bundledProduct.name} Habis` };
            }
        } else {
            const materialId = recipeItem.rawMaterialId;
            const material = rawMaterials.find(m => m.id === materialId);
            if (!material || material.stock < recipeItem.quantity) {
              return { available: false, reason: `Bahan ${material?.name || 'Baku'} Habis` };
            }
        }
      }
      return { available: true, reason: '' };
    }

    if (product.trackStock) {
      if ((product.stock ?? 0) <= 0) {
        return { available: false, reason: 'Stok Habis' };
      }
    }
    
    return { available: true, reason: '' };
  }, [inventorySettings, rawMaterials, products]);

  const importStockAdjustments = useCallback((newAdjustments: StockAdjustment[]) => {
      setData(prev => {
          const existingIds = new Set(prev.stockAdjustments?.map(a => a.id) || []);
          const uniqueNew = newAdjustments.filter(a => !existingIds.has(a.id));
          if (uniqueNew.length === 0) return prev;

          return {
              ...prev,
              stockAdjustments: [...uniqueNew, ...(prev.stockAdjustments || [])].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          };
      });
  }, [setData]);

  // NEW: Process Incoming Transfers from Cloud
  const processIncomingTransfers = useCallback((transfers: StockTransferPayload[]) => {
      if (transfers.length === 0) return;

      let totalAdded = 0;
      
      setData(prev => {
          let updatedProducts = [...prev.products];
          let updatedMaterials = [...prev.rawMaterials];
          let newAdjustments: StockAdjustment[] = [];
          const now = new Date().toISOString();

          transfers.forEach(transfer => {
              const transferNote = `Transfer dari ${transfer.fromStoreId} (${new Date(transfer.timestamp).toLocaleDateString()})`;
              
              transfer.items.forEach((item, idx) => {
                  if (item.type === 'product') {
                      const pIdx = updatedProducts.findIndex(p => p.id === item.id);
                      if (pIdx > -1 && updatedProducts[pIdx].trackStock) {
                          const oldStock = updatedProducts[pIdx].stock || 0;
                          const newStock = oldStock + item.qty;
                          updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: newStock };
                          
                          newAdjustments.push({
                              id: `TRANS-IN-${transfer.id}-${idx}`,
                              productId: item.id,
                              productName: item.name,
                              change: item.qty,
                              newStock: newStock,
                              notes: `${transferNote} - ${transfer.notes || ''}`,
                              createdAt: now
                          });
                          totalAdded++;
                      }
                  } else {
                      const mIdx = updatedMaterials.findIndex(m => m.id === item.id);
                      if (mIdx > -1) {
                          const oldStock = updatedMaterials[mIdx].stock || 0;
                          const newStock = oldStock + item.qty;
                          updatedMaterials[mIdx] = { ...updatedMaterials[mIdx], stock: newStock };

                          newAdjustments.push({
                              id: `TRANS-IN-${transfer.id}-${idx}`,
                              productId: item.id,
                              productName: item.name,
                              change: item.qty,
                              newStock: newStock,
                              notes: `${transferNote} - ${transfer.notes || ''}`,
                              createdAt: now
                          });
                          totalAdded++;
                      }
                  }
              });
          });

          return {
              ...prev,
              products: updatedProducts,
              rawMaterials: updatedMaterials,
              stockAdjustments: [...newAdjustments, ...(prev.stockAdjustments || [])]
          }
      });

      if (totalAdded > 0) {
          logAudit(currentUser, 'STOCK_TRANSFER_IN', `Menerima ${totalAdded} item stok transfer dari Pusat/Gudang.`, 'BATCH-TRANSFER');
          setTimeout(() => triggerAutoSync(getStaffName()), 1000);
      }
  }, [setData, logAudit, currentUser, triggerAutoSync]);

  return (
    <ProductContext.Provider value={{
      products,
      categories,
      rawMaterials,
      inventorySettings,
      stockAdjustments: stockAdjustments || [],
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      deleteCategory,
      findProductByBarcode,
      addRawMaterial,
      updateRawMaterial,
      deleteRawMaterial,
      updateInventorySettings,
      addStockAdjustment,
      performStockOpname,
      bulkAddProducts,
      bulkAddRawMaterials,
      isProductAvailable,
      importStockAdjustments,
      processIncomingTransfers
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};

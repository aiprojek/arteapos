
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useCatalogData, useDataActions } from './DataContext';
import { useUIActions } from './UIContext';
import { useAuthState } from './AuthContext';
import { applyChannelSalesToData } from '../services/channelSalesService';
import {
  applyStockAdjustmentToData,
  performStockOpnameToData,
  processIncomingTransfersToData,
  processOutgoingTransferToData,
} from '../services/inventoryService';
import {
  importStockAdjustmentsToData,
  mergeProductsToData,
  mergeRawMaterialsToData,
} from '../services/importService';
import {
  addCategoryToData,
  addProductToData,
  addRawMaterialToData,
  canDeleteRawMaterial,
  deleteCategoryFromData,
  deleteProductFromData,
  deleteRawMaterialFromData,
  updateInventorySettingsInData,
  updateProductInData,
  updateRawMaterialInData,
} from '../services/productCrudService';
import { emitAuditEvent, requestAutoSync } from '../services/appEvents';
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
  processOutgoingTransfer: (targetStoreId: string, items: StockTransferPayload['items'], notes: string) => void;
  applyChannelSales: (items: { productId: string; quantity: number }[], channel: string, notes?: string) => boolean;
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
  const { setData } = useDataActions();
  const {
    products,
    categories,
    rawMaterials,
    inventorySettings,
    stockAdjustments,
    receiptSettings,
  } = useCatalogData();
  const { showAlert } = useUIActions();
  const { currentUser } = useAuthState();

  const getStaffName = () => currentUser?.name || 'Staff';

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    setData(prev => addProductToData(prev, product, Date.now().toString()));
  }, [setData]);

  const updateProduct = useCallback((updatedProduct: Product) => {
    const oldProduct = products.find(p => p.id === updatedProduct.id);
    if (oldProduct && oldProduct.price !== updatedProduct.price) {
        const oldFmt = CURRENCY_FORMATTER.format(oldProduct.price);
        const newFmt = CURRENCY_FORMATTER.format(updatedProduct.price);
        emitAuditEvent({ user: currentUser, action: 'UPDATE_PRICE', details: `Harga produk '${updatedProduct.name}' diubah dari ${oldFmt} menjadi ${newFmt}`, targetId: updatedProduct.id });
    }

    setData(prev => updateProductInData(prev, updatedProduct));
  }, [setData, products, currentUser]);

  const deleteProduct = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    showAlert({
      type: 'confirm',
      title: 'Hapus Produk?',
      message: 'Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat diurungkan.',
      onConfirm: () => {
        if(product) {
            emitAuditEvent({ user: currentUser, action: 'DELETE_PRODUCT', details: `Produk '${product.name}' dihapus permanen.`, targetId: productId });
        }
        setData(prev => deleteProductFromData(prev, productId));
      },
      confirmVariant: 'danger',
      confirmText: 'Ya, Hapus'
    });
  }, [setData, showAlert, products, currentUser]);

  const addCategory = useCallback((category: string) => {
    setData(prev => addCategoryToData(prev, category));
  }, [setData]);

  const deleteCategory = useCallback((categoryToDelete: string) => {
    setData(prev => deleteCategoryFromData(prev, categoryToDelete));
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
    setData(prev => addRawMaterialToData(prev, material, Date.now().toString()));
  }, [setData]);

  const updateRawMaterial = useCallback((updatedMaterial: RawMaterial) => {
    setData(prev => updateRawMaterialInData(prev, updatedMaterial));
  }, [setData]);

  const deleteRawMaterial = useCallback((materialId: string) => {
    const dependencyCheck = canDeleteRawMaterial(products, materialId);
    if (!dependencyCheck.canDelete) {
        showAlert({
            type: 'alert',
            title: 'Gagal Menghapus',
            message: dependencyCheck.message || 'Bahan baku tidak bisa dihapus.'
        });
        return;
    }

    showAlert({
        type: 'confirm',
        title: 'Hapus Bahan Baku?',
        message: 'Apakah Anda yakin ingin menghapus bahan baku ini?',
        onConfirm: () => {
            setData(prev => deleteRawMaterialFromData(prev, materialId));
        },
        confirmVariant: 'danger',
        confirmText: 'Ya, Hapus'
    });
  }, [setData, showAlert, products]);
  
  const updateInventorySettings = useCallback((settings: InventorySettings) => {
    setData(prev => updateInventorySettingsInData(prev, settings));
  }, [setData]);

  const addStockAdjustment = useCallback((productId: string, quantity: number, notes?: string) => {
    setData(prev => applyStockAdjustmentToData({ prevData: prev, productId, quantity, notes }));
    setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
  }, [setData, currentUser]);

  const applyChannelSales = useCallback((items: { productId: string; quantity: number }[], channel: string, notes: string = ''): boolean => {
    let success = false;
    let error: { title: string; message: string } | undefined;
    let finalNote = '';

    const cleanItems = items.filter(i => i.productId && i.quantity > 0);

    setData(prev => {
      const result = applyChannelSalesToData({
        prevData: prev,
        items,
        channel,
        notes,
      });

      if (!result.ok || !result.nextData) {
        error = result.error;
        return prev;
      }

      success = true;
      finalNote = result.finalNote || channel;
      return result.nextData;
    });

    if (!success) {
      if (error) {
        showAlert({ type: 'alert', title: error.title, message: error.message });
      }
      return false;
    }

    emitAuditEvent({
      user: currentUser,
      action: 'CHANNEL_SALE',
      details: `Pengurangan stok channel online: ${cleanItems.length} item. ${finalNote}`,
      targetId: 'CHANNEL-SALE',
    });

    setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    return true;
  }, [setData, currentUser, showAlert]);

  const performStockOpname = useCallback((items: OpnameItem[], notes: string = '') => {
      const count = items.filter(i => i.systemStock !== i.actualStock).length;
      if (count > 0) {
          emitAuditEvent({ user: currentUser, action: 'STOCK_OPNAME', details: `Melakukan stock opname massal. ${count} item disesuaikan. ${notes}`, targetId: 'BATCH-OPNAME' });
      }

      setData(prev => performStockOpnameToData({ prevData: prev, items, notes }));
      setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
  }, [setData, currentUser]);

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
        return mergeProductsToData(prev, productsWithBlobs);
    });
  }, [setData]);

  const bulkAddRawMaterials = useCallback((newRawMaterials: RawMaterial[]) => {
    setData(prev => mergeRawMaterialsToData(prev, newRawMaterials));
  }, [setData]);

  const isProductAvailable = useCallback((product: Product): { available: boolean, reason: string } => {
    if (!inventorySettings.enabled) return { available: true, reason: '' };
    if (!inventorySettings.preventNegativeStock) return { available: true, reason: '' };

    // Cek Stok Bahan Baku (Resep)
    if (inventorySettings.trackIngredients && product.recipe && product.recipe.length > 0) {
      for (const recipeItem of product.recipe) {
        if (recipeItem.itemType === 'product' && recipeItem.productId) {
            // Nested Product
            const bundledProduct = products.find(p => p.id === recipeItem.productId);
            if (!bundledProduct) return { available: false, reason: 'Komponen Hilang' };
            if (bundledProduct.trackStock && (bundledProduct.stock ?? 0) < recipeItem.quantity) {
                 return { available: false, reason: `${bundledProduct.name} Kurang` };
            }
            // Recursive check if bundled product also has recipe
            if (!bundledProduct.trackStock && bundledProduct.recipe?.length) {
                 const result = isProductAvailable(bundledProduct);
                 if(!result.available) return { available: false, reason: `Komponen ${bundledProduct.name} Habis` };
            }
        } else {
            // Raw Material
            const materialId = recipeItem.rawMaterialId;
            const material = rawMaterials.find(m => m.id === materialId);
            if (!material) return { available: false, reason: 'Bahan Hilang' };
            
            if (material.stock < recipeItem.quantity) {
              return { available: false, reason: `${material.name} Habis` };
            }
        }
      }
      return { available: true, reason: '' };
    }

    // Cek Stok Produk Langsung
    if (product.trackStock) {
      if ((product.stock ?? 0) <= 0) {
        return { available: false, reason: 'Stok Habis' };
      }
    }
    
    return { available: true, reason: '' };
  }, [inventorySettings, rawMaterials, products]);

  const importStockAdjustments = useCallback((newAdjustments: StockAdjustment[]) => {
      setData(prev => importStockAdjustmentsToData(prev, newAdjustments));
  }, [setData]);

  const processIncomingTransfers = useCallback((transfers: StockTransferPayload[]) => {
      if (transfers.length === 0) return;
      let totalAdded = 0;
      setData(prev => {
          const result = processIncomingTransfersToData({ prevData: prev, transfers });
          totalAdded = result.totalAdded;
          return result.nextData;
      });

      if (totalAdded > 0) {
          emitAuditEvent({ user: currentUser, action: 'STOCK_TRANSFER_IN', details: `Menerima ${totalAdded} item stok transfer dari Pusat/Gudang.`, targetId: 'BATCH-TRANSFER' });
          setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 1000);
      }
  }, [setData, currentUser]);

  const processOutgoingTransfer = useCallback((targetStoreId: string, items: StockTransferPayload['items'], notes: string) => {
      let error: { title: string; message: string } | undefined;
      setData(prev => {
          const result = processOutgoingTransferToData({ prevData: prev, targetStoreId, items, notes });
          error = result.error;
          return result.nextData;
      });

      if (error) {
          showAlert({ type: 'alert', title: error.title, message: error.message });
          return;
      }

      emitAuditEvent({ user: currentUser, action: 'STOCK_TRANSFER_OUT', details: `Mengirim ${items.length} jenis barang ke cabang ${targetStoreId}.`, targetId: 'BATCH-TRANSFER' });
      setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 1000);

  }, [setData, currentUser, showAlert]);

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
      processIncomingTransfers,
      processOutgoingTransfer,
      applyChannelSales
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

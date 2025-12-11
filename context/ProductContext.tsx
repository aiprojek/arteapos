

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import type { Product, RawMaterial, InventorySettings, StockAdjustment } from '../types';

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
  bulkAddProducts: (newProducts: Product[]) => void;
  bulkAddRawMaterials: (newRawMaterials: RawMaterial[]) => void;
  isProductAvailable: (product: Product) => { available: boolean, reason: string };
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
  const { products, categories, rawMaterials, inventorySettings, stockAdjustments } = data;
  const { showAlert } = useUI();

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Date.now().toString() };
    setData(prev => ({ ...prev, products: [...prev.products, newProduct] }));
  }, [setData]);

  const updateProduct = useCallback((updatedProduct: Product) => {
    setData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    }));
  }, [setData]);

  const deleteProduct = useCallback((productId: string) => {
    showAlert({
      type: 'confirm',
      title: 'Hapus Produk?',
      message: 'Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat diurungkan.',
      onConfirm: () => {
        setData(prev => ({ ...prev, products: prev.products.filter(p => p.id !== productId) }));
      },
      confirmVariant: 'danger',
      confirmText: 'Ya, Hapus'
    });
  }, [setData, showAlert]);

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
    return products.find(p => p.barcode === barcode);
  }, [products]);

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
        if (productIndex === -1) return prev;

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
  }, [setData]);

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

    if (inventorySettings.trackIngredients && product.recipe && product.recipe.length > 0) {
      for (const recipeItem of product.recipe) {
        if (recipeItem.itemType === 'product' && recipeItem.productId) {
            // Check bundled product availability
            const bundledProduct = products.find(p => p.id === recipeItem.productId);
            if (!bundledProduct) return { available: false, reason: 'Produk Komponen Hilang' };
            
            // Recursive check? For now, simpler: check direct stock or its own availability if it's bundled too
            // Note: Preventing infinite recursion is key. For now we assume stock check.
            if (bundledProduct.trackStock && (bundledProduct.stock ?? 0) < recipeItem.quantity) {
                 return { available: false, reason: `Stok ${bundledProduct.name} Kurang` };
            }
            
            // If bundled product is ALSO a recipe, we should theoretically recurse, 
            // but for performance in a list, we might limit depth or rely on direct stock for simplicity in V1.
            // Let's do 1 level recursion check if it's not tracked by simple stock
            if (!bundledProduct.trackStock && bundledProduct.recipe?.length) {
                 const result = isProductAvailable(bundledProduct);
                 if(!result.available) return { available: false, reason: `Komponen ${bundledProduct.name} Habis` };
            }

        } else {
            // Check raw material
            const materialId = recipeItem.rawMaterialId;
            const material = rawMaterials.find(m => m.id === materialId);
            if (!material || material.stock < recipeItem.quantity) {
              return { available: false, reason: 'Bahan Baku Habis' };
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
      bulkAddProducts,
      bulkAddRawMaterials,
      isProductAvailable
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

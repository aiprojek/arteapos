import type { AppData, Product, RawMaterial, StockAdjustment } from '../types';

interface ChannelSaleItem {
  productId: string;
  quantity: number;
}

interface ValidationFailure {
  title: string;
  message: string;
}

interface ApplyChannelSalesInput {
  prevData: AppData;
  items: ChannelSaleItem[];
  channel: string;
  notes?: string;
  now?: Date;
}

interface ApplyChannelSalesResult {
  ok: boolean;
  error?: ValidationFailure;
  nextData?: AppData;
  finalNote?: string;
}

const validateStrictStock = (
  items: ChannelSaleItem[],
  products: Product[],
  rawMaterials: RawMaterial[],
  inventorySettings: AppData['inventorySettings']
): ValidationFailure | null => {
  if (!inventorySettings.enabled || !inventorySettings.preventNegativeStock) {
    return null;
  }

  for (const item of items) {
    const product = products.find(entry => entry.id === item.productId);
    if (!product) continue;
    const qty = item.quantity;

    if (product.trackStock && (product.stock || 0) < qty) {
      return {
        title: 'Stok Tidak Cukup',
        message: `Produk "${product.name}" hanya tersedia ${(product.stock || 0)}.`,
      };
    }

    if (inventorySettings.trackIngredients && product.recipe?.length) {
      for (const recipeItem of product.recipe) {
        const required = recipeItem.quantity * qty;

        if (recipeItem.itemType === 'raw_material' && recipeItem.rawMaterialId) {
          const material = rawMaterials.find(entry => entry.id === recipeItem.rawMaterialId);
          if (material && (material.stock || 0) < required) {
            return {
              title: 'Bahan Baku Tidak Cukup',
              message: `Bahan "${material.name}" hanya tersedia ${(material.stock || 0)}.`,
            };
          }
        }

        if (recipeItem.itemType === 'product' && recipeItem.productId) {
          const subProduct = products.find(entry => entry.id === recipeItem.productId);
          if (subProduct?.trackStock && (subProduct.stock || 0) < required) {
            return {
              title: 'Stok Tidak Cukup',
              message: `Produk "${subProduct.name}" hanya tersedia ${(subProduct.stock || 0)}.`,
            };
          }
        }
      }
    }
  }

  return null;
};

export const applyChannelSalesToData = ({
  prevData,
  items,
  channel,
  notes = '',
  now = new Date(),
}: ApplyChannelSalesInput): ApplyChannelSalesResult => {
  if (!items.length) {
    return { ok: false };
  }

  const cleanItems = items.filter(item => item.productId && item.quantity > 0);
  if (cleanItems.length === 0) {
    return { ok: false };
  }

  const validationError = validateStrictStock(
    cleanItems,
    prevData.products,
    prevData.rawMaterials,
    prevData.inventorySettings
  );

  if (validationError) {
    return { ok: false, error: validationError };
  }

  let updatedProducts = [...prevData.products];
  let updatedMaterials = [...prevData.rawMaterials];
  let updatedAdjustments = [...(prevData.stockAdjustments || [])];

  const createdAt = now.toISOString();
  const notePrefix = `Channel Online (${channel || 'Online'})`;
  const finalNote = notes ? `${notePrefix} - ${notes}` : notePrefix;

  cleanItems.forEach((item, idx) => {
    const productIndex = updatedProducts.findIndex(product => product.id === item.productId);
    if (productIndex === -1) return;

    const product = updatedProducts[productIndex];
    const qty = item.quantity;
    const logNotes = `${finalNote} (Item #${idx + 1})`;

    if (prevData.inventorySettings.enabled && prevData.inventorySettings.trackIngredients && product.recipe?.length) {
      product.recipe.forEach(recipeItem => {
        const deductionAmount = recipeItem.quantity * qty;

        if (recipeItem.itemType === 'raw_material' && recipeItem.rawMaterialId) {
          const materialIndex = updatedMaterials.findIndex(
            material => material.id === recipeItem.rawMaterialId
          );
          if (materialIndex > -1) {
            const oldStock = updatedMaterials[materialIndex].stock || 0;
            const newStock = oldStock - deductionAmount;
            updatedMaterials[materialIndex] = { ...updatedMaterials[materialIndex], stock: newStock };

            updatedAdjustments.unshift({
              id: `CH-MAT-${now.getTime()}-${recipeItem.rawMaterialId}-${idx}`,
              productId: recipeItem.rawMaterialId,
              productName: updatedMaterials[materialIndex].name,
              change: -deductionAmount,
              newStock,
              notes: logNotes,
              createdAt,
            });
          }
        } else if (recipeItem.itemType === 'product' && recipeItem.productId) {
          const subIndex = updatedProducts.findIndex(productEntry => productEntry.id === recipeItem.productId);
          if (subIndex > -1 && updatedProducts[subIndex].trackStock) {
            const oldStock = updatedProducts[subIndex].stock || 0;
            const newStock = oldStock - deductionAmount;
            updatedProducts[subIndex] = { ...updatedProducts[subIndex], stock: newStock };

            updatedAdjustments.unshift({
              id: `CH-SUB-${now.getTime()}-${recipeItem.productId}-${idx}`,
              productId: recipeItem.productId,
              productName: updatedProducts[subIndex].name,
              change: -deductionAmount,
              newStock,
              notes: logNotes,
              createdAt,
            });
          }
        }
      });
    }

    if (prevData.inventorySettings.enabled && product.trackStock) {
      const oldStock = product.stock || 0;
      const newStock = oldStock - qty;
      updatedProducts[productIndex] = { ...product, stock: newStock };

      updatedAdjustments.unshift({
        id: `CH-PROD-${now.getTime()}-${product.id}-${idx}`,
        productId: product.id,
        productName: product.name,
        change: -qty,
        newStock,
        notes: logNotes,
        createdAt,
      });
    }
  });

  return {
    ok: true,
    finalNote,
    nextData: {
      ...prevData,
      products: updatedProducts,
      rawMaterials: updatedMaterials,
      stockAdjustments: updatedAdjustments,
    },
  };
};

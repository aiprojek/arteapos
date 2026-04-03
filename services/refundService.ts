import type { AppData, StockAdjustment, Transaction } from '../types';

interface RefundTransactionInput {
  prevData: AppData;
  transactionId: string;
  adjustmentIdFactory: (key: string) => string;
  now?: Date;
}

interface RefundTransactionResult {
  nextData: AppData;
  refundedTransaction: Transaction | null;
}

export const refundTransactionInData = ({
  prevData,
  transactionId,
  adjustmentIdFactory,
  now = new Date(),
}: RefundTransactionInput): RefundTransactionResult => {
  const targetTransaction = prevData.transactionRecords.find(t => t.id === transactionId);
  if (!targetTransaction || targetTransaction.paymentStatus === 'refunded') {
    return { nextData: prevData, refundedTransaction: null };
  }

  const updatedTransaction: Transaction = { ...targetTransaction, paymentStatus: 'refunded' };
  const updatedTransactions = prevData.transactionRecords.map(transaction =>
    transaction.id === transactionId ? updatedTransaction : transaction
  );

  let updatedProducts = [...prevData.products];
  let updatedRawMaterials = [...prevData.rawMaterials];
  let updatedCustomers = [...prevData.customers];
  let updatedStockAdjustments = [...(prevData.stockAdjustments || [])];

  if (prevData.inventorySettings.enabled) {
    const cartItems = (targetTransaction.items || []).filter(
      item => !(item.isReward && item.price === 0)
    );

    cartItems.forEach(item => {
      const product = prevData.products.find(p => p.id === item.id);
      const recipeToRestore = item.recipe || product?.recipe;

      if (prevData.inventorySettings.trackIngredients && recipeToRestore?.length) {
        recipeToRestore.forEach(recipeItem => {
          const totalToRestore = recipeItem.quantity * item.quantity;

          if (recipeItem.itemType === 'product' && recipeItem.productId) {
            const productIndex = updatedProducts.findIndex(p => p.id === recipeItem.productId);
            if (productIndex > -1) {
              const currentStock = updatedProducts[productIndex].stock || 0;
              const newStock = currentStock + totalToRestore;
              updatedProducts[productIndex] = { ...updatedProducts[productIndex], stock: newStock };

              if (updatedProducts[productIndex].trackStock) {
                updatedStockAdjustments.unshift({
                  id: adjustmentIdFactory(`ref-${recipeItem.productId}`),
                  productId: recipeItem.productId,
                  productName: updatedProducts[productIndex].name,
                  change: totalToRestore,
                  newStock,
                  notes: `Refund Transaksi #${transactionId.slice(-4)}`,
                  createdAt: now.toISOString(),
                });
              }
            }
          } else if (recipeItem.rawMaterialId) {
            const materialIndex = updatedRawMaterials.findIndex(m => m.id === recipeItem.rawMaterialId);
            if (materialIndex > -1) {
              updatedRawMaterials[materialIndex] = {
                ...updatedRawMaterials[materialIndex],
                stock: (updatedRawMaterials[materialIndex].stock || 0) + totalToRestore,
              };
            }
          }
        });
      }

      if (product?.trackStock) {
        const productIndex = updatedProducts.findIndex(p => p.id === product.id);
        if (productIndex > -1) {
          const currentStock = updatedProducts[productIndex].stock || 0;
          const newStock = currentStock + item.quantity;
          updatedProducts[productIndex] = { ...updatedProducts[productIndex], stock: newStock };

          updatedStockAdjustments.unshift({
            id: adjustmentIdFactory(`ref-${product.id}`),
            productId: product.id,
            productName: product.name,
            change: item.quantity,
            newStock,
            notes: `Refund Transaksi #${transactionId.slice(-4)}`,
            createdAt: now.toISOString(),
          });
        }
      }
    });
  }

  if (targetTransaction.customerId && targetTransaction.pointsEarned && prevData.membershipSettings.enabled) {
    const customerIndex = updatedCustomers.findIndex(c => c.id === targetTransaction.customerId);
    if (customerIndex > -1) {
      let pointsCorrection = -targetTransaction.pointsEarned;
      if (targetTransaction.rewardsRedeemed) {
        const pointsSpent = targetTransaction.rewardsRedeemed.reduce(
          (sum, reward) => sum + reward.pointsSpent,
          0
        );
        pointsCorrection += pointsSpent;
      }
      const newPoints = Math.max(0, updatedCustomers[customerIndex].points + pointsCorrection);
      updatedCustomers[customerIndex] = { ...updatedCustomers[customerIndex], points: newPoints };
    }
  }

  return {
    refundedTransaction: updatedTransaction,
    nextData: {
      ...prevData,
      transactionRecords: updatedTransactions,
      products: updatedProducts,
      rawMaterials: updatedRawMaterials,
      customers: updatedCustomers,
      stockAdjustments: updatedStockAdjustments,
    },
  };
};

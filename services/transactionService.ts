import type {
  AppData,
  CartItem,
  Discount,
  OrderType,
  Payment,
  PaymentStatus,
  Product,
  RawMaterial,
  ReceiptSettings,
  Reward,
  StockAdjustment,
  Transaction,
  User,
} from '../types';

interface AppliedReward {
  reward: Reward;
  cartItem: CartItem;
}

interface CartTotalsSnapshot {
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  finalTotal: number;
}

interface SaveTransactionInput {
  prevData: AppData;
  cart: CartItem[];
  cartDiscount: Discount | null;
  payments: Array<Omit<Payment, 'id' | 'createdAt'>>;
  customerName?: string;
  customerContact?: string;
  customerId?: string;
  currentUser: User;
  appliedRewards: AppliedReward[];
  activeHeldCartId: string | null;
  orderType: OrderType;
  tableNumber: string;
  paxCount: number;
  receiptSettings: ReceiptSettings;
  totals: CartTotalsSnapshot;
  now?: Date;
}

interface SaveTransactionResult {
  transaction: Transaction;
  nextData: AppData;
}

const buildTransactionId = (receiptSettings: ReceiptSettings, user: User, now: Date) => {
  const storeIdPrefix = receiptSettings.storeId
    ? receiptSettings.storeId.replace(/[^a-zA-Z0-9]/g, '')
    : 'LOC';
  const timestampId = now.getTime().toString();
  const userSuffix = user.id.slice(-4).replace(/[^a-zA-Z0-9]/g, 'X').toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();

  return `${storeIdPrefix}-${timestampId}-${userSuffix}${randomSuffix}`;
};

const lockCartCostSnapshot = (cart: CartItem[], products: Product[]) => {
  return cart.map(item => {
    const product = products.find(p => p.id === item.id);
    const addonsCost =
      item.selectedAddons?.reduce((sum, addon) => sum + (addon.costPrice || 0), 0) || 0;
    const itemCost = (item.costPrice || product?.costPrice || 0) + addonsCost;

    return { ...item, costPrice: itemCost };
  });
};

const applyInventoryDeduction = (
  cart: CartItem[],
  products: Product[],
  rawMaterials: RawMaterial[],
  inventoryEnabled: boolean,
  trackIngredients: boolean | undefined,
  transactionId: string,
  createdAt: string
) => {
  let updatedProducts = [...products];
  let updatedRawMaterials = [...rawMaterials];
  const updatedStockAdjustments: StockAdjustment[] = [];

  if (!inventoryEnabled) {
    return { updatedProducts, updatedRawMaterials, updatedStockAdjustments };
  }

  cart.forEach(item => {
    const productIndex = updatedProducts.findIndex(p => p.id === item.id);
    if (productIndex === -1) return;

    const product = updatedProducts[productIndex];
    const qtySold = item.quantity;
    const logNotes = `Terjual di Transaksi #${transactionId.slice(-4)}`;

    if (trackIngredients && product.recipe && product.recipe.length > 0) {
      product.recipe.forEach(recipeItem => {
        const deductionAmount = recipeItem.quantity * qtySold;

        if (recipeItem.itemType === 'raw_material' && recipeItem.rawMaterialId) {
          const matIndex = updatedRawMaterials.findIndex(m => m.id === recipeItem.rawMaterialId);
          if (matIndex > -1) {
            const oldStock = updatedRawMaterials[matIndex].stock || 0;
            const newStock = oldStock - deductionAmount;
            updatedRawMaterials[matIndex] = { ...updatedRawMaterials[matIndex], stock: newStock };

            updatedStockAdjustments.unshift({
              id: `SALES-MAT-${transactionId}-${recipeItem.rawMaterialId}`,
              productId: recipeItem.rawMaterialId,
              productName: updatedRawMaterials[matIndex].name,
              change: -deductionAmount,
              newStock,
              notes: `${logNotes} (via ${product.name})`,
              createdAt,
            });
          }
        } else if (recipeItem.itemType === 'product' && recipeItem.productId) {
          const subProdIndex = updatedProducts.findIndex(p => p.id === recipeItem.productId);
          if (subProdIndex > -1 && updatedProducts[subProdIndex].trackStock) {
            const oldStock = updatedProducts[subProdIndex].stock || 0;
            const newStock = oldStock - deductionAmount;
            updatedProducts[subProdIndex] = { ...updatedProducts[subProdIndex], stock: newStock };

            updatedStockAdjustments.unshift({
              id: `SALES-SUBPROD-${transactionId}-${recipeItem.productId}`,
              productId: recipeItem.productId,
              productName: updatedProducts[subProdIndex].name,
              change: -deductionAmount,
              newStock,
              notes: `${logNotes} (via ${product.name})`,
              createdAt,
            });
          }
        }
      });
    }

    if (product.trackStock) {
      const oldStock = product.stock || 0;
      const newStock = oldStock - qtySold;
      updatedProducts[productIndex] = { ...product, stock: newStock };

      updatedStockAdjustments.unshift({
        id: `SALES-PROD-${transactionId}-${product.id}`,
        productId: product.id,
        productName: product.name,
        change: -qtySold,
        newStock,
        notes: logNotes,
        createdAt,
      });
    }
  });

  return { updatedProducts, updatedRawMaterials, updatedStockAdjustments };
};

const applyCustomerRewards = (
  transaction: Transaction,
  customers: AppData['customers'],
  membershipSettings: AppData['membershipSettings'],
  customerId: string | undefined,
  appliedRewards: AppliedReward[],
  finalTotal: number
) => {
  const updatedCustomers = [...customers];

  if (!customerId) {
    return updatedCustomers;
  }

  const customerIndex = updatedCustomers.findIndex(c => c.id === customerId);
  if (customerIndex === -1) {
    return updatedCustomers;
  }

  const customer = updatedCustomers[customerIndex];
  let pointsToAdd = 0;

  if (membershipSettings.enabled) {
    membershipSettings.pointRules.forEach(rule => {
      if (rule.type === 'spend' && rule.spendAmount && rule.pointsEarned) {
        pointsToAdd += Math.floor(finalTotal / rule.spendAmount) * rule.pointsEarned;
      }
    });
  }

  let pointsUsed = 0;
  if (appliedRewards.length > 0) {
    pointsUsed = appliedRewards.reduce((sum, entry) => sum + entry.reward.pointsCost, 0);
    transaction.rewardsRedeemed = appliedRewards.map(entry => ({
      rewardId: entry.reward.id,
      pointsSpent: entry.reward.pointsCost,
      description: entry.reward.name,
    }));
  }

  const newPoints = (customer.points || 0) + pointsToAdd - pointsUsed;
  updatedCustomers[customerIndex] = {
    ...customer,
    points: Math.max(0, newPoints),
  };

  transaction.pointsEarned = pointsToAdd;
  transaction.customerPointsSnapshot = newPoints;
  transaction.customerBalanceSnapshot = customer.balance;

  return updatedCustomers;
};

export const saveTransactionToData = ({
  prevData,
  cart,
  cartDiscount,
  payments,
  customerName,
  customerContact,
  customerId,
  currentUser,
  appliedRewards,
  activeHeldCartId,
  orderType,
  tableNumber,
  paxCount,
  receiptSettings,
  totals,
  now = new Date(),
}: SaveTransactionInput): SaveTransactionResult => {
  const amountPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paymentStatus: PaymentStatus =
    amountPaid >= totals.finalTotal - 0.01 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';
  const createdAt = now.toISOString();
  const fullPayments: Payment[] = payments.map((payment, index) => ({
    ...payment,
    id: `${now.getTime()}-${index}`,
    createdAt,
  }));

  const transactionId = buildTransactionId(receiptSettings, currentUser, now);
  const cartWithCost = lockCartCostSnapshot(cart, prevData.products);

  const transaction: Transaction = {
    id: transactionId,
    items: cartWithCost,
    subtotal: totals.subtotal,
    cartDiscount,
    total: totals.finalTotal,
    amountPaid,
    tax: totals.taxAmount,
    serviceCharge: totals.serviceChargeAmount,
    orderType,
    tableNumber,
    paxCount,
    paymentStatus,
    payments: fullPayments,
    createdAt,
    userId: currentUser.id,
    userName: currentUser.name,
    customerName,
    customerContact,
    customerId,
    storeId: receiptSettings.storeId || 'LOCAL',
  };

  const { updatedProducts, updatedRawMaterials, updatedStockAdjustments } =
    applyInventoryDeduction(
      cartWithCost,
      prevData.products,
      prevData.rawMaterials,
      prevData.inventorySettings.enabled,
      prevData.inventorySettings.trackIngredients,
      transactionId,
      createdAt
    );

  const updatedCustomers = applyCustomerRewards(
    transaction,
    prevData.customers,
    prevData.membershipSettings,
    customerId,
    appliedRewards,
    totals.finalTotal
  );

  let updatedHeldCarts = prevData.heldCarts || [];
  if (activeHeldCartId) {
    updatedHeldCarts = updatedHeldCarts.filter(cartEntry => cartEntry.id !== activeHeldCartId);
  }

  const nextData: AppData = {
    ...prevData,
    transactionRecords: [transaction, ...prevData.transactionRecords],
    products: updatedProducts,
    rawMaterials: updatedRawMaterials,
    stockAdjustments: [...updatedStockAdjustments, ...(prevData.stockAdjustments || [])],
    customers: updatedCustomers,
    heldCarts: updatedHeldCarts,
  };

  return { transaction, nextData };
};

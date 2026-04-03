import type { AppData, Expense, OtherIncome, Product, Purchase, RawMaterial, StockAdjustment, Transaction } from '../types';

export const importTransactionsToData = (prevData: AppData, newTransactions: Transaction[]): AppData => {
  const existingIds = new Set(prevData.transactionRecords.map(transaction => transaction.id));
  const uniqueNewTransactions = newTransactions.filter(transaction => !existingIds.has(transaction.id));

  if (uniqueNewTransactions.length === 0) {
    return prevData;
  }

  return {
    ...prevData,
    transactionRecords: [...uniqueNewTransactions, ...prevData.transactionRecords].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  };
};

export const importFinanceDataToData = (
  prevData: AppData,
  newExpenses: Expense[],
  newIncomes: OtherIncome[],
  newPurchases: Purchase[]
): AppData => {
  const existingExpenseIds = new Set(prevData.expenses.map(expense => expense.id));
  const uniqueExpenses = newExpenses.filter(expense => !existingExpenseIds.has(expense.id));

  const existingIncomeIds = new Set(prevData.otherIncomes?.map(income => income.id) || []);
  const uniqueIncomes = newIncomes.filter(income => !existingIncomeIds.has(income.id));

  const existingPurchaseIds = new Set(prevData.purchases?.map(purchase => purchase.id) || []);
  const uniquePurchases = newPurchases.filter(purchase => !existingPurchaseIds.has(purchase.id));

  if (uniqueExpenses.length === 0 && uniqueIncomes.length === 0 && uniquePurchases.length === 0) {
    return prevData;
  }

  return {
    ...prevData,
    expenses: [...uniqueExpenses, ...prevData.expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    otherIncomes: [...uniqueIncomes, ...(prevData.otherIncomes || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    purchases: [...uniquePurchases, ...(prevData.purchases || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
  };
};

export const importStockAdjustmentsToData = (
  prevData: AppData,
  newAdjustments: StockAdjustment[]
): AppData => {
  const existingIds = new Set(prevData.stockAdjustments?.map(adjustment => adjustment.id) || []);
  const uniqueNew = newAdjustments.filter(adjustment => !existingIds.has(adjustment.id));

  if (uniqueNew.length === 0) {
    return prevData;
  }

  return {
    ...prevData,
    stockAdjustments: [...uniqueNew, ...(prevData.stockAdjustments || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  };
};

export const mergeProductsToData = (prevData: AppData, newProducts: Product[]): AppData => {
  const productMap = new Map(prevData.products.map(product => [product.id, product]));
  newProducts.forEach(product => productMap.set(product.id, product));

  return {
    ...prevData,
    products: Array.from(productMap.values()),
  };
};

export const mergeRawMaterialsToData = (prevData: AppData, newRawMaterials: RawMaterial[]): AppData => {
  const materialMap = new Map(prevData.rawMaterials.map(material => [material.id, material]));
  newRawMaterials.forEach(material => materialMap.set(material.id, material));

  return {
    ...prevData,
    rawMaterials: Array.from(materialMap.values()),
  };
};

import type {
  AppData,
  Expense,
  ExpenseStatus,
  OtherIncome,
  PurchaseStatus,
  Supplier,
} from '../types';

const sortByDateDesc = <T extends { date: string }>(items: T[]) =>
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const sortSuppliers = (suppliers: Supplier[]) =>
  suppliers.sort((a, b) => a.name.localeCompare(b.name));

export const addExpenseToData = (
  prevData: AppData,
  expenseData: Omit<Expense, 'id' | 'status'>,
  expenseId: string
): AppData => {
  const status: ExpenseStatus =
    expenseData.amountPaid >= expenseData.amount ? 'lunas' : 'belum-lunas';
  const newExpense: Expense = { ...expenseData, id: expenseId, status };

  return {
    ...prevData,
    expenses: sortByDateDesc([newExpense, ...prevData.expenses]),
  };
};

export const updateExpenseInData = (prevData: AppData, updatedExpenseData: Expense): AppData => {
  const status: ExpenseStatus =
    updatedExpenseData.amountPaid >= updatedExpenseData.amount ? 'lunas' : 'belum-lunas';
  const updatedExpense: Expense = { ...updatedExpenseData, status };

  return {
    ...prevData,
    expenses: sortByDateDesc(
      prevData.expenses.map(expense =>
        expense.id === updatedExpense.id ? updatedExpense : expense
      )
    ),
  };
};

export const deleteExpenseInData = (prevData: AppData, expenseId: string): AppData => ({
  ...prevData,
  expenses: prevData.expenses.filter(expense => expense.id !== expenseId),
});

export const addExpensePaymentInData = (
  prevData: AppData,
  expenseId: string,
  amount: number
): AppData => ({
  ...prevData,
  expenses: prevData.expenses.map(expense => {
    if (expense.id !== expenseId) return expense;
    const newAmountPaid = expense.amountPaid + amount;
    const status: ExpenseStatus =
      newAmountPaid >= expense.amount ? 'lunas' : 'belum-lunas';
    return { ...expense, amountPaid: newAmountPaid, status };
  }),
});

export const addOtherIncomeToData = (
  prevData: AppData,
  incomeData: Omit<OtherIncome, 'id'>,
  incomeId: string
): AppData => {
  const newIncome: OtherIncome = { ...incomeData, id: incomeId };
  return {
    ...prevData,
    otherIncomes: sortByDateDesc([newIncome, ...(prevData.otherIncomes || [])]),
  };
};

export const updateOtherIncomeInData = (
  prevData: AppData,
  updatedIncome: OtherIncome
): AppData => ({
  ...prevData,
  otherIncomes: sortByDateDesc(
    (prevData.otherIncomes || []).map(income =>
      income.id === updatedIncome.id ? updatedIncome : income
    )
  ),
});

export const deleteOtherIncomeInData = (
  prevData: AppData,
  incomeId: string
): AppData => ({
  ...prevData,
  otherIncomes: (prevData.otherIncomes || []).filter(income => income.id !== incomeId),
});

export const addSupplierToData = (
  prevData: AppData,
  supplier: Omit<Supplier, 'id'>,
  supplierId: string
): AppData => ({
  ...prevData,
  suppliers: sortSuppliers([{ ...supplier, id: supplierId }, ...prevData.suppliers]),
});

export const updateSupplierInData = (
  prevData: AppData,
  updatedSupplier: Supplier
): AppData => ({
  ...prevData,
  suppliers: sortSuppliers(
    prevData.suppliers.map(supplier =>
      supplier.id === updatedSupplier.id ? updatedSupplier : supplier
    )
  ),
});

export const deleteSupplierInData = (prevData: AppData, supplierId: string): AppData => ({
  ...prevData,
  suppliers: prevData.suppliers.filter(supplier => supplier.id !== supplierId),
});

export const addPurchasePaymentInData = (
  prevData: AppData,
  purchaseId: string,
  amount: number
): AppData => ({
  ...prevData,
  purchases: prevData.purchases.map(purchase => {
    if (purchase.id !== purchaseId) return purchase;
    const newAmountPaid = purchase.amountPaid + amount;
    const status: PurchaseStatus =
      newAmountPaid >= purchase.totalAmount ? 'lunas' : 'belum-lunas';
    return { ...purchase, amountPaid: newAmountPaid, status };
  }),
});

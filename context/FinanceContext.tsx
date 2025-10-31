import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import type { Expense, Supplier, Purchase, ExpenseStatus, PurchaseStatus, StockAdjustment, Transaction as TransactionType, Payment } from '../types';

interface FinanceContextType {
    expenses: Expense[];
    suppliers: Supplier[];
    purchases: Purchase[];
    transactions: TransactionType[];
    addExpense: (expense: Omit<Expense, 'id' | 'status'>) => void;
    updateExpense: (expense: Expense) => void;
    deleteExpense: (expenseId: string) => void;
    addPaymentToExpense: (expenseId: string, amount: number) => void;
    addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
    updateSupplier: (supplier: Supplier) => void;
    deleteSupplier: (supplierId: string) => void;
    addPurchase: (purchase: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>) => void;
    addPaymentToPurchase: (purchaseId: string, amount: number) => void;
    addPaymentToTransaction: (transactionId: string, payments: Array<Omit<Payment, 'id' | 'createdAt'>>) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// FIX: Change to React.FC to fix children prop type error
export const FinanceProvider: React.FC<{children?: React.ReactNode}> = ({ children }) => {
    const { data, setData } = useData();
    // FIX: Use 'transactionRecords' from data and alias it to 'transactions' for context consumers.
    const { expenses, suppliers, purchases, transactionRecords: transactions } = data;

    const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'status'>) => {
        const status: ExpenseStatus = expenseData.amountPaid >= expenseData.amount ? 'lunas' : 'belum-lunas';
        const newExpense = { ...expenseData, id: Date.now().toString(), status };
        setData(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
    }, [setData]);

    const updateExpense = useCallback((updatedExpenseData: Expense) => {
        const status: ExpenseStatus = updatedExpenseData.amountPaid >= updatedExpenseData.amount ? 'lunas' : 'belum-lunas';
        const updatedExpense = { ...updatedExpenseData, status };
        setData(prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
    }, [setData]);

    const deleteExpense = useCallback((expenseId: string) => {
        setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== expenseId) }));
    }, [setData]);

    const addPaymentToExpense = useCallback((expenseId: string, amount: number) => {
        setData(prev => {
            const updatedExpenses = prev.expenses.map(e => {
                if (e.id === expenseId) {
                    const newAmountPaid = e.amountPaid + amount;
                    const newStatus: ExpenseStatus = newAmountPaid >= e.amount ? 'lunas' : 'belum-lunas';
                    return { ...e, amountPaid: newAmountPaid, status: newStatus };
                }
                return e;
            });
            return { ...prev, expenses: updatedExpenses };
        });
    }, [setData]);

    const addSupplier = useCallback((supplier: Omit<Supplier, 'id'>) => {
        const newSupplier = { ...supplier, id: Date.now().toString() };
        setData(prev => ({ ...prev, suppliers: [newSupplier, ...prev.suppliers].sort((a,b) => a.name.localeCompare(b.name)) }));
    }, [setData]);

    const updateSupplier = useCallback((updatedSupplier: Supplier) => {
        setData(prev => ({ ...prev, suppliers: prev.suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s).sort((a,b) => a.name.localeCompare(b.name)) }));
    }, [setData]);

    const deleteSupplier = useCallback((supplierId: string) => {
        setData(prev => ({ ...prev, suppliers: prev.suppliers.filter(s => s.id !== supplierId) }));
    }, [setData]);

    const addPurchase = useCallback((purchaseData: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>) => {
        setData(prev => {
            const supplier = prev.suppliers.find(s => s.id === purchaseData.supplierId);
            if (!supplier) {
                console.error("Supplier not found for purchase");
                return prev;
            }

            const totalAmount = purchaseData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const status: PurchaseStatus = purchaseData.amountPaid >= totalAmount ? 'lunas' : 'belum-lunas';

            const newPurchase: Purchase = {
                ...purchaseData,
                id: Date.now().toString(),
                supplierName: supplier.name,
                totalAmount,
                status,
            };
            
            let updatedRawMaterials = [...prev.rawMaterials];
            let updatedProducts = [...prev.products];
            let updatedStockAdjustments = [...(prev.stockAdjustments || [])];

            newPurchase.items.forEach(item => {
                if (item.itemType === 'raw_material' && item.rawMaterialId) {
                    const materialIndex = updatedRawMaterials.findIndex(m => m.id === item.rawMaterialId);
                    if (materialIndex > -1) {
                        updatedRawMaterials[materialIndex].stock += item.quantity;
                    }
                } else if (item.itemType === 'product' && item.productId) {
                    const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
                    if (productIndex > -1) {
                        const product = updatedProducts[productIndex];
                        if (product.trackStock) {
                            const newStock = (product.stock || 0) + item.quantity;
                            updatedProducts[productIndex] = { ...product, stock: newStock };

                            const newAdjustment: StockAdjustment = {
                                id: `${Date.now().toString()}-${item.productId}`,
                                productId: product.id,
                                productName: product.name,
                                change: item.quantity,
                                newStock,
                                notes: `Pembelian dari ${supplier.name} (ID: ${newPurchase.id})`,
                                createdAt: new Date().toISOString(),
                            };
                            updatedStockAdjustments.unshift(newAdjustment);
                        }
                    }
                }
            });

            return {
                ...prev,
                purchases: [newPurchase, ...prev.purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                rawMaterials: updatedRawMaterials,
                products: updatedProducts,
                stockAdjustments: updatedStockAdjustments,
            };
        });
    }, [setData]);

    const addPaymentToPurchase = useCallback((purchaseId: string, amount: number) => {
        setData(prev => {
            const updatedPurchases = prev.purchases.map(p => {
                if (p.id === purchaseId) {
                    const newAmountPaid = p.amountPaid + amount;
                    const newStatus: PurchaseStatus = newAmountPaid >= p.totalAmount ? 'lunas' : 'belum-lunas';
                    return { ...p, amountPaid: newAmountPaid, status: newStatus };
                }
                return p;
            });
            return { ...prev, purchases: updatedPurchases };
        });
    }, [setData]);

    const addPaymentToTransaction = useCallback((transactionId: string, payments: Array<Omit<Payment, 'id' | 'createdAt'>>) => {
        setData(prev => {
            // FIX: Use 'transactionRecords' for data manipulation.
            const targetTransaction = prev.transactionRecords.find(t => t.id === transactionId);
            if (!targetTransaction) {
                console.error("Transaction not found for payment update");
                return prev;
            }

            const now = new Date();
            const fullNewPayments: Payment[] = payments.map((p, index) => ({
                ...p,
                id: `${now.getTime()}-${index}`,
                createdAt: now.toISOString(),
            }));

            const updatedPayments = [...targetTransaction.payments, ...fullNewPayments];
            const newAmountPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

            let newPaymentStatus: TransactionType['paymentStatus'];
            if (newAmountPaid >= targetTransaction.total) {
                newPaymentStatus = 'paid';
            } else if (newAmountPaid > 0) {
                newPaymentStatus = 'partial';
            } else {
                newPaymentStatus = 'unpaid';
            }
            
            const updatedTransaction: TransactionType = {
                ...targetTransaction,
                payments: updatedPayments,
                amountPaid: newAmountPaid,
                paymentStatus: newPaymentStatus,
            };

            // FIX: Use 'transactionRecords' for data manipulation.
            const updatedTransactions = prev.transactionRecords.map(t => 
                t.id === transactionId ? updatedTransaction : t
            );

            // FIX: Update 'transactionRecords' in the data state.
            return { ...prev, transactionRecords: updatedTransactions };
        });
    }, [setData]);

    return (
        <FinanceContext.Provider value={{
            expenses,
            suppliers,
            purchases,
            transactions,
            addExpense,
            updateExpense,
            deleteExpense,
            addPaymentToExpense,
            addSupplier,
            updateSupplier,
            deleteSupplier,
            addPurchase,
            addPaymentToPurchase,
            addPaymentToTransaction,
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { useCloudSync } from './CloudSyncContext'; // NEW
import { useAudit } from './AuditContext'; // NEW
import type { Expense, Supplier, Purchase, ExpenseStatus, PurchaseStatus, StockAdjustment, Transaction as TransactionType, Payment, OtherIncome, Product, RawMaterial } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface FinanceContextType {
    expenses: Expense[];
    otherIncomes: OtherIncome[];
    suppliers: Supplier[];
    purchases: Purchase[];
    transactions: TransactionType[];
    addExpense: (expense: Omit<Expense, 'id' | 'status'>) => void;
    updateExpense: (expense: Expense) => void;
    deleteExpense: (expenseId: string) => void;
    addPaymentToExpense: (expenseId: string, amount: number) => void;
    addOtherIncome: (income: Omit<OtherIncome, 'id'>) => void;
    updateOtherIncome: (income: OtherIncome) => void;
    deleteOtherIncome: (incomeId: string) => void;
    addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
    updateSupplier: (supplier: Supplier) => void;
    deleteSupplier: (supplierId: string) => void;
    addPurchase: (purchase: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>) => void;
    addPaymentToPurchase: (purchaseId: string, amount: number) => void;
    addPaymentToTransaction: (transactionId: string, payments: Array<Omit<Payment, 'id' | 'createdAt'>>) => void;
    refundTransaction: (transactionId: string) => void;
    importTransactions: (newTransactions: TransactionType[]) => void;
    importFinanceData: (expenses: Expense[], incomes: OtherIncome[], purchases: Purchase[]) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{children?: React.ReactNode}> = ({ children }) => {
    const { data, setData } = useData();
    const { triggerAutoSync } = useCloudSync(); // Use new hook
    const { logAudit } = useAudit(); // Use new hook
    const { currentUser } = useAuth();
    const { expenses, otherIncomes = [], suppliers, purchases, transactionRecords: transactions } = data;

    const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'status'>) => {
        const status: ExpenseStatus = expenseData.amountPaid >= expenseData.amount ? 'lunas' : 'belum-lunas';
        const newExpense = { ...expenseData, id: Date.now().toString(), status };
        setData(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

    const updateExpense = useCallback((updatedExpenseData: Expense) => {
        const status: ExpenseStatus = updatedExpenseData.amountPaid >= updatedExpenseData.amount ? 'lunas' : 'belum-lunas';
        const updatedExpense = { ...updatedExpenseData, status };
        setData(prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

    const deleteExpense = useCallback((expenseId: string) => {
        setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== expenseId) }));
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

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
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

    const addOtherIncome = useCallback((incomeData: Omit<OtherIncome, 'id'>) => {
        const newIncome = { ...incomeData, id: Date.now().toString() };
        setData(prev => ({ ...prev, otherIncomes: [newIncome, ...(prev.otherIncomes || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

    const updateOtherIncome = useCallback((updatedIncome: OtherIncome) => {
        setData(prev => ({ ...prev, otherIncomes: (prev.otherIncomes || []).map(i => i.id === updatedIncome.id ? updatedIncome : i).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

    const deleteOtherIncome = useCallback((incomeId: string) => {
        setData(prev => ({ ...prev, otherIncomes: (prev.otherIncomes || []).filter(i => i.id !== incomeId) }));
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

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
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

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
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

    const addPaymentToTransaction = useCallback((transactionId: string, payments: Array<Omit<Payment, 'id' | 'createdAt'>>) => {
        setData(prev => {
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

            const updatedTransactions = prev.transactionRecords.map(t => 
                t.id === transactionId ? updatedTransaction : t
            );

            return { ...prev, transactionRecords: updatedTransactions };
        });
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, triggerAutoSync]);

    const refundTransaction = useCallback((transactionId: string) => {
        setData(prev => {
            const targetTransaction = prev.transactionRecords.find(t => t.id === transactionId);
            if (!targetTransaction || targetTransaction.paymentStatus === 'refunded') return prev;

            // Audit Log
            logAudit(currentUser, 'REFUND_TRANSACTION', `Refund transaksi #${transactionId.slice(-4)}. Total: ${CURRENCY_FORMATTER.format(targetTransaction.total)}`, transactionId);

            const updatedTransaction: TransactionType = { ...targetTransaction, paymentStatus: 'refunded' };
            const updatedTransactions = prev.transactionRecords.map(t => t.id === transactionId ? updatedTransaction : t);

            let updatedProducts = [...prev.products];
            let updatedRawMaterials = [...prev.rawMaterials];
            let updatedCustomers = [...prev.customers];
            let updatedStockAdjustments = [...(prev.stockAdjustments || [])];
            
            if (prev.inventorySettings.enabled) {
                const itemsList = targetTransaction.items || [];
                const cartItems = itemsList.filter(item => !(item.isReward && item.price === 0));

                cartItems.forEach(item => {
                    const product = prev.products.find(p => p.id === item.id);
                    const recipeToRestore = item.recipe || product?.recipe;

                    if (prev.inventorySettings.trackIngredients && recipeToRestore && recipeToRestore.length > 0) {
                        recipeToRestore.forEach(recipeItem => {
                            const totalToRestore = recipeItem.quantity * item.quantity;
                            
                            if (recipeItem.itemType === 'product' && recipeItem.productId) {
                                const pIdx = updatedProducts.findIndex(p => p.id === recipeItem.productId);
                                if (pIdx > -1) {
                                    const currentStock = updatedProducts[pIdx].stock || 0;
                                    const newStock = currentStock + totalToRestore;
                                    updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: newStock };
                                    
                                    if(updatedProducts[pIdx].trackStock) {
                                        updatedStockAdjustments.unshift({
                                            id: `${Date.now()}-ref-${recipeItem.productId}`,
                                            productId: recipeItem.productId!,
                                            productName: updatedProducts[pIdx].name,
                                            change: totalToRestore,
                                            newStock: newStock,
                                            notes: `Refund Transaksi #${transactionId.slice(-4)}`,
                                            createdAt: new Date().toISOString()
                                        });
                                    }
                                }
                            } else {
                                const materialId = recipeItem.rawMaterialId || '';
                                const mIdx = updatedRawMaterials.findIndex(m => m.id === materialId);
                                if (mIdx > -1) {
                                    updatedRawMaterials[mIdx].stock += totalToRestore;
                                }
                            }
                        });
                    } else if (product && product.trackStock) {
                        const pIdx = updatedProducts.findIndex(p => p.id === product.id);
                        if (pIdx > -1) {
                            const currentStock = updatedProducts[pIdx].stock || 0;
                            const newStock = currentStock + item.quantity;
                            updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: newStock };

                            updatedStockAdjustments.unshift({
                                id: `${Date.now()}-ref-${product.id}`,
                                productId: product.id,
                                productName: product.name,
                                change: item.quantity,
                                newStock: newStock,
                                notes: `Refund Transaksi #${transactionId.slice(-4)}`,
                                createdAt: new Date().toISOString()
                            });
                        }
                    }
                });
            }

            if (targetTransaction.customerId && targetTransaction.pointsEarned && prev.membershipSettings.enabled) {
                const customerIndex = updatedCustomers.findIndex(c => c.id === targetTransaction.customerId);
                if (customerIndex > -1) {
                    let pointsCorrection = -targetTransaction.pointsEarned;
                    if (targetTransaction.rewardRedeemed) {
                        pointsCorrection += targetTransaction.rewardRedeemed.pointsSpent;
                    }
                    const newPoints = Math.max(0, updatedCustomers[customerIndex].points + pointsCorrection);
                    updatedCustomers[customerIndex] = { ...updatedCustomers[customerIndex], points: newPoints };
                }
            }

            return {
                ...prev,
                transactionRecords: updatedTransactions,
                products: updatedProducts,
                rawMaterials: updatedRawMaterials,
                customers: updatedCustomers,
                stockAdjustments: updatedStockAdjustments
            };
        });
        setTimeout(() => triggerAutoSync(), 500);
    }, [setData, logAudit, currentUser, triggerAutoSync]);

    const importTransactions = useCallback((newTransactions: TransactionType[]) => {
        setData(prev => {
            const existingIds = new Set(prev.transactionRecords.map(t => t.id));
            const uniqueNewTransactions = newTransactions.filter(t => !existingIds.has(t.id));
            
            if (uniqueNewTransactions.length === 0) return prev;

            return {
                ...prev,
                transactionRecords: [...uniqueNewTransactions, ...prev.transactionRecords].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            };
        });
    }, [setData]);

    const importFinanceData = useCallback((newExpenses: Expense[], newIncomes: OtherIncome[], newPurchases: Purchase[]) => {
        setData(prev => {
            const existingExpIds = new Set(prev.expenses.map(e => e.id));
            const uniqueExpenses = newExpenses.filter(e => !existingExpIds.has(e.id));

            const existingIncIds = new Set(prev.otherIncomes?.map(i => i.id) || []);
            const uniqueIncomes = newIncomes.filter(i => !existingIncIds.has(i.id));

            const existingPurchIds = new Set(prev.purchases?.map(p => p.id) || []);
            const uniquePurchases = newPurchases.filter(p => !existingPurchIds.has(p.id));

            if (uniqueExpenses.length === 0 && uniqueIncomes.length === 0 && uniquePurchases.length === 0) return prev;

            return {
                ...prev,
                expenses: [...uniqueExpenses, ...prev.expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                otherIncomes: [...uniqueIncomes, ...(prev.otherIncomes || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                purchases: [...uniquePurchases, ...(prev.purchases || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            };
        });
    }, [setData]);

    return (
        <FinanceContext.Provider value={{
            expenses,
            otherIncomes,
            suppliers,
            purchases,
            transactions,
            addExpense,
            updateExpense,
            deleteExpense,
            addPaymentToExpense,
            addOtherIncome,
            updateOtherIncome,
            deleteOtherIncome,
            addSupplier,
            updateSupplier,
            deleteSupplier,
            addPurchase,
            addPaymentToPurchase,
            addPaymentToTransaction,
            refundTransaction,
            importTransactions,
            importFinanceData
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

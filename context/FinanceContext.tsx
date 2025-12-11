

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import type { Expense, Supplier, Purchase, ExpenseStatus, PurchaseStatus, StockAdjustment, Transaction as TransactionType, Payment, OtherIncome, Product, RawMaterial } from '../types';

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
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// FIX: Change to React.FC to fix children prop type error
export const FinanceProvider: React.FC<{children?: React.ReactNode}> = ({ children }) => {
    const { data, setData } = useData();
    // FIX: Use 'transactionRecords' from data and alias it to 'transactions' for context consumers.
    const { expenses, otherIncomes = [], suppliers, purchases, transactionRecords: transactions } = data;

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

    const addOtherIncome = useCallback((incomeData: Omit<OtherIncome, 'id'>) => {
        const newIncome = { ...incomeData, id: Date.now().toString() };
        setData(prev => ({ ...prev, otherIncomes: [newIncome, ...(prev.otherIncomes || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
    }, [setData]);

    const updateOtherIncome = useCallback((updatedIncome: OtherIncome) => {
        setData(prev => ({ ...prev, otherIncomes: (prev.otherIncomes || []).map(i => i.id === updatedIncome.id ? updatedIncome : i).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
    }, [setData]);

    const deleteOtherIncome = useCallback((incomeId: string) => {
        setData(prev => ({ ...prev, otherIncomes: (prev.otherIncomes || []).filter(i => i.id !== incomeId) }));
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

    const refundTransaction = useCallback((transactionId: string) => {
        setData(prev => {
            const targetTransaction = prev.transactionRecords.find(t => t.id === transactionId);
            if (!targetTransaction || targetTransaction.paymentStatus === 'refunded') return prev;

            // 1. Mark Transaction as Refunded
            const updatedTransaction: TransactionType = { ...targetTransaction, paymentStatus: 'refunded' };
            const updatedTransactions = prev.transactionRecords.map(t => t.id === transactionId ? updatedTransaction : t);

            let updatedProducts = [...prev.products];
            let updatedRawMaterials = [...prev.rawMaterials];
            let updatedCustomers = [...prev.customers];
            
            // 2. Restore Inventory (Logic reversed from saveTransaction)
            if (prev.inventorySettings.enabled) {
                const rawMaterialUpdates = new Map<string, number>();
                const productUpdates = new Map<string, number>(); // Map for restoring bundled/tracked product stock

                const cartItems = targetTransaction.items.filter(item => !(item.isReward && item.price === 0));

                cartItems.forEach(item => {
                    const product = prev.products.find(p => p.id === item.id);
                    // Use recipe from ITEM SNAPSHOT if available to ensure historical accuracy, 
                    // otherwise fallback to current product definition
                    const recipeToRestore = item.recipe || product?.recipe;

                    if (prev.inventorySettings.trackIngredients && recipeToRestore && recipeToRestore.length > 0) {
                        recipeToRestore.forEach(recipeItem => {
                            const totalToRestore = recipeItem.quantity * item.quantity;
                            
                            if (recipeItem.itemType === 'product' && recipeItem.productId) {
                                // Restore component product stock
                                productUpdates.set(recipeItem.productId, (productUpdates.get(recipeItem.productId) || 0) + totalToRestore);
                            } else {
                                // Restore raw material stock
                                const materialId = recipeItem.rawMaterialId || '';
                                rawMaterialUpdates.set(materialId, (rawMaterialUpdates.get(materialId) || 0) + totalToRestore);
                            }
                        });
                    } else if (product && product.trackStock) {
                        // Direct stock restore
                        productUpdates.set(product.id, (productUpdates.get(product.id) || 0) + item.quantity);
                    }
                });

                if (rawMaterialUpdates.size > 0) {
                    updatedRawMaterials = prev.rawMaterials.map(m => rawMaterialUpdates.has(m.id) ? { ...m, stock: m.stock + (rawMaterialUpdates.get(m.id) || 0) } : m);
                }
                
                if (productUpdates.size > 0) {
                    updatedProducts = prev.products.map(p => {
                        if (productUpdates.has(p.id) && p.trackStock) {
                            return { ...p, stock: (p.stock || 0) + (productUpdates.get(p.id) || 0) };
                        }
                        return p;
                    });
                }
            }

            // 3. Revert Customer Points (if earned)
            if (targetTransaction.customerId && targetTransaction.pointsEarned && prev.membershipSettings.enabled) {
                const customerIndex = updatedCustomers.findIndex(c => c.id === targetTransaction.customerId);
                if (customerIndex > -1) {
                    // Deduct earned points, but add back spent points if a reward was redeemed
                    let pointsCorrection = -targetTransaction.pointsEarned;
                    if (targetTransaction.rewardRedeemed) {
                        pointsCorrection += targetTransaction.rewardRedeemed.pointsSpent;
                    }
                    
                    // Prevent negative points just in case
                    const newPoints = Math.max(0, updatedCustomers[customerIndex].points + pointsCorrection);
                    updatedCustomers[customerIndex] = { ...updatedCustomers[customerIndex], points: newPoints };
                }
            }

            return {
                ...prev,
                transactionRecords: updatedTransactions,
                products: updatedProducts,
                rawMaterials: updatedRawMaterials,
                customers: updatedCustomers
            };
        });
    }, [setData]);

    const importTransactions = useCallback((newTransactions: TransactionType[]) => {
        setData(prev => {
            // Merge transactions, filtering out duplicates by ID
            const existingIds = new Set(prev.transactionRecords.map(t => t.id));
            const uniqueNewTransactions = newTransactions.filter(t => !existingIds.has(t.id));
            
            if (uniqueNewTransactions.length === 0) return prev;

            return {
                ...prev,
                transactionRecords: [...uniqueNewTransactions, ...prev.transactionRecords].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
            importTransactions
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

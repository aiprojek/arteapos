
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useDataActions, useFinanceData } from './DataContext';
import { useAuthState } from './AuthContext';
import { useSettings } from './SettingsContext'; // For Store ID
import {
    addExpensePaymentInData,
    addExpenseToData,
    addOtherIncomeToData,
    addPurchasePaymentInData,
    addSupplierToData,
    deleteExpenseInData,
    deleteOtherIncomeInData,
    deleteSupplierInData,
    updateExpenseInData,
    updateOtherIncomeInData,
    updateSupplierInData,
} from '../services/financeCrudService';
import { refundTransactionInData } from '../services/refundService';
import { addPaymentToTransactionInData } from '../services/financeTransactionService';
import { createPurchaseInData } from '../services/inventoryService';
import { generateScopedUniqueId } from '../services/idService';
import { importFinanceDataToData, importTransactionsToData } from '../services/importService';
import { emitAuditEvent, requestAutoSync } from '../services/appEvents';
import type { Expense, Supplier, Purchase, Transaction as TransactionType, Payment, OtherIncome } from '../types';
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
    refundTransaction: (transactionId: string, reason?: string) => void;
    importTransactions: (newTransactions: TransactionType[]) => void;
    importFinanceData: (expenses: Expense[], incomes: OtherIncome[], purchases: Purchase[]) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{children?: React.ReactNode}> = ({ children }) => {
    const { setData } = useDataActions();
    const {
        expenses,
        otherIncomes = [],
        suppliers,
        purchases,
        transactionRecords: transactions,
    } = useFinanceData();
    const { currentUser } = useAuthState();
    const { receiptSettings } = useSettings();

    // Helper to get staff name
    const getStaffName = () => currentUser?.name || 'Staff';

    // Helper to generate unique ID: [STORE_ID]-[TIMESTAMP]-[USER]-[RANDOM]
    const generateUniqueId = useCallback((prefix: string = '') => {
        return generateScopedUniqueId({
            storeId: receiptSettings.storeId,
            user: currentUser,
            prefix,
        });
    }, [receiptSettings.storeId, currentUser]);

    const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'status'>) => {
        setData(prev => addExpenseToData(prev, expenseData, generateUniqueId('EXP')));
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser, generateUniqueId]);

    const updateExpense = useCallback((updatedExpenseData: Expense) => {
        setData(prev => updateExpenseInData(prev, updatedExpenseData));
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser]);

    const deleteExpense = useCallback((expenseId: string) => {
        setData(prev => deleteExpenseInData(prev, expenseId));
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser]);

    const addPaymentToExpense = useCallback((expenseId: string, amount: number) => {
        setData(prev => addExpensePaymentInData(prev, expenseId, amount));
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser]);

    const addOtherIncome = useCallback((incomeData: Omit<OtherIncome, 'id'>) => {
        setData(prev => addOtherIncomeToData(prev, incomeData, generateUniqueId('INC')));
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser, generateUniqueId]);

    const updateOtherIncome = useCallback((updatedIncome: OtherIncome) => {
        setData(prev => updateOtherIncomeInData(prev, updatedIncome));
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser]);

    const deleteOtherIncome = useCallback((incomeId: string) => {
        setData(prev => deleteOtherIncomeInData(prev, incomeId));
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser]);

    const addSupplier = useCallback((supplier: Omit<Supplier, 'id'>) => {
        setData(prev => addSupplierToData(prev, supplier, Date.now().toString()));
    }, [setData]);

    const updateSupplier = useCallback((updatedSupplier: Supplier) => {
        setData(prev => updateSupplierInData(prev, updatedSupplier));
    }, [setData]);

    const deleteSupplier = useCallback((supplierId: string) => {
        setData(prev => deleteSupplierInData(prev, supplierId));
    }, [setData]);

    const addPurchase = useCallback((purchaseData: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>) => {
        setData(prev => {
            const result = createPurchaseInData({
                prevData: prev,
                purchaseData,
                purchaseId: generateUniqueId('PUR'),
            });

            if (!result.purchase) {
                console.error("Supplier not found for purchase");
                return prev;
            }

            return result.nextData;
        });
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser, generateUniqueId]);

    const addPaymentToPurchase = useCallback((purchaseId: string, amount: number) => {
        setData(prev => addPurchasePaymentInData(prev, purchaseId, amount));
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser]);

    const addPaymentToTransaction = useCallback((transactionId: string, payments: Array<Omit<Payment, 'id' | 'createdAt'>>) => {
        setData(prev => {
            const result = addPaymentToTransactionInData({ prevData: prev, transactionId, payments });
            if (!result.updatedTransaction) {
                console.error("Transaction not found for payment update");
                return prev;
            }
            return result.nextData;
        });
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser]);

    const refundTransaction = useCallback((transactionId: string, reason?: string) => {
        setData(prev => {
            const result = refundTransactionInData({
                prevData: prev,
                transactionId,
                adjustmentIdFactory: (suffix) => `${generateUniqueId('SA')}-${suffix}`,
            });

            if (!result.refundedTransaction) {
                return prev;
            }

            const reasonText = reason ? `. Alasan: ${reason}` : '';
            emitAuditEvent({
                user: currentUser,
                action: 'REFUND_TRANSACTION',
                details: `Refund transaksi #${transactionId.slice(-4)}. Total: ${CURRENCY_FORMATTER.format(result.refundedTransaction.total)}${reasonText}`,
                targetId: transactionId,
            });

            return result.nextData;
        });
        setTimeout(() => requestAutoSync({ staffName: getStaffName() }), 500);
    }, [setData, currentUser, generateUniqueId]);

    const importTransactions = useCallback((newTransactions: TransactionType[]) => {
        setData(prev => importTransactionsToData(prev, newTransactions));
    }, [setData]);

    const importFinanceData = useCallback((newExpenses: Expense[], newIncomes: OtherIncome[], newPurchases: Purchase[]) => {
        setData(prev => importFinanceDataToData(prev, newExpenses, newIncomes, newPurchases));
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


import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import { useSession } from './SessionContext';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';
import type { Customer, MembershipSettings, Reward, CartItem, BalanceLog } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface CustomerContextType {
    customers: Customer[];
    membershipSettings: MembershipSettings;
    balanceLogs: BalanceLog[];
    addCustomer: (customer: Omit<Customer, 'id' | 'memberId' | 'points' | 'balance' | 'createdAt'>) => void;
    updateCustomer: (customer: Customer) => void;
    deleteCustomer: (customerId: string) => void;
    updateMembershipSettings: (settings: MembershipSettings) => void;
    addBalance: (customerId: string, amount: number, description: string, isTopUp?: boolean) => void;
    bulkAddCustomers: (newCustomers: Omit<Customer, 'id' | 'memberId' | 'createdAt'>[]) => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data, setData } = useData();
    const { showAlert } = useUI();
    const { addCashMovement } = useSession();
    const { logAudit } = useAudit();
    const { currentUser } = useAuth();
    const { customers, membershipSettings, balanceLogs = [] } = data;

    const addCustomer = useCallback((customerData: Omit<Customer, 'id' | 'memberId' | 'points' | 'balance' | 'createdAt'>) => {
        setData(prev => {
            const sortedCustomers = [...prev.customers].sort((a,b) => {
                const idA = parseInt(a.memberId.split('-')[1] || '0');
                const idB = parseInt(b.memberId.split('-')[1] || '0');
                return idA - idB;
            });
            const lastMemberId = sortedCustomers.length > 0 ? sortedCustomers[sortedCustomers.length - 1].memberId.split('-')[1] : '0';
            const newIdNumber = parseInt(lastMemberId, 10) + 1;
            const newMemberId = `CUST-${String(newIdNumber).padStart(4, '0')}`;
            const newCustomer: Customer = {
                ...customerData,
                id: Date.now().toString(),
                memberId: newMemberId,
                points: 0,
                balance: 0,
                createdAt: new Date().toISOString(),
            };
            return { ...prev, customers: [newCustomer, ...prev.customers] };
        });
    }, [setData]);

    const bulkAddCustomers = useCallback((newCustomers: Omit<Customer, 'id' | 'memberId' | 'createdAt'>[]) => {
        setData(prev => {
            const sortedCustomers = [...prev.customers].sort((a,b) => {
                const idA = parseInt(a.memberId.split('-')[1] || '0');
                const idB = parseInt(b.memberId.split('-')[1] || '0');
                return idA - idB;
            });
            
            let lastIdNumber = sortedCustomers.length > 0 ? parseInt(sortedCustomers[sortedCustomers.length - 1].memberId.split('-')[1] || '0', 10) : 0;
            
            const processedCustomers: Customer[] = newCustomers.map((c, index) => {
                lastIdNumber++;
                const newMemberId = `CUST-${String(lastIdNumber).padStart(4, '0')}`;
                return {
                    ...c,
                    id: `${Date.now()}-${index}`,
                    memberId: newMemberId,
                    createdAt: new Date().toISOString()
                };
            });

            return { ...prev, customers: [...processedCustomers, ...prev.customers] };
        });
    }, [setData]);

    const updateCustomer = useCallback((updatedCustomer: Customer) => {
        setData(prev => ({ ...prev, customers: prev.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c) }));
    }, [setData]);

    const deleteCustomer = useCallback((customerId: string) => {
        showAlert({
            type: 'confirm',
            title: 'Hapus Pelanggan?',
            message: 'Apakah Anda yakin ingin menghapus pelanggan ini? Riwayat transaksi mereka akan tetap ada.',
            onConfirm: () => {
                setData(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== customerId) }));
            },
            confirmVariant: 'danger',
            confirmText: 'Ya, Hapus'
        });
    }, [setData, showAlert]);
    
    const updateMembershipSettings = useCallback((settings: MembershipSettings) => {
        setData(prev => ({ ...prev, membershipSettings: settings }));
    }, [setData]);

    const addBalance = useCallback((customerId: string, amount: number, description: string, isTopUp: boolean = false) => {
        setData(prev => {
            const customerIndex = prev.customers.findIndex(c => c.id === customerId);
            if (customerIndex === -1) return prev;

            const updatedCustomers = [...prev.customers];
            const oldBalance = updatedCustomers[customerIndex].balance || 0;
            const newBalance = oldBalance + amount;
            
            // Validation: Prevent negative balance if spending
            if (amount < 0 && newBalance < 0) {
                console.warn("Insufficient balance");
                return prev;
            }

            updatedCustomers[customerIndex] = { ...updatedCustomers[customerIndex], balance: newBalance };

            const newLog: BalanceLog = {
                id: Date.now().toString(),
                customerId,
                type: isTopUp ? 'topup' : (amount > 0 ? 'change_deposit' : 'payment'),
                amount,
                description,
                timestamp: new Date().toISOString()
            };

            return { 
                ...prev, 
                customers: updatedCustomers,
                balanceLogs: [newLog, ...(prev.balanceLogs || [])]
            };
        });

        // BOOKKEEPING: If TopUp (Cash In), record to Session Cash Flow
        if (isTopUp && amount > 0) {
            const customer = customers.find(c => c.id === customerId);
            addCashMovement('in', amount, `Top Up Member: ${customer?.name || 'Unknown'}`);
            logAudit(currentUser, 'BALANCE_TOPUP', `Top Up Saldo ${CURRENCY_FORMATTER.format(amount)} untuk ${customer?.name}`, customerId);
        }
    }, [setData, addCashMovement, customers, currentUser, logAudit]);

    return (
        <CustomerContext.Provider value={{
            customers,
            membershipSettings,
            balanceLogs,
            addCustomer,
            updateCustomer,
            deleteCustomer,
            updateMembershipSettings,
            addBalance,
            bulkAddCustomers
        }}>
            {children}
        </CustomerContext.Provider>
    );
};

export const useCustomer = () => {
    const context = useContext(CustomerContext);
    if (context === undefined) {
        throw new Error('useCustomer must be used within a CustomerProvider');
    }
    return context;
};

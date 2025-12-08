import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import type { Customer, MembershipSettings, Reward, CartItem } from '../types';

interface CustomerContextType {
    customers: Customer[];
    membershipSettings: MembershipSettings;
    addCustomer: (customer: Omit<Customer, 'id' | 'memberId' | 'points' | 'createdAt'>) => void;
    updateCustomer: (customer: Customer) => void;
    deleteCustomer: (customerId: string) => void;
    updateMembershipSettings: (settings: MembershipSettings) => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data, setData } = useData();
    const { showAlert } = useUI();
    const { customers, membershipSettings } = data;

    const addCustomer = useCallback((customerData: Omit<Customer, 'id' | 'memberId' | 'points' | 'createdAt'>) => {
        setData(prev => {
            const sortedCustomers = [...prev.customers].sort((a,b) => parseInt(a.memberId.split('-')[1]) - parseInt(b.memberId.split('-')[1]));
            const lastMemberId = sortedCustomers.length > 0 ? sortedCustomers[sortedCustomers.length - 1].memberId.split('-')[1] : '0';
            const newIdNumber = parseInt(lastMemberId, 10) + 1;
            const newMemberId = `CUST-${String(newIdNumber).padStart(4, '0')}`;
            const newCustomer: Customer = {
                ...customerData,
                id: Date.now().toString(),
                memberId: newMemberId,
                points: 0,
                createdAt: new Date().toISOString(),
            };
            return { ...prev, customers: [newCustomer, ...prev.customers] };
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

    return (
        <CustomerContext.Provider value={{
            customers,
            membershipSettings,
            addCustomer,
            updateCustomer,
            deleteCustomer,
            updateMembershipSettings,
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
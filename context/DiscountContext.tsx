import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import type { DiscountDefinition } from '../types';

interface DiscountContextType {
    discountDefinitions: DiscountDefinition[];
    addDiscountDefinition: (discount: Omit<DiscountDefinition, 'id'>) => void;
    updateDiscountDefinition: (discount: DiscountDefinition) => void;
    deleteDiscountDefinition: (discountId: string) => void;
}

const DiscountContext = createContext<DiscountContextType | undefined>(undefined);

export const DiscountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data, setData } = useData();
    const { discountDefinitions = [] } = data;

    const addDiscountDefinition = useCallback((discountData: Omit<DiscountDefinition, 'id'>) => {
        const newDiscount = { ...discountData, id: Date.now().toString() };
        setData(prev => ({ ...prev, discountDefinitions: [...(prev.discountDefinitions || []), newDiscount] }));
    }, [setData]);

    const updateDiscountDefinition = useCallback((updatedDiscount: DiscountDefinition) => {
        setData(prev => ({
            ...prev,
            discountDefinitions: (prev.discountDefinitions || []).map(d => d.id === updatedDiscount.id ? updatedDiscount : d)
        }));
    }, [setData]);

    const deleteDiscountDefinition = useCallback((discountId: string) => {
        setData(prev => ({
            ...prev,
            discountDefinitions: (prev.discountDefinitions || []).filter(d => d.id !== discountId)
        }));
    }, [setData]);

    return (
        <DiscountContext.Provider value={{
            discountDefinitions,
            addDiscountDefinition,
            updateDiscountDefinition,
            deleteDiscountDefinition,
        }}>
            {children}
        </DiscountContext.Provider>
    );
};

export const useDiscount = () => {
    const context = useContext(DiscountContext);
    if (context === undefined) {
        throw new Error('useDiscount must be used within a DiscountProvider');
    }
    return context;
};
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import type { ReceiptSettings } from '../types';

interface SettingsContextType {
    receiptSettings: ReceiptSettings;
    updateReceiptSettings: (settings: ReceiptSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data, setData } = useData();
    const { receiptSettings } = data;

    const updateReceiptSettings = useCallback((settings: ReceiptSettings) => {
        setData(prev => ({ ...prev, receiptSettings: settings }));
    }, [setData]);

    return (
        <SettingsContext.Provider value={{
            receiptSettings,
            updateReceiptSettings,
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
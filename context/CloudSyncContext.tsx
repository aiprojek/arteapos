
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useData } from './DataContext';
import { dropboxService } from '../services/dropboxService';
import type { AppData } from '../types';

interface CloudSyncContextType {
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    syncErrorMessage: string | null;
    triggerAutoSync: (staffName?: string) => Promise<void>;
    triggerMasterDataPush: () => Promise<void>;
}

const CloudSyncContext = createContext<CloudSyncContextType | undefined>(undefined);

export const CloudSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data } = useData();
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
    
    const prevDataRef = useRef<AppData | null>(null);
    const masterPushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Automatic Cloud Sync (Operational Data) ---
    // Called manually by Transaction logic or Effects
    const triggerAutoSync = useCallback(async (staffName: string = 'Staff') => {
        // SECURE CHECK
        if (!dropboxService.isConfigured()) return;

        setSyncStatus('syncing');
        setSyncErrorMessage(null);
        
        try {
            await dropboxService.uploadBranchData(staffName);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (error: any) {
            console.error("Auto Sync Failed:", error);
            setSyncStatus('error');
            const msg = error.message || "Unknown error";
            setSyncErrorMessage(msg);
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    }, []);

    // --- Master Data Push (Admin Side) ---
    const triggerMasterDataPush = useCallback(async () => {
        // SECURE CHECK
        if (!dropboxService.isConfigured()) return;

        setSyncStatus('syncing');
        try {
            await dropboxService.uploadMasterData();
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (e) {
            console.error("Master Push Failed", e);
            setSyncStatus('error');
        }
    }, []);

    // --- Watcher for Master Data Changes ---
    useEffect(() => {
        const prevData = prevDataRef.current;
        if (!prevData) {
            prevDataRef.current = data;
            return;
        }

        // We check if Master Data keys have changed to trigger auto-push
        // Note: Operational data (transactions) triggers sync explicitly via function call in FinanceContext
        const masterKeys: (keyof AppData)[] = ['products', 'categories', 'discountDefinitions', 'membershipSettings', 'customers', 'suppliers'];
        
        // Simple referential check is usually enough because setData creates new objects
        const hasMasterChanges = masterKeys.some(key => data[key] !== prevData[key]);

        if (hasMasterChanges) {
            if (masterPushTimeoutRef.current) clearTimeout(masterPushTimeoutRef.current);
            masterPushTimeoutRef.current = setTimeout(() => {
                triggerMasterDataPush();
            }, 3000); // Debounce 3s
        }

        prevDataRef.current = data;
    }, [data, triggerMasterDataPush]);

    return (
        <CloudSyncContext.Provider value={{ syncStatus, syncErrorMessage, triggerAutoSync, triggerMasterDataPush }}>
            {children}
        </CloudSyncContext.Provider>
    );
};

export const useCloudSync = () => {
    const context = useContext(CloudSyncContext);
    if (context === undefined) {
        throw new Error('useCloudSync must be used within a CloudSyncProvider');
    }
    return context;
};

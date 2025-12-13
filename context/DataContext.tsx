
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { AppData, AuditAction, AuditLog, User } from '../types';
import { db, initialData } from '../services/db';
import { supabaseService } from '../services/supabaseService';
import { dropboxService } from '../services/dropboxService';

interface DataContextType {
  data: AppData;
  setData: (value: AppData | ((val: AppData) => AppData)) => void;
  restoreData: (backupData: AppData) => Promise<void>;
  isDataLoading: boolean;
  logAudit: (user: User | null, action: AuditAction, details: string, targetId?: string) => Promise<void>;
  triggerAutoSync: () => Promise<void>; // New Auto Sync Function
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'; // Sync Status State
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function base64ToBlob(base64: string): Blob {
    const [meta, data] = base64.split(',');
    if (!meta || !data) {
        return new Blob();
    }
    const mime = meta.match(/:(.*?);/)?.[1];
    const bstr = atob(data);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}


export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDataLoading, setIsLoading] = useState(true);
  const [data, _setData] = useState<AppData>(initialData);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const prevDataRef = useRef<AppData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await db.open();
        console.log("Database opened successfully");
        
        const [
          products, categoriesObj, rawMaterials, transactionRecords, users, settings,
          expenses, otherIncomes, suppliers, purchases, stockAdjustments, customers, discountDefinitions, heldCarts, sessionHistory, auditLogs
        ] = await Promise.all([
          db.products.toArray(),
          db.appState.get('categories'),
          db.rawMaterials.toArray(),
          db.transactionRecords.toArray(),
          db.users.toArray(),
          db.settings.toArray(),
          db.expenses.toArray(),
          db.otherIncomes.toArray(),
          db.suppliers.toArray(),
          db.purchases.toArray(),
          db.stockAdjustments.toArray(),
          db.customers.toArray(),
          db.discountDefinitions.toArray(),
          db.heldCarts.toArray(),
          db.sessionHistory.toArray(),
          db.auditLogs.toArray(),
        ]);
        
        const loadedData = {
          products,
          categories: categoriesObj?.value || initialData.categories,
          rawMaterials,
          transactionRecords,
          users,
          expenses,
          otherIncomes: otherIncomes || [],
          suppliers,
          purchases,
          stockAdjustments,
          customers,
          discountDefinitions,
          heldCarts,
          sessionHistory: sessionHistory || [],
          auditLogs: auditLogs || [], // Load logs
          receiptSettings: settings.find(s => s.key === 'receiptSettings')?.value || initialData.receiptSettings,
          inventorySettings: settings.find(s => s.key === 'inventorySettings')?.value || initialData.inventorySettings,
          authSettings: settings.find(s => s.key === 'authSettings')?.value || initialData.authSettings,
          sessionSettings: settings.find(s => s.key === 'sessionSettings')?.value || initialData.sessionSettings,
          membershipSettings: settings.find(s => s.key === 'membershipSettings')?.value || initialData.membershipSettings,
        };

        _setData(loadedData as AppData);
        prevDataRef.current = loadedData as AppData;
      } catch (error) {
        console.error("Failed to load data from IndexedDB:", error);
        _setData(initialData);
        prevDataRef.current = initialData;
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const prevData = prevDataRef.current;
    if (isDataLoading || !prevData || prevData === data) return;
    
    const persist = async () => {
      try {
        await db.transaction('rw', db.tables.map(t => t.name), async () => {
          const promises: Promise<any>[] = [];
          
          Object.keys(data).forEach(keyStr => {
              const key = keyStr as keyof AppData;
              if (data[key] === prevData[key]) return;

              const value = data[key];
              
              switch(key) {
                case 'products':
                case 'rawMaterials':
                case 'transactionRecords':
                case 'users':
                case 'expenses':
                case 'otherIncomes':
                case 'suppliers':
                case 'purchases':
                case 'stockAdjustments':
                case 'customers':
                case 'discountDefinitions':
                case 'heldCarts':
                case 'sessionHistory':
                case 'auditLogs': // Persist logs
                  promises.push(db.table(key).clear().then(() => db.table(key).bulkAdd(value as any[])));
                  break;
                case 'categories':
                  promises.push(db.appState.put({ key: 'categories', value }));
                  break;
                case 'receiptSettings':
                case 'inventorySettings':
                case 'authSettings':
                case 'sessionSettings':
                case 'membershipSettings':
                  promises.push(db.settings.put({ key: key, value }));
                  break;
              }
          });

          await Promise.all(promises);
        });
      } catch (e) {
        console.error("Failed to persist data changes to IndexedDB", e);
      }
    };
    
    persist();
    prevDataRef.current = data;
  }, [data, isDataLoading]);
  
  const setData = useCallback((value: AppData | ((val: AppData) => AppData)) => {
    _setData(value);
  }, []);

  const restoreData = useCallback(async (backupData: AppData) => {
    await db.transaction('rw', db.tables.map(t => t.name), async () => {
      await Promise.all(db.tables.map(table => table.clear()));

      const productsWithBlobs = (backupData.products || []).map(p => {
        const prod: any = { ...p };
        if (prod.imageUrl && prod.imageUrl.startsWith('data:')) {
            prod.image = base64ToBlob(prod.imageUrl);
            delete prod.imageUrl;
        }
        return prod;
      });

      await db.products.bulkAdd(productsWithBlobs);
      await db.rawMaterials.bulkAdd(backupData.rawMaterials || []);
      await db.transactionRecords.bulkAdd(backupData.transactionRecords || []);
      await db.users.bulkAdd(backupData.users || []);
      await db.expenses.bulkAdd(backupData.expenses || []);
      await db.otherIncomes.bulkAdd(backupData.otherIncomes || []);
      await db.suppliers.bulkAdd(backupData.suppliers || []);
      await db.purchases.bulkAdd(backupData.purchases || []);
      await db.stockAdjustments.bulkAdd(backupData.stockAdjustments || []);
      await db.customers.bulkAdd(backupData.customers || []);
      await db.discountDefinitions.bulkAdd(backupData.discountDefinitions || []);
      await db.heldCarts.bulkAdd(backupData.heldCarts || []);
      await db.sessionHistory.bulkAdd(backupData.sessionHistory || []);
      await db.auditLogs.bulkAdd(backupData.auditLogs || []); // Restore logs
      
      await db.appState.put({ key: 'categories', value: backupData.categories || [] });

      await db.settings.bulkAdd([
        { key: 'receiptSettings', value: backupData.receiptSettings },
        { key: 'inventorySettings', value: backupData.inventorySettings },
        { key: 'authSettings', value: backupData.authSettings },
        { key: 'sessionSettings', value: backupData.sessionSettings },
        { key: 'membershipSettings', value: backupData.membershipSettings },
      ]);
    });
    
    window.location.reload();
  }, []);

  // --- NEW: Audit Logging Utility ---
  const logAudit = useCallback(async (user: User | null, action: AuditAction, details: string, targetId?: string) => {
      const newLog: AuditLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          userId: user?.id || 'system',
          userName: user?.name || 'System/Guest',
          action,
          details,
          targetId
      };
      
      _setData(prev => ({
          ...prev,
          auditLogs: [newLog, ...(prev.auditLogs || [])]
      }));
  }, []);

  // --- NEW: Automatic Cloud Sync ---
  const triggerAutoSync = useCallback(async () => {
      const sbUrl = localStorage.getItem('ARTEA_SB_URL');
      const sbKey = localStorage.getItem('ARTEA_SB_KEY');
      const dbxToken = localStorage.getItem('ARTEA_DBX_TOKEN');

      // If no cloud configured, do nothing silently
      if (!sbUrl && !dbxToken) return;

      setSyncStatus('syncing');
      
      try {
          // Priority 1: Supabase (Fast & Realtime)
          if (sbUrl && sbKey) {
              supabaseService.init(sbUrl, sbKey);
              await supabaseService.syncOperationalDataUp();
          }

          // Priority 2: Dropbox (CSV Only for speed)
          // We avoid uploading the full JSON backup on every transaction to prevent lag/bandwidth usage
          if (dbxToken) {
              await dropboxService.uploadCSVReports(dbxToken);
          }

          setSyncStatus('success');
          // Reset status after 3 seconds
          setTimeout(() => setSyncStatus('idle'), 3000);

      } catch (error) {
          console.error("Auto Sync Failed:", error);
          setSyncStatus('error');
          // Reset status after 5 seconds
          setTimeout(() => setSyncStatus('idle'), 5000);
      }
  }, []);

  return (
    <DataContext.Provider value={{ data, setData, restoreData, isDataLoading, logAudit, triggerAutoSync, syncStatus }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

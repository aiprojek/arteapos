
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { AppData } from '../types';
import { db, initialData } from '../services/db';

// New interface for DB Usage
interface DbUsageStatus {
    totalRecords: number;
    isHeavy: boolean;
}

interface DataContextType {
  data: AppData;
  setData: (value: AppData | ((val: AppData) => AppData)) => void;
  restoreData: (backupData: AppData) => Promise<void>;
  isDataLoading: boolean;
  dbUsageStatus: DbUsageStatus | null; // Exposed Status
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
  const [dbUsageStatus, setDbUsageStatus] = useState<DbUsageStatus | null>(null);
  const prevDataRef = useRef<AppData | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        await db.open();
        console.log("Database opened successfully");
        
        // MEMORY OPTIMIZATION:
        // Removed heavy tables (transactionRecords, stockAdjustments, auditLogs, etc.) from initial load.
        // These will be loaded lazily in their respective views using direct DB queries.
        const [
          products, categoriesObj, rawMaterials, users, settings,
          suppliers, customers, discountDefinitions, heldCarts
        ] = await Promise.all([
          db.products.toArray(),
          db.appState.get('categories'),
          db.rawMaterials.toArray(),
          db.users.toArray(),
          db.settings.toArray(),
          db.suppliers.toArray(),
          db.customers.toArray(),
          db.discountDefinitions.toArray(),
          db.heldCarts.toArray(),
        ]);
        
        // Count DB Load for Status
        const totalRecs = (await db.transactionRecords.count()) + (await db.stockAdjustments.count()) + (await db.auditLogs.count());
        setDbUsageStatus({
            totalRecords: totalRecs,
            isHeavy: totalRecs > 5000
        });

        const loadedData = {
          products,
          categories: categoriesObj?.value || initialData.categories,
          rawMaterials,
          users,
          suppliers,
          customers,
          discountDefinitions,
          heldCarts,
          // Initialize Heavy Arrays as Empty to save memory
          transactionRecords: [], 
          stockAdjustments: [], 
          sessionHistory: [], 
          auditLogs: [], 
          expenses: [],
          otherIncomes: [],
          purchases: [],
          balanceLogs: [],
          // Settings
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

  // --- PERSISTENCE LOGIC ONLY ---
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
                // Only persist Master Data (Products, Users, etc) via Context.
                // Heavy transactional data updates are now handled directly by views/hooks writing to DB.
                case 'products':
                case 'rawMaterials':
                case 'users':
                case 'suppliers':
                case 'customers':
                case 'discountDefinitions':
                case 'heldCarts':
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
                // Heavy tables are ignored here to prevent overwriting DB with empty arrays
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
      await db.auditLogs.bulkAdd(backupData.auditLogs || []); 
      await db.balanceLogs.bulkAdd(backupData.balanceLogs || []);
      
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

  return (
    <DataContext.Provider value={{ data, setData, restoreData, isDataLoading, dbUsageStatus }}>
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

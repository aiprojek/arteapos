
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
        
        // AUDIT OPTIMIZATION: Only load heavy tables partially (Latest 500 records) or empty for lazy loading
        // Master data is still loaded fully.
        
        const [
          products, categoriesObj, rawMaterials, users, settings,
          expenses, otherIncomes, suppliers, purchases, customers, discountDefinitions, heldCarts, sessionHistory, balanceLogs,
          // Count heavy tables instead of loading all
          txnStats, logStats, adjStats
        ] = await Promise.all([
          db.products.toArray(),
          db.appState.get('categories'),
          db.rawMaterials.toArray(),
          db.users.toArray(),
          db.settings.toArray(),
          db.expenses.toArray(), // Expenses usually less than transactions, okay to load
          db.otherIncomes.toArray(),
          db.suppliers.toArray(),
          db.purchases.toArray(),
          db.customers.toArray(),
          db.discountDefinitions.toArray(),
          db.heldCarts.toArray(),
          db.sessionHistory.toArray(),
          db.balanceLogs.toArray(),
          // Metadata
          db.transactionRecords.count(),
          db.auditLogs.count(),
          db.stockAdjustments.count()
        ]);
        
        // MEMORY SAFETY: Load only recent 200 items for context availability. 
        // Full reports should use direct DB queries in Views.
        const recentTransactions = await db.transactionRecords.orderBy('createdAt').reverse().limit(200).toArray();
        const recentAuditLogs = await db.auditLogs.orderBy('timestamp').reverse().limit(100).toArray();
        const recentStockAdj = await db.stockAdjustments.orderBy('createdAt').reverse().limit(100).toArray();

        // Calculate DB Load
        const totalRecs = txnStats + logStats + adjStats + (balanceLogs?.length || 0);
        setDbUsageStatus({
            totalRecords: totalRecs,
            isHeavy: totalRecs > 5000
        });

        const loadedData = {
          products,
          categories: categoriesObj?.value || initialData.categories,
          rawMaterials,
          transactionRecords: recentTransactions, // LOAD LIMITED
          users,
          expenses,
          otherIncomes: otherIncomes || [],
          suppliers,
          purchases,
          stockAdjustments: recentStockAdj, // LOAD LIMITED
          customers,
          discountDefinitions,
          heldCarts,
          sessionHistory: sessionHistory || [],
          auditLogs: recentAuditLogs, // LOAD LIMITED
          balanceLogs: balanceLogs || [],
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
                // LIGHT TABLES (Full Sync)
                case 'products':
                case 'rawMaterials':
                case 'users':
                case 'expenses':
                case 'otherIncomes':
                case 'suppliers':
                case 'purchases':
                case 'customers':
                case 'discountDefinitions':
                case 'heldCarts':
                case 'sessionHistory':
                case 'balanceLogs':
                  promises.push(db.table(key).clear().then(() => db.table(key).bulkAdd(value as any[])));
                  break;
                
                // HEAVY TABLES (Append Only via Context Actions recommended, avoiding full overwrite here if possible)
                // However, for consistency with 'setData' usage in other contexts:
                case 'transactionRecords':
                case 'stockAdjustments':
                case 'auditLogs':
                   // WARNING: With partial loading, we should NOT clear and save back what we have in memory
                   // because we only have the last 200 items!
                   // Data mutations for these tables should happen via db.table.add() directly in Contexts
                   // NOT via setData global state.
                   // Current App Architecture relies on setData. This is a trade-off.
                   // Ideally, we skip persistence here for heavy tables and rely on direct DB calls in addTransaction etc.
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

import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { AppData, ExpenseStatus } from '../types';
import { INITIAL_PRODUCTS } from '../constants';

interface DataContextType {
  data: AppData;
  setData: (value: AppData | ((val: AppData) => AppData)) => void;
  restoreData: (backupData: AppData) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialData: AppData = {
    products: INITIAL_PRODUCTS,
    categories: ['Kopi', 'Non-Kopi', 'Makanan'],
    rawMaterials: [],
    transactions: [],
    users: [],
    receiptSettings: {
        shopName: 'Artea POS',
        address: 'Jalan Teknologi No. 1',
        footerMessage: 'Terima kasih telah berbelanja!',
        enableKitchenPrinter: false,
    },
    inventorySettings: {
        enabled: false,
        trackIngredients: false,
    },
    authSettings: {
        enabled: false,
    },
    sessionSettings: {
        enabled: false,
        enableCartHolding: false,
    },
    expenses: [],
    suppliers: [],
    purchases: [],
    stockAdjustments: [],
    customers: [],
    membershipSettings: {
        enabled: false,
        pointRules: [],
        rewards: [],
    },
    discountDefinitions: [],
    heldCarts: [],
};

const migrateData = (data: any): AppData => {
    const migratedProducts = (data.products || []).map((p: any) => {
        if (typeof p.category === 'string') {
            return { ...p, category: [p.category].filter(Boolean) };
        }
        return p;
    });

    let migratedCategories = data.categories || [];
    if (migratedCategories.length === 0) {
        const categoriesFromProducts = new Set(migratedProducts.flatMap((p: any) => p.category || []));
        migratedCategories = Array.from(categoriesFromProducts);
    }
    
    const migratedExpenses = (data.expenses || []).map((e: any) => {
        if ('status' in e) return e;
        return {
            ...e,
            amountPaid: e.amount,
            status: 'lunas' as ExpenseStatus,
        };
    });

    const migratedRawMaterials = (data.rawMaterials || []).map((rm: any) => {
        if ('costPerUnit' in rm) return rm;
        return { ...rm, costPerUnit: 0 };
    });

    const migrated = { 
        ...data, 
        products: migratedProducts, 
        categories: migratedCategories, 
        expenses: migratedExpenses,
        rawMaterials: migratedRawMaterials
    };

    if (!migrated.customers) migrated.customers = [];
    if (!migrated.membershipSettings) migrated.membershipSettings = { enabled: false, pointRules: [], rewards: [] };
    if (!migrated.stockAdjustments) migrated.stockAdjustments = [];
    if (!migrated.heldCarts) migrated.heldCarts = [];
    if (migrated.sessionSettings && typeof migrated.sessionSettings.enableCartHolding === 'undefined') {
        migrated.sessionSettings.enableCartHolding = false;
    }
    if (migrated.receiptSettings && typeof migrated.receiptSettings.enableKitchenPrinter === 'undefined') {
        migrated.receiptSettings.enableKitchenPrinter = false;
    }
    if (!migrated.discountDefinitions) migrated.discountDefinitions = [];


    return migrated;
};


export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useLocalStorage<AppData>('ai-projek-pos-data', initialData, migrateData);

  const restoreData = (backupData: AppData) => {
      let dataToRestore = { ...initialData, ...backupData };
      if (!dataToRestore.rawMaterials) dataToRestore.rawMaterials = [];
      if (!dataToRestore.users) dataToRestore.users = [];
      if (!dataToRestore.authSettings) dataToRestore.authSettings = { enabled: false };
      if (!dataToRestore.sessionSettings) dataToRestore.sessionSettings = { enabled: false };
      if (!dataToRestore.expenses) dataToRestore.expenses = [];
      if (!dataToRestore.suppliers) dataToRestore.suppliers = [];
      if (!dataToRestore.purchases) dataToRestore.purchases = [];
      if (!dataToRestore.stockAdjustments) dataToRestore.stockAdjustments = [];
      if (!dataToRestore.categories) dataToRestore.categories = [];
      if (!dataToRestore.customers) dataToRestore.customers = [];
      if (!dataToRestore.membershipSettings) dataToRestore.membershipSettings = { enabled: false, pointRules: [], rewards: [] };
      if (!dataToRestore.heldCarts) dataToRestore.heldCarts = [];
      if (!dataToRestore.discountDefinitions) dataToRestore.discountDefinitions = [];


      if (typeof dataToRestore.inventorySettings.trackIngredients === 'undefined') {
          dataToRestore.inventorySettings.trackIngredients = false;
      }
      
      dataToRestore = migrateData(dataToRestore);

      dataToRestore.transactions = dataToRestore.transactions.map((t: any) => {
          if ('paymentStatus' in t) {
              return t;
          }
          return {
              ...t,
              amountPaid: t.total,
              paymentStatus: 'paid',
              payments: [{
                  id: `${new Date(t.createdAt).getTime()}-migrated`,
                  amount: t.total,
                  method: 'cash',
                  createdAt: t.createdAt,
              }]
          };
      });
      setData(dataToRestore);
  };

  return (
    <DataContext.Provider value={{ data, setData, restoreData }}>
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


import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from 'react';
import type { AppData } from '../types';
import { initialData } from '../services/db';
import { restoreAppDataToDb } from '../services/dataPersistenceService';
import {
  type DbUsageStatus,
  useDbUsageStatus,
  useLoadInitialAppData,
  usePersistedAppData,
} from './dataProviderHooks';
import {
  type DataActionsContextType,
  type DataStateContextType,
  type DataStatusContextType,
  type CatalogDataContextType,
  type FinanceDataContextType,
  type SalesDataContextType,
  type UserDataContextType,
  type CustomerDataContextType,
  type SettingsDataContextType,
  type MasterDataContextType,
  useDataContextValues,
} from './dataContextValues';
import { useRenderProfiler } from '../utils/renderProfiler';

interface DataContextType
  extends DataStateContextType,
    DataActionsContextType,
    DataStatusContextType {}

const DataStateContext = createContext<DataStateContextType | undefined>(undefined);
const DataActionsContext = createContext<DataActionsContextType | undefined>(undefined);
const DataStatusContext = createContext<DataStatusContextType | undefined>(undefined);
const CatalogDataContext = createContext<CatalogDataContextType | undefined>(undefined);
const FinanceDataContext = createContext<FinanceDataContextType | undefined>(undefined);
const SalesDataContext = createContext<SalesDataContextType | undefined>(undefined);
const UserDataContext = createContext<UserDataContextType | undefined>(undefined);
const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined);
const SettingsDataContext = createContext<SettingsDataContextType | undefined>(undefined);
const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDataLoading, setIsLoading] = useState(true);
  const [data, _setData] = useState<AppData>(initialData);
  const prevDataRef = useRef<AppData | null>(null);
  const dbUsageStatus = useDbUsageStatus(data);

  useRenderProfiler('DataProvider', {
    isDataLoading,
    totalRecords: dbUsageStatus?.totalRecords ?? 0,
    products: data.products.length,
    rawMaterials: data.rawMaterials.length,
    transactions: data.transactionRecords.length,
    expenses: data.expenses.length,
    heldCarts: data.heldCarts.length,
    customers: data.customers.length,
    users: data.users.length,
  });

  useLoadInitialAppData({
    setData: _setData,
    setIsLoading,
    prevDataRef,
  });

  usePersistedAppData({
    data,
    isDataLoading,
    prevDataRef,
  });
  
  const setData = useCallback((value: AppData | ((val: AppData) => AppData)) => {
    _setData(value);
  }, []);

  const restoreData = useCallback(async (backupData: AppData) => {
    await restoreAppDataToDb(backupData);
    
    window.location.reload();
  }, []);
  const {
    stateValue,
    actionsValue,
    statusValue,
    catalogValue,
    financeValue,
    salesValue,
    userValue,
    customerValue,
    settingsValue,
    masterValue,
  } = useDataContextValues({
    data,
    isDataLoading,
    dbUsageStatus,
    setData,
    restoreData,
  });

  return (
    <DataActionsContext.Provider value={actionsValue}>
      <DataStatusContext.Provider value={statusValue}>
        <DataStateContext.Provider value={stateValue}>
          <CatalogDataContext.Provider value={catalogValue}>
            <FinanceDataContext.Provider value={financeValue}>
              <SalesDataContext.Provider value={salesValue}>
                <UserDataContext.Provider value={userValue}>
                  <CustomerDataContext.Provider value={customerValue}>
                    <SettingsDataContext.Provider value={settingsValue}>
                      <MasterDataContext.Provider value={masterValue}>
                        {children}
                      </MasterDataContext.Provider>
                    </SettingsDataContext.Provider>
                  </CustomerDataContext.Provider>
                </UserDataContext.Provider>
              </SalesDataContext.Provider>
            </FinanceDataContext.Provider>
          </CatalogDataContext.Provider>
        </DataStateContext.Provider>
      </DataStatusContext.Provider>
    </DataActionsContext.Provider>
  );
};

export const useDataState = () => {
  const context = useContext(DataStateContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const useDataActions = () => {
  const context = useContext(DataActionsContext);
  if (context === undefined) {
    throw new Error('useDataActions must be used within a DataProvider');
  }
  return context;
};

export const useDataStatus = () => {
  const context = useContext(DataStatusContext);
  if (context === undefined) {
    throw new Error('useDataStatus must be used within a DataProvider');
  }
  return context;
};

export const useCatalogData = () => {
  const context = useContext(CatalogDataContext);
  if (context === undefined) {
    throw new Error('useCatalogData must be used within a DataProvider');
  }
  return context;
};

export const useFinanceData = () => {
  const context = useContext(FinanceDataContext);
  if (context === undefined) {
    throw new Error('useFinanceData must be used within a DataProvider');
  }
  return context;
};

export const useSalesData = () => {
  const context = useContext(SalesDataContext);
  if (context === undefined) {
    throw new Error('useSalesData must be used within a DataProvider');
  }
  return context;
};

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a DataProvider');
  }
  return context;
};

export const useCustomerData = () => {
  const context = useContext(CustomerDataContext);
  if (context === undefined) {
    throw new Error('useCustomerData must be used within a DataProvider');
  }
  return context;
};

export const useSettingsData = () => {
  const context = useContext(SettingsDataContext);
  if (context === undefined) {
    throw new Error('useSettingsData must be used within a DataProvider');
  }
  return context;
};

export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a DataProvider');
  }
  return context;
};

export const useData = (): DataContextType => ({
  ...useDataState(),
  ...useDataActions(),
  ...useDataStatus(),
});

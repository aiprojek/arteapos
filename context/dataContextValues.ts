import { useMemo } from 'react';

import type { AppData } from '../types';
import type { DbUsageStatus } from './dataProviderHooks';

export interface DataStateContextType {
  data: AppData;
}

export interface DataActionsContextType {
  setData: (value: AppData | ((val: AppData) => AppData)) => void;
  restoreData: (backupData: AppData) => Promise<void>;
}

export interface DataStatusContextType {
  isDataLoading: boolean;
  dbUsageStatus: DbUsageStatus | null;
}

export interface CatalogDataContextType {
  products: AppData['products'];
  categories: AppData['categories'];
  rawMaterials: AppData['rawMaterials'];
  inventorySettings: AppData['inventorySettings'];
  stockAdjustments: AppData['stockAdjustments'];
  receiptSettings: AppData['receiptSettings'];
}

export interface FinanceDataContextType {
  expenses: AppData['expenses'];
  otherIncomes: AppData['otherIncomes'];
  suppliers: AppData['suppliers'];
  purchases: AppData['purchases'];
  transactionRecords: AppData['transactionRecords'];
}

export interface SalesDataContextType {
  transactionRecords: AppData['transactionRecords'];
  heldCarts: AppData['heldCarts'];
  customers: AppData['customers'];
  membershipSettings: AppData['membershipSettings'];
  receiptSettings: AppData['receiptSettings'];
}

export interface UserDataContextType {
  users: AppData['users'];
  authSettings: AppData['authSettings'];
}

export interface CustomerDataContextType {
  customers: AppData['customers'];
  membershipSettings: AppData['membershipSettings'];
  balanceLogs: AppData['balanceLogs'];
}

export interface SettingsDataContextType {
  receiptSettings: AppData['receiptSettings'];
  sessionSettings: AppData['sessionSettings'];
  authSettings: AppData['authSettings'];
}

export interface MasterDataContextType {
  products: AppData['products'];
  categories: AppData['categories'];
  discountDefinitions: AppData['discountDefinitions'];
  membershipSettings: AppData['membershipSettings'];
  customers: AppData['customers'];
  suppliers: AppData['suppliers'];
}

export interface DataContextValues {
  stateValue: DataStateContextType;
  actionsValue: DataActionsContextType;
  statusValue: DataStatusContextType;
  catalogValue: CatalogDataContextType;
  financeValue: FinanceDataContextType;
  salesValue: SalesDataContextType;
  userValue: UserDataContextType;
  customerValue: CustomerDataContextType;
  settingsValue: SettingsDataContextType;
  masterValue: MasterDataContextType;
}

interface UseDataContextValuesArgs {
  data: AppData;
  isDataLoading: boolean;
  dbUsageStatus: DbUsageStatus | null;
  setData: (value: AppData | ((val: AppData) => AppData)) => void;
  restoreData: (backupData: AppData) => Promise<void>;
}

export function useDataContextValues({
  data,
  isDataLoading,
  dbUsageStatus,
  setData,
  restoreData,
}: UseDataContextValuesArgs): DataContextValues {
  const stateValue = useMemo(
    () => ({
      data,
    }),
    [data]
  );

  const actionsValue = useMemo(
    () => ({
      setData,
      restoreData,
    }),
    [setData, restoreData]
  );

  const statusValue = useMemo(
    () => ({
      isDataLoading,
      dbUsageStatus,
    }),
    [isDataLoading, dbUsageStatus]
  );

  const catalogValue = useMemo(
    () => ({
      products: data.products,
      categories: data.categories,
      rawMaterials: data.rawMaterials,
      inventorySettings: data.inventorySettings,
      stockAdjustments: data.stockAdjustments,
      receiptSettings: data.receiptSettings,
    }),
    [
      data.products,
      data.categories,
      data.rawMaterials,
      data.inventorySettings,
      data.stockAdjustments,
      data.receiptSettings,
    ]
  );

  const financeValue = useMemo(
    () => ({
      expenses: data.expenses,
      otherIncomes: data.otherIncomes,
      suppliers: data.suppliers,
      purchases: data.purchases,
      transactionRecords: data.transactionRecords,
    }),
    [
      data.expenses,
      data.otherIncomes,
      data.suppliers,
      data.purchases,
      data.transactionRecords,
    ]
  );

  const salesValue = useMemo(
    () => ({
      transactionRecords: data.transactionRecords,
      heldCarts: data.heldCarts,
      customers: data.customers,
      membershipSettings: data.membershipSettings,
      receiptSettings: data.receiptSettings,
    }),
    [
      data.transactionRecords,
      data.heldCarts,
      data.customers,
      data.membershipSettings,
      data.receiptSettings,
    ]
  );

  const userValue = useMemo(
    () => ({
      users: data.users,
      authSettings: data.authSettings,
    }),
    [data.users, data.authSettings]
  );

  const customerValue = useMemo(
    () => ({
      customers: data.customers,
      membershipSettings: data.membershipSettings,
      balanceLogs: data.balanceLogs,
    }),
    [data.customers, data.membershipSettings, data.balanceLogs]
  );

  const settingsValue = useMemo(
    () => ({
      receiptSettings: data.receiptSettings,
      sessionSettings: data.sessionSettings,
      authSettings: data.authSettings,
    }),
    [data.receiptSettings, data.sessionSettings, data.authSettings]
  );

  const masterValue = useMemo(
    () => ({
      products: data.products,
      categories: data.categories,
      discountDefinitions: data.discountDefinitions,
      membershipSettings: data.membershipSettings,
      customers: data.customers,
      suppliers: data.suppliers,
    }),
    [
      data.products,
      data.categories,
      data.discountDefinitions,
      data.membershipSettings,
      data.customers,
      data.suppliers,
    ]
  );

  return {
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
  };
}

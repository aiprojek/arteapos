import { useEffect, useMemo } from 'react';
import type { MutableRefObject } from 'react';

import type { AppData } from '../types';
import { initialData } from '../services/db';
import {
  loadAppDataFromDb,
  persistAppDataChanges,
} from '../services/dataPersistenceService';

export interface DbUsageStatus {
  totalRecords: number;
  isHeavy: boolean;
}

export function useDbUsageStatus(data: AppData) {
  return useMemo(() => {
    const totalRecords =
      data.transactionRecords.length +
      data.stockAdjustments.length +
      data.auditLogs.length +
      data.balanceLogs.length;

    return {
      totalRecords,
      isHeavy: totalRecords > 5000,
    };
  }, [
    data.transactionRecords,
    data.stockAdjustments,
    data.auditLogs,
    data.balanceLogs,
  ]);
}

interface LoadInitialAppDataArgs {
  setData: (data: AppData) => void;
  setIsLoading: (value: boolean) => void;
  prevDataRef: MutableRefObject<AppData | null>;
}

export function useLoadInitialAppData({
  setData,
  setIsLoading,
  prevDataRef,
}: LoadInitialAppDataArgs) {
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Database opened successfully');
        const loadedData = await loadAppDataFromDb();

        setData(loadedData);
        prevDataRef.current = loadedData;
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
        setData(initialData);
        prevDataRef.current = initialData;
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [setData, setIsLoading, prevDataRef]);
}

interface PersistAppDataArgs {
  data: AppData;
  isDataLoading: boolean;
  prevDataRef: MutableRefObject<AppData | null>;
}

export function usePersistedAppData({
  data,
  isDataLoading,
  prevDataRef,
}: PersistAppDataArgs) {
  useEffect(() => {
    const prevData = prevDataRef.current;
    if (isDataLoading || !prevData || prevData === data) return;

    const persist = async () => {
      try {
        await persistAppDataChanges(prevData, data);
      } catch (error) {
        console.error('Failed to persist data changes to IndexedDB', error);
      }
    };

    persist();
    prevDataRef.current = data;
  }, [data, isDataLoading, prevDataRef]);
}

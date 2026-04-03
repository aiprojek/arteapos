import type { AppData } from '../../types';
import { db } from '../db.ts';
import { syncTableById } from './sharedPersistence.ts';

const FINANCE_TABLE_KEYS: Array<
  'transactionRecords' | 'expenses' | 'otherIncomes' | 'suppliers' | 'purchases'
> = ['transactionRecords', 'expenses', 'otherIncomes', 'suppliers', 'purchases'];

export async function loadFinanceData() {
  const [transactionRecords, expenses, otherIncomes, suppliers, purchases] = await Promise.all([
    db.transactionRecords.toArray(),
    db.expenses.toArray(),
    db.otherIncomes.toArray(),
    db.suppliers.toArray(),
    db.purchases.toArray(),
  ]);

  return {
    transactionRecords,
    expenses,
    otherIncomes: otherIncomes || [],
    suppliers,
    purchases,
  };
}

export async function persistFinanceDataChanges(prevData: AppData, data: AppData): Promise<void> {
  const promises: Promise<unknown>[] = [];

  for (const key of FINANCE_TABLE_KEYS) {
    if (data[key] !== prevData[key]) {
      promises.push(syncTableById(key, data[key]));
    }
  }

  await Promise.all(promises);
}

export async function restoreFinanceData(backupData: AppData): Promise<void> {
  await db.transactionRecords.bulkAdd(backupData.transactionRecords || []);
  await db.expenses.bulkAdd(backupData.expenses || []);
  await db.otherIncomes.bulkAdd(backupData.otherIncomes || []);
  await db.suppliers.bulkAdd(backupData.suppliers || []);
  await db.purchases.bulkAdd(backupData.purchases || []);
}

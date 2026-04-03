import type { AppData } from '../types';
import { db, initialData } from './db.ts';
import {
  loadCatalogData,
  persistCatalogDataChanges,
  restoreCatalogData,
} from './persistence/catalogPersistence.ts';
import {
  loadFinanceData,
  persistFinanceDataChanges,
  restoreFinanceData,
} from './persistence/financePersistence.ts';
import {
  loadAppMetaData,
  persistAppMetaChanges,
  restoreAppMetaData,
} from './persistence/appMetaPersistence.ts';
import { runAppDataTransaction } from './persistence/sharedPersistence.ts';

export async function loadAppDataFromDb(): Promise<AppData> {
  await (db as any).open();

  const [catalogData, financeData, metaData] = await Promise.all([
    loadCatalogData(),
    loadFinanceData(),
    loadAppMetaData(),
  ]);

  return {
    ...catalogData,
    ...financeData,
    ...metaData,
  };
}

export async function persistAppDataChanges(prevData: AppData, data: AppData): Promise<void> {
  await runAppDataTransaction(async () => {
    await Promise.all([
      persistCatalogDataChanges(prevData, data),
      persistFinanceDataChanges(prevData, data),
      persistAppMetaChanges(prevData, data),
    ]);
  });
}

export async function restoreAppDataToDb(backupData: AppData): Promise<void> {
  await (db as any).transaction('rw', (db as any).tables.map((t: any) => t.name), async () => {
    await Promise.all((db as any).tables.map((table: any) => table.clear()));
    await restoreCatalogData(backupData);
    await restoreFinanceData(backupData);
    await restoreAppMetaData(backupData);
  });
}

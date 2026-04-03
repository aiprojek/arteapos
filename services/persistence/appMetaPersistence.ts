import type { AppData } from '../../types';
import { db, initialData } from '../db.ts';
import { syncTableById } from './sharedPersistence.ts';

const META_TABLE_KEYS: Array<
  | 'users'
  | 'customers'
  | 'discountDefinitions'
  | 'heldCarts'
  | 'sessionHistory'
  | 'auditLogs'
  | 'balanceLogs'
> = [
  'users',
  'customers',
  'discountDefinitions',
  'heldCarts',
  'sessionHistory',
  'auditLogs',
  'balanceLogs',
];

const SETTINGS_KEYS: Array<'authSettings' | 'sessionSettings' | 'membershipSettings'> = [
  'authSettings',
  'sessionSettings',
  'membershipSettings',
];

export async function loadAppMetaData() {
  const [
    users,
    customers,
    discountDefinitions,
    heldCarts,
    sessionHistory,
    auditLogs,
    balanceLogs,
    settings,
  ] = await Promise.all([
    db.users.toArray(),
    db.customers.toArray(),
    db.discountDefinitions.toArray(),
    db.heldCarts.toArray(),
    db.sessionHistory.toArray(),
    db.auditLogs.toArray(),
    db.balanceLogs.toArray(),
    db.settings.toArray(),
  ]);

  return {
    users,
    customers,
    discountDefinitions,
    heldCarts,
    sessionHistory: sessionHistory || [],
    auditLogs: auditLogs || [],
    balanceLogs: balanceLogs || [],
    authSettings:
      settings.find(setting => setting.key === 'authSettings')?.value ||
      initialData.authSettings,
    sessionSettings:
      settings.find(setting => setting.key === 'sessionSettings')?.value ||
      initialData.sessionSettings,
    membershipSettings:
      settings.find(setting => setting.key === 'membershipSettings')?.value ||
      initialData.membershipSettings,
  };
}

export async function persistAppMetaChanges(prevData: AppData, data: AppData): Promise<void> {
  const promises: Promise<unknown>[] = [];

  for (const key of META_TABLE_KEYS) {
    if (data[key] !== prevData[key]) {
      promises.push(syncTableById(key, data[key]));
    }
  }

  for (const key of SETTINGS_KEYS) {
    if (data[key] !== prevData[key]) {
      promises.push(db.settings.put({ key, value: data[key] }));
    }
  }

  await Promise.all(promises);
}

export async function restoreAppMetaData(backupData: AppData): Promise<void> {
  await db.users.bulkAdd(backupData.users || []);
  await db.customers.bulkAdd(backupData.customers || []);
  await db.discountDefinitions.bulkAdd(backupData.discountDefinitions || []);
  await db.heldCarts.bulkAdd(backupData.heldCarts || []);
  await db.sessionHistory.bulkAdd(backupData.sessionHistory || []);
  await db.auditLogs.bulkAdd(backupData.auditLogs || []);
  await db.balanceLogs.bulkAdd(backupData.balanceLogs || []);
  await db.settings.bulkPut([
    { key: 'authSettings', value: backupData.authSettings },
    { key: 'sessionSettings', value: backupData.sessionSettings },
    { key: 'membershipSettings', value: backupData.membershipSettings },
  ]);
}

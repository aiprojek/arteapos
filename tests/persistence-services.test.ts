import test from 'node:test';
import assert from 'node:assert/strict';

import { initialData, db } from '../services/db.ts';
import { loadAppMetaData } from '../services/persistence/appMetaPersistence.ts';
import {
  loadCatalogData,
  restoreCatalogData,
} from '../services/persistence/catalogPersistence.ts';
import { loadFinanceData } from '../services/persistence/financePersistence.ts';

test('loadCatalogData seeds empty products and returns settings defaults', async () => {
  const productsTable = db.products as any;
  const rawMaterialsTable = db.rawMaterials as any;
  const stockAdjustmentsTable = db.stockAdjustments as any;
  const appStateTable = db.appState as any;
  const settingsTable = db.settings as any;

  const originals = {
    productsToArray: productsTable.toArray,
    productsBulkAdd: productsTable.bulkAdd,
    rawMaterialsToArray: rawMaterialsTable.toArray,
    stockAdjustmentsToArray: stockAdjustmentsTable.toArray,
    appStateGet: appStateTable.get,
    appStatePut: appStateTable.put,
    settingsToArray: settingsTable.toArray,
  };

  let productReads = 0;
  let seededProducts: unknown[] | null = null;
  let putPayload: unknown = null;

  try {
    productsTable.toArray = async () => {
      productReads += 1;
      return productReads === 1 ? [] : initialData.products;
    };
    productsTable.bulkAdd = async (rows: unknown[]) => {
      seededProducts = rows;
    };
    rawMaterialsTable.toArray = async () => [];
    stockAdjustmentsTable.toArray = async () => [];
    appStateTable.get = async () => undefined;
    appStateTable.put = async (payload: unknown) => {
      putPayload = payload;
    };
    settingsTable.toArray = async () => [];

    const result = await loadCatalogData();

    assert.equal(seededProducts, initialData.products);
    assert.deepEqual(putPayload, { key: 'categories', value: initialData.categories });
    assert.equal(result.products.length, initialData.products.length);
    assert.deepEqual(result.categories, initialData.categories);
    assert.deepEqual(result.receiptSettings, initialData.receiptSettings);
    assert.deepEqual(result.inventorySettings, initialData.inventorySettings);
  } finally {
    productsTable.toArray = originals.productsToArray;
    productsTable.bulkAdd = originals.productsBulkAdd;
    rawMaterialsTable.toArray = originals.rawMaterialsToArray;
    stockAdjustmentsTable.toArray = originals.stockAdjustmentsToArray;
    appStateTable.get = originals.appStateGet;
    appStateTable.put = originals.appStatePut;
    settingsTable.toArray = originals.settingsToArray;
  }
});

test('restoreCatalogData converts inline product image to Blob before bulkAdd', async () => {
  const productsTable = db.products as any;
  const rawMaterialsTable = db.rawMaterials as any;
  const stockAdjustmentsTable = db.stockAdjustments as any;
  const appStateTable = db.appState as any;
  const settingsTable = db.settings as any;

  const originals = {
    productsBulkAdd: productsTable.bulkAdd,
    rawMaterialsBulkAdd: rawMaterialsTable.bulkAdd,
    stockAdjustmentsBulkAdd: stockAdjustmentsTable.bulkAdd,
    appStatePut: appStateTable.put,
    settingsBulkPut: settingsTable.bulkPut,
  };

  let savedProducts: any[] = [];

  try {
    productsTable.bulkAdd = async (rows: any[]) => {
      savedProducts = rows;
    };
    rawMaterialsTable.bulkAdd = async () => {};
    stockAdjustmentsTable.bulkAdd = async () => {};
    appStateTable.put = async () => {};
    settingsTable.bulkPut = async () => {};

    await restoreCatalogData({
      ...initialData,
      products: [
        {
          ...initialData.products[0],
          imageUrl: 'data:text/plain;base64,SGVsbG8=',
        },
      ],
    });

    assert.equal(savedProducts.length, 1);
    assert.ok(savedProducts[0].image instanceof Blob);
    assert.equal(savedProducts[0].imageUrl, undefined);
  } finally {
    productsTable.bulkAdd = originals.productsBulkAdd;
    rawMaterialsTable.bulkAdd = originals.rawMaterialsBulkAdd;
    stockAdjustmentsTable.bulkAdd = originals.stockAdjustmentsBulkAdd;
    appStateTable.put = originals.appStatePut;
    settingsTable.bulkPut = originals.settingsBulkPut;
  }
});

test('loadFinanceData normalizes missing other incomes to empty array', async () => {
  const transactionTable = db.transactionRecords as any;
  const expensesTable = db.expenses as any;
  const otherIncomesTable = db.otherIncomes as any;
  const suppliersTable = db.suppliers as any;
  const purchasesTable = db.purchases as any;

  const originals = {
    transactionToArray: transactionTable.toArray,
    expensesToArray: expensesTable.toArray,
    otherIncomesToArray: otherIncomesTable.toArray,
    suppliersToArray: suppliersTable.toArray,
    purchasesToArray: purchasesTable.toArray,
  };

  try {
    transactionTable.toArray = async () => [];
    expensesTable.toArray = async () => [];
    otherIncomesTable.toArray = async () => undefined;
    suppliersTable.toArray = async () => [];
    purchasesTable.toArray = async () => [];

    const result = await loadFinanceData();
    assert.deepEqual(result.otherIncomes, []);
  } finally {
    transactionTable.toArray = originals.transactionToArray;
    expensesTable.toArray = originals.expensesToArray;
    otherIncomesTable.toArray = originals.otherIncomesToArray;
    suppliersTable.toArray = originals.suppliersToArray;
    purchasesTable.toArray = originals.purchasesToArray;
  }
});

test('loadAppMetaData falls back to initial settings defaults when settings are absent', async () => {
  const usersTable = db.users as any;
  const customersTable = db.customers as any;
  const discountTable = db.discountDefinitions as any;
  const heldCartsTable = db.heldCarts as any;
  const sessionHistoryTable = db.sessionHistory as any;
  const auditLogsTable = db.auditLogs as any;
  const balanceLogsTable = db.balanceLogs as any;
  const settingsTable = db.settings as any;

  const originals = {
    usersToArray: usersTable.toArray,
    customersToArray: customersTable.toArray,
    discountToArray: discountTable.toArray,
    heldCartsToArray: heldCartsTable.toArray,
    sessionHistoryToArray: sessionHistoryTable.toArray,
    auditLogsToArray: auditLogsTable.toArray,
    balanceLogsToArray: balanceLogsTable.toArray,
    settingsToArray: settingsTable.toArray,
  };

  try {
    usersTable.toArray = async () => [];
    customersTable.toArray = async () => [];
    discountTable.toArray = async () => [];
    heldCartsTable.toArray = async () => [];
    sessionHistoryTable.toArray = async () => [];
    auditLogsTable.toArray = async () => [];
    balanceLogsTable.toArray = async () => [];
    settingsTable.toArray = async () => [];

    const result = await loadAppMetaData();

    assert.deepEqual(result.authSettings, initialData.authSettings);
    assert.deepEqual(result.sessionSettings, initialData.sessionSettings);
    assert.deepEqual(result.membershipSettings, initialData.membershipSettings);
  } finally {
    usersTable.toArray = originals.usersToArray;
    customersTable.toArray = originals.customersToArray;
    discountTable.toArray = originals.discountToArray;
    heldCartsTable.toArray = originals.heldCartsToArray;
    sessionHistoryTable.toArray = originals.sessionHistoryToArray;
    auditLogsTable.toArray = originals.auditLogsToArray;
    balanceLogsTable.toArray = originals.balanceLogsToArray;
    settingsTable.toArray = originals.settingsToArray;
  }
});

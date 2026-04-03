import type { AppData } from '../../types';
import { db, initialData } from '../db.ts';
import { base64ToBlob, syncTableById } from './sharedPersistence.ts';

export async function loadCatalogData() {
  let [products, categoriesObj, rawMaterials, stockAdjustments, settings] = await Promise.all([
    db.products.toArray(),
    db.appState.get('categories'),
    db.rawMaterials.toArray(),
    db.stockAdjustments.toArray(),
    db.settings.toArray(),
  ]);

  if (products.length === 0) {
    await db.products.bulkAdd(initialData.products);
    products = await db.products.toArray();

    if (!categoriesObj) {
      await db.appState.put({ key: 'categories', value: initialData.categories });
      categoriesObj = { key: 'categories', value: initialData.categories };
    }
  }

  return {
    products,
    categories: categoriesObj?.value || initialData.categories,
    rawMaterials,
    stockAdjustments,
    receiptSettings:
      settings.find(setting => setting.key === 'receiptSettings')?.value ||
      initialData.receiptSettings,
    inventorySettings:
      settings.find(setting => setting.key === 'inventorySettings')?.value ||
      initialData.inventorySettings,
  };
}

export async function persistCatalogDataChanges(prevData: AppData, data: AppData): Promise<void> {
  const promises: Promise<unknown>[] = [];

  if (data.products !== prevData.products) {
    promises.push(syncTableById('products', data.products));
  }
  if (data.rawMaterials !== prevData.rawMaterials) {
    promises.push(syncTableById('rawMaterials', data.rawMaterials));
  }
  if (data.stockAdjustments !== prevData.stockAdjustments) {
    promises.push(syncTableById('stockAdjustments', data.stockAdjustments));
  }
  if (data.categories !== prevData.categories) {
    promises.push(db.appState.put({ key: 'categories', value: data.categories }));
  }
  if (data.inventorySettings !== prevData.inventorySettings) {
    promises.push(
      db.settings.put({ key: 'inventorySettings', value: data.inventorySettings })
    );
  }
  if (data.receiptSettings !== prevData.receiptSettings) {
    promises.push(db.settings.put({ key: 'receiptSettings', value: data.receiptSettings }));
  }

  await Promise.all(promises);
}

export async function restoreCatalogData(backupData: AppData): Promise<void> {
  const productsWithBlobs = (backupData.products || []).map(product => {
    const nextProduct: any = { ...product };
    if (nextProduct.imageUrl && nextProduct.imageUrl.startsWith('data:')) {
      nextProduct.image = base64ToBlob(nextProduct.imageUrl);
      delete nextProduct.imageUrl;
    }
    return nextProduct;
  });

  await db.products.bulkAdd(productsWithBlobs);
  await db.rawMaterials.bulkAdd(backupData.rawMaterials || []);
  await db.stockAdjustments.bulkAdd(backupData.stockAdjustments || []);
  await db.appState.put({ key: 'categories', value: backupData.categories || [] });
  await db.settings.bulkPut([
    { key: 'receiptSettings', value: backupData.receiptSettings },
    { key: 'inventorySettings', value: backupData.inventorySettings },
  ]);
}

import test from 'node:test';
import assert from 'node:assert/strict';

import type { Purchase } from '../types.ts';
import { applyChannelSalesToData } from '../services/channelSalesService.ts';
import {
  createPurchaseInData,
  processIncomingTransfersToData,
  processOutgoingTransferToData,
} from '../services/inventoryService.ts';
import { createBaseData, createRecipeData } from './helpers/testData.ts';

test('applyChannelSalesToData blocks insufficient stock and deducts on success', () => {
  const prevData = createBaseData();

  const failed = applyChannelSalesToData({
    prevData,
    items: [{ productId: 'prod-1', quantity: 99 }],
    channel: 'Grab',
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.error?.title, 'Stok Tidak Cukup');

  const success = applyChannelSalesToData({
    prevData,
    items: [{ productId: 'prod-1', quantity: 3 }],
    channel: 'Grab',
    now: new Date('2026-04-02T12:00:00.000Z'),
  });
  assert.equal(success.ok, true);
  assert.equal(success.nextData?.products[0].stock, 7);
});

test('applyChannelSalesToData validates and deducts raw materials from recipe items', () => {
  const prevData = createRecipeData();

  const failed = applyChannelSalesToData({
    prevData: {
      ...prevData,
      inventorySettings: { ...prevData.inventorySettings, trackIngredients: true },
      rawMaterials: [{ ...prevData.rawMaterials[0], stock: 1 }],
    },
    items: [{ productId: 'drink-1', quantity: 1 }],
    channel: 'GoFood',
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.error?.title, 'Bahan Baku Tidak Cukup');

  const success = applyChannelSalesToData({
    prevData: {
      ...prevData,
      inventorySettings: { ...prevData.inventorySettings, trackIngredients: true },
    },
    items: [{ productId: 'drink-1', quantity: 2 }],
    channel: 'GoFood',
    now: new Date('2026-04-02T14:00:00.000Z'),
  });

  assert.equal(success.ok, true);
  assert.equal(success.nextData?.products[0].stock, 3);
  assert.equal(success.nextData?.rawMaterials[0].stock, 16);
});

test('inventory purchase and outgoing transfer mutate stock correctly', () => {
  const prevData = createBaseData();
  const purchaseData: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'> = {
    supplierId: 'sup-1',
    items: [{ itemType: 'product', productId: 'prod-1', quantity: 5, price: 7000 }],
    amountPaid: 35000,
    date: '2026-04-02T09:00:00.000Z',
  };

  const purchased = createPurchaseInData({
    prevData,
    purchaseData,
    purchaseId: 'PUR-1',
    now: new Date('2026-04-02T09:00:00.000Z'),
  });

  assert.ok(purchased.purchase);
  assert.equal(purchased.nextData.products[0].stock, 15);

  const transferFailed = processOutgoingTransferToData({
    prevData,
    targetStoreId: 'BR-1',
    items: [{ id: 'prod-1', type: 'product', name: 'Es Teh', qty: 20 }],
    notes: 'Transfer',
  });
  assert.equal(transferFailed.error?.title, 'Stok Tidak Cukup');

  const transferOk = processOutgoingTransferToData({
    prevData: purchased.nextData,
    targetStoreId: 'BR-1',
    items: [{ id: 'prod-1', type: 'product', name: 'Es Teh', qty: 4 }],
    notes: 'Transfer',
    now: new Date('2026-04-02T13:00:00.000Z'),
  });
  assert.equal(transferOk.error, undefined);
  assert.equal(transferOk.nextData.products[0].stock, 11);
});

test('processIncomingTransfersToData adds stock for products and raw materials', () => {
  const prevData = createRecipeData();
  const result = processIncomingTransfersToData({
    prevData,
    transfers: [
      {
        id: 'trf-1',
        fromStoreId: 'MAIN',
        toStoreId: 'BR-1',
        timestamp: '2026-04-02T17:00:00.000Z',
        items: [
          { id: 'drink-1', type: 'product', name: 'Matcha Latte', qty: 2 },
          { id: 'rm-1', type: 'raw_material', name: 'Susu', qty: 5 },
        ],
        notes: 'Restock',
      },
    ],
    now: new Date('2026-04-02T17:10:00.000Z'),
  });

  assert.equal(result.totalAdded, 2);
  assert.equal(result.nextData.products[0].stock, 7);
  assert.equal(result.nextData.rawMaterials[0].stock, 25);
});

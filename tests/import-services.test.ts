import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importFinanceDataToData,
  importStockAdjustmentsToData,
  importTransactionsToData,
  mergeProductsToData,
  mergeRawMaterialsToData,
} from '../services/importService.ts';
import { createBaseData, createRecipeData } from './helpers/testData.ts';

test('importTransactionsToData deduplicates by id and sorts newest first', () => {
  const prevData = {
    ...createBaseData(),
    transactionRecords: [
      {
        id: 'trx-1',
        items: [],
        subtotal: 10000,
        total: 10000,
        amountPaid: 10000,
        paymentStatus: 'paid' as const,
        payments: [],
        createdAt: '2026-04-01T10:00:00.000Z',
        userId: 'user-123',
        userName: 'Kasir',
      },
    ],
  };

  const result = importTransactionsToData(prevData, [
    {
      ...prevData.transactionRecords[0],
      createdAt: '2026-04-05T10:00:00.000Z',
    },
    {
      id: 'trx-2',
      items: [],
      subtotal: 5000,
      total: 5000,
      amountPaid: 5000,
      paymentStatus: 'paid' as const,
      payments: [],
      createdAt: '2026-04-03T10:00:00.000Z',
      userId: 'user-123',
      userName: 'Kasir',
    },
  ]);

  assert.deepEqual(result.transactionRecords.map(transaction => transaction.id), [
    'trx-2',
    'trx-1',
  ]);
});

test('importFinanceDataToData appends only new finance records and sorts each collection', () => {
  const prevData = {
    ...createBaseData(),
    expenses: [
      {
        id: 'exp-1',
        description: 'Listrik',
        amount: 100000,
        amountPaid: 100000,
        status: 'lunas' as const,
        category: 'Operasional',
        date: '2026-04-01T08:00:00.000Z',
      },
    ],
    otherIncomes: [
      {
        id: 'inc-1',
        description: 'Komisi',
        amount: 20000,
        category: 'Lainnya',
        date: '2026-04-01T08:00:00.000Z',
      },
    ],
    purchases: [
      {
        id: 'pur-1',
        supplierId: 'sup-1',
        supplierName: 'Pemasok',
        items: [],
        totalAmount: 50000,
        amountPaid: 50000,
        status: 'lunas' as const,
        date: '2026-04-01T08:00:00.000Z',
      },
    ],
  };

  const result = importFinanceDataToData(
    prevData,
    [
      prevData.expenses[0],
      {
        id: 'exp-2',
        description: 'Air',
        amount: 30000,
        amountPaid: 10000,
        status: 'belum-lunas' as const,
        category: 'Operasional',
        date: '2026-04-03T08:00:00.000Z',
      },
    ],
    [
      {
        id: 'inc-2',
        description: 'Bonus',
        amount: 60000,
        category: 'Lainnya',
        date: '2026-04-02T08:00:00.000Z',
      },
    ],
    [
      {
        id: 'pur-2',
        supplierId: 'sup-1',
        supplierName: 'Pemasok',
        items: [],
        totalAmount: 90000,
        amountPaid: 30000,
        status: 'belum-lunas' as const,
        date: '2026-04-04T08:00:00.000Z',
      },
    ]
  );

  assert.deepEqual(result.expenses.map(expense => expense.id), ['exp-2', 'exp-1']);
  assert.deepEqual(result.otherIncomes.map(income => income.id), ['inc-2', 'inc-1']);
  assert.deepEqual(result.purchases.map(purchase => purchase.id), ['pur-2', 'pur-1']);
});

test('importStockAdjustmentsToData deduplicates by id and keeps newest first', () => {
  const prevData = {
    ...createBaseData(),
    stockAdjustments: [
      {
        id: 'adj-1',
        productId: 'prod-1',
        productName: 'Es Teh',
        change: -1,
        newStock: 9,
        createdAt: '2026-04-01T07:00:00.000Z',
      },
    ],
  };

  const result = importStockAdjustmentsToData(prevData, [
    prevData.stockAdjustments[0],
    {
      id: 'adj-2',
      productId: 'prod-1',
      productName: 'Es Teh',
      change: 3,
      newStock: 12,
      createdAt: '2026-04-03T07:00:00.000Z',
    },
  ]);

  assert.deepEqual(result.stockAdjustments.map(adjustment => adjustment.id), ['adj-2', 'adj-1']);
});

test('mergeProductsToData and mergeRawMaterialsToData overwrite by id without duplicating', () => {
  const prevData = createRecipeData();

  const mergedProducts = mergeProductsToData(prevData, [
    {
      ...prevData.products[0],
      name: 'Matcha Latte Besar',
      stock: 8,
    },
    {
      id: 'drink-2',
      name: 'Thai Tea',
      price: 17000,
      costPrice: 7000,
      category: ['Minuman'],
      stock: 4,
      trackStock: true,
    },
  ]);
  assert.equal(mergedProducts.products.length, 2);
  assert.equal(
    mergedProducts.products.find(product => product.id === 'drink-1')?.name,
    'Matcha Latte Besar'
  );

  const mergedMaterials = mergeRawMaterialsToData(mergedProducts, [
    {
      id: 'rm-1',
      name: 'Susu Full Cream',
      stock: 30,
      unit: 'ml',
    },
    {
      id: 'rm-2',
      name: 'Matcha Powder',
      stock: 12,
      unit: 'gram',
    },
  ]);

  assert.equal(mergedMaterials.rawMaterials.length, 2);
  assert.equal(
    mergedMaterials.rawMaterials.find(material => material.id === 'rm-1')?.name,
    'Susu Full Cream'
  );
});

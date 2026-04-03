import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addExpensePaymentInData,
  addExpenseToData,
  addOtherIncomeToData,
  addPurchasePaymentInData,
  addSupplierToData,
  deleteExpenseInData,
  deleteOtherIncomeInData,
  deleteSupplierInData,
  updateExpenseInData,
  updateOtherIncomeInData,
  updateSupplierInData,
} from '../services/financeCrudService.ts';
import { createBaseData } from './helpers/testData.ts';

test('expense CRUD updates status and keeps newest-first ordering', () => {
  const prevData = createBaseData();

  const withExpense = addExpenseToData(
    prevData,
    {
      description: 'Beli gas',
      amount: 120000,
      amountPaid: 20000,
      category: 'Operasional',
      date: '2026-04-03T09:00:00.000Z',
    },
    'exp-1'
  );

  assert.equal(withExpense.expenses.length, 1);
  assert.equal(withExpense.expenses[0].status, 'belum-lunas');

  const paid = addExpensePaymentInData(withExpense, 'exp-1', 100000);
  assert.equal(paid.expenses[0].amountPaid, 120000);
  assert.equal(paid.expenses[0].status, 'lunas');

  const updated = updateExpenseInData(paid, {
    ...paid.expenses[0],
    description: 'Beli gas elpiji',
    amount: 150000,
  });
  assert.equal(updated.expenses[0].description, 'Beli gas elpiji');
  assert.equal(updated.expenses[0].status, 'belum-lunas');

  const deleted = deleteExpenseInData(updated, 'exp-1');
  assert.equal(deleted.expenses.length, 0);
});

test('other income CRUD keeps newest-first ordering', () => {
  const prevData = createBaseData();

  const withFirst = addOtherIncomeToData(
    prevData,
    {
      description: 'Komisi',
      amount: 50000,
      category: 'Lainnya',
      date: '2026-04-01T10:00:00.000Z',
    },
    'inc-1'
  );
  const withSecond = addOtherIncomeToData(
    withFirst,
    {
      description: 'Sewa etalase',
      amount: 100000,
      category: 'Lainnya',
      date: '2026-04-05T10:00:00.000Z',
    },
    'inc-2'
  );

  assert.deepEqual(withSecond.otherIncomes.map(income => income.id), ['inc-2', 'inc-1']);

  const updated = updateOtherIncomeInData(withSecond, {
    ...withSecond.otherIncomes[1],
    amount: 75000,
    date: '2026-04-06T10:00:00.000Z',
  });

  assert.deepEqual(updated.otherIncomes.map(income => income.id), ['inc-1', 'inc-2']);
  assert.equal(updated.otherIncomes[0].amount, 75000);

  const deleted = deleteOtherIncomeInData(updated, 'inc-2');
  assert.deepEqual(deleted.otherIncomes.map(income => income.id), ['inc-1']);
});

test('supplier CRUD stays alphabetically sorted and purchase payment updates status', () => {
  const prevData = createBaseData();

  const withSupplier = addSupplierToData(
    prevData,
    { name: 'Zeta Supplier', contact: '08123' },
    'sup-2'
  );
  const withAnother = addSupplierToData(
    withSupplier,
    { name: 'Alpha Supplier', contact: '08999' },
    'sup-3'
  );

  assert.deepEqual(withAnother.suppliers.map(supplier => supplier.name), [
    'Alpha Supplier',
    'Pemasok',
    'Zeta Supplier',
  ]);

  const updated = updateSupplierInData(withAnother, {
    id: 'sup-2',
    name: 'Beta Supplier',
    contact: '08123',
  });
  assert.deepEqual(updated.suppliers.map(supplier => supplier.name), [
    'Alpha Supplier',
    'Beta Supplier',
    'Pemasok',
  ]);

  const withPurchase = {
    ...updated,
    purchases: [
      {
        id: 'pur-1',
        supplierId: 'sup-3',
        supplierName: 'Alpha Supplier',
        items: [],
        totalAmount: 90000,
        amountPaid: 20000,
        status: 'belum-lunas' as const,
        date: '2026-04-04T08:00:00.000Z',
      },
    ],
  };

  const paid = addPurchasePaymentInData(withPurchase, 'pur-1', 70000);
  assert.equal(paid.purchases[0].amountPaid, 90000);
  assert.equal(paid.purchases[0].status, 'lunas');

  const deleted = deleteSupplierInData(updated, 'sup-2');
  assert.deepEqual(deleted.suppliers.map(supplier => supplier.id), ['sup-3', 'sup-1']);
});

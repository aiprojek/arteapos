import test from 'node:test';
import assert from 'node:assert/strict';

import type { CartItem, Payment } from '../types.ts';
import { saveTransactionToData } from '../services/transactionService.ts';
import { refundTransactionInData } from '../services/refundService.ts';
import { baseProduct, baseUser, createBaseData, createRecipeData } from './helpers/testData.ts';

test('saveTransactionToData stores transaction and deducts stock', () => {
  const prevData = createBaseData();
  const cart: CartItem[] = [{ ...baseProduct, cartItemId: 'cart-1', quantity: 2 }];
  const payments: Array<Omit<Payment, 'id' | 'createdAt'>> = [{ method: 'cash', amount: 20000 }];

  const result = saveTransactionToData({
    prevData,
    cart,
    cartDiscount: null,
    payments,
    customerId: 'cust-1',
    customerName: 'Pelanggan',
    currentUser: baseUser,
    appliedRewards: [],
    activeHeldCartId: null,
    orderType: 'Dine In',
    tableNumber: '',
    paxCount: 0,
    receiptSettings: prevData.receiptSettings,
    totals: { subtotal: 20000, taxAmount: 0, serviceChargeAmount: 0, finalTotal: 20000 },
    now: new Date('2026-04-02T10:00:00.000Z'),
  });

  assert.equal(result.nextData.transactionRecords.length, 1);
  assert.equal(result.transaction.paymentStatus, 'paid');
  assert.equal(result.nextData.products[0].stock, 8);
  assert.equal(result.nextData.stockAdjustments[0].change, -2);
  assert.equal(result.nextData.customers[0].points, 12);
});

test('refundTransactionInData restores stock and reverts earned points', () => {
  const prevData = createBaseData();
  const sale = saveTransactionToData({
    prevData,
    cart: [{ ...baseProduct, cartItemId: 'cart-1', quantity: 1 }],
    cartDiscount: null,
    payments: [{ method: 'cash', amount: 10000 }],
    customerId: 'cust-1',
    customerName: 'Pelanggan',
    currentUser: baseUser,
    appliedRewards: [],
    activeHeldCartId: null,
    orderType: 'Dine In',
    tableNumber: '',
    paxCount: 0,
    receiptSettings: prevData.receiptSettings,
    totals: { subtotal: 10000, taxAmount: 0, serviceChargeAmount: 0, finalTotal: 10000 },
    now: new Date('2026-04-02T10:00:00.000Z'),
  });

  const refunded = refundTransactionInData({
    prevData: sale.nextData,
    transactionId: sale.transaction.id,
    adjustmentIdFactory: suffix => `adj-${suffix}`,
    now: new Date('2026-04-02T11:00:00.000Z'),
  });

  assert.ok(refunded.refundedTransaction);
  assert.equal(refunded.nextData.products[0].stock, 10);
  assert.equal(refunded.nextData.transactionRecords[0].paymentStatus, 'refunded');
  assert.equal(refunded.nextData.customers[0].points, 10);
});

test('refundTransactionInData restores recipe-based raw materials', () => {
  const prevData = {
    ...createRecipeData(),
    inventorySettings: {
      enabled: true,
      preventNegativeStock: true,
      trackIngredients: true,
    },
  };

  const sale = saveTransactionToData({
    prevData,
    cart: [{ ...prevData.products[0], cartItemId: 'cart-r1', quantity: 2 }],
    cartDiscount: null,
    payments: [{ method: 'cash', amount: 36000 }],
    currentUser: baseUser,
    appliedRewards: [],
    activeHeldCartId: null,
    orderType: 'Dine In',
    tableNumber: '',
    paxCount: 0,
    receiptSettings: prevData.receiptSettings,
    totals: { subtotal: 36000, taxAmount: 0, serviceChargeAmount: 0, finalTotal: 36000 },
    now: new Date('2026-04-02T15:00:00.000Z'),
  });

  assert.equal(sale.nextData.rawMaterials[0].stock, 16);

  const refunded = refundTransactionInData({
    prevData: sale.nextData,
    transactionId: sale.transaction.id,
    adjustmentIdFactory: suffix => `adj-${suffix}`,
    now: new Date('2026-04-02T16:00:00.000Z'),
  });

  assert.ok(refunded.refundedTransaction);
  assert.equal(refunded.nextData.products[0].stock, 5);
  assert.equal(refunded.nextData.rawMaterials[0].stock, 20);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { addPaymentToTransactionInData } from '../services/financeTransactionService.ts';
import { saveTransactionToData } from '../services/transactionService.ts';
import { baseProduct, baseUser, createBaseData } from './helpers/testData.ts';

test('addPaymentToTransactionInData updates partial transaction to paid', () => {
  const prevData = createBaseData();
  const sale = saveTransactionToData({
    prevData,
    cart: [{ ...baseProduct, cartItemId: 'cart-1', quantity: 1 }],
    cartDiscount: null,
    payments: [{ method: 'cash', amount: 2000 }],
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

  const result = addPaymentToTransactionInData({
    prevData: sale.nextData,
    transactionId: sale.transaction.id,
    payments: [{ method: 'cash', amount: 8000 }],
    now: new Date('2026-04-02T10:30:00.000Z'),
  });

  assert.ok(result.updatedTransaction);
  assert.equal(result.updatedTransaction?.amountPaid, 10000);
  assert.equal(result.updatedTransaction?.paymentStatus, 'paid');
  assert.equal(result.updatedTransaction?.payments.length, 2);
});

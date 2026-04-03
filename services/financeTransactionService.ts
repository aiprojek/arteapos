import type { AppData, Payment, Transaction } from '../types';

interface AddPaymentToTransactionInput {
  prevData: AppData;
  transactionId: string;
  payments: Array<Omit<Payment, 'id' | 'createdAt'>>;
  now?: Date;
}

interface AddPaymentToTransactionResult {
  nextData: AppData;
  updatedTransaction: Transaction | null;
}

export const addPaymentToTransactionInData = ({
  prevData,
  transactionId,
  payments,
  now = new Date(),
}: AddPaymentToTransactionInput): AddPaymentToTransactionResult => {
  const targetTransaction = prevData.transactionRecords.find(transaction => transaction.id === transactionId);
  if (!targetTransaction) {
    return { nextData: prevData, updatedTransaction: null };
  }

  const fullNewPayments: Payment[] = payments.map((payment, index) => ({
    ...payment,
    id: `${now.getTime()}-${index}`,
    createdAt: now.toISOString(),
  }));

  const updatedPayments = [...targetTransaction.payments, ...fullNewPayments];
  const newAmountPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);

  let newPaymentStatus: Transaction['paymentStatus'];
  if (newAmountPaid >= targetTransaction.total) {
    newPaymentStatus = 'paid';
  } else if (newAmountPaid > 0) {
    newPaymentStatus = 'partial';
  } else {
    newPaymentStatus = 'unpaid';
  }

  const updatedTransaction: Transaction = {
    ...targetTransaction,
    payments: updatedPayments,
    amountPaid: newAmountPaid,
    paymentStatus: newPaymentStatus,
  };

  return {
    updatedTransaction,
    nextData: {
      ...prevData,
      transactionRecords: prevData.transactionRecords.map(transaction =>
        transaction.id === transactionId ? updatedTransaction : transaction
      ),
    },
  };
};

import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import { CURRENCY_FORMATTER } from '../constants';
import type { Transaction as TransactionType, PaymentMethod } from '../types';

interface UpdatePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payments: Array<{ method: PaymentMethod; amount: number }>) => void;
    transaction: TransactionType;
}

const UpdatePaymentModal: React.FC<UpdatePaymentModalProps> = ({ isOpen, onClose, onConfirm, transaction }) => {
    const [newPayments, setNewPayments] = useState<Array<{ method: PaymentMethod; amount: number }>>([]);
    const [newPaymentAmount, setNewPaymentAmount] = useState('');
    
    const newPaymentsTotal = useMemo(() => newPayments.reduce((sum, p) => sum + p.amount, 0), [newPayments]);
    const totalPaid = transaction.amountPaid + newPaymentsTotal;
    const remainingAmount = transaction.total - totalPaid;

    const handleAddPayment = (method: PaymentMethod) => {
        const amount = parseFloat(newPaymentAmount);
        if (isNaN(amount) || amount <= 0) return;
        setNewPayments([...newPayments, { method, amount }]);
        setNewPaymentAmount('');
    };

    const handleConfirm = () => {
        onConfirm(newPayments);
        setNewPayments([]);
        setNewPaymentAmount('');
    }

    const handleClose = () => {
        setNewPayments([]);
        setNewPaymentAmount('');
        onClose();
    }
    
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={`Update Pembayaran untuk ${transaction.customerName || `Transaksi #${transaction.id}`}`}>
            <div className="space-y-4">
                {transaction.customerName && (
                    <div className="bg-slate-900 p-2 rounded-md text-sm">
                        <p><span className="text-slate-400">Pelanggan:</span> <span className="font-semibold">{transaction.customerName}</span></p>
                        {transaction.customerContact && <p><span className="text-slate-400">Kontak:</span> <span>{transaction.customerContact}</span></p>}
                    </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-700 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Total Tagihan</p>
                        <p className="text-lg font-bold text-slate-200">{CURRENCY_FORMATTER.format(transaction.total)}</p>
                    </div>
                    <div className="bg-slate-700 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Sudah Dibayar</p>
                        <p className="text-lg font-bold text-green-400">{CURRENCY_FORMATTER.format(transaction.amountPaid)}</p>
                    </div>
                    <div className="bg-slate-700 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Sisa Tagihan</p>
                        <p className="text-lg font-bold text-yellow-400">{CURRENCY_FORMATTER.format(transaction.total - transaction.amountPaid)}</p>
                    </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                    <p className="text-sm font-semibold mb-2">Tambah Pembayaran Baru</p>
                    <div className="space-y-2">
                        {newPayments.map((p, i) => (
                            <div key={i} className="flex justify-between p-2 bg-slate-700 rounded-md text-sm">
                                <span>Pembayaran Baru {i+1} ({p.method === 'cash' ? 'Tunai' : 'Non-Tunai'})</span>
                                <span>{CURRENCY_FORMATTER.format(p.amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <input type="number" min="0" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)} placeholder="Masukkan jumlah bayar" className="w-full bg-slate-700 p-3 text-xl text-center rounded-md" />

                <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => handleAddPayment('cash')} disabled={!newPaymentAmount}>Tambah Tunai</Button>
                    <Button onClick={() => handleAddPayment('non-cash')} disabled={!newPaymentAmount}>Tambah Non-Tunai</Button>
                </div>
                
                <div className="pt-4 border-t border-slate-700">
                    <div className="flex justify-between font-bold text-lg">
                        <span>Sisa Tagihan Baru:</span>
                        <span className={remainingAmount > 0 ? 'text-yellow-400' : 'text-green-400'}>
                            {CURRENCY_FORMATTER.format(remainingAmount > 0 ? remainingAmount : 0)}
                        </span>
                    </div>
                    {remainingAmount < 0 && (
                        <div className="flex justify-between text-sm">
                            <span>Kembalian:</span>
                            <span>{CURRENCY_FORMATTER.format(-remainingAmount)}</span>
                        </div>
                    )}
                </div>

                <Button variant="primary" onClick={handleConfirm} disabled={newPayments.length === 0} className="w-full text-lg py-3 mt-4">
                    Simpan Pembayaran
                </Button>
            </div>
        </Modal>
    );
};

export default UpdatePaymentModal;

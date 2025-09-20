import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './Modal';
import Button from './Button';
import { CURRENCY_FORMATTER } from '../constants';
import type { Transaction, PaymentMethod } from '../types';

interface UpdatePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payments: Array<{ method: PaymentMethod; amount: number }>) => void;
    transaction: Transaction;
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
                        <p className="text-lg font-bold text-sky-400">{CURRENCY_FORMATTER.format(transaction.total)}</p>
                    </div>
                    <div className="bg-slate-700 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Total Dibayar</p>
                        <p className="text-lg font-bold text-green-400">{CURRENCY_FORMATTER.format(totalPaid)}</p>
                    </div>
                    <div className="bg-slate-700 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Sisa Tagihan</p>
                        <p className={`text-lg font-bold ${remainingAmount > 0 ? 'text-red-400' : 'text-slate-200'}`}>{CURRENCY_FORMATTER.format(Math.max(0, remainingAmount))}</p>
                    </div>
                </div>

                <div className="space-y-2 max-h-24 overflow-y-auto bg-slate-900 p-2 rounded-md">
                    <p className="text-xs text-slate-500 font-semibold">Pembayaran Sebelumnya:</p>
                    {transaction.payments.map((p) => (
                        <div key={p.id} className="flex justify-between items-center text-sm bg-slate-800/50 px-2 py-1 rounded">
                            <span className="capitalize">{p.method === 'cash' ? 'Tunai' : 'Non-Tunai'}</span>
                            <span>{CURRENCY_FORMATTER.format(p.amount)}</span>
                        </div>
                    ))}
                     {newPayments.map((p, index) => (
                        <div key={`new-${index}`} className="flex justify-between items-center text-sm bg-slate-800 px-2 py-1 rounded border-l-2 border-sky-400">
                            <span className="capitalize">{p.method === 'cash' ? 'Tunai' : 'Non-Tunai'} (Baru)</span>
                            <span className="font-bold">{CURRENCY_FORMATTER.format(p.amount)}</span>
                        </div>
                    ))}
                </div>

                <div className="pt-2">
                    <label htmlFor="newPaymentAmount" className="block text-sm font-medium text-slate-300 mb-1">Tambah Pembayaran Baru</label>
                    <input
                        id="newPaymentAmount"
                        type="number"
                        value={newPaymentAmount}
                        onChange={(e) => setNewPaymentAmount(e.target.value)}
                        placeholder="Masukkan jumlah"
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                    />
                     {remainingAmount > 0 && <button onClick={() => setNewPaymentAmount(remainingAmount.toString())} className="text-xs text-sky-400 hover:text-sky-300 mt-2">Lunasin Sisa Tagihan</button>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => handleAddPayment('cash')} disabled={!newPaymentAmount}>Tunai</Button>
                    <Button onClick={() => handleAddPayment('non-cash')} disabled={!newPaymentAmount}>Non-Tunai</Button>
                </div>
                
                <Button variant="primary" onClick={handleConfirm} className="w-full text-lg py-3 mt-4" disabled={newPayments.length === 0}>
                    Simpan Pembayaran
                </Button>
            </div>
        </Modal>
    );
};

export default UpdatePaymentModal;

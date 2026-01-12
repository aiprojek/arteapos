
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Icon from '../Icon';
import { CURRENCY_FORMATTER } from '../../constants';
import { useCart } from '../../context/CartContext';
import { useSession } from '../../context/SessionContext';
import { useFinance } from '../../context/FinanceContext';
import { useCustomer } from '../../context/CustomerContext';
import type { Customer, Transaction, PaymentMethod, Discount, Reward } from '../../types';

// --- PAYMENT MODAL ---
interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payments: any[], customerDetails: any) => void;
    total: number;
    selectedCustomer: Customer | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm, total, selectedCustomer }) => {
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [customerName, setCustomerName] = useState(''); // Fallback if no selectedCustomer

    useEffect(() => {
        if (isOpen) {
            setAmountPaid('');
            setPaymentMethod('cash');
            setCustomerName(selectedCustomer ? selectedCustomer.name : '');
        }
    }, [isOpen, selectedCustomer]);

    const handleQuickAmount = (amt: number) => {
        setAmountPaid(amt.toString());
    };

    const handleConfirm = () => {
        const payAmount = parseFloat(amountPaid) || 0;
        const payments = [{ method: paymentMethod, amount: payAmount }];
        
        const details = selectedCustomer 
            ? { customerId: selectedCustomer.id, customerName: selectedCustomer.name, customerContact: selectedCustomer.contact }
            : { customerName: customerName || 'Pelanggan Umum' };

        onConfirm(payments, details);
    };

    const change = (parseFloat(amountPaid) || 0) - total;
    const quickAmounts = [total, 20000, 50000, 100000];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pembayaran">
            <div className="space-y-4">
                <div className="text-center bg-slate-700 p-4 rounded-lg">
                    <p className="text-slate-400 text-sm">Total Tagihan</p>
                    <p className="text-3xl font-bold text-white">{CURRENCY_FORMATTER.format(total)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-3 rounded-lg border text-center transition-colors ${paymentMethod === 'cash' ? 'bg-[#347758] border-[#347758] text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
                    >
                        <Icon name="cash" className="w-6 h-6 mx-auto mb-1"/> Tunai
                    </button>
                    <button 
                        onClick={() => setPaymentMethod('non-cash')}
                        className={`p-3 rounded-lg border text-center transition-colors ${paymentMethod === 'non-cash' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
                    >
                        <Icon name="pay" className="w-6 h-6 mx-auto mb-1"/> Non-Tunai (QRIS/Card)
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Jumlah Diterima</label>
                    <input 
                        type="number" 
                        value={amountPaid}
                        onChange={e => setAmountPaid(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-3 text-white text-xl font-bold text-center"
                        placeholder="0"
                        autoFocus
                    />
                </div>

                {paymentMethod === 'cash' && (
                    <div className="flex gap-2 justify-center">
                        {quickAmounts.map((amt, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleQuickAmount(amt)}
                                disabled={amt < total && idx !== 0} // Allow exact if it's the first option
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white disabled:opacity-50"
                            >
                                {idx === 0 ? 'Uang Pas' : CURRENCY_FORMATTER.format(amt).replace(',00', '').replace('Rp', '')}
                            </button>
                        ))}
                    </div>
                )}

                {!selectedCustomer && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nama Pelanggan (Opsional)</label>
                        <input 
                            type="text"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            placeholder="Pelanggan Umum"
                        />
                    </div>
                )}

                {change >= 0 && (
                    <div className="bg-slate-700 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-slate-300">Kembalian</span>
                        <span className="text-xl font-bold text-yellow-400">{CURRENCY_FORMATTER.format(change)}</span>
                    </div>
                )}

                <Button onClick={handleConfirm} disabled={!amountPaid} className="w-full py-3 text-lg">
                    {change >= 0 ? 'Selesaikan Transaksi' : 'Simpan Sebagai Piutang (Kurang Bayar)'}
                </Button>
            </div>
        </Modal>
    );
};

// --- REWARDS MODAL ---
export const RewardsModal: React.FC<{ isOpen: boolean, onClose: () => void, customer: Customer }> = ({ isOpen, onClose, customer }) => {
    const { membershipSettings } = useCustomer();
    const { applyRewardToCart } = useCart();

    const handleRedeem = (reward: Reward) => {
        applyRewardToCart(reward, customer);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Tukar Poin: ${customer.name}`}>
            <div className="space-y-4">
                <div className="text-center p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <p className="text-slate-400 text-sm">Poin Tersedia</p>
                    <p className="text-2xl font-bold text-yellow-400">{customer.points} pts</p>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {membershipSettings.rewards.map(reward => {
                        const canAfford = customer.points >= reward.pointsCost;
                        return (
                            <div key={reward.id} className={`p-3 rounded-lg border flex justify-between items-center ${canAfford ? 'bg-slate-800 border-slate-600' : 'bg-slate-800/50 border-slate-700 opacity-60'}`}>
                                <div>
                                    <p className="font-bold text-white">{reward.name}</p>
                                    <p className="text-xs text-slate-400">{reward.pointsCost} Poin</p>
                                </div>
                                <Button size="sm" onClick={() => handleRedeem(reward)} disabled={!canAfford} variant={canAfford ? 'primary' : 'secondary'}>
                                    Tukar
                                </Button>
                            </div>
                        )
                    })}
                    {membershipSettings.rewards.length === 0 && <p className="text-center text-slate-500">Belum ada reward yang tersedia.</p>}
                </div>
            </div>
        </Modal>
    );
};

// --- DISCOUNT MODAL ---
interface DiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    initialDiscount: Discount | null;
    onSave: (d: Discount) => void;
    onRemove: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, title, initialDiscount, onSave, onRemove }) => {
    const [type, setType] = useState<'percentage' | 'amount'>('percentage');
    const [value, setValue] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialDiscount) {
                setType(initialDiscount.type);
                setValue(initialDiscount.value.toString());
                setName(initialDiscount.name || '');
            } else {
                setType('percentage');
                setValue('');
                setName('');
            }
        }
    }, [isOpen, initialDiscount]);

    const handleSave = () => {
        const val = parseFloat(value);
        if (isNaN(val) || val < 0) return;
        onSave({ type, value: val, name });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setType('percentage')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'percentage' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Persen (%)</button>
                    <button onClick={() => setType('amount')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'amount' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Nominal (Rp)</button>
                </div>
                <div>
                    <label className="block text-sm text-slate-300 mb-1">Nilai Diskon</label>
                    <input type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" autoFocus placeholder="0" />
                </div>
                <div>
                    <label className="block text-sm text-slate-300 mb-1">Keterangan (Opsional)</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" placeholder="cth: Promo Member" />
                </div>
                <div className="flex gap-3 pt-2">
                    {initialDiscount && <Button onClick={() => { onRemove(); onClose(); }} variant="danger" className="flex-1">Hapus</Button>}
                    <Button onClick={handleSave} className="flex-[2]">Simpan</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- CASH MANAGEMENT MODAL ---
export const CashManagementModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addCashMovement } = useSession();
    const [type, setType] = useState<'in' | 'out'>('out');
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');

    const handleSubmit = () => {
        if (!amount || !desc) return;
        addCashMovement(type, parseFloat(amount), desc);
        onClose();
        setAmount('');
        setDesc('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manajemen Kas (Petty Cash)">
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setType('in')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'in' ? 'bg-green-600 text-white' : 'text-slate-300'}`}>Masuk (In)</button>
                    <button onClick={() => setType('out')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'out' ? 'bg-red-600 text-white' : 'text-slate-300'}`}>Keluar (Out)</button>
                </div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" placeholder="Jumlah (Rp)" />
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" placeholder="Keterangan (cth: Beli Es Batu)" />
                <Button onClick={handleSubmit} className="w-full">Simpan</Button>
            </div>
        </Modal>
    );
};

// --- SESSION HISTORY MODAL ---
interface SessionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onViewReceipt: (t: Transaction) => void;
    onRefund: (t: Transaction) => void;
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({ isOpen, onClose, onViewReceipt, onRefund }) => {
    const { session } = useSession();
    const { transactions } = useFinance();
    
    const sessionTransactions = useMemo(() => {
        if (!session) return [];
        return transactions
            .filter(t => new Date(t.createdAt) >= new Date(session.startTime))
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [session, transactions]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Riwayat Transaksi Sesi Ini">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {sessionTransactions.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">Belum ada transaksi.</p>
                ) : (
                    sessionTransactions.map(t => (
                        <div key={t.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-white text-sm">{t.customerName || 'Umum'} <span className="text-slate-500 font-normal">#{t.id.slice(-4)}</span></p>
                                <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleTimeString()} - {t.paymentStatus === 'refunded' ? 'Refunded' : 'Lunas'}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${t.paymentStatus === 'refunded' ? 'text-slate-500 line-through' : 'text-white'}`}>{CURRENCY_FORMATTER.format(t.total)}</p>
                                <div className="flex gap-2 justify-end mt-1">
                                    <button onClick={() => onViewReceipt(t)} className="text-xs text-sky-400 hover:underline">Struk</button>
                                    {t.paymentStatus !== 'refunded' && (
                                        <button onClick={() => onRefund(t)} className="text-xs text-red-400 hover:underline">Refund</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
                <Button onClick={onClose} variant="secondary" className="w-full">Tutup</Button>
            </div>
        </Modal>
    );
};

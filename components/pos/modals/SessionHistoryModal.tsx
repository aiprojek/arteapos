import React, { useMemo } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import { CURRENCY_FORMATTER } from '../../../constants';
import { useSession } from '../../../context/SessionContext';
import { useFinance } from '../../../context/FinanceContext';
import type { Transaction } from '../../../types';

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

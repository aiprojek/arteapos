
import React, { useMemo, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useSession } from '../../context/SessionContext'; // Import Session
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import VirtualizedTable from '../VirtualizedTable';
import Modal from '../Modal';
import Icon from '../Icon';
import type { Transaction, PaymentMethod } from '../../types';

interface DebtsTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: Transaction[];
}

const DebtsTab: React.FC<DebtsTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { transactions: localTransactions, addPaymentToTransaction } = useFinance();
    const { addCashMovement, session } = useSession(); 
    const { logAudit } = useData();
    const { currentUser } = useAuth();
    const { showAlert } = useUI();

    // Modal State
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [paymentAmount, setPaymentAmount] = useState('');

    const activeTransactions = dataSource === 'local' ? localTransactions : cloudData;

    const unpaidTransactions = useMemo(() => 
        activeTransactions
            .filter(t => t.paymentStatus === 'partial' || t.paymentStatus === 'unpaid')
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [activeTransactions]);

    const totalReceivable = useMemo(() => 
        unpaidTransactions.reduce((sum, t) => sum + (t.total - t.amountPaid), 0),
    [unpaidTransactions]);

    const handleOpenPayment = (t: Transaction) => {
        setSelectedTransaction(t);
        setPaymentAmount((t.total - t.amountPaid).toString()); // Default full amount
        setPaymentMethod('cash');
        setPaymentModalOpen(true);
    };

    const handleConfirmPayment = () => {
        if (!selectedTransaction || !paymentAmount) return;
        
        const amount = parseFloat(paymentAmount);
        if (amount <= 0) return;

        const remainingDebt = selectedTransaction.total - selectedTransaction.amountPaid;
        if (amount > remainingDebt) {
            showAlert({ type: 'alert', title: 'Jumlah Berlebih', message: 'Pembayaran melebihi sisa utang.' });
            return;
        }

        // 1. Catat Pembayaran di Transaksi
        addPaymentToTransaction(selectedTransaction.id, [{ method: paymentMethod, amount }]);

        // 2. LOGIKA KRUSIAL: Jika Tunai, Catat di Arus Kas Sesi (Cash In)
        if (paymentMethod === 'cash' && session) {
            addCashMovement(
                'in', 
                amount, 
                `Pelunasan Utang: ${selectedTransaction.customerName || 'Pelanggan'} (#${selectedTransaction.id.slice(-4)})`
            );
        }

        // 3. Audit Log
        logAudit(
            currentUser, 
            'OTHER', 
            `Menerima pembayaran utang sebesar ${CURRENCY_FORMATTER.format(amount)} (${paymentMethod}) untuk transaksi #${selectedTransaction.id.slice(-4)}`, 
            selectedTransaction.id
        );

        showAlert({ type: 'alert', title: 'Berhasil', message: 'Pembayaran utang berhasil dicatat.' });
        setPaymentModalOpen(false);
        setSelectedTransaction(null);
    };

    const columns = [
        { label: 'Waktu', width: '1.5fr', render: (t: Transaction) => new Date(t.createdAt).toLocaleDateString('id-ID') },
        { label: 'Pelanggan', width: '2fr', render: (t: Transaction) => <span className="font-bold text-white">{t.customerName || 'Tanpa Nama'}</span> },
        { label: 'Total', width: '1fr', render: (t: Transaction) => CURRENCY_FORMATTER.format(t.total) },
        { label: 'Sisa Utang', width: '1fr', render: (t: Transaction) => <span className="text-red-400 font-bold">{CURRENCY_FORMATTER.format(t.total - t.amountPaid)}</span> },
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '1fr', 
            render: (t: any) => <span className="text-xs text-slate-400">{t.storeId || t.store_id || '-'}</span> 
        }] : []),
        { label: 'Aksi', width: '100px', render: (t: Transaction) => (
            dataSource === 'local' ? <Button size="sm" onClick={() => handleOpenPayment(t)}>Bayar</Button> : <span className="text-xs text-slate-500">Read-only</span>
        )}
    ];

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-lg border-l-4 border-yellow-500 shadow-md">
                <h3 className="text-slate-400 text-sm uppercase font-bold">Total Piutang (Kasbon Pelanggan)</h3>
                <p className="text-3xl font-bold text-yellow-400 mt-2">{CURRENCY_FORMATTER.format(totalReceivable)}</p>
                {dataSource !== 'local' && <p className="text-xs text-slate-500 mt-1">*Total dari seluruh cabang yang terhubung</p>}
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Daftar Transaksi Belum Lunas</h3>
                <div className="h-[400px]">
                    <VirtualizedTable data={unpaidTransactions} columns={columns} rowHeight={60} minWidth={dataSource !== 'local' ? 900 : 800} />
                </div>
            </div>

            {/* Modal Pembayaran Utang */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Terima Pembayaran Utang">
                <div className="space-y-4">
                    {selectedTransaction && (
                        <div className="bg-slate-900 p-3 rounded-lg text-sm text-slate-300">
                            <p>Pelanggan: <span className="text-white font-bold">{selectedTransaction.customerName}</span></p>
                            <p>Sisa Utang: <span className="text-red-400 font-bold">{CURRENCY_FORMATTER.format(selectedTransaction.total - selectedTransaction.amountPaid)}</span></p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Jumlah Bayar</label>
                        <input 
                            type="number" 
                            value={paymentAmount} 
                            onChange={(e) => setPaymentAmount(e.target.value)} 
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold text-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Metode Pembayaran</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setPaymentMethod('cash')}
                                className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${paymentMethod === 'cash' ? 'bg-[#347758]/20 border-[#347758] text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                            >
                                <Icon name="cash" className="w-6 h-6" />
                                <span className="font-bold">Tunai</span>
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('non-cash')}
                                className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${paymentMethod === 'non-cash' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                            >
                                <Icon name="pay" className="w-6 h-6" />
                                <span className="font-bold">Non-Tunai</span>
                            </button>
                        </div>
                    </div>

                    {paymentMethod === 'cash' && session && (
                        <div className="bg-yellow-900/20 border border-yellow-700 p-2 rounded text-xs text-yellow-200 flex items-start gap-2">
                            <Icon name="info-circle" className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>Pembayaran tunai ini akan otomatis dicatat sebagai <strong>Kas Masuk</strong> pada sesi kasir saat ini.</p>
                        </div>
                    )}

                    <Button onClick={handleConfirmPayment} className="w-full py-3 mt-2">
                        Konfirmasi Pembayaran
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default DebtsTab;

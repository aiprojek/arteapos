
import React, { useMemo, useState, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useSession } from '../../context/SessionContext'; // Import Session
import { useUIActions } from '../../context/UIContext';
import { useAuthState } from '../../context/AuthContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import VirtualizedTable from '../VirtualizedTable';
import Modal from '../Modal';
import Icon from '../Icon';
import { emitAuditEvent } from '../../services/appEvents';
import type { Transaction, PaymentMethod } from '../../types';
import { compressImage } from '../../utils/imageCompression';

interface DebtsTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: Transaction[];
}

const DebtsTab: React.FC<DebtsTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { transactions: localTransactions, addPaymentToTransaction } = useFinance();
    const { addCashMovement, session } = useSession(); 
    const { currentUser } = useAuthState();
    const { showAlert } = useUIActions();

    // Modal State
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [evidenceImage, setEvidenceImage] = useState<string>(''); // NEW
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeTransactions = dataSource === 'local' ? localTransactions : cloudData;

    const unpaidTransactions = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        return activeTransactions
            .filter(t => t.paymentStatus === 'partial' || t.paymentStatus === 'unpaid')
            .filter((transaction) => {
                if (!keyword) return true;
                const customerName = (transaction.customerName || 'tanpa nama').toLowerCase();
                const paymentStatus = (transaction.paymentStatus || '').toLowerCase();
                const dateLabel = new Date(transaction.createdAt).toLocaleDateString('id-ID').toLowerCase();
                return customerName.includes(keyword) || paymentStatus.includes(keyword) || dateLabel.includes(keyword) || transaction.id.toLowerCase().includes(keyword);
            })
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [activeTransactions, searchTerm]);

    const totalReceivable = useMemo(() => 
        unpaidTransactions.reduce((sum, t) => sum + (t.total - t.amountPaid), 0),
    [unpaidTransactions]);
    const overdueCount = useMemo(
        () => unpaidTransactions.filter((transaction) => transaction.paymentStatus === 'unpaid').length,
        [unpaidTransactions]
    );
    const partialCount = useMemo(
        () => unpaidTransactions.filter((transaction) => transaction.paymentStatus === 'partial').length,
        [unpaidTransactions]
    );

    const handleOpenPayment = (t: Transaction) => {
        setSelectedTransaction(t);
        setPaymentAmount((t.total - t.amountPaid).toString()); // Default full amount
        setPaymentMethod('cash');
        setEvidenceImage(''); // Reset image
        setPaymentModalOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setEvidenceImage(compressed);
            } catch (err) {
                showAlert({ type: 'alert', title: 'Error', message: 'Gagal memproses gambar.' });
            }
        }
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

        // 1. Catat Pembayaran di Transaksi (Include Evidence)
        addPaymentToTransaction(selectedTransaction.id, [{ method: paymentMethod, amount, evidenceImageUrl: evidenceImage }]);

        // 2. LOGIKA KRUSIAL: Jika Tunai, Catat di Arus Kas Sesi (Cash In)
        if (paymentMethod === 'cash' && session) {
            addCashMovement(
                'in', 
                amount, 
                `Pelunasan Utang: ${selectedTransaction.customerName || 'Pelanggan'} (#${selectedTransaction.id.slice(-4)})`
            );
        }

        // 3. Audit Log
        void emitAuditEvent({
            user: currentUser,
            action: 'OTHER',
            details: `Menerima pembayaran utang sebesar ${CURRENCY_FORMATTER.format(amount)} (${paymentMethod}) untuk transaksi #${selectedTransaction.id.slice(-4)}`,
            targetId: selectedTransaction.id,
        });

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
        <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Total Piutang</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{CURRENCY_FORMATTER.format(totalReceivable)}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Akumulasi sisa tagihan pelanggan yang belum lunas dari data aktif.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Belum Bayar</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{overdueCount}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Transaksi kasbon yang sama sekali belum menerima pembayaran.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Cicilan Berjalan</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{partialCount}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Transaksi yang sudah dibayar sebagian dan masih punya sisa tagihan.</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Cari pelanggan, status, tanggal, atau ID transaksi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-12 text-white focus:border-[#347758] focus:ring-[#347758]"
                        />
                        <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                                title="Bersihkan pencarian"
                            >
                                <Icon name="close" className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-center sm:min-w-[150px]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Hasil Tampil</p>
                        <p className="mt-1 text-lg font-bold text-white">{unpaidTransactions.length}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 overflow-hidden">
                {unpaidTransactions.length > 0 ? (
                    <>
                        <div className="md:hidden">
                            <div className="space-y-2 p-2">
                                {unpaidTransactions.map((transaction) => {
                                    const remaining = transaction.total - transaction.amountPaid;
                                    return (
                                        <div key={transaction.id} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="truncate pr-1 text-[12px] font-bold leading-tight text-white">{transaction.customerName || 'Tanpa Nama'}</p>
                                                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${transaction.paymentStatus === 'partial' ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border border-red-500/30 bg-red-500/10 text-red-300'}`}>
                                                            {transaction.paymentStatus === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                                        {new Date(transaction.createdAt).toLocaleDateString('id-ID')} • #{transaction.id.slice(-4)}
                                                    </p>
                                                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                                                        <span className="rounded-full border border-slate-600 bg-slate-900/80 px-1.5 py-0.5 text-slate-300">
                                                            Total {CURRENCY_FORMATTER.format(transaction.total)}
                                                        </span>
                                                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-red-300">
                                                            Sisa {CURRENCY_FORMATTER.format(remaining)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {dataSource === 'local' ? (
                                                <div className="mt-2">
                                                    <Button size="sm" onClick={() => handleOpenPayment(transaction)} className="h-8 w-full gap-1 px-2 text-[11px] sm:text-sm">
                                                        <Icon name="cash" className="w-4 h-4" /> Terima Pembayaran
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-center text-[11px] text-slate-500">
                                                    Read-only
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="hidden md:block h-[420px]">
                            <VirtualizedTable data={unpaidTransactions} columns={columns} rowHeight={60} minWidth={dataSource !== 'local' ? 900 : 800} />
                        </div>
                    </>
                ) : (
                    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                            <Icon name="finance" className="mx-auto h-10 w-10 text-slate-500" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-white">
                            {searchTerm ? 'Transaksi piutang tidak ditemukan.' : 'Semua transaksi sudah lunas.'}
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                            {searchTerm
                                ? 'Coba ubah kata kunci pencarian atau periksa kembali nama pelanggan dan tanggal transaksi yang Anda cari.'
                                : 'Belum ada kasbon pelanggan yang perlu ditagih pada sumber data yang sedang aktif.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Pembayaran Utang */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Terima Pembayaran Utang" size="xl" mobileLayout="fullscreen">
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

                    {/* NEW: Evidence Upload for Debt Repayment */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Foto Bukti Transfer (Opsional)</label>
                        <div className="flex flex-col items-center gap-3 p-3 border-2 border-dashed border-slate-600 rounded-lg bg-slate-900/50">
                            {evidenceImage ? (
                                <div className="relative w-full">
                                    <img src={evidenceImage} alt="Bukti" className="h-32 w-full object-contain rounded" />
                                    <button 
                                        onClick={() => setEvidenceImage('')}
                                        className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-full m-1 hover:bg-red-500"
                                    >
                                        <Icon name="close" className="w-3 h-3"/>
                                    </button>
                                </div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer py-2 text-center w-full">
                                    <Icon name="camera" className="w-6 h-6 text-slate-500 mx-auto mb-1"/>
                                    <span className="text-[10px] text-slate-400">Upload Struk/QRIS</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                            {!evidenceImage && (
                                <Button size="sm" variant="utility" onClick={() => fileInputRef.current?.click()} className="w-full">
                                    Ambil Foto
                                </Button>
                            )}
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

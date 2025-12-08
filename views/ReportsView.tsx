
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { useSession } from '../context/SessionContext';
import { useSettings } from '../context/SettingsContext';
import { CURRENCY_FORMATTER } from '../constants';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Transaction as TransactionType, RawMaterial, CashMovement } from '../types';
import ReceiptModal from '../components/ReceiptModal';
import Modal from '../components/Modal';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import VirtualizedTable from '../components/VirtualizedTable';
import { dataService } from '../services/dataService';
import { useUI } from '../context/UIContext';


type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';
type ReportScope = 'session' | 'historical';

const StatCard: React.FC<{title: string; value: string; className?: string}> = ({title, value, className}) => (
    <div className={`bg-slate-800 p-4 rounded-lg ${className}`}>
        <h3 className="text-slate-400 text-sm">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
    </div>
);

const EndSessionModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    sessionSales: number,
    startingCash: number,
    cashIn: number,
    cashOut: number,
}> = ({ isOpen, onClose, sessionSales, startingCash, cashIn, cashOut }) => {
    const { endSession } = useSession();
    const [step, setStep] = useState(1);
    const [finalCashInput, setFinalCashInput] = useState('');

    const expectedCash = startingCash + sessionSales + cashIn - cashOut;
    const finalCashAmount = parseFloat(finalCashInput) || 0;
    const difference = finalCashAmount - expectedCash;

    const handleProceed = () => {
        if (finalCashInput) {
            setStep(2);
        }
    }

    const handleConfirmEnd = () => {
        endSession();
        onClose();
    }
    
    const handleClose = () => {
        setStep(1);
        setFinalCashInput('');
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Tutup Sesi Penjualan">
            {step === 1 && (
                <div className="space-y-4">
                     <p className="text-slate-300">Hitung semua uang tunai di laci kasir dan masukkan jumlah totalnya di bawah ini.</p>
                     <div>
                        <label htmlFor="finalCash" className="block text-sm font-medium text-slate-300 mb-1">Jumlah Uang di Laci (Dihitung)</label>
                        <input
                            id="finalCash"
                            type="number"
                            min="0"
                            value={finalCashInput}
                            onChange={(e) => setFinalCashInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                            placeholder="0"
                        />
                    </div>
                    <Button onClick={handleProceed} disabled={!finalCashInput} className="w-full py-3">
                        Lanjutkan ke Ringkasan
                    </Button>
                </div>
            )}
            {step === 2 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white text-center">Ringkasan Sesi</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Modal Awal</span>
                            <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(startingCash)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Total Penjualan Tunai</span>
                             <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(sessionSales)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Kas Masuk (Lainnya)</span>
                             <span className="font-semibold text-green-400">+ {CURRENCY_FORMATTER.format(cashIn)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Kas Keluar</span>
                             <span className="font-semibold text-red-400">- {CURRENCY_FORMATTER.format(cashOut)}</span>
                        </div>
                         <div className="flex justify-between p-2 bg-slate-900 rounded-md font-bold border-t-2 border-slate-700">
                            <span className="text-slate-300">Uang di Laci Seharusnya</span>
                             <span className="text-white">{CURRENCY_FORMATTER.format(expectedCash)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-700 rounded-md">
                            <span className="text-slate-300">Uang di Laci (Dihitung)</span>
                            <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(finalCashAmount)}</span>
                        </div>
                        <div className={`flex justify-between p-3 rounded-md font-bold text-lg
                            ${difference === 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            <span>Selisih</span>
                            <span>{CURRENCY_FORMATTER.format(difference)}</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 text-center">Pastikan semua data sudah benar sebelum mengakhiri sesi. Tindakan ini tidak dapat diurungkan.</p>
                     <Button onClick={handleConfirmEnd} variant="primary" className="w-full py-3">
                        Konfirmasi & Tutup Sesi
                    </Button>
                </div>
            )}
        </Modal>
    );
}

const PaymentStatusBadge: React.FC<{ status: TransactionType['paymentStatus'] }> = ({ status }) => {
    const statusInfo = {
        paid: { text: 'Lunas', className: 'bg-green-500/20 text-green-300' },
        partial: { text: 'Kurang Bayar', className: 'bg-yellow-500/20 text-yellow-300' },
        unpaid: { text: 'Belum Bayar', className: 'bg-red-500/20 text-red-300' },
        refunded: { text: 'Refunded', className: 'bg-slate-600 text-slate-300 line-through' },
    };
    const { text, className } = statusInfo[status] || { text: 'Unknown', className: 'bg-slate-500/20 text-slate-300' };

    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>{text}</span>;
};

const SendReportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    data: TransactionType[];
    adminWhatsapp?: string;
    adminTelegram?: string;
}> = ({ isOpen, onClose, data, adminWhatsapp, adminTelegram }) => {
    const { showAlert } = useUI();

    if (!isOpen) return null;

    const handleSend = (platform: 'whatsapp' | 'telegram') => {
        if (data.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data untuk dikirim.' });
            return;
        }

        const csvContent = dataService.generateTransactionsCSVString(data);
        const encodedCsv = encodeURIComponent(csvContent);
        
        // Browser URL limit check (conservative approx 2000 chars)
        if (encodedCsv.length > 2000) {
             // Fallback: Copy to clipboard
             navigator.clipboard.writeText(csvContent)
                .then(() => {
                    showAlert({ 
                        type: 'alert', 
                        title: 'Laporan Terlalu Panjang', 
                        message: 'Data laporan terlalu panjang untuk dikirim langsung via URL. Data CSV telah disalin ke clipboard Anda. Silakan tempel (paste) manual di chat.' 
                    });
                })
                .catch(() => {
                     showAlert({ type: 'alert', title: 'Error', message: 'Gagal menyalin data ke clipboard.' });
                });
             onClose();
             return;
        }

        let url = '';
        if (platform === 'whatsapp') {
            const phoneNumber = adminWhatsapp ? adminWhatsapp.replace(/\D/g, '') : '';
            const target = phoneNumber.startsWith('0') ? `62${phoneNumber.slice(1)}` : (phoneNumber.startsWith('62') ? phoneNumber : `62${phoneNumber}`);
            
            if (!target) {
                 showAlert({ type: 'alert', title: 'Nomor WhatsApp Kosong', message: 'Silakan atur nomor WhatsApp admin di Pengaturan.' });
                 return;
            }
            url = `https://wa.me/${target}?text=${encodedCsv}`;
        } else if (platform === 'telegram') {
             // For Telegram, direct message via URL scheme isn't as straightforward as WA without a bot.
             // We use share url with text, but since we don't have a specific URL to share, we use a dummy or just text parameter if supported by client.
             // https://t.me/share/url?url={url}&text={text}
             // Since we only want to send text, we can try leaving URL empty or pointing to app.
             url = `https://t.me/share/url?url=https://arteapos.pages.dev&text=${encodedCsv}`;
        }

        if (url) {
            window.open(url, '_blank');
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kirim Laporan ke Admin">
            <div className="space-y-4">
                <p className="text-slate-300 text-sm">Pilih aplikasi untuk mengirim laporan penjualan (CSV):</p>
                <div className="grid grid-cols-2 gap-4">
                    <Button onClick={() => handleSend('whatsapp')} className="bg-[#25D366] hover:bg-[#1da851] text-white">
                        <Icon name="whatsapp" className="w-5 h-5" /> WhatsApp
                    </Button>
                    <Button onClick={() => handleSend('telegram')} className="bg-[#0088cc] hover:bg-[#0077b5] text-white">
                        <Icon name="telegram" className="w-5 h-5" /> Telegram
                    </Button>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                    <p>Note: Jika data terlalu banyak, aplikasi akan menyalin data ke clipboard agar Anda bisa menempelnya (paste) secara manual.</p>
                </div>
            </div>
        </Modal>
    );
}

const ActionMenu: React.FC<{
    transaction: TransactionType;
    onViewReceipt: (t: TransactionType) => void;
    onPay: (t: TransactionType) => void;
    onRefund: (t: TransactionType) => void;
}> = ({ transaction, onViewReceipt, onPay, onRefund }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-xs font-medium text-white transition-colors"
            >
                Aksi <Icon name="chevron-down" className="w-3 h-3" />
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-600 rounded-md shadow-xl z-[50] flex flex-col overflow-hidden">
                    <button 
                        className="text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                        onClick={() => { onViewReceipt(transaction); setIsOpen(false); }}
                    >
                        <Icon name="printer" className="w-4 h-4" /> Lihat Struk
                    </button>
                    {transaction.paymentStatus !== 'refunded' && (
                        <>
                            {(transaction.paymentStatus === 'unpaid' || transaction.paymentStatus === 'partial') && (
                                <button 
                                    className="text-left px-4 py-2 text-sm text-yellow-300 hover:bg-slate-700 flex items-center gap-2"
                                    onClick={() => { onPay(transaction); setIsOpen(false); }}
                                >
                                    <Icon name="cash" className="w-4 h-4" /> Bayar
                                </button>
                            )}
                            <button 
                                className="text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 flex items-center gap-2 border-t border-slate-700"
                                onClick={() => { onRefund(transaction); setIsOpen(false); }}
                            >
                                <Icon name="reset" className="w-4 h-4" /> Refund
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const ReportsView: React.FC = () => {
    const { transactions, addPaymentToTransaction, refundTransaction } = useFinance();
    const { inventorySettings, rawMaterials, products } = useProduct();
    const { session, startSession, sessionSettings, endSession } = useSession();
    const { receiptSettings } = useSettings();
    const { showAlert } = useUI();
    const [filter, setFilter] = useState<TimeFilter>('today');
    const [reportScope, setReportScope] = useState<ReportScope>('session');
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionType | null>(null);
    const [updatingTransaction, setUpdatingTransaction] = useState<TransactionType | null>(null);
    const [isStartSessionModalOpen, setStartSessionModalOpen] = useState(false);
    const [isEndSessionModalOpen, setEndSessionModalOpen] = useState(false);
    const [isSendReportModalOpen, setSendReportModalOpen] = useState(false);
    const [startingCashInput, setStartingCashInput] = useState('');
    const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isFilterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    const handleStartSession = () => {
        startSession(parseFloat(startingCashInput) || 0);
        setStartSessionModalOpen(false);
        setStartingCashInput('');
    }
    
    const handleRefund = (transaction: TransactionType) => {
        showAlert({
            type: 'confirm',
            title: 'Batalkan Transaksi (Refund)?',
            message: `Anda yakin ingin membatalkan transaksi ini? Stok produk akan dikembalikan dan omzet akan dikurangi. Tindakan ini tidak dapat dibatalkan.`,
            confirmVariant: 'danger',
            confirmText: 'Ya, Refund',
            onConfirm: () => {
                refundTransaction(transaction.id);
            }
        });
    };
    
    useEffect(() => {
        // Automatically switch to historical view if session mode is on but no session is active.
        if (sessionSettings.enabled && !session) {
          setReportScope('historical');
        }
    }, [session, sessionSettings.enabled]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const isSessionMode = sessionSettings.enabled && session;

    const filteredTransactions = useMemo(() => {
        if (isSessionMode && reportScope === 'session') {
            return transactions.filter(t => new Date(t.createdAt) >= new Date(session.startTime));
        }
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return transactions.filter(t => {
            const tDate = new Date(t.createdAt);
            switch (filter) {
                case 'today':
                    return tDate >= today;
                case 'week':
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    return tDate >= weekStart;
                case 'month':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    return tDate >= monthStart;
                case 'custom': {
                    if (!customStartDate || !customEndDate) return true;
                    const start = new Date(customStartDate);
                    start.setHours(0, 0, 0, 0); // Start of the selected day
                    const end = new Date(customEndDate);
                    end.setHours(23, 59, 59, 999); // End of the selected day
                    return tDate >= start && tDate <= end;
                }
                case 'all':
                default:
                    return true;
            }
        });
    }, [transactions, filter, session, isSessionMode, reportScope, customStartDate, customEndDate]);

    const activeTransactions = useMemo(() => filteredTransactions.filter(t => t.paymentStatus !== 'refunded'), [filteredTransactions]);

    const reportData = useMemo(() => {
        let totalSales = 0;
        let totalProfit = 0;
        let totalCashSales = 0;
        const salesByHour = Array(24).fill(0);
        const productSales = new Map<string, {name: string, quantity: number, revenue: number}>();
        
        // Use activeTransactions (excluding refunded) for calculations
        activeTransactions.forEach(t => {
            totalSales += t.total;
            
            // Calculate cash sales specifically for session reconciliation
            const cashPayment = t.payments.find(p => p.method === 'cash');
            if (cashPayment) {
                totalCashSales += cashPayment.amount;
            }

            const hour = new Date(t.createdAt).getHours();
            salesByHour[hour] += t.total;

            const transactionCost = t.items.reduce((sum, item) => {
                // item.costPrice is the single source of truth for cost at the time of transaction.
                // It includes base product cost (from recipe or manual) + addon costs.
                return sum + ((item.costPrice || 0) * item.quantity);
            }, 0);
            totalProfit += t.total - transactionCost;
            
            t.items.forEach(item => {
                const existing = productSales.get(item.id) || { name: item.name, quantity: 0, revenue: 0 };
                productSales.set(item.id, {
                    name: item.name,
                    quantity: existing.quantity + item.quantity,
                    revenue: existing.revenue + (item.price * item.quantity),
                });
            });
        });

        const bestSellingProducts = Array.from(productSales.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        const hourlyChartData = salesByHour.map((total, hour) => ({
            name: `${hour.toString().padStart(2, '0')}:00`,
            total,
        }));

        // Cash Movements from session
        let cashIn = 0;
        let cashOut = 0;
        if (session && reportScope === 'session') {
            session.cashMovements.forEach(m => {
                if (m.type === 'in') cashIn += m.amount;
                else cashOut += m.amount;
            });
        }

        return {
            totalSales,
            totalCashSales,
            totalProfit,
            totalTransactions: activeTransactions.length,
            avgTransaction: activeTransactions.length > 0 ? totalSales / activeTransactions.length : 0,
            profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
            bestSellingProducts,
            hourlyChartData,
            cashIn,
            cashOut
        };
    }, [activeTransactions, session, reportScope]);


    const salesOverTimeData = useMemo(() => {
        const salesMap = new Map<string, number>();
        activeTransactions.forEach(t => {
            const dateKey = new Date(t.createdAt).toISOString().split('T')[0];
            salesMap.set(dateKey, (salesMap.get(dateKey) || 0) + t.total);
        });

        return Array.from(salesMap.entries())
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, total]) => ({
                name: new Date(date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
                total,
            }));
    }, [activeTransactions]);

    const categorySalesData = useMemo(() => {
        const categoryMap = new Map<string, number>();
        activeTransactions.forEach(t => {
            t.items.forEach(item => {
                const categories = (item.category && Array.isArray(item.category) && item.category.length > 0) ? item.category : ['Uncategorized'];
                categories.forEach(cat => {
                    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.price * item.quantity));
                });
            });
        });
        return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
    }, [activeTransactions]);

    const PIE_COLORS = ['#347758', '#6366f1', '#ec4899', '#f97316', '#10b981', '#facc15'];
    
    const exportReport = () => {
        const headers = 'Transaction ID,Date,Time,Total,Items,Cashier,Status';
        const rows = filteredTransactions.map(t => {
            const date = new Date(t.createdAt);
            const items = t.items.map(i => `${i.name} (x${i.quantity})`).join('; ');
            return `${t.id},${date.toLocaleDateString()},${date.toLocaleTimeString()},${t.total},"${items}","${t.userName}","${t.paymentStatus}"`;
        });
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_report_${isSessionMode ? reportScope : filter}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const showSessionView = sessionSettings.enabled && reportScope === 'session';
    
    const filterLabels: Record<TimeFilter, string> = {
        today: 'Hari Ini',
        week: 'Minggu Ini',
        month: 'Bulan Ini',
        all: 'Semua',
        custom: 'Kustom'
    };

    const handleFilterChange = (newFilter: TimeFilter) => {
        setFilter(newFilter);
        setFilterDropdownOpen(false);
    };

    const columns = useMemo(() => [
        { label: 'Waktu', width: '1.5fr', render: (t: TransactionType) => <span className="text-slate-400 whitespace-nowrap">{new Date(t.createdAt).toLocaleString('id-ID')}</span> },
        { label: 'Pelanggan', width: '1fr', render: (t: TransactionType) => <span className="font-semibold text-white">{t.customerName || '-'}</span> },
        { label: 'Kasir', width: '1fr', render: (t: TransactionType) => t.userName },
        { label: 'Total', width: '1fr', render: (t: TransactionType) => <span className={`font-medium ${t.paymentStatus === 'refunded' ? 'line-through text-slate-500' : ''}`}>{CURRENCY_FORMATTER.format(t.total)}</span> },
        { label: 'Status Pembayaran', width: '1fr', render: (t: TransactionType) => <PaymentStatusBadge status={t.paymentStatus} /> },
        { label: 'Items', width: '2fr', render: (t: TransactionType) => <span className="truncate">{t.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</span> },
        { label: 'Aksi', width: '1fr', className: 'overflow-visible', render: (t: TransactionType) => (
            <ActionMenu 
                transaction={t}
                onViewReceipt={setSelectedTransaction}
                onPay={setUpdatingTransaction}
                onRefund={handleRefund}
            />
        )}
    ], [setSelectedTransaction, setUpdatingTransaction, handleRefund]);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-4">
                     <div>
                         <h1 className="text-2xl font-bold text-white">{showSessionView && session ? 'Laporan Sesi Saat Ini' : 'Laporan Penjualan'}</h1>
                         {showSessionView && session && (
                            <p className="text-sm text-slate-400">Dimulai pada {new Date(session.startTime).toLocaleString('id-ID')} oleh {session.userName}</p>
                         )}
                    </div>
                     <div className="flex gap-2 items-center flex-wrap justify-end">
                        {sessionSettings.enabled && (
                            <div className="flex bg-slate-700 p-1 rounded-lg">
                                <button onClick={() => setReportScope('session')} disabled={!session} className={`px-3 py-1 text-sm rounded-md transition-colors ${reportScope === 'session' ? 'bg-[#347758] text-white' : 'text-slate-300 hover:bg-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    Sesi Saat Ini
                                </button>
                                <button onClick={() => setReportScope('historical')} className={`px-3 py-1 text-sm rounded-md transition-colors ${reportScope === 'historical' ? 'bg-[#347758] text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
                                    Semua Laporan
                                </button>
                            </div>
                        )}
                        
                        {(!sessionSettings.enabled || reportScope === 'historical') && (
                            <div className="relative" ref={filterDropdownRef}>
                                <Button variant="secondary" size="sm" onClick={() => setFilterDropdownOpen(prev => !prev)}>
                                    Filter: {filterLabels[filter]}
                                    <svg className={`w-4 h-4 ml-1 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </Button>
                                {isFilterDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-slate-700 rounded-lg shadow-xl z-10">
                                        {(['today', 'week', 'month', 'all', 'custom'] as TimeFilter[]).map(f => (
                                            <button 
                                                key={f} 
                                                onClick={() => handleFilterChange(f)}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${filter === f ? 'bg-[#347758] text-white' : 'text-slate-200 hover:bg-slate-600'}`}
                                            >
                                                {filterLabels[f]}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <Button onClick={exportReport} variant="secondary" size="sm" disabled={filteredTransactions.length === 0}>
                            <Icon name="download" className="w-4 h-4"/> Export CSV
                        </Button>
                        
                        <Button onClick={() => setSendReportModalOpen(true)} variant="primary" size="sm" disabled={filteredTransactions.length === 0}>
                            <Icon name="chat" className="w-4 h-4"/> Kirim ke Admin
                        </Button>

                        {sessionSettings.enabled && !session && (
                            <Button onClick={() => setStartSessionModalOpen(true)} variant="primary" size="sm">
                                <Icon name="plus" className="w-4 h-4"/>
                                Mulai Sesi
                            </Button>
                        )}
                        {isSessionMode && (
                             <Button onClick={() => setEndSessionModalOpen(true)} variant="danger" size="sm">
                                Tutup Sesi
                            </Button>
                        )}
                    </div>
                </div>
                
                {(!sessionSettings.enabled || reportScope === 'historical') && filter === 'custom' && (
                    <div className="w-full flex flex-col sm:flex-row gap-4 items-center justify-end bg-slate-800 p-3 rounded-lg">
                        <div>
                            <label htmlFor="startDate" className="text-sm text-slate-400 mr-2">Dari Tanggal:</label>
                            <input
                                id="startDate"
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="text-sm text-slate-400 mr-2">Sampai Tanggal:</label>
                            <input
                                id="endDate"
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className={`grid grid-cols-2 ${inventorySettings.enabled ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
                 {showSessionView && session ? (
                    <>
                        <StatCard title="Modal Awal" value={CURRENCY_FORMATTER.format(session.startingCash)} />
                        <StatCard title="Penjualan Bersih" value={CURRENCY_FORMATTER.format(reportData.totalSales)} />
                        <StatCard title="Estimasi Kas Di Laci" value={CURRENCY_FORMATTER.format(session.startingCash + reportData.totalCashSales + reportData.cashIn - reportData.cashOut)} className="bg-[#347758]/20" />
                        {inventorySettings.enabled && <StatCard title="Laba Sesi" value={CURRENCY_FORMATTER.format(reportData.totalProfit)} />}
                    </>
                ) : (
                    <>
                        <StatCard title="Total Penjualan Bersih" value={CURRENCY_FORMATTER.format(reportData.totalSales)} />
                        <StatCard title="Total Transaksi" value={reportData.totalTransactions.toString()} />
                        <StatCard title="Rata-rata/Transaksi" value={CURRENCY_FORMATTER.format(reportData.avgTransaction)} />
                        {inventorySettings.enabled && <StatCard title="Total Laba" value={CURRENCY_FORMATTER.format(reportData.totalProfit)} />}
                    </>
                )}
            </div>

            {sessionSettings.enabled && !session && reportScope === 'session' ? (
                 <div className="text-center py-12 bg-slate-800 rounded-lg">
                    <Icon name="reports" className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">Tidak Ada Sesi Aktif</h3>
                    <p className="text-slate-400 mt-2">Mulai sesi baru untuk melihat laporan sesi saat ini.</p>
                </div>
            ) : filteredTransactions.length === 0 && !session ? (
                <div className="text-center py-12 bg-slate-800 rounded-lg">
                    <p className="text-slate-400">{showSessionView ? 'Belum ada transaksi di sesi ini.' : 'Tidak ada transaksi untuk periode yang dipilih.'}</p>
                </div>
            ) : (
                <>
                    {/* Session Cash Movement Summary */}
                    {showSessionView && session && (reportData.cashIn > 0 || reportData.cashOut > 0) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-slate-800 p-4 rounded-lg">
                                <h3 className="font-semibold text-white mb-2">Aktivitas Kas Non-Penjualan</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Total Kas Masuk (Tambahan)</span>
                                        <span className="text-green-400 font-semibold">+{CURRENCY_FORMATTER.format(reportData.cashIn)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Total Kas Keluar</span>
                                        <span className="text-red-400 font-semibold">-{CURRENCY_FORMATTER.format(reportData.cashOut)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-lg overflow-y-auto max-h-40">
                                <h3 className="font-semibold text-white mb-2 text-sm">Rincian Pergerakan Kas</h3>
                                <table className="w-full text-xs text-left">
                                    <tbody>
                                        {session.cashMovements.map((m) => (
                                            <tr key={m.id} className="border-b border-slate-700/50">
                                                <td className="py-1">{new Date(m.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</td>
                                                <td className="py-1">{m.description}</td>
                                                <td className={`py-1 text-right font-medium ${m.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {m.type === 'in' ? '+' : '-'}{CURRENCY_FORMATTER.format(m.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {inventorySettings.enabled && (
                         <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                             <div className="lg:col-span-3 bg-slate-800 p-4 rounded-lg">
                                <h3 className="font-semibold mb-4 text-white">Penjualan per Jam (Jam Sibuk)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={reportData.hourlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                        <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Total']} />
                                        <Bar dataKey="total" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="lg:col-span-2 bg-slate-800 p-4 rounded-lg">
                                <h3 className="font-semibold text-white mb-4">Produk Terlaris</h3>
                                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                                    {reportData.bestSellingProducts.map((p, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-300 truncate pr-2">{p.name}</span>
                                            <span className="font-semibold text-white bg-slate-700 px-2 py-0.5 rounded">{p.quantity} terjual</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-4 text-white">Penjualan per Hari</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={salesOverTimeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Total']} />
                                    <Bar dataKey="total" fill="#347758" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-4 text-white">Penjualan per Kategori</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={categorySalesData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name"
                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                            return ( <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">{`${(percent * 100).toFixed(0)}%`}</text> );
                                        }}>
                                        {categorySalesData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} /> ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number, name: string) => [CURRENCY_FORMATTER.format(value), name]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-800 rounded-lg shadow-md flex flex-col min-h-[400px]">
                        <h2 className="text-lg font-semibold p-4">Detail Transaksi</h2>
                        <div className="flex-1 min-h-0">
                           <VirtualizedTable 
                                data={filteredTransactions}
                                columns={columns}
                                rowHeight={60}
                           />
                        </div>
                    </div>
                </>
            )}
            
            <Modal isOpen={isStartSessionModalOpen} onClose={() => setStartSessionModalOpen(false)} title="Mulai Sesi Penjualan">
                <div className="space-y-4">
                    <p className="text-slate-300">Masukkan jumlah uang tunai awal (modal) yang tersedia di laci kasir.</p>
                    <div>
                        <label htmlFor="startingCash" className="block text-sm font-medium text-slate-300 mb-1">Uang Awalan (IDR)</label>
                        <input
                            id="startingCash"
                            type="number"
                            min="0"
                            value={startingCashInput}
                            onChange={(e) => setStartingCashInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                            placeholder="0"
                        />
                    </div>
                    <Button onClick={handleStartSession} className="w-full py-3">
                        Mulai Sesi
                    </Button>
                </div>
            </Modal>
            
            {selectedTransaction && (
                <ReceiptModal isOpen={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} transaction={selectedTransaction} />
            )}

            {updatingTransaction && (
                <UpdatePaymentModal 
                    isOpen={!!updatingTransaction}
                    onClose={() => setUpdatingTransaction(null)}
                    transaction={updatingTransaction}
                    onConfirm={(newPayments) => {
                        addPaymentToTransaction(updatingTransaction.id, newPayments);
                        setUpdatingTransaction(null);
                    }}
                />
            )}

            {isSessionMode && session && (
                <EndSessionModal
                    isOpen={isEndSessionModalOpen}
                    onClose={() => setEndSessionModalOpen(false)}
                    sessionSales={reportData.totalCashSales}
                    startingCash={session.startingCash}
                    cashIn={reportData.cashIn}
                    cashOut={reportData.cashOut}
                />
            )}

            <SendReportModal
                isOpen={isSendReportModalOpen}
                onClose={() => setSendReportModalOpen(false)}
                data={filteredTransactions}
                adminWhatsapp={receiptSettings.adminWhatsapp}
                adminTelegram={receiptSettings.adminTelegram}
            />
        </div>
    );
};

export default ReportsView;

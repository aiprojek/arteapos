
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { useSession } from '../context/SessionContext';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { CURRENCY_FORMATTER } from '../constants';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Transaction as TransactionType, SessionHistory, StockAdjustment } from '../types';
import ReceiptModal from '../components/ReceiptModal';
import Modal from '../components/Modal';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import VirtualizedTable from '../components/VirtualizedTable';
import { dataService } from '../services/dataService';
import { useUI } from '../context/UIContext';
import EndSessionModal from '../components/EndSessionModal';
import SendReportModal from '../components/SendReportModal';
import { supabaseService } from '../services/supabaseService';


type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';
type ReportScope = 'session' | 'historical' | 'session_history';
type ReportTab = 'sales' | 'stock_logs';

const StatCard: React.FC<{title: string; value: string; className?: string}> = ({title, value, className}) => (
    <div className={`bg-slate-800 p-4 rounded-lg ${className}`}>
        <h3 className="text-slate-400 text-sm">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
    </div>
);

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

const ActionMenu: React.FC<{
    transaction: TransactionType;
    onViewReceipt: (t: TransactionType) => void;
    onPay: (t: TransactionType) => void;
    onRefund: (t: TransactionType) => void;
    disabled?: boolean;
}> = ({ transaction, onViewReceipt, onPay, onRefund, disabled }) => {
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

    if (disabled) {
        return <button onClick={() => onViewReceipt(transaction)} className="text-slate-400 hover:text-white"><Icon name="printer" className="w-4 h-4"/></button>
    }

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

const SessionHistoryTable: React.FC<{ history: SessionHistory[] }> = ({ history }) => {
    return (
        <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-left min-w-[900px] text-sm">
                <thead className="bg-slate-700 text-slate-200">
                    <tr>
                        <th className="p-3">Mulai</th>
                        <th className="p-3">Selesai</th>
                        <th className="p-3">User</th>
                        <th className="p-3 text-right">Modal Awal</th>
                        <th className="p-3 text-right">Omzet Tunai</th>
                        <th className="p-3 text-right">Fisik (Aktual)</th>
                        <th className="p-3 text-right">Selisih</th>
                    </tr>
                </thead>
                <tbody>
                    {history.length === 0 ? (
                        <tr><td colSpan={7} className="p-4 text-center text-slate-500">Belum ada riwayat sesi.</td></tr>
                    ) : history.map(s => (
                        <tr key={s.id} className="border-b border-slate-700 last:border-b-0">
                            <td className="p-3 text-slate-300">{new Date(s.startTime).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-slate-300">{s.endTime ? new Date(s.endTime).toLocaleString('id-ID') : '-'}</td>
                            <td className="p-3">{s.userName}</td>
                            <td className="p-3 text-right text-slate-400">{CURRENCY_FORMATTER.format(s.startingCash)}</td>
                            <td className="p-3 text-right text-green-400 font-medium">{CURRENCY_FORMATTER.format(s.totalSales)}</td>
                            <td className="p-3 text-right text-white font-bold">{CURRENCY_FORMATTER.format(s.actualCash)}</td>
                            <td className={`p-3 text-right font-bold ${s.variance === 0 ? 'text-slate-500' : s.variance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {CURRENCY_FORMATTER.format(s.variance)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ReportsView: React.FC = () => {
    const { transactions: localTransactions, addPaymentToTransaction, refundTransaction } = useFinance();
    const { inventorySettings, stockAdjustments: localStockAdjustments } = useProduct();
    const { session, startSession, sessionSettings, endSession } = useSession();
    const { data: appData } = useData();
    const { receiptSettings } = useSettings();
    const { showAlert } = useUI();
    const [filter, setFilter] = useState<TimeFilter>('today');
    const [reportScope, setReportScope] = useState<ReportScope>('session');
    const [activeTab, setActiveTab] = useState<ReportTab>('sales');
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

    // Branch Filtering State
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

    // Cloud Mode State
    const [dataSource, setDataSource] = useState<'local' | 'cloud'>('local');
    const [cloudTransactions, setCloudTransactions] = useState<TransactionType[]>([]);
    const [cloudStockLogs, setCloudStockLogs] = useState<StockAdjustment[]>([]);
    const [isCloudLoading, setIsCloudLoading] = useState(false);

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

    // Load Cloud Data when Filter or Source Changes
    useEffect(() => {
        if (dataSource === 'cloud') {
            const loadCloud = async () => {
                const sbUrl = localStorage.getItem('ARTEA_SB_URL');
                const sbKey = localStorage.getItem('ARTEA_SB_KEY');
                if (!sbUrl || !sbKey) {
                    setDataSource('local');
                    return;
                }

                setIsCloudLoading(true);
                supabaseService.init(sbUrl, sbKey);

                const now = new Date();
                let start = new Date();
                let end = new Date();

                if (filter === 'today') {
                    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                } else if (filter === 'week') {
                    start.setDate(now.getDate() - 7);
                } else if (filter === 'month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                } else if (filter === 'custom') {
                    start = new Date(customStartDate);
                    end = new Date(customEndDate);
                    end.setHours(23, 59, 59);
                } else {
                    start = new Date(0); // All time
                }

                // Fetch Transactions
                const transData = await supabaseService.fetchReportData(start, end);
                const mappedData = transData.map((t: any) => ({
                    ...t,
                    createdAt: t.created_at,
                    paymentStatus: t.payment_status,
                    userName: t.user_name || 'Cloud',
                    customerName: t.customerName || '-', 
                    items: t.items || [],
                    storeId: t.store_id // Map DB to Prop
                }));
                setCloudTransactions(mappedData);

                // Fetch Stock Logs
                const stockData = await supabaseService.fetchStockAdjustments(start, end);
                const mappedStock = stockData.map((s: any) => ({
                    ...s,
                    createdAt: s.created_at,
                    productId: s.product_id,
                    productName: s.product_name,
                    newStock: s.new_stock,
                    storeId: s.store_id
                }));
                setCloudStockLogs(mappedStock);

                setIsCloudLoading(false);
            };
            loadCloud();
        }
    }, [dataSource, filter, customStartDate, customEndDate]);
    
    const isSessionMode = sessionSettings.enabled && session;

    // Use current transaction source
    const transactions = dataSource === 'local' ? localTransactions : cloudTransactions;
    const stockLogs = dataSource === 'local' ? localStockAdjustments : cloudStockLogs;

    // Available Branches for Filter
    const availableBranches = useMemo(() => {
        const branches = new Set<string>();
        // Add local branch
        branches.add(receiptSettings.storeId || 'LOCAL');
        
        // Add imported/cloud branches
        transactions.forEach(t => {
            if (t.storeId) branches.add(t.storeId);
        });
        return Array.from(branches).sort();
    }, [transactions, receiptSettings.storeId]);

    // FILTER LOGIC
    const dateFilterPredicate = (dateStr: string) => {
        const tDate = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
                start.setHours(0, 0, 0, 0); 
                const end = new Date(customEndDate);
                end.setHours(23, 59, 59, 999);
                return tDate >= start && tDate <= end;
            }
            case 'all':
            default:
                return true;
        }
    };

    const filteredTransactions = useMemo(() => {
        let result = transactions;

        // 1. Branch Filter
        if (selectedBranch !== 'ALL') {
            result = result.filter(t => t.storeId === selectedBranch);
        }

        // 2. Date Filter (Cloud already filtered by query, so skip if cloud)
        if (dataSource === 'local') {
            if (isSessionMode && reportScope === 'session') {
                result = result.filter(t => new Date(t.createdAt) >= new Date(session.startTime));
            } else {
                result = result.filter(t => dateFilterPredicate(t.createdAt));
            }
        }
        
        return result;
    }, [transactions, filter, session, isSessionMode, reportScope, customStartDate, customEndDate, dataSource, selectedBranch]);

    const filteredStockLogs = useMemo(() => {
        let result = stockLogs;
        
        // 1. Branch Filter (Assuming Stock Logs also carry storeId now - added in Types)
        // Note: Currently local stock logs don't explicitly store 'storeId' but we can assume 'LOCAL' or current settings
        // For Cloud, they do.
        if (dataSource === 'cloud' && selectedBranch !== 'ALL') {
             // @ts-ignore
             result = result.filter(s => s.storeId === selectedBranch);
        }

        if (dataSource === 'local') {
             result = result.filter(s => dateFilterPredicate(s.createdAt)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return result;
    }, [stockLogs, filter, customStartDate, customEndDate, dataSource, selectedBranch]);

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
            const cashPayment = t.payments?.find((p: any) => p.method === 'cash');
            if (cashPayment) {
                totalCashSales += cashPayment.amount;
            }

            const hour = new Date(t.createdAt).getHours();
            salesByHour[hour] += t.total;

            const transactionCost = t.items.reduce((sum: number, item: any) => {
                // item.costPrice is the single source of truth for cost at the time of transaction.
                // It includes base product cost (from recipe or manual) + addon costs.
                return sum + ((item.costPrice || 0) * item.quantity);
            }, 0);
            totalProfit += t.total - transactionCost;
            
            t.items.forEach((item: any) => {
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

        // Cash Movements from session (Only locally relevant)
        let cashIn = 0;
        let cashOut = 0;
        if (session && reportScope === 'session' && dataSource === 'local') {
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
    }, [activeTransactions, session, reportScope, dataSource]);


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
            t.items.forEach((item: any) => {
                const categories = (item.category && Array.isArray(item.category) && item.category.length > 0) ? item.category : ['Uncategorized'];
                categories.forEach((cat: string) => {
                    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.price * item.quantity));
                });
            });
        });
        return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
    }, [activeTransactions]);

    const PIE_COLORS = ['#347758', '#6366f1', '#ec4899', '#f97316', '#10b981', '#facc15'];
    
    const exportReport = () => {
        if (activeTab === 'stock_logs') {
            const stockCsv = dataService.generateStockAdjustmentsCSVString(filteredStockLogs);
            const blob = new Blob([stockCsv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `stock_log_${filter}_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        const headers = 'Transaction ID,Date,Time,Total,Items,Cashier,Status,Branch';
        const rows = filteredTransactions.map(t => {
            const date = new Date(t.createdAt);
            const items = t.items.map((i: any) => `${i.name} (x${i.quantity})`).join('; ');
            return `${t.id},${date.toLocaleDateString()},${date.toLocaleTimeString()},${t.total},"${items}","${t.userName}","${t.paymentStatus}","${t.storeId || ''}"`;
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

    const showSessionView = sessionSettings.enabled && reportScope === 'session' && dataSource === 'local';
    
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

    // Columns for Transaction Table
    const txnColumns = useMemo(() => [
        { label: 'Waktu', width: '1.5fr', render: (t: TransactionType) => <span className="text-slate-400 whitespace-nowrap">{new Date(t.createdAt).toLocaleString('id-ID')}</span> },
        { label: 'Cabang', width: '1fr', render: (t: TransactionType) => <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 font-mono">{t.storeId || '-'}</span> },
        { label: 'Pelanggan', width: '1fr', render: (t: TransactionType) => <span className="font-semibold text-white">{t.customerName || '-'}</span> },
        { label: 'Kasir', width: '1fr', render: (t: TransactionType) => <span>{t.userName}</span> },
        { label: 'Total', width: '1fr', render: (t: TransactionType) => <span className={`font-medium ${t.paymentStatus === 'refunded' ? 'line-through text-slate-500' : ''}`}>{CURRENCY_FORMATTER.format(t.total)}</span> },
        { label: 'Status', width: '1fr', render: (t: TransactionType) => <PaymentStatusBadge status={t.paymentStatus} /> },
        { label: 'Items', width: '2fr', render: (t: TransactionType) => <span className="truncate">{t.items.map((i: any) => `${i.name} (x${i.quantity})`).join(', ')}</span> },
        { label: 'Aksi', width: '1fr', className: 'overflow-visible', render: (t: TransactionType) => (
            <ActionMenu 
                transaction={t}
                onViewReceipt={setSelectedTransaction}
                onPay={setUpdatingTransaction}
                onRefund={handleRefund}
                disabled={dataSource === 'cloud'}
            />
        )}
    ], [setSelectedTransaction, setUpdatingTransaction, handleRefund, dataSource]);

    // Columns for Stock Log Table
    const stockColumns = useMemo(() => [
        { label: 'Waktu', width: '1.5fr', render: (s: StockAdjustment) => <span className="text-slate-400 whitespace-nowrap">{new Date(s.createdAt).toLocaleString('id-ID')}</span> },
        { label: 'Produk', width: '1.5fr', render: (s: StockAdjustment) => <span className="font-semibold text-white">{s.productName}</span> },
        { label: 'Tipe', width: '1fr', render: (s: StockAdjustment) => (
            <span className={`px-2 py-1 text-xs font-bold rounded ${s.change > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {s.change > 0 ? 'MASUK' : 'KELUAR'}
            </span>
        ) },
        { label: 'Jumlah', width: '1fr', render: (s: StockAdjustment) => (
            <span className={`font-mono font-bold ${s.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {s.change > 0 ? '+' : ''}{s.change}
            </span>
        ) },
        { label: 'Stok Akhir', width: '1fr', render: (s: StockAdjustment) => <span className="text-slate-300">{s.newStock}</span> },
        { label: 'Keterangan', width: '2fr', render: (s: StockAdjustment) => (
            <div>
                <p className="text-sm truncate">{s.notes || '-'}</p>
                {/* @ts-ignore */}
                {s.storeId && <span className="text-[9px] bg-slate-700 px-1 rounded text-slate-300">{s.storeId}</span>}
            </div>
        ) },
    ], [dataSource]);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-4">
                     <div>
                         <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                             {showSessionView && session ? 'Laporan Sesi Saat Ini' : reportScope === 'session_history' ? 'Riwayat Sesi (Shift)' : 'Laporan & Audit'}
                             {dataSource === 'cloud' && <span className="text-sm font-normal bg-sky-600 px-2 py-0.5 rounded text-white">Cloud Mode</span>}
                         </h1>
                         {showSessionView && session && (
                            <p className="text-sm text-slate-400">Dimulai pada {new Date(session.startTime).toLocaleString('id-ID')} oleh {session.userName}</p>
                         )}
                    </div>
                     <div className="flex gap-2 items-center flex-wrap justify-end">
                        
                        {/* Branch Selector (Visible for both Local & Cloud if multiple branches exist) */}
                        {availableBranches.length > 1 && (
                            <div className="bg-slate-700 p-1 rounded-lg">
                                <select 
                                    value={selectedBranch} 
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="bg-transparent text-sm text-white px-2 py-1 outline-none cursor-pointer"
                                >
                                    <option value="ALL">Semua Cabang</option>
                                    {availableBranches.map(b => (
                                        <option key={b} value={b} className="bg-slate-800">{b}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Cloud Toggle */}
                        <div className="bg-slate-700 p-1 rounded-lg flex items-center mr-2">
                            <button onClick={() => setDataSource('local')} className={`p-2 rounded transition-colors ${dataSource === 'local' ? 'bg-slate-500 text-white' : 'text-slate-400 hover:text-white'}`} title="Data Lokal"><Icon name="database" className="w-4 h-4"/></button>
                            <button onClick={() => setDataSource('cloud')} className={`p-2 rounded transition-colors ${dataSource === 'cloud' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`} title="Data Cloud (Gabungan)"><Icon name="wifi" className="w-4 h-4"/></button>
                        </div>

                        {sessionSettings.enabled && dataSource === 'local' && (
                            <div className="flex bg-slate-700 p-1 rounded-lg overflow-x-auto">
                                <button onClick={() => setReportScope('session')} disabled={!session} className={`px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap ${reportScope === 'session' ? 'bg-[#347758] text-white' : 'text-slate-300 hover:bg-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    Sesi Saat Ini
                                </button>
                                <button onClick={() => setReportScope('historical')} className={`px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap ${reportScope === 'historical' ? 'bg-[#347758] text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
                                    Semua Penjualan
                                </button>
                                 <button onClick={() => setReportScope('session_history')} className={`px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap ${reportScope === 'session_history' ? 'bg-[#347758] text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
                                    Riwayat Shift
                                </button>
                            </div>
                        )}
                        
                        {(!sessionSettings.enabled || reportScope === 'historical' || dataSource === 'cloud') && (
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
                        
                        {reportScope !== 'session_history' && (
                            <>
                                <Button onClick={exportReport} variant="secondary" size="sm" disabled={activeTab === 'sales' ? filteredTransactions.length === 0 : filteredStockLogs.length === 0}>
                                    <Icon name="download" className="w-4 h-4"/> Export CSV
                                </Button>
                                
                                {dataSource === 'local' && activeTab === 'sales' && (
                                    <Button onClick={() => setSendReportModalOpen(true)} variant="primary" size="sm" disabled={filteredTransactions.length === 0}>
                                        <Icon name="chat" className="w-4 h-4"/> Kirim ke Admin
                                    </Button>
                                )}
                            </>
                        )}

                        {sessionSettings.enabled && !session && reportScope !== 'session_history' && dataSource === 'local' && (
                            <Button onClick={() => setStartSessionModalOpen(true)} variant="primary" size="sm">
                                <Icon name="plus" className="w-4 h-4"/>
                                Mulai Sesi
                            </Button>
                        )}
                        {isSessionMode && reportScope === 'session' && dataSource === 'local' && (
                             <Button onClick={() => setEndSessionModalOpen(true)} variant="danger" size="sm">
                                Tutup Sesi
                            </Button>
                        )}
                    </div>
                </div>
                
                {(!sessionSettings.enabled || reportScope === 'historical' || dataSource === 'cloud') && filter === 'custom' && (
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

            {reportScope === 'session_history' && dataSource === 'local' ? (
                <SessionHistoryTable history={appData.sessionHistory || []} />
            ) : (
            <>
                <div className="flex bg-slate-700 p-1 rounded-lg w-fit">
                    <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'sales' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300 hover:text-white'}`}>
                        Laporan Penjualan
                    </button>
                    <button onClick={() => setActiveTab('stock_logs')} className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'stock_logs' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300 hover:text-white'}`}>
                        Riwayat Stok (Log)
                    </button>
                </div>

                {isCloudLoading ? (
                    <div className="text-center py-12 bg-slate-800 rounded-lg">
                        <span className="text-white animate-pulse">Mengambil data dari Cloud...</span>
                    </div>
                ) : (
                    <>
                        {activeTab === 'sales' && (
                            <>
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
                                            {inventorySettings.enabled && <StatCard title="Total Laba (Est)" value={CURRENCY_FORMATTER.format(reportData.totalProfit)} />}
                                        </>
                                    )}
                                </div>

                                {filteredTransactions.length === 0 && !session ? (
                                    <div className="text-center py-12 bg-slate-800 rounded-lg">
                                        <p className="text-slate-400">{showSessionView ? 'Belum ada transaksi di sesi ini.' : 'Tidak ada transaksi untuk periode yang dipilih.'}</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Charts & Tables for Sales */}
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
                                                    <table className="w-full text-xs text-left min-w-[300px]">
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
                                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Total']} />
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
                                                    columns={txnColumns}
                                                    rowHeight={60}
                                                    minWidth={900}
                                            />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {activeTab === 'stock_logs' && (
                            <div className="bg-slate-800 rounded-lg shadow-md flex flex-col min-h-[400px]">
                                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                                    <h2 className="text-lg font-semibold">Riwayat Perubahan Stok (Masuk/Keluar)</h2>
                                    <div className="text-xs text-slate-400">
                                        Total: {filteredStockLogs.length} catatan
                                    </div>
                                </div>
                                
                                {filteredStockLogs.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
                                        Tidak ada riwayat perubahan stok pada periode ini.
                                    </div>
                                ) : (
                                    <div className="flex-1 min-h-0">
                                        <VirtualizedTable
                                            data={filteredStockLogs}
                                            columns={stockColumns}
                                            rowHeight={60}
                                            minWidth={800}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
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
                // Pass cash flow data only if viewing current session
                startingCash={showSessionView && session ? session.startingCash : 0}
                cashIn={showSessionView ? reportData.cashIn : 0}
                cashOut={showSessionView ? reportData.cashOut : 0}
            />
        </div>
    );
};

export default ReportsView;

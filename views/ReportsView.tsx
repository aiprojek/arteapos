
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { useSession } from '../context/SessionContext';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { CURRENCY_FORMATTER } from '../constants';
import Button from '../components/Button';
import Icon from '../components/Icon';
import type { Transaction as TransactionType, SessionHistory, StockAdjustment } from '../types';
import ReceiptModal from '../components/ReceiptModal';
import Modal from '../components/Modal';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import VirtualizedTable from '../components/VirtualizedTable';
import { dataService } from '../services/dataService';
import { useUI } from '../context/UIContext';
import { supabaseService } from '../services/supabaseService';
import { dropboxService } from '../services/dropboxService';
import ReportCharts from '../components/reports/ReportCharts';

type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';
type ReportScope = 'session' | 'historical' | 'session_history';
type ReportTab = 'sales' | 'stock_logs' | 'hourly' | 'products';

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
    const { session, sessionSettings } = useSession();
    const { data: appData } = useData();
    const { receiptSettings } = useSettings();
    const { showAlert } = useUI();
    const [filter, setFilter] = useState<TimeFilter>('today');
    const [reportScope, setReportScope] = useState<ReportScope>('session');
    const [activeTab, setActiveTab] = useState<ReportTab>('sales');
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionType | null>(null);
    const [updatingTransaction, setUpdatingTransaction] = useState<TransactionType | null>(null);
    const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isFilterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // Branch Filtering State
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

    // Cloud Mode State
    const [dataSource, setDataSource] = useState<'local' | 'cloud' | 'dropbox'>('local');
    const [cloudTransactions, setCloudTransactions] = useState<TransactionType[]>([]);
    const [cloudStockLogs, setCloudStockLogs] = useState<StockAdjustment[]>([]);
    const [isCloudLoading, setIsCloudLoading] = useState(false);

    
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

    // Load Cloud/Dropbox Data when Source Changes
    useEffect(() => {
        const loadCloud = async () => {
            // 1. Pre-check credentials
            if (dataSource === 'cloud') {
                const sbUrl = localStorage.getItem('ARTEA_SB_URL');
                const sbKey = localStorage.getItem('ARTEA_SB_KEY');
                if (!sbUrl || !sbKey) {
                    showAlert({ type: 'alert', title: 'Supabase Belum Dikonfigurasi', message: 'Silakan atur URL dan API Key Supabase di menu Pengaturan.' });
                    setDataSource('local');
                    return;
                }
            } else if (dataSource === 'dropbox') {
                const dbxToken = localStorage.getItem('ARTEA_DBX_REFRESH_TOKEN');
                if (!dbxToken) {
                    showAlert({ type: 'alert', title: 'Dropbox Belum Dikonfigurasi', message: 'Silakan hubungkan akun Dropbox di menu Pengaturan.' });
                    setDataSource('local');
                    return;
                }
            }

            setIsCloudLoading(true);
            setCloudTransactions([]);
            setCloudStockLogs([]);

            try {
                if (dataSource === 'cloud') {
                    const sbUrl = localStorage.getItem('ARTEA_SB_URL')!;
                    const sbKey = localStorage.getItem('ARTEA_SB_KEY')!;

                    supabaseService.init(sbUrl, sbKey);
                    const now = new Date();
                    let start = new Date(0); // Default ALL
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
                        storeId: t.store_id
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

                } else if (dataSource === 'dropbox') {
                    // Fetch aggregated JSONs from Dropbox
                    const allBranches = await dropboxService.fetchAllBranchData();
                    let allTxns: any[] = [];
                    let allLogs: any[] = [];

                    allBranches.forEach(branch => {
                        if (branch.transactionRecords) {
                            allTxns = [...allTxns, ...branch.transactionRecords.map((t:any) => ({...t, storeId: branch.storeId}))];
                        }
                        if (branch.stockAdjustments) {
                            allLogs = [...allLogs, ...branch.stockAdjustments.map((s:any) => ({...s, storeId: branch.storeId}))];
                        }
                    });
                    
                    setCloudTransactions(allTxns);
                    setCloudStockLogs(allLogs);
                }
            } catch (err: any) {
                console.error("Cloud Load Error:", err);
                showAlert({ type: 'alert', title: 'Gagal Memuat', message: err.message });
                setDataSource('local'); // Fallback
            } finally {
                setIsCloudLoading(false);
            }
        };

        if (dataSource !== 'local') {
            loadCloud();
        }
    }, [dataSource, filter, customStartDate, customEndDate, showAlert]);
    
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
        if (dataSource === 'cloud') return true; // Already filtered by query

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

        // 2. Date Filter
        if (dataSource !== 'cloud') { // Local & Dropbox need client-side filtering
            if (isSessionMode && reportScope === 'session' && dataSource === 'local') {
                result = result.filter(t => new Date(t.createdAt) >= new Date(session.startTime));
            } else {
                result = result.filter(t => dateFilterPredicate(t.createdAt));
            }
        }
        
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [transactions, filter, session, isSessionMode, reportScope, customStartDate, customEndDate, dataSource, selectedBranch]);

    const filteredStockLogs = useMemo(() => {
        let result = stockLogs;
        
        // 1. Branch Filter
        if (dataSource !== 'local' && selectedBranch !== 'ALL') {
             // @ts-ignore
             result = result.filter(s => s.storeId === selectedBranch);
        }

        if (dataSource !== 'cloud') {
             result = result.filter(s => dateFilterPredicate(s.createdAt)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return result;
    }, [stockLogs, filter, customStartDate, customEndDate, dataSource, selectedBranch]);

    const activeTransactions = useMemo(() => filteredTransactions.filter(t => t.paymentStatus !== 'refunded'), [filteredTransactions]);

    const reportData = useMemo(() => {
        let totalSales = 0;
        let totalProfit = 0;
        let totalCashSales = 0;
        
        // Hourly data structures
        const hourlyStats = Array.from({ length: 24 }, (_, i) => ({
            id: i.toString(),
            hourLabel: `${String(i).padStart(2, '0')}:00`,
            rawHour: i,
            total: 0,
            count: 0
        }));

        const productSales = new Map<string, {id: string, name: string, quantity: number, revenue: number}>();
        
        // Use activeTransactions (excluding refunded) for calculations
        activeTransactions.forEach(t => {
            totalSales += t.total;
            
            // Calculate cash sales specifically for session reconciliation
            const cashPayment = t.payments?.find((p: any) => p.method === 'cash');
            if (cashPayment) {
                totalCashSales += cashPayment.amount;
            }

            // Hourly Calculation
            const tDate = new Date(t.createdAt);
            const hour = tDate.getHours();
            if (hour >= 0 && hour < 24) {
                hourlyStats[hour].total += t.total;
                hourlyStats[hour].count += 1;
            }

            const transactionCost = t.items.reduce((sum: number, item: any) => {
                return sum + ((item.costPrice || 0) * item.quantity);
            }, 0);
            totalProfit += t.total - transactionCost;
            
            t.items.forEach((item: any) => {
                const existing = productSales.get(item.id) || { id: item.id, name: item.name, quantity: 0, revenue: 0 };
                productSales.set(item.id, {
                    ...existing,
                    quantity: existing.quantity + item.quantity,
                    revenue: existing.revenue + (item.price * item.quantity),
                });
            });
        });

        const allProductSales = Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity);
        const bestSellingProducts = allProductSales.slice(0, 10);
        
        // Prepare chart data (simple total for chart)
        const hourlyChartData = hourlyStats.map(h => ({
            name: h.hourLabel,
            total: h.total,
        }));

        // Prepare table data (filter out hours with 0 sales for table, or keep all if preferred)
        const hourlyBreakdown = hourlyStats
            .filter(h => h.total > 0 || h.count > 0)
            .map(h => ({
                id: h.id,
                timeRange: `${h.hourLabel} - ${String(h.rawHour + 1).padStart(2, '0')}:00`,
                count: h.count,
                total: h.total
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
            allProductSales, // Full list for table
            hourlyChartData,
            hourlyBreakdown, // Detailed table data
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
        { label: 'Pelanggan', width: '1.5fr', render: (t: TransactionType) => <span className="font-semibold text-white">{t.customerName || '-'}</span> },
        { label: 'Kasir', width: '1fr', render: (t: TransactionType) => <span>{t.userName}</span> },
        { label: 'Total', width: '1fr', render: (t: TransactionType) => <span className={`font-medium ${t.paymentStatus === 'refunded' ? 'line-through text-slate-500' : ''}`}>{CURRENCY_FORMATTER.format(t.total)}</span> },
        { label: 'Status', width: '1fr', render: (t: TransactionType) => <PaymentStatusBadge status={t.paymentStatus} /> },
        { 
            label: 'Items', 
            width: '2.5fr', 
            render: (t: TransactionType) => {
                if (!t.items || t.items.length === 0) return <span className="text-slate-500 italic"> - </span>;
                const itemsStr = t.items.map((i: any) => `${i.name || 'Unknown'} (x${i.quantity})`).join(', ');
                return <span title={itemsStr} className="block truncate">{itemsStr}</span>;
            } 
        },
        { label: 'Aksi', width: '1fr', className: 'overflow-visible', render: (t: TransactionType) => (
            <ActionMenu 
                transaction={t}
                onViewReceipt={setSelectedTransaction}
                onPay={setUpdatingTransaction}
                onRefund={handleRefund}
                disabled={dataSource !== 'local'} // Only allow edits on local data for now
            />
        )}
    ], [setSelectedTransaction, setUpdatingTransaction, handleRefund, dataSource]);

    // Columns for Stock Log Table
    const stockColumns = useMemo(() => [
        { label: 'Waktu', width: '1.5fr', render: (s: StockAdjustment) => <span className="text-slate-400 whitespace-nowrap">{new Date(s.createdAt).toLocaleString('id-ID')}</span> },
        { label: 'Produk', width: '2fr', render: (s: StockAdjustment) => <span className="font-semibold text-white">{s.productName}</span> },
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

    // Columns for Hourly Analysis
    const hourlyColumns = useMemo(() => [
        { label: 'Jam', width: '1fr', render: (h: any) => h.timeRange },
        { label: 'Jumlah Transaksi', width: '1fr', render: (h: any) => h.count },
        { label: 'Total Omzet', width: '1fr', render: (h: any) => CURRENCY_FORMATTER.format(h.total) }
    ], []);

    // Columns for Product Sales
    const productSalesColumns = useMemo(() => [
        { label: 'Nama Produk', width: '2fr', render: (p: any) => <span className="font-medium text-white">{p.name}</span> },
        { label: 'Terjual (Qty)', width: '1fr', render: (p: any) => p.quantity },
        { label: 'Total Pendapatan', width: '1fr', render: (p: any) => CURRENCY_FORMATTER.format(p.revenue) }
    ], []);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {/* Header Section */}
                <div className="flex justify-between items-start flex-wrap gap-4">
                     <div>
                         <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                             {showSessionView && session ? 'Laporan Sesi Saat Ini' : reportScope === 'session_history' ? 'Riwayat Sesi (Shift)' : 'Laporan & Audit'}
                             {dataSource !== 'local' && <span className={`text-sm font-normal px-2 py-0.5 rounded text-white ${dataSource === 'cloud' ? 'bg-sky-600' : 'bg-blue-600'}`}>{dataSource === 'cloud' ? 'Supabase' : 'Dropbox'}</span>}
                         </h1>
                         {showSessionView && session && (
                            <p className="text-sm text-slate-400">Dimulai pada {new Date(session.startTime).toLocaleString('id-ID')} oleh {session.userName}</p>
                         )}
                    </div>
                     <div className="flex gap-2 items-center flex-wrap justify-end">
                        
                        {/* Branch Selector */}
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

                        {/* Data Source Toggle (Standardized) */}
                        <div className="bg-slate-800 p-1 rounded-lg flex items-center border border-slate-700">
                            <button
                                onClick={() => setDataSource('local')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dataSource === 'local' ? 'bg-[#347758] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                title="Data Lokal"
                            >
                                Lokal
                            </button>
                            <button
                                onClick={() => setDataSource('dropbox')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dataSource === 'dropbox' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                title="Data Gabungan dari Dropbox"
                            >
                                Dropbox
                            </button>
                            <button
                                onClick={() => setDataSource('cloud')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dataSource === 'cloud' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                title="Data Real-time Supabase"
                            >
                                Cloud
                            </button>
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
                        
                        {(!sessionSettings.enabled || reportScope === 'historical' || dataSource !== 'local') && (
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
                        
                        <Button variant="secondary" size="sm" onClick={exportReport}>
                            <Icon name="download" className="w-4 h-4" /> Export CSV
                        </Button>
                    </div>
                </div>

                {/* Date Picker for Custom Filter */}
                {filter === 'custom' && (!sessionSettings.enabled || reportScope === 'historical' || dataSource !== 'local') && (
                    <div className="flex gap-2 items-center justify-end bg-slate-800 p-2 rounded-lg w-fit ml-auto">
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600" />
                        <span className="text-slate-400">-</span>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600" />
                    </div>
                )}
            </div>

            {isCloudLoading && (
                <div className="w-full text-center py-8 bg-slate-800 rounded-lg border border-slate-700">
                    <span className="text-white animate-pulse">Memuat data dari {dataSource === 'cloud' ? 'Supabase' : 'Dropbox'}...</span>
                </div>
            )}

            {!isCloudLoading && (
                <>
                    {reportScope === 'session_history' && dataSource === 'local' ? (
                        <SessionHistoryTable history={appData.sessionHistory} />
                    ) : (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard title="Total Omzet" value={CURRENCY_FORMATTER.format(reportData.totalSales)} className="border-b-4 border-green-500" />
                                <StatCard title="Total Transaksi" value={reportData.totalTransactions.toString()} className="border-b-4 border-blue-500" />
                                <StatCard title="Profit (Estimasi)" value={CURRENCY_FORMATTER.format(reportData.totalProfit)} className="border-b-4 border-yellow-500" />
                                <StatCard title="Margin Rata-rata" value={`${reportData.profitMargin.toFixed(1)}%`} className="border-b-4 border-purple-500" />
                            </div>

                            {/* Charts */}
                            <ReportCharts 
                                hourlyChartData={reportData.hourlyChartData}
                                salesOverTimeData={salesOverTimeData}
                                categorySalesData={categorySalesData}
                                bestSellingProducts={reportData.bestSellingProducts}
                                filter={reportScope === 'session' ? 'today' : filter}
                                showSessionView={showSessionView}
                            />

                            {/* Tabs for Table View */}
                            <div className="mt-6">
                                <div className="flex border-b border-slate-700 mb-4 overflow-x-auto">
                                    <button 
                                        className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'sales' ? 'border-b-2 border-[#347758] text-[#52a37c]' : 'text-slate-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('sales')}
                                    >
                                        Riwayat Penjualan
                                    </button>
                                    <button 
                                        className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'products' ? 'border-b-2 border-[#347758] text-[#52a37c]' : 'text-slate-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('products')}
                                    >
                                        Rekap Produk
                                    </button>
                                    <button 
                                        className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'hourly' ? 'border-b-2 border-[#347758] text-[#52a37c]' : 'text-slate-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('hourly')}
                                    >
                                        Analisa Per Jam
                                    </button>
                                    <button 
                                        className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'stock_logs' ? 'border-b-2 border-[#347758] text-[#52a37c]' : 'text-slate-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('stock_logs')}
                                    >
                                        Riwayat Stok
                                    </button>
                                </div>

                                {/* Table Content */}
                                <div className="h-[600px]">
                                    {activeTab === 'sales' && (
                                        <VirtualizedTable 
                                            data={filteredTransactions} 
                                            columns={txnColumns} 
                                            rowHeight={50} 
                                        />
                                    )}
                                    {activeTab === 'products' && (
                                        <VirtualizedTable 
                                            data={reportData.allProductSales} 
                                            columns={productSalesColumns} 
                                            rowHeight={50} 
                                        />
                                    )}
                                    {activeTab === 'hourly' && (
                                        <VirtualizedTable 
                                            data={reportData.hourlyBreakdown} 
                                            columns={hourlyColumns} 
                                            rowHeight={50} 
                                        />
                                    )}
                                    {activeTab === 'stock_logs' && (
                                        <VirtualizedTable 
                                            data={filteredStockLogs} 
                                            columns={stockColumns} 
                                            rowHeight={50} 
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Receipt Modal */}
            {selectedTransaction && (
                <ReceiptModal 
                    isOpen={!!selectedTransaction} 
                    onClose={() => setSelectedTransaction(null)} 
                    transaction={selectedTransaction} 
                />
            )}

            {/* Update Payment Modal */}
            {updatingTransaction && (
                <UpdatePaymentModal 
                    isOpen={!!updatingTransaction} 
                    onClose={() => setUpdatingTransaction(null)} 
                    transaction={updatingTransaction}
                    onConfirm={(payments) => {
                        addPaymentToTransaction(updatingTransaction.id, payments);
                        setUpdatingTransaction(null);
                    }}
                />
            )}
        </div>
    );
};

export default ReportsView;

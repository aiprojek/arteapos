
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { useSettings } from '../context/SettingsContext';
import { useUIActions } from '../context/UIContext';
import { useAuthState } from '../context/AuthContext';
import { CURRENCY_FORMATTER } from '../constants';
import Button from '../components/Button';
import Icon from '../components/Icon';
import VirtualizedTable from '../components/VirtualizedTable';
import ReportCharts from '../components/reports/ReportCharts';
import Modal from '../components/Modal';
import ReceiptModal from '../components/ReceiptModal';
import { generateSalesReportPDF, generateTablePDF } from '../utils/pdfGenerator';
import { dataService } from '../services/dataService';
import type { Transaction, StockAdjustment, Expense } from '../types';
import { Capacitor } from '@capacitor/core';
import { saveBinaryFileNative } from '../utils/nativeHelper';
import OverflowMenu from '../components/OverflowMenu';
import { filterItemsByBranch, getAvailableBranchesFromItems, loadReportsCloudSource } from '../services/cloudReadModel';

type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

const ReportsStatCard: React.FC<{
    label: string;
    value: string | number;
    hint: string;
    icon: React.ComponentProps<typeof Icon>['name'];
    tone?: 'neutral' | 'success' | 'warning';
}> = ({ label, value, hint, icon, tone = 'neutral' }) => {
    const toneClasses = {
        neutral: 'border-slate-700/80 bg-slate-850/70',
        success: 'border-emerald-900/50 bg-emerald-950/10',
        warning: 'border-amber-900/50 bg-amber-950/10',
    };

    return (
        <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone]}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{value}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">{hint}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/15 p-2">
                    <Icon name={icon} className="h-4.5 w-4.5 text-slate-400" />
                </div>
            </div>
        </div>
    );
};

const ReportsView: React.FC = () => {
    const { transactions: localTransactions, refundTransaction, expenses: localExpenses } = useFinance(); 
    const { stockAdjustments: localStockAdjustments, products: localProducts } = useProduct();
    const { receiptSettings } = useSettings();
    const { showAlert } = useUIActions();
    const { currentUser } = useAuthState();

    const isStaff = currentUser?.role === 'staff';

    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    const [filter, setFilter] = useState<TimeFilter>('today'); 
    const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    // Dropdown States
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const branchDropdownRef = useRef<HTMLDivElement>(null);
    // BRANCH FILTER
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

    const [cloudData, setCloudData] = useState<{ transactions: Transaction[], stockAdjustments: StockAdjustment[], inventory: any[], expenses: Expense[] }>({ transactions: [], stockAdjustments: [], inventory: [], expenses: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [cloudMode, setCloudMode] = useState<'live' | 'demo' | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState<'transactions' | 'products' | 'stock' | 'inventory'>('transactions');
    
    // Receipt & Evidence State
    const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
    const [evidenceData, setEvidenceData] = useState<{ url: string; filename: string } | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1); 

    // Refund State
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
    const [refundReason, setRefundReason] = useState('');

    // --- CLOSE DROPDOWNS ON OUTSIDE CLICK ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsFilterDropdownOpen(false);
            }
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
                setIsBranchDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadCloudData = async () => {
        if (isStaff) return; 

        setIsLoading(true);

        try {
            const result = await loadReportsCloudSource();
            setCloudData(result.data);
            setCloudMode(result.mode);
            setLastUpdated(result.lastUpdated);
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: e.message });
            setDataSource('local');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (dataSource === 'dropbox') {
            loadCloudData();
        }
    }, [dataSource]);

    const activeTransactions = dataSource === 'local' ? localTransactions : cloudData.transactions;
    const activeStockAdjustments = dataSource === 'local' ? localStockAdjustments : cloudData.stockAdjustments;
    const activeExpenses = dataSource === 'local' ? localExpenses : cloudData.expenses;
    
    // Inventory Data Source
    const activeInventory = useMemo(() => {
        if (dataSource === 'local') {
            return localProducts.filter(p => p.trackStock).map(p => ({
                id: p.id,
                name: p.name,
                stock: p.stock || 0,
                storeId: 'LOKAL'
            }));
        } else {
            return cloudData.inventory;
        }
    }, [dataSource, localProducts, cloudData.inventory]);

    // CALCULATE AVAILABLE BRANCHES
    const availableBranches = useMemo(() => {
        if (dataSource === 'local') return [];
        return getAvailableBranchesFromItems(cloudData.transactions, cloudData.stockAdjustments as any[], cloudData.inventory, cloudData.expenses);
    }, [cloudData, dataSource]);

    const filteredData = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const filterFn = (dateStr: string) => {
            const time = new Date(dateStr).getTime();
            if (filter === 'today') return time >= todayStart;
            if (filter === 'week') return time >= weekStart.getTime();
            if (filter === 'month') return time >= monthStart;
            if (filter === 'custom') {
                if (!customStartDate || !customEndDate) return true;
                const start = new Date(customStartDate);
                start.setHours(0,0,0,0);
                const end = new Date(customEndDate);
                end.setHours(23,59,59,999);
                return time >= start.getTime() && time <= end.getTime();
            }
            return true;
        };

        let txns = activeTransactions.filter(t => filterFn(t.createdAt)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        let stock = activeStockAdjustments.filter(s => filterFn(s.createdAt)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        let exps = activeExpenses.filter(e => filterFn(e.date));

        // Inventory Filter (No Date, Only Branch)
        let inventory = activeInventory.sort((a,b) => a.stock - b.stock);

        if (dataSource !== 'local' && selectedBranch !== 'ALL') {
            txns = filterItemsByBranch(txns as any[], selectedBranch);
            stock = filterItemsByBranch(stock as any[], selectedBranch);
            exps = filterItemsByBranch(exps as any[], selectedBranch);
            inventory = filterItemsByBranch(inventory as any[], selectedBranch);
        }

        return { txns, stock, inventory, exps };
    }, [filter, activeTransactions, activeStockAdjustments, activeInventory, activeExpenses, selectedBranch, dataSource, customStartDate, customEndDate]);

    // --- AGGREGATION LOGIC ---

    const summary = useMemo(() => {
        const validTxns = filteredData.txns.filter(t => t.paymentStatus !== 'refunded');
        const totalSales = validTxns.reduce((sum, t) => sum + t.total, 0);
        
        const totalCOGS = validTxns.reduce((sum, t) => {
            return sum + (t.items || []).reduce((is, i) => is + ((i.costPrice || 0) * i.quantity), 0);
        }, 0);
        
        const totalOpEx = filteredData.exps.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalSales - totalCOGS - totalOpEx;
        
        return {
            totalSales,
            totalProfit: netProfit,
            totalOpEx,
            transactionCount: validTxns.length
        };
    }, [filteredData]);

    const productRecap = useMemo(() => {
        const map = new Map<string, {name: string, quantity: number, total: number}>();
        
        filteredData.txns.forEach(t => {
            if (t.paymentStatus === 'refunded') return;
            (t.items || []).forEach(item => {
                if (item.isReward) return; 
                const key = item.id;
                const existing = map.get(key);
                const itemTotal = item.price * item.quantity; 
                
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.total += itemTotal;
                } else {
                    map.set(key, { name: item.name, quantity: item.quantity, total: itemTotal });
                }
            });
        });

        return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
    }, [filteredData]);

    // --- CHART DATA PREPARATION ---
    const chartData = useMemo(() => {
        const validTxns = filteredData.txns.filter(t => t.paymentStatus !== 'refunded');
        
        const hourlyMap = new Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, total: 0, count: 0 }));
        validTxns.forEach(t => {
            const h = new Date(t.createdAt).getHours();
            hourlyMap[h].total += t.total;
            hourlyMap[h].count += 1;
        });

        const salesMap = new Map<string, number>();
        validTxns.forEach(t => {
            const date = new Date(t.createdAt).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
            salesMap.set(date, (salesMap.get(date) || 0) + t.total);
        });
        const salesOverTime = Array.from(salesMap.entries()).map(([name, total]) => ({ name, total }));

        const categoryMap = new Map<string, number>();
        validTxns.forEach(t => {
            (t.items || []).forEach(item => {
                if(!item.isReward) {
                    const cats = item.category || ['Umum'];
                    cats.forEach(c => categoryMap.set(c, (categoryMap.get(c) || 0) + (item.price * item.quantity)));
                }
            });
        });

        const categorySales = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

        return { hourly: hourlyMap, trend: salesOverTime, category: categorySales, products: productRecap.slice(0, 10) };
    }, [filteredData, productRecap]);

    // --- EXPORT LOGIC ---
    const handleExportSpreadsheet = (format: 'xlsx' | 'csv' | 'ods' | 'pdf') => {
        if (activeTab === 'inventory') {
            showAlert({ type: 'alert', title: 'Info', message: 'Silakan gunakan tombol Export di menu Produk/Bahan Baku untuk laporan stok.' });
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 10);
        let headers: string[] = [];
        let rows: (string | number)[][] = [];
        let title = '';

        if (activeTab === 'transactions') {
            title = 'Laporan Penjualan';
            if (format === 'pdf') {
                // Special PDF Layout (Structured Report)
                const periodLabel = filter === 'today' ? 'Hari Ini' : filter === 'week' ? 'Minggu Ini' : filter === 'month' ? 'Bulan Ini' : 'Semua Waktu';
                const validTxns = filteredData.txns.filter(t => t.paymentStatus !== 'refunded');
                generateSalesReportPDF(validTxns, receiptSettings, periodLabel, { 
                    totalSales: summary.totalSales, 
                    totalProfit: summary.totalProfit,
                    totalTransactions: summary.transactionCount 
                });
                return;
            } else {
                // Spreadsheet Layout
                headers = ['ID', 'Waktu', 'Pelanggan', 'Item', 'Total', 'Status', 'Cabang'];
                rows = filteredData.txns.map(t => [
                    t.id, new Date(t.createdAt).toLocaleString('id-ID'),
                    t.customerName || 'Umum',
                    (t.items || []).map(i => `${i.name} (x${i.quantity})`).join(', '),
                    t.total,
                    t.paymentStatus,
                    t.storeId || 'LOKAL'
                ]);
            }
        } else if (activeTab === 'stock') {
            title = 'Laporan Mutasi Stok';
            headers = ['Waktu', 'Produk', 'Perubahan', 'Sisa Akhir', 'Catatan', 'Cabang'];
            rows = filteredData.stock.map(s => [
                new Date(s.createdAt).toLocaleString('id-ID'),
                s.productName,
                s.change,
                s.newStock,
                s.notes || '-',
                (s as any).storeId || 'LOKAL'
            ]);
        } else if (activeTab === 'products') {
            title = 'Rekap Produk Terjual';
            headers = ['Nama Produk', 'Qty Terjual', 'Total Omzet'];
            rows = productRecap.map(p => [p.name, p.quantity, p.total]);
        }

        if (rows.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data untuk diexport.' });
            return;
        }

        if (format === 'pdf') {
            const pdfRows = rows.map(r => r.map(c => typeof c === 'number' ? CURRENCY_FORMATTER.format(c) : c));
            generateTablePDF(title, headers, pdfRows, receiptSettings);
        } else {
            dataService.exportToSpreadsheet(headers, rows, `Laporan_${activeTab}_${timestamp}`, format);
        }
        
    };

    const initiateRefund = (t: Transaction) => {
        if (dataSource !== 'local') return;
        setRefundTarget(t);
        setRefundReason('');
        setIsRefundModalOpen(true);
    };

    const processRefund = () => {
        if (!refundTarget) return;
        
        refundTransaction(refundTarget.id, refundReason); 
        setIsRefundModalOpen(false);
        setRefundTarget(null);
        showAlert({ type: 'alert', title: 'Berhasil', message: 'Transaksi telah direfund.' });
    };

    const handleDownloadEvidence = async () => {
        if (!evidenceData) return;
        try {
            const fileName = evidenceData.filename;
            if (Capacitor.isNativePlatform()) {
                await saveBinaryFileNative(fileName, evidenceData.url.split(',')[1]);
                showAlert({ type: 'alert', title: 'Berhasil', message: `Gambar disimpan: ${fileName}` });
            } else {
                const link = document.createElement('a');
                link.href = evidenceData.url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: e.message });
        }
    };

    // Zoom Handlers
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
    const handleResetZoom = () => setZoomLevel(1);

    const openEvidenceViewer = (transaction: Transaction) => {
        const payments = transaction.payments || [];
        const img = payments.find(p => p.evidenceImageUrl)?.evidenceImageUrl;
        if (!img) return;
        const safeId = transaction.id.replace(/[^a-z0-9]/gi, '-');
        const dateStr = new Date(transaction.createdAt).toISOString().slice(0, 10);
        setEvidenceData({ url: img, filename: `Bukti_Trx_${safeId}_${dateStr}.jpg` });
        setZoomLevel(1);
    };

    // --- COLUMNS ---
    const transactionColumns = [
        { label: 'Waktu', width: '120px', render: (t: Transaction) => <span className="text-slate-400 text-xs">{new Date(t.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span> },
        { label: 'ID', width: '90px', render: (t: Transaction) => <span className="inline-flex rounded-full border border-slate-600 bg-slate-900/80 px-2 py-1 font-mono text-[11px] text-slate-300">#{t.id.slice(-4)}</span> },
        ...(dataSource !== 'local' ? [{ label: 'Cabang', width: '100px', render: (t: any) => <span className="inline-flex rounded-full border border-slate-600 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300 font-mono">{t.storeId || '-'}</span> }] : []),
        { label: 'Pelanggan', width: '140px', render: (t: Transaction) => <span className="text-sm font-semibold text-white">{t.customerName || 'Umum'}</span> },
        { label: 'Item', width: '2fr', render: (t: Transaction) => (
            <span className="block truncate text-xs text-slate-300" title={(t.items || []).map(i => i.name).join(', ')}>
                {(t.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
            </span>
        )},
        { label: 'Total', width: '110px', render: (t: Transaction) => <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">{CURRENCY_FORMATTER.format(t.total)}</span> },
        { label: 'Status', width: '100px', render: (t: Transaction) => {
             const style = t.paymentStatus === 'paid'
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : t.paymentStatus === 'refunded'
                    ? 'border border-red-500/30 bg-red-500/10 text-red-300'
                    : 'border border-amber-500/30 bg-amber-500/10 text-amber-300';
             return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${style}`}>{t.paymentStatus}</span>
        }},
        { label: 'Bukti', width: '60px', render: (t: Transaction) => {
             const payments = t.payments || [];
             const hasEvidence = payments.some(p => p.evidenceImageUrl);
             if (hasEvidence) {
                 return (
                    <button
                        onClick={(e) => { e.stopPropagation(); openEvidenceViewer(t); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-300 transition-colors hover:bg-sky-500/20"
                        title="Lihat Bukti Pembayaran"
                    >
                        <Icon name="camera" className="w-4 h-4"/>
                    </button>
                 )
             }
             return null;
        }},
        { label: 'Aksi', width: '120px', className: 'overflow-visible', render: (t: Transaction) => (
            <div className="flex gap-1">
                <Button type="button" variant="operational" size="sm" onClick={() => setReceiptTransaction(t)} className="h-8 w-8 p-0" title="Lihat Struk"><Icon name="printer" className="w-4 h-4"/></Button>
                {dataSource === 'local' && t.paymentStatus !== 'refunded' && (
                    <Button type="button" variant="danger" size="sm" onClick={() => initiateRefund(t)} className="h-8 w-8 p-0" title="Refund"><Icon name="reset" className="w-4 h-4"/></Button>
                )}
            </div>
        )}
    ];

    const stockColumns = useMemo(() => [
        { label: 'Waktu', width: '1.2fr', render: (s: StockAdjustment) => <span className="text-slate-400 whitespace-nowrap text-xs">{new Date(s.createdAt).toLocaleString('id-ID')}</span> },
        ...(dataSource !== 'local' ? [{ label: 'Cabang', width: '0.9fr', render: (s: any) => <span className="inline-flex rounded-full border border-slate-600 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300 font-mono">{s.storeId || '-'}</span> }] : []),
        { label: 'Produk', width: '2fr', render: (s: StockAdjustment) => <span className="font-semibold text-white text-sm">{s.productName}</span> },
        { label: 'Tipe', width: '1fr', render: (s: StockAdjustment) => {
            const isOpname = s.notes?.toLowerCase().includes('opname');
            const isTransfer = s.notes?.toLowerCase().includes('transfer');
            const isWaste = s.change < 0 && !isTransfer;
            
            let badgeClass = 'bg-slate-700 text-slate-300';
            let label = 'UPDATE';
            if (isOpname) { badgeClass = 'bg-blue-500/20 text-blue-300'; label = 'OPNAME'; } 
            else if (isTransfer) { badgeClass = 'bg-purple-500/20 text-purple-300'; label = 'TRANSFER'; } 
            else if (s.change > 0) { badgeClass = 'bg-green-500/20 text-green-400'; label = 'MASUK'; } 
            else if (isWaste) { badgeClass = 'bg-red-500/20 text-red-400'; label = 'KELUAR'; }
            
            return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${badgeClass}`}>{label}</span>;
        } },
        { label: 'Jml', width: '0.9fr', render: (s: StockAdjustment) => <span className={`inline-flex rounded-full px-2 py-1 font-mono text-[11px] font-bold ${s.change > 0 ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-red-500/30 bg-red-500/10 text-red-300'}`}>{s.change > 0 ? '+' : ''}{s.change}</span> },
        { label: 'Sisa', width: '0.9fr', render: (s: StockAdjustment) => <span className="inline-flex rounded-full border border-slate-600 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300">{s.newStock}</span> },
        { label: 'Catatan', width: '2.5fr', render: (s: StockAdjustment) => <span className="text-xs text-slate-400 italic">{s.notes || '-'}</span> },
    ], [dataSource]);

    const inventoryColumns = useMemo(() => [
        { label: 'Nama Produk / Bahan', width: '3fr', render: (i: any) => <span className="font-bold text-white">{i.name}</span> },
        { label: 'Sisa Stok', width: '1fr', render: (i: any) => <span className={`font-mono font-bold ${i.stock <= 5 ? 'text-red-400' : 'text-white'}`}>{i.stock}</span> },
        ...(dataSource !== 'local' ? [{ label: 'Cabang', width: '1fr', render: (i: any) => <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300 font-mono">{i.storeId || '-'}</span> }] : []),
    ], [dataSource]);

    const productColumns = [
        { label: 'Nama Produk', width: '3fr', render: (p: any) => <span className="font-bold text-white">{p.name}</span> },
        { label: 'Terjual (Qty)', width: '1fr', render: (p: any) => <span className="text-slate-300">{p.quantity}</span> },
        { label: 'Total Omzet', width: '1.5fr', render: (p: any) => <span className="text-green-400 font-bold">{CURRENCY_FORMATTER.format(p.total)}</span> }
    ];

    const filterLabels: Record<TimeFilter, string> = { today: 'Hari Ini', week: 'Minggu Ini', month: 'Bulan Ini', all: 'Semua', custom: 'Kustom' };
    const exportMenuItems = [
        { id: 'pdf', label: 'PDF Document', onClick: () => handleExportSpreadsheet('pdf'), icon: 'printer' as const },
        { id: 'xlsx', label: 'Excel (.xlsx)', onClick: () => handleExportSpreadsheet('xlsx'), icon: 'boxes' as const },
        { id: 'csv', label: 'CSV', onClick: () => handleExportSpreadsheet('csv'), icon: 'tag' as const },
        { id: 'ods', label: 'ODS (OpenDoc)', onClick: () => handleExportSpreadsheet('ods'), icon: 'file-lock' as const },
    ];

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-white">Laporan</h1>
                    {dataSource === 'dropbox' && (
                        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-2 py-1 text-[10px] ${cloudMode === 'demo' ? 'border-yellow-700 bg-yellow-900/30 text-yellow-200' : 'border-blue-800 bg-blue-900/30 text-blue-200'}`}>
                            <Icon name={cloudMode === 'demo' ? 'warning' : 'cloud'} className="w-3 h-3" />
                            {cloudMode === 'demo' ? 'Mode Demo' : 'Mode Cloud Aktif'}
                        </div>
                    )}
                </div>
                
                <div className="w-full lg:w-auto">
                    <div className="grid gap-2 lg:hidden">
                        <div className="grid grid-cols-2 gap-2">
                            {!isStaff && (
                                <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700 h-10 w-full">
                                    <button onClick={() => { setDataSource('local'); setCloudMode(null); }} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${dataSource === 'local' ? 'bg-[#347758] text-white' : 'text-slate-400'}`}>Lokal</button>
                                    <button onClick={() => setDataSource('dropbox')} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${dataSource === 'dropbox' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Cloud</button>
                                </div>
                            )}
                            {activeTab !== 'inventory' && (
                                <div className="relative w-full" ref={filterDropdownRef}>
                                    <Button 
                                        variant="utility" 
                                        size="sm" 
                                        onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                        className="h-10 w-full justify-between bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-100"
                                    >
                                        Filter: {filterLabels[filter]} <Icon name="chevron-down" className="w-3 h-3 ml-1" />
                                    </Button>
                                    {isFilterDropdownOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-full rounded-2xl border border-slate-600 bg-slate-800 shadow-xl z-50 overflow-hidden">
                                            {(['today', 'week', 'month', 'custom', 'all'] as const).map(f => (
                                                <button 
                                                    key={f} 
                                                    onClick={() => { setFilter(f); setIsFilterDropdownOpen(false); }} 
                                                    className={`w-full text-left px-4 py-3 text-sm text-white hover:bg-slate-700 transition-colors ${filter === f ? 'bg-[#347758]' : ''}`}
                                                >
                                                    {filterLabels[f]}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {(dataSource !== 'local' && availableBranches.length > 0 || activeTab !== 'inventory') && (
                            <div className="grid grid-cols-2 gap-2">
                                {dataSource !== 'local' && availableBranches.length > 0 && (
                                    <div className="relative w-full" ref={branchDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsBranchDropdownOpen(prev => !prev)}
                                            className="h-10 w-full rounded-xl border border-blue-800 bg-blue-900/20 px-4 text-sm text-blue-100 shadow-sm flex items-center justify-between gap-2 hover:bg-blue-900/30 transition-colors"
                                        >
                                            <span className="truncate">{selectedBranch === 'ALL' ? 'Semua Cabang' : selectedBranch}</span>
                                            <Icon name="chevron-down" className={`w-4 h-4 text-blue-300 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isBranchDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-2 w-full rounded-2xl border border-blue-900 bg-slate-800 shadow-xl z-50 overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedBranch('ALL');
                                                        setIsBranchDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                                        selectedBranch === 'ALL'
                                                            ? 'bg-blue-900/30 text-blue-100'
                                                            : 'text-slate-200 hover:bg-slate-700'
                                                    }`}
                                                >
                                                    Semua Cabang
                                                </button>
                                                {availableBranches.map((branch) => (
                                                    <button
                                                        key={branch}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedBranch(branch);
                                                            setIsBranchDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                                            selectedBranch === branch
                                                                ? 'bg-blue-900/30 text-blue-100'
                                                                : 'text-slate-200 hover:bg-slate-700'
                                                        }`}
                                                    >
                                                        {branch}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab !== 'inventory' && (
                                    <OverflowMenu
                                        size="sm"
                                        label="Export"
                                        variant="utility"
                                        showLabelOnMobile
                                        matchTriggerWidth
                                        buttonClassName="h-10 w-full justify-between"
                                        items={exportMenuItems}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="hidden lg:flex lg:flex-nowrap lg:items-center lg:justify-end lg:gap-2">
                        {!isStaff && (
                            <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700 h-10 shrink-0">
                                <button onClick={() => { setDataSource('local'); setCloudMode(null); }} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${dataSource === 'local' ? 'bg-[#347758] text-white' : 'text-slate-400'}`}>Lokal</button>
                                <button onClick={() => setDataSource('dropbox')} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${dataSource === 'dropbox' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Cloud</button>
                            </div>
                        )}

                        {activeTab !== 'inventory' && (
                            <div className="relative shrink-0" ref={filterDropdownRef}>
                                <Button 
                                    variant="utility" 
                                    size="sm" 
                                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                    className="h-10 min-w-[180px] justify-between bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-100"
                                >
                                    Filter: {filterLabels[filter]} <Icon name="chevron-down" className="w-3 h-3 ml-1" />
                                </Button>
                                {isFilterDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-44 rounded-2xl border border-slate-600 bg-slate-800 shadow-xl z-50 overflow-hidden">
                                        {(['today', 'week', 'month', 'custom', 'all'] as const).map(f => (
                                            <button 
                                                key={f} 
                                                onClick={() => { setFilter(f); setIsFilterDropdownOpen(false); }} 
                                                className={`w-full text-left px-4 py-3 text-sm text-white hover:bg-slate-700 transition-colors ${filter === f ? 'bg-[#347758]' : ''}`}
                                            >
                                                {filterLabels[f]}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {dataSource !== 'local' && availableBranches.length > 0 && (
                            <div className="relative min-w-[220px] shrink-0" ref={branchDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsBranchDropdownOpen(prev => !prev)}
                                    className="h-10 w-full rounded-xl border border-blue-800 bg-blue-900/20 px-4 text-sm text-blue-100 shadow-sm flex items-center justify-between gap-2 hover:bg-blue-900/30 transition-colors"
                                >
                                    <span className="truncate">{selectedBranch === 'ALL' ? 'Semua Cabang' : selectedBranch}</span>
                                    <Icon name="chevron-down" className={`w-4 h-4 text-blue-300 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isBranchDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-full rounded-2xl border border-blue-900 bg-slate-800 shadow-xl z-50 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedBranch('ALL');
                                                setIsBranchDropdownOpen(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                                selectedBranch === 'ALL'
                                                    ? 'bg-blue-900/30 text-blue-100'
                                                    : 'text-slate-200 hover:bg-slate-700'
                                            }`}
                                        >
                                            Semua Cabang
                                        </button>
                                        {availableBranches.map((branch) => (
                                            <button
                                                key={branch}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedBranch(branch);
                                                    setIsBranchDropdownOpen(false);
                                                }}
                                                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                                    selectedBranch === branch
                                                        ? 'bg-blue-900/30 text-blue-100'
                                                        : 'text-slate-200 hover:bg-slate-700'
                                                }`}
                                            >
                                                {branch}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab !== 'inventory' && (
                            <OverflowMenu
                                size="sm"
                                label="Export"
                                variant="utility"
                                showLabelOnMobile
                                matchTriggerWidth
                                buttonClassName="h-10 shrink-0 min-w-[140px] justify-center"
                                items={exportMenuItems}
                            />
                        )}
                    </div>

                    {/* Custom Date UI */}
                    {filter === 'custom' && activeTab !== 'inventory' && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-1">
                            <input 
                                type="date" 
                                value={customStartDate} 
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-slate-700 text-white px-2 py-1 rounded text-xs border-none focus:ring-1 focus:ring-[#347758]"
                            />
                            <span className="text-slate-400 text-xs">-</span>
                            <input 
                                type="date" 
                                value={customEndDate} 
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-slate-700 text-white px-2 py-1 rounded text-xs border-none focus:ring-1 focus:ring-[#347758]"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            {dataSource === 'dropbox' && (
                <div className={`rounded-2xl border p-3 text-xs ${cloudMode === 'demo' ? 'border-yellow-700/60 bg-yellow-900/20 text-yellow-200' : 'border-blue-800/60 bg-blue-900/20 text-blue-200'}`}>
                    <div className="flex items-start gap-2">
                        <Icon name={cloudMode === 'demo' ? 'warning' : 'info-circle'} className="mt-0.5 h-4 w-4 shrink-0" />
                        <p className="leading-relaxed">
                            {cloudMode === 'demo'
                                ? 'Dropbox belum dikonfigurasi. Data simulasi ditampilkan agar layout laporan tetap bisa dipreview.'
                                : `Menampilkan laporan gabungan dari cloud${lastUpdated ? `, diperbarui ${lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}.`}
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    <ReportsStatCard
                        label="Total Omzet"
                        value={CURRENCY_FORMATTER.format(summary.totalSales)}
                        hint="Akumulasi penjualan valid untuk periode dan cabang yang sedang aktif."
                        icon="cash"
                        tone="success"
                    />
                    <ReportsStatCard
                        label="Total Transaksi"
                        value={summary.transactionCount}
                        hint="Jumlah transaksi non-refund yang ikut dihitung dalam laporan aktif."
                        icon="printer"
                    />
                    <ReportsStatCard
                        label="Net Profit (Est.)"
                        value={CURRENCY_FORMATTER.format(summary.totalProfit)}
                        hint={`Omzet dikurangi HPP dan pengeluaran operasional ${CURRENCY_FORMATTER.format(summary.totalOpEx)}.`}
                        icon="trending-up"
                        tone={summary.totalProfit >= 0 ? 'success' : 'warning'}
                    />
                </div>
            )}

            <div className="rounded-3xl border border-slate-800 bg-slate-800/95 shadow-xl overflow-hidden">
                <div className="border-b border-slate-700/80 px-4 pt-3">
                    <div className="flex overflow-x-auto hide-scrollbar">
                    <button onClick={() => setActiveTab('transactions')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'transactions' ? 'border-[#347758] text-[#52a37c]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        Riwayat Penjualan
                    </button>
                    <button onClick={() => setActiveTab('products')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'products' ? 'border-[#347758] text-[#52a37c]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        Rekap Produk
                    </button>
                    <button onClick={() => setActiveTab('inventory')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'inventory' ? 'border-[#347758] text-[#52a37c]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        Monitoring Stok
                    </button>
                    <button onClick={() => setActiveTab('stock')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'stock' ? 'border-[#347758] text-[#52a37c]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        Log Mutasi
                    </button>
                    </div>
                </div>

                <div className="border-b border-slate-700/60 px-4 py-3">
                    <h3 className="text-lg font-bold text-white">
                        {activeTab === 'transactions' && 'Riwayat Penjualan'}
                        {activeTab === 'products' && 'Rekap Produk'}
                        {activeTab === 'inventory' && 'Monitoring Stok'}
                        {activeTab === 'stock' && 'Log Mutasi'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                        {activeTab === 'transactions' && 'Lihat transaksi, struk, bukti pembayaran, dan akses refund untuk data lokal.'}
                        {activeTab === 'products' && 'Pantau produk terlaris berdasarkan kuantitas dan total omzet.'}
                        {activeTab === 'inventory' && 'Lihat item dengan stok paling sedikit agar replenishment lebih cepat diprioritaskan.'}
                        {activeTab === 'stock' && 'Telusuri perubahan stok dari opname, transfer, pembelian, dan penyesuaian lain.'}
                    </p>
                </div>

                <div className="p-4">
                    {activeTab !== 'inventory' && (
                        <div className="mb-5">
                            <ReportCharts 
                                hourlyChartData={chartData.hourly}
                                salesOverTimeData={chartData.trend}
                                categorySalesData={chartData.category}
                                bestSellingProducts={chartData.products}
                                filter={filter}
                                showSessionView={false}
                            />
                        </div>
                    )}

                    <div className="h-[600px] overflow-hidden relative rounded-2xl border border-slate-700 bg-slate-900/50">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Memuat data...</div>
                    ) : (
                        <>
                            {activeTab === 'transactions' && (
                                <>
                                    <div className="md:hidden h-full overflow-y-auto p-2">
                                        <div className="space-y-2">
                                            {filteredData.txns.length > 0 ? filteredData.txns.map((transaction) => {
                                                const hasEvidence = (transaction.payments || []).some((p) => p.evidenceImageUrl);
                                                return (
                                                    <div key={transaction.id} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-[12px] font-bold leading-tight text-white">{transaction.customerName || 'Umum'}</p>
                                                                        <p className="mt-0.5 text-[10px] text-slate-400">
                                                                            {new Date(transaction.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} • #{transaction.id.slice(-4)}
                                                                        </p>
                                                                    </div>
                                                                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${transaction.paymentStatus === 'paid' ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : transaction.paymentStatus === 'refunded' ? 'border border-red-500/30 bg-red-500/10 text-red-300' : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                                                                        {transaction.paymentStatus}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-300">
                                                                    {(transaction.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                                                </p>
                                                                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                                                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                                                                        {CURRENCY_FORMATTER.format(transaction.total)}
                                                                    </span>
                                                                    {dataSource !== 'local' && (
                                                                        <span className="rounded-full border border-slate-600 bg-slate-900/80 px-1.5 py-0.5 text-slate-300">
                                                                            {(transaction as any).storeId || '-'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={`mt-2 grid gap-1.5 ${hasEvidence && dataSource === 'local' && transaction.paymentStatus !== 'refunded' ? 'grid-cols-3' : hasEvidence || (dataSource === 'local' && transaction.paymentStatus !== 'refunded') ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                            <Button type="button" variant="operational" size="sm" onClick={() => setReceiptTransaction(transaction)} className="h-8 gap-1 px-2 text-[11px]">
                                                                <Icon name="printer" className="w-4 h-4" />
                                                                <span className="hidden min-[390px]:inline">Struk</span>
                                                            </Button>
                                                            {hasEvidence && (
                                                                <Button type="button" variant="utility" size="sm" onClick={() => openEvidenceViewer(transaction)} className="h-8 gap-1 px-2 text-[11px]">
                                                                    <Icon name="camera" className="w-4 h-4" />
                                                                    <span className="hidden min-[390px]:inline">Bukti</span>
                                                                </Button>
                                                            )}
                                                            {dataSource === 'local' && transaction.paymentStatus !== 'refunded' && (
                                                                <Button type="button" variant="danger" size="sm" onClick={() => initiateRefund(transaction)} className="h-8 gap-1 px-2 text-[11px]">
                                                                    <Icon name="reset" className="w-4 h-4" />
                                                                    <span className="hidden min-[390px]:inline">Refund</span>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="flex h-full min-h-[280px] items-center justify-center text-center text-sm text-slate-500">
                                                    Tidak ada transaksi untuk ditampilkan.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="hidden h-full md:block">
                                        <VirtualizedTable 
                                            data={filteredData.txns} 
                                            columns={transactionColumns} 
                                            rowHeight={56} 
                                            minWidth={dataSource === 'dropbox' ? 1000 : 900} 
                                        />
                                    </div>
                                </>
                            )}
                            {activeTab === 'products' && (
                                <>
                                    <div className="md:hidden h-full overflow-y-auto p-2">
                                        <div className="space-y-2">
                                            {productRecap.length > 0 ? productRecap.map((product, index) => (
                                                <div key={`${product.name}-${index}`} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                                    <p className="text-[12px] font-bold text-white">{product.name}</p>
                                                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                                                        <span className="rounded-full border border-slate-600 bg-slate-900/80 px-1.5 py-0.5 text-slate-300">{product.quantity} terjual</span>
                                                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">{CURRENCY_FORMATTER.format(product.total)}</span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="flex h-full min-h-[280px] items-center justify-center text-center text-sm text-slate-500">
                                                    Tidak ada produk yang bisa ditampilkan.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="hidden h-full md:block">
                                        <VirtualizedTable 
                                            data={productRecap} 
                                            columns={productColumns} 
                                            rowHeight={52} 
                                            minWidth={500} 
                                        />
                                    </div>
                                </>
                            )}
                            {activeTab === 'inventory' && (
                                <>
                                    <div className="md:hidden h-full overflow-y-auto p-2">
                                        <div className="space-y-2">
                                            {filteredData.inventory.length > 0 ? filteredData.inventory.map((item: any, index: number) => (
                                                <div key={`${item.id || item.name}-${index}`} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                                    <p className="text-[12px] font-bold text-white">{item.name}</p>
                                                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                                                        <span className={`rounded-full px-1.5 py-0.5 ${item.stock <= 5 ? 'border border-red-500/30 bg-red-500/10 text-red-300' : 'border border-slate-600 bg-slate-900/80 text-slate-300'}`}>
                                                            Sisa {item.stock}
                                                        </span>
                                                        {dataSource !== 'local' && (
                                                            <span className="rounded-full border border-slate-600 bg-slate-900/80 px-1.5 py-0.5 text-slate-300">{item.storeId || '-'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="flex h-full min-h-[280px] items-center justify-center text-center text-sm text-slate-500">
                                                    Tidak ada stok yang bisa ditampilkan.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="hidden h-full md:block">
                                        <VirtualizedTable 
                                            data={filteredData.inventory} 
                                            columns={inventoryColumns} 
                                            rowHeight={52} 
                                            minWidth={500} 
                                        />
                                    </div>
                                </>
                            )}
                            {activeTab === 'stock' && (
                                <>
                                    <div className="md:hidden h-full overflow-y-auto p-2">
                                        <div className="space-y-2">
                                            {filteredData.stock.length > 0 ? filteredData.stock.map((stock) => {
                                                const isOpname = stock.notes?.toLowerCase().includes('opname');
                                                const isTransfer = stock.notes?.toLowerCase().includes('transfer');
                                                const isWaste = stock.change < 0 && !isTransfer;
                                                const label = isOpname ? 'OPNAME' : isTransfer ? 'TRANSFER' : stock.change > 0 ? 'MASUK' : isWaste ? 'KELUAR' : 'UPDATE';
                                                const tone = isOpname ? 'border border-blue-500/30 bg-blue-500/10 text-blue-300' : isTransfer ? 'border border-purple-500/30 bg-purple-500/10 text-purple-300' : stock.change > 0 ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-red-500/30 bg-red-500/10 text-red-300';
                                                return (
                                                    <div key={stock.id} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className="truncate text-[12px] font-bold text-white">{stock.productName}</p>
                                                                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${tone}`}>{label}</span>
                                                                </div>
                                                                <p className="mt-0.5 text-[10px] text-slate-400">{new Date(stock.createdAt).toLocaleString('id-ID')}</p>
                                                                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">{stock.notes || 'Tanpa catatan tambahan.'}</p>
                                                                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                                                                    <span className={`rounded-full px-1.5 py-0.5 ${stock.change > 0 ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-red-500/30 bg-red-500/10 text-red-300'}`}>
                                                                        {stock.change > 0 ? '+' : ''}{stock.change}
                                                                    </span>
                                                                    <span className="rounded-full border border-slate-600 bg-slate-900/80 px-1.5 py-0.5 text-slate-300">Sisa {stock.newStock}</span>
                                                                    {dataSource !== 'local' && (
                                                                        <span className="rounded-full border border-slate-600 bg-slate-900/80 px-1.5 py-0.5 text-slate-300">{(stock as any).storeId || '-'}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="flex h-full min-h-[280px] items-center justify-center text-center text-sm text-slate-500">
                                                    Tidak ada mutasi stok untuk ditampilkan.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="hidden h-full md:block">
                                        <VirtualizedTable 
                                            data={filteredData.stock} 
                                            columns={stockColumns} 
                                            rowHeight={56} 
                                            minWidth={dataSource === 'dropbox' ? 1000 : 800} 
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {receiptTransaction && (
                <ReceiptModal 
                    isOpen={!!receiptTransaction} 
                    onClose={() => setReceiptTransaction(null)} 
                    transaction={receiptTransaction} 
                />
            )}

            {evidenceData && (
                <Modal isOpen={!!evidenceData} onClose={() => setEvidenceData(null)} title="Bukti Pembayaran">
                    <div className="flex flex-col items-center gap-4 relative">
                        <div className="flex justify-center bg-black/40 p-2 rounded w-full overflow-hidden relative" style={{ maxHeight: '60vh' }}>
                            <div className="overflow-auto w-full h-full flex items-center justify-center">
                                <img 
                                    src={evidenceData.url} 
                                    alt="Bukti" 
                                    style={{ 
                                        transform: `scale(${zoomLevel})`, 
                                        transformOrigin: 'top center',
                                        transition: 'transform 0.2s ease-out'
                                    }}
                                    className="max-w-full object-contain rounded" 
                                />
                            </div>
                            
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-slate-800/80 p-2 rounded-full backdrop-blur-sm border border-slate-600 shadow-lg z-10">
                                <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors"><Icon name="zoom-out" className="w-4 h-4" /></button>
                                <span className="text-xs font-mono text-white min-w-[3rem] text-center">{(zoomLevel * 100).toFixed(0)}%</span>
                                <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors"><Icon name="zoom-in" className="w-4 h-4" /></button>
                                <div className="w-px h-4 bg-slate-600 mx-1"></div>
                                <button onClick={handleResetZoom} className="text-xs text-sky-400 hover:text-white px-2 font-bold">Reset</button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 w-full">
                            <Button onClick={handleDownloadEvidence} className="bg-blue-600 hover:bg-blue-500 border-none">
                                <Icon name="download" className="w-4 h-4"/> Unduh
                            </Button>
                            <Button variant="secondary" onClick={() => setEvidenceData(null)}>Tutup</Button>
                        </div>
                        <div className="w-full text-center">
                            <span className="text-[10px] text-slate-500 font-mono break-all">{evidenceData.filename}</span>
                        </div>
                    </div>
                </Modal>
            )}

            {/* REFUND MODAL */}
            <Modal isOpen={isRefundModalOpen} onClose={() => setIsRefundModalOpen(false)} title="Konfirmasi Refund">
                <div className="space-y-4">
                    <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="warning" className="w-5 h-5 text-red-400" />
                            <h4 className="font-bold text-red-300">Peringatan</h4>
                        </div>
                        <p className="text-xs text-slate-300">
                            Tindakan ini akan membatalkan transaksi dan mengembalikan stok barang. Uang penjualan (omzet) akan dikurangi.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Alasan Refund <span className="text-red-400">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            placeholder="Contoh: Salah input menu, pelanggan complain..."
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setIsRefundModalOpen(false)}>Batal</Button>
                        <Button variant="danger" onClick={processRefund} disabled={!refundReason.trim()}>
                            Proses Refund
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ReportsView;

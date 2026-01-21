
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { useSettings } from '../context/SettingsContext';
import { useUI } from '../context/UIContext';
import { dropboxService } from '../services/dropboxService';
import { mockDataService } from '../services/mockData';
import { CURRENCY_FORMATTER } from '../constants';
import Button from '../components/Button';
import Icon from '../components/Icon';
import VirtualizedTable from '../components/VirtualizedTable';
import ReportCharts from '../components/reports/ReportCharts';
import { generateSalesReportPDF } from '../utils/pdfGenerator';
import { dataService } from '../services/dataService';
import type { Transaction, StockAdjustment } from '../types';

const ReportsView: React.FC = () => {
    const { transactions: localTransactions } = useFinance();
    const { stockAdjustments: localStockAdjustments } = useProduct();
    const { receiptSettings } = useSettings();
    const { showAlert } = useUI();

    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
    const [cloudData, setCloudData] = useState<{ transactions: Transaction[], stockAdjustments: StockAdjustment[] }>({ transactions: [], stockAdjustments: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'sales' | 'stock'>('sales');

    const loadCloudData = async () => {
        setIsLoading(true);
        if (!dropboxService.isConfigured()) {
             const mock = mockDataService.getMockDashboardData();
             setCloudData({
                 transactions: mock.transactions,
                 stockAdjustments: mock.stockAdjustments
             });
             setIsLoading(false);
             return;
        }

        try {
            const allBranches = await dropboxService.fetchAllBranchData();
            let txns: any[] = [];
            let adjs: any[] = [];
            allBranches.forEach(branch => {
                if (branch.transactionRecords) txns.push(...branch.transactionRecords.map((t:any) => ({...t, storeId: branch.storeId})));
                if (branch.stockAdjustments) adjs.push(...branch.stockAdjustments.map((a:any) => ({...a, storeId: branch.storeId})));
            });
            setCloudData({ transactions: txns, stockAdjustments: adjs });
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
            return true;
        };

        const txns = activeTransactions.filter(t => filterFn(t.createdAt) && t.paymentStatus !== 'refunded').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const stock = activeStockAdjustments.filter(s => filterFn(s.createdAt)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { txns, stock };
    }, [filter, activeTransactions, activeStockAdjustments]);

    // --- CHART DATA PREPARATION ---
    const chartData = useMemo(() => {
        // Hourly Sales (Today/Average)
        const hourlyMap = new Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, total: 0, count: 0 }));
        filteredData.txns.forEach(t => {
            const h = new Date(t.createdAt).getHours();
            hourlyMap[h].total += t.total;
            hourlyMap[h].count += 1;
        });

        // Sales Over Time
        const salesMap = new Map<string, number>();
        filteredData.txns.forEach(t => {
            const date = new Date(t.createdAt).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
            salesMap.set(date, (salesMap.get(date) || 0) + t.total);
        });
        const salesOverTime = Array.from(salesMap.entries()).map(([name, total]) => ({ name, total }));

        // Category Sales
        const categoryMap = new Map<string, number>();
        const productMap = new Map<string, number>();
        
        filteredData.txns.forEach(t => {
            t.items.forEach(item => {
                if(!item.isReward) {
                    const cats = item.category || ['Umum'];
                    cats.forEach(c => categoryMap.set(c, (categoryMap.get(c) || 0) + (item.price * item.quantity)));
                    productMap.set(item.name, (productMap.get(item.name) || 0) + item.quantity);
                }
            });
        });

        const categorySales = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
        const topProducts = Array.from(productMap.entries()).map(([name, quantity]) => ({ name, quantity })).sort((a,b) => b.quantity - a.quantity).slice(0, 10);

        return { hourly: hourlyMap, trend: salesOverTime, category: categorySales, products: topProducts };
    }, [filteredData]);

    const summary = useMemo(() => {
        const totalSales = filteredData.txns.reduce((sum, t) => sum + t.total, 0);
        // Estimate Profit (Simplified: Total - Cost of Items)
        const totalCost = filteredData.txns.reduce((sum, t) => {
            return sum + t.items.reduce((is, i) => is + ((i.costPrice || 0) * i.quantity), 0);
        }, 0);
        
        return {
            totalSales,
            totalProfit: totalSales - totalCost,
            transactionCount: filteredData.txns.length
        };
    }, [filteredData]);

    const handleExport = () => {
        const periodLabel = filter === 'today' ? 'Hari Ini' : filter === 'week' ? 'Minggu Ini' : filter === 'month' ? 'Bulan Ini' : 'Semua Waktu';
        generateSalesReportPDF(filteredData.txns, receiptSettings, periodLabel, { 
            totalSales: summary.totalSales, 
            totalProfit: summary.totalProfit,
            totalTransactions: summary.transactionCount 
        });
    };

    const handleExportCSV = () => {
        dataService.exportAllReportsCSV({ 
            transactionRecords: filteredData.txns, 
            stockAdjustments: filteredData.stock,
            products: [], rawMaterials: [], users: [], expenses: [], otherIncomes: [], suppliers: [], purchases: [], customers: [], discountDefinitions: [], heldCarts: [], sessionHistory: [], auditLogs: [],
            receiptSettings: receiptSettings as any, inventorySettings: {} as any, authSettings: {} as any, sessionSettings: {} as any, membershipSettings: {} as any, categories: [], balanceLogs: []
        });
    };

    // --- COLUMNS ---
    const transactionColumns = useMemo(() => [
        { label: 'Waktu', width: '1.2fr', render: (t: Transaction) => <span className="text-slate-400 text-xs">{new Date(t.createdAt).toLocaleString('id-ID')}</span> },
        { label: 'ID', width: '1fr', render: (t: Transaction) => <span className="font-mono text-xs text-slate-500">#{t.id.slice(-4)}</span> },
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '0.8fr', 
            render: (t: any) => <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300 font-mono">{t.storeId || '-'}</span> 
        }] : []),
        { label: 'Total', width: '1fr', render: (t: Transaction) => <span className="font-bold text-white text-sm">{CURRENCY_FORMATTER.format(t.total)}</span> },
        { label: 'Metode', width: '1fr', render: (t: Transaction) => {
            const methods = t.payments.map(p => p.method === 'cash' ? 'Tunai' : p.method === 'member-balance' ? 'Saldo' : 'Non-Tunai').join(', ');
            return <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{methods}</span>
        }},
    ], [dataSource]);

    const stockColumns = useMemo(() => [
        { label: 'Waktu', width: '1.2fr', render: (s: StockAdjustment) => <span className="text-slate-400 whitespace-nowrap text-xs">{new Date(s.createdAt).toLocaleString('id-ID')}</span> },
        // Kolom Cabang Khusus Mode Cloud
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '0.8fr', 
            render: (s: any) => <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300 font-mono">{s.storeId || '-'}</span> 
        }] : []),
        { label: 'Produk', width: '2fr', render: (s: StockAdjustment) => <span className="font-semibold text-white text-sm">{s.productName}</span> },
        { label: 'Tipe', width: '1fr', render: (s: StockAdjustment) => {
            // Deteksi Tipe dari Notes atau Change
            const isOpname = s.notes?.toLowerCase().includes('opname');
            const isTransfer = s.notes?.toLowerCase().includes('transfer');
            const isWaste = s.change < 0 && !isTransfer;
            
            let badgeClass = 'bg-slate-700 text-slate-300';
            let label = 'UPDATE';

            if (isOpname) {
                badgeClass = 'bg-blue-500/20 text-blue-300';
                label = 'OPNAME';
            } else if (isTransfer) {
                badgeClass = 'bg-purple-500/20 text-purple-300';
                label = 'TRANSFER';
            } else if (s.change > 0) {
                badgeClass = 'bg-green-500/20 text-green-400';
                label = 'MASUK';
            } else if (isWaste) {
                badgeClass = 'bg-red-500/20 text-red-400';
                label = 'KELUAR';
            }

            return (
                <span className={`px-2 py-1 text-[10px] font-bold rounded ${badgeClass}`}>
                    {label}
                </span>
            );
        } },
        { label: 'Jml', width: '0.8fr', render: (s: StockAdjustment) => (
            <span className={`font-mono font-bold text-sm ${s.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {s.change > 0 ? '+' : ''}{s.change}
            </span>
        ) },
        { label: 'Sisa', width: '0.8fr', render: (s: StockAdjustment) => <span className="text-slate-300 text-sm">{s.newStock}</span> },
        { label: 'Catatan', width: '2.5fr', render: (s: StockAdjustment) => <span className="text-xs text-slate-400 italic">{s.notes || '-'}</span> },
    ], [dataSource]);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-white">Laporan</h1>
                
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Data Source Toggle */}
                    <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700">
                        <button onClick={() => setDataSource('local')} className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${dataSource === 'local' ? 'bg-[#347758] text-white' : 'text-slate-400'}`}>Lokal</button>
                        <button onClick={() => setDataSource('dropbox')} className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${dataSource === 'dropbox' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Cloud</button>
                    </div>

                    {/* Time Filter */}
                    <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700 overflow-x-auto max-w-[200px] sm:max-w-none hide-scrollbar">
                        {(['today', 'week', 'month', 'all'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${filter === f ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>
                                {f === 'today' ? 'Hari Ini' : f === 'week' ? 'Minggu Ini' : f === 'month' ? 'Bulan Ini' : 'Semua'}
                            </button>
                        ))}
                    </div>

                    {/* Export */}
                    <Button size="sm" onClick={handleExport} variant="secondary"><Icon name="printer" className="w-4 h-4" /> PDF</Button>
                    <Button size="sm" onClick={handleExportCSV} variant="secondary"><Icon name="download" className="w-4 h-4" /> CSV</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-[#347758] shadow-md">
                    <p className="text-slate-400 text-sm uppercase">Total Omzet</p>
                    <p className="text-2xl font-bold text-white">{CURRENCY_FORMATTER.format(summary.totalSales)}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-blue-500 shadow-md">
                    <p className="text-slate-400 text-sm uppercase">Total Transaksi</p>
                    <p className="text-2xl font-bold text-white">{summary.transactionCount}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-yellow-500 shadow-md">
                    <p className="text-slate-400 text-sm uppercase">Estimasi Profit</p>
                    <p className="text-2xl font-bold text-white">{CURRENCY_FORMATTER.format(summary.totalProfit)}</p>
                </div>
            </div>

            {/* Charts */}
            <ReportCharts 
                hourlyChartData={chartData.hourly}
                salesOverTimeData={chartData.trend}
                categorySalesData={chartData.category}
                bestSellingProducts={chartData.products}
                filter={filter}
                showSessionView={false}
            />

            {/* Tables Tab */}
            <div className="bg-slate-800 rounded-lg shadow-md border border-slate-700 flex flex-col h-[600px]">
                <div className="flex border-b border-slate-700">
                    <button onClick={() => setActiveTab('sales')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'sales' ? 'border-[#347758] text-[#52a37c]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        Riwayat Penjualan
                    </button>
                    <button onClick={() => setActiveTab('stock')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'stock' ? 'border-[#347758] text-[#52a37c]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        Mutasi Stok & Log
                    </button>
                </div>
                
                <div className="flex-1 p-4 overflow-hidden">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Memuat data...</div>
                    ) : activeTab === 'sales' ? (
                        <VirtualizedTable data={filteredData.txns} columns={transactionColumns} rowHeight={50} minWidth={dataSource === 'dropbox' ? 900 : 700} />
                    ) : (
                        <VirtualizedTable data={filteredData.stock} columns={stockColumns} rowHeight={50} minWidth={dataSource === 'dropbox' ? 1000 : 800} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsView;

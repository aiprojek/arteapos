
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
import Modal from '../components/Modal';
import ReceiptModal from '../components/ReceiptModal';
import { generateSalesReportPDF } from '../utils/pdfGenerator';
import { dataService } from '../services/dataService';
import type { Transaction, StockAdjustment } from '../types';
import { Capacitor } from '@capacitor/core';
import { saveBinaryFileNative } from '../utils/nativeHelper';

const ReportsView: React.FC = () => {
    const { transactions: localTransactions, refundTransaction } = useFinance();
    const { stockAdjustments: localStockAdjustments } = useProduct();
    const { receiptSettings } = useSettings();
    const { showAlert } = useUI();

    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
    const [cloudData, setCloudData] = useState<{ transactions: Transaction[], stockAdjustments: StockAdjustment[] }>({ transactions: [], stockAdjustments: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'transactions' | 'products' | 'stock'>('transactions');
    
    // Receipt & Evidence State
    const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
    // UPDATED: Evidence State now holds URL and Filename
    const [evidenceData, setEvidenceData] = useState<{ url: string; filename: string } | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1); // ZOOM STATE

    // Refund State
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
    const [refundReason, setRefundReason] = useState('');

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

        const txns = activeTransactions.filter(t => filterFn(t.createdAt)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const stock = activeStockAdjustments.filter(s => filterFn(s.createdAt)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { txns, stock };
    }, [filter, activeTransactions, activeStockAdjustments]);

    // --- AGGREGATION LOGIC ---

    const summary = useMemo(() => {
        const validTxns = filteredData.txns.filter(t => t.paymentStatus !== 'refunded');
        const totalSales = validTxns.reduce((sum, t) => sum + t.total, 0);
        
        // Estimate Profit (Simplified: Total - Cost of Items)
        const totalCost = validTxns.reduce((sum, t) => {
            return sum + (t.items || []).reduce((is, i) => is + ((i.costPrice || 0) * i.quantity), 0);
        }, 0);
        
        return {
            totalSales,
            totalProfit: totalSales - totalCost,
            transactionCount: validTxns.length
        };
    }, [filteredData]);

    const productRecap = useMemo(() => {
        const map = new Map<string, {name: string, quantity: number, total: number}>();
        
        filteredData.txns.forEach(t => {
            if (t.paymentStatus === 'refunded') return;
            (t.items || []).forEach(item => {
                if (item.isReward) return; // Skip rewards from recap
                const key = item.id;
                const existing = map.get(key);
                const itemTotal = item.price * item.quantity; // Not accounting for item discounts in detail here for simplicity
                
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
        
        // Hourly Sales (Today/Average)
        const hourlyMap = new Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, total: 0, count: 0 }));
        validTxns.forEach(t => {
            const h = new Date(t.createdAt).getHours();
            hourlyMap[h].total += t.total;
            hourlyMap[h].count += 1;
        });

        // Sales Over Time
        const salesMap = new Map<string, number>();
        validTxns.forEach(t => {
            const date = new Date(t.createdAt).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
            salesMap.set(date, (salesMap.get(date) || 0) + t.total);
        });
        const salesOverTime = Array.from(salesMap.entries()).map(([name, total]) => ({ name, total }));

        // Category Sales
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

    const handleExport = () => {
        const periodLabel = filter === 'today' ? 'Hari Ini' : filter === 'week' ? 'Minggu Ini' : filter === 'month' ? 'Bulan Ini' : 'Semua Waktu';
        // Only export valid transactions
        const validTxns = filteredData.txns.filter(t => t.paymentStatus !== 'refunded');
        generateSalesReportPDF(validTxns, receiptSettings, periodLabel, { 
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

    const initiateRefund = (t: Transaction) => {
        if (dataSource !== 'local') return;
        setRefundTarget(t);
        setRefundReason('');
        setIsRefundModalOpen(true);
    };

    const processRefund = () => {
        if (!refundTarget) return;
        
        refundTransaction(refundTarget.id, refundReason); // Pass reason to context
        setIsRefundModalOpen(false);
        setRefundTarget(null);
        showAlert({ type: 'alert', title: 'Berhasil', message: 'Transaksi telah direfund.' });
    };

    const handleDownloadEvidence = async () => {
        if (!evidenceData) return;
        try {
            // Gunakan filename yang sudah disiapkan dari data transaksi
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

    // --- COLUMNS FOR TRANSACTION TABLE ---
    const transactionColumns = [
        { label: 'Waktu', width: '120px', render: (t: Transaction) => <span className="text-slate-400 text-xs">{new Date(t.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span> },
        { label: 'ID', width: '80px', render: (t: Transaction) => <span className="font-mono text-xs text-slate-500">#{t.id.slice(-4)}</span> },
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', width: '100px', 
            render: (t: any) => <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300 font-mono">{t.storeId || '-'}</span> 
        }] : []),
        { label: 'Pelanggan', width: '120px', render: (t: Transaction) => <span className="text-xs text-white">{t.customerName || 'Umum'}</span> },
        { label: 'Kasir', width: '80px', render: (t: Transaction) => <span className="text-xs text-slate-400">{t.userName}</span> },
        { label: 'Item', width: '2fr', render: (t: Transaction) => (
            <span className="text-xs text-slate-300 block truncate" title={(t.items || []).map(i => i.name).join(', ')}>
                {(t.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
            </span>
        )},
        { label: 'Total', width: '100px', render: (t: Transaction) => <span className="font-bold text-white text-sm">{CURRENCY_FORMATTER.format(t.total)}</span> },
        { label: 'Status', width: '100px', render: (t: Transaction) => {
             const color = t.paymentStatus === 'paid' ? 'text-green-400' : t.paymentStatus === 'refunded' ? 'text-red-400' : 'text-yellow-400';
             return <span className={`text-xs font-bold uppercase ${color}`}>{t.paymentStatus}</span>
        }},
        { label: 'Bukti', width: '60px', render: (t: Transaction) => {
             // Safe access for payments array
             const payments = t.payments || [];
             const hasEvidence = payments.some(p => p.evidenceImageUrl);
             if (hasEvidence) {
                 return (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            const img = payments.find(p => p.evidenceImageUrl)?.evidenceImageUrl;
                            if (img) {
                                // Sanitasi ID untuk nama file
                                const safeId = t.id.replace(/[^a-z0-9]/gi, '-');
                                const dateStr = new Date(t.createdAt).toISOString().slice(0, 10);
                                setEvidenceData({
                                    url: img,
                                    filename: `Bukti_Trx_${safeId}_${dateStr}.jpg`
                                });
                                setZoomLevel(1); // Reset zoom
                            }
                        }}
                        className="text-blue-400 hover:text-blue-300 p-1"
                        title="Lihat Bukti Pembayaran"
                    >
                        <Icon name="camera" className="w-4 h-4"/>
                    </button>
                 )
             }
             return null;
        }},
        { label: 'Aksi', width: '140px', render: (t: Transaction) => (
            <div className="flex gap-2">
                <button onClick={() => setReceiptTransaction(t)} className="text-sky-400 hover:text-white bg-slate-700/50 p-1.5 rounded" title="Lihat Struk">
                    <Icon name="printer" className="w-4 h-4"/>
                </button>
                {dataSource === 'local' && t.paymentStatus !== 'refunded' && (
                    <button onClick={() => initiateRefund(t)} className="text-red-400 hover:text-white bg-slate-700/50 p-1.5 rounded" title="Refund">
                        <Icon name="reset" className="w-4 h-4"/>
                    </button>
                )}
            </div>
        )}
    ];

    // --- COLUMNS FOR PRODUCT RECAP TABLE ---
    const productColumns = [
        { label: 'Nama Produk', width: '3fr', render: (p: any) => <span className="font-bold text-white">{p.name}</span> },
        { label: 'Terjual (Qty)', width: '1fr', render: (p: any) => <span className="text-slate-300">{p.quantity}</span> },
        { label: 'Total Omzet', width: '1.5fr', render: (p: any) => <span className="text-green-400 font-bold">{CURRENCY_FORMATTER.format(p.total)}</span> }
    ];

    // --- COLUMNS FOR STOCK TABLE (UNCHANGED) ---
    const stockColumns = useMemo(() => [
        { label: 'Waktu', width: '1.2fr', render: (s: StockAdjustment) => <span className="text-slate-400 whitespace-nowrap text-xs">{new Date(s.createdAt).toLocaleString('id-ID')}</span> },
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '0.8fr', 
            render: (s: any) => <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300 font-mono">{s.storeId || '-'}</span> 
        }] : []),
        { label: 'Produk', width: '2fr', render: (s: StockAdjustment) => <span className="font-semibold text-white text-sm">{s.productName}</span> },
        { label: 'Tipe', width: '1fr', render: (s: StockAdjustment) => {
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

            {/* Charts - Visible Always */}
            <ReportCharts 
                hourlyChartData={chartData.hourly}
                salesOverTimeData={chartData.trend}
                categorySalesData={chartData.category}
                bestSellingProducts={chartData.products}
                filter={filter}
                showSessionView={false}
            />

            {/* Main Tabs */}
            <div className="bg-slate-800 rounded-lg shadow-md border border-slate-700 flex flex-col h-[600px]">
                <div className="flex border-b border-slate-700 overflow-x-auto">
                    <button onClick={() => setActiveTab('transactions')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'transactions' ? 'border-[#347758] text-[#52a37c]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        Riwayat Penjualan
                    </button>
                    <button onClick={() => setActiveTab('products')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'products' ? 'border-[#347758] text-[#52a37c]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        Rekap Produk
                    </button>
                    <button onClick={() => setActiveTab('stock')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'stock' ? 'border-[#347758] text-[#52a37c]' : 'border-transparent text-slate-400 hover:text-white'}`}>
                        Mutasi Stok & Log
                    </button>
                </div>
                
                <div className="flex-1 p-4 overflow-hidden relative">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Memuat data...</div>
                    ) : (
                        <>
                            {activeTab === 'transactions' && (
                                <VirtualizedTable 
                                    data={filteredData.txns} 
                                    columns={transactionColumns} 
                                    rowHeight={50} 
                                    minWidth={dataSource === 'dropbox' ? 1000 : 900} 
                                />
                            )}
                            {activeTab === 'products' && (
                                <VirtualizedTable 
                                    data={productRecap} 
                                    columns={productColumns} 
                                    rowHeight={50} 
                                    minWidth={500} 
                                />
                            )}
                            {activeTab === 'stock' && (
                                <VirtualizedTable 
                                    data={filteredData.stock} 
                                    columns={stockColumns} 
                                    rowHeight={50} 
                                    minWidth={dataSource === 'dropbox' ? 1000 : 800} 
                                />
                            )}
                        </>
                    )}
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
                            
                            {/* Floating Zoom Controls */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-slate-800/80 p-2 rounded-full backdrop-blur-sm border border-slate-600 shadow-lg z-10">
                                <button 
                                    onClick={handleZoomOut} 
                                    className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors"
                                    title="Zoom Out"
                                >
                                    <Icon name="zoom-out" className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-mono text-white min-w-[3rem] text-center">
                                    {(zoomLevel * 100).toFixed(0)}%
                                </span>
                                <button 
                                    onClick={handleZoomIn} 
                                    className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors"
                                    title="Zoom In"
                                >
                                    <Icon name="zoom-in" className="w-4 h-4" />
                                </button>
                                <div className="w-px h-4 bg-slate-600 mx-1"></div>
                                <button 
                                    onClick={handleResetZoom} 
                                    className="text-xs text-sky-400 hover:text-white px-2 font-bold"
                                    title="Reset Zoom"
                                >
                                    Reset
                                </button>
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

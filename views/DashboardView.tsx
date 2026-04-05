
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { CURRENCY_FORMATTER } from '../constants';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Brush } from 'recharts';
import { useUIActions } from '../context/UIContext';
import OverflowMenu from '../components/OverflowMenu';
import { filterItemsByBranch, getAvailableBranchesFromItems, loadDashboardCloudSource } from '../services/cloudReadModel';

type DashboardInsightKey = 'profit' | 'sales' | 'stock' | 'branch';

const DASHBOARD_INSIGHT_OPTIONS: Array<{ id: DashboardInsightKey; label: string }> = [
    { id: 'profit', label: 'Analisis profitabilitas' },
    { id: 'sales', label: 'Strategi meningkatkan omzet' },
    { id: 'stock', label: 'Evaluasi stok & pengeluaran' },
    { id: 'branch', label: 'Ringkasan performa cabang' },
];

const StatCard: React.FC<{ title: string; value: string; icon: 'cash' | 'products' | 'reports' | 'finance'; iconClass: string; children?: React.ReactNode; tooltip?: string; className?: string }> = ({ title, value, icon, iconClass, children, tooltip, className = '' }) => (
    <motion.div 
        whileHover={{ y: -5, backgroundColor: 'rgba(30, 41, 59, 0.7)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`bg-slate-900/40 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-lg flex flex-col h-full border border-slate-700/50 relative group ${className}`}
    >
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider flex items-center gap-1">
                    {title}
                    {tooltip && (
                        <span className="text-[10px] text-slate-500 bg-slate-900 rounded-full w-4 h-4 inline-flex items-center justify-center cursor-help" title={tooltip}>?</span>
                    )}
                </h3>
                <p className="text-3xl font-bold text-white mt-1">{value}</p>
            </div>
            <div className={`rounded-full p-3 ${iconClass} shadow-lg shadow-${iconClass.split('-')[1]}/20`}>
                <Icon name={icon} className="w-6 h-6 text-white" />
            </div>
        </div>
        {children && <div className="mt-4 pt-4 border-t border-slate-700/50 flex-grow">{children}</div>}
    </motion.div>
);

const HeroStatCard: React.FC<{
    title: string;
    value: string;
    subtitle: string;
    icon: 'cash' | 'finance';
    accentClass: string;
    children?: React.ReactNode;
}> = ({ title, value, subtitle, icon, accentClass, children }) => (
    <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className={`relative overflow-hidden rounded-2xl border p-6 sm:p-7 shadow-xl ${accentClass}`}
    >
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-1 bg-emerald-400/80 pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{title}</p>
                <p className="mt-3 text-3xl sm:text-4xl font-bold text-white break-words">{value}</p>
                <p className="mt-2 text-sm text-white/80 max-w-md">{subtitle}</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-white/10 p-3 border border-white/10">
                <Icon name={icon} className="w-7 h-7 text-white" />
            </div>
        </div>
        {children && <div className="relative z-10 mt-5 border-t border-white/10 pt-4">{children}</div>}
    </motion.div>
);

const PanelCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
    <div className={`bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-700 ${className}`}>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            {icon}
            {title}
        </h3>
        {children}
    </div>
);

const DashboardView: React.FC = () => {
    const { transactions: localTransactions, importTransactions, expenses: localExpenses } = useFinance(); // ADD localExpenses
    const { products, inventorySettings, importStockAdjustments } = useProduct();
    const { showAlert } = useUIActions();

    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    // Updated state to hold stockLogs and expenses
    const [cloudData, setCloudData] = useState<{ transactions: any[], inventory: any[], stockLogs: any[], expenses: any[] }>({ transactions: [], inventory: [], stockLogs: [], expenses: [] });
    const [isCloudLoading, setIsCloudLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('ALL');
    const [isBranchMenuOpen, setBranchMenuOpen] = useState(false);
    const [cloudMode, setCloudMode] = useState<'live' | 'demo' | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [aiResponse, setAiResponse] = useState('');
    const [selectedInsight, setSelectedInsight] = useState<DashboardInsightKey>('profit');
    const [isCompactDashboard, setIsCompactDashboard] = useState(false);
    const branchMenuRef = useRef<HTMLDivElement>(null);
    const [isInsightVisible, setIsInsightVisible] = useState(true);

    useEffect(() => {
        const updateLayoutMode = () => {
            if (typeof window === 'undefined') return;
            setIsCompactDashboard(window.innerWidth < 768);
        };

        updateLayoutMode();
        window.addEventListener('resize', updateLayoutMode);
        return () => window.removeEventListener('resize', updateLayoutMode);
    }, []);

    useEffect(() => {
        if (!isBranchMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (branchMenuRef.current && !branchMenuRef.current.contains(event.target as Node)) {
                setBranchMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isBranchMenuOpen]);

    // Load Dropbox Data Logic (Aggregation)
    const loadDropboxData = async () => {
        setIsCloudLoading(true);

        try {
            const result = await loadDashboardCloudSource();
            setCloudData(result.data);
            setCloudMode(result.mode);
            setLastUpdated(result.lastUpdated);

        } catch (error: any) {
            console.error(error);
            showAlert({ type: 'alert', title: 'Gagal Sync Dropbox', message: error.message });
            setDataSource('local');
        } finally {
            setIsCloudLoading(false);
        }
    };

    // NEW: Merge Logic for Dashboard
    const handleMergeToLocal = () => {
        if (cloudData.transactions.length === 0 && cloudData.stockLogs.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data cloud untuk disimpan.' });
            return;
        }

        showAlert({
            type: 'confirm',
            title: 'Simpan Permanen?',
            message: (
                <div className="text-left text-sm">
                    <p>Simpan data dari Dashboard Cloud ke database lokal perangkat ini?</p>
                    <ul className="list-disc pl-5 mt-2 text-slate-300">
                        <li>{cloudData.transactions.length} Transaksi</li>
                        <li>{cloudData.stockLogs.length} Riwayat Stok</li>
                        <li>{cloudData.expenses.length} Pengeluaran</li>
                    </ul>
                    <p className="mt-2 text-yellow-300 bg-yellow-900/30 p-2 rounded border border-yellow-700">
                        Data akan digabungkan (Merge). Data dengan ID yang sama tidak akan diduplikasi.
                    </p>
                </div>
            ),
            confirmText: 'Ya, Simpan',
            onConfirm: () => {
                importTransactions(cloudData.transactions);
                importStockAdjustments(cloudData.stockLogs);
                showAlert({ type: 'alert', title: 'Berhasil', message: 'Data cloud berhasil digabungkan ke database lokal.' });
                setDataSource('local'); // Switch back
            }
        });
    };

    const handleSourceChange = (source: 'local' | 'dropbox') => {
        setDataSource(source);
        if (source === 'dropbox') loadDropboxData();
        else setCloudMode(null);
    };

    // Available Branches for Filter
    const availableBranches = useMemo(() => {
        if (dataSource === 'local') return [];
        return getAvailableBranchesFromItems(cloudData.transactions, cloudData.inventory, cloudData.stockLogs, cloudData.expenses);
    }, [cloudData, dataSource]);

    // Derived Data Calculation
    const dashboardData = useMemo(() => {
        // Prepare Source Data
        let sourceTransactions = dataSource === 'local' ? localTransactions : cloudData.transactions.map(t => ({
            ...t, createdAt: t.created_at || t.createdAt, storeId: t.storeId
        }));
        
        let sourceExpenses = dataSource === 'local' ? localExpenses : cloudData.expenses.map(e => ({
            ...e, storeId: e.storeId
        }));

        // Apply Branch Filter
        if (dataSource !== 'local' && selectedBranch !== 'ALL') {
            sourceTransactions = filterItemsByBranch(sourceTransactions as any[], selectedBranch);
            sourceExpenses = filterItemsByBranch(sourceExpenses as any[], selectedBranch);
        }

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6); 

        const activeTransactions = sourceTransactions.filter((t: any) => t.payment_status !== 'refunded' && t.paymentStatus !== 'refunded');

        const todayTransactions = activeTransactions.filter((t: any) => new Date(t.createdAt).getTime() >= todayStart);
        const last7DaysTransactions = activeTransactions.filter((t: any) => new Date(t.createdAt).getTime() >= weekStart.getTime());

        const todaySales = todayTransactions.reduce((sum: number, t: any) => sum + (t.total || 0), 0);
        const transactionCount = todayTransactions.length;

        // --- PROFIT CALCULATION (NET) ---
        // 1. Calculate COGS (HPP) for Today's Sales
        const todayCOGS = todayTransactions.reduce((sum: number, t: any) => {
            const items = t.items || [];
            const txnCost = items.reduce((is: number, i: any) => is + ((i.costPrice || 0) * i.quantity), 0);
            return sum + txnCost;
        }, 0);

        // 2. Calculate Today's Expenses
        const todayExpensesTotal = sourceExpenses
            .filter((e: any) => new Date(e.date).getTime() >= todayStart)
            .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

        // 3. Net Profit = Sales - COGS - Expenses
        const todayNetProfit = todaySales - todayCOGS - todayExpensesTotal;

        // Inventory Logic
        let lowStockProducts: any[] = [];
        if (dataSource === 'local') {
            lowStockProducts = inventorySettings.enabled
                ? products.filter(p => p.trackStock && (p.stock ?? 0) <= 5).sort((a,b) => (a.stock ?? 0) - (b.stock ?? 0))
                : [];
        } else {
            let sourceInventory = cloudData.inventory;
            if (selectedBranch !== 'ALL') {
                sourceInventory = filterItemsByBranch(sourceInventory as any[], selectedBranch);
            }
            lowStockProducts = sourceInventory
                .filter(i => i.stock <= 5)
                .sort((a,b) => a.stock - b.stock)
                .slice(0, 10); 
        }

        const outstandingReceivables = sourceTransactions
            .filter((t: any) => t.paymentStatus === 'partial' || t.paymentStatus === 'unpaid' || t.payment_status === 'partial' || t.payment_status === 'unpaid')
            .reduce((sum: number, t: any) => sum + ((t.total || 0) - (t.amountPaid || 0)), 0);

        // Sales Trend
        const salesByDay = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return {
                name: d.toLocaleDateString('id-ID', { weekday: 'short' }),
                date: d.toISOString().split('T')[0],
                Penjualan: 0,
            };
        });

        last7DaysTransactions.forEach((t: any) => {
            const dateStr = new Date(t.createdAt).toISOString().split('T')[0];
            const dayData = salesByDay.find(d => d.date === dateStr);
            if (dayData) dayData.Penjualan += (t.total || 0);
        });

        // Top Products
        const productSales = new Map<string, { name: string, quantity: number }>();
        last7DaysTransactions.forEach((t: any) => {
            const items = t.items || [];
            items.forEach((item: any) => {
                if (!item.isReward) {
                    const id = item.id || item.name;
                    const existing = productSales.get(id) || { name: item.name, quantity: 0 };
                    productSales.set(id, { ...existing, quantity: existing.quantity + (item.quantity || 0) });
                }
            });
        });
        const topProducts = Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

        // Multi-Branch Stats
        let branchPerformance: any[] = [];
        if (dataSource !== 'local' && selectedBranch === 'ALL') {
            const salesByStore = new Map<string, number>();
            activeTransactions.forEach((t: any) => {
                const store = t.storeId || 'Unknown';
                salesByStore.set(store, (salesByStore.get(store) || 0) + (t.total || 0));
            });
            branchPerformance = Array.from(salesByStore.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);
        }

        return {
            todaySales,
            todayNetProfit, // NEW
            todayExpensesTotal, // NEW (Optional to show?)
            transactionCount,
            lowStockProducts,
            outstandingReceivables,
            salesTrend: salesByDay,
            topProducts,
            branchPerformance,
            recentTransactions: sourceTransactions.slice(0, 5)
        };
    }, [dataSource, localTransactions, localExpenses, cloudData, products, inventorySettings, selectedBranch]);
    
    const aiResponseText = useMemo(() => {
        const topProduct = dashboardData.topProducts[0];
        const weakStock = dashboardData.lowStockProducts[0];
        const bestBranch = dashboardData.branchPerformance[0];
        const latestTrend = dashboardData.salesTrend;
        const firstDay = latestTrend[0]?.Penjualan ?? 0;
        const lastDay = latestTrend[latestTrend.length - 1]?.Penjualan ?? 0;
        const trendDirection = lastDay >= firstDay ? 'naik' : 'turun';
        const trendDeltaText = CURRENCY_FORMATTER.format(Math.abs(lastDay - firstDay));

        switch (selectedInsight) {
            case 'profit':
                return `
### Ringkasan Profit Hari Ini

Omzet yang tercatat hari ini berada di **${CURRENCY_FORMATTER.format(dashboardData.todaySales)}**, dengan profit bersih sebesar **${CURRENCY_FORMATTER.format(dashboardData.todayNetProfit)}**. Di waktu yang sama, pengeluaran operasional yang sudah masuk ke sistem hari ini mencapai **${CURRENCY_FORMATTER.format(dashboardData.todayExpensesTotal)}**.

${dashboardData.todayNetProfit >= 0
    ? `Secara umum ini menunjukkan kondisi usaha masih berada di jalur yang sehat. Fokus utamanya sekarang adalah menjaga margin tetap stabil sambil memastikan pengeluaran tidak tumbuh lebih cepat daripada penjualan.`
    : `Angka ini menunjukkan profit hari ini masih tertekan. Dalam situasi seperti ini, prioritas yang paling masuk akal adalah menahan pengeluaran yang tidak mendesak dan mendorong penjualan item dengan margin yang lebih baik.`}

Dengan melihat komposisi omzet, profit, dan pengeluaran secara bersamaan, keputusan terbaik untuk jangka pendek adalah menjaga ritme transaksi tetap aktif sambil lebih selektif terhadap biaya operasional harian.
                `.trim();
            case 'sales':
                return `
### Saran Meningkatkan Omzet

${topProduct
    ? `Produk yang paling menonjol saat ini adalah **${topProduct.name}**, dengan total **${topProduct.quantity}** terjual selama periode yang diamati. Produk seperti ini layak dijadikan titik dorong utama untuk promo, bundling, atau rekomendasi kasir.`
    : `Belum terlihat produk yang benar-benar dominan minggu ini. Ini berarti peluang untuk menonjolkan 1 atau 2 produk unggulan masih sangat terbuka.`}

Jika dibandingkan dengan awal periode, tren penjualan tujuh hari terakhir terlihat **${trendDirection}**. Selisih pergerakannya sekitar **${trendDeltaText}**, yang bisa menjadi sinyal apakah momentum penjualan sedang membaik atau justru perlu dijaga lebih serius.

Langkah praktis yang paling masuk akal adalah menonjolkan produk yang cepat laku, mendorong upsell saat transaksi berlangsung, dan memastikan produk dengan performa terbaik selalu berada di area yang paling mudah terlihat pelanggan.
                `.trim();
            case 'stock':
                return `
### Evaluasi Stok dan Pengeluaran

${weakStock
    ? `Item yang paling perlu diperhatikan saat ini adalah **${weakStock.item_name || weakStock.name}**, dengan sisa stok **${weakStock.stock}**. Jika item ini termasuk yang cepat berputar, maka restock sebaiknya tidak ditunda terlalu lama.`
    : `Untuk saat ini belum ada item yang masuk kategori stok kritis, sehingga operasional masih relatif aman dari sisi persediaan.`}

Jumlah item yang sudah masuk daftar stok menipis saat ini adalah **${dashboardData.lowStockProducts.length}**. Sementara itu, total pengeluaran yang tercatat hari ini mencapai **${CURRENCY_FORMATTER.format(dashboardData.todayExpensesTotal)}**.

Artinya, langkah paling aman adalah memprioritaskan pembelian ulang untuk item yang benar-benar menopang penjualan utama, bukan melakukan restock merata ke semua item sekaligus. Dengan begitu, kas tetap terjaga dan stok penting tidak sampai putus.
                `.trim();
            case 'branch':
                return `
### Ringkasan Performa Cabang

${dataSource === 'local'
    ? `Saat ini dashboard berjalan dalam mode lokal, jadi perbandingan antar cabang belum tersedia.`
    : bestBranch
        ? `Cabang dengan performa penjualan tertinggi saat ini adalah **${bestBranch.name}**, dengan total penjualan **${CURRENCY_FORMATTER.format(bestBranch.value)}**. Angka ini bisa dijadikan acuan awal untuk membaca standar performa terbaik.`
        : `Belum ada data cabang yang cukup untuk dibandingkan secara meyakinkan.`}

${dataSource !== 'local' && selectedBranch !== 'ALL'
    ? `Saat ini tampilan sedang difokuskan pada cabang **${selectedBranch}**, sehingga pembacaan data dan insight juga mengikuti lokasi tersebut.`
    : `Jika ingin membaca performa lebih tajam, gunakan filter cabang agar perbedaan ritme penjualan tiap lokasi lebih mudah terlihat.`}

Langkah evaluasi berikutnya sebaiknya diarahkan ke tiga hal: melihat kesenjangan omzet antar cabang, mengecek apakah ada lokasi dengan stok kritis lebih banyak, dan memastikan transaksi harian setiap cabang tetap konsisten.
                `.trim();
            default:
                return '';
        }
    }, [dashboardData, dataSource, selectedBranch, selectedInsight]);

    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        let html = '';
        let inList = false;
        for (const line of lines) {
            let processedLine = line.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
            if (processedLine.startsWith('- ') || processedLine.startsWith('* ')) {
                if (!inList) { html += '<ul class="list-disc pl-5 space-y-1">'; inList = true; }
                html += `<li>${processedLine.substring(2)}</li>`;
            } else {
                if (inList) { html += '</ul>'; inList = false; }
                if (processedLine.startsWith('###')) html += `<h4 class="font-bold mt-2">${processedLine.replace('###', '')}</h4>`;
                else if (processedLine) html += `<p>${processedLine}</p>`;
            }
        }
        if (inList) html += '</ul>';
        return { __html: html };
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6 max-w-7xl mx-auto pb-10"
        >
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div className="space-y-3 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                                <Icon name="reports" className="w-3.5 h-3.5" />
                                Ringkasan Bisnis
                            </span>
                            {dataSource === 'dropbox' && (
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${cloudMode === 'demo' ? 'border-yellow-700 bg-yellow-900/20 text-yellow-200' : 'border-blue-800 bg-blue-900/20 text-blue-200'}`}>
                                    <Icon name={cloudMode === 'demo' ? 'warning' : 'cloud'} className="w-3.5 h-3.5" />
                                    {cloudMode === 'demo' ? 'Mode Demo' : 'Mode Cloud'}
                                </span>
                            )}
                            {lastUpdated && (
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[11px] text-slate-400">
                                    <Icon name="clock-history" className="w-3.5 h-3.5" />
                                    Update {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Dashboard</h1>
                            <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl">
                                Pantau penjualan, profit, stok menipis, dan aktivitas terbaru dari satu layar ringkas.
                            </p>
                        </div>
                    </div>

                    <div className="w-full xl:w-auto space-y-3">
                        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-1 flex gap-1">
                            <button
                                onClick={() => handleSourceChange('local')}
                                className={`min-w-0 flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${dataSource === 'local' ? 'bg-[#347758] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/80'}`}
                            >
                                <span className="flex items-center justify-center gap-2"><Icon name="database" className="w-4 h-4" /> Lokal</span>
                            </button>
                            <button
                                onClick={() => handleSourceChange('dropbox')}
                                className={`min-w-0 flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${dataSource === 'dropbox' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/80'}`}
                            >
                                <span className="flex items-center justify-center gap-2"><Icon name="share" className="w-4 h-4" /> Cloud</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-[7fr_3fr] gap-2 xl:justify-end">
                            {dataSource !== 'local' && availableBranches.length > 0 && (
                                <div className="min-w-0 relative" ref={branchMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setBranchMenuOpen(prev => !prev)}
                                        className="w-full h-11 rounded-2xl border border-blue-800 bg-blue-900/20 px-4 text-sm text-blue-100 shadow-sm flex items-center justify-between gap-2 hover:bg-blue-900/30 transition-colors"
                                    >
                                        <span className="truncate">{selectedBranch === 'ALL' ? 'Semua Cabang' : selectedBranch}</span>
                                        <Icon name="chevron-down" className={`w-4 h-4 text-blue-300 transition-transform ${isBranchMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isBranchMenuOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-full rounded-2xl border border-blue-900 bg-slate-800 shadow-xl z-50 overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedBranch('ALL');
                                                    setBranchMenuOpen(false);
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
                                                        setBranchMenuOpen(false);
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

                            <OverflowMenu
                                buttonClassName="text-sm h-11 w-full justify-between px-3"
                                variant="utility"
                                showLabelOnMobile={true}
                                matchTriggerWidth={true}
                                items={[
                                    ...(dataSource === 'dropbox' ? [
                                        {
                                            id: 'refresh',
                                            label: isCloudLoading ? 'Syncing...' : 'Refresh Data',
                                            onClick: () => { void loadDropboxData(); },
                                            icon: 'reset' as const,
                                            disabled: isCloudLoading
                                        },
                                        {
                                            id: 'merge',
                                            label: 'Simpan ke Lokal',
                                            onClick: handleMergeToLocal,
                                            icon: 'download' as const
                                        }
                                    ] : [])
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {dataSource !== 'local' && (
                    <div className={`mt-5 rounded-2xl p-4 flex items-start gap-3 text-sm animate-fade-in ${cloudMode === 'demo' ? 'bg-yellow-900/20 border border-yellow-700/60 text-yellow-200' : 'bg-blue-900/20 border border-blue-800/60 text-blue-200'}`}>
                        <Icon name={cloudMode === 'demo' ? "warning" : "info-circle"} className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold">{cloudMode === 'demo' ? "Mode Demo (Data Dummy)" : "Mode Laporan Terpusat (Dropbox)"}</p>
                            <p className="opacity-80 leading-relaxed">
                                {cloudMode === 'demo'
                                    ? "Dropbox belum dikonfigurasi. Data simulasi ditampilkan agar Anda bisa melihat gambaran dashboard multi-cabang."
                                    : (selectedBranch === 'ALL'
                                        ? 'Menampilkan data gabungan dari semua cabang yang terhubung.'
                                        : `Menampilkan data spesifik untuk cabang: ${selectedBranch}`)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Top Stats Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6">
                <div>
                    <HeroStatCard
                        title="Penjualan Hari Ini"
                        value={CURRENCY_FORMATTER.format(dashboardData.todaySales)}
                        subtitle={dataSource === 'local' ? 'Ringkasan omzet hari ini dari perangkat ini.' : `Ringkasan omzet ${selectedBranch === 'ALL' ? 'gabungan semua cabang' : `cabang ${selectedBranch}`}.`}
                        icon="cash"
                        accentClass="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-emerald-700/50"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-white/10 px-4 py-3 border border-white/10">
                                <p className="text-white/70 text-xs uppercase tracking-[0.16em]">Transaksi</p>
                                <p className="mt-1 text-xl font-bold text-white">{dashboardData.transactionCount}</p>
                            </div>
                            <div className="rounded-xl bg-white/10 px-4 py-3 border border-white/10">
                                <p className="text-white/70 text-xs uppercase tracking-[0.16em]">Pengeluaran Hari Ini</p>
                                <p className="mt-1 text-xl font-bold text-white">{CURRENCY_FORMATTER.format(dashboardData.todayExpensesTotal)}</p>
                            </div>
                        </div>
                    </HeroStatCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <StatCard title="Net Profit Hari Ini" value={CURRENCY_FORMATTER.format(dashboardData.todayNetProfit)} icon="finance" iconClass="bg-emerald-600">
                        <div className="space-y-2 min-h-[96px]">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Pengeluaran</span>
                                <span className="font-semibold text-slate-200">{CURRENCY_FORMATTER.format(dashboardData.todayExpensesTotal)}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 leading-relaxed">
                                Menunjukkan keuntungan bersih setelah HPP dan pengeluaran operasional hari ini.
                            </div>
                        </div>
                    </StatCard>

                    <StatCard title="Stok Menipis" value={dashboardData.lowStockProducts.length.toString()} icon="products" iconClass="bg-red-500">
                        {dashboardData.lowStockProducts.length > 0 ? (
                            <div className="space-y-2 overflow-y-auto max-h-28 pr-2 min-h-[96px]">
                                {dashboardData.lowStockProducts.slice(0, 5).map((p, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                        <span className="truncate text-slate-300">{p.item_name || p.name}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-red-300 font-bold">{p.stock}</span>
                                            {dataSource !== 'local' && <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">{p.storeId}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="min-h-[96px] flex items-start">
                                <p className="text-xs text-slate-500">Tidak ada stok kritis saat ini.</p>
                            </div>
                        )}
                    </StatCard>

                    <StatCard title="Produk Terlaris" value={dashboardData.topProducts.length.toString()} icon="reports" iconClass="bg-amber-500">
                        {dashboardData.topProducts.length > 0 ? (
                            <div className="space-y-2 overflow-y-auto max-h-28 pr-2 min-h-[96px]">
                                {dashboardData.topProducts.slice(0, 5).map((p, index) => (
                                    <div key={index} className="flex items-center justify-between gap-2 text-xs">
                                        <span className="truncate text-slate-300">{p.name}</span>
                                        <span className="rounded bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-100 shrink-0">{p.quantity}x</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="min-h-[96px] flex items-start">
                                <p className="text-xs text-slate-500">Belum ada data produk terlaris minggu ini.</p>
                            </div>
                        )}
                    </StatCard>
                </div>
            </motion.div>
            
            {/* Main Charts Area */}
            <motion.div variants={itemVariants} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                    <div className="lg:col-span-7 space-y-6">
                        {dataSource !== 'local' && selectedBranch === 'ALL' && dashboardData.branchPerformance.length > 0 && (
                            <PanelCard title="Performa Cabang (Total Penjualan)" icon={<Icon name="share" className="w-5 h-5 text-sky-400"/>}>
                                <ResponsiveContainer width="100%" height={isCompactDashboard ? 220 : 250}>
                                    <BarChart data={dashboardData.branchPerformance} layout="vertical" margin={{ top: 5, right: isCompactDashboard ? 10 : 30, left: isCompactDashboard ? 0 : 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                        <XAxis type="number" stroke="#9ca3af" fontSize={11} tickFormatter={(val) => `Rp${val/1000}k`} />
                                        <YAxis type="category" dataKey="name" stroke="#ffffff" fontSize={11} width={isCompactDashboard ? 72 : 100} tick={{ width: 72 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color:'#fff' }} formatter={(val: number) => CURRENCY_FORMATTER.format(val)} />
                                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={isCompactDashboard ? 22 : 30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </PanelCard>
                        )}

                        <PanelCard
                            title="Tren Penjualan (7 Hari Terakhir)"
                            icon={<Icon name="trending-up" className="w-5 h-5 text-green-400"/>}
                            className={dataSource === 'local' ? 'h-full' : ''}
                        >
                            <ResponsiveContainer width="100%" height={isCompactDashboard ? 220 : 250}>
                                <BarChart data={dashboardData.salesTrend} margin={{ top: 5, right: isCompactDashboard ? 8 : 20, left: isCompactDashboard ? -24 : -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                                    <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} width={isCompactDashboard ? 40 : 60} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Penjualan']} />
                                    <Bar dataKey="Penjualan" fill="#347758" radius={[4, 4, 0, 0]} />
                                    {!isCompactDashboard && <Brush dataKey="name" height={20} stroke="#52a37c" fill="#1e293b" />}
                                </BarChart>
                            </ResponsiveContainer>
                        </PanelCard>
                    </div>

                    <div className="lg:col-span-3 flex">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-700 flex-1 lg:h-full">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                                <Icon name="clock-history" className="w-5 h-5 text-sky-400" />
                                Transaksi Terakhir
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">Pantau transaksi terbaru untuk melihat ritme operasional terbaru.</p>
                            <div className="space-y-3">
                                {dashboardData.recentTransactions.map((t: any) => (
                                    <div key={t.id} className="flex justify-between items-center gap-3 text-sm rounded-xl border border-slate-700/70 bg-slate-900/50 px-3 py-3">
                                        <div className="min-w-0">
                                            <div className="font-medium text-white">{CURRENCY_FORMATTER.format(t.total)}</div>
                                            <div className="text-xs text-slate-400 truncate">
                                                {new Date(t.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} • {t.storeId || 'Local'}
                                            </div>
                                        </div>
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full shrink-0 font-semibold uppercase tracking-wide ${t.paymentStatus === 'paid' || t.payment_status === 'paid' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                            {(t.paymentStatus || t.payment_status) === 'paid' ? 'Lunas' : (t.paymentStatus || t.payment_status)}
                                        </span>
                                    </div>
                                ))}
                                {dashboardData.recentTransactions.length === 0 && (
                                    <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-4 text-xs text-slate-500">
                                        Belum ada transaksi terbaru yang bisa ditampilkan.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-1">
                                     <Icon name="chat" className="w-5 h-5 text-purple-400"/>
                                     Ringkasan Bisnis Cerdas
                                </h3>
                            <p className="text-sm text-slate-400">Pilih topik untuk melihat ringkasan dan saran singkat berdasarkan kondisi bisnis yang sedang tampil di dashboard.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                         <div className="flex flex-wrap gap-2">
                            {DASHBOARD_INSIGHT_OPTIONS.map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        if (selectedInsight === option.id && isInsightVisible) {
                                            setIsInsightVisible(false);
                                            return;
                                        }
                                        setSelectedInsight(option.id);
                                        setAiResponse(aiResponseText);
                                        setIsInsightVisible(true);
                                    }}
                                    className={`text-xs px-3 py-1.5 rounded-full transition-colors border ${
                                        selectedInsight === option.id && isInsightVisible
                                            ? 'bg-[#347758] border-[#4d9a74] text-white'
                                            : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-300'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {isInsightVisible && aiResponseText ? (
                            <div 
                                className="prose prose-sm prose-invert max-w-none bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-slate-300 max-h-80 overflow-y-auto" 
                                dangerouslySetInnerHTML={renderMarkdown(aiResponseText)}
                            />
                        ) : (
                            <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                                Klik topik yang ingin Anda lihat. Klik topik yang sama lagi untuk menyembunyikan hasilnya.
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default DashboardView;

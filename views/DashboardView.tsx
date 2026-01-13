
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { CURRENCY_FORMATTER } from '../constants';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Brush } from 'recharts';
import type { Transaction } from '../types';
import { dropboxService } from '../services/dropboxService';
import { mockDataService } from '../services/mockData';
import { useUI } from '../context/UIContext';

const StatCard: React.FC<{ title: string; value: string; icon: 'cash' | 'products' | 'reports' | 'finance'; iconClass: string; children?: React.ReactNode }> = ({ title, value, icon, iconClass, children }) => (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex flex-col h-full border border-slate-700">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
                <p className="text-3xl font-bold text-white mt-1">{value}</p>
            </div>
            <div className={`rounded-full p-3 ${iconClass}`}>
                <Icon name={icon} className="w-6 h-6 text-white" />
            </div>
        </div>
        {children && <div className="mt-4 pt-4 border-t border-slate-700/50 flex-grow">{children}</div>}
    </div>
);

const DashboardView: React.FC = () => {
    const { transactions: localTransactions, importTransactions } = useFinance(); // Add importTransactions
    const { products, inventorySettings, importStockAdjustments } = useProduct(); // Add importStockAdjustments
    const { showAlert } = useUI();

    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    // Updated state to hold stockLogs as well
    const [cloudData, setCloudData] = useState<{ transactions: any[], inventory: any[], stockLogs: any[] }>({ transactions: [], inventory: [], stockLogs: [] });
    const [isCloudLoading, setIsCloudLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('ALL');
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [aiError, setAiError] = useState('');
    const [aiQuestion, setAiQuestion] = useState('');

    // Load Dropbox Data Logic (Aggregation)
    const loadDropboxData = async () => {
        setIsCloudLoading(true);
        setIsDemoMode(false);

        // --- DEMO MODE TRIGGER IF NO CREDENTIALS ---
        if (!dropboxService.isConfigured()) {
             const mock = mockDataService.getMockDashboardData();
             setCloudData({ 
                 transactions: mock.transactions, 
                 inventory: mock.inventory,
                 stockLogs: mock.stockAdjustments 
             });
             setIsDemoMode(true);
             setLastUpdated(new Date());
             setIsCloudLoading(false);
             return;
        }

        try {
            const allBranchesData = await dropboxService.fetchAllBranchData();
            
            // Consolidate Data
            let allTxns: any[] = [];
            let allInv: any[] = [];
            let allLogs: any[] = [];

            allBranchesData.forEach(branch => {
                if (branch.transactionRecords) {
                    const txns = branch.transactionRecords.map((t: any) => ({ ...t, storeId: branch.storeId })); 
                    allTxns = [...allTxns, ...txns];
                }
                if (branch.currentStock) {
                    const inv = branch.currentStock.map((i: any) => ({ ...i, storeId: branch.storeId }));
                    allInv = [...allInv, ...inv];
                }
                if (branch.stockAdjustments) {
                    const logs = branch.stockAdjustments.map((s: any) => ({ ...s, storeId: branch.storeId }));
                    allLogs = [...allLogs, ...logs];
                }
            });

            setCloudData({ transactions: allTxns, inventory: allInv, stockLogs: allLogs });
            setLastUpdated(new Date());

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
                    </ul>
                    <p className="mt-2 text-yellow-300 bg-yellow-900/30 p-2 rounded border border-yellow-700">
                        Data akan digabungkan (Merge). Transaksi dengan ID yang sama tidak akan diduplikasi.
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
        else setIsDemoMode(false);
    };

    // Available Branches for Filter
    const availableBranches = useMemo(() => {
        if (dataSource === 'local') return [];
        const branches = new Set<string>();
        cloudData.transactions.forEach(t => {
            if (t.storeId) branches.add(t.storeId);
        });
        return Array.from(branches).sort();
    }, [cloudData, dataSource]);

    // Derived Data Calculation
    const dashboardData = useMemo(() => {
        let sourceTransactions = dataSource === 'local' ? localTransactions : cloudData.transactions.map(t => ({
            ...t,
            createdAt: t.created_at || t.createdAt, 
            storeId: t.storeId // Use consistent key
        }));

        // Apply Branch Filter
        if (dataSource !== 'local' && selectedBranch !== 'ALL') {
            sourceTransactions = sourceTransactions.filter((t: any) => t.storeId === selectedBranch);
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

        // Inventory Logic
        let lowStockProducts: any[] = [];
        if (dataSource === 'local') {
            lowStockProducts = inventorySettings.enabled
                ? products.filter(p => p.trackStock && (p.stock ?? 0) <= 5).sort((a,b) => (a.stock ?? 0) - (b.stock ?? 0))
                : [];
        } else {
            let sourceInventory = cloudData.inventory;
            if (selectedBranch !== 'ALL') {
                sourceInventory = sourceInventory.filter((i: any) => i.storeId === selectedBranch);
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
            transactionCount,
            lowStockProducts,
            outstandingReceivables,
            salesTrend: salesByDay,
            topProducts,
            branchPerformance,
            recentTransactions: sourceTransactions.slice(0, 5)
        };
    }, [dataSource, localTransactions, cloudData, products, inventorySettings, selectedBranch]);
    
    // AI Logic
    const getAIInsight = useCallback(async (question: string) => {
        setIsLoadingAI(true);
        setAiResponse('');
        setAiError('');

        try {
            if (!navigator.onLine) {
                throw new Error("Tidak ada koneksi internet. Fitur AI membutuhkan akses internet.");
            }

            const salesContext = dashboardData.salesTrend;
            const topProducts = dashboardData.topProducts;
            // Limit branch info to avoid huge payload
            const branchInfo = dataSource !== 'local' ? dashboardData.branchPerformance.slice(0, 10) : "Data cabang tidak tersedia (Mode Lokal)";
            
            const systemInstruction = `You are "Artea AI", a smart business consultant. 
            Analyze the provided sales summary data.
            Answer in Bahasa Indonesia. Concise, practical, markdown format.`;
            
            const userContent = `
            Context: ${dataSource} mode
            Selected Branch Filter: ${selectedBranch}
            Tren Penjualan 7 Hari: ${JSON.stringify(salesContext)}
            Produk Terlaris: ${JSON.stringify(topProducts)}
            Performa Cabang (Top 10): ${JSON.stringify(branchInfo)}
            
            Pertanyaan User: ${question}`;
            
            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }],
                    model: 'openai', 
                    seed: Math.floor(Math.random() * 1000), 
                    jsonMode: false
                }),
            });

            if (!response.ok) {
                throw new Error(`Server AI merespon dengan status: ${response.status}`);
            }
            
            const text = await response.text();
            setAiResponse(text);

        } catch (err: any) {
            console.error("AI Error:", err);
            let msg = "Maaf, layanan AI sedang sibuk. Coba lagi nanti.";
            
            // Handle Network Errors specifically
            if (err.message && (err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
                msg = "Gagal terhubung ke server AI. Periksa koneksi internet Anda atau coba matikan AdBlock/DNS Filter.";
            } else if (err.message) {
                msg = err.message;
            }
            
            setAiError(msg);
        } finally {
            setIsLoadingAI(false);
        }
    }, [dashboardData, dataSource, selectedBranch]);

    const handleAIPrompt = (prompt: string) => {
        setAiQuestion(prompt);
        getAIInsight(prompt);
    };

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

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Cloud Actions (Only in Cloud Mode) */}
                    {dataSource === 'dropbox' && (
                        <div className="flex items-center gap-2">
                            {lastUpdated && (
                                <span className="text-[10px] text-slate-400 hidden md:block">
                                    Update: {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                            <Button 
                                size="sm" 
                                onClick={loadDropboxData} 
                                disabled={isCloudLoading} 
                                className="bg-blue-600 hover:bg-blue-500 text-white border-none"
                                title="Tarik data terbaru dari cabang"
                            >
                                <Icon name="reset" className={`w-4 h-4 ${isCloudLoading ? 'animate-spin' : ''}`} />
                                {isCloudLoading ? 'Syncing...' : 'Refresh Data'}
                            </Button>
                            {/* Merge Button Added Here */}
                            <Button
                                size="sm"
                                onClick={handleMergeToLocal}
                                className="bg-green-600 hover:bg-green-500 text-white border-none"
                                title="Simpan data cloud ke lokal"
                            >
                                <Icon name="download" className="w-4 h-4" /> Simpan ke Lokal
                            </Button>
                        </div>
                    )}

                    {/* Branch Selector */}
                    {dataSource !== 'local' && availableBranches.length > 0 && (
                        <div className="bg-slate-800 p-1 rounded-lg border border-slate-700">
                            <select 
                                value={selectedBranch} 
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="bg-transparent text-sm text-white px-3 py-1.5 outline-none cursor-pointer"
                            >
                                <option value="ALL" className="bg-slate-800">Semua Cabang</option>
                                {availableBranches.map(b => (
                                    <option key={b} value={b} className="bg-slate-800">{b}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Data Source Toggle */}
                    <div className="bg-slate-800 p-1 rounded-lg flex items-center border border-slate-700">
                        <button
                            onClick={() => handleSourceChange('local')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${dataSource === 'local' ? 'bg-[#347758] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            <span className="flex items-center gap-2"><Icon name="database" className="w-4 h-4" /> Lokal</span>
                        </button>
                        <button
                            onClick={() => handleSourceChange('dropbox')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${dataSource === 'dropbox' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            <span className="flex items-center gap-2"><Icon name="share" className="w-4 h-4" /> Cloud (Dropbox)</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Banner for Cloud Mode */}
            {dataSource !== 'local' && (
                <div className={`p-3 rounded-lg flex items-center gap-3 text-sm animate-fade-in ${isDemoMode ? 'bg-yellow-900/30 border border-yellow-700 text-yellow-200' : 'bg-blue-900/30 border border-blue-800 text-blue-200'}`}>
                    <Icon name={isDemoMode ? "warning" : "info-circle"} className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold">{isDemoMode ? "Mode Demo (Data Dummy)" : "Mode Laporan Terpusat (Dropbox)"}</p>
                        <p className="opacity-80">
                            {isDemoMode 
                                ? "Dropbox belum dikonfigurasi. Menampilkan data simulasi agar Anda bisa melihat potensi fitur Multi-Cabang." 
                                : (selectedBranch === 'ALL' 
                                    ? 'Menampilkan data gabungan dari semua cabang. Tekan "Simpan ke Lokal" untuk mengarsipkan data ini secara permanen.' 
                                    : `Menampilkan data spesifik untuk cabang: ${selectedBranch}`)}
                        </p>
                    </div>
                </div>
            )}

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                <StatCard title="Penjualan Hari Ini" value={CURRENCY_FORMATTER.format(dashboardData.todaySales)} icon="cash" iconClass="bg-green-500" />
                <StatCard title="Transaksi Hari Ini" value={dashboardData.transactionCount.toString()} icon="reports" iconClass="bg-sky-500" />
                <StatCard title="Piutang (Semua)" value={CURRENCY_FORMATTER.format(dashboardData.outstandingReceivables)} icon="finance" iconClass="bg-yellow-500" />
                <StatCard title="Stok Menipis" value={dashboardData.lowStockProducts.length.toString()} icon="products" iconClass="bg-red-500">
                    {dashboardData.lowStockProducts.length > 0 && (
                        <div className="text-xs text-slate-400 space-y-1 overflow-y-auto max-h-20 pr-2 mt-2">
                            {dashboardData.lowStockProducts.map((p, i) => (
                                <p key={i} className="truncate flex justify-between">
                                    <span>{p.item_name || p.name}</span>
                                    <span className="text-red-300 font-bold">{p.stock}</span>
                                    {dataSource !== 'local' && <span className="text-[10px] bg-slate-700 px-1 rounded">{p.storeId}</span>}
                                </p>
                            ))}
                        </div>
                    )}
                </StatCard>
            </div>
            
            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                {/* Left Column: Charts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Branch Performance (Only in Cloud/Dropbox Mode + ALL branches selected) */}
                    {dataSource !== 'local' && selectedBranch === 'ALL' && dashboardData.branchPerformance.length > 0 && (
                        <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-700">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                                <Icon name="share" className="w-5 h-5 text-sky-400"/>
                                Performa Cabang (Total Penjualan)
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={dashboardData.branchPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                    <XAxis type="number" stroke="#9ca3af" fontSize={12} tickFormatter={(val) => `Rp${val/1000}k`} />
                                    <YAxis type="category" dataKey="name" stroke="#ffffff" fontSize={12} width={100} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color:'#fff' }} formatter={(val: number) => CURRENCY_FORMATTER.format(val)} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-700">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                            <Icon name="trending-up" className="w-5 h-5 text-green-400"/>
                            Tren Penjualan (7 Hari Terakhir)
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={dashboardData.salesTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Penjualan']} />
                                <Bar dataKey="Penjualan" fill="#347758" radius={[4, 4, 0, 0]} />
                                <Brush dataKey="name" height={20} stroke="#52a37c" fill="#1e293b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* AI Assistant */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-700">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                             <Icon name="chat" className="w-5 h-5 text-purple-400"/>
                             Artea AI - Analisis Bisnis
                        </h3>
                        <div className="space-y-3">
                             <div className="flex flex-wrap gap-2">
                                {["Analisis tren penjualan.", "Strategi meningkatkan omzet.", "Evaluasi performa cabang."].map(q => (
                                    <button key={q} onClick={() => handleAIPrompt(q)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-full transition-colors border border-slate-600 text-slate-300">{q}</button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAIPrompt(aiQuestion)} placeholder="Tanya saran bisnis..." className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-[#347758]" />
                                <Button onClick={() => handleAIPrompt(aiQuestion)} disabled={isLoadingAI || !aiQuestion}>
                                    {isLoadingAI ? <span className="animate-spin">↻</span> : <Icon name="chat" className="w-4 h-4" />}
                                </Button>
                            </div>
                            {aiError && (
                                <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-300 text-sm">
                                    <p className="font-bold flex items-center gap-2"><Icon name="warning" className="w-4 h-4"/> Error:</p>
                                    <p>{aiError}</p>
                                </div>
                            )}
                            {aiResponse && (
                                <div 
                                    className="prose prose-sm prose-invert max-w-none bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-slate-300 max-h-60 overflow-y-auto" 
                                    dangerouslySetInnerHTML={renderMarkdown(aiResponse)}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Lists */}
                <div className="space-y-6">
                    <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Produk Terlaris (Minggu Ini)</h3>
                        <div className="space-y-3">
                            {dashboardData.topProducts.map((p, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300 truncate pr-2">{p.name}</span>
                                    <span className="font-semibold text-white bg-slate-700 px-2 py-0.5 rounded">{p.quantity} terjual</span>
                                </div>
                            ))}
                            {dashboardData.topProducts.length === 0 && <p className="text-xs text-slate-500">Belum ada data penjualan.</p>}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Transaksi Terakhir</h3>
                        <div className="space-y-3">
                            {dashboardData.recentTransactions.map((t: any) => (
                                <div key={t.id} className="flex justify-between items-center text-sm border-b border-slate-700 pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <div className="font-medium text-white">{CURRENCY_FORMATTER.format(t.total)}</div>
                                        <div className="text-xs text-slate-400">
                                            {new Date(t.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} • {t.storeId || 'Local'}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 rounded-full ${t.paymentStatus === 'paid' || t.payment_status === 'paid' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                        {t.paymentStatus || t.payment_status}
                                    </span>
                                </div>
                            ))}
                            {dashboardData.recentTransactions.length === 0 && <p className="text-xs text-slate-500">Belum ada transaksi.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;


import React, { useState, useEffect, useRef } from 'react';
import CashFlowTab from '../components/finance/CashFlowTab';
import ExpensesTab from '../components/finance/ExpensesTab';
import IncomeTab from '../components/finance/IncomeTab';
import PurchasingTab from '../components/finance/PurchasingTab';
import DebtsTab from '../components/finance/DebtsTab';
import CustomersTab from '../components/finance/CustomersTab';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useFinance } from '../context/FinanceContext'; 
import { useSettings } from '../context/SettingsContext'; 
import { dropboxService } from '../services/dropboxService';
import { mockDataService } from '../services/mockData';
import { dataService } from '../services/dataService';
import { generateTablePDF } from '../utils/pdfGenerator';
import { CURRENCY_FORMATTER } from '../constants';
import type { Transaction, Expense, OtherIncome, Purchase } from '../types';

type FinanceTab = 'cashflow' | 'expenses' | 'income' | 'purchasing' | 'debts' | 'customers';

const FinanceView: React.FC = () => {
    const { currentUser } = useAuth();
    const { showAlert } = useUI();
    const { receiptSettings } = useSettings();
    
    // Local Data Hooks
    const { transactions: localTransactions, expenses: localExpenses, otherIncomes: localIncomes, purchases: localPurchases } = useFinance();

    const [activeTab, setActiveTab] = useState<FinanceTab>('cashflow');
    
    // Cloud State
    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    const [cloudData, setCloudData] = useState<{ 
        transactions: Transaction[], 
        expenses: Expense[], 
        otherIncomes: OtherIncome[],
        purchases: Purchase[] 
    }>({ transactions: [], expenses: [], otherIncomes: [], purchases: [] });
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Export State
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);

    // Permission Check
    const isStaff = currentUser?.role === 'staff';

    const tabs: { id: FinanceTab, label: string, icon: any }[] = [
        { id: 'cashflow', label: 'Arus Kas', icon: 'trending-up' },
        { id: 'expenses', label: 'Pengeluaran', icon: 'finance' },
        { id: 'income', label: 'Pemasukan Lain', icon: 'money' },
        { id: 'purchasing', label: 'Pembelian', icon: 'boxes' },
        { id: 'debts', label: 'Utang Piutang', icon: 'book' },
        { id: 'customers', label: 'Pelanggan', icon: 'users' },
    ];

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
                setIsExportDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load Cloud Data Logic
    const loadCloudData = async () => {
        setIsLoadingCloud(true);

        if (!dropboxService.isConfigured()) {
             // Fallback Demo Data
             const mock = mockDataService.getMockDashboardData();
             setCloudData({
                 transactions: mock.transactions,
                 expenses: mock.expenses,
                 otherIncomes: mock.otherIncomes,
                 purchases: [] 
             });
             setLastUpdated(new Date());
             setIsLoadingCloud(false);
             return;
        }

        try {
            const allBranches = await dropboxService.fetchAllBranchData();
            let txns: any[] = [];
            let exps: any[] = [];
            let incs: any[] = [];
            let purs: any[] = [];

            allBranches.forEach(branch => {
                if (branch.transactionRecords) txns.push(...branch.transactionRecords.map((t:any) => ({...t, storeId: branch.storeId})));
                if (branch.expenses) exps.push(...branch.expenses.map((e:any) => ({...e, storeId: branch.storeId})));
                if (branch.otherIncomes) incs.push(...branch.otherIncomes.map((i:any) => ({...i, storeId: branch.storeId})));
                // Purchase sync logic would go here if added to branch payload
            });
            
            setCloudData({ 
                transactions: txns, 
                expenses: exps, 
                otherIncomes: incs, 
                purchases: purs 
            });
            setLastUpdated(new Date());
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal Sync', message: e.message });
            setDataSource('local');
        } finally {
            setIsLoadingCloud(false);
        }
    };

    useEffect(() => {
        if (dataSource === 'dropbox') {
            loadCloudData();
        }
    }, [dataSource]);

    // --- EXPORT LOGIC ---
    const handleExport = (format: 'xlsx' | 'csv' | 'ods' | 'pdf') => {
        const timestamp = new Date().toISOString().slice(0, 10);
        let headers: string[] = [];
        let rows: (string | number)[][] = [];
        let fileName = `Laporan_${activeTab}_${timestamp}`;
        let title = '';

        // Determine Active Data
        const currentTransactions = dataSource === 'local' ? localTransactions : cloudData.transactions;
        const currentExpenses = dataSource === 'local' ? localExpenses : cloudData.expenses;
        const currentIncomes = dataSource === 'local' ? localIncomes : cloudData.otherIncomes;
        const currentPurchases = dataSource === 'local' ? localPurchases : cloudData.purchases;

        if (activeTab === 'expenses') {
            title = 'Laporan Pengeluaran';
            headers = ['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'Metode', 'Cabang'];
            rows = currentExpenses.map(e => [
                new Date(e.date).toLocaleDateString('id-ID'),
                e.category,
                e.description,
                e.amount,
                e.paymentMethod || 'cash',
                (e as any).storeId || 'LOKAL'
            ]);
        } else if (activeTab === 'income') {
            title = 'Laporan Pemasukan Lain';
            headers = ['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'Metode', 'Cabang'];
            rows = currentIncomes.map(i => [
                new Date(i.date).toLocaleDateString('id-ID'),
                i.category,
                i.description,
                i.amount,
                i.paymentMethod || 'cash',
                (i as any).storeId || 'LOKAL'
            ]);
        } else if (activeTab === 'purchasing') {
            title = 'Laporan Pembelian';
            headers = ['Tanggal', 'Supplier', 'Status', 'Total', 'Item', 'Cabang'];
            rows = currentPurchases.map(p => [
                new Date(p.date).toLocaleDateString('id-ID'),
                p.supplierName,
                p.status,
                p.totalAmount,
                (p.items || []).length + ' items',
                (p as any).storeId || 'LOKAL'
            ]);
        } else if (activeTab === 'debts') {
            title = 'Laporan Piutang (Belum Lunas)';
            headers = ['Tanggal', 'ID', 'Pelanggan', 'Total', 'Terbayar', 'Sisa', 'Cabang'];
            rows = currentTransactions
                .filter(t => t.paymentStatus !== 'paid' && t.paymentStatus !== 'refunded')
                .map(t => [
                    new Date(t.createdAt).toLocaleDateString('id-ID'),
                    t.id.slice(-6),
                    t.customerName || 'Umum',
                    t.total,
                    t.amountPaid,
                    t.total - t.amountPaid,
                    t.storeId || 'LOKAL'
                ]);
        } else if (activeTab === 'cashflow') {
             title = 'Laporan Arus Kas Gabungan';
             // Generate simplified flow for export
             headers = ['Tanggal', 'Tipe', 'Deskripsi', 'Masuk', 'Keluar', 'Cabang'];
             const flow = [
                 ...currentTransactions.filter(t => t.paymentStatus !== 'refunded').map(t => ({ date: t.createdAt, type: 'Penjualan', desc: `Trx #${t.id.slice(-4)}`, in: t.total, out: 0, store: t.storeId })),
                 ...currentIncomes.map(i => ({ date: i.date, type: 'Pemasukan', desc: i.description, in: i.amount, out: 0, store: (i as any).storeId })),
                 ...currentExpenses.map(e => ({ date: e.date, type: 'Pengeluaran', desc: e.description, in: 0, out: e.amount, store: (e as any).storeId })),
                 ...currentPurchases.map(p => ({ date: p.date, type: 'Pembelian', desc: p.supplierName, in: 0, out: p.totalAmount, store: (p as any).storeId }))
             ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
             
             rows = flow.map(f => [
                 new Date(f.date).toLocaleDateString('id-ID'), f.type, f.desc, f.in, f.out, f.store || 'LOKAL'
             ]);
        } else {
            showAlert({ type: 'alert', title: 'Info', message: 'Fitur export untuk tab ini belum tersedia atau gunakan menu Laporan.' });
            setIsExportDropdownOpen(false);
            return;
        }

        if (rows.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data untuk diexport pada tab ini.' });
            setIsExportDropdownOpen(false);
            return;
        }

        if (format === 'pdf') {
            const pdfRows = rows.map(row => row.map(cell => typeof cell === 'number' ? CURRENCY_FORMATTER.format(cell) : cell));
            generateTablePDF(title, headers, pdfRows, receiptSettings);
        } else {
            dataService.exportToSpreadsheet(headers, rows, fileName, format);
        }
        
        setIsExportDropdownOpen(false);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-white">Keuangan</h1>
                
                <div className="flex flex-wrap gap-2 items-center">
                    
                    {/* EXPORT DROPDOWN */}
                    <div className="relative" ref={exportDropdownRef}>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="bg-slate-800 border-slate-700 hover:bg-slate-700"
                        >
                            <Icon name="download" className="w-4 h-4" /> Export
                            <Icon name="chevron-down" className="w-3 h-3 ml-1" />
                        </Button>
                        
                        {isExportDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-40 bg-slate-800 rounded-lg shadow-xl border border-slate-600 z-50 overflow-hidden animate-fade-in">
                                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-slate-700 flex items-center gap-2">
                                    <Icon name="printer" className="w-3 h-3 text-red-400"/> PDF Document
                                </button>
                                <button onClick={() => handleExport('xlsx')} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-slate-700 flex items-center gap-2">
                                    <Icon name="boxes" className="w-3 h-3 text-green-400"/> Excel (.xlsx)
                                </button>
                                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-slate-700 flex items-center gap-2">
                                    <Icon name="tag" className="w-3 h-3 text-blue-400"/> CSV
                                </button>
                                <button onClick={() => handleExport('ods')} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-slate-700 flex items-center gap-2">
                                    <Icon name="file-lock" className="w-3 h-3 text-yellow-400"/> ODS (OpenDoc)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Cloud Toggle - Hidden for Staff */}
                    {!isStaff && (
                        <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700">
                            <button 
                                onClick={() => setDataSource('local')} 
                                className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${dataSource === 'local' ? 'bg-[#347758] text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Lokal
                            </button>
                            <button 
                                onClick={() => setDataSource('dropbox')} 
                                className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${dataSource === 'dropbox' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Cloud
                            </button>
                        </div>
                    )}
                    
                    {dataSource === 'dropbox' && (
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={loadCloudData} 
                            disabled={isLoadingCloud}
                            className="bg-slate-800 border-slate-700"
                        >
                            <Icon name="reset" className={`w-4 h-4 ${isLoadingCloud ? 'animate-spin' : ''}`}/>
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Tabs Navigation */}
            <div className="flex overflow-x-auto space-x-2 border-b border-slate-700 pb-2 hide-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                            activeTab === tab.id 
                                ? 'bg-[#347758] text-white font-medium' 
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                    >
                        <Icon name={tab.icon} className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content with Cloud Data Props */}
            <div className="flex-1 overflow-y-auto">
                {dataSource === 'dropbox' && (
                    <div className="bg-blue-900/20 border border-blue-800 p-2 rounded-lg mb-4 flex items-center gap-2 text-xs text-blue-200">
                        <Icon name="cloud" className="w-4 h-4" />
                        <span>Menampilkan data gabungan dari seluruh cabang (Cloud). {lastUpdated && `Update: ${lastUpdated.toLocaleTimeString()}`}</span>
                    </div>
                )}

                {activeTab === 'cashflow' && (
                    <CashFlowTab 
                        dataSource={dataSource} 
                        cloudData={dataSource === 'dropbox' ? cloudData : undefined} 
                    />
                )}
                {activeTab === 'expenses' && (
                    <ExpensesTab 
                        dataSource={dataSource} 
                        cloudData={dataSource === 'dropbox' ? cloudData.expenses : undefined} 
                    />
                )}
                {activeTab === 'income' && (
                    <IncomeTab 
                        dataSource={dataSource} 
                        cloudData={dataSource === 'dropbox' ? cloudData.otherIncomes : undefined} 
                    />
                )}
                {activeTab === 'purchasing' && (
                    <PurchasingTab 
                        dataSource={dataSource} 
                        cloudData={dataSource === 'dropbox' ? cloudData.purchases : undefined} 
                    />
                )}
                {activeTab === 'debts' && (
                    <DebtsTab 
                        dataSource={dataSource} 
                        cloudData={dataSource === 'dropbox' ? cloudData.transactions : undefined} 
                    />
                )}
                {activeTab === 'customers' && <CustomersTab />}
            </div>
        </div>
    );
};

export default FinanceView;

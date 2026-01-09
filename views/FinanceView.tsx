
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { dropboxService } from '../services/dropboxService';
import { mockDataService } from '../services/mockData';
import { useUI } from '../context/UIContext';
import { generateTablePDF } from '../utils/pdfGenerator';
import { CURRENCY_FORMATTER } from '../constants';

// Modular Imports
import CashFlowTab from '../components/finance/CashFlowTab';
import ExpensesTab from '../components/finance/ExpensesTab';
import IncomeTab from '../components/finance/IncomeTab';
import PurchasingTab from '../components/finance/PurchasingTab';
import DebtsTab from '../components/finance/DebtsTab';
import CustomersTab from '../components/finance/CustomersTab';

import type { Expense, OtherIncome, Transaction as TransactionType, Purchase } from '../types';

const FinanceView: React.FC = () => {
    const { currentUser } = useAuth();
    const { receiptSettings } = useSettings();
    const { transactions: localTransactions, expenses: localExpenses, purchases: localPurchases, otherIncomes: localIncomes, suppliers } = useFinance();
    const { showAlert } = useUI();
    const isManagement = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    
    // Tab State
    const [mainView, setMainView] = useState<'finance' | 'customers'>('finance');
    const [activeTab, setActiveTab] = useState<string>(isManagement ? 'cashflow' : 'expenses');

    // Cloud Aggregation State
    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    const [cloudData, setCloudData] = useState<{ 
        transactions: TransactionType[], 
        expenses: Expense[], 
        otherIncomes: OtherIncome[],
        purchases: Purchase[]
    }>({ transactions: [], expenses: [], otherIncomes: [], purchases: [] });
    const [isCloudLoading, setIsCloudLoading] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Refactored Load Data to be callable via Refresh Button
    const loadCloudData = useCallback(async () => {
        setIsCloudLoading(true);
        setIsDemoMode(false);

        // 1. Pre-check credentials
        const dbxToken = localStorage.getItem('ARTEA_DBX_REFRESH_TOKEN');
        if (!dbxToken) {
            const mock = mockDataService.getMockDashboardData();
            setCloudData({
                transactions: mock.transactions,
                expenses: mock.expenses,
                otherIncomes: mock.otherIncomes,
                purchases: []
            });
            setIsDemoMode(true);
            setLastUpdated(new Date());
            setIsCloudLoading(false);
            return;
        }

        try {
            // Dropbox Logic
            const allBranches = await dropboxService.fetchAllBranchData();
            let txns: any[] = [], exps: any[] = [], incs: any[] = []; 

            allBranches.forEach(branch => {
                // STANDARDIZED: Ensure we use 'storeId' (camelCase)
                if (branch.transactionRecords) txns.push(...branch.transactionRecords.map((t:any) => ({...t, storeId: branch.storeId})));
                if (branch.expenses) exps.push(...branch.expenses.map((e:any) => ({...e, storeId: branch.storeId})));
                if (branch.otherIncomes) incs.push(...branch.otherIncomes.map((i:any) => ({...i, storeId: branch.storeId})));
            });

            setCloudData({
                transactions: txns,
                expenses: exps,
                otherIncomes: incs,
                purchases: [] // Placeholder until dropbox service syncs purchases
            });
            setLastUpdated(new Date());
        } catch (error: any) {
            console.error("Finance Load Error:", error);
            showAlert({ type: 'alert', title: 'Gagal Memuat Data', message: error.message });
            setDataSource('local');
        } finally {
            setIsCloudLoading(false);
        }
    }, [showAlert]);

    // Effect to trigger load when switching to dropbox
    useEffect(() => {
        if (dataSource === 'dropbox') {
            loadCloudData();
        }
    }, [dataSource, loadCloudData]);

    const renderSubTabButton = (tab: string, label: string) => (
        <button onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === tab ? 'text-[#52a37c] border-[#52a37c]' : 'text-slate-400 border-transparent hover:text-white'}`}>
            {label}
        </button>
    );

    // --- DATA PREPARATION FOR EXPORT ---
    const getDataForExport = () => {
        const source = dataSource === 'local' ? {
            tx: localTransactions,
            exp: localExpenses,
            inc: localIncomes,
            purch: localPurchases
        } : {
            tx: cloudData.transactions,
            exp: cloudData.expenses,
            inc: cloudData.otherIncomes,
            purch: cloudData.purchases
        };

        return source;
    }

    const handleExportPDF = () => {
        const { tx, exp, inc, purch } = getDataForExport();
        const mode = mainView === 'finance' ? activeTab : 'customers';

        if (mode === 'cashflow') {
            // Aggregate Logic (Simplified from CashFlowTab)
            const flows = [
                ...tx.filter(t => t.paymentStatus !== 'refunded').map(t => ({ date: t.createdAt, desc: `Penjualan #${t.id.slice(-4)}`, amount: t.total, type: 'Masuk' })),
                ...inc.map(i => ({ date: i.date, desc: i.description, amount: i.amount, type: 'Masuk' })),
                ...exp.map(e => ({ date: e.date, desc: e.description, amount: -e.amount, type: 'Keluar' })),
                ...purch.map(p => ({ date: p.date, desc: `Beli: ${p.supplierName}`, amount: -p.totalAmount, type: 'Keluar' }))
            ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const headers = ['Tanggal', 'Tipe', 'Keterangan', 'Jumlah'];
            const rows = flows.map(f => [
                new Date(f.date).toLocaleDateString('id-ID'),
                f.type,
                f.desc,
                CURRENCY_FORMATTER.format(Math.abs(f.amount))
            ]);
            generateTablePDF('Laporan Arus Kas', headers, rows, receiptSettings);
        } 
        else if (mode === 'expenses') {
            const headers = ['Tanggal', 'Keterangan', 'Kategori', 'Jumlah'];
            const rows = exp.map(e => [
                new Date(e.date).toLocaleDateString('id-ID'),
                e.description,
                e.category,
                CURRENCY_FORMATTER.format(e.amount)
            ]);
            generateTablePDF('Laporan Pengeluaran', headers, rows, receiptSettings);
        }
        else if (mode === 'other_income') {
            const headers = ['Tanggal', 'Keterangan', 'Kategori', 'Jumlah'];
            const rows = inc.map(i => [
                new Date(i.date).toLocaleDateString('id-ID'),
                i.description,
                i.category,
                CURRENCY_FORMATTER.format(i.amount)
            ]);
            generateTablePDF('Laporan Pemasukan Lain', headers, rows, receiptSettings);
        }
        else if (mode === 'purchasing') {
            const headers = ['Tanggal', 'Supplier', 'Status', 'Total'];
            const rows = purch.map(p => [
                new Date(p.date).toLocaleDateString('id-ID'),
                p.supplierName,
                p.status.toUpperCase(),
                CURRENCY_FORMATTER.format(p.totalAmount)
            ]);
            generateTablePDF('Riwayat Pembelian', headers, rows, receiptSettings);
        }
        else if (mode === 'debt-receivables') {
            const unpaid = tx.filter(t => t.paymentStatus === 'unpaid' || t.paymentStatus === 'partial');
            const headers = ['Tanggal', 'Pelanggan', 'Total Tagihan', 'Sisa Utang'];
            const rows = unpaid.map(t => [
                new Date(t.createdAt).toLocaleDateString('id-ID'),
                t.customerName || 'Umum',
                CURRENCY_FORMATTER.format(t.total),
                CURRENCY_FORMATTER.format(t.total - t.amountPaid)
            ]);
            generateTablePDF('Laporan Piutang', headers, rows, receiptSettings);
        }
    };

    const handleExportCSV = () => {
        const { tx, exp, inc, purch } = getDataForExport();
        const mode = mainView === 'finance' ? activeTab : 'customers';
        let csvContent = '';
        let fileName = '';

        const download = (content: string, fname: string) => {
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fname;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        if (mode === 'cashflow') {
            // Aggregate
            const flows = [
                ...tx.filter(t => t.paymentStatus !== 'refunded').map(t => ({ date: t.createdAt, desc: `Penjualan #${t.id.slice(-4)}`, amount: t.total, type: 'Penjualan' })),
                ...inc.map(i => ({ date: i.date, desc: i.description, amount: i.amount, type: 'Pemasukan Lain' })),
                ...exp.map(e => ({ date: e.date, desc: e.description, amount: -e.amount, type: 'Pengeluaran' })),
                ...purch.map(p => ({ date: p.date, desc: `Pembelian dari ${p.supplierName}`, amount: -p.totalAmount, type: 'Pembelian' }))
            ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            csvContent = 'Tanggal,Tipe,Keterangan,Jumlah\n' + flows.map(f => 
                `${new Date(f.date).toLocaleDateString('id-ID')},${f.type},"${f.desc}",${f.amount}`
            ).join('\n');
            fileName = 'arus_kas.csv';
        }
        else if (mode === 'expenses') {
            csvContent = 'Tanggal,Keterangan,Kategori,Jumlah\n' + exp.map(e => 
                `${new Date(e.date).toLocaleDateString('id-ID')},"${e.description}",${e.category},${e.amount}`
            ).join('\n');
            fileName = 'pengeluaran.csv';
        }
        else if (mode === 'other_income') {
            csvContent = 'Tanggal,Keterangan,Kategori,Jumlah\n' + inc.map(i => 
                `${new Date(i.date).toLocaleDateString('id-ID')},"${i.description}",${i.category},${i.amount}`
            ).join('\n');
            fileName = 'pemasukan_lain.csv';
        }
        else if (mode === 'purchasing') {
            csvContent = 'Tanggal,Supplier,Status,Total\n' + purch.map(p => 
                `${new Date(p.date).toLocaleDateString('id-ID')},"${p.supplierName}",${p.status},${p.totalAmount}`
            ).join('\n');
            fileName = 'pembelian.csv';
        }
        else if (mode === 'debt-receivables') {
            const unpaid = tx.filter(t => t.paymentStatus === 'unpaid' || t.paymentStatus === 'partial');
            csvContent = 'Tanggal,Pelanggan,Total_Tagihan,Sisa_Utang\n' + unpaid.map(t => 
                `${new Date(t.createdAt).toLocaleDateString('id-ID')},"${t.customerName || 'Umum'}",${t.total},${t.total - t.amountPaid}`
            ).join('\n');
            fileName = 'piutang.csv';
        }

        if (csvContent) download(csvContent, fileName);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    Keuangan & Pelanggan
                    {dataSource !== 'local' && (
                        <span className="text-xs px-2 py-1 rounded font-normal text-white bg-blue-600">
                            Mode Dropbox
                        </span>
                    )}
                </h1>
                
                <div className="flex gap-2 items-center flex-wrap">
                    {/* Cloud Refresh Button (Only visible in Cloud Mode) */}
                    {dataSource === 'dropbox' && (
                        <div className="flex items-center gap-2 mr-2">
                            {lastUpdated && (
                                <span className="text-[10px] text-slate-400 hidden sm:block">
                                    {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                            <Button 
                                size="sm" 
                                onClick={loadCloudData} 
                                disabled={isCloudLoading} 
                                className="bg-blue-600 hover:bg-blue-500 text-white border-none"
                                title="Tarik data terbaru"
                            >
                                <Icon name="reset" className={`w-4 h-4 ${isCloudLoading ? 'animate-spin' : ''}`} />
                                {isCloudLoading ? '' : 'Refresh'}
                            </Button>
                        </div>
                    )}

                    {/* Export Buttons */}
                    {mainView === 'finance' && (
                        <div className="flex gap-2 mr-2">
                            <Button variant="secondary" size="sm" onClick={handleExportPDF} title="Export PDF Tabel Aktif">
                                <Icon name="printer" className="w-4 h-4"/> PDF
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleExportCSV} title="Export CSV Tabel Aktif">
                                <Icon name="download" className="w-4 h-4"/> CSV
                            </Button>
                        </div>
                    )}

                    {/* Data Source Toggle */}
                    <div className="bg-slate-700 p-1 rounded-lg flex items-center border border-slate-600">
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
                    </div>

                    <div className="bg-slate-700 p-1 rounded-lg flex">
                        <button onClick={() => setMainView('finance')} className={`px-4 py-2 text-sm rounded-md transition-colors ${mainView === 'finance' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Keuangan</button>
                        <button onClick={() => setMainView('customers')} className={`px-4 py-2 text-sm rounded-md transition-colors ${mainView === 'customers' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Pelanggan</button>
                    </div>
                </div>
            </div>

            {/* Info Banner for Demo Mode */}
            {isDemoMode && dataSource === 'dropbox' && (
                <div className="mb-4 bg-yellow-900/30 border border-yellow-700 p-3 rounded-lg flex items-center gap-3 text-yellow-200 text-sm animate-fade-in">
                    <Icon name="warning" className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold">Mode Demo (Simulasi)</p>
                        <p className="opacity-80">
                            Dropbox belum diatur. Data di bawah ini adalah data palsu untuk menunjukkan tampilan laporan terpusat dari beberapa cabang.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {isCloudLoading ? (
                    <div className="w-full h-64 flex items-center justify-center text-slate-400 animate-pulse">
                        Sedang mengambil data keuangan gabungan...
                    </div>
                ) : mainView === 'finance' ? (
                    <div className="space-y-6">
                        <div className="border-b border-slate-700 flex flex-nowrap overflow-x-auto -mb-px">
                            {isManagement && renderSubTabButton('cashflow', 'Arus Kas')}
                            {renderSubTabButton('other_income', 'Pemasukan Lain')}
                            {renderSubTabButton('expenses', 'Pengeluaran')}
                            {renderSubTabButton('purchasing', 'Pembelian & Pemasok')}
                            {renderSubTabButton('debt-receivables', 'Utang & Piutang')}
                        </div>
                        
                        {/* Pass dataSource and cloudData to children via props or modify children to accept them */}
                        {isManagement && activeTab === 'cashflow' && <CashFlowTab dataSource={dataSource} cloudData={cloudData} />}
                        {activeTab === 'expenses' && <ExpensesTab dataSource={dataSource} cloudData={cloudData.expenses} />}
                        {activeTab === 'other_income' && <IncomeTab dataSource={dataSource} cloudData={cloudData.otherIncomes} />}
                        {activeTab === 'purchasing' && <PurchasingTab dataSource={dataSource} cloudData={cloudData.purchases} />}
                        {activeTab === 'debt-receivables' && <DebtsTab dataSource={dataSource} cloudData={cloudData.transactions} />}
                        
                    </div>
                ) : (
                    // Load Modul Pelanggan di sini (Customer usually synced via Master Data, so local DB is fine, but can be extended)
                    <CustomersTab />
                )}
            </div>
        </div>
    );
};

export default FinanceView;

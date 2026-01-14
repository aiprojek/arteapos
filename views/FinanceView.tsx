
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { useCustomer } from '../context/CustomerContext'; 
import Button from '../components/Button';
import Icon from '../components/Icon';
import { dropboxService } from '../services/dropboxService';
import { mockDataService } from '../services/mockData';
import { useUI } from '../context/UIContext';
import { generateTablePDF } from '../utils/pdfGenerator';
import { dataService } from '../services/dataService';
import { CURRENCY_FORMATTER } from '../constants';
import { db } from '../services/db'; // Import Direct DB Access

// Modular Imports
import CashFlowTab from '../components/finance/CashFlowTab';
import ExpensesTab from '../components/finance/ExpensesTab';
import IncomeTab from '../components/finance/IncomeTab';
import PurchasingTab from '../components/finance/PurchasingTab';
import DebtsTab from '../components/finance/DebtsTab';
import CustomersTab from '../components/finance/CustomersTab';

import type { Expense, OtherIncome, Transaction as TransactionType, Purchase, Customer } from '../types';

const FinanceView: React.FC = () => {
    const { currentUser } = useAuth();
    const { receiptSettings } = useSettings();
    const { importFinanceData } = useFinance();
    const { customers: localCustomers } = useCustomer();
    const { showAlert } = useUI();
    const isManagement = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    
    // Tab State
    const [mainView, setMainView] = useState<'finance' | 'customers'>('finance');
    const [activeTab, setActiveTab] = useState<string>(isManagement ? 'cashflow' : 'expenses');

    // --- LAZY LOADING STATE ---
    const [localTransactions, setLocalTransactions] = useState<TransactionType[]>([]);
    const [localExpenses, setLocalExpenses] = useState<Expense[]>([]);
    const [localPurchases, setLocalPurchases] = useState<Purchase[]>([]);
    const [localIncomes, setLocalIncomes] = useState<OtherIncome[]>([]);
    const [isLocalLoading, setIsLocalLoading] = useState(true);

    // Cloud Aggregation State
    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    const [cloudData, setCloudData] = useState<{ 
        transactions: TransactionType[], 
        expenses: Expense[], 
        otherIncomes: OtherIncome[],
        purchases: Purchase[],
        customers: Customer[]
    }>({ transactions: [], expenses: [], otherIncomes: [], purchases: [], customers: [] });
    
    const [isCloudLoading, setIsCloudLoading] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Dropdown State
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);

    // --- EFFECT: LOAD LOCAL DATA FROM DEXIE ---
    useEffect(() => {
        if (dataSource === 'local') {
            setIsLocalLoading(true);
            const fetchData = async () => {
                try {
                    const [txs, exps, purs, incs] = await Promise.all([
                        db.transactionRecords.toArray(),
                        db.expenses.toArray(),
                        db.purchases.toArray(),
                        db.otherIncomes.toArray()
                    ]);
                    // Sort descending date
                    setLocalTransactions(txs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                    setLocalExpenses(exps.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setLocalPurchases(purs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setLocalIncomes(incs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                } catch (err) {
                    console.error("Failed to load local finance data", err);
                } finally {
                    setIsLocalLoading(false);
                }
            };
            fetchData();
        }
    }, [dataSource]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
                setIsExportDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const loadCloudData = useCallback(async () => {
        setIsCloudLoading(true);
        setIsDemoMode(false);

        if (!dropboxService.isConfigured()) {
            const mock = mockDataService.getMockDashboardData();
            setCloudData({
                transactions: mock.transactions,
                expenses: mock.expenses,
                otherIncomes: mock.otherIncomes,
                purchases: [],
                customers: []
            });
            setIsDemoMode(true);
            setLastUpdated(new Date());
            setIsCloudLoading(false);
            return;
        }

        try {
            const allBranches = await dropboxService.fetchAllBranchData();
            let txns: any[] = [], exps: any[] = [], incs: any[] = [], custs: any[] = [];

            allBranches.forEach(branch => {
                if (branch.transactionRecords) txns.push(...branch.transactionRecords.map((t:any) => ({...t, storeId: branch.storeId})));
                if (branch.expenses) exps.push(...branch.expenses.map((e:any) => ({...e, storeId: branch.storeId})));
                if (branch.otherIncomes) incs.push(...branch.otherIncomes.map((i:any) => ({...i, storeId: branch.storeId})));
                if (branch.customers) custs.push(...branch.customers.map((c:any) => ({...c, storeId: branch.storeId})));
            });

            setCloudData({
                transactions: txns,
                expenses: exps,
                otherIncomes: incs,
                purchases: [],
                customers: custs
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

    useEffect(() => {
        if (dataSource === 'dropbox') {
            loadCloudData();
        }
    }, [dataSource, loadCloudData]);

    const handleMergeToLocal = () => {
        if (cloudData.expenses.length === 0 && cloudData.otherIncomes.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data keuangan cloud untuk disimpan.' });
            return;
        }

        showAlert({
            type: 'confirm',
            title: 'Simpan Permanen?',
            message: (
                <div className="text-left text-sm">
                    <p>Gabungkan data keuangan berikut ke database lokal perangkat ini?</p>
                    <ul className="list-disc pl-5 mt-2 text-slate-300">
                        <li>{cloudData.expenses.length} Pengeluaran</li>
                        <li>{cloudData.otherIncomes.length} Pemasukan Lain</li>
                    </ul>
                    <p className="mt-2 text-yellow-300 bg-yellow-900/30 p-2 rounded border border-yellow-700">
                        Pastikan data valid. Duplikasi akan dicegah berdasarkan ID.
                    </p>
                </div>
            ),
            confirmText: 'Ya, Simpan',
            onConfirm: () => {
                importFinanceData(cloudData.expenses, cloudData.otherIncomes, cloudData.purchases);
                showAlert({ type: 'alert', title: 'Berhasil', message: 'Data keuangan berhasil digabungkan.' });
                setDataSource('local'); 
            }
        });
    };

    const renderSubTabButton = (tab: string, label: string) => (
        <button onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === tab ? 'text-[#52a37c] border-[#52a37c]' : 'text-slate-400 border-transparent hover:text-white'}`}>
            {label}
        </button>
    );

    const prepareTableData = () => {
        const source = dataSource === 'local' ? {
            tx: localTransactions,
            exp: localExpenses,
            inc: localIncomes,
            purch: localPurchases,
            cust: localCustomers
        } : {
            tx: cloudData.transactions,
            exp: cloudData.expenses,
            inc: cloudData.otherIncomes,
            purch: cloudData.purchases,
            cust: cloudData.customers
        };

        const sortByBranchAndDate = (a: any, b: any) => {
            if (dataSource !== 'local') {
                const storeA = a.storeId || a.store_id || '';
                const storeB = b.storeId || b.store_id || '';
                if (storeA !== storeB) return storeA.localeCompare(storeB);
            }
            const dateA = new Date(a.date || a.createdAt || a.created_at || 0).getTime();
            const dateB = new Date(b.date || b.createdAt || b.created_at || 0).getTime();
            return dateB - dateA;
        };

        const mode = mainView === 'finance' ? activeTab : 'customers';
        const isCloud = dataSource !== 'local';
        let headers: string[] = [];
        let rows: any[][] = [];
        let fileNameBase = '';

        if (mode === 'cashflow') {
            const flows = [
                ...source.tx.filter(t => t.paymentStatus !== 'refunded').map(t => ({ date: t.createdAt, desc: `Penjualan #${t.id.slice(-4)}`, amount: t.total, type: 'Penjualan', storeId: t.storeId })),
                ...source.inc.map(i => ({ date: i.date, desc: i.description, amount: i.amount, type: 'Pemasukan Lain', storeId: (i as any).storeId })),
                ...source.exp.map(e => ({ date: e.date, desc: e.description, amount: -e.amount, type: 'Pengeluaran', storeId: (e as any).storeId })),
                ...source.purch.map(p => ({ date: p.date, desc: `Pembelian dari ${p.supplierName}`, amount: -p.totalAmount, type: 'Pembelian', storeId: (p as any).storeId }))
            ].sort((a,b) => {
                if(isCloud && (a.storeId !== b.storeId)) return (a.storeId || '').localeCompare(b.storeId || '');
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });

            headers = isCloud ? ['Tanggal', 'Cabang', 'Tipe', 'Keterangan', 'Jumlah'] : ['Tanggal', 'Tipe', 'Keterangan', 'Jumlah'];
            rows = flows.map(f => {
                const date = new Date(f.date).toLocaleDateString('id-ID');
                const amt = f.amount;
                return isCloud ? [date, f.storeId || '-', f.type, f.desc, amt] : [date, f.type, f.desc, amt];
            });
            fileNameBase = 'Laporan_Arus_Kas';
        }
        // ... (Other export logic remains same) ...
        else if (mode === 'expenses') {
            const exp = [...source.exp].sort(sortByBranchAndDate);
            headers = isCloud ? ['Tanggal', 'Cabang', 'Keterangan', 'Kategori', 'Jumlah'] : ['Tanggal', 'Keterangan', 'Kategori', 'Jumlah'];
            rows = exp.map(e => {
                const date = new Date(e.date).toLocaleDateString('id-ID');
                return isCloud ? [date, (e as any).storeId, e.description, e.category, e.amount] : [date, e.description, e.category, e.amount];
            });
            fileNameBase = 'Laporan_Pengeluaran';
        }
        else if (mode === 'other_income') {
            const inc = [...source.inc].sort(sortByBranchAndDate);
            headers = isCloud ? ['Tanggal', 'Cabang', 'Keterangan', 'Kategori', 'Jumlah'] : ['Tanggal', 'Keterangan', 'Kategori', 'Jumlah'];
            rows = inc.map(i => {
                const date = new Date(i.date).toLocaleDateString('id-ID');
                return isCloud ? [date, (i as any).storeId, i.description, i.category, i.amount] : [date, i.description, i.category, i.amount];
            });
            fileNameBase = 'Laporan_Pemasukan_Lain';
        }
        else if (mode === 'purchasing') {
            const purch = [...source.purch].sort(sortByBranchAndDate);
            headers = isCloud ? ['Tanggal', 'Cabang', 'Supplier', 'Status', 'Total'] : ['Tanggal', 'Supplier', 'Status', 'Total'];
            rows = purch.map(p => {
                const date = new Date(p.date).toLocaleDateString('id-ID');
                return isCloud ? [date, (p as any).storeId, p.supplierName, p.status, p.totalAmount] : [date, p.supplierName, p.status, p.totalAmount];
            });
            fileNameBase = 'Riwayat_Pembelian';
        }
        else if (mode === 'debt-receivables') {
            const unpaid = source.tx.filter(t => t.paymentStatus === 'unpaid' || t.paymentStatus === 'partial').sort(sortByBranchAndDate);
            headers = isCloud ? ['Tanggal', 'Cabang', 'Pelanggan', 'Total Tagihan', 'Sisa Utang'] : ['Tanggal', 'Pelanggan', 'Total Tagihan', 'Sisa Utang'];
            rows = unpaid.map(t => {
                const date = new Date(t.createdAt).toLocaleDateString('id-ID');
                return isCloud ? [date, t.storeId || '-', t.customerName || 'Umum', t.total, t.total - t.amountPaid] : [date, t.customerName || 'Umum', t.total, t.total - t.amountPaid];
            });
            fileNameBase = 'Laporan_Piutang';
        }
        else if (mode === 'customers') {
            const cust = [...source.cust].sort((a,b) => (a.name || '').localeCompare(b.name || ''));
            headers = isCloud ? ['Bergabung', 'Cabang', 'ID Member', 'Nama', 'Poin'] : ['Bergabung', 'ID Member', 'Nama', 'Poin'];
            rows = cust.map(c => {
                const date = new Date(c.createdAt).toLocaleDateString('id-ID');
                return isCloud ? [date, (c as any).storeId, c.memberId, c.name, c.points] : [date, c.memberId, c.name, c.points];
            });
            fileNameBase = 'Data_Pelanggan';
        }

        return { headers, rows, fileNameBase };
    };

    const handleExportPDF = () => {
        const { headers, rows, fileNameBase } = prepareTableData();
        const pdfRows = rows.map(row => row.map(cell => typeof cell === 'number' ? CURRENCY_FORMATTER.format(cell) : cell));
        generateTablePDF(fileNameBase.replace(/_/g, ' '), headers, pdfRows, receiptSettings);
        setIsExportDropdownOpen(false);
    };

    const handleExportSpreadsheet = (format: 'xlsx' | 'ods' | 'csv') => {
        const { headers, rows, fileNameBase } = prepareTableData();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        dataService.exportToSpreadsheet(headers, rows, `${fileNameBase}_${timestamp}`, format);
        setIsExportDropdownOpen(false);
    };

    // Override local data in the components if necessary (Passing as props)
    // NOTE: Child components (ExpensesTab, etc) use `useFinance()` which relies on `DataContext`.
    // Since we cleared `DataContext`, we must pass the data explicitly via props.
    // The components need to be updated to accept `localData` override if `dataSource === 'local'`.
    // *Correction*: The components already accept `cloudData` prop. 
    // We will abuse the `cloudData` prop to pass `localData` when source is local, effectively bypassing Context.
    
    const displayData = {
        transactions: dataSource === 'local' ? localTransactions : cloudData.transactions,
        expenses: dataSource === 'local' ? localExpenses : cloudData.expenses,
        purchases: dataSource === 'local' ? localPurchases : cloudData.purchases,
        otherIncomes: dataSource === 'local' ? localIncomes : cloudData.otherIncomes,
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        Keuangan & Pelanggan
                        {dataSource !== 'local' && (
                            <span className="text-xs px-2 py-1 rounded font-normal text-white bg-blue-600 border border-blue-500 shadow-sm">
                                Mode Dropbox
                            </span>
                        )}
                    </h1>
                    {dataSource === 'dropbox' && lastUpdated && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Icon name="clock-history" className="w-3 h-3" />
                            Data per: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap w-full lg:w-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                        {dataSource === 'dropbox' && (
                            <>
                                <Button 
                                    size="sm" 
                                    onClick={loadCloudData} 
                                    disabled={isCloudLoading} 
                                    className="bg-blue-600 hover:bg-blue-500 text-white border-none whitespace-nowrap"
                                >
                                    <Icon name="reset" className={`w-4 h-4 ${isCloudLoading ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">Refresh</span>
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleMergeToLocal}
                                    className="bg-green-600 hover:bg-green-500 text-white border-none whitespace-nowrap"
                                >
                                    <Icon name="download" className="w-4 h-4" /> 
                                    <span className="hidden sm:inline">Simpan</span>
                                </Button>
                            </>
                        )}

                        <div className="relative" ref={exportDropdownRef}>
                            <Button variant="secondary" size="sm" onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)} title="Export Data">
                                <Icon name="download" className="w-4 h-4"/>
                                <span className="hidden sm:inline ml-1">Export</span>
                                <Icon name="chevron-down" className="w-3 h-3 ml-1"/>
                            </Button>
                            {isExportDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-700 rounded-lg shadow-xl z-20 overflow-hidden border border-slate-600">
                                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 hover:bg-slate-600 text-white text-sm flex items-center gap-2">
                                        <Icon name="printer" className="w-4 h-4"/> PDF (Cetak)
                                    </button>
                                    <button onClick={() => handleExportSpreadsheet('xlsx')} className="w-full text-left px-4 py-3 hover:bg-slate-600 text-white text-sm flex items-center gap-2 border-t border-slate-600">
                                        <Icon name="boxes" className="w-4 h-4"/> Excel (.xlsx)
                                    </button>
                                    <button onClick={() => handleExportSpreadsheet('csv')} className="w-full text-left px-4 py-3 hover:bg-slate-600 text-white text-sm flex items-center gap-2 border-t border-slate-600">
                                        <Icon name="database" className="w-4 h-4"/> CSV (Raw)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden sm:block h-6 w-px bg-slate-700 mx-1"></div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="bg-slate-700 p-1 rounded-lg flex items-center border border-slate-600">
                            <button onClick={() => setDataSource('local')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dataSource === 'local' ? 'bg-[#347758] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Lokal</button>
                            <button onClick={() => setDataSource('dropbox')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dataSource === 'dropbox' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Cloud</button>
                        </div>

                        <div className="bg-slate-700 p-1 rounded-lg flex border border-slate-600">
                            <button onClick={() => setMainView('finance')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mainView === 'finance' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Keuangan</button>
                            <button onClick={() => setMainView('customers')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mainView === 'customers' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Pelanggan</button>
                        </div>
                    </div>
                </div>
            </div>

            {isDemoMode && dataSource === 'dropbox' && (
                <div className="mb-4 bg-yellow-900/30 border border-yellow-700 p-3 rounded-lg flex items-center gap-3 text-yellow-200 text-sm animate-fade-in">
                    <Icon name="warning" className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold">Mode Demo (Simulasi)</p>
                        <p className="opacity-80">Dropbox belum diatur. Data simulasi.</p>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {isCloudLoading || (dataSource === 'local' && isLocalLoading) ? (
                    <div className="w-full h-64 flex items-center justify-center text-slate-400 animate-pulse">
                        Memuat data keuangan...
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
                        
                        {/* 
                            CRITICAL: Passing 'cloudData' prop even for Local mode 
                            to override empty context data. 
                            The components should prioritize 'cloudData' if provided.
                        */}
                        {isManagement && activeTab === 'cashflow' && <CashFlowTab dataSource={dataSource} cloudData={displayData} />}
                        {activeTab === 'expenses' && <ExpensesTab dataSource={dataSource} cloudData={displayData.expenses} />}
                        {activeTab === 'other_income' && <IncomeTab dataSource={dataSource} cloudData={displayData.otherIncomes} />}
                        {activeTab === 'purchasing' && <PurchasingTab dataSource={dataSource} cloudData={displayData.purchases} />}
                        {activeTab === 'debt-receivables' && <DebtsTab dataSource={dataSource} cloudData={displayData.transactions} />}
                        
                    </div>
                ) : (
                    <CustomersTab />
                )}
            </div>
        </div>
    );
};

export default FinanceView;

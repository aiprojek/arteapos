
import React, { useState, useEffect } from 'react';
import CashFlowTab from '../components/finance/CashFlowTab';
import ExpensesTab from '../components/finance/ExpensesTab';
import IncomeTab from '../components/finance/IncomeTab';
import PurchasingTab from '../components/finance/PurchasingTab';
import DebtsTab from '../components/finance/DebtsTab';
import CustomersTab from '../components/finance/CustomersTab';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { useAuthState } from '../context/AuthContext';
import { useUIActions } from '../context/UIContext';
import { useFinance } from '../context/FinanceContext'; 
import { useSettings } from '../context/SettingsContext'; 
import { dataService } from '../services/dataService';
import { generateTablePDF } from '../utils/pdfGenerator';
import { CURRENCY_FORMATTER } from '../constants';
import type { Transaction, Expense, OtherIncome, Purchase } from '../types';
import OverflowMenu from '../components/OverflowMenu';
import { loadFinanceCloudSource } from '../services/cloudReadModel';

type FinanceTab = 'cashflow' | 'expenses' | 'income' | 'purchasing' | 'debts' | 'customers';

const FinanceStatCard: React.FC<{
    label: string;
    value: string | number;
    hint: string;
    icon: React.ComponentProps<typeof Icon>['name'];
    tone?: 'neutral' | 'success' | 'warning';
}> = ({ label, value, hint, icon, tone = 'neutral' }) => {
    const toneClasses = {
        neutral: 'border-slate-700/80 bg-slate-850/70 text-slate-200',
        success: 'border-emerald-900/50 bg-emerald-950/10 text-emerald-100',
        warning: 'border-amber-900/50 bg-amber-950/10 text-amber-100',
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

const FinanceView: React.FC = () => {
    const { currentUser } = useAuthState();
    const { showAlert } = useUIActions();
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
    const [cloudMode, setCloudMode] = useState<'live' | 'demo' | null>(null);

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

    // Load Cloud Data Logic
    const loadCloudData = async () => {
        setIsLoadingCloud(true);

        try {
            const result = await loadFinanceCloudSource();
            setCloudData(result.data);
            setLastUpdated(result.lastUpdated);
            setCloudMode(result.mode);
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
            return;
        }

        if (rows.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data untuk diexport pada tab ini.' });
            return;
        }

        if (format === 'pdf') {
            const pdfRows = rows.map(row => row.map(cell => typeof cell === 'number' ? CURRENCY_FORMATTER.format(cell) : cell));
            generateTablePDF(title, headers, pdfRows, receiptSettings);
        } else {
            dataService.exportToSpreadsheet(headers, rows, fileName, format);
        }
        
    };

    const currentTransactions = dataSource === 'local' ? localTransactions : cloudData.transactions;
    const currentExpenses = dataSource === 'local' ? localExpenses : cloudData.expenses;
    const currentIncomes = dataSource === 'local' ? localIncomes : cloudData.otherIncomes;
    const currentPurchases = dataSource === 'local' ? localPurchases : cloudData.purchases;

    const totalIncome = currentTransactions
        .filter(t => t.paymentStatus !== 'refunded')
        .reduce((sum, transaction) => sum + transaction.total, 0) + currentIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpense = currentExpenses.reduce((sum, expense) => sum + expense.amount, 0) + currentPurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
    const outstandingDebtCount = currentTransactions.filter(t => t.paymentStatus !== 'paid' && t.paymentStatus !== 'refunded').length;
    const recentTransactionsCount = currentTransactions.length;

    const exportMenuItems = [
        { id: 'pdf', label: 'PDF Document', onClick: () => handleExport('pdf'), icon: 'printer' as const },
        { id: 'xlsx', label: 'Excel (.xlsx)', onClick: () => handleExport('xlsx'), icon: 'boxes' as const },
        { id: 'csv', label: 'CSV', onClick: () => handleExport('csv'), icon: 'download' as const },
        { id: 'ods', label: 'ODS (OpenDoc)', onClick: () => handleExport('ods'), icon: 'file-lock' as const },
    ];

    return (
        <div className="flex h-full min-h-0 flex-col gap-5">
            <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 p-5 shadow-xl sm:p-6">
                <div className="flex flex-col gap-5">
                    <div className="max-w-3xl">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7ac0a0]">Keuangan Operasional</p>
                        <h1 className="mt-2 text-2xl font-bold text-white sm:text-[30px]">Pantau arus kas, pengeluaran, pembelian, dan piutang dari satu workspace yang lebih rapi.</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                            Pindah antar tab keuangan, export data aktif, dan cek mode lokal atau cloud tanpa harus berpindah ke halaman lain.
                        </p>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                        <FinanceStatCard
                            label="Arus Masuk"
                            value={CURRENCY_FORMATTER.format(totalIncome)}
                            hint="Gabungan penjualan dan pemasukan lain dari sumber data aktif."
                            icon="trending-up"
                            tone="success"
                        />
                        <FinanceStatCard
                            label="Arus Keluar"
                            value={CURRENCY_FORMATTER.format(totalExpense)}
                            hint="Total pengeluaran dan pembelian dari sumber data aktif."
                            icon="finance"
                            tone="warning"
                        />
                        <FinanceStatCard
                            label="Piutang Aktif"
                            value={outstandingDebtCount}
                            hint="Transaksi yang belum lunas dan masih perlu ditindaklanjuti."
                            icon="book"
                        />
                        <FinanceStatCard
                            label="Transaksi Tercatat"
                            value={recentTransactionsCount}
                            hint="Jumlah transaksi pada sumber data yang sedang ditampilkan."
                            icon="cash"
                        />
                    </div>
                </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-800 bg-slate-800/95 shadow-xl">
                <div className="flex flex-col gap-3 border-b border-slate-700/80 px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white">Workspace Keuangan</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                {dataSource === 'dropbox'
                                    ? `${cloudMode === 'demo' ? 'Menampilkan data simulasi multi-cabang' : 'Menampilkan data cloud gabungan'}${lastUpdated ? `, terakhir diperbarui ${lastUpdated.toLocaleTimeString()}` : ''}.`
                                    : 'Menampilkan data lokal yang tersimpan di perangkat ini.'}
                            </p>
                        </div>
                        {dataSource === 'dropbox' && (
                            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] ${cloudMode === 'demo' ? 'border-yellow-700 bg-yellow-900/20 text-yellow-200' : 'border-blue-800 bg-blue-900/20 text-blue-200'}`}>
                                <Icon name={cloudMode === 'demo' ? 'warning' : 'cloud'} className="w-3 h-3" />
                                {cloudMode === 'demo' ? 'Mode Demo' : 'Mode Cloud Aktif'}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1.6fr)_auto_auto] lg:items-center">
                        {!isStaff && (
                            <div className="flex rounded-xl border border-slate-700 bg-slate-900/60 p-1">
                                <button
                                    onClick={() => {
                                        setDataSource('local');
                                        setCloudMode(null);
                                    }}
                                    className={`flex-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${dataSource === 'local' ? 'bg-[#347758] text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Lokal
                                </button>
                                <button
                                    onClick={() => setDataSource('dropbox')}
                                    className={`flex-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${dataSource === 'dropbox' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Cloud
                                </button>
                            </div>
                        )}

                        <OverflowMenu
                            size="sm"
                            label="Export"
                            variant="utility"
                            showLabelOnMobile
                            matchTriggerWidth
                            buttonClassName="h-11 w-full sm:w-auto"
                            items={exportMenuItems}
                        />

                        <OverflowMenu
                            size="sm"
                            label="Aksi"
                            variant="utility"
                            showLabelOnMobile={false}
                            matchTriggerWidth
                            buttonClassName="h-11 w-full sm:w-auto"
                            items={[
                                ...(dataSource === 'dropbox' ? [{
                                    id: 'refresh',
                                    label: isLoadingCloud ? 'Memuat...' : 'Refresh Cloud',
                                    onClick: () => { void loadCloudData(); },
                                    icon: 'reset' as const,
                                    disabled: isLoadingCloud
                                }] : [])
                            ]}
                        />
                    </div>

                    <div className="flex overflow-x-auto space-x-2 border-t border-slate-700/60 pt-2 hide-scrollbar">
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
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {dataSource === 'dropbox' && (
                    <div className={`mb-4 flex items-center gap-2 rounded-lg border p-2 text-xs ${cloudMode === 'demo' ? 'border-yellow-700 bg-yellow-900/20 text-yellow-200' : 'border-blue-800 bg-blue-900/20 text-blue-200'}`}>
                        <Icon name={cloudMode === 'demo' ? 'warning' : 'cloud'} className="w-4 h-4" />
                        <span>
                            {cloudMode === 'demo'
                                ? 'Dropbox belum tersambung. Data simulasi ditampilkan agar halaman keuangan tetap bisa dipreview.'
                                : 'Menampilkan data gabungan dari seluruh cabang (Cloud).'}
                            {lastUpdated && ` Update: ${lastUpdated.toLocaleTimeString()}`}
                        </span>
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
            </section>
        </div>
    );
};

export default FinanceView;


import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { supabaseService } from '../services/supabaseService';
import { dropboxService } from '../services/dropboxService';
import { useUI } from '../context/UIContext';

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
    const { showAlert } = useUI();
    const isManagement = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    
    // Tab State
    const [mainView, setMainView] = useState<'finance' | 'customers'>('finance');
    const [activeTab, setActiveTab] = useState<string>(isManagement ? 'cashflow' : 'expenses');

    // Cloud Aggregation State (Lifted from CashFlowTab to be available globally in Finance)
    const [dataSource, setDataSource] = useState<'local' | 'cloud' | 'dropbox'>('local');
    const [cloudData, setCloudData] = useState<{ 
        transactions: TransactionType[], 
        expenses: Expense[], 
        otherIncomes: OtherIncome[],
        purchases: Purchase[]
    }>({ transactions: [], expenses: [], otherIncomes: [], purchases: [] });
    const [isCloudLoading, setIsCloudLoading] = useState(false);

    // Load Data Effect
    useEffect(() => {
        const loadData = async () => {
            // 1. Pre-check credentials to avoid unnecessary errors
            if (dataSource === 'cloud') {
                const sbUrl = localStorage.getItem('ARTEA_SB_URL');
                const sbKey = localStorage.getItem('ARTEA_SB_KEY');
                if (!sbUrl || !sbKey) {
                    showAlert({ 
                        type: 'alert', 
                        title: 'Supabase Belum Dikonfigurasi', 
                        message: 'Silakan atur URL dan API Key Supabase di menu Pengaturan > Data & Cloud terlebih dahulu.' 
                    });
                    setDataSource('local');
                    return;
                }
            } else if (dataSource === 'dropbox') {
                const dbxToken = localStorage.getItem('ARTEA_DBX_REFRESH_TOKEN');
                if (!dbxToken) {
                    showAlert({ 
                        type: 'alert', 
                        title: 'Dropbox Belum Dikonfigurasi', 
                        message: 'Silakan hubungkan akun Dropbox di menu Pengaturan > Data & Cloud terlebih dahulu.' 
                    });
                    setDataSource('local');
                    return;
                }
            }

            setIsCloudLoading(true);
            try {
                if (dataSource === 'cloud') {
                    // Supabase Logic
                    const sbUrl = localStorage.getItem('ARTEA_SB_URL')!;
                    const sbKey = localStorage.getItem('ARTEA_SB_KEY')!;
                    
                    supabaseService.init(sbUrl, sbKey);
                    // Fetch last 30 days by default or logic in sub-components will filter
                    const endDate = new Date();
                    const startDate = new Date();
                    startDate.setMonth(startDate.getMonth() - 12); // Fetch 1 year for overview

                    const result = await supabaseService.fetchFinanceData(startDate, endDate);
                    
                    setCloudData({
                        transactions: result.transactions.map((t: any) => ({...t, createdAt: t.created_at, paymentStatus: t.payment_status, storeId: t.store_id})),
                        expenses: result.expenses.map((e: any) => ({...e, storeId: e.store_id})),
                        otherIncomes: result.otherIncomes.map((i: any) => ({...i, storeId: i.store_id})),
                        purchases: result.purchases.map((p: any) => ({...p, storeId: p.store_id}))
                    });

                } else if (dataSource === 'dropbox') {
                    // Dropbox Logic
                    const allBranches = await dropboxService.fetchAllBranchData();
                    let txns: any[] = [], exps: any[] = [], incs: any[] = [], prchs: any[] = []; 

                    allBranches.forEach(branch => {
                        if (branch.transactionRecords) txns.push(...branch.transactionRecords.map((t:any) => ({...t, storeId: branch.storeId})));
                        if (branch.expenses) exps.push(...branch.expenses.map((e:any) => ({...e, storeId: branch.storeId})));
                        if (branch.otherIncomes) incs.push(...branch.otherIncomes.map((i:any) => ({...i, storeId: branch.storeId})));
                        // Note: Purchase data sync to dropbox might need update in dropboxService if missing
                    });

                    setCloudData({
                        transactions: txns,
                        expenses: exps,
                        otherIncomes: incs,
                        purchases: [] // Placeholder until dropbox service syncs purchases
                    });
                }
            } catch (error: any) {
                console.error("Finance Load Error:", error);
                showAlert({ type: 'alert', title: 'Gagal Memuat Data', message: error.message });
                setDataSource('local');
            } finally {
                setIsCloudLoading(false);
            }
        };

        if (dataSource !== 'local') {
            loadData();
        }
    }, [dataSource, showAlert]);

    const renderSubTabButton = (tab: string, label: string) => (
        <button onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === tab ? 'text-[#52a37c] border-[#52a37c]' : 'text-slate-400 border-transparent hover:text-white'}`}>
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    Keuangan & Pelanggan
                    {dataSource !== 'local' && (
                        <span className={`text-xs px-2 py-1 rounded font-normal text-white ${dataSource === 'cloud' ? 'bg-sky-600' : 'bg-blue-600'}`}>
                            Mode {dataSource === 'cloud' ? 'Cloud' : 'Dropbox'}
                        </span>
                    )}
                </h1>
                
                <div className="flex gap-2 items-center flex-wrap">
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
                        <button
                            onClick={() => setDataSource('cloud')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dataSource === 'cloud' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            title="Data Real-time Supabase"
                        >
                            Cloud
                        </button>
                    </div>

                    <div className="bg-slate-700 p-1 rounded-lg flex">
                        <button onClick={() => setMainView('finance')} className={`px-4 py-2 text-sm rounded-md transition-colors ${mainView === 'finance' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Keuangan</button>
                        <button onClick={() => setMainView('customers')} className={`px-4 py-2 text-sm rounded-md transition-colors ${mainView === 'customers' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Pelanggan</button>
                    </div>
                </div>
            </div>

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

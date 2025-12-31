
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import type { Transaction as TransactionType, Expense, OtherIncome } from '../../types';

type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

const StatCard: React.FC<{title: string; value: string | number; className?: string}> = ({title, value, className}) => (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-md ${className}`}>
        <h3 className="text-slate-400 text-sm">{title}</h3>
        <p className="text-2xl font-bold text-white">{typeof value === 'number' ? CURRENCY_FORMATTER.format(value) : value}</p>
    </div>
);

interface CashFlowTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: {
        transactions: TransactionType[];
        expenses: Expense[];
        otherIncomes: OtherIncome[];
    };
}

const CashFlowTab: React.FC<CashFlowTabProps> = ({ dataSource = 'local', cloudData }) => {
    const { transactions: localTransactions, expenses: localExpenses, purchases, otherIncomes: localOtherIncomes } = useFinance();
    const [filter, setFilter] = useState<TimeFilter>('month');
    const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isFilterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const activeTransactions = dataSource === 'local' ? localTransactions : (cloudData?.transactions || []);
    const activeExpenses = dataSource === 'local' ? localExpenses : (cloudData?.expenses || []);
    const activeOtherIncomes = dataSource === 'local' ? localOtherIncomes : (cloudData?.otherIncomes || []);
    // Purchases currently local only until synced properly in cloudData
    const activePurchases = dataSource === 'local' ? purchases : []; 

    const data = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const filterPredicate = (itemDateStr: string): boolean => {
            const itemDate = new Date(itemDateStr);
            switch (filter) {
                case 'today': return itemDate >= today;
                case 'week':
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    return itemDate >= weekStart;
                case 'month':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    return itemDate >= monthStart;
                case 'custom':
                    if (!customStartDate || !customEndDate) return true;
                    const start = new Date(customStartDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(customEndDate);
                    end.setHours(23, 59, 59, 999);
                    return itemDate >= start && itemDate <= end;
                case 'all': return true;
                default: return true;
            }
        };

        const filteredTransactions = activeTransactions.filter(t => filterPredicate(t.createdAt) && t.paymentStatus !== 'refunded');
        const filteredExpenses = activeExpenses.filter(e => filterPredicate(e.date));
        const filteredOtherIncome = activeOtherIncomes.filter(i => filterPredicate(i.date));
        const filteredPurchases = activePurchases.filter(p => filterPredicate(p.date));

        const salesIncome = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
        const otherIncomeTotal = filteredOtherIncome.reduce((sum, i) => sum + i.amount, 0);
        const totalIncome = salesIncome + otherIncomeTotal;

        const totalOpEx = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalExpenses = totalOpEx + totalPurchases;
        const netCashFlow = totalIncome - totalExpenses;

        const combinedFlow = [
            ...filteredTransactions.map(t => ({ type: 'Penjualan', date: t.createdAt, description: `Penjualan #${t.id.slice(-4)}`, amount: t.total, store: (t as any).storeId || (t as any).store_id })),
            ...filteredOtherIncome.map(i => ({ type: 'Pemasukan Lain', date: i.date, description: i.description, amount: i.amount, store: (i as any).storeId })),
            ...filteredExpenses.map(e => ({ type: 'Pengeluaran', date: e.date, description: e.description, amount: -e.amount, store: (e as any).storeId })),
            ...filteredPurchases.map(p => ({ type: 'Pembelian', date: p.date, description: `Pembelian dari ${p.supplierName}`, amount: -p.totalAmount, store: 'LOCAL' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { totalIncome, totalExpenses, netCashFlow, combinedFlow };
    }, [filter, activeTransactions, activeExpenses, activeOtherIncomes, activePurchases, customStartDate, customEndDate]);
    
    const filterLabels: Record<TimeFilter, string> = { today: 'Hari Ini', week: 'Minggu Ini', month: 'Bulan Ini', all: 'Semua', custom: 'Kustom' };
    const handleFilterChange = (newFilter: TimeFilter) => { setFilter(newFilter); setFilterDropdownOpen(false); };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                 <div className="flex items-center gap-2 flex-wrap w-full">
                    
                    <div className="relative" ref={filterDropdownRef}>
                        <Button variant="secondary" onClick={() => setFilterDropdownOpen(prev => !prev)}>
                            Filter: {filterLabels[filter]}
                            <svg className={`w-4 h-4 ml-2 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </Button>
                        {isFilterDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-slate-700 rounded-lg shadow-xl z-10">
                                {(['today', 'week', 'month', 'all', 'custom'] as TimeFilter[]).map(f => (
                                    <button key={f} onClick={() => handleFilterChange(f)} className={`w-full text-left px-4 py-2 text-sm transition-colors ${filter === f ? 'bg-[#347758] text-white' : 'text-slate-200 hover:bg-slate-600'}`}>
                                        {filterLabels[f]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Pemasukan" value={data.totalIncome} className="border-l-4 border-green-500" />
                <StatCard title="Total Pengeluaran" value={data.totalExpenses} className="border-l-4 border-red-500" />
                <StatCard title="Arus Kas Bersih" value={data.netCashFlow} className={`border-l-4 ${data.netCashFlow >= 0 ? 'border-[#347758]' : 'border-yellow-500'}`} />
            </div>
            <div className="bg-slate-800 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-white p-4">Riwayat Arus Kas</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-700 text-slate-200">
                            <tr>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Tipe</th>
                                <th className="p-3">Deskripsi</th>
                                <th className="p-3 text-right">Jumlah</th>
                                {dataSource !== 'local' && <th className="p-3 text-right">Cabang</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {data.combinedFlow.map((item, index) => (
                                <tr key={index} className="border-b border-slate-700 last:border-b-0">
                                    <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${item.amount > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{item.type}</span></td>
                                    <td className="p-3">{item.description}</td>
                                    <td className={`p-3 text-right font-semibold ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {CURRENCY_FORMATTER.format(Math.abs(item.amount))}
                                    </td>
                                    {dataSource !== 'local' && <td className="p-3 text-right text-xs text-slate-400">{(item as any).store || '-'}</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.combinedFlow.length === 0 && <p className="p-4 text-center text-slate-500">Tidak ada data untuk periode ini.</p>}
                </div>
            </div>
        </div>
    );
};

export default CashFlowTab;

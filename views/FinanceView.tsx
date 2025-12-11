
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
import { useCustomer } from '../context/CustomerContext';
import { useAuth } from '../context/AuthContext';
import type { Expense, Supplier, Purchase, PurchaseItem, PurchaseStatus, RawMaterial, Transaction as TransactionType, PaymentMethod, ExpenseStatus, Customer, Product, OtherIncome } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import { CURRENCY_FORMATTER } from '../constants';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import Pagination from '../components/Pagination';
import CustomerFormModal from '../components/CustomerFormModal';

type FinanceSubTab = 'cashflow' | 'expenses' | 'other_income' | 'purchasing' | 'debt-receivables';
type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

const StatCard: React.FC<{title: string; value: string | number; className?: string}> = ({title, value, className}) => (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-md ${className}`}>
        <h3 className="text-slate-400 text-sm">{title}</h3>
        <p className="text-2xl font-bold text-white">{typeof value === 'number' ? CURRENCY_FORMATTER.format(value) : value}</p>
    </div>
);

// --- Cash Flow Tab ---
const CashFlowTab: React.FC = () => {
    const { transactions, expenses, purchases, otherIncomes } = useFinance();
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

    const data = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const filterPredicate = (itemDateStr: string): boolean => {
            const itemDate = new Date(itemDateStr);
            switch (filter) {
                case 'today':
                    return itemDate >= today;
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
                case 'all':
                default:
                    return true;
            }
        };

        const filteredTransactions = transactions.filter(t => filterPredicate(t.createdAt) && t.paymentStatus !== 'refunded');
        const filteredExpenses = expenses.filter(e => filterPredicate(e.date));
        const filteredPurchases = purchases.filter(p => filterPredicate(p.date));
        const filteredOtherIncome = otherIncomes.filter(i => filterPredicate(i.date));

        const salesIncome = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
        const otherIncomeTotal = filteredOtherIncome.reduce((sum, i) => sum + i.amount, 0);
        const totalIncome = salesIncome + otherIncomeTotal;

        const totalOpEx = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalExpenses = totalOpEx + totalPurchases;
        const netCashFlow = totalIncome - totalExpenses;

        const combinedFlow = [
            ...filteredTransactions.map(t => ({ type: 'Penjualan', date: t.createdAt, description: `Penjualan #${t.id.slice(-4)}`, amount: t.total })),
            ...filteredOtherIncome.map(i => ({ type: 'Pemasukan Lain', date: i.date, description: i.description, amount: i.amount })),
            ...filteredExpenses.map(e => ({ type: 'Pengeluaran', date: e.date, description: e.description, amount: -e.amount })),
            ...filteredPurchases.map(p => ({ type: 'Pembelian', date: p.date, description: `Pembelian dari ${p.supplierName}`, amount: -p.totalAmount }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { totalIncome, totalExpenses, netCashFlow, combinedFlow };
    }, [filter, transactions, expenses, purchases, otherIncomes, customStartDate, customEndDate]);
    
    const filterLabels: Record<TimeFilter, string> = {
        today: 'Hari Ini',
        week: 'Minggu Ini',
        month: 'Bulan Ini',
        all: 'Semua',
        custom: 'Kustom'
    };
    
    const handleFilterChange = (newFilter: TimeFilter) => {
        setFilter(newFilter);
        setFilterDropdownOpen(false);
    };

    const exportCashFlowCSV = () => {
        if (data.combinedFlow.length === 0) return;

        const headers = 'Tanggal,Tipe,Deskripsi,Jumlah (IDR)';
        
        const rows = data.combinedFlow.map(item => {
            const date = new Date(item.date).toLocaleDateString('id-ID');
            const type = item.type;
            const description = `"${item.description.replace(/"/g, '""')}"`; // Handle commas in description
            const amount = item.amount;
            return [date, type, description, amount].join(',');
        });

        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const timestamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `laporan-arus-kas-${filter}-${timestamp}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                 <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative" ref={filterDropdownRef}>
                        <Button variant="secondary" onClick={() => setFilterDropdownOpen(prev => !prev)}>
                            Filter: {filterLabels[filter]}
                            <svg className={`w-4 h-4 ml-2 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </Button>
                        {isFilterDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-slate-700 rounded-lg shadow-xl z-10">
                                {(['today', 'week', 'month', 'all', 'custom'] as TimeFilter[]).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => handleFilterChange(f)}
                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${filter === f ? 'bg-[#347758] text-white' : 'text-slate-200 hover:bg-slate-600'}`}
                                    >
                                        {filterLabels[f]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                     <Button variant="secondary" onClick={exportCashFlowCSV} disabled={data.combinedFlow.length === 0}>
                        <Icon name="download" className="w-4 h-4" />
                        <span>Export CSV</span>
                    </Button>
                </div>
            </div>
            {filter === 'custom' && (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800 p-3 rounded-lg">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-slate-400 mb-1">Dari Tanggal:</label>
                        <input
                            id="startDate"
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-slate-400 mb-1">Sampai Tanggal:</label>
                        <input
                            id="endDate"
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white"
                        />
                    </div>
                </div>
            )}
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

const PayDebtModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (amount: number) => void;
    purchase: Purchase;
}> = ({ isOpen, onClose, onSave, purchase }) => {
    const [amount, setAmount] = useState('');
    const remaining = purchase.totalAmount - purchase.amountPaid;

    const handleSubmit = () => {
        const val = parseFloat(amount);
        if (val > 0) {
            onSave(val);
            onClose();
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Bayar Utang ke ${purchase.supplierName}`}>
            <div className="space-y-4">
                <div className="flex justify-between bg-slate-700 p-3 rounded-lg">
                    <span className="text-slate-300">Sisa Utang</span>
                    <span className="font-bold text-red-400">{CURRENCY_FORMATTER.format(remaining)}</span>
                </div>
                <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Jumlah Pembayaran"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    autoFocus
                />
                <Button onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0} className="w-full">Bayar</Button>
            </div>
        </Modal>
    );
}

const PayExpenseDebtModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (amount: number) => void;
    expense: Expense;
}> = ({ isOpen, onClose, onSave, expense }) => {
    const [amount, setAmount] = useState('');
    const remaining = expense.amount - expense.amountPaid;

    const handleSubmit = () => {
        const val = parseFloat(amount);
        if (val > 0) {
            onSave(val);
            onClose();
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Bayar Utang Pengeluaran`}>
            <div className="space-y-4">
                <div className="p-2 bg-slate-800 rounded mb-2">
                    <p className="text-sm text-slate-400">{expense.description}</p>
                </div>
                <div className="flex justify-between bg-slate-700 p-3 rounded-lg">
                    <span className="text-slate-300">Sisa Utang</span>
                    <span className="font-bold text-red-400">{CURRENCY_FORMATTER.format(remaining)}</span>
                </div>
                <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Jumlah Pembayaran"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    autoFocus
                />
                <Button onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0} className="w-full">Bayar</Button>
            </div>
        </Modal>
    );
}

// --- Debt & Receivables Tab ---
const DebtReceivablesTab: React.FC = () => {
    const { transactions, purchases, expenses, addPaymentToTransaction, addPaymentToPurchase, addPaymentToExpense } = useFinance();
    const [subTab, setSubTab] = useState<'receivables' | 'payables' | 'expense_payables'>('receivables');
    const [updatingTransaction, setUpdatingTransaction] = useState<TransactionType | null>(null);
    const [payingPurchase, setPayingPurchase] = useState<Purchase | null>(null);
    const [payingExpense, setPayingExpense] = useState<Expense | null>(null);

    const receivables = useMemo(() => transactions.filter(t => (t.paymentStatus === 'partial' || t.paymentStatus === 'unpaid')).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [transactions]);
    const payables = useMemo(() => purchases.filter(p => p.status === 'belum-lunas').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [purchases]);
    const expensePayables = useMemo(() => expenses.filter(e => e.status === 'belum-lunas').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [expenses]);
    
    const totalReceivables = useMemo(() => receivables.reduce((sum, t) => sum + (t.total - t.amountPaid), 0), [receivables]);
    const totalPayables = useMemo(() => payables.reduce((sum, p) => sum + (p.totalAmount - p.amountPaid), 0), [payables]);
    const totalExpensePayables = useMemo(() => expensePayables.reduce((sum, e) => sum + (e.amount - e.amountPaid), 0), [expensePayables]);
    
    const handlePayPurchaseDebt = (amount: number) => {
        if(payingPurchase) {
            addPaymentToPurchase(payingPurchase.id, amount);
        }
        setPayingPurchase(null);
    }
    
     const handlePayExpenseDebt = (amount: number) => {
        if(payingExpense) {
            addPaymentToExpense(payingExpense.id, amount);
        }
        setPayingExpense(null);
    }
    
    return (
        <div className="space-y-6">
             <div className="flex bg-slate-700 p-1 rounded-lg overflow-x-auto">
                <button onClick={() => setSubTab('receivables')} className={`flex-shrink-0 whitespace-nowrap px-4 py-1 text-sm rounded-md transition-colors ${subTab === 'receivables' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>
                    Piutang Pelanggan
                </button>
                <button onClick={() => setSubTab('payables')} className={`flex-shrink-0 whitespace-nowrap px-4 py-1 text-sm rounded-md transition-colors ${subTab === 'payables' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>
                    Utang Pemasok
                </button>
                 <button onClick={() => setSubTab('expense_payables')} className={`flex-shrink-0 whitespace-nowrap px-4 py-1 text-sm rounded-md transition-colors ${subTab === 'expense_payables' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>
                    Utang Pengeluaran
                </button>
            </div>
            
            {subTab === 'receivables' && (
                <div className="space-y-4">
                    <StatCard title="Total Piutang Pelanggan" value={totalReceivables} className="border-l-4 border-yellow-500" />
                    <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                         <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-700 text-slate-200">
                                <tr>
                                    <th className="p-3">Tanggal</th>
                                    <th className="p-3">Pelanggan</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-right">Sisa Tagihan</th>
                                    <th className="p-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receivables.map(t => (
                                    <tr key={t.id} className="border-b border-slate-700 last:border-b-0">
                                        <td className="p-3 text-slate-400">{new Date(t.createdAt).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3 font-semibold">{t.customerName}</td>
                                        <td className="p-3 text-right">{CURRENCY_FORMATTER.format(t.total)}</td>
                                        <td className="p-3 text-right font-semibold text-yellow-400">{CURRENCY_FORMATTER.format(t.total - t.amountPaid)}</td>
                                        <td className="p-3"><Button size="sm" onClick={() => setUpdatingTransaction(t)}>Tambah Pembayaran</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {receivables.length === 0 && <p className="p-4 text-center text-slate-500">Tidak ada piutang pelanggan saat ini.</p>}
                    </div>
                </div>
            )}

            {subTab === 'payables' && (
                 <div className="space-y-4">
                    <StatCard title="Total Utang ke Pemasok" value={totalPayables} className="border-l-4 border-red-500" />
                     <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                           <thead className="bg-slate-700 text-slate-200">
                               <tr>
                                   <th className="p-3">Tanggal</th>
                                   <th className="p-3">Pemasok</th>
                                   <th className="p-3 text-right">Total</th>
                                   <th className="p-3 text-right">Sisa Utang</th>
                                   <th className="p-3">Aksi</th>
                               </tr>
                           </thead>
                           <tbody>
                               {payables.map(p => (
                                   <tr key={p.id} className="border-b border-slate-700 last:border-b-0">
                                       <td className="p-3 text-slate-400">{new Date(p.date).toLocaleDateString('id-ID')}</td>
                                       <td className="p-3">{p.supplierName}</td>
                                       <td className="p-3 text-right font-medium">{CURRENCY_FORMATTER.format(p.totalAmount)}</td>
                                       <td className="p-3 text-right text-slate-300">{CURRENCY_FORMATTER.format(p.amountPaid)}</td>
                                       <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${p.status === 'lunas' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                                {p.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                                            </span>
                                        </td>
                                        <td className="p-3"><Button size="sm" onClick={() => setPayingPurchase(p)}>Bayar Utang</Button></td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                       {payables.length === 0 && <p className="p-4 text-center text-slate-500">Tidak ada utang ke pemasok.</p>}
                   </div>
                </div>
            )}
            
            {subTab === 'expense_payables' && (
                 <div className="space-y-4">
                    <StatCard title="Total Utang Pengeluaran" value={totalExpensePayables} className="border-l-4 border-red-500" />
                     <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                           <thead className="bg-slate-700 text-slate-200">
                               <tr>
                                   <th className="p-3">Tanggal</th>
                                   <th className="p-3">Deskripsi</th>
                                   <th className="p-3 text-right">Total</th>
                                   <th className="p-3 text-right">Sisa Utang</th>
                                   <th className="p-3">Aksi</th>
                               </tr>
                           </thead>
                           <tbody>
                               {expensePayables.map(e => (
                                   <tr key={e.id} className="border-b border-slate-700 last:border-b-0">
                                       <td className="p-3 text-slate-400">{new Date(e.date).toLocaleDateString('id-ID')}</td>
                                       <td className="p-3 font-semibold">{e.description}</td>
                                       <td className="p-3 text-right">{CURRENCY_FORMATTER.format(e.amount)}</td>
                                       <td className="p-3 text-right font-semibold text-red-400">{CURRENCY_FORMATTER.format(e.amount - e.amountPaid)}</td>
                                       <td className="p-3"><Button size="sm" onClick={() => setPayingExpense(e)}>Bayar Utang</Button></td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                       {expensePayables.length === 0 && <p className="p-4 text-center text-slate-500">Tidak ada utang pengeluaran.</p>}
                   </div>
                </div>
            )}


            {updatingTransaction && (
                <UpdatePaymentModal 
                    isOpen={!!updatingTransaction}
                    onClose={() => setUpdatingTransaction(null)}
                    transaction={updatingTransaction}
                    onConfirm={(newPayments) => {
                        addPaymentToTransaction(updatingTransaction.id, newPayments);
                        setUpdatingTransaction(null);
                    }}
                />
            )}
             {payingPurchase && <PayDebtModal isOpen={!!payingPurchase} onClose={() => setPayingPurchase(null)} onSave={handlePayPurchaseDebt} purchase={payingPurchase} />}
             {payingExpense && <PayExpenseDebtModal isOpen={!!payingExpense} onClose={() => setPayingExpense(null)} onSave={handlePayExpenseDebt} expense={payingExpense} />}
        </div>
    );
};

const CustomersTab: React.FC = () => {
    const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomer();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const filteredCustomers = useMemo(() =>
        customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.contact?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    , [customers, searchTerm]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
    const paginatedCustomers = useMemo(() => {
        return filteredCustomers.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredCustomers, currentPage]);

    const handleSave = (data: Omit<Customer, 'id' | 'memberId' | 'points' | 'createdAt'> | Customer) => {
        if ('id' in data) {
            updateCustomer(data as Customer);
        } else {
            addCustomer(data);
        }
        setModalOpen(false);
    }
    
    return (
        <div className="space-y-4">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <input
                        type="text"
                        placeholder="Cari pelanggan..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-[#347758] focus:border-[#347758]"
                    />
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <Button onClick={() => {setEditingCustomer(null); setModalOpen(true)}} className="w-full sm:w-auto">
                    <Icon name="plus" className="w-5 h-5" /> <span>Tambah Pelanggan</span>
                </Button>
            </div>
             <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-700 text-slate-200">
                        <tr>
                            <th className="p-3">Nama</th>
                            <th className="p-3">ID Anggota</th>
                            <th className="p-3">Kontak</th>
                            <th className="p-3 text-right">Poin</th>
                            <th className="p-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCustomers.map(c => (
                            <tr key={c.id} className="border-b border-slate-700 last:border-b-0">
                                <td className="p-3 font-semibold">{c.name}</td>
                                <td className="p-3 text-slate-400">{c.memberId}</td>
                                <td className="p-3 text-slate-300">{c.contact || '-'}</td>
                                <td className="p-3 text-right font-bold text-yellow-400">{c.points}</td>
                                <td className="p-3">
                                    <div className="flex gap-2">
                                        <button onClick={() => {setEditingCustomer(c); setModalOpen(true)}} className="text-[#52a37c] hover:text-[#7ac0a0]"><Icon name="edit" /></button>
                                        <button onClick={() => deleteCustomer(c.id)} className="text-red-500 hover:text-red-400"><Icon name="trash" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCustomers.length === 0 && <p className="p-4 text-center text-slate-500">{searchTerm ? 'Pelanggan tidak ditemukan.' : 'Belum ada pelanggan terdaftar.'}</p>}
             </div>
             <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={filteredCustomers.length}
            />
             <CustomerFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} customer={editingCustomer} />
        </div>
    )
}

const ExpenseFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Expense, 'id' | 'status'> | Expense) => void;
    expense: Expense | null;
}> = ({ isOpen, onClose, onSave, expense }) => {
    const [form, setForm] = useState({ description: '', amount: '', category: '', date: '', amountPaid: '' });

    useEffect(() => {
        if (expense) {
            setForm({
                description: expense.description,
                amount: expense.amount.toString(),
                category: expense.category,
                date: new Date(expense.date).toISOString().split('T')[0],
                amountPaid: expense.amountPaid.toString(),
            });
        } else {
            setForm({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], amountPaid: '' });
        }
    }, [expense, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(form.amount) || 0;
        const amountPaid = form.amountPaid ? parseFloat(form.amountPaid) : amount; // Default to full amount if not specified
        const data = {
            description: form.description,
            amount,
            category: form.category,
            date: new Date(form.date).toISOString(),
            amountPaid
        };
        if (expense) onSave({ ...data, id: expense.id, status: expense.status });
        else onSave(data);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi (cth: Listrik)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Jumlah (Rp)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Kategori (cth: Operasional)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Jumlah yang Dibayar (Kosongkan jika Lunas)</label>
                    <input type="number" min="0" value={form.amountPaid} onChange={e => setForm({ ...form, amountPaid: e.target.value })} placeholder="Jumlah Dibayar" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};

const OtherIncomeFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<OtherIncome, 'id'> | OtherIncome) => void;
    income: OtherIncome | null;
}> = ({ isOpen, onClose, onSave, income }) => {
    const [form, setForm] = useState({ description: '', amount: '', category: '', date: '' });

    useEffect(() => {
        if (income) {
            setForm({
                description: income.description,
                amount: income.amount.toString(),
                category: income.category,
                date: new Date(income.date).toISOString().split('T')[0],
            });
        } else {
            setForm({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0] });
        }
    }, [income, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            description: form.description,
            amount: parseFloat(form.amount) || 0,
            category: form.category,
            date: new Date(form.date).toISOString(),
        };
        if (income) onSave({ ...data, id: income.id });
        else onSave(data);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={income ? 'Edit Pemasukan Lain' : 'Tambah Pemasukan Lain'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Jumlah (Rp)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Kategori" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};

const SupplierFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Supplier, 'id'> | Supplier) => void;
    supplier: Supplier | null;
}> = ({ isOpen, onClose, onSave, supplier }) => {
    const [form, setForm] = useState({ name: '', contact: '' });

    useEffect(() => {
        if (supplier) {
            setForm({ name: supplier.name, contact: supplier.contact || '' });
        } else {
            setForm({ name: '', contact: '' });
        }
    }, [supplier, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { name: form.name, contact: form.contact };
        if (supplier) onSave({ ...data, id: supplier.id });
        else onSave(data);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? 'Edit Pemasok' : 'Tambah Pemasok'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama Pemasok" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="text" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Kontak / Alamat" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};

const PurchaseFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const { suppliers } = useFinance();
    const { products, rawMaterials } = useProduct();
    const [supplierId, setSupplierId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [amountPaid, setAmountPaid] = useState('');

    const [newItemType, setNewItemType] = useState<'raw_material' | 'product'>('raw_material');
    const [newItemId, setNewItemId] = useState('');
    const [newItemQty, setNewItemQty] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');

    const addItem = () => {
        if (!newItemId || !newItemQty || !newItemPrice) return;
        const item: PurchaseItem = {
            itemType: newItemType,
            quantity: parseFloat(newItemQty),
            price: parseFloat(newItemPrice),
            rawMaterialId: newItemType === 'raw_material' ? newItemId : undefined,
            productId: newItemType === 'product' ? newItemId : undefined,
        };
        setItems([...items, item]);
        setNewItemId(''); setNewItemQty(''); setNewItemPrice('');
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const paid = amountPaid ? parseFloat(amountPaid) : totalAmount;
        onSave({
            supplierId,
            date: new Date(date).toISOString(),
            items,
            amountPaid: paid
        });
    };

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Catat Pembelian Stok">
            <form onSubmit={handleSubmit} className="space-y-4">
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                    <option value="" disabled>Pilih Pemasok</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                
                <div className="bg-slate-700 p-3 rounded-lg space-y-2">
                    <p className="text-sm font-bold">Item Pembelian</p>
                    {items.map((item, idx) => {
                        const name = item.itemType === 'product' 
                            ? products.find(p => p.id === item.productId)?.name 
                            : rawMaterials.find(m => m.id === item.rawMaterialId)?.name;
                        return (
                            <div key={idx} className="flex justify-between items-center text-xs bg-slate-800 p-2 rounded">
                                <span>{name} x {item.quantity}</span>
                                <span>{CURRENCY_FORMATTER.format(item.price * item.quantity)}</span>
                                <button type="button" onClick={() => removeItem(idx)} className="text-red-400"><Icon name="trash" className="w-3 h-3"/></button>
                            </div>
                        )
                    })}
                    <div className="flex gap-2 items-center flex-wrap">
                        <select value={newItemType} onChange={e => setNewItemType(e.target.value as any)} className="bg-slate-900 text-xs p-2 rounded">
                            <option value="raw_material">Bahan Baku</option>
                            <option value="product">Produk</option>
                        </select>
                        <select value={newItemId} onChange={e => setNewItemId(e.target.value)} className="bg-slate-900 text-xs p-2 rounded flex-1">
                            <option value="" disabled>Pilih Item</option>
                            {newItemType === 'raw_material' 
                                ? rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                : products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                            }
                        </select>
                        <input type="number" placeholder="Qty" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} className="w-16 bg-slate-900 text-xs p-2 rounded text-white"/>
                        <input type="number" placeholder="Harga Satuan" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-24 bg-slate-900 text-xs p-2 rounded text-white"/>
                        <button type="button" onClick={addItem} className="bg-[#347758] p-2 rounded text-white"><Icon name="plus" className="w-3 h-3"/></button>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                    <span>Total Pembelian</span>
                    <span className="font-bold text-white">{CURRENCY_FORMATTER.format(totalAmount)}</span>
                </div>

                <div>
                    <label className="block text-xs text-slate-400 mb-1">Jumlah Dibayar (Kosongkan jika Lunas)</label>
                    <input type="number" min="0" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="Jumlah Dibayar" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit" disabled={items.length === 0 || !supplierId}>Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};

const PurchasesAndSuppliersTab: React.FC<{
    onAddSupplier: () => void;
    onEditSupplier: (s: Supplier) => void;
    onAddPurchase: () => void;
    onDeleteSupplier: (id: string) => void;
}> = ({ onAddSupplier, onEditSupplier, onAddPurchase, onDeleteSupplier }) => {
    const { suppliers, purchases } = useFinance();
    const [activeSection, setActiveSection] = useState<'purchases' | 'suppliers'>('purchases');

    return (
        <div className="space-y-6">
            <div className="flex bg-slate-700 p-1 rounded-lg w-fit">
                <button onClick={() => setActiveSection('purchases')} className={`px-4 py-1 text-sm rounded-md transition-colors ${activeSection === 'purchases' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>
                    Riwayat Pembelian
                </button>
                <button onClick={() => setActiveSection('suppliers')} className={`px-4 py-1 text-sm rounded-md transition-colors ${activeSection === 'suppliers' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>
                    Daftar Pemasok
                </button>
            </div>

            {activeSection === 'suppliers' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Data Pemasok</h3>
                        <Button onClick={onAddSupplier} size="sm"><Icon name="plus" className="w-4 h-4"/> Tambah Pemasok</Button>
                    </div>
                    <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-700 text-slate-200">
                                <tr>
                                    <th className="p-3">Nama</th>
                                    <th className="p-3">Kontak</th>
                                    <th className="p-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map(s => (
                                    <tr key={s.id} className="border-b border-slate-700 last:border-b-0">
                                        <td className="p-3 font-medium">{s.name}</td>
                                        <td className="p-3 text-slate-300">{s.contact || '-'}</td>
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => onEditSupplier(s)} className="text-[#52a37c] hover:text-[#7ac0a0]"><Icon name="edit" /></button>
                                                <button onClick={() => onDeleteSupplier(s.id)} className="text-red-500 hover:text-red-400"><Icon name="trash" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {suppliers.length === 0 && <p className="p-4 text-center text-slate-500">Belum ada pemasok.</p>}
                    </div>
                </div>
            )}

            {activeSection === 'purchases' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Riwayat Pembelian Stok</h3>
                        <Button onClick={onAddPurchase} size="sm"><Icon name="plus" className="w-4 h-4"/> Catat Pembelian</Button>
                    </div>
                    <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-700 text-slate-200">
                                <tr>
                                    <th className="p-3">Tanggal</th>
                                    <th className="p-3">Pemasok</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-right">Dibayar</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map(p => (
                                    <tr key={p.id} className="border-b border-slate-700 last:border-b-0">
                                        <td className="p-3 text-slate-400">{new Date(p.date).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3">{p.supplierName}</td>
                                        <td className="p-3 text-right font-medium">{CURRENCY_FORMATTER.format(p.totalAmount)}</td>
                                        <td className="p-3 text-right text-slate-300">{CURRENCY_FORMATTER.format(p.amountPaid)}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${p.status === 'lunas' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                                {p.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {purchases.length === 0 && <p className="p-4 text-center text-slate-500">Belum ada riwayat pembelian.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}


// --- Main Finance View ---
const FinanceView: React.FC = () => {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const [mainView, setMainView] = useState<'finance' | 'customers'>('finance');
    // Set default tab based on role: Admin -> Cashflow, Staff -> Expenses
    const [activeTab, setActiveTab] = useState<FinanceSubTab>(isAdmin ? 'cashflow' : 'expenses');
    
    const { products, rawMaterials } = useProduct();
    const { 
        expenses, addExpense, updateExpense, deleteExpense, addPaymentToExpense, 
        otherIncomes, addOtherIncome, updateOtherIncome, deleteOtherIncome,
        suppliers, addSupplier, updateSupplier, deleteSupplier,
        purchases, addPurchase, addPaymentToPurchase 
    } = useFinance();
    const { showAlert } = useUI();

    const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isIncomeModalOpen, setIncomeModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState<OtherIncome | null>(null);
    const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isPurchaseModalOpen, setPurchaseModalOpen] = useState(false);
    
    const [payingPurchase, setPayingPurchase] = useState<Purchase | null>(null);
    const [payingExpense, setPayingExpense] = useState<Expense | null>(null);

    // --- Expense Logic ---
    const handleSaveExpense = (data: Omit<Expense, 'id' | 'status'> | Expense) => {
        if ('id' in data) {
            updateExpense(data);
        } else {
            addExpense(data);
        }
        setExpenseModalOpen(false);
    };
    const handleDeleteExpense = (id: string) => {
        showAlert({
            type: 'confirm', title: 'Hapus Pengeluaran?', confirmVariant: 'danger',
            message: 'Anda yakin ingin menghapus catatan pengeluaran ini?',
            onConfirm: () => deleteExpense(id),
        });
    };
     const handlePayExpenseDebt = (amount: number) => {
        if(payingExpense) {
            addPaymentToExpense(payingExpense.id, amount);
        }
        setPayingExpense(null);
    }

    // --- Other Income Logic ---
    const handleSaveIncome = (data: Omit<OtherIncome, 'id'> | OtherIncome) => {
        if ('id' in data) {
            updateOtherIncome(data);
        } else {
            addOtherIncome(data);
        }
        setIncomeModalOpen(false);
    };
    const handleDeleteIncome = (id: string) => {
        showAlert({
            type: 'confirm', title: 'Hapus Pemasukan?', confirmVariant: 'danger',
            message: 'Anda yakin ingin menghapus catatan pemasukan ini?',
            onConfirm: () => deleteOtherIncome(id),
        });
    };

    // --- Supplier Logic ---
    const handleSaveSupplier = (data: Omit<Supplier, 'id'> | Supplier) => {
        if ('id' in data && data.id) {
            updateSupplier(data as Supplier);
        } else {
            addSupplier(data);
        }
        setSupplierModalOpen(false);
    };

    const handleDeleteSupplier = (id: string) => {
        showAlert({
            type: 'confirm', title: 'Hapus Pemasok?', confirmVariant: 'danger',
            message: 'Menghapus pemasok tidak akan menghapus riwayat pembelian terkait.',
            onConfirm: () => deleteSupplier(id),
        });
    }

    // --- Purchase Logic ---
    const handleSavePurchase = (data: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>) => {
        addPurchase(data);
        setPurchaseModalOpen(false);
    }
    const handlePayPurchaseDebt = (amount: number) => {
        if(payingPurchase) {
            addPaymentToPurchase(payingPurchase.id, amount);
        }
        setPayingPurchase(null);
    }
    
    const handleOpenPurchaseModal = () => {
        if (suppliers.length === 0) {
            showAlert({type: 'alert', title: 'Pemasok Kosong', message: 'Harap tambahkan data pemasok terlebih dahulu.'});
        } else if (rawMaterials.length === 0 && products.length === 0) {
            showAlert({type: 'alert', title: 'Item Kosong', message: 'Harap tambahkan bahan baku atau produk terlebih dahulu sebelum mencatat pembelian.'});
        } else {
            setPurchaseModalOpen(true);
        }
    }


    const SubTabButton: React.FC<{tab: FinanceSubTab, label: string}> = ({tab, label}) => (
        <button onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === tab ? 'text-[#52a37c] border-[#52a37c]' : 'text-slate-400 border-transparent hover:text-white'}`}>
            {label}
        </button>
    );
    
    const ExpenseStatusBadge: React.FC<{status: ExpenseStatus}> = ({status}) => {
        const info = {
            'lunas': { text: 'Lunas', className: 'bg-green-500/20 text-green-300' },
            'belum-lunas': { text: 'Belum Lunas', className: 'bg-yellow-500/20 text-yellow-300' }
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${info[status].className}`}>{info[status].text}</span>
    }

    const FinanceTabs = () => (
        <div className="space-y-6">
             <div className="border-b border-slate-700 flex flex-nowrap overflow-x-auto -mb-px">
                {/* Cash Flow Tab is strictly for Admins */}
                {isAdmin && <SubTabButton tab="cashflow" label="Arus Kas" />}
                <SubTabButton tab="other_income" label="Pemasukan Lain" />
                <SubTabButton tab="expenses" label="Pengeluaran" />
                <SubTabButton tab="purchasing" label="Pembelian & Pemasok" />
                <SubTabButton tab="debt-receivables" label="Utang & Piutang" />
            </div>
            
            {isAdmin && activeTab === 'cashflow' && <CashFlowTab />}
            {activeTab === 'debt-receivables' && <DebtReceivablesTab />}

            {activeTab === 'other_income' && (
                <div>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-xl font-bold">Daftar Pemasukan Lain</h2>
                        <Button onClick={() => {setEditingIncome(null); setIncomeModalOpen(true);}} className="w-full sm:w-auto">
                            <Icon name="plus" className="w-5 h-5" /> <span>Tambah Pemasukan</span>
                        </Button>
                    </div>
                     <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-700 text-slate-200">
                                <tr>
                                    <th className="p-3">Tanggal</th>
                                    <th className="p-3">Deskripsi</th>
                                    <th className="p-3">Kategori</th>
                                    <th className="p-3 text-right">Jumlah</th>
                                    <th className="p-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {otherIncomes.map(i => (
                                    <tr key={i.id} className="border-b border-slate-700 last:border-b-0">
                                        <td className="p-3 text-slate-400">{new Date(i.date).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3">{i.description}</td>
                                        <td className="p-3 text-slate-300">{i.category}</td>
                                        <td className="p-3 text-right font-semibold text-green-400">{CURRENCY_FORMATTER.format(i.amount)}</td>
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => {setEditingIncome(i); setIncomeModalOpen(true);}} className="text-[#52a37c] hover:text-[#7ac0a0]"><Icon name="edit" /></button>
                                                <button onClick={() => handleDeleteIncome(i.id)} className="text-red-500 hover:text-red-400"><Icon name="trash" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {otherIncomes.length === 0 && <p className="p-4 text-center text-slate-500">Belum ada pemasukan lain tercatat.</p>}
                     </div>
                </div>
            )}

            {activeTab === 'expenses' && (
                <div>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-xl font-bold">Daftar Pengeluaran</h2>
                        <Button onClick={() => {setEditingExpense(null); setExpenseModalOpen(true);}} className="w-full sm:w-auto">
                            <Icon name="plus" className="w-5 h-5" /> <span>Tambah Pengeluaran</span>
                        </Button>
                    </div>
                     <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-700 text-slate-200">
                                <tr>
                                    <th className="p-3">Tanggal</th>
                                    <th className="p-3">Deskripsi</th>
                                    <th className="p-3">Kategori</th>
                                    <th className="p-3 text-right">Jumlah</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(e => (
                                    <tr key={e.id} className="border-b border-slate-700 last:border-b-0">
                                        <td className="p-3 text-slate-400">{new Date(e.date).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3">{e.description}</td>
                                        <td className="p-3 text-slate-300">{e.category}</td>
                                        <td className="p-3 text-right font-semibold">{CURRENCY_FORMATTER.format(e.amount)}</td>
                                        <td className="p-3"><ExpenseStatusBadge status={e.status} /></td>
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => {setEditingExpense(e); setExpenseModalOpen(true);}} className="text-[#52a37c] hover:text-[#7ac0a0]"><Icon name="edit" /></button>
                                                <button onClick={() => handleDeleteExpense(e.id)} className="text-red-500 hover:text-red-400"><Icon name="trash" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {expenses.length === 0 && <p className="p-4 text-center text-slate-500">Belum ada pengeluaran tercatat.</p>}
                     </div>
                </div>
            )}
            
            {activeTab === 'purchasing' && <PurchasesAndSuppliersTab 
                onAddSupplier={() => {setEditingSupplier(null); setSupplierModalOpen(true);}}
                onEditSupplier={(s) => {setEditingSupplier(s); setSupplierModalOpen(true);}}
                onDeleteSupplier={handleDeleteSupplier}
                onAddPurchase={handleOpenPurchaseModal}
            />}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Keuangan & Pelanggan</h1>
                <div className="flex bg-slate-800 p-1 rounded-lg">
                    <button onClick={() => setMainView('finance')} className={`px-4 py-2 text-sm rounded-md transition-colors ${mainView === 'finance' ? 'bg-[#347758] text-white' : 'text-slate-400'}`}>
                        Keuangan
                    </button>
                    <button onClick={() => setMainView('customers')} className={`px-4 py-2 text-sm rounded-md transition-colors ${mainView === 'customers' ? 'bg-[#347758] text-white' : 'text-slate-400'}`}>
                        Pelanggan
                    </button>
                </div>
            </div>

            {mainView === 'finance' && <FinanceTabs />}
            {mainView === 'customers' && <CustomersTab />}

            <ExpenseFormModal 
                isOpen={isExpenseModalOpen} 
                onClose={() => setExpenseModalOpen(false)} 
                onSave={handleSaveExpense} 
                expense={editingExpense} 
            />
            <OtherIncomeFormModal
                isOpen={isIncomeModalOpen}
                onClose={() => setIncomeModalOpen(false)}
                onSave={handleSaveIncome}
                income={editingIncome}
            />
            <SupplierFormModal
                isOpen={isSupplierModalOpen}
                onClose={() => setSupplierModalOpen(false)}
                onSave={handleSaveSupplier}
                supplier={editingSupplier}
            />
            <PurchaseFormModal
                isOpen={isPurchaseModalOpen}
                onClose={() => setPurchaseModalOpen(false)}
                onSave={handleSavePurchase}
            />
        </div>
    );
};

export default FinanceView;

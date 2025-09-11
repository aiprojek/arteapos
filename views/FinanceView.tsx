
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Expense, Supplier, Purchase, PurchaseItem, PurchaseStatus, RawMaterial, Transaction, PaymentMethod, ExpenseStatus, Customer } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import { CURRENCY_FORMATTER } from '../constants';
import UpdatePaymentModal from '../components/UpdatePaymentModal';

type FinanceSubTab = 'cashflow' | 'expenses' | 'purchasing' | 'debt-receivables';
type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

const StatCard: React.FC<{title: string; value: string | number; className?: string}> = ({title, value, className}) => (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-md ${className}`}>
        <h3 className="text-slate-400 text-sm">{title}</h3>
        <p className="text-2xl font-bold text-white">{typeof value === 'number' ? CURRENCY_FORMATTER.format(value) : value}</p>
    </div>
);

// --- Cash Flow Tab ---
const CashFlowTab: React.FC = () => {
    const { transactions, expenses, purchases } = useAppContext();
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

        const filteredTransactions = transactions.filter(t => filterPredicate(t.createdAt));
        const filteredExpenses = expenses.filter(e => filterPredicate(e.date));
        const filteredPurchases = purchases.filter(p => filterPredicate(p.date));

        const totalIncome = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
        const totalOpEx = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalExpenses = totalOpEx + totalPurchases;
        const netCashFlow = totalIncome - totalExpenses;

        const combinedFlow = [
            ...filteredTransactions.map(t => ({ type: 'Pemasukan', date: t.createdAt, description: `Penjualan #${t.id.slice(-4)}`, amount: t.total })),
            ...filteredExpenses.map(e => ({ type: 'Pengeluaran', date: e.date, description: e.description, amount: -e.amount })),
            ...filteredPurchases.map(p => ({ type: 'Pengeluaran', date: p.date, description: `Pembelian dari ${p.supplierName}`, amount: -p.totalAmount }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { totalIncome, totalExpenses, netCashFlow, combinedFlow };
    }, [filter, transactions, expenses, purchases, customStartDate, customEndDate]);
    
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
                    <table className="w-full text-left">
                        <thead className="bg-slate-700">
                             <tr>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Deskripsi</th>
                                <th className="p-3 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.combinedFlow.map((item, index) => (
                                <tr key={index} className="border-b border-slate-700 last:border-b-0">
                                    <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3">{item.description}</td>
                                    <td className={`p-3 text-right font-semibold ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {CURRENCY_FORMATTER.format(item.amount)}
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

// --- Debt & Receivables Tab ---
const DebtReceivablesTab: React.FC = () => {
    const { transactions, purchases, expenses, addPaymentToTransaction, addPaymentToPurchase, addPaymentToExpense } = useAppContext();
    const [subTab, setSubTab] = useState<'receivables' | 'payables' | 'expense_payables'>('receivables');
    const [updatingTransaction, setUpdatingTransaction] = useState<Transaction | null>(null);
    const [payingPurchase, setPayingPurchase] = useState<Purchase | null>(null);
    const [payingExpense, setPayingExpense] = useState<Expense | null>(null);

    const receivables = useMemo(() => transactions.filter(t => t.paymentStatus === 'partial' || t.paymentStatus === 'unpaid').sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [transactions]);
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
                         <table className="w-full text-left">
                            <thead className="bg-slate-700">
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
                        <table className="w-full text-left">
                           <thead className="bg-slate-700">
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
                                       <td className="p-3 font-semibold">{p.supplierName}</td>
                                       <td className="p-3 text-right">{CURRENCY_FORMATTER.format(p.totalAmount)}</td>
                                       <td className="p-3 text-right font-semibold text-red-400">{CURRENCY_FORMATTER.format(p.totalAmount - p.amountPaid)}</td>
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
                        <table className="w-full text-left">
                           <thead className="bg-slate-700">
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

const CustomerFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Omit<Customer, 'id' | 'memberId' | 'points' | 'createdAt'> | Customer) => void;
    customer: Customer | null;
}> = ({ isOpen, onClose, onSave, customer }) => {
    const [form, setForm] = useState({ name: '', contact: '' });
    useEffect(() => {
        if (customer) {
            setForm({ name: customer.name, contact: customer.contact || '' });
        } else {
            setForm({ name: '', contact: '' });
        }
    }, [customer, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(customer) {
            onSave({ ...customer, ...form });
        } else {
            onSave(form);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={customer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nama Pelanggan</label>
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Kontak (No. HP/Email)</label>
                    <input type="text" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} placeholder="Opsional" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    )
}

const CustomersTab: React.FC = () => {
    const { customers, addCustomer, updateCustomer, deleteCustomer } = useAppContext();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = useMemo(() =>
        customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.contact?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    , [customers, searchTerm]);

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
                <table className="w-full text-left">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="p-3">Nama</th>
                            <th className="p-3">ID Anggota</th>
                            <th className="p-3">Kontak</th>
                            <th className="p-3 text-right">Poin</th>
                            <th className="p-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(c => (
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
                {customers.length === 0 && <p className="p-4 text-center text-slate-500">Belum ada pelanggan terdaftar.</p>}
             </div>
             <CustomerFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} customer={editingCustomer} />
        </div>
    )
}


// --- Main Finance View ---
const FinanceView: React.FC = () => {
    const [mainView, setMainView] = useState<'finance' | 'customers'>('finance');
    const [activeTab, setActiveTab] = useState<FinanceSubTab>('cashflow');
    const { expenses, addExpense, updateExpense, deleteExpense, showAlert, addPaymentToExpense } = useAppContext();
    const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useAppContext();
    const { purchases, addPurchase, addPaymentToPurchase, rawMaterials } = useAppContext();

    const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
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
        } else if (rawMaterials.length === 0) {
            showAlert({type: 'alert', title: 'Bahan Baku Kosong', message: 'Harap tambahkan bahan baku di halaman "Bahan Baku" (di menu "Produk") sebelum mencatat pembelian.'});
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
                <SubTabButton tab="cashflow" label="Arus Kas" />
                <SubTabButton tab="debt-receivables" label="Utang & Piutang" />
                <SubTabButton tab="expenses" label="Pengeluaran" />
                <SubTabButton tab="purchasing" label="Pembelian & Pemasok" />
            </div>
            
            {activeTab === 'cashflow' && <CashFlowTab />}
            {activeTab === 'debt-receivables' && <DebtReceivablesTab />}

            {activeTab === 'expenses' && (
                <div>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-xl font-bold">Daftar Pengeluaran</h2>
                        <Button onClick={() => {setEditingExpense(null); setExpenseModalOpen(true);}} className="w-full sm:w-auto">
                            <Icon name="plus" className="w-5 h-5" /> <span>Tambah Pengeluaran</span>
                        </Button>
                    </div>
                     <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-700">
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
                onAddSupplier={() => {setEditingSupplier(null); setSupplierModalOpen(true)}}
                onEditSupplier={(s) => {setEditingSupplier(s); setSupplierModalOpen(true)}}
                onDeleteSupplier={handleDeleteSupplier}
                onAddPurchase={handleOpenPurchaseModal}
                onPayDebt={(p) => setPayingPurchase(p)}
            />}
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex bg-slate-800 p-1 rounded-lg">
                <button onClick={() => setMainView('finance')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mainView === 'finance' ? 'bg-[#347758] text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                    Keuangan
                </button>
                 <button onClick={() => setMainView('customers')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mainView === 'customers' ? 'bg-[#347758] text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                    Pelanggan
                </button>
            </div>
            
            {mainView === 'finance' ? <FinanceTabs /> : <CustomersTab />}

            {/* Modals */}
            <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setExpenseModalOpen(false)} onSave={handleSaveExpense} expense={editingExpense} />
            <SupplierModal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} onSave={handleSaveSupplier} supplier={editingSupplier} />
            <PurchaseModal isOpen={isPurchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} onSave={handleSavePurchase} suppliers={suppliers} rawMaterials={rawMaterials} />
            {payingPurchase && <PayDebtModal isOpen={!!payingPurchase} onClose={() => setPayingPurchase(null)} onSave={handlePayPurchaseDebt} purchase={payingPurchase} />}
            {payingExpense && <PayExpenseDebtModal isOpen={!!payingExpense} onClose={() => setPayingExpense(null)} onSave={handlePayExpenseDebt} expense={payingExpense} />}
        </div>
    );
};

// --- Sub-View for Purchasing ---
const PurchasesAndSuppliersTab: React.FC<{
    onAddSupplier: () => void,
    onEditSupplier: (s: Supplier) => void,
    onDeleteSupplier: (id: string) => void,
    onAddPurchase: () => void,
    onPayDebt: (p: Purchase) => void,
}> = (props) => {
    const [subTab, setSubTab] = useState<'purchases' | 'suppliers'>('purchases');
    const { suppliers, purchases } = useAppContext();

    const PurchaseStatusBadge: React.FC<{status: PurchaseStatus}> = ({status}) => {
        const info = {
            'lunas': { text: 'Lunas', className: 'bg-green-500/20 text-green-300' },
            'belum-lunas': { text: 'Belum Lunas', className: 'bg-yellow-500/20 text-yellow-300' }
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${info[status].className}`}>{info[status].text}</span>
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex bg-slate-700 p-1 rounded-lg w-full sm:w-auto">
                    <button onClick={() => setSubTab('purchases')} className={`flex-1 text-center sm:flex-none px-3 py-1 text-sm rounded-md transition-colors ${subTab === 'purchases' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>
                        <span className="sm:hidden">Pembelian</span>
                        <span className="hidden sm:inline">Daftar Pembelian</span>
                    </button>
                    <button onClick={() => setSubTab('suppliers')} className={`flex-1 text-center sm:flex-none px-3 py-1 text-sm rounded-md transition-colors ${subTab === 'suppliers' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>
                        <span className="sm:hidden">Pemasok</span>
                        <span className="hidden sm:inline">Daftar Pemasok</span>
                    </button>
                </div>
                <Button onClick={subTab === 'purchases' ? props.onAddPurchase : props.onAddSupplier} className="w-full sm:w-auto">
                    <Icon name="plus" className="w-5 h-5" /> <span>{subTab === 'purchases' ? 'Catat Pembelian' : 'Tambah Pemasok'}</span>
                </Button>
            </div>


            <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                {subTab === 'purchases' ? (
                     <table className="w-full text-left">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Pemasok</th>
                                <th className="p-3 text-right">Total Tagihan</th>
                                <th className="p-3 text-right">Dibayar</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map(p => (
                                <tr key={p.id} className="border-b border-slate-700 last:border-b-0">
                                    <td className="p-3 text-slate-400">{new Date(p.date).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3 font-semibold">{p.supplierName}</td>
                                    <td className="p-3 text-right">{CURRENCY_FORMATTER.format(p.totalAmount)}</td>
                                    <td className="p-3 text-right">{CURRENCY_FORMATTER.format(p.amountPaid)}</td>
                                    <td className="p-3"><PurchaseStatusBadge status={p.status} /></td>
                                    <td className="p-3">
                                        {p.status === 'belum-lunas' && <Button size="sm" onClick={() => props.onPayDebt(p)}>Bayar Utang</Button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                ) : (
                     <table className="w-full text-left">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="p-3">Nama Pemasok</th>
                                <th className="p-3">Kontak</th>
                                <th className="p-3">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                             {suppliers.map(s => (
                                <tr key={s.id} className="border-b border-slate-700 last:border-b-0">
                                    <td className="p-3 font-semibold">{s.name}</td>
                                    <td className="p-3 text-slate-300">{s.contact || '-'}</td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => props.onEditSupplier(s)} className="text-[#52a37c] hover:text-[#7ac0a0]"><Icon name="edit" /></button>
                                            <button onClick={() => props.onDeleteSupplier(s.id)} className="text-red-500 hover:text-red-400"><Icon name="trash" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                )}
                 {subTab === 'purchases' && purchases.length === 0 && <p className="p-4 text-center text-slate-500">Belum ada pembelian tercatat.</p>}
                 {subTab === 'suppliers' && suppliers.length === 0 && <p className="p-4 text-center text-slate-500">Belum ada pemasok terdaftar.</p>}
            </div>
        </div>
    );
}

// --- Modals and Forms ---
const ExpenseModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (data: Omit<Expense, 'id' | 'status'> | Expense) => void, expense: Expense | null}> = ({isOpen, onClose, onSave, expense}) => {
    const [form, setForm] = useState({description: '', amount: '', amountPaid: '', category: '', date: new Date().toISOString().split('T')[0]});
    useEffect(() => {
        if(expense) setForm({description: expense.description, amount: String(expense.amount), amountPaid: String(expense.amountPaid), category: expense.category, date: new Date(expense.date).toISOString().split('T')[0]});
        else setForm({description: '', amount: '', amountPaid: '', category: '', date: new Date().toISOString().split('T')[0]});
    }, [expense, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const totalAmount = parseFloat(form.amount) || 0;
        const paidAmount = form.amountPaid ? (parseFloat(form.amountPaid) || 0) : totalAmount;

        const expenseData = { 
            description: form.description,
            amount: totalAmount,
            amountPaid: paidAmount,
            category: form.category,
            date: new Date(form.date).toISOString()
        };
        
        if (expense?.id) {
            onSave({ ...expenseData, id: expense.id, status: expense.status });
        } else {
            onSave(expenseData);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="date" name="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="text" name="description" placeholder="Deskripsi (cth: Bayar Listrik)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="text" name="category" placeholder="Kategori (cth: Operasional)" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="number" name="amount" placeholder="Total Tagihan (IDR)" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="number" name="amountPaid" placeholder="Jumlah Dibayar (kosongkan jika lunas)" value={form.amountPaid} onChange={e => setForm({...form, amountPaid: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    )
}

const SupplierModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (data: Omit<Supplier, 'id'> | Supplier) => void, supplier: Supplier | null}> = ({isOpen, onClose, onSave, supplier}) => {
    const [form, setForm] = useState({name: '', contact: ''});
    useEffect(() => {
        if(supplier) setForm({name: supplier.name, contact: supplier.contact || ''});
        else setForm({name: '', contact: ''});
    }, [supplier, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Check if we are editing or creating a new one
        if (supplier && supplier.id) {
            onSave({ ...form, id: supplier.id });
        } else {
            // Ensure we don't send an 'id' property for new entries
            onSave(form);
        }
    }

     return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? 'Edit Pemasok' : 'Tambah Pemasok'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" placeholder="Nama Pemasok" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="text" name="contact" placeholder="Kontak (No. HP/Email, opsional)" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    )
}

const PurchaseModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (data: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>) => void, suppliers: Supplier[], rawMaterials: RawMaterial[]}> = (props) => {
    const [form, setForm] = useState<{supplierId: string, items: PurchaseItem[], amountPaid: number, date: string}>({supplierId: props.suppliers[0]?.id || '', items: [], amountPaid: 0, date: new Date().toISOString().split('T')[0]});
    
    useEffect(() => {
        if(props.isOpen && props.rawMaterials.length > 0) {
            setForm({supplierId: props.suppliers[0]?.id || '', items: [{rawMaterialId: props.rawMaterials[0]?.id || '', quantity: 0, price: 0}], amountPaid: 0, date: new Date().toISOString().split('T')[0]});
        } else if (props.isOpen) {
            setForm({supplierId: props.suppliers[0]?.id || '', items: [], amountPaid: 0, date: new Date().toISOString().split('T')[0]});
        }
    }, [props.isOpen, props.suppliers, props.rawMaterials]);

    const handleItemChange = (index: number, field: keyof PurchaseItem, value: string | number) => {
        const newItems = [...form.items];
        (newItems[index] as any)[field] = value;
        setForm({...form, items: newItems});
    };
    const addItem = () => setForm({...form, items: [...form.items, {rawMaterialId: props.rawMaterials[0]?.id, quantity: 0, price: 0}]});
    const removeItem = (index: number) => setForm({...form, items: form.items.filter((_, i) => i !== index)});
    
    const total = useMemo(() => form.items.reduce((sum, i) => sum + (i.price * i.quantity), 0), [form.items]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        props.onSave(form);
    };

    return (
        <Modal isOpen={props.isOpen} onClose={props.onClose} title="Catat Pembelian Baru">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Tanggal Pembelian</label>
                    <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Pilih Pemasok</label>
                    <select value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                        {props.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                
                {props.rawMaterials.length === 0 ? (
                    <div className="text-center p-4 bg-slate-900 rounded-lg border border-yellow-500/30">
                        <p className="font-semibold text-yellow-400">Tidak Ada Bahan Baku</p>
                        <p className="text-sm text-slate-400 mt-1">
                            Anda harus menambahkan bahan baku terlebih dahulu di halaman "Bahan Baku" sebelum dapat mencatat item pembelian.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                             <div className="grid grid-cols-[1fr,80px,112px,32px] gap-2 px-2 text-xs text-slate-400 font-semibold mb-1">
                                <div><label>Nama Item</label></div>
                                <div><label>Jumlah</label></div>
                                <div><label>Harga/Unit</label></div>
                            </div>
                            {form.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-[1fr,80px,112px,32px] gap-2 items-center bg-slate-900 p-2 rounded-md">
                                    <select value={item.rawMaterialId} onChange={e => handleItemChange(index, 'rawMaterialId', e.target.value)} className="flex-1 bg-slate-700 p-1.5 rounded text-sm w-full">
                                        {props.rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <input type="number" placeholder="Jml" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-slate-700 p-1.5 rounded text-sm" />
                                    <input type="number" placeholder="Harga/unit" value={item.price} onChange={e => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)} className="w-full bg-slate-700 p-1.5 rounded text-sm" />
                                    <Button type="button" size="sm" variant="danger" onClick={() => removeItem(index)}><Icon name="trash" className="w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={addItem}>Tambah Item</Button>
                    </>
                )}
                
                <div className="pt-4 border-t border-slate-700 space-y-2">
                    <div className="flex justify-between font-bold text-lg"><span>Total Tagihan:</span><span>{CURRENCY_FORMATTER.format(total)}</span></div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Jumlah Dibayar</label>
                        <input type="number" placeholder="Jumlah Dibayar (IDR)" value={form.amountPaid} onChange={e => setForm({...form, amountPaid: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={props.onClose}>Batal</Button>
                    <Button type="submit" disabled={props.rawMaterials.length === 0}>Simpan Pembelian</Button>
                </div>
            </form>
        </Modal>
    );
}

const PayDebtModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (amount: number) => void, purchase: Purchase}> = ({isOpen, onClose, onSave, purchase}) => {
    const [amount, setAmount] = useState('');
    const remaining = purchase.totalAmount - purchase.amountPaid;

    const handleSubmit = () => {
        const payAmount = parseFloat(amount);
        if (!isNaN(payAmount) && payAmount > 0) {
            onSave(payAmount);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setAmount('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Bayar Utang ke ${purchase.supplierName}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-700 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Total Utang</p>
                        <p className="text-lg font-bold text-red-400">{CURRENCY_FORMATTER.format(remaining)}</p>
                    </div>
                    <div className="bg-slate-700 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Total Tagihan</p>
                        <p className="text-lg font-bold text-slate-200">{CURRENCY_FORMATTER.format(purchase.totalAmount)}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Jumlah Pembayaran</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                        autoFocus
                    />
                    <button onClick={() => setAmount(remaining.toString())} className="text-xs text-sky-400 hover:text-sky-300 mt-2">Bayar Lunas</button>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="button" onClick={handleSubmit} disabled={!amount}>Simpan Pembayaran</Button>
                </div>
            </div>
        </Modal>
    );
};

const PayExpenseDebtModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (amount: number) => void, expense: Expense}> = ({isOpen, onClose, onSave, expense}) => {
    const [amount, setAmount] = useState('');
    const remaining = expense.amount - expense.amountPaid;

    const handleSubmit = () => {
        const payAmount = parseFloat(amount);
        if (!isNaN(payAmount) && payAmount > 0) {
            onSave(payAmount);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setAmount('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Bayar Utang: ${expense.description}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-700 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Total Utang</p>
                        <p className="text-lg font-bold text-red-400">{CURRENCY_FORMATTER.format(remaining)}</p>
                    </div>
                    <div className="bg-slate-700 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Total Tagihan</p>
                        <p className="text-lg font-bold text-slate-200">{CURRENCY_FORMATTER.format(expense.amount)}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Jumlah Pembayaran</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                        autoFocus
                    />
                    <button onClick={() => setAmount(remaining.toString())} className="text-xs text-sky-400 hover:text-sky-300 mt-2">Bayar Lunas</button>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="button" onClick={handleSubmit} disabled={!amount}>Simpan Pembayaran</Button>
                </div>
            </div>
        </Modal>
    );
};

export default FinanceView;

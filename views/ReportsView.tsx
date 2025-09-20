import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { CURRENCY_FORMATTER } from '../constants';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Transaction, PaymentMethod } from '../types';
import ReceiptModal from '../components/ReceiptModal';
import Modal from '../components/Modal';
import UpdatePaymentModal from '../components/UpdatePaymentModal';


type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';
type ReportScope = 'session' | 'historical';

const StatCard: React.FC<{title: string; value: string; className?: string}> = ({title, value, className}) => (
    <div className={`bg-slate-800 p-4 rounded-lg ${className}`}>
        <h3 className="text-slate-400 text-sm">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
    </div>
);

const EndSessionModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    sessionSales: number,
    startingCash: number,
}> = ({ isOpen, onClose, sessionSales, startingCash }) => {
    const { endSession } = useAppContext();
    const [step, setStep] = useState(1);
    const [finalCashInput, setFinalCashInput] = useState('');

    const expectedCash = startingCash + sessionSales;
    const finalCashAmount = parseFloat(finalCashInput) || 0;
    const difference = finalCashAmount - expectedCash;

    const handleProceed = () => {
        if (finalCashInput) {
            setStep(2);
        }
    }

    const handleConfirmEnd = () => {
        endSession();
        onClose();
    }
    
    const handleClose = () => {
        setStep(1);
        setFinalCashInput('');
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Tutup Sesi Penjualan">
            {step === 1 && (
                <div className="space-y-4">
                     <p className="text-slate-300">Hitung semua uang tunai di laci kasir dan masukkan jumlah totalnya di bawah ini.</p>
                     <div>
                        <label htmlFor="finalCash" className="block text-sm font-medium text-slate-300 mb-1">Jumlah Uang di Laci (Dihitung)</label>
                        <input
                            id="finalCash"
                            type="number"
                            value={finalCashInput}
                            onChange={(e) => setFinalCashInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                            placeholder="0"
                        />
                    </div>
                    <Button onClick={handleProceed} disabled={!finalCashInput} className="w-full py-3">
                        Lanjutkan ke Ringkasan
                    </Button>
                </div>
            )}
            {step === 2 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white text-center">Ringkasan Sesi</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Modal Awal</span>
                            <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(startingCash)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Total Penjualan Tunai</span>
                             <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(sessionSales)}</span>
                        </div>
                         <div className="flex justify-between p-2 bg-slate-900 rounded-md font-bold border-t-2 border-slate-700">
                            <span className="text-slate-300">Uang di Laci Seharusnya</span>
                             <span className="text-white">{CURRENCY_FORMATTER.format(expectedCash)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-700 rounded-md">
                            <span className="text-slate-300">Uang di Laci (Dihitung)</span>
                            <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(finalCashAmount)}</span>
                        </div>
                        <div className={`flex justify-between p-3 rounded-md font-bold text-lg
                            ${difference === 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            <span>Selisih</span>
                            <span>{CURRENCY_FORMATTER.format(difference)}</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 text-center">Pastikan semua data sudah benar sebelum mengakhiri sesi. Tindakan ini tidak dapat diurungkan.</p>
                     <Button onClick={handleConfirmEnd} variant="primary" className="w-full py-3">
                        Konfirmasi & Tutup Sesi
                    </Button>
                </div>
            )}
        </Modal>
    );
}

const PaymentStatusBadge: React.FC<{ status: Transaction['paymentStatus'] }> = ({ status }) => {
    const statusInfo = {
        paid: { text: 'Lunas', className: 'bg-green-500/20 text-green-300' },
        partial: { text: 'Kurang Bayar', className: 'bg-yellow-500/20 text-yellow-300' },
        unpaid: { text: 'Belum Bayar', className: 'bg-red-500/20 text-red-300' },
    };
    const { text, className } = statusInfo[status] || { text: 'Unknown', className: 'bg-slate-500/20 text-slate-300' };

    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>{text}</span>;
};

const ReportsView: React.FC = () => {
    const { transactions, inventorySettings, session, startSession, sessionSettings, addPaymentToTransaction } = useAppContext();
    const [filter, setFilter] = useState<TimeFilter>('today');
    const [reportScope, setReportScope] = useState<ReportScope>('session');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [updatingTransaction, setUpdatingTransaction] = useState<Transaction | null>(null);
    const [isStartSessionModalOpen, setStartSessionModalOpen] = useState(false);
    const [isEndSessionModalOpen, setEndSessionModalOpen] = useState(false);
    const [startingCashInput, setStartingCashInput] = useState('');
    const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isFilterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    const handleStartSession = () => {
        startSession(parseFloat(startingCashInput) || 0);
        setStartSessionModalOpen(false);
        setStartingCashInput('');
    }
    
    useEffect(() => {
        // Automatically switch to historical view if session mode is on but no session is active.
        if (sessionSettings.enabled && !session) {
          setReportScope('historical');
        }
    }, [session, sessionSettings.enabled]);
    
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
    
    const isSessionMode = sessionSettings.enabled && session;

    const filteredTransactions = useMemo(() => {
        if (isSessionMode && reportScope === 'session') {
            return transactions.filter(t => new Date(t.createdAt) >= new Date(session.startTime));
        }
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return transactions.filter(t => {
            const tDate = new Date(t.createdAt);
            switch (filter) {
                case 'today':
                    return tDate >= today;
                case 'week':
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    return tDate >= weekStart;
                case 'month':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    return tDate >= monthStart;
                case 'custom': {
                    if (!customStartDate || !customEndDate) return true;
                    const start = new Date(customStartDate);
                    start.setHours(0, 0, 0, 0); // Start of the selected day
                    const end = new Date(customEndDate);
                    end.setHours(23, 59, 59, 999); // End of the selected day
                    return tDate >= start && tDate <= end;
                }
                case 'all':
                default:
                    return true;
            }
        });
    }, [transactions, filter, session, isSessionMode, reportScope, customStartDate, customEndDate]);

    const reportData = useMemo(() => {
        let totalSales = 0;
        let totalProfit = 0;
        const salesByHour = Array(24).fill(0);
        const productSales = new Map<string, {name: string, quantity: number, revenue: number}>();
        
        filteredTransactions.forEach(t => {
            totalSales += t.total;
            const hour = new Date(t.createdAt).getHours();
            salesByHour[hour] += t.total;

            let transactionCost = 0;
            t.items.forEach(item => {
                if (item.costPrice) {
                    transactionCost += (item.costPrice * item.quantity);
                }
                const existing = productSales.get(item.id) || { name: item.name, quantity: 0, revenue: 0 };
                productSales.set(item.id, {
                    name: item.name,
                    quantity: existing.quantity + item.quantity,
                    revenue: existing.revenue + (item.price * item.quantity),
                });
            });
            totalProfit += t.total - transactionCost;
        });

        const bestSellingProducts = Array.from(productSales.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        const hourlyChartData = salesByHour.map((total, hour) => ({
            name: `${hour.toString().padStart(2, '0')}:00`,
            total,
        }));

        return {
            totalSales,
            totalProfit,
            totalTransactions: filteredTransactions.length,
            avgTransaction: filteredTransactions.length > 0 ? totalSales / filteredTransactions.length : 0,
            profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
            bestSellingProducts,
            hourlyChartData
        };
    }, [filteredTransactions]);


    const salesOverTimeData = useMemo(() => {
        const salesMap = new Map<string, number>();
        filteredTransactions.forEach(t => {
            const dateKey = new Date(t.createdAt).toISOString().split('T')[0];
            salesMap.set(dateKey, (salesMap.get(dateKey) || 0) + t.total);
        });

        return Array.from(salesMap.entries())
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, total]) => ({
                name: new Date(date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
                total,
            }));
    }, [filteredTransactions]);

    const categorySalesData = useMemo(() => {
        const categoryMap = new Map<string, number>();
        filteredTransactions.forEach(t => {
            t.items.forEach(item => {
                // FIX: A product's category is a string array (string[]).
                // The previous code incorrectly tried to use the array as a map key.
                // This now iterates over each category for a product.
                // Added Array.isArray for extra safety.
                const categories = (item.category && Array.isArray(item.category) && item.category.length > 0) ? item.category : ['Uncategorized'];
                categories.forEach(cat => {
                    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.price * item.quantity));
                });
            });
        });
        return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredTransactions]);

    const PIE_COLORS = ['#347758', '#6366f1', '#ec4899', '#f97316', '#10b981', '#facc15'];
    
    const exportReport = () => {
        const headers = 'Transaction ID,Date,Time,Total,Items,Cashier';
        const rows = filteredTransactions.map(t => {
            const date = new Date(t.createdAt);
            const items = t.items.map(i => `${i.name} (x${i.quantity})`).join('; ');
            return `${t.id},${date.toLocaleDateString()},${date.toLocaleTimeString()},${t.total},"${items}","${t.userName}"`;
        });
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_report_${isSessionMode ? reportScope : filter}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const showSessionView = sessionSettings.enabled && reportScope === 'session';
    
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

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-4">
                     <div>
                         <h1 className="text-2xl font-bold text-white">{showSessionView && session ? 'Laporan Sesi Saat Ini' : 'Laporan Penjualan'}</h1>
                         {showSessionView && session && (
                            <p className="text-sm text-slate-400">Dimulai pada {new Date(session.startTime).toLocaleString('id-ID')}</p>
                         )}
                    </div>
                     <div className="flex gap-2 items-center flex-wrap justify-end">
                        {sessionSettings.enabled && (
                            <div className="flex bg-slate-700 p-1 rounded-lg">
                                <button onClick={() => setReportScope('session')} className={`px-3 py-1 text-sm rounded-md transition-colors ${reportScope === 'session' ? 'bg-[#347758] text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
                                    Sesi Saat Ini
                                </button>
                                <button onClick={() => setReportScope('historical')} className={`px-3 py-1 text-sm rounded-md transition-colors ${reportScope === 'historical' ? 'bg-[#347758] text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
                                    Semua Laporan
                                </button>
                            </div>
                        )}
                        
                        {(!sessionSettings.enabled || reportScope === 'historical') && (
                            <div className="relative" ref={filterDropdownRef}>
                                <Button variant="secondary" size="sm" onClick={() => setFilterDropdownOpen(prev => !prev)}>
                                    Filter: {filterLabels[filter]}
                                    <svg className={`w-4 h-4 ml-1 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </Button>
                                {isFilterDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-slate-700 rounded-lg shadow-xl z-10">
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
                        )}
                        
                        <Button onClick={exportReport} variant="secondary" size="sm" disabled={filteredTransactions.length === 0}>
                            <Icon name="download" className="w-4 h-4"/>
                        </Button>

                        {sessionSettings.enabled && !session && (
                            <Button onClick={() => setStartSessionModalOpen(true)} variant="primary" size="sm">
                                <Icon name="plus" className="w-4 h-4"/>
                                Mulai Sesi
                            </Button>
                        )}
                        {isSessionMode && (
                             <Button onClick={() => setEndSessionModalOpen(true)} variant="danger" size="sm">
                                Tutup Sesi
                            </Button>
                        )}
                    </div>
                </div>
                
                {(!sessionSettings.enabled || reportScope === 'historical') && filter === 'custom' && (
                    <div className="w-full flex flex-col sm:flex-row gap-4 items-center justify-end bg-slate-800 p-3 rounded-lg">
                        <div>
                            <label htmlFor="startDate" className="text-sm text-slate-400 mr-2">Dari Tanggal:</label>
                            <input
                                id="startDate"
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="text-sm text-slate-400 mr-2">Sampai Tanggal:</label>
                            <input
                                id="endDate"
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className={`grid grid-cols-2 ${inventorySettings.enabled ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
                 {showSessionView && session ? (
                    <>
                        <StatCard title="Modal Awal" value={CURRENCY_FORMATTER.format(session.startingCash)} />
                        <StatCard title="Penjualan Sesi" value={CURRENCY_FORMATTER.format(reportData.totalSales)} />
                        <StatCard title="Uang di Laci Seharusnya" value={CURRENCY_FORMATTER.format(session.startingCash + reportData.totalSales)} className="bg-[#347758]/20" />
                        {inventorySettings.enabled && <StatCard title="Laba Sesi" value={CURRENCY_FORMATTER.format(reportData.totalProfit)} />}
                    </>
                ) : (
                    <>
                        <StatCard title="Total Penjualan" value={CURRENCY_FORMATTER.format(reportData.totalSales)} />
                        <StatCard title="Total Transaksi" value={reportData.totalTransactions.toString()} />
                        <StatCard title="Rata-rata/Transaksi" value={CURRENCY_FORMATTER.format(reportData.avgTransaction)} />
                        {inventorySettings.enabled && <StatCard title="Total Laba" value={CURRENCY_FORMATTER.format(reportData.totalProfit)} />}
                    </>
                )}
            </div>

            {sessionSettings.enabled && !session && reportScope === 'session' ? (
                 <div className="text-center py-12 bg-slate-800 rounded-lg">
                    <Icon name="reports" className="w-12 h-12 text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-white">Tidak Ada Sesi Aktif</h3>
                    <p className="text-slate-400 mt-2">Mulai sesi baru untuk melihat laporan sesi saat ini.</p>
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12 bg-slate-800 rounded-lg">
                    <p className="text-slate-400">{showSessionView ? 'Belum ada transaksi di sesi ini.' : 'Tidak ada transaksi untuk periode yang dipilih.'}</p>
                </div>
            ) : (
                <>
                    {inventorySettings.enabled && (
                         <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                             <div className="lg:col-span-3 bg-slate-800 p-4 rounded-lg">
                                <h3 className="font-semibold mb-4 text-white">Penjualan per Jam (Jam Sibuk)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={reportData.hourlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                        <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Total']} />
                                        <Bar dataKey="total" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="lg:col-span-2 bg-slate-800 p-4 rounded-lg">
                                <h3 className="font-semibold text-white mb-4">Produk Terlaris</h3>
                                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                                    {reportData.bestSellingProducts.map((p, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-300 truncate pr-2">{p.name}</span>
                                            <span className="font-semibold text-white bg-slate-700 px-2 py-0.5 rounded">{p.quantity} terjual</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-4 text-white">Penjualan per Hari</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={salesOverTimeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Total']} />
                                    <Bar dataKey="total" fill="#347758" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-4 text-white">Penjualan per Kategori</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={categorySalesData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name"
                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                            return ( <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">{`${(percent * 100).toFixed(0)}%`}</text> );
                                        }}>
                                        {categorySalesData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} /> ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number, name: string) => [CURRENCY_FORMATTER.format(value), name]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-800 rounded-lg shadow-md overflow-hidden">
                        <h2 className="text-lg font-semibold p-4">Detail Transaksi</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-700">
                                    <tr>
                                        <th className="p-3">Waktu</th>
                                        <th className="p-3">Pelanggan</th>
                                        <th className="p-3">Kasir</th>
                                        <th className="p-3">Total</th>
                                        <th className="p-3">Status Pembayaran</th>
                                        <th className="p-3">Items</th>
                                        <th className="p-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map(t => (
                                        <tr key={t.id} className="border-b border-slate-700 last:border-b-0">
                                            <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(t.createdAt).toLocaleString('id-ID')}</td>
                                            <td className="p-3 font-semibold text-white">{t.customerName || '-'}</td>
                                            <td className="p-3 text-slate-300">{t.userName}</td>
                                            <td className="p-3 font-medium">{CURRENCY_FORMATTER.format(t.total)}</td>
                                            <td className="p-3"><PaymentStatusBadge status={t.paymentStatus} /></td>
                                            <td className="p-3 text-slate-300 max-w-xs truncate">{t.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <Button variant="secondary" size="sm" onClick={() => setSelectedTransaction(t)}>Lihat Struk</Button>
                                                    {(t.paymentStatus === 'unpaid' || t.paymentStatus === 'partial') && (
                                                        <Button size="sm" onClick={() => setUpdatingTransaction(t)}>Tambah Pembayaran</Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
            
            <Modal isOpen={isStartSessionModalOpen} onClose={() => setStartSessionModalOpen(false)} title="Mulai Sesi Penjualan">
                <div className="space-y-4">
                    <p className="text-slate-300">Masukkan jumlah uang tunai awal (modal) yang tersedia di laci kasir.</p>
                    <div>
                        <label htmlFor="startingCash" className="block text-sm font-medium text-slate-300 mb-1">Uang Awalan (IDR)</label>
                        <input
                            id="startingCash"
                            type="number"
                            value={startingCashInput}
                            onChange={(e) => setStartingCashInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                            placeholder="0"
                        />
                    </div>
                    <Button onClick={handleStartSession} className="w-full py-3">
                        Mulai Sesi
                    </Button>
                </div>
            </Modal>
            
            {selectedTransaction && (
                <ReceiptModal isOpen={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} transaction={selectedTransaction} />
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

            {isSessionMode && (
                <EndSessionModal
                    isOpen={isEndSessionModalOpen}
                    onClose={() => setEndSessionModalOpen(false)}
                    sessionSales={reportData.totalSales}
                    startingCash={session.startingCash}
                />
            )}
        </div>
    );
};

export default ReportsView;
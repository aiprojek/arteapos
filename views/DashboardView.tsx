import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { CURRENCY_FORMATTER } from '../constants';
import Icon from '../components/Icon';

const StatCard: React.FC<{ title: string; value: string; icon: 'cash' | 'products' | 'reports' | 'finance'; iconClass: string; children?: React.ReactNode }> = ({ title, value, icon, iconClass, children }) => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-md flex flex-col">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
                <p className="text-3xl font-bold text-white mt-1">{value}</p>
            </div>
            <div className={`rounded-full p-3 ${iconClass}`}>
                <Icon name={icon} className="w-6 h-6 text-white" />
            </div>
        </div>
        {children && <div className="mt-4 pt-4 border-t border-slate-700/50">{children}</div>}
    </div>
);

const DashboardView: React.FC = () => {
    const { transactions } = useFinance();
    const { products, inventorySettings } = useProduct();

    const dashboardData = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const todayTransactions = transactions.filter(t => new Date(t.createdAt).getTime() >= todayStart);

        const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
        const transactionCount = todayTransactions.length;

        const lowStockProducts = inventorySettings.enabled
            ? products.filter(p => p.trackStock && (p.stock ?? 0) <= 5)
            : [];

        const outstandingReceivables = transactions
            .filter(t => t.paymentStatus === 'partial' || t.paymentStatus === 'unpaid')
            .reduce((sum, t) => sum + (t.total - t.amountPaid), 0);

        return {
            todaySales,
            transactionCount,
            lowStockProducts,
            outstandingReceivables,
        };
    }, [transactions, products, inventorySettings]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Penjualan Hari Ini" value={CURRENCY_FORMATTER.format(dashboardData.todaySales)} icon="cash" iconClass="bg-green-500" />
                <StatCard title="Transaksi Hari Ini" value={dashboardData.transactionCount.toString()} icon="reports" iconClass="bg-sky-500" />
                <StatCard title="Piutang Belum Lunas" value={CURRENCY_FORMATTER.format(dashboardData.outstandingReceivables)} icon="finance" iconClass="bg-yellow-500" />
                <StatCard title="Produk Stok Menipis" value={dashboardData.lowStockProducts.length.toString()} icon="products" iconClass="bg-red-500">
                    {dashboardData.lowStockProducts.length > 0 && (
                        <div className="text-xs text-slate-400 space-y-1">
                            {dashboardData.lowStockProducts.slice(0, 3).map(p => (
                                <p key={p.id} className="truncate"> - {p.name} (Sisa: {p.stock})</p>
                            ))}
                            {dashboardData.lowStockProducts.length > 3 && <p>...dan lainnya</p>}
                        </div>
                    )}
                </StatCard>
            </div>
            {/* Can add charts or recent activity here later */}
        </div>
    );
};

export default DashboardView;


import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Brush } from 'recharts';
import { CURRENCY_FORMATTER } from '../../constants';
import Icon from '../Icon';

interface ReportChartsProps {
    hourlyChartData: { name: string; total: number }[];
    salesOverTimeData: { name: string; total: number }[];
    categorySalesData: { name: string; value: number }[];
    bestSellingProducts: { name: string; quantity: number }[];
    filter: string;
    showSessionView: boolean;
}

const PIE_COLORS = ['#347758', '#6366f1', '#ec4899', '#f97316', '#10b981', '#facc15'];

const ReportCharts: React.FC<ReportChartsProps> = ({ 
    hourlyChartData, 
    salesOverTimeData, 
    categorySalesData, 
    bestSellingProducts, 
    filter, 
    showSessionView 
}) => {
    const hasCategoryData = categorySalesData.length > 0;
    const hasProductData = bestSellingProducts.length > 0;
    
    return (
        <>
            {/* HOURLY SALES CHART */}
            {(filter === 'today' || showSessionView) && (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-white">
                        <Icon name="clock-history" className="w-5 h-5 text-[#52a37c]"/> Penjualan per Jam (Hari Ini)
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-slate-400">Pola jam penjualan untuk hari aktif.</p>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={hourlyChartData} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Omzet']} />
                            <Bar dataKey="total" fill="#347758" radius={[4, 4, 0, 0]} />
                            <Brush dataKey="name" height={18} stroke="#52a37c" fill="#1e293b" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* General Charts (Product & Categories) */}
            {filter !== 'today' && !showSessionView && (
                <>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                        <div className="xl:col-span-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                            <h3 className="mb-2 font-semibold text-white">Penjualan per Jam (Rata-rata)</h3>
                            <p className="mb-4 text-sm leading-relaxed text-slate-400">Rata-rata distribusi omzet per jam untuk periode yang sedang dipilih.</p>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={hourlyChartData} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Total']} />
                                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Brush dataKey="name" height={18} stroke="#52a37c" fill="#1e293b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="xl:col-span-2 rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                            <h3 className="mb-2 font-semibold text-white">Produk Terlaris</h3>
                            <p className="mb-4 text-sm leading-relaxed text-slate-400">Produk dengan penjualan tertinggi pada periode yang sedang ditampilkan.</p>
                            {hasProductData ? (
                                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                                    {bestSellingProducts.map((p, index) => (
                                        <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-sm">
                                            <span className="truncate pr-2 text-slate-300">{p.name}</span>
                                            <span className="rounded-full border border-slate-600 bg-slate-900 px-2 py-0.5 font-semibold text-white">{p.quantity} terjual</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-700 text-center text-sm text-slate-500">
                                    Belum ada produk yang bisa diringkas pada periode ini.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                            <h3 className="mb-2 font-semibold text-white">Penjualan per Hari</h3>
                            <p className="mb-4 text-sm leading-relaxed text-slate-400">Tren omzet harian untuk membantu membaca kenaikan atau penurunan performa.</p>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={salesOverTimeData} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Total']} />
                                    <Bar dataKey="total" fill="#347758" radius={[4, 4, 0, 0]} />
                                    <Brush dataKey="name" height={18} stroke="#52a37c" fill="#1e293b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                            <h3 className="mb-2 font-semibold text-white">Penjualan per Kategori</h3>
                            <p className="mb-4 text-sm leading-relaxed text-slate-400">Lihat kontribusi tiap kategori terhadap omzet pada periode aktif.</p>
                            {hasCategoryData ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={categorySalesData} cx="50%" cy="50%" labelLine={false} outerRadius={92} fill="#8884d8" dataKey="value" nameKey="name"
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
                            ) : (
                                <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-700 text-center text-sm text-slate-500">
                                    Belum ada kategori yang bisa diringkas pada periode ini.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default ReportCharts;

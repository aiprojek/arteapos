
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
    
    return (
        <>
            {/* HOURLY SALES CHART */}
            {(filter === 'today' || showSessionView) && (
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-4 text-white flex items-center gap-2">
                        <Icon name="clock-history" className="w-5 h-5 text-[#52a37c]"/> Penjualan per Jam (Hari Ini)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={hourlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Omzet']} />
                            <Bar dataKey="total" fill="#347758" radius={[4, 4, 0, 0]} />
                            <Brush dataKey="name" height={20} stroke="#52a37c" fill="#1e293b" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* General Charts (Product & Categories) */}
            {filter !== 'today' && !showSessionView && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 bg-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-4 text-white">Penjualan per Jam (Rata-rata)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={hourlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Total']} />
                                    <Bar dataKey="total" fill="#10b981" />
                                    <Brush dataKey="name" height={20} stroke="#52a37c" fill="#1e293b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="lg:col-span-2 bg-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold text-white mb-4">Produk Terlaris</h3>
                            <div className="space-y-2 max-h-[280px] overflow-y-auto">
                                {bestSellingProducts.map((p, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-300 truncate pr-2">{p.name}</span>
                                        <span className="font-semibold text-white bg-slate-700 px-2 py-0.5 rounded">{p.quantity} terjual</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-4 text-white">Penjualan per Hari</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={salesOverTimeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Total']} />
                                    <Bar dataKey="total" fill="#347758" />
                                    <Brush dataKey="name" height={20} stroke="#52a37c" fill="#1e293b" />
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
                </>
            )}
        </>
    );
};

export default ReportCharts;

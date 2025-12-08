
import React, { useMemo, useState, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { CURRENCY_FORMATTER } from '../constants';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../types';


const StatCard: React.FC<{ title: string; value: string; icon: 'cash' | 'products' | 'reports' | 'finance'; iconClass: string; children?: React.ReactNode }> = ({ title, value, icon, iconClass, children }) => (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex flex-col h-full">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
                <p className="text-3xl font-bold text-white mt-1">{value}</p>
            </div>
            <div className={`rounded-full p-3 ${iconClass}`}>
                <Icon name={icon} className="w-6 h-6 text-white" />
            </div>
        </div>
        {children && <div className="mt-4 pt-4 border-t border-slate-700/50 flex-grow">{children}</div>}
    </div>
);

const DashboardView: React.FC = () => {
    const { transactions } = useFinance();
    const { products, inventorySettings } = useProduct();

    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [aiError, setAiError] = useState('');
    const [aiQuestion, setAiQuestion] = useState('');

    const dashboardData = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6); // Last 7 days including today

        // Filter out refunded transactions for stats
        const activeTransactions = transactions.filter(t => t.paymentStatus !== 'refunded');

        const todayTransactions = activeTransactions.filter(t => new Date(t.createdAt).getTime() >= todayStart);
        const last7DaysTransactions = activeTransactions.filter(t => new Date(t.createdAt).getTime() >= weekStart.getTime());

        const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
        const transactionCount = todayTransactions.length;

        const lowStockProducts = inventorySettings.enabled
            ? products.filter(p => p.trackStock && (p.stock ?? 0) <= 5).sort((a,b) => (a.stock ?? 0) - (b.stock ?? 0))
            : [];

        const outstandingReceivables = transactions
            .filter(t => t.paymentStatus === 'partial' || t.paymentStatus === 'unpaid')
            .reduce((sum, t) => sum + (t.total - t.amountPaid), 0);

        // Sales trend for last 7 days
        const salesByDay = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return {
                name: d.toLocaleDateString('id-ID', { weekday: 'short' }),
                date: d.toISOString().split('T')[0],
                Penjualan: 0,
            };
        });

        last7DaysTransactions.forEach(t => {
            const dateStr = new Date(t.createdAt).toISOString().split('T')[0];
            const dayData = salesByDay.find(d => d.date === dateStr);
            if (dayData) {
                dayData.Penjualan += t.total;
            }
        });

        // Top selling products for the week
        const productSales = new Map<string, { name: string, quantity: number }>();
        last7DaysTransactions.forEach(t => {
            t.items.forEach(item => {
                if (!item.isReward) {
                    const existing = productSales.get(item.id) || { name: item.name, quantity: 0 };
                    productSales.set(item.id, { ...existing, quantity: existing.quantity + item.quantity });
                }
            });
        });
        const topProducts = Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

        return {
            todaySales,
            transactionCount,
            lowStockProducts,
            outstandingReceivables,
            salesTrend: salesByDay,
            topProducts,
            recentTransactions: transactions.slice(0, 5) // Show recent transactions including refunds for visibility, or filter? Let's show active ones.
        };
    }, [transactions, products, inventorySettings]);
    
    const getAIInsight = useCallback(async (question: string) => {
        setIsLoadingAI(true);
        setAiResponse('');
        setAiError('');

        try {
            // Limit data sent to AI to avoid context length issues and improve speed
            const recentTransactions = transactions
                .filter(t => t.paymentStatus !== 'refunded')
                .slice(0, 50)
                .map(t => ({
                    date: new Date(t.createdAt).toISOString().split('T')[0],
                    total: t.total,
                    items: t.items.filter(i => !i.isReward).map(i => ({ name: i.name, quantity: i.quantity }))
                }));

            const productContext = products.map(p => ({
                name: p.name,
                price: p.price,
                category: p.category.join(', '),
                stock: p.stock
            }));

            const systemInstruction = `You are "Artea AI", a smart business consultant for a POS system. 
            Analyze the provided sales JSON data.
            Answer the user's question in Bahasa Indonesia.
            Keep answers concise, practical, and action-oriented.
            Use simple Markdown (bold, lists) for formatting.
            Do not mention technical details like JSON or API.`;
            
            const userContent = `Data Penjualan Terakhir:\n${JSON.stringify(recentTransactions)}\n\nKatalog Produk:\n${JSON.stringify(productContext)}\n\nPertanyaan User:\n${question}`;
            
            // Using Pollinations.ai (Free, No API Key required)
            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: userContent }
                    ],
                    model: 'openai', // Pollinations routes to the best available free model
                    seed: Math.floor(Math.random() * 1000), // Random seed to ensure fresh answers
                    jsonMode: false
                }),
            });

            if (!response.ok) {
                throw new Error(`Pollinations API Error: ${response.statusText}`);
            }

            const text = await response.text();
            setAiResponse(text);

        } catch (err) {
            console.error("AI API Error:", err);
            setAiError("Maaf, layanan AI sedang sibuk atau tidak dapat diakses saat ini. Silakan coba lagi nanti.");
        } finally {
            setIsLoadingAI(false);
        }
    }, [transactions, products]);

    const handleAIPrompt = (prompt: string) => {
        setAiQuestion(prompt);
        getAIInsight(prompt);
    };

    const presetQuestions = [
        "Analisis tren penjualan minggu ini.",
        "Rekomendasi stok barang yang perlu ditambah.",
        "Ide strategi promosi untuk meningkatkan omzet.",
    ];

    const renderMarkdown = (text: string) => {
        // Simple Markdown parser for basic formatting
        const lines = text.split('\n');
        let html = '';
        let inList = false;

        for (const line of lines) {
            let processedLine = line.trim()
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic

            if (processedLine.startsWith('- ') || processedLine.startsWith('* ')) {
                const listItemContent = processedLine.substring(2);
                if (!inList) {
                    html += '<ul class="list-disc pl-5 space-y-1">';
                    inList = true;
                }
                html += `<li>${listItemContent}</li>`;
            } else if (processedLine.match(/^\d+\.\s/)) {
                 const listItemContent = processedLine.replace(/^\d+\.\s/, '');
                 if (!inList) {
                    html += '<ol class="list-decimal pl-5 space-y-1">';
                    inList = true;
                 }
                 html += `<li>${listItemContent}</li>`;
            } else {
                if (inList) {
                    html += line.match(/^\d+\.\s/) ? '</ol>' : '</ul>';
                    inList = false;
                }
                if (processedLine) {
                    if (processedLine.startsWith('###')) {
                        html += `<h4 class="text-lg font-bold text-white mt-3 mb-1">${processedLine.replace('###', '').trim()}</h4>`;
                    } else if (processedLine.startsWith('##')) {
                        html += `<h3 class="text-xl font-bold text-white mt-4 mb-2">${processedLine.replace('##', '').trim()}</h3>`;
                    } else {
                        html += `<p class="mb-2">${processedLine}</p>`;
                    }
                }
            }
        }

        if (inList) {
             // Close any open lists at end of string (simple heuristic, might need checking if it was ul or ol)
             html += '</ul>'; 
        }

        return { __html: html };
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Penjualan Hari Ini" value={CURRENCY_FORMATTER.format(dashboardData.todaySales)} icon="cash" iconClass="bg-green-500" />
                <StatCard title="Transaksi Hari Ini" value={dashboardData.transactionCount.toString()} icon="reports" iconClass="bg-sky-500" />
                <StatCard title="Piutang Belum Lunas" value={CURRENCY_FORMATTER.format(dashboardData.outstandingReceivables)} icon="finance" iconClass="bg-yellow-500" />
                <StatCard title="Stok Menipis (<=5)" value={dashboardData.lowStockProducts.length.toString()} icon="products" iconClass="bg-red-500">
                    {dashboardData.lowStockProducts.length > 0 && (
                        <div className="text-xs text-slate-400 space-y-1 overflow-y-auto max-h-20 pr-2">
                            {dashboardData.lowStockProducts.map(p => (
                                <p key={p.id} className="truncate"> - {p.name} (Sisa: {p.stock})</p>
                            ))}
                        </div>
                    )}
                </StatCard>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                            <Icon name="trending-up" className="w-5 h-5 text-slate-400"/>
                            Tren Penjualan (7 Hari Terakhir)
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={dashboardData.salesTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} formatter={(value: number) => [CURRENCY_FORMATTER.format(value), 'Penjualan']} />
                                <Bar dataKey="Penjualan" fill="#347758" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                             <Icon name="chat" className="w-5 h-5 text-slate-400"/>
                             Artea AI - Asisten Cerdas (Beta)
                        </h3>
                        <div className="space-y-3">
                             <div className="flex flex-wrap gap-2">
                                {presetQuestions.map(q => (
                                    <button key={q} onClick={() => handleAIPrompt(q)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-full transition-colors border border-slate-600 hover:border-slate-500">{q}</button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAIPrompt(aiQuestion)} placeholder="Tanya saran bisnis..." className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-[#347758]" />
                                <Button onClick={() => handleAIPrompt(aiQuestion)} disabled={isLoadingAI || !aiQuestion}>
                                    {isLoadingAI ? <span className="animate-spin">↻</span> : <Icon name="chat" className="w-4 h-4" />}
                                </Button>
                            </div>
                            {isLoadingAI && <p className="text-sm text-slate-400 text-center animate-pulse">Sedang menganalisis data...</p>}
                            {aiError && <p className="text-sm text-red-400 text-center bg-red-900/20 p-2 rounded">{aiError}</p>}
                            {aiResponse && (
                                <div 
                                    className="prose prose-sm prose-invert max-w-none bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-slate-300" 
                                    dangerouslySetInnerHTML={renderMarkdown(aiResponse)}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Produk Terlaris (Minggu Ini)</h3>
                        <div className="space-y-3">
                            {dashboardData.topProducts.map((p, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300 truncate pr-2">{p.name}</span>
                                    <span className="font-semibold text-white bg-slate-700 px-2 py-0.5 rounded-md flex-shrink-0">{p.quantity} terjual</span>
                                </div>
                            ))}
                            {dashboardData.topProducts.length === 0 && <p className="text-sm text-slate-500">Belum ada penjualan minggu ini.</p>}
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Aktivitas Terkini</h3>
                         <div className="space-y-3">
                            {dashboardData.recentTransactions.map((t: Transaction) => (
                                <div key={t.id} className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2 last:border-b-0 last:pb-0">
                                    <div>
                                        <p className={`font-medium ${t.paymentStatus === 'refunded' ? 'line-through text-slate-500' : 'text-slate-200'}`}>{t.customerName || 'Penjualan'}</p>
                                        <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'})}</p>
                                    </div>
                                    {t.paymentStatus === 'refunded' ? (
                                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full">Refunded</span>
                                    ) : (
                                        <p className="font-semibold text-green-400">{CURRENCY_FORMATTER.format(t.total)}</p>
                                    )}
                                </div>
                            ))}
                            {dashboardData.recentTransactions.length === 0 && <p className="text-sm text-slate-500">Belum ada transaksi.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;

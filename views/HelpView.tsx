
import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext'; 
import ShowcaseModal from '../components/ShowcaseModal'; // Import Showcase

// Import Modular Tabs
import ScenariosTab from '../components/help/ScenariosTab';
import ManualTab from '../components/help/ManualTab';
import FAQTab from '../components/help/FAQTab';
import LicenseTab from '../components/help/LicenseTab';
import AboutTab from '../components/help/AboutTab';
import PremiumTab from '../components/help/PremiumTab';
import StrategyTab from '../components/help/StrategyTab';

const HelpView: React.FC = () => {
    const { currentUser } = useAuth();
    
    // State untuk Showcase Modal
    const [isShowcaseOpen, setShowcaseOpen] = useState(false);

    // Cek apakah user adalah manajemen
    const isManagement = currentUser && ['admin', 'manager', 'viewer'].includes(currentUser.role);

    const [activeTab, setActiveTab] = useState<'scenarios' | 'features' | 'strategy' | 'manual' | 'faq' | 'license' | 'about' | 'services'>('scenarios');

    useEffect(() => {
        // Optional logic
    }, [isManagement]);

    const tabs = [
        { id: 'scenarios', label: 'Skenario', icon: 'share' },
        { id: 'features', label: 'Fitur', icon: 'star' }, // TAB BARU
        { id: 'manual', label: 'Panduan', icon: 'book' },
        ...(isManagement ? [{ id: 'strategy', label: 'Strategi Bisnis', icon: 'lightbulb' }] : []),
        { id: 'services', label: 'Layanan', icon: 'star-fill' },
        { id: 'faq', label: 'FAQ', icon: 'question' },
        { id: 'license', label: 'Lisensi', icon: 'lock' },
        { id: 'about', label: 'Tentang', icon: 'info-circle' },
    ] as const;

    // Data Fitur (Duplikasi dari ShowcaseModal untuk tampilan Grid statis)
    const featuresList = [
        {
            title: "100% Offline & Cepat",
            desc: "Data tersimpan di perangkat. Anti lemot dan bebas biaya server.",
            icon: "wifi", color: "text-green-400", bg: "bg-green-900/20"
        },
        {
            title: "Multi-Cabang Hemat",
            desc: "Sinkronisasi omzet semua cabang via Dropbox gratisan.",
            icon: "cloud", color: "text-blue-400", bg: "bg-blue-900/20"
        },
        {
            title: "Artea AI: Analis Bisnis",
            desc: "Konsultan cerdas untuk analisa strategi dan tren penjualan.",
            icon: "chat", color: "text-purple-400", bg: "bg-purple-900/20"
        },
        {
            title: "Resep & HPP Otomatis",
            desc: "Potong stok bahan baku (gram/ml) berdasarkan resep produk.",
            icon: "ingredients", color: "text-orange-400", bg: "bg-orange-900/20"
        },
        {
            title: "Ekosistem Layar Ganda",
            desc: "Ubah HP bekas jadi Layar Pelanggan atau Layar Dapur (KDS).",
            icon: "cast", color: "text-yellow-400", bg: "bg-yellow-900/20"
        },
        {
            title: "Laporan Keuangan Utuh",
            desc: "Laba rugi, pengeluaran operasional, dan manajemen arus kas.",
            icon: "finance", color: "text-teal-400", bg: "bg-teal-900/20"
        },
        {
            title: "Loyalty & E-Wallet",
            desc: "Sistem poin member dan deposit saldo untuk pelanggan setia.",
            icon: "award", color: "text-pink-400", bg: "bg-pink-900/20"
        },
        {
            title: "Keamanan Anti-Fraud",
            desc: "Audit Log mencatat setiap penghapusan data atau refund.",
            icon: "lock", color: "text-red-400", bg: "bg-red-900/20"
        }
    ];

    return (
        <div className="max-w-6xl mx-auto pb-24">
            {/* Header */}
            <div className="text-center py-8">
                <div className="inline-block p-3 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-lg">
                    <Icon name="logo" className="w-12 h-12 text-[#52a37c]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Pusat Pengetahuan</h1>
                <p className="text-slate-400 mt-2 max-w-xl mx-auto text-sm sm:text-base">
                    Pelajari cara memaksimalkan Artea POS untuk bisnis Anda.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="sticky top-0 z-20 py-3 mb-8 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 transition-all">
                <div className="overflow-x-auto hide-scrollbar flex md:justify-center">
                    <div className="bg-slate-800 p-1 rounded-xl flex gap-1 shadow-lg border border-slate-700 whitespace-nowrap min-w-max">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
                                    ${activeTab === tab.id ? 'bg-[#347758] text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                {/* @ts-ignore */}
                                <Icon name={tab.icon} className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            
            <div className="animate-fade-in px-4 md:px-0">
                
                {/* TAB FITUR (NEW) */}
                {activeTab === 'features' && (
                    <div className="space-y-8">
                        {/* Hero Section Tab */}
                        <div className="bg-gradient-to-r from-[#347758]/20 to-slate-800 border border-[#347758]/30 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <h2 className="text-xl font-bold text-white mb-2">Jelajahi Kemampuan Penuh Aplikasi</h2>
                                <p className="text-slate-300 text-sm max-w-lg">
                                    Artea POS bukan sekadar kasir biasa. Lihat fitur-fitur canggih yang mungkin belum Anda coba.
                                </p>
                            </div>
                            <Button onClick={() => setShowcaseOpen(true)} className="whitespace-nowrap shadow-lg shadow-[#347758]/20">
                                <Icon name="play" className="w-5 h-5"/> Putar Slideshow Tour
                            </Button>
                        </div>

                        {/* Grid Fitur */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {featuresList.map((feat, idx) => (
                                <div key={idx} className="bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors group">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${feat.bg}`}>
                                        {/* @ts-ignore */}
                                        <Icon name={feat.icon} className={`w-6 h-6 ${feat.color}`} />
                                    </div>
                                    <h3 className="text-white font-bold mb-2 group-hover:text-[#52a37c] transition-colors">{feat.title}</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'scenarios' && <ScenariosTab />}
                {activeTab === 'manual' && <ManualTab />}
                {isManagement && activeTab === 'strategy' && <StrategyTab />}
                {activeTab === 'services' && <PremiumTab />}
                {activeTab === 'faq' && <FAQTab />}
                {activeTab === 'license' && <LicenseTab />}
                {activeTab === 'about' && <AboutTab />}
            </div>

            {/* Showcase Modal Launcher */}
            <ShowcaseModal isOpen={isShowcaseOpen} onClose={() => setShowcaseOpen(false)} />

        </div>
    );
};

export default HelpView;

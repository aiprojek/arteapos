
import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext'; // Import Auth

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
    
    // Cek apakah user adalah manajemen (Bukan Staff biasa)
    const isManagement = currentUser && ['admin', 'manager', 'viewer'].includes(currentUser.role);

    // Default tab diubah menjadi 'scenarios' untuk semua user agar alur belajar dimulai dari pemahaman model operasional
    const [activeTab, setActiveTab] = useState<'scenarios' | 'strategy' | 'manual' | 'faq' | 'license' | 'about' | 'services'>('scenarios');

    // Update active tab jika role berubah (misal logout/login ulang) - Reset ke scenarios
    useEffect(() => {
        // Optional: Logic tambahan jika ingin memaksa tab tertentu saat role berubah
    }, [isManagement]);

    const tabs = [
        { id: 'scenarios', label: 'Skenario', icon: 'share' },
        { id: 'manual', label: 'Panduan', icon: 'book' },
        // Tab Strategi HANYA untuk Management, diletakkan setelah Panduan
        ...(isManagement ? [{ id: 'strategy', label: 'Strategi Bisnis', icon: 'lightbulb' }] : []),
        { id: 'services', label: 'Layanan', icon: 'star' },
        { id: 'faq', label: 'FAQ', icon: 'question' },
        { id: 'license', label: 'Lisensi', icon: 'lock' },
        { id: 'about', label: 'Tentang', icon: 'info-circle' },
    ] as const;

    return (
        <div className="max-w-6xl mx-auto pb-24">
            {/* Header */}
            <div className="text-center py-8">
                <div className="inline-block p-3 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-lg">
                    <Icon name="logo" className="w-12 h-12 text-[#52a37c]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Pusat Pengetahuan</h1>
                <p className="text-slate-400 mt-2 max-w-xl mx-auto text-sm sm:text-base">
                    {isManagement 
                        ? "Strategi bisnis, keamanan, dan panduan teknis untuk Owner & Manager."
                        : "Panduan lengkap cara menggunakan aplikasi Artea POS."}
                </p>
            </div>

            {/* Navigation Tabs - Lower Z-Index to 20 */}
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
                                <Icon name={tab.icon as any} className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            
            <div className="animate-fade-in">
                {activeTab === 'scenarios' && <ScenariosTab />}
                {activeTab === 'manual' && <ManualTab />}
                {isManagement && activeTab === 'strategy' && <StrategyTab />}
                {activeTab === 'services' && <PremiumTab />}
                {activeTab === 'faq' && <FAQTab />}
                {activeTab === 'license' && <LicenseTab />}
                {activeTab === 'about' && <AboutTab />}
            </div>

        </div>
    );
};

export default HelpView;

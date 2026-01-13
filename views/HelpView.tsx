
import React, { useState } from 'react';
import Icon from '../components/Icon';

// Import Modular Tabs
import ScenariosTab from '../components/help/ScenariosTab';
import ManualTab from '../components/help/ManualTab';
import FAQTab from '../components/help/FAQTab';
import LicenseTab from '../components/help/LicenseTab';
import AboutTab from '../components/help/AboutTab';
import PremiumTab from '../components/help/PremiumTab';

const HelpView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'scenarios' | 'manual' | 'faq' | 'license' | 'about' | 'services'>('scenarios');

    const tabs = [
        { id: 'scenarios', label: 'Skenario', icon: 'share' },
        { id: 'manual', label: 'Panduan', icon: 'book' },
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
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Pusat Bantuan</h1>
                <p className="text-slate-400 mt-2 max-w-xl mx-auto text-sm sm:text-base">
                    Panduan lengkap penggunaan setiap fitur dan menu di Artea POS.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="sticky top-0 z-30 py-3 mb-8 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 transition-all">
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
                {activeTab === 'services' && <PremiumTab />}
                {activeTab === 'faq' && <FAQTab />}
                {activeTab === 'license' && <LicenseTab />}
                {activeTab === 'about' && <AboutTab />}
            </div>

        </div>
    );
};

export default HelpView;

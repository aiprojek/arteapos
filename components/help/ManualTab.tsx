import React, { useState } from 'react';
import { SectionHeader, AccordionItem, TableOfContents } from './SharedHelpComponents';
import { MANUAL_SECTIONS } from './helpData';

const PromoWAMessage = () => (
    <div className="space-y-2">
        <p className="text-sm text-slate-300">Ingin mengajak rekan pengusaha lain? Salin pesan ini:</p>
        <div 
            className="bg-slate-900 p-3 rounded border border-slate-600 font-mono text-xs text-slate-300 select-all cursor-text"
            onClick={(e) => {
                const range = document.createRange();
                range.selectNode(e.currentTarget);
                window.getSelection()?.removeAllRanges();
                window.getSelection()?.addRange(range);
            }}
        >
            Halo rekan-rekan pengusaha! 👋<br/><br/>
            Saya mau berbagi info aplikasi kasir (POS) gratis yang canggih:<br/>
            *Artea POS* - Offline First & Open Source.<br/><br/>
            ✅ Gratis selamanya, tanpa langganan.<br/>
            ✅ Bisa jalan tanpa internet (Offline).<br/>
            ✅ Multi-cabang pakai Dropbox.<br/>
            ✅ Fitur lengkap: Stok Resep, Laba Rugi, Scan Barcode.<br/><br/>
            Coba sekarang, hemat jutaan rupiah biaya langganan! 🚀
        </div>
        <p className="text-[10px] text-slate-500 italic">*Klik teks di atas untuk menyorot semua.</p>
    </div>
);

const ManualTab: React.FC = () => {
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(prev => prev === id ? null : id);
    };

    const tocItems = MANUAL_SECTIONS.map(section => ({
        id: section.id,
        label: section.label
    }));

    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-12">
            
            <TableOfContents items={tocItems} />

            <div className="space-y-12">
                {MANUAL_SECTIONS.map((section) => (
                    <div key={section.id} id={section.id}>
                        <SectionHeader 
                            title={`Menu: ${section.label}`} 
                            icon={section.icon} 
                            desc={section.desc} 
                        />
                        <div className="space-y-2">
                            {section.items.map((item) => (
                                <AccordionItem 
                                    key={item.id}
                                    title={item.title} 
                                    isOpen={openAccordion === item.id} 
                                    onToggle={() => toggleAccordion(item.id)} 
                                    icon={item.icon} 
                                    colorClass={item.colorClass} 
                                    badge={item.badge}
                                >
                                    {item.id === 'promo_wa' ? (
                                        <PromoWAMessage />
                                    ) : (
                                        <div dangerouslySetInnerHTML={{ __html: item.content }} />
                                    )}
                                </AccordionItem>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManualTab;
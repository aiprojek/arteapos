
import React, { useState } from 'react';
import { AccordionItem, TableOfContents } from './SharedHelpComponents';
import { FAQS } from './helpData';

const FAQTab: React.FC = () => {
    const [openId, setOpenId] = useState<string | null>(null);

    const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

    // Grouping for TOC logic
    const categories = Array.from(new Set(FAQS.map(f => f.category)));
    const tocItems = categories.map(c => ({ 
        id: `cat_${c.replace(/\s+/g, '_')}`, 
        label: c 
    }));

    return (
        <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <h3 className="font-bold text-white text-lg">Tanya Jawab & Masalah Umum</h3>
                <p className="text-xs text-slate-400">Jawaban cepat untuk pertanyaan teknis dan operasional.</p>
            </div>

            <TableOfContents items={tocItems} />

            <div className="space-y-8">
                {categories.map(cat => (
                    <div key={cat} id={`cat_${cat.replace(/\s+/g, '_')}`} className="scroll-mt-24">
                        <h4 className="text-sm font-bold text-[#52a37c] mb-3 uppercase tracking-wider border-b border-slate-700 pb-1">
                            {cat}
                        </h4>
                        <div className="space-y-2">
                            {FAQS.filter(f => f.category === cat).map(f => (
                                <AccordionItem 
                                    key={f.id}
                                    title={f.title}
                                    isOpen={openId === f.id}
                                    onToggle={() => toggle(f.id)}
                                    icon="question"
                                >
                                    <div dangerouslySetInnerHTML={{ __html: f.content }} />
                                </AccordionItem>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FAQTab;

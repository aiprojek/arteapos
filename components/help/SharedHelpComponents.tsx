
import React from 'react';
import Icon, { IconName } from '../Icon';

// --- Shared Components ---

export const SectionHeader: React.FC<{
    title: string;
    icon: IconName;
    desc: string;
}> = ({ title, icon, desc }) => (
    <div className="flex items-start gap-4 mb-6 border-b border-slate-700 pb-4">
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <Icon name={icon} className="w-8 h-8 text-[#52a37c]" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
            <p className="text-slate-400">{desc}</p>
        </div>
    </div>
);

export const AccordionItem: React.FC<{
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    icon?: IconName;
    colorClass?: string;
    badge?: string;
}> = ({ title, isOpen, onToggle, children, icon, colorClass, badge }) => (
    <div className={`border rounded-lg transition-all duration-300 overflow-hidden ${isOpen ? 'bg-slate-800 border-slate-600 shadow-lg' : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800/50'}`}>
        <button 
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
        >
            <div className="flex items-center gap-3">
                {icon && (
                    <div className={`p-2 rounded-lg bg-slate-900 ${colorClass || 'text-slate-400'}`}>
                        <Icon name={icon} className="w-5 h-5" />
                    </div>
                )}
                <div>
                    <span className={`font-medium ${isOpen ? 'text-white' : 'text-slate-300'}`}>{title}</span>
                    {badge && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#347758] text-white">{badge}</span>}
                </div>
            </div>
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'text-white' : 'text-slate-500'}`} />
        </button>
        <div 
            className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
            <div className="p-4 pt-0 border-t border-slate-700/50 mt-2 text-slate-300 text-sm leading-relaxed">
                {children}
            </div>
        </div>
    </div>
);

export const TableOfContents: React.FC<{
    items: { id: string, label: string }[];
}> = ({ items }) => {
    const scrollToId = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-8">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icon name="menu" className="w-3 h-3"/> Daftar Isi
            </h4>
            <div className="flex flex-wrap gap-2">
                {items.map(item => (
                    <button
                        key={item.id}
                        onClick={() => scrollToId(item.id)}
                        className="text-xs bg-slate-700 hover:bg-[#347758] hover:text-white text-slate-300 px-3 py-1.5 rounded-full transition-colors border border-slate-600"
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const ScenarioCard: React.FC<{
    title: string;
    icon: IconName;
    color: string;
    desc: string;
    steps: string[];
}> = ({ title, icon, color, desc, steps }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-500 transition-all">
        <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-lg bg-slate-900 ${color.replace('text-', 'bg-').replace('400', '900')}/30`}>
                <Icon name={icon} className={`w-6 h-6 ${color}`} />
            </div>
            <h3 className="font-bold text-lg text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">{desc}</p>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            <ul className="space-y-2">
                {steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-slate-300">
                        <span className="font-bold text-slate-500">{idx + 1}.</span>
                        <span dangerouslySetInnerHTML={{ __html: step }} />
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

export const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
        let content = line.trim();
        if(!content) return <br key={idx}/>;
        
        if (content.startsWith('###')) {
            return <h3 key={idx} className="text-lg font-bold text-[#52a37c] mt-4 mb-2">{content.replace('###', '')}</h3>
        }
        if (content.startsWith('**')) {
            return <p key={idx} className="font-bold text-white mt-3 mb-1">{content.replace(/\*\*/g, '')}</p>
        }
        return <p key={idx} className="text-slate-300 leading-relaxed text-sm mb-1">{content.replace(/\*\*/g, '')}</p>
    });
};


import React from 'react';
import Icon from '../Icon';

// --- Types ---
export interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    icon?: React.ComponentProps<typeof Icon>['name'];
    colorClass?: string;
    badge?: string;
}

// --- Components ---

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, isOpen, onToggle, icon = 'question', colorClass = 'text-slate-200', badge }) => (
    <div className={`border rounded-lg transition-all duration-300 overflow-hidden mb-3 ${isOpen ? 'border-[#347758] bg-slate-800' : 'border-slate-700 bg-slate-800/50'}`}>
        <button 
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 text-left focus:outline-none group hover:bg-slate-700/50 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-slate-900 ${colorClass}`}>
                    <Icon name={icon} className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <span className={`font-semibold text-sm sm:text-base ${isOpen ? 'text-white' : 'text-slate-300'}`}>{title}</span>
                    {badge && <span className="text-[10px] text-yellow-400 font-normal mt-0.5">{badge}</span>}
                </div>
            </div>
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} className={`w-5 h-5 transition-colors ${isOpen ? 'text-[#52a37c]' : 'text-slate-500'}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 pt-0 border-t border-slate-700/50 text-slate-300 text-sm leading-relaxed space-y-3 bg-slate-900/30">
                {children}
            </div>
        </div>
    </div>
);

export const SectionHeader: React.FC<{ title: string; icon: any; desc: string; id?: string }> = ({ title, icon, desc, id }) => (
    <div id={id} className="mb-4 mt-10 pb-2 border-b border-slate-700 first:mt-0 scroll-mt-24">
        <div className="flex items-center gap-2">
            <Icon name={icon} className="w-6 h-6 text-[#52a37c]" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 ml-8">{desc}</p>
    </div>
);

export const ScenarioCard: React.FC<{ 
    title: string; 
    icon: any; 
    color: string; 
    desc: string; 
    steps: string[] 
}> = ({ title, icon, color, desc, steps }) => {
    const colorMap: Record<string, string> = {
        'green-400': 'text-green-400',
        'pink-400': 'text-pink-400',
        'yellow-400': 'text-yellow-400',
        'sky-400': 'text-sky-400',
        'purple-400': 'text-purple-400',
        'orange-400': 'text-orange-400',
    };
    const textColor = colorMap[color] || 'text-slate-400';

    return (
        <div className={`bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors relative overflow-hidden group h-full`}>
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${textColor}`}>
                <Icon name={icon} className="w-32 h-32" style={{ fontSize: '8rem' }} />
            </div>
            <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${textColor}`}>
                <Icon name={icon} className="w-6 h-6" /> {title}
            </h3>
            <p className="text-sm text-slate-300 mb-4 min-h-[40px] leading-relaxed">{desc}</p>
            <div className="space-y-3">
                {steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start text-sm text-slate-400">
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full bg-slate-900 ${textColor} flex items-center justify-center text-xs font-bold mt-0.5 border border-slate-700`}>
                            {idx + 1}
                        </span>
                        <span dangerouslySetInnerHTML={{__html: step}} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const TableOfContents: React.FC<{ items: { id: string, label: string }[] }> = ({ items }) => {
    const scrollToId = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-8">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icon name="list" className="w-3 h-3"/> Daftar Isi
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

// --- Utilities ---

export const renderMarkdown = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split('\n').map((line, idx) => {
        const content = line.trim();
        if (!content) return <br key={idx} />;
        
        if (content.startsWith('###')) {
            return <h3 key={idx} className="text-lg font-bold text-[#52a37c] mt-4 mb-2">{content.replace('###', '')}</h3>;
        }
        if (content.startsWith('####')) {
            return <h4 key={idx} className="text-md font-bold text-white mt-3 mb-2">{content.replace('####', '')}</h4>;
        }
        if (content.startsWith('**')) {
            return <p key={idx} className="font-bold text-white mt-3 mb-1">{content.replace(/\*\*/g, '')}</p>;
        }

        if (content.match(urlRegex)) {
            const parts = content.split(urlRegex);
            return (
                <p key={idx} className="text-slate-300 leading-relaxed text-sm mb-1">
                    {parts.map((part, i) => 
                        part.match(urlRegex) ? 
                            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#52a37c] hover:underline break-all font-medium">{part}</a> 
                            : part.replace(/\*\*/g, '')
                    )}
                </p>
            );
        }

        return <p key={idx} className="text-slate-300 leading-relaxed text-sm mb-1">{content.replace(/\*\*/g, '')}</p>;
    });
};

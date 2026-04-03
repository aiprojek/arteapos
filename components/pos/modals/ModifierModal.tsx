import React, { useEffect } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import { CURRENCY_FORMATTER } from '../../../constants';
import type { ModifierGroup, Product, SelectedModifier } from '../../../types';

interface ModifierModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onConfirm: (selectedModifiers: SelectedModifier[]) => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({ isOpen, onClose, product, onConfirm }) => {
    const [selections, setSelections] = React.useState<Record<string, SelectedModifier[]>>({});

    useEffect(() => {
        if (isOpen) setSelections({});
    }, [isOpen]);

    if (!isOpen || !product || !product.modifierGroups) return null;

    const handleToggle = (group: ModifierGroup, option: any) => {
        setSelections((prev) => {
            const current = prev[group.id] || [];
            const isSelected = current.find((s) => s.optionId === option.id);
            
            if (group.maxSelection === 1) {
                if (isSelected) {
                    if (group.minSelection === 0) return { ...prev, [group.id]: [] };
                    return prev;
                }
                return { 
                    ...prev, 
                    [group.id]: [{ 
                        groupId: group.id, groupName: group.name, 
                        optionId: option.id, name: option.name, price: option.price 
                    }] 
                };
            }

            if (isSelected) {
                return { ...prev, [group.id]: current.filter((s) => s.optionId !== option.id) };
            }

            if (current.length >= group.maxSelection) return prev;
            return { 
                ...prev, 
                [group.id]: [...current, { 
                    groupId: group.id, groupName: group.name, 
                    optionId: option.id, name: option.name, price: option.price 
                }] 
            };
        });
    };

    const isValid = product.modifierGroups.every((group) => {
        const count = (selections[group.id] || []).length;
        return count >= group.minSelection;
    });

    const handleConfirm = () => {
        onConfirm(Object.values(selections).flat());
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pilihan ${product.name}`}>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                {product.modifierGroups.map((group) => (
                    <div key={group.id} className="space-y-2">
                        <div className="flex justify-between items-baseline border-b border-slate-700 pb-1">
                            <h4 className="font-bold text-white">{group.name}</h4>
                            <span className="text-xs text-slate-400">
                                {group.minSelection > 0 ? `Wajib Pilih ${group.minSelection}` : 'Opsional'}
                                {group.maxSelection > 1 ? ` (Max ${group.maxSelection})` : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.options.map((opt) => {
                                const isSelected = (selections[group.id] || []).some((s) => s.optionId === opt.id);
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleToggle(group, opt)}
                                        className={`flex justify-between items-center p-3 rounded-lg border text-sm transition-all
                                            ${isSelected 
                                                ? 'bg-[#347758]/20 border-[#347758] text-white' 
                                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                                    >
                                        <span>{opt.name}</span>
                                        {opt.price > 0 && <span className="font-mono text-[#52a37c]">+{CURRENCY_FORMATTER.format(opt.price)}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="pt-4 mt-4 border-t border-slate-700">
                <Button onClick={handleConfirm} disabled={!isValid} className="w-full py-3">
                    Tambah ke Pesanan
                </Button>
            </div>
        </Modal>
    );
};

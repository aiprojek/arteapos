import React, { useEffect } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import { CURRENCY_FORMATTER } from '../../../constants';
import type { Addon, Product, ProductVariant } from '../../../types';

interface AddonModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    variant: ProductVariant | null;
    onConfirm: (addons: Addon[]) => void;
}

export const AddonModal: React.FC<AddonModalProps> = ({ isOpen, onClose, product, variant: _variant, onConfirm }) => {
    const [selected, setSelected] = React.useState<Addon[]>([]);

    useEffect(() => {
        if (!isOpen) setSelected([]);
    }, [isOpen]);

    if (!isOpen || !product || !product.addons) return null;

    const toggle = (addon: Addon) => {
        setSelected((prev) => prev.find((a) => a.id === addon.id) ? prev.filter((a) => a.id !== addon.id) : [...prev, addon]);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add-on ${product.name}`}>
            <div className="space-y-3 max-h-64 overflow-y-auto">
                {product.addons.map((addon) => {
                    const isSelected = !!selected.find((x) => x.id === addon.id);
                    return (
                        <label key={addon.id} className={`flex items-center p-3 rounded-lg cursor-pointer ${isSelected ? 'bg-[#347758]/30 border border-[#347758]' : 'bg-slate-700'}`}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggle(addon)} className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-[#347758]"/>
                            <span className="ml-3 flex-1 text-slate-200">{addon.name}</span>
                            <span className="text-slate-300">{CURRENCY_FORMATTER.format(addon.price)}</span>
                        </label>
                    );
                })}
            </div>
            <Button onClick={() => onConfirm(selected)} className="w-full mt-4">Tambah</Button>
        </Modal>
    );
};

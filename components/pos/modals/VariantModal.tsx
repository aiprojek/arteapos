import React from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import { CURRENCY_FORMATTER } from '../../../constants';
import type { Product, ProductVariant } from '../../../types';

interface VariantModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSelect: (variant: ProductVariant) => void;
}

export const VariantModal: React.FC<VariantModalProps> = ({ isOpen, onClose, product, onSelect }) => {
    if (!isOpen || !product || !product.variants) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Pilih Varian ${product.name}`}
            size="lg"
            mobileLayout="fullscreen"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60dvh] sm:max-h-80 overflow-y-auto">
                {product.variants.map((variant) => (
                    <button key={variant.id} onClick={() => onSelect(variant)} className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg text-left">
                        <p className="font-bold text-white">{variant.name}</p>
                        <p className="text-sm text-[#52a37c]">{CURRENCY_FORMATTER.format(variant.price)}</p>
                    </button>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
                <Button variant="utility" onClick={onClose} className="w-full">Batal</Button>
            </div>
        </Modal>
    );
};

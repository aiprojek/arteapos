import React, { useEffect } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import Icon from '../../Icon';
import { CURRENCY_FORMATTER } from '../../../constants';
import type { CartItem } from '../../../types';

interface SplitBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onConfirm: (itemsToPay: string[]) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({ isOpen, onClose, cartItems, onConfirm }) => {
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) setSelectedIds(new Set());
    }, [isOpen]);

    const toggleItem = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === cartItems.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(cartItems.map((i) => i.cartItemId)));
    };

    const totalSelected = cartItems
        .filter((i) => selectedIds.has(i.cartItemId))
        .reduce((sum, item) => {
            const mods = (item.selectedModifiers || []).reduce((s, m) => s + m.price, 0);
            return sum + ((item.price + mods) * item.quantity);
        }, 0);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Split Bill (Pisah Bayar)">
            <div className="space-y-4">
                <p className="text-sm text-slate-300">Pilih item yang ingin dibayar <strong className="text-white">SEKARANG</strong>. Item yang tidak dipilih akan disimpan ke keranjang terpisah.</p>
                
                <button onClick={toggleAll} className="text-xs text-[#52a37c] font-bold hover:underline mb-2">
                    {selectedIds.size === cartItems.length ? 'Batalkan Semua' : 'Pilih Semua'}
                </button>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {cartItems.map((item) => {
                        const mods = (item.selectedModifiers || []).reduce((s, m) => s + m.price, 0);
                        const price = (item.price + mods) * item.quantity;
                        const isSelected = selectedIds.has(item.cartItemId);

                        return (
                            <button 
                                key={item.cartItemId}
                                onClick={() => toggleItem(item.cartItemId)}
                                className={`w-full flex justify-between items-center p-3 rounded-lg border text-left transition-colors
                                    ${isSelected ? 'bg-[#347758]/20 border-[#347758]' : 'bg-slate-800 border-slate-700'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-[#347758] border-[#347758]' : 'border-slate-500'}`}>
                                        {isSelected && <Icon name="check-circle-fill" className="w-3 h-3 text-white"/>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{item.quantity}x {item.name}</p>
                                        <p className="text-xs text-slate-400">{CURRENCY_FORMATTER.format(price)}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="pt-4 border-t border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-300">Akan Dibayar:</span>
                        <span className="font-bold text-xl text-white">{CURRENCY_FORMATTER.format(totalSelected)}</span>
                    </div>
                    <Button 
                        onClick={() => onConfirm(Array.from(selectedIds))} 
                        disabled={selectedIds.size === 0 || selectedIds.size === cartItems.length}
                        className="w-full"
                    >
                        Pisahkan & Bayar
                    </Button>
                    {selectedIds.size === cartItems.length && (
                        <p className="text-xs text-center text-yellow-500 mt-2">Untuk membayar semua, gunakan tombol "Bayar" biasa.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

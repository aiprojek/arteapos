import React, { useEffect, useState } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import type { Discount } from '../../../types';

interface DiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    initialDiscount: Discount | null;
    onSave: (d: Discount) => void;
    onRemove: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, title, initialDiscount, onSave, onRemove }) => {
    const [type, setType] = useState<'percentage' | 'amount'>('percentage');
    const [value, setValue] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialDiscount) {
                setType(initialDiscount.type);
                setValue(initialDiscount.value.toString());
                setName(initialDiscount.name || '');
            } else {
                setType('percentage');
                setValue('');
                setName('');
            }
        }
    }, [isOpen, initialDiscount]);

    const handleSave = () => {
        const val = parseFloat(value);
        if (isNaN(val) || val < 0) return;
        onSave({ type, value: val, name });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setType('percentage')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'percentage' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Persen (%)</button>
                    <button onClick={() => setType('amount')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'amount' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Nominal (Rp)</button>
                </div>
                <div>
                    <label className="block text-sm text-slate-300 mb-1">Nilai Diskon</label>
                    <input type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" autoFocus placeholder="0" />
                </div>
                <div>
                    <label className="block text-sm text-slate-300 mb-1">Keterangan (Opsional)</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" placeholder="cth: Promo Member" />
                </div>
                <div className="flex gap-3 pt-2">
                    {initialDiscount && <Button onClick={() => { onRemove(); onClose(); }} variant="danger" className="flex-1">Hapus</Button>}
                    <Button onClick={handleSave} className="flex-[2]">Simpan</Button>
                </div>
            </div>
        </Modal>
    );
};

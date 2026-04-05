import React, { useState } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import { useSession } from '../../../context/SessionContext';

export const CashManagementModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addCashMovement } = useSession();
    const [type, setType] = useState<'in' | 'out'>('out');
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');

    const handleSubmit = () => {
        if (!amount || !desc) return;
        addCashMovement(type, parseFloat(amount), desc);
        onClose();
        setAmount('');
        setDesc('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manajemen Kas (Petty Cash)" size="md" mobileLayout="fullscreen">
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-xl">
                    <button onClick={() => setType('in')} className={`flex-1 py-2.5 text-sm rounded-lg transition-colors ${type === 'in' ? 'bg-green-600 text-white' : 'text-slate-300'}`}>Masuk (In)</button>
                    <button onClick={() => setType('out')} className={`flex-1 py-2.5 text-sm rounded-lg transition-colors ${type === 'out' ? 'bg-red-600 text-white' : 'text-slate-300'}`}>Keluar (Out)</button>
                </div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white" placeholder="Jumlah (Rp)" />
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white" placeholder="Keterangan (cth: Beli Es Batu)" />
                <Button onClick={handleSubmit} className="w-full py-2.5">Simpan</Button>
            </div>
        </Modal>
    );
};

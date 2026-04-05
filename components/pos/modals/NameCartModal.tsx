import React, { useEffect } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';

interface NameCartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    currentName?: string;
}

export const NameCartModal: React.FC<NameCartModalProps> = ({ isOpen, onClose, onSave, currentName = '' }) => {
    const [name, setName] = React.useState('');

    useEffect(() => {
        if (isOpen) setName(currentName);
    }, [isOpen, currentName]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={currentName ? 'Ganti Nama' : 'Simpan Pesanan'}
            size="md"
            mobileLayout="fullscreen"
        >
            <div className="space-y-4">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="cth: Meja 5" className="w-full bg-slate-700 p-3 rounded-lg text-white" autoFocus/>
                <Button onClick={() => name.trim() && onSave(name.trim())} className="w-full">Simpan</Button>
            </div>
        </Modal>
    );
};

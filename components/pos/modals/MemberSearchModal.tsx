import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import Icon from '../../Icon';
import { CURRENCY_FORMATTER } from '../../../constants';
import { useCustomer } from '../../../context/CustomerContext';
import type { Customer } from '../../../types';

interface MemberSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: Customer) => void;
    onAddNew: () => void;
    onScan: () => void;
}

export const MemberSearchModal: React.FC<MemberSearchModalProps> = ({ isOpen, onClose, onSelect, onAddNew, onScan }) => {
    const { customers } = useCustomer();
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) setSearch('');
    }, [isOpen]);

    const filtered = useMemo(() => {
        if (!search) return customers.slice(0, 10);
        const s = search.toLowerCase();
        return customers.filter((c) => 
            c.name.toLowerCase().includes(s) || 
            (c.contact && c.contact.includes(s)) ||
            c.memberId.toLowerCase().includes(s)
        );
    }, [customers, search]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cari Pelanggan Member"
            mobileLayout="fullscreen"
            size="lg"
        >
            <div className="space-y-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari Nama / HP / ID..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white auto-focus"
                            autoFocus
                        />
                        <Icon name="search" className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    </div>
                    <Button onClick={onScan} variant="secondary" className="px-3" title="Scan Kartu Member">
                        <Icon name="barcode" className="w-5 h-5"/>
                    </Button>
                </div>

                <div className="max-h-[60dvh] sm:max-h-60 overflow-y-auto space-y-2 bg-slate-900/50 p-1 rounded-lg">
                    {filtered.map((c) => (
                        <button 
                            key={c.id}
                            onClick={() => { onSelect(c); onClose(); }}
                            className="w-full flex justify-between items-center p-3 rounded bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-500 text-left group"
                        >
                            <div>
                                <p className="font-bold text-white group-hover:text-[#52a37c]">{c.name}</p>
                                <p className="text-xs text-slate-400">{c.memberId} {c.contact ? `• ${c.contact}` : ''}</p>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs text-yellow-400 font-bold">{c.points} Pts</span>
                                {c.balance > 0 && <span className="block text-xs text-green-400">{CURRENCY_FORMATTER.format(c.balance)}</span>}
                            </div>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-center py-4 text-slate-500 text-sm">
                            Member tidak ditemukan.
                        </div>
                    )}
                </div>

                <Button onClick={() => { onClose(); onAddNew(); }} className="w-full" variant="secondary">
                    <Icon name="plus" className="w-4 h-4" /> Daftar Member Baru
                </Button>
            </div>
        </Modal>
    );
};

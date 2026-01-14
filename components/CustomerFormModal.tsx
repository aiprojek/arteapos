
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import type { Customer } from '../types';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Omit<Customer, 'id' | 'memberId' | 'points' | 'balance' | 'createdAt'> | Customer) => void;
    customer: Customer | null;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, customer }) => {
    const [form, setForm] = useState({ name: '', contact: '' });
    
    useEffect(() => {
        if (customer) {
            setForm({ name: customer.name, contact: customer.contact || '' });
        } else {
            setForm({ name: '', contact: '' });
        }
    }, [customer, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(customer) {
            onSave({ ...customer, ...form });
        } else {
            onSave(form);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={customer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nama Pelanggan</label>
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" placeholder="Masukkan nama..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Identitas Tambahan / Kontak</label>
                    <input 
                        type="text" 
                        value={form.contact} 
                        onChange={e => setForm({...form, contact: e.target.value})} 
                        placeholder="Contoh: No. HP, NIK, Kelas, atau Divisi..." 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" 
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                        Bisa diisi Nomor Telepon, Nomor KTP, Keterangan Kelas (Santri), atau Unit Kerja.
                    </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    )
}

export default CustomerFormModal;

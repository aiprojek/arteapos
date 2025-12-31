
import React, { useState, useMemo } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import Icon from '../Icon';
import VirtualizedTable from '../VirtualizedTable';
import CustomerFormModal from '../CustomerFormModal';
import type { Customer } from '../../types';

const CustomersTab: React.FC = () => {
    const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomer();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const filteredCustomers = useMemo(() => 
        customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (c.contact && c.contact.includes(searchTerm)) ||
            c.memberId.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => b.points - a.points), // Sort by points (highest first)
    [customers, searchTerm]);

    const handleSave = (customerData: Omit<Customer, 'id' | 'memberId' | 'points' | 'createdAt'> | Customer) => {
        if ('id' in customerData) {
            updateCustomer(customerData as Customer);
        } else {
            addCustomer(customerData);
        }
        setModalOpen(false);
        setEditingCustomer(null);
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setModalOpen(true);
    };

    const columns = [
        { label: 'ID Member', width: '1fr', render: (c: Customer) => <span className="font-mono text-slate-400">{c.memberId}</span> },
        { label: 'Nama', width: '2fr', render: (c: Customer) => <span className="font-bold text-white">{c.name}</span> },
        { label: 'Kontak', width: '1.5fr', render: (c: Customer) => c.contact || '-' },
        { label: 'Poin', width: '1fr', render: (c: Customer) => <span className="text-yellow-400 font-bold">{c.points} pts</span> },
        { label: 'Bergabung', width: '1.5fr', render: (c: Customer) => <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString('id-ID')}</span> },
        { label: 'Aksi', width: '100px', render: (c: Customer) => (
            <div className="flex gap-2">
                <button onClick={() => handleEdit(c)} className="text-sky-400 hover:text-white"><Icon name="edit" className="w-4 h-4"/></button>
                <button onClick={() => deleteCustomer(c.id)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4"/></button>
            </div>
        )}
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="relative flex-grow max-w-md">
                    <input 
                        type="text" 
                        placeholder="Cari nama, HP, atau ID member..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white" 
                    />
                    <Icon name="search" className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                </div>
                <Button onClick={() => { setEditingCustomer(null); setModalOpen(true); }}>
                    <Icon name="plus" className="w-4 h-4" /> Tambah Member
                </Button>
            </div>
            
            <div className="bg-slate-800 rounded-lg shadow-md h-[500px] border border-slate-700">
                <VirtualizedTable data={filteredCustomers} columns={columns} rowHeight={50} />
            </div>

            <CustomerFormModal 
                isOpen={isModalOpen} 
                onClose={() => { setModalOpen(false); setEditingCustomer(null); }} 
                onSave={handleSave} 
                customer={editingCustomer} 
            />
        </div>
    );
};

export default CustomersTab;

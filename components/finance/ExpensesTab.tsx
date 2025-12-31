
import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import VirtualizedTable from '../VirtualizedTable';
import type { Expense } from '../../types';

interface ExpensesTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: Expense[];
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { expenses: localExpenses, addExpense, deleteExpense, updateExpense } = useFinance();
    const [isModalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ description: '', amount: '', category: 'Operasional', date: new Date().toISOString().slice(0, 10) });
    const [editingId, setEditingId] = useState<string | null>(null);

    const activeExpenses = dataSource === 'local' ? localExpenses : cloudData;

    const filteredExpenses = useMemo(() => 
        activeExpenses.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase())),
    [activeExpenses, searchTerm]);

    const handleSubmit = () => {
        if (!formData.description || !formData.amount) return;
        const payload = {
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category,
            date: new Date(formData.date).toISOString(),
            amountPaid: parseFloat(formData.amount) 
        };

        if (editingId) {
            const old = localExpenses.find(e => e.id === editingId);
            if (old) updateExpense({ ...old, ...payload });
        } else {
            addExpense(payload);
        }
        setModalOpen(false);
        setEditingId(null);
        setFormData({ description: '', amount: '', category: 'Operasional', date: new Date().toISOString().slice(0, 10) });
    };

    const handleEdit = (exp: Expense) => {
        setEditingId(exp.id);
        setFormData({
            description: exp.description,
            amount: exp.amount.toString(),
            category: exp.category,
            date: exp.date.slice(0, 10)
        });
        setModalOpen(true);
    };

    const columns = [
        { label: 'Tanggal', width: '1fr', render: (e: Expense) => new Date(e.date).toLocaleDateString('id-ID') },
        { label: 'Keterangan', width: '2fr', render: (e: Expense) => e.description },
        { label: 'Kategori', width: '1fr', render: (e: Expense) => <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{e.category}</span> },
        { label: 'Jumlah', width: '1fr', render: (e: Expense) => <span className="text-red-400 font-bold">{CURRENCY_FORMATTER.format(e.amount)}</span> },
        // Conditional Column for Store ID
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '1fr', 
            render: (e: any) => <span className="text-xs text-slate-400">{e.storeId || e.store_id || '-'}</span> 
        }] : []),
        { label: 'Aksi', width: '80px', render: (e: Expense) => (
            <div className="flex gap-2">
                {dataSource === 'local' ? (
                    <>
                        <button onClick={() => handleEdit(e)} className="text-sky-400 hover:text-white"><Icon name="edit" className="w-4 h-4"/></button>
                        <button onClick={() => deleteExpense(e.id)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4"/></button>
                    </>
                ) : <span className="text-xs text-slate-500">Read-only</span>}
            </div>
        )}
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <input type="text" placeholder="Cari pengeluaran..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                {dataSource === 'local' && <Button onClick={() => setModalOpen(true)}>+ Catat Pengeluaran</Button>}
            </div>
            
            <div className="h-[500px]">
                <VirtualizedTable data={filteredExpenses} columns={columns} rowHeight={50} minWidth={dataSource !== 'local' ? 900 : 800} />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"}>
                <div className="space-y-4">
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <input type="text" placeholder="Keterangan (cth: Listrik, Gaji)" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <input type="number" placeholder="Jumlah (Rp)" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                        <option>Operasional</option>
                        <option>Gaji Karyawan</option>
                        <option>Marketing</option>
                        <option>Maintenance</option>
                        <option>Lainnya</option>
                    </select>
                    <Button onClick={handleSubmit} className="w-full">{editingId ? "Simpan Perubahan" : "Simpan"}</Button>
                </div>
            </Modal>
        </div>
    );
};

export default ExpensesTab;


import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import VirtualizedTable from '../VirtualizedTable';
import type { OtherIncome } from '../../types';

interface IncomeTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: OtherIncome[];
}

const IncomeTab: React.FC<IncomeTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { otherIncomes: localIncomes, addOtherIncome, deleteOtherIncome, updateOtherIncome } = useFinance();
    const [isModalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ description: '', amount: '', category: 'Lainnya', date: new Date().toISOString().slice(0, 10) });
    const [editingId, setEditingId] = useState<string | null>(null);

    const activeIncomes = dataSource === 'local' ? localIncomes : cloudData;

    const filteredIncomes = useMemo(() => 
        activeIncomes.filter(i => i.description.toLowerCase().includes(searchTerm.toLowerCase())),
    [activeIncomes, searchTerm]);

    const handleSubmit = () => {
        if (!formData.description || !formData.amount) return;
        const payload = {
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category,
            date: new Date(formData.date).toISOString()
        };

        if (editingId) {
            const old = localIncomes.find(i => i.id === editingId);
            if (old) updateOtherIncome({ ...old, ...payload });
        } else {
            addOtherIncome(payload);
        }
        setModalOpen(false);
        setEditingId(null);
        setFormData({ description: '', amount: '', category: 'Lainnya', date: new Date().toISOString().slice(0, 10) });
    };

    const handleEdit = (inc: OtherIncome) => {
        setEditingId(inc.id);
        setFormData({
            description: inc.description,
            amount: inc.amount.toString(),
            category: inc.category,
            date: inc.date.slice(0, 10)
        });
        setModalOpen(true);
    };

    const columns = [
        { label: 'Tanggal', width: '1fr', render: (i: OtherIncome) => new Date(i.date).toLocaleDateString('id-ID') },
        { label: 'Keterangan', width: '2fr', render: (i: OtherIncome) => i.description },
        { label: 'Kategori', width: '1fr', render: (i: OtherIncome) => <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{i.category}</span> },
        { label: 'Jumlah', width: '1fr', render: (i: OtherIncome) => <span className="text-green-400 font-bold">{CURRENCY_FORMATTER.format(i.amount)}</span> },
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '1fr', 
            render: (e: any) => <span className="text-xs text-slate-400">{e.storeId || e.store_id || '-'}</span> 
        }] : []),
        { label: 'Aksi', width: '80px', render: (i: OtherIncome) => (
            <div className="flex gap-2">
                {dataSource === 'local' ? (
                    <>
                        <button onClick={() => handleEdit(i)} className="text-sky-400 hover:text-white"><Icon name="edit" className="w-4 h-4"/></button>
                        <button onClick={() => deleteOtherIncome(i.id)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4"/></button>
                    </>
                ) : <span className="text-xs text-slate-500">Read-only</span>}
            </div>
        )}
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <input type="text" placeholder="Cari pemasukan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                {dataSource === 'local' && <Button onClick={() => setModalOpen(true)}>+ Catat Pemasukan</Button>}
            </div>
            
            <div className="h-[500px]">
                <VirtualizedTable data={filteredIncomes} columns={columns} rowHeight={50} minWidth={dataSource !== 'local' ? 900 : 800}/>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Pemasukan" : "Catat Pemasukan Lain"}>
                <div className="space-y-4">
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <input type="text" placeholder="Keterangan (cth: Jual Kardus Bekas)" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <input type="number" placeholder="Jumlah (Rp)" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                        <option>Lainnya</option>
                        <option>Modal Tambahan</option>
                        <option>Investasi</option>
                        <option>Hibah/Hadiah</option>
                    </select>
                    <Button onClick={handleSubmit} className="w-full">{editingId ? "Simpan Perubahan" : "Simpan"}</Button>
                </div>
            </Modal>
        </div>
    );
};

export default IncomeTab;

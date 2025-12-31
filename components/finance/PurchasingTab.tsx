
import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import VirtualizedTable from '../VirtualizedTable';
import type { Purchase, Supplier } from '../../types';

interface PurchasingTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: Purchase[];
}

const PurchasingTab: React.FC<PurchasingTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { purchases: localPurchases, suppliers, addSupplier, deleteSupplier } = useFinance();
    const [view, setView] = useState<'purchases' | 'suppliers'>('purchases');
    
    const activePurchases = dataSource === 'local' ? localPurchases : cloudData;

    // Supplier State
    const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
    const [supplierForm, setSupplierForm] = useState({ name: '', contact: '' });

    const handleAddSupplier = () => {
        if (!supplierForm.name) return;
        addSupplier(supplierForm);
        setSupplierModalOpen(false);
        setSupplierForm({ name: '', contact: '' });
    };

    const purchaseColumns = [
        { label: 'Tanggal', width: '1fr', render: (p: Purchase) => new Date(p.date).toLocaleDateString('id-ID') },
        { label: 'Supplier', width: '1.5fr', render: (p: Purchase) => p.supplierName },
        { label: 'Total', width: '1fr', render: (p: Purchase) => CURRENCY_FORMATTER.format(p.totalAmount) },
        { label: 'Status', width: '1fr', render: (p: Purchase) => (
            <span className={`px-2 py-1 text-xs rounded font-bold ${p.status === 'lunas' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {p.status.toUpperCase()}
            </span>
        )},
        { label: 'Items', width: '2fr', render: (p: Purchase) => (
            <span className="text-xs text-slate-400">{p.items ? p.items.length : 0} items</span>
        )},
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '1fr', 
            render: (p: any) => <span className="text-xs text-slate-400">{p.storeId || p.store_id || '-'}</span> 
        }] : []),
    ];

    const supplierColumns = [
        { label: 'Nama Supplier', width: '2fr', render: (s: Supplier) => s.name },
        { label: 'Kontak', width: '2fr', render: (s: Supplier) => s.contact || '-' },
        { label: 'Aksi', width: '80px', render: (s: Supplier) => (
            <div className="flex gap-2">
                {dataSource === 'local' ? 
                    <button onClick={() => deleteSupplier(s.id)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4"/></button>
                : <span className="text-xs text-slate-500">Read-only</span>}
            </div>
        )}
    ];

    return (
        <div className="space-y-4">
            <div className="flex bg-slate-700 p-1 rounded-lg w-fit">
                <button onClick={() => setView('purchases')} className={`px-4 py-2 text-sm rounded transition-colors ${view === 'purchases' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Riwayat Pembelian</button>
                <button onClick={() => setView('suppliers')} className={`px-4 py-2 text-sm rounded transition-colors ${view === 'suppliers' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Daftar Supplier</button>
            </div>

            {view === 'purchases' ? (
                <div className="h-[500px]">
                    {dataSource === 'local' && (
                        <div className="bg-slate-900/50 p-4 rounded-lg mb-4 text-center border border-slate-700 border-dashed">
                            <p className="text-slate-400 text-sm">Untuk mencatat pembelian baru, silakan gunakan fitur <strong>"Terima Barang" (Restock)</strong> di halaman Kasir atau Bahan Baku. Sistem akan otomatis mencatat pembelian di sini.</p>
                        </div>
                    )}
                    <VirtualizedTable data={activePurchases} columns={purchaseColumns} rowHeight={50} minWidth={dataSource !== 'local' ? 900 : 800} />
                </div>
            ) : (
                <div className="space-y-4">
                    {dataSource === 'local' && <Button onClick={() => setSupplierModalOpen(true)}>+ Tambah Supplier</Button>}
                    <div className="h-[450px]">
                        <VirtualizedTable data={suppliers} columns={supplierColumns} rowHeight={50} />
                    </div>
                </div>
            )}

            <Modal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Tambah Supplier">
                <div className="space-y-4">
                    <input type="text" placeholder="Nama Supplier (PT/Toko)" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <input type="text" placeholder="Kontak / Alamat / Telp" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <Button onClick={handleAddSupplier} className="w-full">Simpan</Button>
                </div>
            </Modal>
        </div>
    );
};

export default PurchasingTab;

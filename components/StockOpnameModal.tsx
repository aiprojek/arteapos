
import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext'; // Import Auth

interface StockOpnameModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'product' | 'raw_material';
}

interface OpnameEntry {
    id: string;
    name: string;
    systemStock: number;
    actualStock: string; // string for input handling
    unit?: string;
    type: 'product' | 'raw_material';
}

const StockOpnameModal: React.FC<StockOpnameModalProps> = ({ isOpen, onClose, initialTab = 'product' }) => {
    const { products, rawMaterials, performStockOpname } = useProduct();
    const { showAlert } = useUI();
    const { currentUser } = useAuth(); // Get current user
    const [activeTab, setActiveTab] = useState<'product' | 'raw_material'>(initialTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [entries, setEntries] = useState<OpnameEntry[]>([]);
    const [notes, setNotes] = useState('');

    // Initialize entries when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            setNotes('');
            const productEntries: OpnameEntry[] = products
                .filter(p => p.trackStock) // Only trackable products
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    systemStock: p.stock || 0,
                    actualStock: (p.stock || 0).toString(),
                    type: 'product'
                }));
            
            const materialEntries: OpnameEntry[] = rawMaterials.map(m => ({
                id: m.id,
                name: m.name,
                systemStock: m.stock || 0,
                actualStock: (m.stock || 0).toString(),
                unit: m.unit,
                type: 'raw_material'
            }));

            setEntries([...productEntries, ...materialEntries]);
        }
    }, [isOpen, products, rawMaterials, initialTab]);

    const handleActualChange = (id: string, value: string) => {
        setEntries(prev => prev.map(entry => 
            entry.id === id ? { ...entry, actualStock: value } : entry
        ));
    };

    const handleConfirm = () => {
        const changes = entries.filter(e => {
            const actual = parseFloat(e.actualStock);
            return !isNaN(actual) && actual !== e.systemStock;
        });

        if (changes.length === 0) {
            showAlert({ type: 'alert', title: 'Tidak Ada Perubahan', message: 'Semua stok fisik sama dengan stok sistem.' });
            return;
        }

        showAlert({
            type: 'confirm',
            title: 'Konfirmasi Stock Opname',
            message: `Akan melakukan penyesuaian untuk ${changes.length} item. Lanjutkan?`,
            onConfirm: () => {
                const payload = changes.map(e => ({
                    id: e.id,
                    type: e.type,
                    systemStock: e.systemStock,
                    actualStock: parseFloat(e.actualStock),
                    name: e.name
                }));
                // Auto-append user name to notes for audit trail
                const userLabel = currentUser ? ` [Oleh: ${currentUser.name}]` : ' [Oleh: Staff]';
                performStockOpname(payload, notes + userLabel);
                onClose();
            }
        });
    };

    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => e.type === activeTab)
            .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [entries, activeTab, searchTerm]);

    const totalDiff = useMemo(() => {
        return filteredEntries.reduce((count, e) => {
            const actual = parseFloat(e.actualStock) || 0;
            return actual !== e.systemStock ? count + 1 : count;
        }, 0);
    }, [filteredEntries]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Stock Opname (Audit Stok)">
            <div className="flex flex-col h-[75vh]"> {/* Fixed height for scrolling */}
                
                <div className="flex gap-2 mb-4 bg-slate-700 p-1 rounded-lg shrink-0">
                    <button 
                        onClick={() => setActiveTab('product')} 
                        className={`flex-1 py-2 text-sm rounded-md transition-colors ${activeTab === 'product' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300 hover:bg-slate-600'}`}
                    >
                        Produk Jadi
                    </button>
                    <button 
                        onClick={() => setActiveTab('raw_material')} 
                        className={`flex-1 py-2 text-sm rounded-md transition-colors ${activeTab === 'raw_material' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300 hover:bg-slate-600'}`}
                    >
                        Bahan Baku
                    </button>
                </div>

                <div className="relative mb-4 shrink-0">
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        placeholder={`Cari ${activeTab === 'product' ? 'Produk' : 'Bahan'}...`} 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white"
                    />
                    <Icon name="search" className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 bg-slate-700 p-2 rounded-t-lg text-xs font-bold text-slate-300 shrink-0 pr-4">
                    <div className="col-span-5">Nama Item</div>
                    <div className="col-span-2 text-center">Sistem</div>
                    <div className="col-span-3 text-center">Fisik (Actual)</div>
                    <div className="col-span-2 text-right">Selisih</div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-700 border-t-0 rounded-b-lg p-2 space-y-2">
                    {filteredEntries.map(entry => {
                        const actual = parseFloat(entry.actualStock);
                        const diff = (isNaN(actual) ? 0 : actual) - entry.systemStock;
                        const isModified = diff !== 0;

                        return (
                            <div key={entry.id} className={`grid grid-cols-12 gap-2 items-center p-2 rounded border ${isModified ? 'border-yellow-600 bg-yellow-900/10' : 'border-slate-800 bg-slate-800'}`}>
                                <div className="col-span-5 text-sm text-white truncate">
                                    {entry.name}
                                    {entry.unit && <span className="text-xs text-slate-500 ml-1">({entry.unit})</span>}
                                </div>
                                <div className="col-span-2 text-center text-sm text-slate-400">
                                    {entry.systemStock}
                                </div>
                                <div className="col-span-3">
                                    <input 
                                        type="number" 
                                        value={entry.actualStock}
                                        onChange={(e) => handleActualChange(entry.id, e.target.value)}
                                        className={`w-full bg-slate-700 border rounded px-2 py-1 text-center font-bold focus:ring-1 focus:ring-[#347758] ${isModified ? 'text-yellow-400 border-yellow-600' : 'text-white border-slate-600'}`}
                                    />
                                </div>
                                <div className={`col-span-2 text-right text-sm font-bold ${diff === 0 ? 'text-slate-600' : diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {diff > 0 ? '+' : ''}{diff}
                                </div>
                            </div>
                        );
                    })}
                    {filteredEntries.length === 0 && <p className="text-center text-slate-500 py-4">Item tidak ditemukan.</p>}
                </div>

                <div className="mt-4 shrink-0 space-y-3">
                    <input 
                        type="text" 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        placeholder="Catatan Opname (Opsional, cth: Audit Akhir Bulan)" 
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <div className="flex gap-3">
                        <div className="flex-1 bg-slate-800 p-2 rounded text-center border border-slate-700">
                            <span className="text-xs text-slate-400 block">Item Selisih</span>
                            <span className={`font-bold ${totalDiff > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{totalDiff}</span>
                        </div>
                        <Button variant="primary" className="flex-[2]" onClick={handleConfirm}>
                            Simpan Hasil Opname
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StockOpnameModal;


import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';

interface StaffRestockModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AdjustmentType = 'in' | 'out';

const REASONS = [
    'Cacat Produksi / Reject',
    'Kelalaian / Jatuh / Pecah',
    'Kadaluarsa (Expired)',
    'Hilang / Selisih Stok',
    'Konsumsi Pribadi / Tester',
    'Lainnya'
];

const StaffRestockModal: React.FC<StaffRestockModalProps> = ({ isOpen, onClose }) => {
    const { products, rawMaterials, addStockAdjustment } = useProduct();
    const { showAlert } = useUI();
    const { currentUser } = useAuth();
    
    const [mode, setMode] = useState<AdjustmentType>('in');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<{id: string, name: string, type: 'product' | 'raw_material', currentStock: number} | null>(null);
    const [quantity, setQuantity] = useState('');
    const [selectedReason, setSelectedReason] = useState(REASONS[0]);
    const [notes, setNotes] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase();
        
        const matchingProducts = products
            .filter(p => p.trackStock && p.name.toLowerCase().includes(term))
            .map(p => ({ id: p.id, name: p.name, type: 'product' as const, currentStock: p.stock || 0 }));
            
        const matchingMaterials = rawMaterials
            .filter(m => m.name.toLowerCase().includes(term))
            .map(m => ({ id: m.id, name: m.name, type: 'raw_material' as const, currentStock: m.stock || 0 }));

        return [...matchingProducts, ...matchingMaterials];
    }, [searchTerm, products, rawMaterials]);

    const handleSelect = (item: any) => {
        setSelectedItem(item);
        setSearchTerm('');
    };

    const handleSave = () => {
        if (!selectedItem || !quantity) return;
        
        const qty = parseFloat(quantity);
        if (qty <= 0) {
            showAlert({ type: 'alert', title: 'Jumlah Salah', message: 'Jumlah stok harus lebih dari 0.' });
            return;
        }

        const isOut = mode === 'out';
        const finalQty = isOut ? -qty : qty; // Negative for waste
        
        // Construct detailed note
        const userLabel = currentUser ? `[Oleh: ${currentUser.name}]` : '[Oleh: Staff]';
        const reasonLabel = isOut ? `[${selectedReason}]` : '[Restock Masuk]';
        const finalNote = `${reasonLabel} ${notes ? `- ${notes}` : ''} ${userLabel}`;

        addStockAdjustment(selectedItem.id, finalQty, finalNote);
        
        const actionText = isOut ? 'dilaporkan (Keluar)' : 'ditambahkan (Masuk)';
        showAlert({ type: 'alert', title: 'Berhasil', message: `Stok ${selectedItem.name} berhasil ${actionText}.` });
        
        handleReset();
    };

    const handleReset = () => {
        setSelectedItem(null);
        setSearchTerm('');
        setQuantity('');
        setNotes('');
        setSelectedReason(REASONS[0]);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Manajemen Stok (Masuk & Keluar)">
            <div className="space-y-4">
                {/* Toggle Mode */}
                {!selectedItem && (
                    <div className="flex bg-slate-700 p-1 rounded-lg mb-4">
                        <button 
                            onClick={() => setMode('in')} 
                            className={`flex-1 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${mode === 'in' ? 'bg-green-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
                        >
                            <Icon name="download" className="w-4 h-4 rotate-180"/> Terima Barang
                        </button>
                        <button 
                            onClick={() => setMode('out')} 
                            className={`flex-1 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${mode === 'out' ? 'bg-red-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
                        >
                            <Icon name="trash" className="w-4 h-4"/> Lapor Kerusakan
                        </button>
                    </div>
                )}

                {!selectedItem ? (
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            {mode === 'in' ? 'Cari barang yang diterima:' : 'Cari barang yang rusak/terbuang:'}
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                placeholder="Ketik nama barang..." 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white"
                                autoFocus
                            />
                            <Icon name="search" className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                        </div>
                        
                        {searchTerm && (
                            <div className="mt-2 max-h-60 overflow-y-auto bg-slate-700 rounded-lg border border-slate-600">
                                {filteredItems.length === 0 ? (
                                    <p className="p-3 text-slate-400 text-sm text-center">Tidak ditemukan.</p>
                                ) : (
                                    filteredItems.map(item => (
                                        <button 
                                            key={item.id} 
                                            onClick={() => handleSelect(item)}
                                            className="w-full text-left p-3 hover:bg-slate-600 border-b border-slate-600 last:border-0 flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-bold text-white">{item.name}</p>
                                                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                                                    {item.type === 'product' ? 'Produk Jadi' : 'Bahan Baku'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">Sisa Stok</p>
                                                <p className="font-mono font-bold text-white">{item.currentStock}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`p-4 rounded-lg border ${mode === 'in' ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${mode === 'in' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                        {mode === 'in' ? 'Barang Masuk' : 'Barang Keluar'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-white">{selectedItem.name}</h3>
                                <p className="text-sm text-slate-400">Stok Saat Ini: <span className="text-white font-bold">{selectedItem.currentStock}</span></p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-sm text-sky-400 hover:underline">Ganti Barang</button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    {mode === 'in' ? 'Jumlah Diterima' : 'Jumlah Dibuang/Rusak'}
                                </label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={quantity} 
                                    onChange={e => setQuantity(e.target.value)} 
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg font-bold"
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>

                            {mode === 'out' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Alasan</label>
                                    <select 
                                        value={selectedReason} 
                                        onChange={e => setSelectedReason(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                    >
                                        {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Catatan Tambahan (Opsional)</label>
                                <input 
                                    type="text" 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                    placeholder={mode === 'in' ? "cth: Dari Supplier A" : "cth: Jatuh saat diantar ke meja 5"}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button variant="secondary" onClick={handleClose} className="flex-1">Batal</Button>
                            <Button 
                                variant={mode === 'in' ? 'primary' : 'danger'} 
                                onClick={handleSave} 
                                disabled={!quantity} 
                                className="flex-1"
                            >
                                {mode === 'in' ? 'Simpan Stok' : 'Lapor Kerusakan'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default StaffRestockModal;

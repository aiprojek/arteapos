
import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';

interface StaffRestockModalProps {
    isOpen: boolean;
    onClose: () => void;
    filterType?: 'product' | 'raw_material'; // New Prop for context awareness
}

type AdjustmentType = 'in' | 'out';
type ViewTab = 'all' | 'product' | 'raw_material';

const REASONS = [
    'Cacat Produksi / Reject',
    'Kelalaian / Jatuh / Pecah',
    'Kadaluarsa (Expired)',
    'Hilang / Selisih Stok',
    'Konsumsi Pribadi / Tester',
    'Lainnya'
];

const StaffRestockModal: React.FC<StaffRestockModalProps> = ({ isOpen, onClose, filterType }) => {
    const { products, rawMaterials, addStockAdjustment } = useProduct();
    const { showAlert } = useUI();
    const { currentUser } = useAuth();
    
    const [mode, setMode] = useState<AdjustmentType>('in');
    const [activeTab, setActiveTab] = useState<ViewTab>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<{id: string, name: string, type: 'product' | 'raw_material', currentStock: number, unit?: string, purchaseUnit?: string, conversionRate?: number} | null>(null);
    const [quantity, setQuantity] = useState('');
    const [selectedReason, setSelectedReason] = useState(REASONS[0]);
    const [notes, setNotes] = useState('');
    const [usePurchaseUnit, setUsePurchaseUnit] = useState(false);

    // Sync prop filterType to internal state
    useEffect(() => {
        if (filterType) {
            setActiveTab(filterType);
        } else {
            setActiveTab('all');
        }
    }, [filterType, isOpen]);

    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let results: any[] = [];

        // 1. Get Products if needed
        if (activeTab === 'all' || activeTab === 'product') {
            const matchedProducts = products
                .filter(p => p.trackStock && p.name.toLowerCase().includes(term))
                .map(p => ({ id: p.id, name: p.name, type: 'product' as const, currentStock: p.stock || 0 }));
            results = [...results, ...matchedProducts];
        }
            
        // 2. Get Raw Materials if needed
        if (activeTab === 'all' || activeTab === 'raw_material') {
            const matchedMaterials = rawMaterials
                .filter(m => m.name.toLowerCase().includes(term))
                .map(m => ({ 
                    id: m.id, 
                    name: m.name, 
                    type: 'raw_material' as const, 
                    currentStock: m.stock || 0,
                    unit: m.unit,
                    purchaseUnit: m.purchaseUnit,
                    conversionRate: m.conversionRate
                }));
            results = [...results, ...matchedMaterials];
        }

        // Sort: Items with lower stock first (visual urgency), then alphabetical
        return results.sort((a,b) => {
            if (a.currentStock === b.currentStock) return a.name.localeCompare(b.name);
            return a.currentStock - b.currentStock;
        });
    }, [searchTerm, products, rawMaterials, activeTab]);

    const handleSelect = (item: any) => {
        setSelectedItem(item);
        setSearchTerm('');
        setUsePurchaseUnit(false); // Reset toggle
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Strictly prevent negative numbers
        if (val.includes('-')) return;
        if (val && !/^\d*\.?\d*$/.test(val)) return;
        setQuantity(val);
    };

    const handleSave = () => {
        if (!selectedItem || !quantity) return;
        
        let qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            showAlert({ type: 'alert', title: 'Jumlah Salah', message: 'Jumlah stok harus lebih dari 0.' });
            return;
        }

        // Apply Conversion if toggle is ON
        if (usePurchaseUnit && selectedItem.conversionRate && selectedItem.conversionRate > 1) {
            qty = qty * selectedItem.conversionRate;
        }

        const isOut = mode === 'out';
        const finalQty = isOut ? -qty : qty; // Negative for waste
        
        // Construct detailed note
        const userLabel = currentUser ? `[Oleh: ${currentUser.name}]` : '[Oleh: Staff]';
        const reasonLabel = isOut ? `[${selectedReason}]` : '[Restock Masuk]';
        const unitLabel = usePurchaseUnit ? `(Input: ${quantity} ${selectedItem.purchaseUnit})` : '';
        const finalNote = `${reasonLabel} ${unitLabel} ${notes ? `- ${notes}` : ''} ${userLabel}`;

        addStockAdjustment(selectedItem.id, finalQty, finalNote);
        
        const actionText = isOut ? 'dilaporkan (Keluar)' : 'ditambahkan (Masuk)';
        showAlert({ type: 'alert', title: 'Berhasil', message: `Stok ${selectedItem.name} berhasil ${actionText} sebanyak ${qty} ${selectedItem.unit || 'Unit'}.` });
        
        handleReset();
    };

    const handleReset = () => {
        setSelectedItem(null);
        setSearchTerm('');
        setQuantity('');
        setNotes('');
        setSelectedReason(REASONS[0]);
        setUsePurchaseUnit(false);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const getTitle = () => {
        if (mode === 'in') return "Terima Barang (Stok Masuk)";
        return "Lapor Kerusakan/Waste (Stok Keluar)";
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={getTitle()}>
            <div className="space-y-4">
                
                {/* 1. Toggle Mode (IN / OUT) */}
                {!selectedItem && (
                    <div className="flex bg-slate-700 p-1 rounded-lg">
                        <button 
                            onClick={() => setMode('in')} 
                            className={`flex-1 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${mode === 'in' ? 'bg-green-600 text-white font-bold shadow' : 'text-slate-300 hover:text-white'}`}
                        >
                            <Icon name="download" className="w-4 h-4 rotate-180"/> Terima Barang
                        </button>
                        <button 
                            onClick={() => setMode('out')} 
                            className={`flex-1 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${mode === 'out' ? 'bg-red-600 text-white font-bold shadow' : 'text-slate-300 hover:text-white'}`}
                        >
                            <Icon name="trash" className="w-4 h-4"/> Lapor Kerusakan
                        </button>
                    </div>
                )}

                {/* 2. Search & List Section */}
                {!selectedItem ? (
                    <div>
                        {/* TYPE TABS (Shown if no strict filter passed) */}
                        {!filterType && (
                            <div className="flex gap-2 mb-3 border-b border-slate-700 pb-2">
                                <button 
                                    onClick={() => setActiveTab('all')}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTab === 'all' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Semua
                                </button>
                                <button 
                                    onClick={() => setActiveTab('product')}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTab === 'product' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Produk Jadi
                                </button>
                                <button 
                                    onClick={() => setActiveTab('raw_material')}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTab === 'raw_material' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Bahan Baku
                                </button>
                            </div>
                        )}

                        <label className="block text-sm text-slate-400 mb-2">
                            {mode === 'in' ? 'Cari barang yang diterima:' : 'Cari barang yang rusak/terbuang:'}
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                placeholder="Ketik nama barang..."
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white focus:border-[#347758] outline-none"
                                autoFocus
                            />
                            <Icon name="search" className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                        </div>
                        
                        {/* RESULT LIST */}
                        <div className="mt-2 max-h-60 overflow-y-auto bg-slate-700 rounded-lg border border-slate-600">
                            {filteredItems.length === 0 ? (
                                <p className="p-4 text-slate-400 text-sm text-center">
                                    {searchTerm ? 'Barang tidak ditemukan.' : 'Ketik nama barang di atas.'}
                                </p>
                            ) : (
                                filteredItems.map(item => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => handleSelect(item)}
                                        className="w-full text-left p-3 hover:bg-slate-600 border-b border-slate-600 last:border-0 flex justify-between items-center group transition-colors"
                                    >
                                        <div>
                                            <p className="font-bold text-white group-hover:text-[#52a37c]">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${item.type === 'product' ? 'bg-blue-900/50 text-blue-300' : 'bg-orange-900/50 text-orange-300'}`}>
                                                    {item.type === 'product' ? 'Produk' : 'Bahan'}
                                                </span>
                                                {item.unit && <span className="text-xs text-slate-400">Unit: {item.unit}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">Sisa Stok</p>
                                            <p className={`font-mono font-bold ${item.currentStock <= 5 ? 'text-red-400' : 'text-white'}`}>
                                                {item.currentStock}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    /* 3. Input Details Section */
                    <div className={`p-4 rounded-lg border animate-fade-in ${mode === 'in' ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${mode === 'in' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                        {mode === 'in' ? 'Barang Masuk' : 'Barang Keluar'}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase border ${selectedItem.type === 'product' ? 'border-blue-500 text-blue-400' : 'border-orange-500 text-orange-400'}`}>
                                        {selectedItem.type === 'product' ? 'Produk' : 'Bahan Baku'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-white">{selectedItem.name}</h3>
                                <p className="text-sm text-slate-400">Stok Saat Ini: <span className="text-white font-bold">{selectedItem.currentStock} {selectedItem.unit || ''}</span></p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-sm text-sky-400 hover:underline hover:text-white">Ganti Barang</button>
                        </div>

                        <div className="space-y-4">
                            {/* CONVERSION TOGGLE */}
                            {selectedItem.purchaseUnit && selectedItem.conversionRate && selectedItem.conversionRate > 1 && (
                                <div className="bg-slate-800 p-2 rounded flex items-center justify-between border border-slate-600">
                                    <label className="text-sm text-slate-300 flex-1 cursor-pointer" htmlFor="unitToggle">
                                        Input dalam <strong>{selectedItem.purchaseUnit}</strong> (Besar)?
                                        <span className="block text-[10px] text-green-400 mt-0.5">1 {selectedItem.purchaseUnit} = {selectedItem.conversionRate} {selectedItem.unit}</span>
                                    </label>
                                    <input 
                                        type="checkbox" 
                                        id="unitToggle"
                                        checked={usePurchaseUnit}
                                        onChange={e => setUsePurchaseUnit(e.target.checked)}
                                        className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-[#347758]"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    {mode === 'in' ? 'Jumlah Diterima' : 'Jumlah Dibuang/Rusak'} ({usePurchaseUnit ? selectedItem.purchaseUnit : (selectedItem.unit || 'Pcs')})
                                </label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    value={quantity} 
                                    onChange={handleQuantityChange} 
                                    onKeyDown={(e) => { if(['-','e'].includes(e.key)) e.preventDefault(); }}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg font-bold focus:ring-[#347758] focus:border-[#347758]"
                                    placeholder="0"
                                    autoFocus
                                />
                                {usePurchaseUnit && quantity && selectedItem.conversionRate && (
                                    <p className="text-xs text-green-400 mt-1 text-right">
                                        Total masuk sistem: <strong>{parseFloat(quantity) * selectedItem.conversionRate} {selectedItem.unit}</strong>
                                    </p>
                                )}
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

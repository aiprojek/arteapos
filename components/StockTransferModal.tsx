
import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
import { useSettings } from '../context/SettingsContext';
import { dropboxService } from '../services/dropboxService';

interface StockTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const StockTransferModal: React.FC<StockTransferModalProps> = ({ isOpen, onClose }) => {
    const { products, rawMaterials } = useProduct();
    const { receiptSettings } = useSettings();
    const { showAlert } = useUI();
    
    const [targetStoreId, setTargetStoreId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<Array<{
        id: string; 
        type: 'product' | 'raw_material'; 
        name: string; 
        qty: string;
        currentStock: number;
    }>>([]);
    const [isSending, setIsSending] = useState(false);
    const [notes, setNotes] = useState('');

    const availableBranches = receiptSettings.branches || [];

    const handleAddItem = (item: any) => {
        if (selectedItems.find(i => i.id === item.id)) return;
        setSelectedItems([...selectedItems, {
            id: item.id,
            type: item.type,
            name: item.name,
            currentStock: item.stock || 0,
            qty: '1'
        }]);
        setSearchTerm('');
    };

    const handleRemoveItem = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const handleQtyChange = (id: string, val: string) => {
        setSelectedItems(selectedItems.map(i => i.id === id ? { ...i, qty: val } : i));
    };

    const handleSend = async () => {
        if (!targetStoreId) {
            showAlert({ type: 'alert', title: 'Pilih Tujuan', message: 'Silakan pilih cabang tujuan pengiriman.' });
            return;
        }
        if (selectedItems.length === 0) {
            showAlert({ type: 'alert', title: 'Kosong', message: 'Pilih minimal satu barang.' });
            return;
        }

        setIsSending(true);
        try {
            const payloadItems = selectedItems.map(i => ({
                id: i.id,
                type: i.type,
                name: i.name,
                qty: parseFloat(i.qty) || 0
            })).filter(i => i.qty > 0);

            if (payloadItems.length === 0) throw new Error("Jumlah barang tidak valid.");

            await dropboxService.uploadStockTransfer(targetStoreId, payloadItems, notes);
            
            showAlert({ type: 'alert', title: 'Terkirim', message: 'Paket stok berhasil dikirim ke Cloud. Cabang akan menerima stok saat melakukan Sync.' });
            onClose();
            // Reset
            setSelectedItems([]);
            setTargetStoreId('');
            setNotes('');
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal Kirim', message: e.message });
        } finally {
            setIsSending(false);
        }
    };

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase();
        const pList = products.filter(p => p.trackStock && p.name.toLowerCase().includes(term)).map(p => ({...p, type: 'product' as const}));
        const mList = rawMaterials.filter(m => m.name.toLowerCase().includes(term)).map(m => ({...m, type: 'raw_material' as const}));
        return [...pList, ...mList].slice(0, 10);
    }, [searchTerm, products, rawMaterials]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Transfer Stok ke Cabang (Gudang)">
            <div className="space-y-4 max-h-[75vh] flex flex-col">
                
                {/* Target Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Tujuan Pengiriman</label>
                    <select 
                        value={targetStoreId} 
                        onChange={(e) => setTargetStoreId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold"
                    >
                        <option value="">-- Pilih Cabang --</option>
                        {availableBranches.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                        ))}
                    </select>
                    {availableBranches.length === 0 && (
                        <p className="text-xs text-red-400 mt-1">Belum ada cabang terdaftar. Atur di Pengaturan.</p>
                    )}
                </div>

                {/* Item Search */}
                <div className="relative">
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white"
                        placeholder="Cari barang untuk dikirim..."
                    />
                    <Icon name="search" className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"/>
                    
                    {searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg max-h-40 overflow-y-auto z-10 shadow-xl">
                            {filteredOptions.map(opt => (
                                <button 
                                    key={opt.id} 
                                    onClick={() => handleAddItem(opt)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-600 border-b border-slate-600 last:border-0"
                                >
                                    <span className="font-bold text-white block">{opt.name}</span>
                                    <span className="text-xs text-slate-400">Stok Gudang: {opt.stock} | {opt.type === 'product' ? 'Produk' : 'Bahan'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected List */}
                <div className="flex-1 overflow-y-auto bg-slate-900/50 rounded-lg border border-slate-700 p-2 space-y-2 min-h-[200px]">
                    {selectedItems.length === 0 ? (
                        <p className="text-center text-slate-500 text-sm py-8">Belum ada barang dipilih.</p>
                    ) : (
                        selectedItems.map(item => (
                            <div key={item.id} className="bg-slate-800 p-2 rounded flex justify-between items-center border border-slate-700">
                                <div className="flex-1">
                                    <p className="font-bold text-white text-sm">{item.name}</p>
                                    <p className="text-[10px] text-slate-400">{item.type === 'product' ? 'Produk' : 'Bahan'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="0" 
                                        value={item.qty}
                                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                        className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-center text-white font-bold"
                                        placeholder="Qty"
                                    />
                                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 p-1 hover:bg-slate-700 rounded">
                                        <Icon name="close" className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div>
                    <label className="block text-sm text-slate-300 mb-1">Catatan Surat Jalan</label>
                    <input 
                        type="text" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="No. SJ / Supir / Plat No..."
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                    />
                </div>

                <Button onClick={handleSend} disabled={isSending} className="w-full py-3 bg-blue-600 hover:bg-blue-500 border-none">
                    {isSending ? 'Mengirim...' : <><Icon name="share" className="w-4 h-4"/> Kirim Stok ke Cabang</>}
                </Button>
            </div>
        </Modal>
    );
};

export default StockTransferModal;

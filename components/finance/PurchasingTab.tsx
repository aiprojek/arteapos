
import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useProduct } from '../../context/ProductContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import VirtualizedTable from '../VirtualizedTable';
import type { Purchase, Supplier, PurchaseItem } from '../../types';

interface PurchasingTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: Purchase[];
}

const PurchasingTab: React.FC<PurchasingTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { purchases: localPurchases, suppliers, addSupplier, deleteSupplier, addPurchase } = useFinance();
    const { products, rawMaterials } = useProduct(); // Access items for dropdown
    const [view, setView] = useState<'purchases' | 'suppliers'>('purchases');
    
    const activePurchases = dataSource === 'local' ? localPurchases : cloudData;

    // Supplier Modal State
    const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
    const [supplierForm, setSupplierForm] = useState({ name: '', contact: '' });

    // Purchase Modal State
    const [isPurchaseModalOpen, setPurchaseModalOpen] = useState(false);
    const [purchaseForm, setPurchaseForm] = useState({
        supplierId: '',
        date: new Date().toISOString().slice(0, 10),
        amountPaid: '',
        items: [] as PurchaseItem[]
    });
    // Temp Item State for Purchase Form
    const [tempItem, setTempItem] = useState<{
        type: 'product' | 'raw_material', 
        id: string, 
        qty: string, 
        price: string // Price per unit input
    }>({ type: 'product', id: '', qty: '', price: '' });

    // --- Handlers ---

    const handleAddSupplier = () => {
        if (!supplierForm.name) return;
        addSupplier(supplierForm);
        setSupplierModalOpen(false);
        setSupplierForm({ name: '', contact: '' });
    };

    const getSelectedItemDetails = () => {
        if (!tempItem.id) return null;
        if (tempItem.type === 'product') return products.find(p => p.id === tempItem.id);
        return rawMaterials.find(m => m.id === tempItem.id);
    };

    const selectedItemDetails = getSelectedItemDetails();

    const handleAddItemToPurchase = () => {
        if (!tempItem.id || !tempItem.qty || !tempItem.price) return;
        
        let quantity = parseFloat(tempItem.qty);
        const inputPrice = parseFloat(tempItem.price);
        let finalPrice = inputPrice;
        let conversionApplied = false;

        // CHECK FOR CONVERSION (Raw Material Only)
        // If conversion exists, User inputs "Purchase Unit" (e.g. 1 Box) with "Price per Box" (e.g. 100.000)
        // System must save: Quantity = 12 (Base Unit), Price = 8333 (Base Price)
        if (tempItem.type === 'raw_material' && selectedItemDetails && 'conversionRate' in selectedItemDetails) {
            const mat = selectedItemDetails as any; // Cast for TS check
            if (mat.conversionRate && mat.conversionRate > 1 && mat.purchaseUnit) {
                const totalCost = quantity * inputPrice; // 1 Box * 100.000 = 100.000
                quantity = quantity * mat.conversionRate; // 1 * 12 = 12 Pcs
                finalPrice = totalCost / quantity; // 100.000 / 12 = 8333.33
                conversionApplied = true;
            }
        }

        const newItem: PurchaseItem = {
            itemType: tempItem.type,
            productId: tempItem.type === 'product' ? tempItem.id : undefined,
            rawMaterialId: tempItem.type === 'raw_material' ? tempItem.id : undefined,
            quantity: quantity,
            price: finalPrice,
            conversionApplied: conversionApplied
        };

        setPurchaseForm(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));

        // Reset temp item but keep type for convenience
        setTempItem(prev => ({ ...prev, id: '', qty: '', price: '' }));
    };

    const handleRemoveItemFromPurchase = (index: number) => {
        setPurchaseForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleSavePurchase = () => {
        if (!purchaseForm.supplierId || purchaseForm.items.length === 0) return;

        const amountPaid = purchaseForm.amountPaid ? parseFloat(purchaseForm.amountPaid) : 0;

        addPurchase({
            supplierId: purchaseForm.supplierId,
            date: new Date(purchaseForm.date).toISOString(),
            amountPaid: amountPaid,
            items: purchaseForm.items
        });

        setPurchaseModalOpen(false);
        setPurchaseForm({ supplierId: '', date: new Date().toISOString().slice(0, 10), amountPaid: '', items: [] });
    };

    const calculateTotal = () => {
        return purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    // --- Columns ---

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

    // Helper to get name for display in modal
    const getItemName = (item: PurchaseItem) => {
        if (item.itemType === 'product') return products.find(p => p.id === item.productId)?.name || 'Unknown Product';
        return rawMaterials.find(m => m.id === item.rawMaterialId)?.name || 'Unknown Material';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex bg-slate-700 p-1 rounded-lg w-fit">
                    <button onClick={() => setView('purchases')} className={`px-4 py-2 text-sm rounded transition-colors ${view === 'purchases' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Riwayat Pembelian</button>
                    <button onClick={() => setView('suppliers')} className={`px-4 py-2 text-sm rounded transition-colors ${view === 'suppliers' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Daftar Supplier</button>
                </div>
                {dataSource === 'local' && view === 'purchases' && (
                    <Button onClick={() => setPurchaseModalOpen(true)}>
                        <Icon name="plus" className="w-4 h-4" /> Catat Pembelian
                    </Button>
                )}
            </div>

            {view === 'purchases' ? (
                <div className="h-[500px]">
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

            {/* Supplier Modal */}
            <Modal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Tambah Supplier">
                <div className="space-y-4">
                    <input type="text" placeholder="Nama Supplier (PT/Toko)" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <input type="text" placeholder="Kontak / Alamat / Telp" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <Button onClick={handleAddSupplier} className="w-full">Simpan</Button>
                </div>
            </Modal>

            {/* Purchase Form Modal */}
            <Modal isOpen={isPurchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="Catat Pembelian & Restock">
                <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Tanggal</label>
                            <input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Supplier</label>
                            <select 
                                value={purchaseForm.supplierId} 
                                onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white"
                            >
                                <option value="">-- Pilih Supplier --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {suppliers.length === 0 && <p className="text-[10px] text-red-400 mt-1">Belum ada supplier. Tambah di tab Supplier.</p>}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-3">
                        <h4 className="text-sm font-bold text-white">Input Barang Belanja</h4>
                        
                        <div className="flex gap-2">
                            <select 
                                value={tempItem.type} 
                                onChange={e => setTempItem({...tempItem, type: e.target.value as any, id: ''})}
                                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                            >
                                <option value="product">Produk</option>
                                <option value="raw_material">Bahan Baku</option>
                            </select>
                            
                            <select
                                value={tempItem.id}
                                onChange={e => setTempItem({...tempItem, id: e.target.value})}
                                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                            >
                                <option value="">-- Pilih Item --</option>
                                {tempItem.type === 'product' 
                                    ? products.filter(p => p.trackStock).map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                    : rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                }
                            </select>
                        </div>

                        {/* INFO UNIT & CONVERSION LOGIC */}
                        {selectedItemDetails && (
                            <div className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                                <p>Satuan Pakai (Base): <strong>{(selectedItemDetails as any).unit || 'Unit'}</strong></p>
                                {(selectedItemDetails as any).purchaseUnit && (selectedItemDetails as any).conversionRate > 1 && (
                                    <p className="text-green-400 mt-1">
                                        💡 Item ini memiliki konversi:<br/>
                                        1 {(selectedItemDetails as any).purchaseUnit} = {(selectedItemDetails as any).conversionRate} {(selectedItemDetails as any).unit}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-500 mb-1">
                                    {/* DYNAMIC LABEL based on Purchase Unit */}
                                    Qty ({(selectedItemDetails as any)?.purchaseUnit && (selectedItemDetails as any)?.conversionRate > 1 
                                        ? (selectedItemDetails as any).purchaseUnit 
                                        : ((selectedItemDetails as any)?.unit || 'Unit')})
                                </label>
                                <input 
                                    type="number" placeholder="Qty" min="0" step="0.01"
                                    value={tempItem.qty} 
                                    onChange={e => setTempItem({...tempItem, qty: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-500 mb-1">
                                    {/* DYNAMIC LABEL based on Purchase Unit */}
                                    Harga Satuan (per {(selectedItemDetails as any)?.purchaseUnit && (selectedItemDetails as any)?.conversionRate > 1 
                                        ? (selectedItemDetails as any).purchaseUnit 
                                        : 'Unit'})
                                </label>
                                <input 
                                    type="number" placeholder="Harga (Rp)" min="0"
                                    value={tempItem.price} 
                                    onChange={e => setTempItem({...tempItem, price: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button size="sm" onClick={handleAddItemToPurchase} disabled={!tempItem.id || !tempItem.qty || !tempItem.price}>
                                    <Icon name="plus" className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Item List */}
                    <div className="bg-slate-900 rounded-lg p-2 max-h-40 overflow-y-auto">
                        {purchaseForm.items.length === 0 ? (
                            <p className="text-center text-xs text-slate-500 py-2">Belum ada barang di daftar pembelian.</p>
                        ) : (
                            purchaseForm.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs text-slate-300 py-1 border-b border-slate-800 last:border-0">
                                    <div className="flex-1 truncate pr-2">
                                        <span className="text-white block">{getItemName(item)}</span>
                                        <span>
                                            {item.quantity} x {CURRENCY_FORMATTER.format(item.price)}
                                            {item.conversionApplied && <span className="text-[9px] text-green-400 ml-1 block">(Telah dikonversi ke satuan pakai)</span>}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{CURRENCY_FORMATTER.format(item.quantity * item.price)}</span>
                                        <button onClick={() => handleRemoveItemFromPurchase(idx)} className="text-red-400 hover:text-white">
                                            <Icon name="close" className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-slate-700 pt-3">
                        <div className="flex justify-between items-center text-lg font-bold text-white mb-3">
                            <span>Total</span>
                            <span>{CURRENCY_FORMATTER.format(calculateTotal())}</span>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Jumlah Dibayar (DP/Lunas)</label>
                            <input 
                                type="number" 
                                placeholder="0" 
                                value={purchaseForm.amountPaid} 
                                onChange={e => setPurchaseForm({...purchaseForm, amountPaid: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-bold"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                                Jika dibayar penuh, stok akan bertambah dan status 'LUNAS'. 
                                Jika sebagian, status 'BELUM LUNAS'.
                            </p>
                        </div>
                    </div>

                    <Button onClick={handleSavePurchase} disabled={purchaseForm.items.length === 0 || !purchaseForm.supplierId} className="w-full mt-2">
                        Simpan Pembelian
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default PurchasingTab;

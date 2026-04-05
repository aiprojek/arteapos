
import React, { useState, useMemo, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useProduct } from '../../context/ProductContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import VirtualizedTable from '../VirtualizedTable';
import type { Purchase, Supplier, PurchaseItem, PaymentMethod } from '../../types';
import { compressImage } from '../../utils/imageCompression';
import { ocrService } from '../../services/ocrService';
import { useUIActions } from '../../context/UIContext';
import { Capacitor } from '@capacitor/core';
import { saveBinaryFileNative } from '../../utils/nativeHelper';
import CameraCaptureModal from '../CameraCaptureModal'; // NEW Import

interface PurchasingTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: Purchase[];
}

const PurchasingTab: React.FC<PurchasingTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { purchases: localPurchases, suppliers, addSupplier, deleteSupplier, addPurchase } = useFinance();
    const { products, rawMaterials } = useProduct(); 
    const { showAlert } = useUIActions();
    const [view, setView] = useState<'purchases' | 'suppliers'>('purchases');
    const [searchTerm, setSearchTerm] = useState('');
    
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
        items: [] as PurchaseItem[],
        evidenceImageUrl: '',
        paymentMethod: 'cash' as PaymentMethod
    });
    
    // Temp Item State
    const [tempItem, setTempItem] = useState<{
        type: 'product' | 'raw_material', 
        id: string, 
        qty: string, 
        price: string 
    }>({ type: 'product', id: '', qty: '', price: '' });

    const [isScanning, setIsScanning] = useState(false);
    
    // UPDATED: Evidence View with Zoom
    const [viewEvidence, setViewEvidence] = useState<{ url: string; filename: string } | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    // NEW: Camera Modal
    const [isCameraOpen, setCameraOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredPurchases = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return activePurchases;
        return activePurchases.filter((purchase) => {
            const supplier = purchase.supplierName?.toLowerCase() || '';
            const status = purchase.status?.toLowerCase() || '';
            const dateLabel = new Date(purchase.date).toLocaleDateString('id-ID').toLowerCase();
            return supplier.includes(keyword) || status.includes(keyword) || dateLabel.includes(keyword);
        });
    }, [activePurchases, searchTerm]);

    const filteredSuppliers = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return suppliers;
        return suppliers.filter((supplier) =>
            supplier.name.toLowerCase().includes(keyword) ||
            (supplier.contact || '').toLowerCase().includes(keyword)
        );
    }, [suppliers, searchTerm]);

    const totalPurchases = useMemo(
        () => activePurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0),
        [activePurchases]
    );
    const outstandingPurchases = useMemo(
        () => activePurchases.filter((purchase) => purchase.status !== 'lunas').length,
        [activePurchases]
    );
    const purchaseResultsCount = view === 'purchases' ? filteredPurchases.length : filteredSuppliers.length;

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

        if (tempItem.type === 'raw_material' && selectedItemDetails && 'conversionRate' in selectedItemDetails) {
            const mat = selectedItemDetails as any;
            if (mat.conversionRate && mat.conversionRate > 1 && mat.purchaseUnit) {
                const totalCost = quantity * inputPrice; 
                quantity = quantity * mat.conversionRate; 
                finalPrice = totalCost / quantity; 
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
            items: purchaseForm.items,
            evidenceImageUrl: purchaseForm.evidenceImageUrl,
            paymentMethod: purchaseForm.paymentMethod
        });

        setPurchaseModalOpen(false);
        setPurchaseForm({ 
            supplierId: '', date: new Date().toISOString().slice(0, 10), 
            amountPaid: '', items: [], evidenceImageUrl: '', paymentMethod: 'cash' 
        });
    };

    const calculateTotal = () => {
        return purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    // --- Image & OCR ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setPurchaseForm(prev => ({ ...prev, evidenceImageUrl: compressed }));
            } catch (err) {
                showAlert({ type: 'alert', title: 'Error', message: 'Gagal memproses gambar.' });
            }
        }
    };

    const handleScanOCR = async () => {
        if (!purchaseForm.evidenceImageUrl) return;
        setIsScanning(true);
        try {
            const result = await ocrService.scanReceipt(purchaseForm.evidenceImageUrl);
            // Purchase logic: OCR date applies to purchase date. Amount might be total paid/bill.
            // We set amountPaid if it's currently empty, assuming user pays full.
            setPurchaseForm(prev => ({
                ...prev,
                date: result.date ? result.date : prev.date,
                amountPaid: (result.amount && !prev.amountPaid) ? result.amount.toString() : prev.amountPaid
            }));
            showAlert({ type: 'alert', title: 'Scan Selesai', message: 'Tanggal & perkiraan total dideteksi.' });
        } catch (err: any) {
            showAlert({ type: 'alert', title: 'Gagal Scan', message: err.message });
        } finally {
            setIsScanning(false);
        }
    };

    const handleDownloadEvidence = async () => {
        if (!viewEvidence) return;
        try {
            const fileName = viewEvidence.filename;
            if (Capacitor.isNativePlatform()) {
                await saveBinaryFileNative(fileName, viewEvidence.url.split(',')[1]);
                showAlert({ type: 'alert', title: 'Berhasil', message: `Gambar disimpan: ${fileName}` });
            } else {
                const link = document.createElement('a');
                link.href = viewEvidence.url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: e.message });
        }
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
    const handleResetZoom = () => setZoomLevel(1);

    // --- Columns ---

    const purchaseColumns = [
        { label: 'Tanggal', width: '1fr', render: (p: Purchase) => new Date(p.date).toLocaleDateString('id-ID') },
        { label: 'Supplier', width: '1.5fr', render: (p: Purchase) => (
            <div className="flex items-center gap-2">
                {p.evidenceImageUrl && (
                    <button 
                        onClick={(evt) => { 
                            evt.stopPropagation(); 
                            const safeSupp = p.supplierName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                            setViewEvidence({
                                url: p.evidenceImageUrl!,
                                filename: `Bukti_Beli_${safeSupp}_${p.date.slice(0,10)}.jpg`
                            }); 
                            setZoomLevel(1); // Reset
                        }}
                        className="text-blue-400 hover:text-blue-300"
                        title="Lihat Nota"
                    >
                        <Icon name="camera" className="w-4 h-4"/>
                    </button>
                )}
                <span className="truncate">{p.supplierName}</span>
            </div>
        ) },
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

    const getItemName = (item: PurchaseItem) => {
        if (item.itemType === 'product') return products.find(p => p.id === item.productId)?.name || 'Unknown Product';
        return rawMaterials.find(m => m.id === item.rawMaterialId)?.name || 'Unknown Material';
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Total Pembelian</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{CURRENCY_FORMATTER.format(totalPurchases)}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Akumulasi nilai pembelian dari sumber data yang sedang aktif.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Supplier Aktif</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{suppliers.length}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Jumlah supplier yang siap dipakai saat mencatat pembelian.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Belum Lunas</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{outstandingPurchases}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Pembelian yang masih perlu ditindaklanjuti pembayarannya.</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3 sm:p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex bg-slate-800 p-1 rounded-xl w-full lg:w-fit overflow-x-auto scrollbar-hide">
                            <button onClick={() => setView('purchases')} className={`flex-1 px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors whitespace-nowrap ${view === 'purchases' ? 'bg-[#347758] text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700/70'}`}>Riwayat Pembelian</button>
                            <button onClick={() => setView('suppliers')} className={`flex-1 px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors whitespace-nowrap ${view === 'suppliers' ? 'bg-[#347758] text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700/70'}`}>Daftar Supplier</button>
                        </div>
                        {dataSource === 'local' && (
                            view === 'purchases' ? (
                                <Button onClick={() => setPurchaseModalOpen(true)} className="h-11 w-full lg:w-auto whitespace-nowrap">
                                    <Icon name="plus" className="w-4 h-4" /> Catat Pembelian
                                </Button>
                            ) : (
                                <Button onClick={() => setSupplierModalOpen(true)} className="h-11 w-full lg:w-auto whitespace-nowrap">
                                    <Icon name="plus" className="w-4 h-4" /> Tambah Supplier
                                </Button>
                            )
                        )}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder={view === 'purchases' ? 'Cari supplier, status, atau tanggal...' : 'Cari nama supplier atau kontak...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-12 text-white focus:border-[#347758] focus:ring-[#347758]"
                            />
                            <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                                    title="Bersihkan pencarian"
                                >
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-center sm:min-w-[150px]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Hasil Tampil</p>
                            <p className="mt-1 text-lg font-bold text-white">{purchaseResultsCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {view === 'purchases' ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 overflow-hidden">
                    {filteredPurchases.length > 0 ? (
                        <>
                            <div className="md:hidden">
                                <div className="space-y-2 p-2">
                                    {filteredPurchases.map((purchase) => (
                                        <div key={purchase.id} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="truncate pr-1 text-[12px] font-bold leading-tight text-white">{purchase.supplierName}</p>
                                                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${purchase.status === 'lunas' ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                                                            {purchase.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                                        {new Date(purchase.date).toLocaleDateString('id-ID')} • {purchase.items?.length || 0} item
                                                    </p>
                                                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                                                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-blue-300">
                                                            {CURRENCY_FORMATTER.format(purchase.totalAmount)}
                                                        </span>
                                                        {purchase.evidenceImageUrl && (
                                                            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-sky-300">
                                                                Ada nota
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {purchase.evidenceImageUrl && (
                                                <div className="mt-2">
                                                    <Button
                                                        type="button"
                                                        variant="operational"
                                                        size="sm"
                                                        onClick={() => {
                                                            const safeSupp = purchase.supplierName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                                                            setViewEvidence({
                                                                url: purchase.evidenceImageUrl!,
                                                                filename: `Bukti_Beli_${safeSupp}_${purchase.date.slice(0,10)}.jpg`
                                                            });
                                                            setZoomLevel(1);
                                                        }}
                                                        className="h-8 w-full gap-1 px-2 text-[11px] sm:text-sm"
                                                    >
                                                        <Icon name="camera" className="w-4 h-4" />
                                                        <span>Lihat Bukti</span>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="hidden md:block h-[500px]">
                                <VirtualizedTable data={filteredPurchases} columns={purchaseColumns} rowHeight={50} minWidth={dataSource !== 'local' ? 900 : 800} />
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                            <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                                <Icon name="cart" className="mx-auto h-10 w-10 text-slate-500" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-white">
                                {searchTerm ? 'Pembelian tidak ditemukan.' : 'Belum ada pembelian tercatat.'}
                            </h3>
                            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                                {searchTerm
                                    ? 'Coba ubah kata kunci pencarian atau periksa kembali supplier dan tanggal yang Anda cari.'
                                    : 'Catat pembelian pertama agar riwayat restock dan tagihan supplier mulai terdokumentasi dengan rapi.'}
                            </p>
                            {dataSource === 'local' && !searchTerm && (
                                <Button onClick={() => setPurchaseModalOpen(true)} className="mt-4">
                                    <Icon name="plus" className="w-4 h-4" /> Catat Pembelian Pertama
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 overflow-hidden">
                    {filteredSuppliers.length > 0 ? (
                        <>
                            <div className="md:hidden">
                                <div className="space-y-2 p-2">
                                    {filteredSuppliers.map((supplier) => (
                                        <div key={supplier.id} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[12px] font-bold leading-tight text-white">{supplier.name}</p>
                                                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{supplier.contact || 'Belum ada kontak tersimpan.'}</p>
                                                </div>
                                                {dataSource === 'local' && (
                                                    <Button
                                                        type="button"
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => deleteSupplier(supplier.id)}
                                                        className="h-8 gap-1 px-2 text-[11px] sm:text-sm"
                                                    >
                                                        <Icon name="trash" className="w-4 h-4" />
                                                        <span className="hidden min-[380px]:inline">Hapus</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="hidden md:block h-[450px]">
                                <VirtualizedTable data={filteredSuppliers} columns={supplierColumns} rowHeight={50} minWidth={760} />
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
                            <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                                <Icon name="users" className="mx-auto h-10 w-10 text-slate-500" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-white">
                                {searchTerm ? 'Supplier tidak ditemukan.' : 'Belum ada supplier tersimpan.'}
                            </h3>
                            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                                {searchTerm
                                    ? 'Coba ubah kata kunci pencarian atau periksa kembali nama supplier yang Anda cari.'
                                    : 'Tambahkan supplier agar pencatatan pembelian berikutnya lebih cepat dan lebih rapi.'}
                            </p>
                            {dataSource === 'local' && !searchTerm && (
                                <Button onClick={() => setSupplierModalOpen(true)} className="mt-4">
                                    <Icon name="plus" className="w-4 h-4" /> Tambah Supplier Pertama
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Supplier Modal */}
            <Modal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Tambah Supplier" size="xl" mobileLayout="fullscreen">
                <div className="space-y-4">
                    <input type="text" placeholder="Nama Supplier (PT/Toko)" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <input type="text" placeholder="Kontak / Alamat / Telp" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    <Button onClick={handleAddSupplier} className="w-full">Simpan</Button>
                </div>
            </Modal>

            {/* Purchase Form Modal */}
            <Modal isOpen={isPurchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="Catat Pembelian & Restock" size="xl" mobileLayout="fullscreen">
                <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                    
                    {/* ENHANCED Evidence & Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Foto Nota / Surat Jalan (Opsional)</label>
                        <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-slate-600 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors">
                            {purchaseForm.evidenceImageUrl ? (
                                <div className="relative w-full h-32">
                                    <img src={purchaseForm.evidenceImageUrl} alt="Nota" className="w-full h-full object-contain rounded" />
                                    <button 
                                        onClick={() => setPurchaseForm(prev => ({...prev, evidenceImageUrl: ''}))}
                                        className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-full m-1"
                                    >
                                        <Icon name="close" className="w-3 h-3"/>
                                    </button>
                                </div>
                            ) : null}

                            {!purchaseForm.evidenceImageUrl && (
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <Button 
                                        variant="operational" 
                                        onClick={() => setCameraOpen(true)}
                                        className="flex flex-col items-center justify-center h-20 text-xs gap-1"
                                    >
                                        <Icon name="camera" className="w-6 h-6 text-slate-400" />
                                        Ambil Foto
                                    </Button>
                                    <div className="relative">
                                         <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                         <Button 
                                            variant="utility" 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full flex flex-col items-center justify-center h-20 text-xs gap-1"
                                        >
                                            <Icon name="upload" className="w-6 h-6 text-slate-400" />
                                            Upload File
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {purchaseForm.evidenceImageUrl && (
                                <div className="flex gap-2 w-full mt-1">
                                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                    <Button size="sm" variant="utility" onClick={() => setCameraOpen(true)} className="flex-1">
                                        Ganti Foto
                                    </Button>
                                    <Button size="sm" variant="operational" onClick={handleScanOCR} disabled={isScanning} className="flex-1">
                                        {isScanning ? 'Scanning...' : <><Icon name="eye" className="w-4 h-4" /> Scan Tgl/Total</>}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                                <option value="">-- Pilih --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-3">
                        <h4 className="text-sm font-bold text-white">Input Barang</h4>
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

                        {selectedItemDetails && (
                            <div className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                                <p>Satuan Pakai (Base): <strong>{(selectedItemDetails as any).unit || 'Unit'}</strong></p>
                                {(selectedItemDetails as any).purchaseUnit && (selectedItemDetails as any).conversionRate > 1 && (
                                    <p className="text-green-400 mt-1">
                                        💡 1 {(selectedItemDetails as any).purchaseUnit} = {(selectedItemDetails as any).conversionRate} {(selectedItemDetails as any).unit}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-500 mb-1">
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
                                    Harga Satuan
                                </label>
                                <input 
                                    type="number" placeholder="Rp" min="0"
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
                    <div className="bg-slate-900 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {purchaseForm.items.length === 0 ? (
                            <p className="text-center text-xs text-slate-500 py-2">Belum ada barang.</p>
                        ) : (
                            purchaseForm.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs text-slate-300 py-1 border-b border-slate-800 last:border-0">
                                    <div className="flex-1 truncate pr-2">
                                        <span className="text-white block">{getItemName(item)}</span>
                                        <span>
                                            {item.quantity} x {CURRENCY_FORMATTER.format(item.price)}
                                            {item.conversionApplied && <span className="text-[9px] text-green-400 ml-1">(Konversi)</span>}
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
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Bayar (Rp)</label>
                                <input 
                                    type="number" 
                                    placeholder="0" 
                                    value={purchaseForm.amountPaid} 
                                    onChange={e => setPurchaseForm({...purchaseForm, amountPaid: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Metode</label>
                                <select 
                                    value={purchaseForm.paymentMethod} 
                                    onChange={e => setPurchaseForm({...purchaseForm, paymentMethod: e.target.value as PaymentMethod})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-sm"
                                >
                                    <option value="cash">Tunai</option>
                                    <option value="non-cash">Transfer</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleSavePurchase} disabled={purchaseForm.items.length === 0 || !purchaseForm.supplierId} className="w-full mt-2">
                        Simpan Pembelian
                    </Button>
                </div>
            </Modal>

            {/* Camera Capture Modal */}
            <CameraCaptureModal 
                isOpen={isCameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={(img) => setPurchaseForm(prev => ({ ...prev, evidenceImageUrl: img }))}
            />

            {/* View Image Modal with Zoom */}
             <Modal isOpen={!!viewEvidence} onClose={() => setViewEvidence(null)} title="Bukti Pembelian">
                <div className="flex flex-col items-center gap-4 relative">
                    <div className="flex justify-center bg-black/40 p-2 rounded w-full overflow-hidden relative" style={{ maxHeight: '60vh' }}>
                        <div className="overflow-auto w-full h-full flex items-center justify-center">
                            {viewEvidence && (
                                <img 
                                    src={viewEvidence.url} 
                                    alt="Bukti" 
                                    style={{ 
                                        transform: `scale(${zoomLevel})`, 
                                        transformOrigin: 'top center',
                                        transition: 'transform 0.2s ease-out'
                                    }}
                                    className="max-w-full object-contain rounded" 
                                />
                            )}
                        </div>

                        {/* Floating Zoom Controls */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-slate-800/80 p-2 rounded-full backdrop-blur-sm border border-slate-600 shadow-lg z-10">
                            <button 
                                onClick={handleZoomOut} 
                                className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors"
                                title="Zoom Out"
                            >
                                <Icon name="zoom-out" className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-mono text-white min-w-[3rem] text-center">
                                {(zoomLevel * 100).toFixed(0)}%
                            </span>
                            <button 
                                onClick={handleZoomIn} 
                                className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors"
                                title="Zoom In"
                            >
                                <Icon name="zoom-in" className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-600 mx-1"></div>
                            <button 
                                onClick={handleResetZoom} 
                                className="text-xs text-sky-400 hover:text-white px-2 font-bold"
                                title="Reset Zoom"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 w-full">
                        <Button onClick={handleDownloadEvidence} className="bg-blue-600 hover:bg-blue-500 border-none">
                            <Icon name="download" className="w-4 h-4"/> Unduh
                        </Button>
                        <Button variant="utility" onClick={() => setViewEvidence(null)}>Tutup</Button>
                    </div>
                    {viewEvidence && <div className="text-[10px] text-slate-500 font-mono text-center w-full">{viewEvidence.filename}</div>}
                </div>
            </Modal>
        </div>
    );
};

export default PurchasingTab;

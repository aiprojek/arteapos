
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
import type { RawMaterial } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import { dataService } from '../services/dataService';
import { CURRENCY_FORMATTER } from '../constants';
import VirtualizedTable from '../components/VirtualizedTable';
import StockOpnameModal from '../components/StockOpnameModal';
import { useSettings } from '../context/SettingsContext';

// --- HELPER FORMAT CURRENCY INPUT ---
const formatNumberStr = (val: string) => {
    // Hapus non-digit
    const raw = val.replace(/\D/g, '');
    // Tambah titik ribuan
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const unformatNumber = (val: string) => {
    return parseFloat(val.replace(/\./g, '')) || 0;
};

// Custom Input for Numbers with Dot Separator
const CurrencyInput: React.FC<{
    value: string | number;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    required?: boolean;
}> = ({ value, onChange, placeholder, className, label, required }) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow user to empty the field
        if (val === '') {
            onChange('');
            return;
        }
        // Format display
        const formatted = formatNumberStr(val);
        onChange(formatted);
    };

    // Ensure value passed is formatted for display
    const displayValue = value !== '' ? formatNumberStr(value.toString()) : '';

    return (
        <div>
            {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
            <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">Rp</span>
                <input
                    type="text"
                    value={displayValue}
                    onChange={handleChange}
                    placeholder={placeholder || "0"}
                    required={required}
                    className={`w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white font-mono ${className}`}
                />
            </div>
        </div>
    );
};

const InputField: React.FC<{
    name: string;
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
    min?: string;
    placeholder?: string;
    step?: string; // Added step prop explicitly
}> = ({ name, label, value, onChange, type = 'text', required = false, min, placeholder, step = "any" }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={(e) => {
                if(type === 'number') {
                    // Prevent negative signs or scientific notation e/E
                    const val = e.target.value;
                    if(val.includes('-')) return;
                    // Allow decimals, prevent invalid chars except dot
                    if(val && !/^\d*\.?\d*$/.test(val)) return;
                }
                onChange(e);
            }}
            required={required}
            min={min}
            step={step} // Use step="any" to allow decimals
            placeholder={placeholder}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
        />
    </div>
);


const RawMaterialForm: React.FC<{ 
    material?: RawMaterial | null, 
    onSave: (material: Omit<RawMaterial, 'id'> | RawMaterial) => void, 
    onCancel: () => void 
}> = ({ material, onSave, onCancel }) => {
    const { receiptSettings } = useSettings();
    
    // Form State
    const [formData, setFormData] = useState({ 
        name: '', 
        stock: '', 
        unit: '', 
        validStoreIds: [] as string[],
        purchaseUnit: '',
        conversionRate: ''
    });

    // Calculator State (For Cost Per Unit)
    const [calc, setCalc] = useState({
        buyPrice: '', // Harga Beli Total (String formatted)
        buyQty: '1',  // Jumlah Beli (untuk pembagi)
        costPerUnit: 0 // Hasil hitungan
    });
    
    const availableBranches = receiptSettings.branches || [];

    useEffect(() => {
        if (material) {
            setFormData({
                name: material.name,
                stock: material.stock.toString(),
                unit: material.unit,
                validStoreIds: material.validStoreIds || [],
                purchaseUnit: material.purchaseUnit || '',
                conversionRate: material.conversionRate ? material.conversionRate.toString() : ''
            });
            // Init calculator with existing cost
            setCalc({
                buyPrice: (material.costPerUnit || 0).toString(),
                buyQty: '1',
                costPerUnit: material.costPerUnit || 0
            });
        } else {
            setFormData({ name: '', stock: '', unit: '', validStoreIds: [], purchaseUnit: '', conversionRate: '' });
            setCalc({ buyPrice: '', buyQty: '1', costPerUnit: 0 });
        }
    }, [material]);

    // Auto Calculate Cost Per Unit whenever Buy Price or Buy Qty changes
    useEffect(() => {
        const price = unformatNumber(calc.buyPrice);
        const qty = parseFloat(calc.buyQty) || 1;
        
        if (price > 0 && qty > 0) {
            setCalc(prev => ({ ...prev, costPerUnit: price / qty }));
        } else {
            setCalc(prev => ({ ...prev, costPerUnit: 0 }));
        }
    }, [calc.buyPrice, calc.buyQty]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleStoreId = (storeId: string) => {
        setFormData(prev => {
            const current = prev.validStoreIds || [];
            if (current.includes(storeId)) {
                return { ...prev, validStoreIds: current.filter(id => id !== storeId) };
            } else {
                return { ...prev, validStoreIds: [...current, storeId] };
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const materialData = {
            ...formData,
            stock: Math.max(0, parseFloat(formData.stock) || 0),
            costPerUnit: calc.costPerUnit, // Use calculated cost
            conversionRate: formData.conversionRate ? Math.max(1, parseFloat(formData.conversionRate)) : undefined,
            purchaseUnit: formData.purchaseUnit || undefined,
            validStoreIds: formData.validStoreIds.length === 0 ? undefined : formData.validStoreIds
        };
        if (material && 'id' in material) {
            onSave({ ...materialData, id: material.id });
        } else {
            onSave(materialData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InputField name="name" label="Nama Bahan Baku" required value={formData.name} onChange={handleChange} placeholder="cth: Gula Pasir, Susu UHT" />
            
            <div className="grid grid-cols-2 gap-4">
                <InputField name="unit" label="Satuan Pakai (Unit Terkecil)" required value={formData.unit} onChange={handleChange} placeholder="cth: gram, ml, pcs" />
                <InputField name="stock" label="Stok Saat Ini" type="number" step="any" required value={formData.stock} onChange={handleChange} min="0" placeholder="0"/>
            </div>
            
            {/* CALCULATOR HPP SECTION */}
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <Icon name="finance" className="w-4 h-4 text-green-400"/> Hitung Harga Modal (HPP)
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Total Harga Beli</label>
                        <CurrencyInput 
                            value={calc.buyPrice} 
                            onChange={(val) => setCalc(prev => ({...prev, buyPrice: val}))} 
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Dapat Jumlah ({formData.unit || 'Unit'})</label>
                        <input
                            type="number"
                            value={calc.buyQty}
                            onChange={(e) => setCalc(prev => ({...prev, buyQty: e.target.value}))}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono"
                            placeholder="1"
                            min="0"
                            step="any" 
                        />
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xs text-slate-400">Harga per {formData.unit || 'unit'}: </span>
                    <span className="text-green-400 font-bold font-mono text-lg">{CURRENCY_FORMATTER.format(calc.costPerUnit)}</span>
                </div>
            </div>

            {/* Conversion Section */}
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Icon name="share" className="w-4 h-4"/> Konversi Satuan Beli (Opsional)
                </h4>
                <p className="text-xs text-slate-400">Isi jika Anda membeli dalam satuan besar (cth: Karton) tapi memakai dalam satuan kecil (cth: Pcs) di resep.</p>
                
                <div className="grid grid-cols-2 gap-4">
                    <InputField name="purchaseUnit" label="Satuan Beli (cth: Karton)" value={formData.purchaseUnit} onChange={handleChange} placeholder="cth: Box"/>
                    <InputField name="conversionRate" label={`Isi per ${formData.purchaseUnit || 'Unit Beli'}`} type="number" step="any" value={formData.conversionRate} onChange={handleChange} min="1" placeholder="cth: 12"/>
                </div>
            </div>

            {/* Branch Restriction Selector */}
            {availableBranches.length > 0 && (
                <div className="pt-2 border-t border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Ketersediaan Cabang</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, validStoreIds: [] }))}
                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${formData.validStoreIds.length === 0 ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                        >
                            Semua Cabang
                        </button>
                        {availableBranches.map(branch => {
                            const isSelected = formData.validStoreIds.includes(branch.id);
                            return (
                                <button
                                    key={branch.id}
                                    type="button"
                                    onClick={() => handleToggleStoreId(branch.id)}
                                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${isSelected ? 'bg-[#347758] border-[#347758] text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                                >
                                    {branch.name}
                                </button>
                            )
                        })}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                        Jika dipilih, bahan baku ini hanya akan muncul di cabang tersebut.
                    </p>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant="primary">Simpan</Button>
            </div>
        </form>
    );
};

// --- NEW: Bulk Raw Material Modal ---
const BulkRawMaterialModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (materials: RawMaterial[]) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const { showAlert } = useUI();
    const [mode, setMode] = useState<'manual' | 'import'>('manual');
    
    // Revised State for Bulk Input: buyPrice & buyQty instead of direct costPerUnit
    const [rows, setRows] = useState<Array<{
        name: string, stock: string, unit: string, 
        buyPrice: string, buyQty: string, // NEW
        validStoreIds: string, purchaseUnit: string, conversionRate: string
    }>>([
        { name: '', stock: '', unit: '', buyPrice: '', buyQty: '1', validStoreIds: '', purchaseUnit: '', conversionRate: '' },
        { name: '', stock: '', unit: '', buyPrice: '', buyQty: '1', validStoreIds: '', purchaseUnit: '', conversionRate: '' },
        { name: '', stock: '', unit: '', buyPrice: '', buyQty: '1', validStoreIds: '', purchaseUnit: '', conversionRate: '' },
        { name: '', stock: '', unit: '', buyPrice: '', buyQty: '1', validStoreIds: '', purchaseUnit: '', conversionRate: '' },
        { name: '', stock: '', unit: '', buyPrice: '', buyQty: '1', validStoreIds: '', purchaseUnit: '', conversionRate: '' },
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRowChange = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        (newRows[index] as any)[field] = value;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { name: '', stock: '', unit: '', buyPrice: '', buyQty: '1', validStoreIds: '', purchaseUnit: '', conversionRate: '' }]);
    };

    const removeRow = (index: number) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleSaveManual = () => {
        const validRows = rows.filter(r => r.name.trim() !== '' && r.unit.trim() !== '');
        
        if (validRows.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Isi minimal satu Nama Bahan dan Satuan.' });
            return;
        }

        const materials: RawMaterial[] = validRows.map((r, i) => {
            const price = unformatNumber(r.buyPrice);
            const qty = parseFloat(r.buyQty) || 1;
            const costPerUnit = qty > 0 ? price / qty : 0;

            return {
                id: `${Date.now()}-${i}`,
                name: r.name,
                stock: parseFloat(r.stock) || 0,
                unit: r.unit,
                costPerUnit: costPerUnit, // Calculated
                purchaseUnit: r.purchaseUnit || undefined,
                conversionRate: parseFloat(r.conversionRate) || undefined,
                validStoreIds: r.validStoreIds ? r.validStoreIds.split(',').map(s => s.trim()).filter(Boolean) : undefined
            };
        });

        onSave(materials);
        setRows([{ name: '', stock: '', unit: '', buyPrice: '', buyQty: '1', validStoreIds: '', purchaseUnit: '', conversionRate: '' }]);
    };

    const handleDownloadTemplate = () => {
        const headers = ['name', 'stock', 'unit', 'costPerUnit', 'purchaseUnit', 'conversionRate', 'validStoreIds'];
        const sample = ['Kopi Arabica', '1000', 'gram', '150', 'Kg', '1000', 'JKT01;BDG01'];
        const csvContent = [headers.join(','), sample.map(s => `"${s}"`).join(',')].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'template_bahan_baku_artea.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const materials = await dataService.importRawMaterialsCSV(file);
            if (materials.length > 0) {
                onSave(materials);
            } else {
                showAlert({ type: 'alert', title: 'Gagal', message: 'Tidak ada data valid ditemukan di file CSV.' });
            }
        } catch (err: any) {
            showAlert({ type: 'alert', title: 'Error Import', message: err.message });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tambah Bahan Baku Massal">
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setMode('manual')} className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'manual' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300'}`}>Input Manual (Tabel)</button>
                    <button onClick={() => setMode('import')} className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'import' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300'}`}>Upload CSV</button>
                </div>

                {mode === 'manual' ? (
                    <div className="space-y-4">
                        <div className="overflow-x-auto max-h-[50vh] border border-slate-600 rounded-lg">
                            <table className="w-full text-left text-sm text-slate-300 min-w-[1000px]">
                                <thead className="bg-slate-700 text-white font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 w-48">Nama Bahan*</th>
                                        <th className="p-2 w-20">Stok</th>
                                        <th className="p-2 w-24">Satuan*</th>
                                        <th className="p-2 w-24">Harga Beli</th>
                                        <th className="p-2 w-20">Dapat Qty</th>
                                        <th className="p-2 w-32">Harga/Satuan (Preview)</th>
                                        <th className="p-2 w-24">Cabang</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => {
                                        const p = unformatNumber(row.buyPrice);
                                        const q = parseFloat(row.buyQty) || 1;
                                        const cost = q > 0 ? p/q : 0;

                                        return (
                                            <tr key={idx} className="border-b border-slate-700 bg-slate-800">
                                                <td className="p-1"><input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.name} onChange={e => handleRowChange(idx, 'name', e.target.value)} placeholder="Nama" /></td>
                                                <td className="p-1"><input type="number" step="any" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.stock} onChange={e => handleRowChange(idx, 'stock', e.target.value)} placeholder="0" /></td>
                                                <td className="p-1"><input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.unit} onChange={e => handleRowChange(idx, 'unit', e.target.value)} placeholder="ml/gr" /></td>
                                                <td className="p-1">
                                                    <CurrencyInput 
                                                        value={row.buyPrice} 
                                                        onChange={(val) => handleRowChange(idx, 'buyPrice', val)} 
                                                        className="px-2 py-1"
                                                        placeholder="Total"
                                                    />
                                                </td>
                                                <td className="p-1"><input type="number" step="any" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.buyQty} onChange={e => handleRowChange(idx, 'buyQty', e.target.value)} placeholder="1" /></td>
                                                <td className="p-1 text-green-400 font-mono text-xs">{CURRENCY_FORMATTER.format(cost)}</td>
                                                <td className="p-1"><input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.validStoreIds} onChange={e => handleRowChange(idx, 'validStoreIds', e.target.value)} placeholder="JKT,BDG" /></td>
                                                <td className="p-1 text-center"><button onClick={() => removeRow(idx)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4" /></button></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={addRow}><Icon name="plus" className="w-4 h-4" /> Tambah Baris</Button>
                            <div className="flex-1"></div>
                            <Button onClick={handleSaveManual}>Simpan Semua</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 text-center py-4">
                        <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 inline-block text-left max-w-sm">
                            <h4 className="font-bold text-white mb-2">Instruksi:</h4>
                            <ol className="list-decimal pl-5 text-sm text-slate-300 space-y-1">
                                <li>Unduh template CSV.</li>
                                <li>Isi data (Nama & Satuan Wajib).</li>
                                <li>Untuk Cabang, pisahkan dengan titik koma (;).</li>
                                <li>Simpan sebagai .CSV dan upload.</li>
                            </ol>
                        </div>
                        <div className="flex justify-center gap-4">
                            <Button variant="secondary" onClick={handleDownloadTemplate}><Icon name="download" className="w-4 h-4"/> Unduh Template</Button>
                            <div className="relative">
                                <Button variant="primary" onClick={() => fileInputRef.current?.click()}><Icon name="upload" className="w-4 h-4"/> Upload CSV</Button>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportFile} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};


const RawMaterialsView: React.FC = () => {
    const { rawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial, bulkAddRawMaterials } = useProduct();
    const { showAlert } = useUI();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
    const [isOpnameOpen, setIsOpnameOpen] = useState(false); 
    const importInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isBulkModalOpen, setBulkModalOpen] = useState(false); // NEW STATE

    const filteredMaterials = useMemo(() => {
        return rawMaterials.filter(material =>
            material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.unit.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [rawMaterials, searchTerm]);


    const handleOpenModal = (material: RawMaterial | null = null) => {
        setEditingMaterial(material);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingMaterial(null);
        setModalOpen(false);
    };

    const handleSaveMaterial = (materialData: Omit<RawMaterial, 'id'> | RawMaterial) => {
        if ('id' in materialData) {
            updateRawMaterial(materialData);
        } else {
            addRawMaterial(materialData);
        }
        handleCloseModal();
    };
    
    const handleExport = () => {
        dataService.exportRawMaterialsCSV(rawMaterials);
        showAlert({
            type: 'alert',
            title: 'Ekspor Berhasil',
            message: 'Data bahan baku (CSV) berhasil diunduh. Anda dapat menggunakan file ini sebagai template untuk impor.'
        });
    };

    const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const newMaterials = await dataService.importRawMaterialsCSV(file);
                bulkAddRawMaterials(newMaterials);
                 showAlert({
                    type: 'alert',
                    title: 'Impor Berhasil',
                    message: `${newMaterials.length} bahan baku berhasil diimpor atau diperbarui.`
                 });
            } catch (error) {
                 showAlert({
                    type: 'alert',
                    title: 'Impor Gagal',
                    message: (error as Error).message
                 });
            } finally {
                if(importInputRef.current) importInputRef.current.value = "";
            }
        }
    };

    // NEW: Handle Bulk Save
    const handleBulkSave = (newMaterials: RawMaterial[]) => {
        bulkAddRawMaterials(newMaterials);
        setBulkModalOpen(false);
        showAlert({
            type: 'alert',
            title: 'Berhasil',
            message: `${newMaterials.length} bahan baku berhasil ditambahkan.`
        });
    };
    
    const columns = useMemo(() => [
        { label: 'Nama Bahan', width: '2fr', render: (m: RawMaterial) => (
            <div>
                <span className="font-medium">{m.name}</span>
                {m.purchaseUnit && m.conversionRate && (
                    <div className="text-[10px] text-slate-400">
                        1 {m.purchaseUnit} = {m.conversionRate} {m.unit}
                    </div>
                )}
            </div>
        ) },
        { label: 'Biaya per Satuan', width: '1.5fr', render: (m: RawMaterial) => m.costPerUnit ? CURRENCY_FORMATTER.format(m.costPerUnit) : '-' },
        { label: 'Stok', width: '1fr', render: (m: RawMaterial) => m.stock },
        { label: 'Satuan', width: '1fr', render: (m: RawMaterial) => m.unit },
        { label: 'Aksi', width: '1fr', render: (m: RawMaterial) => (
            <div className="flex gap-2">
                <button onClick={() => handleOpenModal(m)} className="text-sky-400 hover:text-sky-300">
                    <Icon name="edit" className="w-5 h-5" />
                </button>
                <button onClick={() => deleteRawMaterial(m.id)} className="text-red-500 hover:text-red-400">
                    <Icon name="trash" className="w-5 h-5" />
                </button>
            </div>
        )}
    ], [deleteRawMaterial]);

    return (
        <div className="flex flex-col h-full">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white self-start sm:self-center">Bahan Baku</h1>
                <div className="flex gap-2 flex-wrap justify-end self-stretch sm:self-center">
                    <div className="relative flex-grow sm:flex-grow-0">
                         <input
                            type="text"
                            placeholder="Cari bahan baku..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-[#347758] focus:border-[#347758]"
                        />
                         <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                    {/* Updated Buttons */}
                    <Button variant="secondary" onClick={() => setBulkModalOpen(true)} className="flex-shrink-0 bg-blue-900/30 text-blue-300 border-blue-800 hover:bg-blue-900/50">
                        <Icon name="boxes" className="w-5 h-5"/>
                        <span className="hidden lg:inline">Tambah Massal</span>
                    </Button>
                    <Button variant="secondary" onClick={() => setIsOpnameOpen(true)} className="flex-shrink-0">
                        <Icon name="database" className="w-5 h-5"/>
                        <span className="hidden lg:inline">Stock Opname</span>
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="flex-shrink-0">
                        <Icon name="download" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="primary" onClick={() => handleOpenModal()} className="flex-shrink-0">
                        <Icon name="plus" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Tambah Bahan</span>
                    </Button>
                </div>
            </div>
            
            <div className="flex-1 min-h-0 bg-slate-800 rounded-lg shadow-md flex flex-col">
                 {filteredMaterials.length > 0 ? (
                    <VirtualizedTable
                        data={filteredMaterials}
                        columns={columns}
                        rowHeight={60}
                    />
                 ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-8 text-slate-500">
                        {searchTerm ? `Tidak ada bahan baku yang cocok dengan "${searchTerm}".` : 'Belum ada bahan baku. Klik "Tambah Bahan Baku" untuk memulai, atau gunakan fitur Impor.'}
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}>
                <RawMaterialForm material={editingMaterial} onSave={handleSaveMaterial} onCancel={handleCloseModal} />
            </Modal>

            <StockOpnameModal 
                isOpen={isOpnameOpen} 
                onClose={() => setIsOpnameOpen(false)} 
                initialTab="raw_material"
            />

            {/* Render Bulk Modal */}
            <BulkRawMaterialModal
                isOpen={isBulkModalOpen}
                onClose={() => setBulkModalOpen(false)}
                onSave={handleBulkSave}
            />
        </div>
    );
};

export default RawMaterialsView;

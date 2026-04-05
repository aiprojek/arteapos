
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useProduct } from '../context/ProductContext';
import { useUIActions } from '../context/UIContext';
import { useAuthState } from '../context/AuthContext'; 
import type { Product, RecipeItem, Addon, ProductVariant, BranchPrice, ModifierGroup, ModifierOption } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import { CURRENCY_FORMATTER } from '../constants';
import CameraCaptureModal from '../components/CameraCaptureModal';
import { useCameraAvailability } from '../hooks/useCameraAvailability';
import ProductPlaceholder from '../components/ProductPlaceholder';
import StockOpnameModal from '../components/StockOpnameModal';
import StockTransferModal from '../components/StockTransferModal'; 
import StaffRestockModal from '../components/StaffRestockModal';
import ChannelSalesModal from '../components/ChannelSalesModal';
import OverflowMenu from '../components/OverflowMenu';
import { compressImage } from '../utils/imageCompression'; 
import { dataService } from '../services/dataService';

type ImageSource = 'none' | 'url' | 'upload' | 'camera';

function base64ToBlob(base64: string): Blob {
    const [meta, data] = base64.split(',');
    if (!meta || !data) return new Blob();
    const mime = meta.match(/:(.*?);/)?.[1];
    const bstr = atob(data);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Improved Input Field with Strict Numeric Validation
const InputField: React.FC<{
    name: string;
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
    step?: string;
    className?: string;
    min?: string;
    placeholder?: string;
}> = ({ name, label, value, onChange, type = 'text', required = false, step, className='', min, placeholder }) => {
    
    const handleStrictChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (type === 'number') {
            const val = e.target.value;
            if (val.includes('-')) return;
            if (val && !/^\d*\.?\d*$/.test(val)) return;
        }
        onChange(e);
    };

    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <input
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={handleStrictChange}
                required={required}
                step={step}
                min={min || "0"}
                onKeyDown={(e) => {
                    if (type === 'number' && ['e', 'E', '-', '+'].includes(e.key)) {
                        e.preventDefault();
                    }
                }}
                placeholder={placeholder}
                className={`w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white ${className}`}
            />
        </div>
    );
};

const ProductsStatCard: React.FC<{
    label: string;
    value: string | number;
    hint: string;
    icon: React.ComponentProps<typeof Icon>['name'];
    tone?: 'neutral' | 'success' | 'warning';
}> = ({ label, value, hint, icon, tone = 'neutral' }) => {
    const toneClasses = {
        neutral: 'border-slate-700/80 bg-slate-850/70 text-slate-200',
        success: 'border-emerald-900/50 bg-emerald-950/10 text-emerald-100',
        warning: 'border-amber-900/50 bg-amber-950/10 text-amber-100',
    };

    return (
        <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone]}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{value}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">{hint}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/15 p-2">
                    <Icon name={icon} className="h-4.5 w-4.5 text-slate-400" />
                </div>
            </div>
        </div>
    );
};

const CategoryInput: React.FC<{
    value: string[];
    onChange: (value: string[]) => void;
}> = ({ value, onChange }) => {
    const { categories, addCategory } = useProduct();
    const { showAlert } = useUIActions();
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setInputValue(text);
        if (text) {
            const filtered = categories.filter(c => 
                c.toLowerCase().includes(text.toLowerCase()) && !value.includes(c)
            );
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const addCategoryToList = (cat: string) => {
        const trimmedCat = cat.trim();
        if (trimmedCat && !value.includes(trimmedCat)) {
            if (categories.some(c => c.toLowerCase() === trimmedCat.toLowerCase())) {
                const existingCategory = categories.find(c => c.toLowerCase() === trimmedCat.toLowerCase())!;
                onChange([...value, existingCategory]);
            } else {
                showAlert({
                    type: 'confirm',
                    title: 'Tambah Kategori Baru?',
                    message: `Kategori "${trimmedCat}" belum ada. Apakah Anda ingin menambahkannya ke daftar kategori?`,
                    confirmText: 'Ya, Tambahkan',
                    onConfirm: () => {
                        addCategory(trimmedCat);
                        onChange([...value, trimmedCat]);
                    }
                });
            }
        }
        setInputValue('');
        setSuggestions([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            addCategoryToList(inputValue);
        }
    };

    const removeCategory = (cat: string) => {
        onChange(value.filter(c => c !== cat));
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Kategori</label>
            <div className="flex flex-wrap gap-2 bg-slate-900 border border-slate-600 rounded-lg p-2">
                {value.map(cat => (
                    <div key={cat} className="flex items-center gap-1 bg-[#347758]/20 text-[#7ac0a0] text-sm font-medium px-2 py-1 rounded-full">
                        {cat}
                        <button type="button" onClick={() => removeCategory(cat)} className="text-[#a0d9bf] hover:text-white">
                            <Icon name="close" className="w-3 h-3"/>
                        </button>
                    </div>
                ))}
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={value.length === 0 ? "cth: Kopi, Makanan" : "Tambah lagi..."}
                        className="bg-transparent w-full focus:outline-none min-w-[120px]"
                    />
                     {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-slate-700 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                            {suggestions.map(s => (
                                <button
                                    type="button"
                                    key={s}
                                    onClick={() => addCategoryToList(s)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-600"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- RECIPE BUILDER (RESTORED) ---
const RecipeBuilder: React.FC<{
    recipe: RecipeItem[];
    onChange: (recipe: RecipeItem[]) => void;
}> = ({ recipe, onChange }) => {
    const { rawMaterials } = useProduct();
    const [selectedMaterial, setSelectedMaterial] = useState('');
    const [amount, setAmount] = useState('');

    const handleAdd = () => {
        if (!selectedMaterial || !amount) return;
        
        const material = rawMaterials.find(m => m.id === selectedMaterial);
        if (!material) return;

        const newRecipeItem: RecipeItem = {
            itemType: 'raw_material',
            rawMaterialId: material.id,
            quantity: parseFloat(amount) || 0
        };

        // Check duplicate
        const exists = recipe.some(r => r.rawMaterialId === material.id);
        if (exists) {
            alert("Bahan ini sudah ada di resep.");
            return;
        }

        onChange([...recipe, newRecipeItem]);
        setSelectedMaterial('');
        setAmount('');
    };

    const handleRemove = (index: number) => {
        onChange(recipe.filter((_, i) => i !== index));
    };

    return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Icon name="ingredients" className="w-4 h-4 text-orange-400"/> Komposisi Resep
            </h4>
            <p className="text-xs text-slate-400">Stok bahan baku di bawah ini akan berkurang otomatis saat produk terjual.</p>
            
            <div className="space-y-2">
                {recipe.map((item, idx) => {
                    const mat = rawMaterials.find(m => m.id === item.rawMaterialId);
                    return (
                        <div key={idx} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-600">
                            <div>
                                <span className="text-white font-medium">{mat?.name || 'Unknown'}</span>
                                <span className="text-xs text-slate-400 ml-2">{item.quantity} {mat?.unit}</span>
                            </div>
                            <button type="button" onClick={() => handleRemove(idx)} className="text-red-400 hover:text-white">
                                <Icon name="close" className="w-4 h-4"/>
                            </button>
                        </div>
                    )
                })}
                {recipe.length === 0 && <p className="text-xs text-slate-500 italic">Belum ada bahan baku.</p>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-700">
                <select 
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded text-xs px-2 py-1 text-white"
                >
                    <option value="">Pilih Bahan...</option>
                    {rawMaterials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                    ))}
                </select>
                <input 
                    type="number" 
                    placeholder="Jml" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-20 bg-slate-800 border border-slate-600 rounded text-xs px-2 py-1 text-white"
                />
                <Button type="button" size="sm" onClick={handleAdd} disabled={!selectedMaterial || !amount}>
                    <Icon name="plus" className="w-3 h-3"/>
                </Button>
            </div>
        </div>
    );
};

const ModifierBuilder: React.FC<{
    groups: ModifierGroup[];
    onChange: (groups: ModifierGroup[]) => void;
}> = ({ groups, onChange }) => {
    
    const addGroup = () => {
        const newGroup: ModifierGroup = {
            id: Date.now().toString(),
            name: '',
            minSelection: 0,
            maxSelection: 1,
            options: []
        };
        onChange([...groups, newGroup]);
    };

    const updateGroup = (index: number, field: keyof ModifierGroup, value: any) => {
        const updated = [...groups];
        if (field === 'minSelection' || field === 'maxSelection') {
            value = Math.max(0, parseInt(value) || 0);
        }
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const removeGroup = (index: number) => {
        onChange(groups.filter((_, i) => i !== index));
    };

    const addOption = (groupIndex: number) => {
        const updated = [...groups];
        updated[groupIndex].options.push({
            id: Date.now().toString(),
            name: '',
            price: 0,
            costPrice: 0
        });
        onChange(updated);
    };

    const updateOption = (groupIndex: number, optionIndex: number, field: keyof ModifierOption, value: any) => {
        const updated = [...groups];
        const opts = [...updated[groupIndex].options];
        if(field === 'price' || field === 'costPrice') value = Math.max(0, parseFloat(value) || 0);
        
        opts[optionIndex] = { ...opts[optionIndex], [field]: value };
        updated[groupIndex].options = opts;
        onChange(updated);
    };

    const removeOption = (groupIndex: number, optionIndex: number) => {
        const updated = [...groups];
        updated[groupIndex].options = updated[groupIndex].options.filter((_, i) => i !== optionIndex);
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {groups.map((group, gIdx) => (
                <div key={group.id} className="bg-slate-900 border border-slate-700 p-4 rounded-lg space-y-3 relative">
                    <button type="button" onClick={() => removeGroup(gIdx)} className="absolute top-2 right-2 text-red-400 hover:text-red-300">
                        <Icon name="trash" className="w-4 h-4"/>
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400">Nama Grup (cth: Level Gula)</label>
                            <input 
                                type="text" 
                                value={group.name} 
                                onChange={e => updateGroup(gIdx, 'name', e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                placeholder="Wajib diisi"
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-slate-400">Min Pilih</label>
                                <input 
                                    type="number" min="0"
                                    value={group.minSelection} 
                                    onChange={e => updateGroup(gIdx, 'minSelection', e.target.value)} 
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-slate-400">Max Pilih</label>
                                <input 
                                    type="number" min="1"
                                    value={group.maxSelection} 
                                    onChange={e => updateGroup(gIdx, 'maxSelection', e.target.value)} 
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-500 italic">
                        {group.minSelection > 0 ? "Wajib diisi." : "Opsional."} 
                        {group.maxSelection === 1 ? " (Radio Button)" : ` (Checkbox - Maks ${group.maxSelection})`}
                    </p>

                    <div className="pl-0 sm:pl-4 sm:border-l-2 border-slate-700 space-y-2">
                        {group.options.length > 0 && (
                            <div className="flex gap-2 mb-1 px-1">
                                <span className="flex-1 text-[10px] text-slate-500 uppercase font-bold">Nama Opsi</span>
                                <span className="w-20 text-[10px] text-slate-500 uppercase font-bold">Jual (+)</span>
                                <span className="w-20 text-[10px] text-slate-500 uppercase font-bold">Modal</span>
                                <span className="w-4"></span>
                            </div>
                        )}

                        {group.options.map((opt, oIdx) => (
                            <div key={opt.id} className="flex gap-2 items-center">
                                <input 
                                    type="text" 
                                    placeholder="Nama" 
                                    value={opt.name}
                                    onChange={e => updateOption(gIdx, oIdx, 'name', e.target.value)}
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                />
                                <div className="flex flex-col w-20">
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={opt.price}
                                        onChange={e => updateOption(gIdx, oIdx, 'price', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                    />
                                </div>
                                <div className="flex flex-col w-20">
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={opt.costPrice || 0}
                                        onChange={e => updateOption(gIdx, oIdx, 'costPrice', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-400 text-xs focus:text-white"
                                    />
                                </div>
                                <button type="button" onClick={() => removeOption(gIdx, oIdx)} className="text-red-400 hover:text-red-300">
                                    <Icon name="close" className="w-3 h-3"/>
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={() => addOption(gIdx)} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-2">
                            <Icon name="plus" className="w-3 h-3"/> Tambah Opsi
                        </button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="secondary" onClick={addGroup} size="sm">
                <Icon name="plus" className="w-4 h-4"/> Tambah Grup Modifier
            </Button>
        </div>
    );
};

// ... BulkProductModal ...
const BulkProductModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (products: Product[]) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const { showAlert } = useUIActions();
    const { currentUser } = useAuthState();
    const isStaff = currentUser?.role === 'staff';

    const [mode, setMode] = useState<'manual' | 'import'>('manual');
    // Initial 3 empty rows
    const [rows, setRows] = useState<Array<{
        name: string, price: string, costPrice: string, category: string, stock: string, barcode: string
    }>>([
        { name: '', price: '', costPrice: '', category: '', stock: '0', barcode: '' },
        { name: '', price: '', costPrice: '', category: '', stock: '0', barcode: '' },
        { name: '', price: '', costPrice: '', category: '', stock: '0', barcode: '' },
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRowChange = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        (newRows[index] as any)[field] = value;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { name: '', price: '', costPrice: '', category: '', stock: '0', barcode: '' }]);
    };

    const removeRow = (index: number) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleSaveManual = () => {
        // Filter rows that have at least a Name and Price
        const validRows = rows.filter(r => r.name.trim() !== '' && r.price.trim() !== '');
        
        if (validRows.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Isi minimal satu Nama Produk dan Harga.' });
            return;
        }

        const products: Product[] = validRows.map((r, i) => {
            const stockVal = parseFloat(r.stock) || 0;
            return {
                id: `${Date.now()}-${i}`,
                name: r.name,
                price: parseFloat(r.price) || 0,
                costPrice: parseFloat(r.costPrice) || 0,
                category: r.category ? r.category.split(',').map(s => s.trim()) : ['Umum'],
                stock: stockVal,
                trackStock: stockVal > 0, // Auto track if stock > 0
                barcode: r.barcode,
            };
        });

        onSave(products);
        // Reset rows
        setRows([{ name: '', price: '', costPrice: '', category: '', stock: '0', barcode: '' }]);
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const products = await dataService.importProductsCSV(file);
            if (products.length > 0) {
                onSave(products);
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Tambah Produk Massal"
            size="xl"
            mobileLayout="fullscreen"
        >
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setMode('manual')} className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'manual' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300'}`}>Input Manual (Tabel)</button>
                    <button onClick={() => setMode('import')} className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'import' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300'}`}>Upload CSV</button>
                </div>

                {mode === 'manual' ? (
                    <div className="space-y-4">
                        <div className="overflow-x-auto max-h-[50vh] border border-slate-600 rounded-lg">
                            <table className="w-full text-left text-sm text-slate-300 min-w-[800px]">
                                <thead className="bg-slate-700 text-white font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 w-48">Nama Produk*</th>
                                        <th className="p-2 w-28">Harga Jual*</th>
                                        {!isStaff && <th className="p-2 w-28">Harga Modal</th>}
                                        <th className="p-2 w-32">Kategori</th>
                                        <th className="p-2 w-20">Stok Awal</th>
                                        <th className="p-2 w-32">Barcode</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr key={idx} className="border-b border-slate-700 bg-slate-800">
                                            <td className="p-1"><input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.name} onChange={e => handleRowChange(idx, 'name', e.target.value)} placeholder="Nama" /></td>
                                            <td className="p-1"><input type="number" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.price} onChange={e => handleRowChange(idx, 'price', e.target.value)} placeholder="0" /></td>
                                            {!isStaff && <td className="p-1"><input type="number" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.costPrice} onChange={e => handleRowChange(idx, 'costPrice', e.target.value)} placeholder="0" /></td>}
                                            <td className="p-1"><input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.category} onChange={e => handleRowChange(idx, 'category', e.target.value)} placeholder="Makanan, Minuman" /></td>
                                            <td className="p-1"><input type="number" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.stock} onChange={e => handleRowChange(idx, 'stock', e.target.value)} placeholder="0" /></td>
                                            <td className="p-1"><input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.barcode} onChange={e => handleRowChange(idx, 'barcode', e.target.value)} placeholder="Scan/Ketik" /></td>
                                            <td className="p-1 text-center"><button onClick={() => removeRow(idx)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4" /></button></td>
                                        </tr>
                                    ))}
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
                                <li>Gunakan fitur "Export" di menu produk untuk melihat contoh format CSV.</li>
                                <li>Edit file di Excel/Spreadsheet.</li>
                                <li>Pastikan kolom <strong>name</strong> dan <strong>price</strong> terisi.</li>
                                <li>Simpan sebagai .CSV dan upload.</li>
                            </ol>
                        </div>
                        <div className="flex justify-center gap-4">
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

const CategoryManagerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const { categories, products, addCategory, deleteCategory } = useProduct();
    const { showAlert } = useUIActions();
    const [newCategory, setNewCategory] = useState('');

    const categoryUsage = useMemo(() => {
        return categories.map(category => ({
            name: category,
            productCount: products.filter(product => product.category.includes(category)).length,
        }));
    }, [categories, products]);

    const handleAddCategory = () => {
        const trimmed = newCategory.trim();
        if (!trimmed) return;

        if (categories.some(category => category.toLowerCase() === trimmed.toLowerCase())) {
            showAlert({
                type: 'alert',
                title: 'Kategori Sudah Ada',
                message: `Kategori "${trimmed}" sudah ada di daftar.`,
            });
            return;
        }

        addCategory(trimmed);
        setNewCategory('');
    };

    const handleDeleteCategory = (category: string, productCount: number) => {
        if (productCount > 0) {
            showAlert({
                type: 'alert',
                title: 'Kategori Masih Digunakan',
                message: `Kategori "${category}" masih dipakai oleh ${productCount} produk. Pindahkan produknya dulu sebelum menghapus kategori ini.`,
            });
            return;
        }

        showAlert({
            type: 'confirm',
            title: 'Hapus Kategori?',
            message: `Kategori "${category}" akan dihapus dari daftar kategori.`,
            confirmText: 'Ya, Hapus',
            confirmVariant: 'danger',
            onConfirm: () => deleteCategory(category),
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Kelola Kategori"
            size="lg"
            mobileLayout="fullscreen"
        >
            <div className="space-y-5">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                    <h3 className="text-base font-bold text-white">Tambah Kategori Baru</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">
                        Tambahkan kategori agar lebih mudah mengelompokkan produk di katalog.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCategory();
                                }
                            }}
                            placeholder="Contoh: Minuman Dingin"
                            className="h-11 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 text-white focus:border-[#347758] focus:outline-none focus:ring-2 focus:ring-[#347758]/30"
                        />
                        <Button type="button" onClick={handleAddCategory} className="h-11 whitespace-nowrap">
                            <Icon name="plus" className="w-5 h-5" />
                            <span>Tambah</span>
                        </Button>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/60">
                    <div className="border-b border-slate-700 px-4 py-3">
                        <h3 className="text-base font-bold text-white">Daftar Kategori</h3>
                        <p className="mt-1 text-sm text-slate-400">
                            {categoryUsage.length} kategori tersedia untuk produk Anda.
                        </p>
                    </div>
                    {categoryUsage.length > 0 ? (
                        <div className="max-h-[55dvh] overflow-y-auto p-3 space-y-2">
                            {categoryUsage.map(category => (
                                <div
                                    key={category.name}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-white">{category.name}</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {category.productCount} produk memakai kategori ini
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDeleteCategory(category.name, category.productCount)}
                                        className="shrink-0"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                        <span className="hidden sm:inline">Hapus</span>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">
                            Belum ada kategori. Tambahkan kategori pertama untuk mulai mengelompokkan produk.
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

const BulkEditProductsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    selectedCount: number;
    onApply: (payload: {
        categoryMode: 'keep' | 'replace' | 'append';
        categories: string[];
        trackStockMode: 'keep' | 'enable' | 'disable';
    }) => void;
}> = ({ isOpen, onClose, selectedCount, onApply }) => {
    const { categories } = useProduct();
    const [categoryMode, setCategoryMode] = useState<'keep' | 'replace' | 'append'>('keep');
    const [trackStockMode, setTrackStockMode] = useState<'keep' | 'enable' | 'disable'>('keep');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setCategoryMode('keep');
            setTrackStockMode('keep');
            setSelectedCategories([]);
        }
    }, [isOpen]);

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(entry => entry !== category)
                : [...prev, category]
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Produk Terpilih"
            size="lg"
            mobileLayout="fullscreen"
        >
            <div className="space-y-5">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                    <p className="text-sm leading-relaxed text-slate-300">
                        Perubahan di sini akan diterapkan ke <span className="font-bold text-white">{selectedCount}</span> produk yang sedang dipilih.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Kategori</label>
                        <select
                            value={categoryMode}
                            onChange={e => setCategoryMode(e.target.value as 'keep' | 'replace' | 'append')}
                            className="h-11 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 text-white focus:border-[#347758] focus:outline-none focus:ring-2 focus:ring-[#347758]/30"
                        >
                            <option value="keep">Biarkan seperti sekarang</option>
                            <option value="replace">Ganti kategori produk</option>
                            <option value="append">Tambahkan kategori ke produk</option>
                        </select>
                    </div>

                    {categoryMode !== 'keep' && (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400">Pilih satu atau lebih kategori yang akan diterapkan.</p>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => toggleCategory(category)}
                                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selectedCategories.includes(category)
                                            ? 'border-[#347758] bg-[#347758]/20 text-[#a9dbc4]'
                                            : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Pelacakan Stok</label>
                        <select
                            value={trackStockMode}
                            onChange={e => setTrackStockMode(e.target.value as 'keep' | 'enable' | 'disable')}
                            className="h-11 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 text-white focus:border-[#347758] focus:outline-none focus:ring-2 focus:ring-[#347758]/30"
                        >
                            <option value="keep">Biarkan seperti sekarang</option>
                            <option value="enable">Aktifkan lacak stok</option>
                            <option value="disable">Matikan lacak stok</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-700 pt-4">
                    <Button type="button" variant="utility" onClick={onClose}>
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={() => onApply({ categoryMode, categories: selectedCategories, trackStockMode })}
                        disabled={(categoryMode !== 'keep' && selectedCategories.length === 0)}
                    >
                        Terapkan Perubahan
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// PRODUCT FORM COMPONENT (Re-implemented for security check)
interface ProductFormProps {
    product: Product | null;
    onSave: (product: Omit<Product, 'id'> | Product) => void;
    onCancel: () => void;
    onOpenCamera: () => void;
    isCameraAvailable: boolean;
    capturedImage: string | null;
}

const ProductForm = React.forwardRef<HTMLFormElement, ProductFormProps>(({ 
    product, onSave, onCancel, onOpenCamera, isCameraAvailable, capturedImage 
}, ref) => {
    const { currentUser } = useAuthState();
    // PENTING: Ambil inventorySettings & rawMaterials dari context agar bisa cek status Resep & Stok
    const { inventorySettings, rawMaterials, products } = useProduct(); 
    const isStaff = currentUser?.role === 'staff'; 

    const [form, setForm] = useState<Partial<Product>>({
        name: '', price: 0, costPrice: 0, category: [], stock: 0, trackStock: false, 
        barcode: '', modifierGroups: [], variants: [], addons: [], recipe: []
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (product) {
            setForm({ ...product, recipe: product.recipe || [] });
            if (product.imageUrl) setImagePreview(product.imageUrl);
            else if (product.image instanceof Blob) setImagePreview(URL.createObjectURL(product.image));
        } else {
            setForm({ 
                name: '', price: 0, costPrice: 0, category: [], stock: 0, trackStock: false, 
                barcode: '', modifierGroups: [], variants: [], addons: [], recipe: []
            });
            setImagePreview(null);
        }
    }, [product]);

    useEffect(() => {
        if (capturedImage) {
            setImagePreview(capturedImage);
        }
    }, [capturedImage]);

    const calculateAutoHPP = () => {
        if (!form.recipe || form.recipe.length === 0) {
            alert("Resep masih kosong.");
            return;
        }

        let totalCost = 0;
        form.recipe.forEach(item => {
            let itemCost = 0;
            if (item.itemType === 'raw_material') {
                const mat = rawMaterials.find(m => m.id === item.rawMaterialId);
                if (mat) itemCost = (mat.costPerUnit || 0);
            } else if (item.itemType === 'product') {
                const prod = products.find(p => p.id === item.productId);
                if (prod) itemCost = (prod.costPrice || 0);
            }
            totalCost += itemCost * item.quantity;
        });

        // Round up to nearest integer
        const finalCost = Math.ceil(totalCost);
        setForm(prev => ({ ...prev, costPrice: finalCost }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let imageBlob: Blob | undefined = product?.image;
        
        if (imagePreview && imagePreview.startsWith('data:')) {
            imageBlob = base64ToBlob(imagePreview);
        }

        const payload: any = {
            ...form,
            name: form.name || 'Unnamed',
            price: parseFloat(form.price as any) || 0,
            costPrice: parseFloat(form.costPrice as any) || 0,
            stock: parseFloat(form.stock as any) || 0,
            image: imageBlob,
            imageUrl: undefined // Clean up if blob exists
        };

        onSave(payload);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const compressed = await compressImage(file);
            setImagePreview(compressed);
        }
    };

    return (
        <form ref={ref} onSubmit={handleSubmit} className="space-y-5">
            <div className="flex justify-center mb-4">
                <div className="relative w-32 h-32 bg-slate-900 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden group">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <Icon name="camera" className="w-8 h-8 text-slate-500" />
                    )}
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-white hover:underline mb-2">Upload</button>
                        {isCameraAvailable && (
                            <button type="button" onClick={onOpenCamera} className="text-xs text-white hover:underline">Kamera</button>
                        )}
                        {imagePreview && (
                            <button type="button" onClick={() => setImagePreview(null)} className="text-xs text-red-400 hover:underline mt-2">Hapus</button>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
            </div>

            <InputField name="name" label="Nama Produk" required value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
            
            <CategoryInput value={form.category || []} onChange={cats => setForm({...form, category: cats})} />

            <div className="grid grid-cols-2 gap-4">
                <InputField name="price" label="Harga Jual" type="number" required value={form.price || ''} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} />
                
                {/* MODIFIED: HPP INPUT + BUTTON CALCULATOR */}
                {!isStaff && (
                    <div>
                        <label htmlFor="costPrice" className="block text-sm font-medium text-slate-300 mb-1">
                            Harga Modal (HPP)
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    id="costPrice"
                                    name="costPrice"
                                    value={form.costPrice || ''}
                                    onChange={e => setForm({...form, costPrice: parseFloat(e.target.value)})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-3 pr-3 py-2 text-white focus:border-[#347758] outline-none"
                                    placeholder="Manual"
                                />
                            </div>
                            {inventorySettings.trackIngredients && (
                                <Button
                                    type="button"
                                    onClick={calculateAutoHPP}
                                    variant="secondary"
                                    className="px-3"
                                    title="Hitung otomatis dari total harga bahan baku (Resep)"
                                >
                                    <Icon name="calculator" className="w-4 h-4 text-sky-400" />
                                </Button>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                            *Isi manual atau gunakan tombol kalkulator untuk hitung dari resep.
                        </p>
                    </div>
                )}
            </div>

            {/* STOK SECTION (Always visible if setting enabled or form checked) */}
            {(inventorySettings.enabled) && (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-300">Stok & Barcode</label>
                        <div className="flex items-center">
                            <input 
                                type="checkbox" 
                                checked={form.trackStock || false} 
                                onChange={e => setForm({...form, trackStock: e.target.checked})} 
                                className="mr-2 h-4 w-4"
                            />
                            <span className="text-xs text-slate-400">Lacak Stok Produk Ini</span>
                        </div>
                    </div>
                    {/* Conditional Input: Show only if Track Stock is checked OR forced by system */}
                    {form.trackStock && (
                        <div className="mb-2">
                             <InputField name="stock" label="Stok Awal" type="number" value={form.stock || ''} onChange={e => setForm({...form, stock: parseFloat(e.target.value)})} />
                        </div>
                    )}
                    <div className="mt-2">
                        <InputField name="barcode" label="Barcode" value={form.barcode || ''} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="Scan atau ketik..." />
                    </div>
                </div>
            )}

            {/* RECIPE BUILDER (RESTORED) - Only if enabled in Settings */}
            {inventorySettings.trackIngredients && (
                <div className="border-t border-slate-700 pt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Resep & Bahan Baku</label>
                    <RecipeBuilder 
                        recipe={form.recipe || []}
                        onChange={r => setForm({...form, recipe: r})}
                    />
                </div>
            )}

            <div className="border-t border-slate-700 pt-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Varian & Modifier</label>
                <ModifierBuilder 
                    groups={form.modifierGroups || []}
                    onChange={groups => setForm({...form, modifierGroups: groups})}
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
                <Button type="submit">Simpan</Button>
            </div>
        </form>
    );
});


const ProductsView: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, bulkDeleteProducts, bulkAddProducts } = useProduct();
    const { showAlert } = useUIActions();
    const { currentUser } = useAuthState();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isCameraOpen, setCameraOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isOpnameOpen, setIsOpnameOpen] = useState(false);
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false); 
    const [searchTerm, setSearchTerm] = useState('');
    const formRef = useRef<HTMLFormElement>(null);
    const isCameraAvailable = useCameraAvailability();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isBulkModalOpen, setBulkModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false); 
    const [isChannelSalesOpen, setIsChannelSalesOpen] = useState(false);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    const isAdmin = currentUser?.role === 'admin';
    const trackableProducts = useMemo(() => products.filter(product => product.trackStock), [products]);
    const lowStockProducts = useMemo(
        () => trackableProducts.filter(product => (product.stock || 0) <= 5),
        [trackableProducts],
    );
    const categoryCount = useMemo(() => {
        const categorySet = new Set<string>();
        products.forEach(product => {
            product.category.forEach(category => categorySet.add(category));
        });
        return categorySet.size;
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.barcode && p.barcode.includes(searchTerm))
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [products, searchTerm]);

    useEffect(() => {
        setSelectedProductIds(prev => prev.filter(id => filteredProducts.some(product => product.id === id)));
    }, [filteredProducts]);

    const allVisibleSelected = filteredProducts.length > 0 && filteredProducts.every(product => selectedProductIds.includes(product.id));
    const selectedProducts = useMemo(
        () => products.filter(product => selectedProductIds.includes(product.id)),
        [products, selectedProductIds],
    );

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormOpen(true);
    };

    const handleSave = (productData: Omit<Product, 'id'> | Product) => {
        if ('id' in productData) {
            updateProduct(productData as Product);
        } else {
            addProduct(productData);
        }
        setFormOpen(false);
        setEditingProduct(null);
        setCapturedImage(null);
    };

    const handleBulkSave = (newProducts: Product[]) => {
        bulkAddProducts(newProducts);
        setBulkModalOpen(false);
        showAlert({
            type: 'alert',
            title: 'Berhasil',
            message: `${newProducts.length} produk berhasil ditambahkan.`
        });
    };

    const handleExport = () => {
        dataService.exportProductsCSV(products);
        showAlert({
            type: 'alert',
            title: 'Export Berhasil',
            message: 'Data produk (CSV) berhasil diunduh.'
        });
    };

    const toggleProductSelection = (productId: string) => {
        setSelectedProductIds(prev =>
            prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
        );
    };

    const toggleSelectAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedProductIds(prev => prev.filter(id => !filteredProducts.some(product => product.id === id)));
            return;
        }

        const visibleIds = filteredProducts.map(product => product.id);
        setSelectedProductIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    };

    const handleExportSelected = () => {
        if (selectedProducts.length === 0) return;
        dataService.exportProductsCSV(selectedProducts);
        showAlert({
            type: 'alert',
            title: 'Export Berhasil',
            message: `${selectedProducts.length} produk terpilih berhasil diunduh sebagai CSV.`,
        });
    };

    const handleBulkDelete = () => {
        if (selectedProducts.length === 0) return;
        showAlert({
            type: 'confirm',
            title: 'Hapus Produk Terpilih?',
            message: `${selectedProducts.length} produk yang dipilih akan dihapus permanen.`,
            confirmText: 'Ya, Hapus',
            confirmVariant: 'danger',
            onConfirm: () => {
                bulkDeleteProducts(selectedProductIds);
                setSelectedProductIds([]);
            },
        });
    };

    const handleBulkEdit = () => {
        if (selectedProducts.length === 0) return;
        setIsBulkEditModalOpen(true);
    };

    const handleApplyBulkEdit = (payload: {
        categoryMode: 'keep' | 'replace' | 'append';
        categories: string[];
        trackStockMode: 'keep' | 'enable' | 'disable';
    }) => {
        const updatedProducts = selectedProducts.map(product => {
            let nextCategories = product.category;
            if (payload.categoryMode === 'replace') {
                nextCategories = payload.categories;
            } else if (payload.categoryMode === 'append') {
                nextCategories = Array.from(new Set([...product.category, ...payload.categories]));
            }

            let nextTrackStock = product.trackStock;
            if (payload.trackStockMode === 'enable') nextTrackStock = true;
            if (payload.trackStockMode === 'disable') nextTrackStock = false;

            return {
                ...product,
                category: nextCategories,
                trackStock: nextTrackStock,
            };
        });

        updatedProducts.forEach(updateProduct);
        setIsBulkEditModalOpen(false);
        showAlert({
            type: 'alert',
            title: 'Bulk Edit Berhasil',
            message: `${updatedProducts.length} produk berhasil diperbarui.`,
        });
    };

    const onCameraCapture = (image: string) => {
        setCapturedImage(image);
        setCameraOpen(false);
    };

    const columns = useMemo(() => [
        { label: 'Nama Produk', width: '2fr', render: (p: Product) => (
            <div className="flex items-center gap-3">
                {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded object-cover" />
                ) : (
                    <ProductPlaceholder productName={p.name} size="small" className="w-8 h-8 rounded" />
                )}
                <div>
                    <p className="font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.category.join(', ')}</p>
                </div>
            </div>
        )},
        { label: 'Harga', width: '1fr', render: (p: Product) => (
            <div>
                <p className="text-white">{CURRENCY_FORMATTER.format(p.price)}</p>
                {(p.modifierGroups && p.modifierGroups.length > 0) 
                    ? <span className="text-[10px] text-purple-300">Modifier</span>
                    : (p.variants && p.variants.length > 0 && <span className="text-[10px] text-blue-300">Varian Lama</span>)}
            </div>
        )},
        { label: 'Stok', width: '1fr', render: (p: Product) => (
            <span className={p.trackStock && (p.stock || 0) <= 5 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                {p.trackStock ? p.stock : '-'}
            </span>
        )},
        { label: 'Aksi', width: '1fr', className: 'overflow-visible', render: (p: Product) => (
            <div className="flex gap-2">
                <button onClick={() => handleEdit(p)} className="text-sky-400 hover:text-sky-300 bg-sky-400/10 p-1.5 rounded"><Icon name="edit" className="w-4 h-4" /></button>
                <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300 bg-red-400/10 p-1.5 rounded"><Icon name="trash" className="w-4 h-4" /></button>
            </div>
        )}
    ], [deleteProduct]);

    const actionItems = [
        ...(isAdmin ? [{
            id: 'transfer',
            label: 'Transfer Stok',
            onClick: () => setIsTransferModalOpen(true),
            icon: 'share' as const,
        }] : []),
        {
            id: 'channel',
            label: 'Channel Online',
            onClick: () => setIsChannelSalesOpen(true),
            icon: 'cloud' as const,
        },
        {
            id: 'export',
            label: 'Export CSV',
            onClick: handleExport,
            icon: 'download' as const,
        },
        {
            id: 'bulk',
            label: 'Tambah Massal',
            onClick: () => setBulkModalOpen(true),
            icon: 'boxes' as const,
        },
        {
            id: 'category',
            label: 'Kelola Kategori',
            onClick: () => setCategoryModalOpen(true),
            icon: 'tag' as const,
        },
        {
            id: 'opname',
            label: 'Stok Opname',
            onClick: () => setIsOpnameOpen(true),
            icon: 'clipboard' as const,
        },
    ];

    return (
        <div className="flex h-full min-h-0 flex-col gap-5">
            <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 p-5 shadow-xl sm:p-6">
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7ac0a0]">Katalog Produk</p>
                            <h1 className="mt-2 text-2xl font-bold text-white sm:text-[30px]">Kelola produk, stok, dan channel penjualan dalam satu tempat.</h1>
                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                                Cari produk dengan cepat, cek stok yang perlu perhatian, lalu lanjut ke tambah produk, stok manual, atau sinkronisasi channel tanpa harus pindah halaman.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                        <ProductsStatCard
                            label="Total Produk"
                            value={products.length}
                            hint="Jumlah item aktif yang saat ini tercatat di katalog."
                            icon="boxes"
                        />
                        <ProductsStatCard
                            label="Kategori Aktif"
                            value={categoryCount}
                            hint="Kategori yang sudah dipakai oleh produk di daftar saat ini."
                            icon="tag"
                        />
                        <ProductsStatCard
                            label="Lacak Stok"
                            value={trackableProducts.length}
                            hint="Produk yang stoknya dipantau dan akan berkurang saat terjual."
                            icon="clipboard"
                            tone="success"
                        />
                        <ProductsStatCard
                            label="Stok Menipis"
                            value={lowStockProducts.length}
                            hint="Produk dengan stok 5 atau kurang yang perlu dicek lebih dulu."
                            icon="warning"
                            tone="warning"
                        />
                    </div>
                </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-800 bg-slate-800/95 shadow-xl">
                <div className="flex flex-col gap-3 border-b border-slate-700/80 px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white">Daftar Produk</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                {searchTerm
                                    ? `${filteredProducts.length} hasil ditemukan untuk pencarian "${searchTerm}".`
                                    : `${products.length} produk tersedia dan siap dikelola dari halaman ini.`}
                            </p>
                        </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5">
                            {trackableProducts.length} produk melacak stok
                        </span>
                            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5">
                                {lowStockProducts.length} stok menipis
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,0.6fr))] lg:items-center">
                        <div className="relative w-full min-w-0">
                            <input
                                type="text"
                                placeholder="Cari nama produk atau barcode..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-11 pr-12 text-white focus:border-[#347758] focus:outline-none focus:ring-2 focus:ring-[#347758]/30"
                            />
                            <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                                    title="Bersihkan pencarian"
                                >
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="grid w-full grid-cols-3 gap-2 lg:contents">
                            <Button
                                variant="primary"
                                onClick={() => { setEditingProduct(null); setFormOpen(true); }}
                                className="h-11 w-full min-w-0 whitespace-nowrap px-0 sm:px-4"
                                title="Tambah Produk"
                            >
                                <Icon name="plus" className="h-5 w-5" />
                                <span className="hidden sm:inline">Tambah Produk</span>
                            </Button>
                            <Button
                                variant="operational"
                                onClick={() => setIsRestockModalOpen(true)}
                                className="h-11 w-full min-w-0 whitespace-nowrap px-0 sm:px-4"
                                title="Terima barang dari supplier atau koreksi stok manual"
                            >
                                <Icon name="download" className="h-5 w-5 rotate-180" />
                                <span className="hidden sm:inline">Stok Manual</span>
                            </Button>
                            <OverflowMenu
                                items={actionItems}
                                label="Aksi"
                                variant="utility"
                                showLabelOnMobile={false}
                                matchTriggerWidth
                                buttonClassName="h-11 w-full min-w-0 px-0 sm:px-4"
                            />
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 p-3 sm:p-4">
                    <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/60">
                        {filteredProducts.length > 0 && (
                            <div className="flex flex-col gap-3 border-b border-slate-700 bg-slate-900/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllVisible}
                                        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-slate-200 hover:bg-slate-700"
                                    >
                                        {allVisibleSelected ? 'Batal pilih semua' : 'Pilih semua yang terlihat'}
                                    </button>
                                    {selectedProductIds.length > 0 && (
                                        <span className="rounded-full border border-[#347758]/40 bg-[#347758]/15 px-3 py-1.5 text-[#a9dbc4]">
                                            {selectedProductIds.length} produk dipilih
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <Button
                                        type="button"
                                        variant="operational"
                                        size="sm"
                                        onClick={handleBulkEdit}
                                        disabled={selectedProductIds.length === 0}
                                        className="h-10 px-2 sm:px-3"
                                        title={selectedProductIds.length > 0 ? 'Edit produk terpilih' : 'Pilih produk dulu untuk diedit'}
                                    >
                                        <Icon name="edit" className="w-4 h-4" />
                                        <span className="hidden sm:inline">Edit Terpilih</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="utility"
                                        size="sm"
                                        onClick={() => setSelectedProductIds([])}
                                        disabled={selectedProductIds.length === 0}
                                        className="h-10 px-2 sm:px-3"
                                        title="Bersihkan pilihan"
                                    >
                                        <Icon name="close" className="w-4 h-4" />
                                        <span className="hidden sm:inline">Bersihkan Pilihan</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="operational"
                                        size="sm"
                                        onClick={handleExportSelected}
                                        disabled={selectedProductIds.length === 0}
                                        className="h-10 px-2 sm:px-3"
                                        title="Export produk terpilih"
                                    >
                                        <Icon name="download" className="w-4 h-4" />
                                        <span className="hidden sm:inline">Export Terpilih</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={handleBulkDelete}
                                        disabled={selectedProductIds.length === 0}
                                        className="h-10 px-2 sm:px-3"
                                        title="Hapus produk terpilih"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                        <span className="hidden sm:inline">Hapus Terpilih</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                        {filteredProducts.length > 0 ? (
                            <>
                                <div className="h-full overflow-auto md:hidden">
                                    <div className="space-y-2 p-2">
                                        {filteredProducts.map(product => (
                                            <div
                                                key={product.id}
                                                className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-2.5 shadow-sm"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProductIds.includes(product.id)}
                                                        onChange={() => toggleProductSelection(product.id)}
                                                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-600 bg-slate-900"
                                                        aria-label={`Pilih produk ${product.name}`}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start gap-2">
                                                            {product.imageUrl ? (
                                                                <img src={product.imageUrl} alt={product.name} className="h-9 w-9 rounded-lg object-cover" />
                                                            ) : (
                                                                <ProductPlaceholder productName={product.name} size="small" className="h-9 w-9 rounded-lg" />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className="truncate pr-1 text-[12px] font-bold leading-tight text-white">{product.name}</p>
                                                                    {product.modifierGroups && product.modifierGroups.length > 0 ? (
                                                                        <span className="shrink-0 rounded-full border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-300">
                                                                            Modifier
                                                                        </span>
                                                                    ) : (product.variants && product.variants.length > 0 ? (
                                                                        <span className="shrink-0 rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-300">
                                                                            Varian
                                                                        </span>
                                                                    ) : null)}
                                                                </div>
                                                                <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{product.category.join(', ') || 'Tanpa kategori'}</p>
                                                                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                                                                    <span className="rounded-full border border-slate-600 bg-slate-900/80 px-1.5 py-0.5 text-slate-300">
                                                                        {CURRENCY_FORMATTER.format(product.price)}
                                                                    </span>
                                                                    <span className={`rounded-full border px-1.5 py-0.5 ${product.trackStock && (product.stock || 0) <= 5 ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-slate-600 bg-slate-900/80 text-slate-300'}`}>
                                                                        {product.trackStock ? `Stok ${product.stock}` : 'Tanpa stok'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                                                            <Button
                                                                type="button"
                                                                variant="utility"
                                                                size="sm"
                                                                onClick={() => handleEdit(product)}
                                                                className="h-8 gap-1 px-2 text-[11px] sm:text-sm"
                                                                title="Edit produk"
                                                            >
                                                                <Icon name="edit" className="w-4 h-4" />
                                                                <span className="hidden min-[380px]:inline">Edit</span>
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="danger"
                                                                size="sm"
                                                                onClick={() => deleteProduct(product.id)}
                                                                className="h-8 gap-1 px-2 text-[11px] sm:text-sm"
                                                                title="Hapus produk"
                                                            >
                                                                <Icon name="trash" className="w-4 h-4" />
                                                                <span className="hidden min-[380px]:inline">Hapus</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="hidden h-full overflow-auto md:block">
                                <table className="min-w-[760px] w-full text-left text-sm text-slate-300">
                                    <thead className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur border-b border-slate-700">
                                        <tr>
                                            <th className="w-14 px-4 py-3 font-semibold text-slate-200">
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleSelected}
                                                    onChange={toggleSelectAllVisible}
                                                    className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                                                    aria-label="Pilih semua produk yang terlihat"
                                                />
                                            </th>
                                            {columns.map((column, index) => (
                                                <th key={index} className="px-4 py-3 font-semibold text-slate-200">
                                                    {column.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map(product => (
                                            <tr key={product.id} className="border-b border-slate-800 hover:bg-slate-800/50 align-middle">
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProductIds.includes(product.id)}
                                                        onChange={() => toggleProductSelection(product.id)}
                                                        className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                                                        aria-label={`Pilih produk ${product.name}`}
                                                    />
                                                </td>
                                                {columns.map((column, index) => (
                                                    <td
                                                        key={index}
                                                        className={`px-4 py-3 text-slate-300 ${column.className || ''}`}
                                                    >
                                                        {column.render(product)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
                                <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                                    <Icon name="boxes" className="mx-auto h-10 w-10 text-slate-500" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-white">
                                    {searchTerm ? 'Produk tidak ditemukan.' : 'Belum ada produk di katalog.'}
                                </h3>
                                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                                    {searchTerm
                                        ? 'Coba ubah kata kunci pencarian atau cek kembali barcode yang Anda masukkan.'
                                        : 'Tambahkan produk pertama agar katalog siap dipakai untuk penjualan, pengelolaan stok, dan channel online.'}
                                </p>
                                {!searchTerm && (
                                    <Button
                                        variant="primary"
                                        onClick={() => { setEditingProduct(null); setFormOpen(true); }}
                                        className="mt-4"
                                    >
                                        <Icon name="plus" className="h-5 w-5" />
                                        <span>Tambah Produk Pertama</span>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <Modal
                isOpen={isFormOpen}
                onClose={() => { setFormOpen(false); setEditingProduct(null); setCapturedImage(null); }}
                title={editingProduct ? 'Edit Produk' : 'Tambah Produk'}
                size="xl"
                mobileLayout="fullscreen"
            >
                <ProductForm 
                    ref={formRef}
                    product={editingProduct} 
                    onSave={handleSave} 
                    onCancel={() => { setFormOpen(false); setEditingProduct(null); setCapturedImage(null); }}
                    onOpenCamera={() => setCameraOpen(true)}
                    isCameraAvailable={isCameraAvailable}
                    capturedImage={capturedImage}
                />
            </Modal>
            
            <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={() => setCategoryModalOpen(false)} />

            <BulkEditProductsModal
                isOpen={isBulkEditModalOpen}
                onClose={() => setIsBulkEditModalOpen(false)}
                selectedCount={selectedProductIds.length}
                onApply={handleApplyBulkEdit}
            />

            <CameraCaptureModal 
                isOpen={isCameraOpen} 
                onClose={() => setCameraOpen(false)} 
                onCapture={onCameraCapture} 
            />

            <StockOpnameModal 
                isOpen={isOpnameOpen} 
                onClose={() => setIsOpnameOpen(false)} 
                initialTab="product"
            />

            <BulkProductModal
                isOpen={isBulkModalOpen}
                onClose={() => setBulkModalOpen(false)}
                onSave={handleBulkSave}
            />

            <StockTransferModal 
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
            />

            {/* Pass filterType="product" so it only shows products if needed, or leave blank to show all. 
                However, usually 'Stok Manual' in Products View implies managing Product Stock. */}
            <StaffRestockModal
                isOpen={isRestockModalOpen}
                onClose={() => setIsRestockModalOpen(false)}
                filterType="product"
            />

            <ChannelSalesModal
                isOpen={isChannelSalesOpen}
                onClose={() => setIsChannelSalesOpen(false)}
            />
        </div>
    );
};

export default ProductsView;

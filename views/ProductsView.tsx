
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext'; 
import type { Product, RecipeItem, Addon, ProductVariant, BranchPrice, ModifierGroup, ModifierOption } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import { CURRENCY_FORMATTER } from '../constants';
import CameraCaptureModal from '../components/CameraCaptureModal';
import { useCameraAvailability } from '../hooks/useCameraAvailability';
import ProductPlaceholder from '../components/ProductPlaceholder';
import VirtualizedTable from '../components/VirtualizedTable';
import StockOpnameModal from '../components/StockOpnameModal';
import StockTransferModal from '../components/StockTransferModal'; 
import StaffRestockModal from '../components/StaffRestockModal';
import { useSettings } from '../context/SettingsContext';
import { compressImage } from '../utils/imageCompression'; 
import { dataService } from '../services/dataService';

// Informasikan TypeScript tentang pustaka global JsBarcode
declare const JsBarcode: any;

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

const CategoryInput: React.FC<{
    value: string[];
    onChange: (value: string[]) => void;
}> = ({ value, onChange }) => {
    const { categories, addCategory } = useProduct();
    const { showAlert } = useUI();
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
    const { showAlert } = useUI();
    const { currentUser } = useAuth();
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
        <Modal isOpen={isOpen} onClose={onClose} title="Tambah Produk Massal">
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

// ... CategoryManagerModal ...
const CategoryManagerModal: React.FC<any> = () => null;

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
    const { currentUser } = useAuth();
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
        <form ref={ref} onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
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
    const { products, addProduct, updateProduct, deleteProduct, bulkAddProducts } = useProduct();
    const { showAlert } = useUI();
    const { currentUser } = useAuth();
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

    const isAdmin = currentUser?.role === 'admin';

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.barcode && p.barcode.includes(searchTerm))
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [products, searchTerm]);

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

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white self-start sm:self-center">Produk</h1>
                <div className="flex gap-2 flex-wrap justify-end self-stretch sm:self-center">
                    <div className="relative flex-grow sm:flex-grow-0">
                         <input
                            type="text"
                            placeholder="Cari produk..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-[#347758] focus:border-[#347758]"
                        />
                         <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                    
                    {/* TOMBOL TRANSFER STOK (GUDANG -> CABANG) */}
                    {isAdmin && (
                        <Button variant="secondary" onClick={() => setIsTransferModalOpen(true)} className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white border-none" title="Kirim Stok ke Cabang (Cloud)">
                            <Icon name="share" className="w-5 h-5"/>
                            <span className="hidden lg:inline">Transfer Stok</span>
                        </Button>
                    )}

                    {/* TOMBOL MANUAL STOK (SUPPLIER -> GUDANG) */}
                    <Button variant="secondary" onClick={() => setIsRestockModalOpen(true)} className="flex-shrink-0 bg-green-600 hover:bg-green-500 text-white border-none" title="Terima Barang dari Supplier / Koreksi Manual">
                        <Icon name="download" className="w-5 h-5 rotate-180"/>
                        <span className="hidden lg:inline">Stok Manual</span>
                    </Button>

                    <Button variant="secondary" onClick={handleExport} className="flex-shrink-0 bg-slate-700 border-slate-600 hover:bg-slate-600">
                        <Icon name="download" className="w-5 h-5"/>
                        <span className="hidden lg:inline">Export</span>
                    </Button>

                    <Button variant="secondary" onClick={() => setBulkModalOpen(true)} className="flex-shrink-0 bg-blue-900/30 text-blue-300 border-blue-800 hover:bg-blue-900/50">
                        <Icon name="boxes" className="w-5 h-5"/>
                        <span className="hidden lg:inline">Tambah Massal</span>
                    </Button>
                    <Button variant="secondary" onClick={() => setCategoryModalOpen(true)} className="flex-shrink-0">
                        <Icon name="tag" className="w-5 h-5"/>
                        <span className="hidden lg:inline">Kategori</span>
                    </Button>
                    <Button variant="secondary" onClick={() => setIsOpnameOpen(true)} className="flex-shrink-0">
                        <Icon name="clipboard" className="w-5 h-5"/>
                        <span className="hidden lg:inline">Opname</span>
                    </Button>
                    <Button variant="primary" onClick={() => { setEditingProduct(null); setFormOpen(true); }} className="flex-shrink-0">
                        <Icon name="plus" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Tambah</span>
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-slate-800 rounded-lg shadow-md flex flex-col">
                {filteredProducts.length > 0 ? (
                    <VirtualizedTable
                        data={filteredProducts}
                        columns={columns}
                        rowHeight={60}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
                        {searchTerm ? 'Produk tidak ditemukan.' : 'Belum ada produk. Tambahkan produk baru.'}
                    </div>
                )}
            </div>

            <Modal isOpen={isFormOpen} onClose={() => { setFormOpen(false); setEditingProduct(null); setCapturedImage(null); }} title={editingProduct ? 'Edit Produk' : 'Tambah Produk'}>
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
        </div>
    );
};

export default ProductsView;

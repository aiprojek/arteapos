
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
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
            // Prevent negative signs manually just in case
            if (val.includes('-')) return;
            // Ensure valid number format (regex: positive decimals or integers)
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
                    // Block unwanted chars in number fields
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

// ... CategoryInput, ModifierBuilder remain unchanged ...
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
        // Ensure numbers
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
                            <label className="text-xs text-slate-400">Nama Grup (cth: Level Gula, Topping)</label>
                            <input 
                                type="text" 
                                value={group.name} 
                                onChange={e => updateGroup(gIdx, 'name', e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                placeholder="Wajib diisi (cth: Ukuran)"
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
                    
                    {/* Visual Hint */}
                    <p className="text-[10px] text-slate-500 italic">
                        {group.minSelection > 0 ? "Wajib diisi." : "Opsional."} 
                        {group.maxSelection === 1 ? " (Radio Button - Pilih Satu)" : ` (Checkbox - Maks ${group.maxSelection})`}
                    </p>

                    <div className="pl-0 sm:pl-4 sm:border-l-2 border-slate-700 space-y-2">
                        {/* Headers for Options */}
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
                                    placeholder="Nama (cth: Regular)" 
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
                                        title="Tambahan Harga Jual (Isi 0 jika gratis)"
                                        onKeyDown={(e) => { if(['-','e'].includes(e.key)) e.preventDefault(); }}
                                    />
                                </div>
                                <div className="flex flex-col w-20">
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={opt.costPrice || 0}
                                        onChange={e => updateOption(gIdx, oIdx, 'costPrice', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-400 text-xs focus:text-white"
                                        title="Harga Modal/HPP (Opsional)"
                                        onKeyDown={(e) => { if(['-','e'].includes(e.key)) e.preventDefault(); }}
                                    />
                                </div>
                                <button type="button" onClick={() => removeOption(gIdx, oIdx)} className="text-red-400 hover:text-red-300">
                                    <Icon name="close" className="w-3 h-3"/>
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={() => addOption(gIdx)} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-2">
                            <Icon name="plus" className="w-3 h-3"/> Tambah Opsi (Minimal 1)
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

// --- NEW: Bulk Product Modal ---
const BulkProductModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (products: Product[]) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const { showAlert } = useUI();
    const [mode, setMode] = useState<'manual' | 'import'>('manual');
    const [rows, setRows] = useState<Array<{
        name: string, 
        price: string, 
        costPrice: string, 
        stock: string, 
        category: string,
        barcode: string,
        branchPrices: string // Format: STORE:PRICE;STORE:PRICE
    }>>([
        { name: '', price: '', costPrice: '', stock: '', category: '', barcode: '', branchPrices: '' },
        { name: '', price: '', costPrice: '', stock: '', category: '', barcode: '', branchPrices: '' },
        { name: '', price: '', costPrice: '', stock: '', category: '', barcode: '', branchPrices: '' },
        { name: '', price: '', costPrice: '', stock: '', category: '', barcode: '', branchPrices: '' },
        { name: '', price: '', costPrice: '', stock: '', category: '', barcode: '', branchPrices: '' },
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual Table Logic
    const handleRowChange = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        (newRows[index] as any)[field] = value;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { name: '', price: '', costPrice: '', stock: '', category: '', barcode: '', branchPrices: '' }]);
    };

    const removeRow = (index: number) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleSaveManual = () => {
        const validRows = rows.filter(r => r.name.trim() !== '' && r.price.trim() !== '');
        
        if (validRows.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Isi minimal satu Nama Produk dan Harga.' });
            return;
        }

        const products: Product[] = validRows.map((r, i) => {
            const parsedBranchPrices: BranchPrice[] = r.branchPrices.split(',').map(pair => {
                const [id, priceStr] = pair.split(':');
                if(id && priceStr) {
                    return { storeId: id.trim().toUpperCase(), price: parseFloat(priceStr) || 0 };
                }
                return null;
            }).filter(Boolean) as BranchPrice[];

            return {
                id: `${Date.now()}-${i}`,
                name: r.name,
                price: parseFloat(r.price) || 0,
                costPrice: parseFloat(r.costPrice) || 0,
                stock: parseInt(r.stock) || 0,
                trackStock: !!r.stock, 
                category: r.category.split(',').map(c => c.trim()).filter(c => c !== ''),
                barcode: r.barcode,
                branchPrices: parsedBranchPrices,
                isFavorite: false,
                variants: [], addons: [], modifierGroups: [], recipe: []
            };
        });

        onSave(products);
        setRows([{ name: '', price: '', costPrice: '', stock: '', category: '', barcode: '', branchPrices: '' }]); 
    };

    // Import Logic
    const handleDownloadTemplate = () => {
        // Updated Template with more columns
        const headers = ['name', 'price', 'category', 'costPrice', 'stock', 'barcode', 'branchPrices', 'modifierGroups'];
        const sample = [
            'Kopi Susu', 
            '18000', 
            'Kopi', 
            '10000', 
            '100', 
            '123456', 
            'JKT01:20000|BDG01:18000', 
            '[{"name":"Level Gula","minSelection":1,"maxSelection":1,"options":[{"name":"Normal","price":0},{"name":"Less","price":0}]}]' // JSON example
        ];
        const csvContent = [headers.join(','), sample.map(s => `"${s.replace(/"/g, '""')}"`).join(',')].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'template_produk_artea_lengkap.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const products = await dataService.importProductsCSV(file);
            if (products.length > 0) {
                onSave(products);
            } else {
                showAlert({ type: 'alert', title: 'Gagal', message: 'Tidak ada produk valid ditemukan di file CSV.' });
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
                    <button 
                        onClick={() => setMode('manual')} 
                        className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'manual' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300'}`}
                    >
                        Input Manual (Tabel)
                    </button>
                    <button 
                        onClick={() => setMode('import')} 
                        className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'import' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300'}`}
                    >
                        Upload CSV / Excel
                    </button>
                </div>

                {mode === 'manual' ? (
                    <div className="space-y-4">
                        <div className="overflow-x-auto max-h-[50vh] border border-slate-600 rounded-lg">
                            <table className="w-full text-left text-sm text-slate-300 min-w-[900px]">
                                <thead className="bg-slate-700 text-white font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 w-48">Nama Produk*</th>
                                        <th className="p-2 w-24">Harga*</th>
                                        <th className="p-2 w-24">Modal</th>
                                        <th className="p-2 w-20">Stok</th>
                                        <th className="p-2 w-32">Kategori</th>
                                        <th className="p-2 w-32">Barcode</th>
                                        <th className="p-2 w-48">Harga Cabang (ID:Harga)</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr key={idx} className="border-b border-slate-700 bg-slate-800">
                                            <td className="p-1">
                                                <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.name} onChange={e => handleRowChange(idx, 'name', e.target.value)} placeholder="Nama" />
                                            </td>
                                            <td className="p-1">
                                                <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.price} onChange={e => handleRowChange(idx, 'price', e.target.value)} placeholder="0" />
                                            </td>
                                            <td className="p-1">
                                                <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.costPrice} onChange={e => handleRowChange(idx, 'costPrice', e.target.value)} placeholder="0" />
                                            </td>
                                            <td className="p-1">
                                                <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.stock} onChange={e => handleRowChange(idx, 'stock', e.target.value)} placeholder="-" />
                                            </td>
                                            <td className="p-1">
                                                <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.category} onChange={e => handleRowChange(idx, 'category', e.target.value)} placeholder="Kopi, Makanan" />
                                            </td>
                                            <td className="p-1">
                                                <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.barcode} onChange={e => handleRowChange(idx, 'barcode', e.target.value)} placeholder="Scan/Ketik" />
                                            </td>
                                            <td className="p-1">
                                                <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.branchPrices} onChange={e => handleRowChange(idx, 'branchPrices', e.target.value)} placeholder="JKT:15000, BDG:14000" />
                                            </td>
                                            <td className="p-1 text-center">
                                                <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-yellow-500 italic">
                            *Untuk input <strong>Varian & Modifier</strong> yang kompleks, silakan gunakan fitur Import CSV (Unduh Template untuk melihat formatnya).
                        </p>
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
                                <li>Unduh template CSV di bawah ini.</li>
                                <li>Buka dengan Excel/Spreadsheet.</li>
                                <li>Isi data produk. Jangan ubah judul kolom.</li>
                                <li>Untuk <strong>Modifier/Varian</strong>, formatnya adalah JSON (Disarankan copy-paste dari export produk yang sudah ada).</li>
                                <li>Simpan kembali sebagai file <strong>.CSV</strong> (Comma Separated).</li>
                                <li>Upload file tersebut di sini.</li>
                            </ol>
                        </div>
                        
                        <div className="flex justify-center gap-4">
                            <Button variant="secondary" onClick={handleDownloadTemplate}>
                                <Icon name="download" className="w-4 h-4"/> Unduh Template Lengkap
                            </Button>
                            <div className="relative">
                                <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
                                    <Icon name="upload" className="w-4 h-4"/> Upload CSV
                                </Button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".csv"
                                    onChange={handleImportFile}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};


const ProductForm = React.forwardRef<HTMLFormElement, {
    product?: Product | null,
    onSave: (product: Omit<Product, 'id'> | Product) => void,
    onCancel: () => void,
    onOpenCamera: () => void,
    isCameraAvailable: boolean,
    capturedImage?: string | null
}>(({ product, onSave, onCancel, onOpenCamera, isCameraAvailable, capturedImage }, ref) => {
    const { inventorySettings, rawMaterials, products } = useProduct();
    const { receiptSettings } = useSettings();
    const { showAlert } = useUI();
    const [formData, setFormData] = useState({
        name: '', price: '', category: [] as string[], imageUrl: '', costPrice: '',
        stock: '', trackStock: false, recipe: [] as RecipeItem[], isFavorite: false, barcode: '', 
        addons: [] as Addon[], variants: [] as ProductVariant[],
        modifierGroups: [] as ModifierGroup[], 
        branchPrices: [] as BranchPrice[],
        validStoreIds: [] as string[],
        taxRate: ''
    });
    const [imageSource, setImageSource] = useState<ImageSource>('none');
    const [isCompressing, setIsCompressing] = useState(false);
    
    const [newBranchId, setNewBranchId] = useState('');
    const [newBranchPrice, setNewBranchPrice] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const barcodeRef = useRef<SVGSVGElement>(null);

    const availableBranches = receiptSettings.branches || [];

    useEffect(() => {
        if (product) {
            const productData = {
                name: product.name,
                price: product.price.toString(),
                category: Array.isArray(product.category) ? product.category : (product.category ? [product.category] : []),
                imageUrl: product.imageUrl || '',
                costPrice: product.costPrice?.toString() || '',
                stock: product.stock?.toString() || '',
                trackStock: product.trackStock || false,
                recipe: product.recipe?.map(r => ({ ...r, itemType: r.itemType || 'raw_material' })) || [],
                isFavorite: product.isFavorite || false,
                barcode: product.barcode || '',
                addons: product.addons || [],
                variants: product.variants || [],
                modifierGroups: product.modifierGroups || [], 
                branchPrices: product.branchPrices || [],
                validStoreIds: product.validStoreIds || [],
                taxRate: product.taxRate !== undefined ? product.taxRate.toString() : ''
            };
            setFormData(productData);

            if (productData.imageUrl.startsWith('data:')) {
                setImageSource('upload');
            } else if (productData.imageUrl.startsWith('http')) {
                setImageSource('url');
            } else {
                setImageSource('none');
            }
        } else {
            setFormData({ name: '', price: '', category: [], imageUrl: '', costPrice: '', stock: '', trackStock: false, recipe: [], isFavorite: false, barcode: '', addons: [], variants: [], modifierGroups: [], branchPrices: [], validStoreIds: [], taxRate: '' });
            setImageSource('none');
        }
    }, [product]);
    
    useEffect(() => {
        if (capturedImage) {
            setFormData(prev => ({ ...prev, imageUrl: capturedImage }));
            setImageSource('camera');
        }
    }, [capturedImage]);

     useEffect(() => {
        if (barcodeRef.current && formData.barcode) {
            try {
                JsBarcode(barcodeRef.current, formData.barcode, {
                    format: "CODE128",
                    displayValue: true,
                    background: '#f1f5f9',
                    lineColor: '#0f172a',
                    width: 2, height: 50, fontSize: 14,
                });
            } catch (e) {
                 if(barcodeRef.current) barcodeRef.current.innerHTML = '';
            }
        }
    }, [formData.barcode]);

    useEffect(() => {
        if (product?.imageUrl) {
            setFormData(prev => ({ ...prev, imageUrl: product.imageUrl! }));
            const isUrl = product.imageUrl.startsWith('http');
            const isBase64 = product.imageUrl.startsWith('data:image');
            if (isUrl) setImageSource('url');
            else if (isBase64) setImageSource('upload');
        }
    }, [product?.imageUrl]);


    const handleImageSourceChange = (source: ImageSource) => {
        setImageSource(source);
        if (source === 'none') setFormData(prev => ({ ...prev, imageUrl: '' }));
        if (source === 'upload') fileInputRef.current?.click();
        if (source === 'camera') onOpenCamera();
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressing(true);
            try {
                const compressedBase64 = await compressImage(file);
                setFormData(prev => ({ ...prev, imageUrl: compressedBase64 }));
            } catch (err) {
                console.error("Image compression failed:", err);
                showAlert({type:'alert', title:'Gagal Upload', message:'Gagal memproses gambar. Coba gambar lain.'});
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleRecipeChange = (index: number, field: keyof RecipeItem, value: string) => {
        const updatedRecipe = [...formData.recipe];
        // @ts-ignore
        updatedRecipe[index] = { ...updatedRecipe[index], [field]: value };
        if (field === 'itemType') {
             updatedRecipe[index].rawMaterialId = '';
             updatedRecipe[index].productId = '';
        }
        setFormData(prev => ({ ...prev, recipe: updatedRecipe }));
    };

    const addRecipeItem = () => {
        setFormData(prev => ({ ...prev, recipe: [...prev.recipe, { itemType: 'raw_material', rawMaterialId: '', productId: '', quantity: 0 }] }));
    };

    const removeRecipeItem = (index: number) => {
        setFormData(prev => ({ ...prev, recipe: prev.recipe.filter((_, i) => i !== index) }));
    };

    const addBranchPrice = () => {
        if (!newBranchId || !newBranchPrice) return;
        const price = Math.max(0, parseFloat(newBranchPrice) || 0); // Strict check
        const storeId = newBranchId.toUpperCase().trim();
        
        const filtered = formData.branchPrices.filter(bp => bp.storeId !== storeId);
        
        setFormData(prev => ({ 
            ...prev, 
            branchPrices: [...filtered, { storeId, price }] 
        }));
        setNewBranchId('');
        setNewBranchPrice('');
    };

    const removeBranchPrice = (storeId: string) => {
        setFormData(prev => ({
            ...prev,
            branchPrices: prev.branchPrices.filter(bp => bp.storeId !== storeId)
        }));
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // VALIDATION: Prevent Silent Deletion of Modifiers
        const hasInvalidModifiers = formData.modifierGroups.some(g => !g.name.trim() || g.options.length === 0 || g.options.some(o => !o.name.trim()));
        
        if (hasInvalidModifiers) {
            showAlert({
                type: 'alert',
                title: 'Data Modifier Tidak Lengkap',
                message: 'Mohon periksa bagian "Varian & Modifier". Pastikan setiap grup memiliki Nama dan minimal satu Opsi yang juga memiliki nama.'
            });
            return;
        }

        // Final Validation & Sanitization
        const price = Math.max(0, parseFloat(formData.price) || 0);
        const costPrice = Math.max(0, parseFloat(formData.costPrice) || 0);
        const stock = Math.max(0, parseInt(formData.stock, 10) || 0);
        const taxRate = formData.taxRate !== '' ? Math.max(0, parseFloat(formData.taxRate)) : undefined;

        const productData = {
            ...formData,
            price,
            costPrice,
            stock,
            recipe: formData.recipe.map(r => ({
                ...r,
                quantity: Math.max(0, parseFloat(String(r.quantity)) || 0),
                rawMaterialId: r.itemType === 'raw_material' ? r.rawMaterialId : undefined,
                productId: r.itemType === 'product' ? r.productId : undefined,
            })).filter(r => (r.itemType === 'raw_material' && r.rawMaterialId) || (r.itemType === 'product' && r.productId)),
            // Filter is now safe because we validated above
            modifierGroups: formData.modifierGroups.filter(g => g.name.trim() !== '' && g.options.length > 0),
            addons: formData.addons, 
            variants: formData.variants,
            branchPrices: formData.branchPrices,
            validStoreIds: formData.validStoreIds.length === 0 ? undefined : formData.validStoreIds,
            taxRate
        };
        if (product && 'id' in product) {
            onSave({ ...productData, id: product.id });
        } else {
            onSave(productData);
        }
    };
    
    const generateBarcode = () => {
        const timestamp = Date.now().toString();
        const newBarcode = timestamp.substring(timestamp.length - 12);
        setFormData(prev => ({ ...prev, barcode: newBarcode }));
    };

    const showSimpleStock = inventorySettings.enabled && !inventorySettings.trackIngredients;
    const showRecipe = inventorySettings.enabled && inventorySettings.trackIngredients;

    const recipeCost = useMemo(() => {
        if (!showRecipe) return 0;
        return formData.recipe.reduce((sum, item) => {
            let cost = 0;
            if (item.itemType === 'product' && item.productId) {
                const subProduct = products.find(p => p.id === item.productId);
                cost = subProduct?.costPrice || 0; 
            } else if (item.itemType === 'raw_material' || !item.itemType) {
                const material = rawMaterials.find(rm => rm.id === item.rawMaterialId);
                cost = material?.costPerUnit || 0;
            }
            return sum + (cost * (parseFloat(String(item.quantity)) || 0));
        }, 0);
    }, [formData.recipe, rawMaterials, products, showRecipe]);
    
    const sellingPrice = parseFloat(formData.price) || 0;
    const profit = sellingPrice - recipeCost;
    const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

    const availableProductsForBundle = useMemo(() => {
        return products.filter(p => !product || p.id !== product.id);
    }, [products, product]);

    return (
        <form ref={ref} onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-4">
                <div className="flex-1">
                    <InputField name="name" label="Nama Produk" required value={formData.name} onChange={handleChange} />
                </div>
                <div className="pt-7">
                     <label className="flex items-center space-x-2 cursor-pointer" title="Tandai sebagai produk favorit">
                        <input type="checkbox" name="isFavorite" checked={formData.isFavorite} onChange={handleChange} className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-[#347758] focus:ring-[#347758]" />
                         <span className="text-slate-300">Favorit</span>
                     </label>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <InputField name="price" label="Harga Jual (IDR)" type="number" required value={formData.price} onChange={handleChange} min="0" placeholder="0"/>
                </div>
                <div className="md:col-span-1">
                    <InputField name="taxRate" label="Pajak Khusus (%)" type="number" value={formData.taxRate} onChange={handleChange} min="0" placeholder={`Global: ${receiptSettings.taxRate || 0}%`}/>
                </div>
                {inventorySettings.enabled && (
                    <div className="md:col-span-1">
                        <InputField name="costPrice" label="Harga Modal (IDR)" type="number" value={formData.costPrice} onChange={handleChange} min="0" placeholder="0"/>
                    </div>
                )}
            </div>
            
            <CategoryInput value={formData.category} onChange={(newCats) => setFormData(prev => ({ ...prev, category: newCats }))} />
            
            {/* Branch Restriction Selector */}
            {availableBranches.length > 0 && (
                <div className="pt-2">
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
                        {formData.validStoreIds.length === 0 
                            ? "Produk ini akan muncul di semua cabang." 
                            : "Produk ini HANYA akan muncul di cabang yang dipilih."}
                    </p>
                </div>
            )}

            <div>
                 <label htmlFor="barcode" className="block text-sm font-medium text-slate-300 mb-1">Barcode (Opsional)</label>
                 <div className="flex gap-2">
                     <input
                        type="text"
                        id="barcode"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleChange}
                        className="flex-grow w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                     />
                     <Button type="button" variant="secondary" onClick={generateBarcode}>Generate</Button>
                 </div>
                 {formData.barcode && (
                    <div className="mt-3 p-2 bg-slate-100 inline-block rounded-lg">
                        <svg ref={barcodeRef}></svg>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">Gambar Produk</label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {([['none', 'Tanpa Gambar'], ['url', 'URL']] as const).map(([source, label]) => (
                        <Button type="button" key={source} variant={imageSource === source ? 'primary' : 'secondary'} size="sm" onClick={() => handleImageSourceChange(source)}>
                           {label}
                        </Button>
                    ))}
                    <Button type="button" key="upload" variant={imageSource === 'upload' ? 'primary' : 'secondary'} size="sm" onClick={() => handleImageSourceChange('upload')}>
                       <><Icon name="upload" className="w-4 h-4" /> Upload</>
                    </Button>
                    <Button 
                        type="button" 
                        key="camera" 
                        variant={imageSource === 'camera' ? 'primary' : 'secondary'} 
                        size="sm" 
                        onClick={() => handleImageSourceChange('camera')}
                        disabled={!isCameraAvailable}
                        title={isCameraAvailable ? "Gunakan kamera perangkat" : "Tidak ada kamera yang terdeteksi"}
                    >
                       <><Icon name="camera" className="w-4 h-4" /> Kamera</>
                    </Button>
                </div>
                
                {imageSource === 'url' && (
                     <input type="text" name="imageUrl" value={formData.imageUrl.startsWith('http') ? formData.imageUrl : ''} onChange={handleChange} placeholder="https://..." className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

                {isCompressing && <p className="text-xs text-yellow-400 animate-pulse">Mengompres gambar...</p>}

                {formData.imageUrl && (
                    <div className="mt-3 relative w-40 h-40">
                        <img src={formData.imageUrl} alt="Pratinjau" className="rounded-lg object-cover w-full h-full" />
                        <button type="button" onClick={() => handleImageSourceChange('none')} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-700">
                            <Icon name="close" className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Remote Branch Pricing Section */}
            <div className="space-y-3 pt-4 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
                    <Icon name="share" className="w-5 h-5"/> Harga Khusus Cabang
                </h3>
                <p className="text-xs text-slate-400">Atur harga berbeda untuk cabang tertentu. Harga ini akan diterapkan saat cabang melakukan Sync dari Cloud.</p>
                
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Store ID (cth: BDG-01)" 
                        value={newBranchId}
                        onChange={(e) => setNewBranchId(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white uppercase"
                    />
                    <input 
                        type="number" 
                        placeholder="Harga (Rp)" 
                        value={newBranchPrice}
                        onChange={(e) => setNewBranchPrice(e.target.value)}
                        className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white"
                        onKeyDown={(e) => { if(['-','e'].includes(e.key)) e.preventDefault(); }}
                    />
                    <Button type="button" size="sm" onClick={addBranchPrice}>Tambah</Button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.branchPrices.map((bp, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-700">
                            <span className="font-mono text-sm text-yellow-300">{bp.storeId}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-white font-bold">{CURRENCY_FORMATTER.format(bp.price)}</span>
                                <button type="button" onClick={() => removeBranchPrice(bp.storeId)} className="text-red-400 hover:text-white">
                                    <Icon name="close" className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    ))}
                    {formData.branchPrices.length === 0 && <p className="text-xs text-slate-500 italic">Belum ada harga khusus cabang.</p>}
                </div>
            </div>

            {/* NEW: Modifier & Variant Builder */}
            <div className="space-y-3 pt-4 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-white">Varian & Modifier (Advanced)</h3>
                <p className="text-xs text-slate-400">Atur varian rasa, level gula, topping, atau ukuran.</p>
                <ModifierBuilder 
                    groups={formData.modifierGroups} 
                    onChange={(groups) => setFormData(prev => ({...prev, modifierGroups: groups}))} 
                />
            </div>

            {inventorySettings.enabled && (
                <div className="pt-4 border-t border-slate-700 space-y-4">
                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            name="trackStock"
                            checked={formData.trackStock}
                            onChange={handleChange}
                            className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-[#347758] focus:ring-[#347758]"
                        />
                        <span className="text-sm text-slate-300">Lacak Stok Produk Ini</span>
                    </label>

                    {formData.trackStock && showSimpleStock && (
                        <InputField name="stock" label="Stok Saat Ini" type="number" value={formData.stock} onChange={handleChange} min="0"/>
                    )}

                    {formData.trackStock && showRecipe && (
                        <div className="space-y-3 bg-slate-800 p-4 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-center">
                                <h3 className="text-md font-semibold text-white">Resep / Komposisi & Bundling</h3>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Estimasi Modal (HPP)</p>
                                    <p className="font-bold text-[#52a37c]">{CURRENCY_FORMATTER.format(recipeCost)}</p>
                                    <p className="text-xs text-slate-500">Margin: {profitMargin.toFixed(1)}%</p>
                                </div>
                            </div>
                            
                            {formData.recipe.map((item, index) => (
                                <div key={index} className="flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded">
                                    <select 
                                        value={item.itemType || 'raw_material'} 
                                        onChange={e => handleRecipeChange(index, 'itemType', e.target.value)}
                                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                                    >
                                        <option value="raw_material">Bahan Baku</option>
                                        <option value="product">Produk Jadi</option>
                                    </select>

                                    {item.itemType === 'product' ? (
                                        <select
                                            value={item.productId || ''}
                                            onChange={e => handleRecipeChange(index, 'productId', e.target.value)}
                                            className="flex-1 min-w-[150px] bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                        >
                                            <option value="">-- Pilih Produk --</option>
                                            {availableProductsForBundle.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.trackStock ? `Stok: ${p.stock}` : 'No Stock'})</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <select
                                            value={item.rawMaterialId || ''}
                                            onChange={e => handleRecipeChange(index, 'rawMaterialId', e.target.value)}
                                            className="flex-1 min-w-[150px] bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                        >
                                            <option value="">-- Pilih Bahan Baku --</option>
                                            {rawMaterials.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>
                                            ))}
                                        </select>
                                    )}

                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.quantity}
                                        onChange={e => handleRecipeChange(index, 'quantity', e.target.value)}
                                        placeholder="Jml"
                                        className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                        onKeyDown={(e) => { if(['-','e'].includes(e.key)) e.preventDefault(); }}
                                    />
                                    <span className="text-xs text-slate-400 w-10">
                                        {item.itemType === 'product' 
                                            ? 'Pcs' 
                                            : (rawMaterials.find(m => m.id === item.rawMaterialId)?.unit || '')}
                                    </span>
                                    <Button type="button" variant="danger" size="sm" onClick={() => removeRecipeItem(index)}>
                                        <Icon name="trash" className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                            
                            <Button type="button" variant="secondary" size="sm" onClick={addRecipeItem}>
                                <Icon name="plus" className="w-3 h-3" /> Tambah Komposisi
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
                <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant="primary" disabled={isCompressing}>
                    {isCompressing ? 'Memproses...' : 'Simpan'}
                </Button>
            </div>
        </form>
    );
});

// ... rest of file (CategoryManagerModal, ProductsView component) remains unchanged ...
const CategoryManagerModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { categories, addCategory, deleteCategory } = useProduct();
    const { showAlert } = useUI();
    const [newCategory, setNewCategory] = useState('');

    const handleAdd = () => {
        const trimmed = newCategory.trim();
        if (trimmed && !categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            addCategory(trimmed);
            setNewCategory('');
        }
    };
    
    const handleDelete = (category: string) => {
        showAlert({
            type: 'confirm',
            title: 'Hapus Kategori?',
            message: `Anda yakin ingin menghapus kategori "${category}"? Produk yang menggunakan kategori ini tidak akan terpengaruh.`,
            confirmVariant: 'danger',
            confirmText: 'Ya, Hapus',
            onConfirm: () => deleteCategory(category)
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kelola Kategori Produk">
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAdd(); }}}
                        placeholder="Nama Kategori Baru"
                        className="flex-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                        autoFocus
                    />
                    <Button onClick={handleAdd}>Tambah</Button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {categories.length > 0 ? categories.map(cat => (
                        <div key={cat} className="flex justify-between items-center bg-slate-900 p-2 rounded-lg">
                            <span className="text-slate-200">{cat}</span>
                            <button onClick={() => handleDelete(cat)} className="text-red-400 hover:text-red-300">
                                <Icon name="trash" className="w-4 h-4" />
                            </button>
                        </div>
                    )) : <p className="text-slate-500 text-center text-sm py-4">Belum ada kategori.</p>}
                </div>
            </div>
        </Modal>
    );
};

const ProductsView: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, bulkAddProducts } = useProduct();
    const { showAlert } = useUI();
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

    // --- NEW: Handle Export CSV ---
    const handleExport = () => {
        dataService.exportProductsCSV(products);
        showAlert({
            type: 'alert',
            title: 'Export Berhasil',
            message: 'Data produk (CSV) berhasil diunduh. Anda bisa mengeditnya di Excel dan menguploadnya kembali (update otomatis berdasarkan ID).'
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
                    {/* NEW EXPORT BUTTON */}
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
        </div>
    );
};

export default ProductsView;

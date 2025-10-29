import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
import type { Product, RecipeItem, Addon } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import { CURRENCY_FORMATTER } from '../constants';
import CameraCaptureModal from '../components/CameraCaptureModal';
import { useCameraAvailability } from '../hooks/useCameraAvailability';
import ProductPlaceholder from '../components/ProductPlaceholder';

// Informasikan TypeScript tentang pustaka global JsBarcode
declare const JsBarcode: any;

type ImageSource = 'none' | 'url' | 'upload' | 'camera';

const InputField: React.FC<{
    name: string;
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
    step?: string;
    className?: string;
}> = ({ name, label, value, onChange, type = 'text', required = false, step, className='' }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            step={step}
            className={`w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white ${className}`}
        />
    </div>
);

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
                // Find the correct case and add it
                const existingCategory = categories.find(c => c.toLowerCase() === trimmedCat.toLowerCase())!;
                onChange([...value, existingCategory]);
            } else {
                // New category, ask for confirmation
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


const ProductForm = React.forwardRef<HTMLFormElement, {
    product?: Product | null,
    onSave: (product: Omit<Product, 'id'> | Product) => void,
    onCancel: () => void,
    onOpenCamera: () => void,
    isCameraAvailable: boolean,
}>(({ product, onSave, onCancel, onOpenCamera, isCameraAvailable }, ref) => {
    const { inventorySettings, rawMaterials } = useProduct();
    const { showAlert } = useUI();
    const [formData, setFormData] = useState({
        name: '', price: '', category: [] as string[], imageUrl: '', costPrice: '',
        stock: '', trackStock: false, recipe: [] as RecipeItem[], isFavorite: false, barcode: '', addons: [] as Addon[]
    });
    const [imageSource, setImageSource] = useState<ImageSource>('none');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                price: product.price.toString(),
                category: Array.isArray(product.category) ? product.category : (product.category ? [product.category] : []),
                imageUrl: product.imageUrl || '',
                costPrice: product.costPrice?.toString() || '',
                stock: product.stock?.toString() || '',
                trackStock: product.trackStock || false,
                recipe: product.recipe || [],
                isFavorite: product.isFavorite || false,
                barcode: product.barcode || '',
                addons: product.addons || [],
            });
            const hasImage = !!product.imageUrl;
            const isUrl = hasImage && product.imageUrl!.startsWith('http');
            const isBase64 = hasImage && product.imageUrl!.startsWith('data:image');
            if (isUrl) setImageSource('url');
            else if (isBase64) setImageSource('upload');
            else setImageSource('none');
        } else {
            // Reset form for a new product
            setFormData({ name: '', price: '', category: [], imageUrl: '', costPrice: '', stock: '', trackStock: false, recipe: [], isFavorite: false, barcode: '', addons: [] });
            setImageSource('none');
        }
    }, [product]);
    
     useEffect(() => {
        if (barcodeRef.current && formData.barcode) {
            try {
                JsBarcode(barcodeRef.current, formData.barcode, {
                    format: "CODE128",
                    displayValue: true,
                    background: '#f1f5f9', // slate-100
                    lineColor: '#0f172a', // slate-900
                    width: 2,
                    height: 50,
                    fontSize: 14,
                });
            } catch (e) {
                // Invalid barcode, clear the SVG
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
        if (source === 'none') {
            setFormData(prev => ({ ...prev, imageUrl: '' }));
        }
        if (source === 'upload') {
            fileInputRef.current?.click();
        }
        if (source === 'camera') {
            onOpenCamera();
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRecipeChange = (index: number, field: keyof RecipeItem, value: string) => {
        const updatedRecipe = [...formData.recipe];
        updatedRecipe[index] = { ...updatedRecipe[index], [field]: value };
        setFormData(prev => ({ ...prev, recipe: updatedRecipe }));
    };

    const addRecipeItem = () => {
        if (rawMaterials.length === 0) {
            showAlert({
                type: 'alert',
                title: 'Bahan Baku Kosong',
                message: 'Silakan tambahkan bahan baku terlebih dahulu di halaman Bahan Baku sebelum membuat resep.'
            });
            return;
        }
        setFormData(prev => ({ ...prev, recipe: [...prev.recipe, { rawMaterialId: rawMaterials[0].id, quantity: 0 }] }));
    };

    const removeRecipeItem = (index: number) => {
        setFormData(prev => ({ ...prev, recipe: prev.recipe.filter((_, i) => i !== index) }));
    };

    const handleAddonChange = (index: number, field: keyof Addon, value: string | number) => {
        const updatedAddons = [...formData.addons];
        updatedAddons[index] = { ...updatedAddons[index], [field]: value };
        setFormData(prev => ({ ...prev, addons: updatedAddons }));
    };

    const addAddonItem = () => {
        setFormData(prev => ({ ...prev, addons: [...prev.addons, { id: Date.now().toString(), name: '', price: 0 }] }));
    };

    const removeAddonItem = (index: number) => {
        setFormData(prev => ({ ...prev, addons: prev.addons.filter((_, i) => i !== index) }));
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const productData = {
            ...formData,
            price: parseFloat(formData.price) || 0,
            costPrice: parseFloat(formData.costPrice) || 0,
            stock: parseInt(formData.stock, 10) || 0,
            recipe: formData.recipe.map(r => ({ ...r, quantity: parseFloat(String(r.quantity)) || 0 })),
            addons: formData.addons.filter(a => a.name.trim() !== '').map(a => ({...a, price: Number(a.price) || 0})),
        };
        if (product && 'id' in product) {
            onSave({ ...productData, id: product.id });
        } else {
            onSave(productData);
        }
    };
    
    const generateBarcode = () => {
        const timestamp = Date.now().toString();
        // Ambil 12 digit terakhir untuk barcode yang lebih pendek dan bersih
        const newBarcode = timestamp.substring(timestamp.length - 12);
        setFormData(prev => ({ ...prev, barcode: newBarcode }));
    };

    const showSimpleStock = inventorySettings.enabled && !inventorySettings.trackIngredients;
    const showRecipe = inventorySettings.enabled && inventorySettings.trackIngredients;

    const recipeCost = useMemo(() => {
        if (!showRecipe) return 0;
        return formData.recipe.reduce((sum, item) => {
            const material = rawMaterials.find(rm => rm.id === item.rawMaterialId);
            const cost = material?.costPerUnit || 0;
            return sum + (cost * (parseFloat(String(item.quantity)) || 0));
        }, 0);
    }, [formData.recipe, rawMaterials, showRecipe]);
    
    const sellingPrice = parseFloat(formData.price) || 0;
    const profit = sellingPrice - recipeCost;
    const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

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
            <InputField name="price" label="Harga Jual (IDR)" type="number" required value={formData.price} onChange={handleChange}/>
            
            <CategoryInput value={formData.category} onChange={(newCats) => setFormData(prev => ({ ...prev, category: newCats }))} />
            
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

                {formData.imageUrl && (
                    <div className="mt-3 relative w-40 h-40">
                        <img src={formData.imageUrl} alt="Pratinjau" className="rounded-lg object-cover w-full h-full" />
                        <button type="button" onClick={() => handleImageSourceChange('none')} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-700">
                            <Icon name="close" className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
             <div className="space-y-3 pt-4 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-white">Add-ons / Topping (Opsional)</h3>
                {formData.addons.map((addon, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-900 p-2 rounded-md">
                        <input type="text" value={addon.name} placeholder="Nama Add-on" onChange={(e) => handleAddonChange(index, 'name', e.target.value)} className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white" />
                        <input type="number" value={addon.price} placeholder="Harga" onChange={(e) => handleAddonChange(index, 'price', parseFloat(e.target.value) || 0)} className="w-28 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white" />
                        <Button type="button" variant="danger" size="sm" onClick={() => removeAddonItem(index)}><Icon name="trash" className="w-4 h-4" /></Button>
                    </div>
                ))}
                <Button type="button" variant="secondary" onClick={addAddonItem}>Tambah Add-on</Button>
            </div>

            {inventorySettings.enabled && (
                <div className="space-y-4 pt-4 border-t border-slate-700">
                    <InputField name="costPrice" label="Harga Modal Manual (IDR, Opsional)" type="number" value={formData.costPrice} onChange={handleChange} />
                    <p className="text-xs text-slate-500 -mt-2">Gunakan ini jika Anda tidak ingin menghitung HPP dari resep.</p>
                </div>
            )}

            {showSimpleStock && (
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <InputField name="stock" label="Jumlah Stok (Opsional)" type="number" value={formData.stock} onChange={handleChange} />
                    </div>
                    <div className="pt-7">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" name="trackStock" checked={formData.trackStock} onChange={handleChange} className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-[#347758] focus:ring-[#347758]" />
                            <span className="text-slate-300">Lacak Stok</span>
                        </label>
                    </div>
                </div>
            )}

            {showRecipe && (
                <div className="space-y-3 pt-4 border-t border-slate-700">
                    <h3 className="text-lg font-semibold text-white">Resep / Komposisi Bahan</h3>
                    {formData.recipe.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 bg-slate-900 p-2 rounded-md">
                            <select value={item.rawMaterialId} onChange={(e) => handleRecipeChange(index, 'rawMaterialId', e.target.value)} className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white">
                                {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                            </select>
                            <input type="number" value={item.quantity} placeholder="Jumlah" onChange={(e) => handleRecipeChange(index, 'quantity', e.target.value)} className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white" />
                            <Button type="button" variant="danger" size="sm" onClick={() => removeRecipeItem(index)}><Icon name="trash" className="w-4 h-4" /></Button>
                        </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={addRecipeItem}>Tambah Bahan</Button>
                    {recipeCost > 0 && (
                        <div className="mt-4 space-y-2 text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Harga Pokok Produksi (HPP) dari Resep:</span>
                                <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(recipeCost)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Estimasi Laba:</span>
                                <span className={`font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{CURRENCY_FORMATTER.format(profit)}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-slate-400">Margin Laba:</span>
                                <span className={`font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profitMargin.toFixed(1)}%</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant="primary">Simpan</Button>
            </div>
        </form>
    );
});


const RestockModal: React.FC<{
    product: Product | null,
    onSave: (productId: string, quantity: number, notes?: string) => void,
    onClose: () => void,
}> = ({ product, onSave, onClose }) => {
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    
    useEffect(() => {
        if (!product) {
            setQuantity('');
            setNotes('');
        }
    }, [product]);

    if (!product) return null;

    const currentStock = product.stock || 0;
    const incomingStock = parseFloat(quantity) || 0;
    const newStock = currentStock + incomingStock;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (incomingStock > 0) {
            onSave(product.id, incomingStock, notes);
            onClose();
        }
    };
    
    return (
        <Modal isOpen={!!product} onClose={onClose} title={`Tambah Stok untuk ${product.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-900 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Stok Saat Ini</p>
                        <p className="text-lg font-bold text-slate-200">{currentStock}</p>
                    </div>
                     <div className="bg-slate-900 p-2 rounded-lg">
                        <p className="text-slate-400 text-xs">Stok Baru Akan Menjadi</p>
                        <p className="text-lg font-bold text-[#52a37c]">{newStock}</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Jumlah Stok Masuk</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required placeholder="0" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-xl" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Catatan (Opsional)</label>
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="cth: Dari Supplier Cemerlang" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit" variant="primary">Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};


const ProductsView: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, inventorySettings, addStockAdjustment } = useProduct();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isCameraModalOpen, setCameraModalOpen] = useState(false);
    const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
    const productFormRef = useRef<HTMLFormElement>(null);
    const isCameraAvailable = useCameraAvailability();

    const handleOpenModal = (product: Product | null = null) => {
        setEditingProduct(product);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingProduct(null);
        setModalOpen(false);
    };

    const handleSaveProduct = (productData: Omit<Product, 'id'> | Product) => {
        if ('id' in productData) {
            updateProduct(productData);
        } else {
            addProduct(productData);
        }
        handleCloseModal();
    };
    
    const handleImageCapture = (imageBase64: string) => {
        setEditingProduct(prev => {
            const newProductState = prev ? { ...prev, imageUrl: imageBase64 } : { 
                id: 'new', name: '', price: 0, category: [], imageUrl: imageBase64
            };
            return newProductState as Product;
        });
        setCameraModalOpen(false);
    };

    const StockIndicator: React.FC<{ product: Product }> = ({ product }) => {
        if (!inventorySettings.enabled || !product.trackStock) {
            return <span className="text-slate-500">-</span>;
        }
        const stock = product.stock ?? 0;
        let color = 'text-slate-300';
        if (stock <= 0) color = 'text-red-400 font-bold';
        else if (stock <= 5) color = 'text-yellow-400 font-semibold';

        return <span className={color}>{stock}</span>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Produk</h1>
                <Button variant="primary" onClick={() => handleOpenModal()}>
                    <Icon name="plus" className="w-5 h-5" />
                    <span>Tambah Produk</span>
                </Button>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="p-3">Nama</th>
                            <th className="p-3">Kategori</th>
                            <th className="p-3">Barcode</th>
                            {inventorySettings.enabled && <th className="p-3">Harga Modal</th>}
                            <th className="p-3">Harga Jual</th>
                            {inventorySettings.enabled && !inventorySettings.trackIngredients && <th className="p-3 text-center">Stok</th>}
                            <th className="p-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50">
                                <td className="p-3 font-medium flex items-center gap-3">
                                   {product.imageUrl ? (
                                     <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-md object-cover" />
                                   ) : (
                                     <div className="w-10 h-10 rounded-md overflow-hidden">
                                       <ProductPlaceholder productName={product.name} size="small" className="w-full h-full" />
                                     </div>
                                   )}
                                   <div className="flex items-center gap-2">
                                       <span>{product.name}</span>
                                       {product.isFavorite && <Icon name="star" className="w-4 h-4 text-yellow-400" title="Produk Favorit" />}
                                   </div>
                                </td>
                                <td className="p-3 text-slate-400">
                                    <div className="flex flex-wrap gap-1">
                                        {product.category.map(cat => <span key={cat} className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{cat}</span>)}
                                    </div>
                                </td>
                                <td className="p-3 text-slate-400 font-mono text-sm">{product.barcode || '-'}</td>
                                {inventorySettings.enabled && <td className="p-3">{product.costPrice ? CURRENCY_FORMATTER.format(product.costPrice) : '-'}</td>}
                                <td className="p-3">{CURRENCY_FORMATTER.format(product.price)}</td>
                                {inventorySettings.enabled && !inventorySettings.trackIngredients && <td className="p-3 text-center"><StockIndicator product={product} /></td>}
                                <td className="p-3">
                                    <div className="flex gap-2">
                                        {product.trackStock && !inventorySettings.trackIngredients && (
                                            <button onClick={() => setRestockingProduct(product)} className="text-green-400 hover:text-green-300" title="Tambah Stok">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>
                                            </button>
                                        )}
                                        <button onClick={() => handleOpenModal(product)} className="text-[#52a37c] hover:text-[#7ac0a0]" title="Edit Produk">
                                            <Icon name="edit" className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => deleteProduct(product.id)} className="text-red-500 hover:text-red-400" title="Hapus Produk">
                                            <Icon name="trash" className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}>
                <ProductForm
                    ref={productFormRef}
                    product={editingProduct}
                    onSave={handleSaveProduct}
                    onCancel={handleCloseModal}
                    onOpenCamera={() => setCameraModalOpen(true)}
                    isCameraAvailable={isCameraAvailable}
                />
            </Modal>
            
            <CameraCaptureModal
                isOpen={isCameraModalOpen}
                onClose={() => setCameraModalOpen(false)}
                onCapture={handleImageCapture}
            />

            <RestockModal
                product={restockingProduct}
                onClose={() => setRestockingProduct(null)}
                onSave={addStockAdjustment}
            />

        </div>
    );
};

export default ProductsView;

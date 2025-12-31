
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Product } from '../../types';
import Icon from '../Icon';
import ProductCard from '../ProductCard';
import ProductListItem from '../ProductListItem';
import Button from '../Button';
import { useProduct } from '../../context/ProductContext';
import { useSettings } from '../../context/SettingsContext';

interface ProductBrowserProps {
    onProductClick: (product: Product) => void;
    isSessionLocked: boolean;
    onOpenScanner: () => void;
    onOpenRestock: () => void;
    onOpenOpname: () => void;
}

const ProductBrowser: React.FC<ProductBrowserProps> = ({ 
    onProductClick, 
    isSessionLocked,
    onOpenScanner,
    onOpenRestock,
    onOpenOpname
}) => {
    const { products, categories, isProductAvailable, inventorySettings } = useProduct();
    const { receiptSettings } = useSettings();
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSessionLocked) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSessionLocked]);

    // FILTER LOGIC: Filter products based on Store ID
    const availableProducts = useMemo(() => {
        const currentStoreId = receiptSettings.storeId;
        if (!currentStoreId) return products; // Fallback

        return products.filter(p => {
            // If validStoreIds is empty or undefined, it's global (available everywhere)
            if (!p.validStoreIds || p.validStoreIds.length === 0) return true;
            
            // Otherwise, check if current store ID is in the list
            return p.validStoreIds.includes(currentStoreId);
        });
    }, [products, receiptSettings.storeId]);

    // Derived Logic for Search & Category
    const filteredProducts = useMemo(() => {
        let initialFilter: Product[] = [];

        if (activeCategory === '__FAVORITES__') {
            initialFilter = availableProducts.filter(p => p.isFavorite);
        } else if (activeCategory === '__BEST_SELLING__') {
            initialFilter = availableProducts.filter(p => p.isFavorite); 
        } else if (activeCategory === 'Semua') {
            initialFilter = availableProducts;
        } else {
            initialFilter = availableProducts.filter(p => p.category.includes(activeCategory));
        }

        return initialFilter.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.barcode && p.barcode.includes(searchTerm))
        );
    }, [availableProducts, activeCategory, searchTerm]);

    return (
        <div className="flex flex-col h-full">
            {/* Search & Actions Header */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                        <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Cari produk... (Ctrl+/)"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        disabled={isSessionLocked}
                        className={`w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-[#347758] focus:border-[#347758] ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <div className="flex items-center gap-2">
                    {/* Inventory Actions */}
                    {inventorySettings.enabled && (
                        <div className="flex gap-1">
                            <Button 
                                variant="secondary" 
                                onClick={onOpenRestock}
                                disabled={isSessionLocked}
                                title="Terima Barang / Lapor Waste"
                                className="bg-slate-800 border border-slate-700 px-3"
                            >
                                <Icon name="tag" className="w-5 h-5" /> 
                            </Button>
                            <Button 
                                variant="secondary" 
                                onClick={onOpenOpname}
                                disabled={isSessionLocked}
                                title="Stock Opname (Audit Stok)"
                                className="bg-slate-800 border border-slate-700 px-3"
                            >
                                <Icon name="boxes" className="w-5 h-5" />
                            </Button>
                        </div>
                    )}
                    
                    <Button 
                        variant="secondary" 
                        onClick={onOpenScanner}
                        disabled={isSessionLocked}
                        title="Pindai Barcode Produk"
                        className="bg-slate-800 border border-slate-700"
                    >
                        <Icon name="barcode" className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Category Filter & View Toggle */}
            <div className="flex items-center justify-between gap-4 pb-3 mb-2">
                    <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
                    <button onClick={() => setActiveCategory('Semua')} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full transition-colors ${activeCategory === 'Semua' ? 'bg-[#347758] text-white' : 'bg-slate-700 text-slate-300'}`}>Semua</button>
                    <button onClick={() => setActiveCategory('__FAVORITES__')} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full flex items-center gap-1 transition-colors ${activeCategory === '__FAVORITES__' ? 'bg-[#347758] text-white' : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40'}`}>
                        ⭐ Favorit
                    </button>
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full transition-colors ${activeCategory === cat ? 'bg-[#347758] text-white' : 'bg-slate-700 text-slate-300'}`}>{cat}</button>
                    ))}
                </div>
                <div className="flex items-center bg-slate-700 rounded-lg p-1 shrink-0">
                    <button onClick={() => setViewMode('grid')} className={`p-1 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}><Icon name="products" className="w-4 h-4"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}><Icon name="menu" className="w-4 h-4"/></button>
                </div>
            </div>

            {/* Product Grid/List */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                {isSessionLocked ? (
                     <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
                        <Icon name="lock" className="w-12 h-12 mb-2" />
                        <p>Sesi belum dimulai.</p>
                     </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
                        <p>Produk tidak ditemukan.</p>
                        {receiptSettings.storeId && <p className="text-xs mt-1">(Filter Cabang: {receiptSettings.storeId})</p>}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} onClick={() => onProductClick(product)} availability={isProductAvailable(product)} />
                        ))}
                    </div>
                ) : (
                        <div className="space-y-2">
                        {filteredProducts.map(product => (
                            <ProductListItem key={product.id} product={product} onClick={() => onProductClick(product)} availability={isProductAvailable(product)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductBrowser;

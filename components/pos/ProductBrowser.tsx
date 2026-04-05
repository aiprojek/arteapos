
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
    onOpenChannelSales: () => void;
}

const ProductBrowser: React.FC<ProductBrowserProps> = ({ 
    onProductClick, 
    isSessionLocked,
    onOpenScanner,
    onOpenRestock,
    onOpenOpname,
    onOpenChannelSales
}) => {
    const { products, categories, isProductAvailable, inventorySettings } = useProduct();
    const { receiptSettings } = useSettings();
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isCompactViewport, setIsCompactViewport] = useState(false);
    const [isUltraCompactViewport, setIsUltraCompactViewport] = useState(false);
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

    useEffect(() => {
        const updateViewportMode = () => {
            setIsCompactViewport(window.innerHeight <= 820 || window.innerWidth < 768);
            setIsUltraCompactViewport(window.innerHeight <= 720 || window.innerWidth < 480);
        };

        updateViewportMode();
        window.addEventListener('resize', updateViewportMode);

        return () => window.removeEventListener('resize', updateViewportMode);
    }, []);

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
            <div className={`${isUltraCompactViewport ? 'mb-2 space-y-1.5' : 'mb-3 space-y-2'}`}>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                        <div className={`absolute inset-0 rounded-2xl border border-slate-700 bg-slate-800/95 shadow-sm ${isSessionLocked ? 'opacity-60' : ''}`} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Cari produk..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            disabled={isSessionLocked}
                            className={`relative w-full rounded-2xl bg-transparent text-white transition-colors focus:border-[#347758] focus:outline-none focus:ring-2 focus:ring-[#347758] focus:ring-offset-2 focus:ring-offset-slate-900 ${isUltraCompactViewport ? 'h-9 pl-9 pr-9 text-[13px]' : isCompactViewport ? 'h-10 pl-10 pr-10 text-sm' : 'h-11 pl-11 pr-11 text-sm'} ${isSessionLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                        />
                        <Icon name="search" className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUltraCompactViewport ? 'left-3 w-3.5 h-3.5' : isCompactViewport ? 'left-3.5 w-4 h-4' : 'left-4 w-4.5 h-4.5'}`} />
                        {searchTerm && !isSessionLocked && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className={`absolute top-1/2 -translate-y-1/2 rounded-full text-slate-400 transition-colors hover:bg-slate-700 hover:text-white ${isUltraCompactViewport ? 'right-2 flex h-5 w-5 items-center justify-center' : 'right-2.5 flex h-6 w-6 items-center justify-center'}`}
                                title="Bersihkan pencarian"
                            >
                                <Icon name="close" className={isUltraCompactViewport ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                            </button>
                        )}
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                        {inventorySettings.enabled && (
                            <>
                                <Button
                                    variant="operational"
                                    onClick={onOpenRestock}
                                    disabled={isSessionLocked}
                                    title="Terima Barang / Lapor Waste"
                                    className={`${isUltraCompactViewport ? 'px-2 h-[34px]' : isCompactViewport ? 'px-2.5 h-[40px]' : 'px-3 h-[42px]'}`}
                                >
                                    <Icon name="tag" className="w-5 h-5" />
                                    {!isCompactViewport && <span className="text-xs">Terima</span>}
                                </Button>
                                <Button
                                    variant="operational"
                                    onClick={onOpenOpname}
                                    disabled={isSessionLocked}
                                    title="Stock Opname (Audit Stok)"
                                    className={`${isUltraCompactViewport ? 'px-2 h-[34px]' : isCompactViewport ? 'px-2.5 h-[40px]' : 'px-3 h-[42px]'}`}
                                >
                                    <Icon name="boxes" className="w-5 h-5" />
                                    {!isCompactViewport && <span className="text-xs">Opname</span>}
                                </Button>
                            </>
                        )}
                        <Button
                            variant="operational"
                            onClick={onOpenScanner}
                            disabled={isSessionLocked}
                            title="Pindai Barcode Produk"
                            className={`${isUltraCompactViewport ? 'px-2 h-[34px]' : isCompactViewport ? 'px-2.5 h-[40px]' : 'px-3 h-[42px]'}`}
                        >
                            <Icon name="barcode" className="w-5 h-5" />
                            {!isCompactViewport && <span className="text-xs">Scan</span>}
                        </Button>
                        <Button
                            variant="operational"
                            onClick={onOpenChannelSales}
                            disabled={isSessionLocked}
                            title="Catat Penjualan Channel Online"
                            className={`${isUltraCompactViewport ? 'px-2 h-[34px]' : isCompactViewport ? 'px-2.5 h-[40px]' : 'px-3 h-[42px]'}`}
                        >
                            <Icon name="cloud" className="w-5 h-5" />
                            {!isCompactViewport && <span className="text-xs">Channel</span>}
                        </Button>
                    </div>
                </div>

                <div className={`grid sm:hidden ${inventorySettings.enabled ? 'grid-cols-4' : 'grid-cols-2'} ${isUltraCompactViewport ? 'gap-1.5' : 'gap-2'}`}>
                    {inventorySettings.enabled && (
                        <>
                            <button
                                type="button"
                                onClick={onOpenRestock}
                                disabled={isSessionLocked}
                                title="Terima Barang / Lapor Waste"
                                className={`flex flex-col items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800/80 text-slate-100 hover:bg-slate-700 disabled:opacity-50 ${isUltraCompactViewport ? 'gap-0.5 px-1.5 py-1.5 text-[10px]' : 'gap-1 px-2 py-2 text-[11px]'}`}
                            >
                                <Icon name="tag" className={`${isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                <span className="leading-none">Terima</span>
                            </button>
                            <button
                                type="button"
                                onClick={onOpenOpname}
                                disabled={isSessionLocked}
                                title="Stock Opname (Audit Stok)"
                                className={`flex flex-col items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800/80 text-slate-100 hover:bg-slate-700 disabled:opacity-50 ${isUltraCompactViewport ? 'gap-0.5 px-1.5 py-1.5 text-[10px]' : 'gap-1 px-2 py-2 text-[11px]'}`}
                            >
                                <Icon name="boxes" className={`${isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                <span className="leading-none">Opname</span>
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={onOpenScanner}
                        disabled={isSessionLocked}
                        title="Pindai Barcode Produk"
                        className={`flex flex-col items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800/80 text-slate-100 hover:bg-slate-700 disabled:opacity-50 ${isUltraCompactViewport ? 'gap-0.5 px-1.5 py-1.5 text-[10px]' : 'gap-1 px-2 py-2 text-[11px]'}`}
                    >
                        <Icon name="barcode" className={`${isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                        <span className="leading-none">Scan</span>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenChannelSales}
                        disabled={isSessionLocked}
                        title="Catat Penjualan Channel Online"
                        className={`flex flex-col items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800/80 text-slate-100 hover:bg-slate-700 disabled:opacity-50 ${isUltraCompactViewport ? 'gap-0.5 px-1.5 py-1.5 text-[10px]' : 'gap-1 px-2 py-2 text-[11px]'}`}
                    >
                        <Icon name="cloud" className={`${isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                        <span className="leading-none">Channel</span>
                    </button>
                </div>
            </div>

            {/* Category Filter & View Toggle */}
            <div className={`flex items-center justify-between gap-3 ${isUltraCompactViewport ? 'pb-2 mb-1.5' : 'pb-3 mb-2'}`}>
                <div className={`flex items-center overflow-x-auto -mx-4 px-4 scrollbar-hide min-w-0 flex-1 ${isUltraCompactViewport ? 'gap-1.5' : 'gap-2'}`}>
                    <button onClick={() => setActiveCategory('Semua')} className={`flex-shrink-0 rounded-full transition-colors ${isUltraCompactViewport ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs sm:text-sm'} ${activeCategory === 'Semua' ? 'bg-[#347758] text-white' : 'bg-slate-700 text-slate-300'}`}>Semua</button>
                    <button onClick={() => setActiveCategory('__FAVORITES__')} className={`flex-shrink-0 rounded-full flex items-center gap-1 transition-colors ${isUltraCompactViewport ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs sm:text-sm'} ${activeCategory === '__FAVORITES__' ? 'bg-[#347758] text-white' : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40'}`}>
                        ⭐ Favorit
                    </button>
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-shrink-0 rounded-full transition-colors ${isUltraCompactViewport ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs sm:text-sm'} ${activeCategory === cat ? 'bg-[#347758] text-white' : 'bg-slate-700 text-slate-300'}`}>{cat}</button>
                    ))}
                </div>
                <div className={`flex items-center bg-slate-700 rounded-lg shrink-0 ${isUltraCompactViewport ? 'p-0.5' : 'p-1'}`}>
                    <button onClick={() => setViewMode('grid')} className={`${isUltraCompactViewport ? 'p-1' : 'p-1.5'} rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}><Icon name="products" className={`${isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}/></button>
                    <button onClick={() => setViewMode('list')} className={`${isUltraCompactViewport ? 'p-1' : 'p-1.5'} rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}><Icon name="menu" className={`${isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}/></button>
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
                    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${isUltraCompactViewport ? 'gap-2' : 'gap-3'}`}>
                        {filteredProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onClick={() => onProductClick(product)}
                            availability={isProductAvailable(product)}
                            compact={isCompactViewport}
                            ultraCompact={isUltraCompactViewport}
                        />
                        ))}
                    </div>
                ) : (
                        <div className={isUltraCompactViewport ? 'space-y-1.5' : 'space-y-2'}>
                        {filteredProducts.map(product => (
                            <ProductListItem
                                key={product.id}
                                product={product}
                                onClick={() => onProductClick(product)}
                                availability={isProductAvailable(product)}
                                compact={isCompactViewport}
                                ultraCompact={isUltraCompactViewport}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductBrowser;

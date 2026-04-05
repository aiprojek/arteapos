
import React, { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useCustomer } from '../../context/CustomerContext';
import { useSession } from '../../context/SessionContext'; // IMPORTED
import { useCustomerDisplayStatus } from '../../context/CustomerDisplayContext'; 
import { CURRENCY_FORMATTER } from '../../constants';
import Icon from '../Icon';
import Button from '../Button';
import ActiveOrderList from './ActiveOrderList';
import Modal from '../Modal';
import { MemberSearchModal, DualScreenModal } from './POSModals'; 
import type { Customer, OrderType } from '../../types';

// Sub-components
const HeldCartsTabs: React.FC<{
    onSwitch: (cartId: string | null) => void;
    enableCartHolding: boolean;
    compact?: boolean;
    ultraCompact?: boolean;
}> = ({ onSwitch, enableCartHolding, compact = false, ultraCompact = false }) => {
    const { heldCarts, activeHeldCartId } = useCart();
    return (
        <div className={`${ultraCompact ? 'mb-2 -mx-3 px-1.5' : 'mb-4 -mx-4 px-2'}`}>
            <div className={`flex items-center overflow-x-auto scrollbar-hide ${ultraCompact ? 'gap-1.5 pb-1.5 px-1.5' : compact ? 'gap-1.5 pb-2 px-2' : 'gap-2 pb-2 px-2'}`}>
                 {enableCartHolding && (
                     <button 
                        onClick={() => onSwitch(null)} 
                        className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg transition-colors border
                            ${ultraCompact ? 'px-2 py-1 text-[11px]' : compact ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-1.5 text-sm'}
                            ${activeHeldCartId === null 
                                ? 'bg-[#347758] text-white font-semibold border-[#347758]' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`
                        }
                    >
                        <Icon name="plus" className={ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                        Baru
                    </button>
                 )}
                {heldCarts.map(cart => (
                    <button 
                        key={cart.id} 
                        onClick={() => onSwitch(cart.id)}
                        className={`flex-shrink-0 rounded-lg transition-colors border truncate max-w-[160px]
                             ${ultraCompact ? 'px-2 py-1 text-[11px]' : compact ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-1.5 text-sm'}
                             ${activeHeldCartId === cart.id 
                                ? 'bg-[#347758] text-white font-semibold border-[#347758]' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`
                        }
                        title={cart.name}
                    >
                        {cart.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

const CustomerSelection: React.FC<{
    selectedCustomer: Customer | null;
    onSelectCustomer: (customer: Customer | null) => void;
    onOpenAddModal: () => void;
    onOpenSearchModal: () => void;
    onOpenScanner: () => void; 
    onSelectOrderType: (type: OrderType) => void;
    onTopUpClick: () => void;
    orderType: OrderType;
    compact?: boolean;
    ultraCompact?: boolean;
}> = ({
    selectedCustomer,
    onSelectCustomer,
    onOpenAddModal,
    onOpenSearchModal,
    onOpenScanner,
    onSelectOrderType,
    onTopUpClick,
    orderType,
    compact = false,
    ultraCompact = false,
}) => {
    const { membershipSettings } = useCustomer();
    const { receiptSettings } = useSettings();
    const { sessionSettings } = useSession(); // Access Session Settings for Toggle
    const { tableNumber, setTableNumber, paxCount, setPaxCount } = useCart(); 
    
    const availableOrderTypes = receiptSettings.orderTypes && receiptSettings.orderTypes.length > 0
        ? receiptSettings.orderTypes
        : ['Makan di Tempat', 'Bawa Pulang', 'Pesan Antar'];
    
    const isDineIn = orderType.toLowerCase().includes('makan') || orderType.toLowerCase().includes('dine') || orderType.toLowerCase().includes('meja');

    return (
        <div className={`${ultraCompact ? 'space-y-1.5' : 'space-y-2'}`}>
            <div className={`rounded-xl border border-slate-700 bg-slate-900/40 ${ultraCompact ? 'p-1.5' : 'p-2'}`}>
                <p className={`font-semibold uppercase tracking-wide text-slate-500 ${ultraCompact ? 'text-[10px] mb-1.5' : 'text-[11px] mb-2'}`}>Jenis Pesanan</p>
                <div className={`flex-1 min-w-0 bg-slate-700/80 rounded-lg border border-slate-600/50 flex items-center overflow-x-auto scrollbar-hide ${ultraCompact ? 'p-0.5' : 'p-1'}`}>
                    {availableOrderTypes.map(type => (
                        <button 
                            key={type}
                            onClick={() => onSelectOrderType(type)} 
                            className={`flex-1 min-w-max leading-tight rounded-md transition-colors truncate ${ultraCompact ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-[11px]'} ${orderType === type ? 'bg-[#347758] text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                            title={type}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`flex flex-col ${ultraCompact ? 'gap-1.5' : 'gap-2'}`}>
                {sessionSettings.enableTableManagement && isDineIn && (
                    <div className={`grid grid-cols-2 max-w-full bg-slate-700/80 rounded-xl border border-slate-600/50 animate-fade-in ${ultraCompact ? 'gap-1.5 p-1.5' : 'gap-2 p-2'} w-full`}>
                        <div className={`flex min-w-0 bg-slate-800 rounded-lg items-center ${ultraCompact ? 'px-1.5' : 'px-2'}`}>
                            <span className={`text-slate-500 font-bold ${ultraCompact ? 'text-[9px] mr-1.5' : 'text-[10px] mr-2'}`}>MEJA</span>
                            <input 
                                type="text" 
                                value={tableNumber} 
                                onChange={(e) => setTableNumber(e.target.value)} 
                                placeholder="-"
                                className={`w-full min-w-0 bg-transparent text-white font-bold outline-none text-center ${ultraCompact ? 'text-[13px]' : 'text-sm'}`}
                            />
                        </div>
                        <div className={`flex min-w-0 bg-slate-800 rounded-lg items-center ${ultraCompact ? 'px-1.5' : 'px-2'}`}>
                            <span className={`text-slate-500 font-bold ${ultraCompact ? 'text-[9px] mr-1.5' : 'text-[10px] mr-2'}`}>PAX</span>
                            <input 
                                type="number" 
                                min="1"
                                value={paxCount || ''} 
                                onChange={(e) => setPaxCount(parseInt(e.target.value) || 0)} 
                                placeholder="-"
                                className={`w-full min-w-0 bg-transparent text-white font-bold outline-none text-center ${ultraCompact ? 'text-[13px]' : 'text-sm'}`}
                            />
                        </div>
                    </div>
                )}

                {membershipSettings.enabled && (
                    <div className={`min-w-0 flex-1 flex items-center justify-between rounded-xl border ${ultraCompact ? 'p-1.5 min-h-[46px]' : compact ? 'p-2 min-h-[50px]' : 'p-2 min-h-[54px]'} ${selectedCustomer ? 'bg-[#347758]/20 border-[#347758]/30' : 'bg-slate-700/80 border-slate-600/50'}`}>
                        <div className="flex items-center gap-2 overflow-hidden pl-1 flex-1 cursor-pointer" onClick={() => !selectedCustomer && onOpenSearchModal()}>
                            <Icon name="users" className={`${ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} flex-shrink-0 ${selectedCustomer ? 'text-[#52a37c]' : 'text-slate-400'}`} />
                            <div className="min-w-0">
                                <p className={`font-bold leading-tight truncate ${ultraCompact ? 'text-[11px]' : 'text-xs'} ${selectedCustomer ? 'text-white' : 'text-slate-400'}`}>
                                    {selectedCustomer ? selectedCustomer.name : 'Pilih Member'}
                                </p>
                                <p className={`${ultraCompact ? 'text-[9px]' : 'text-[10px]'} text-slate-500 truncate`}>
                                    {selectedCustomer ? 'Kelola saldo atau lepas member' : 'Cari member atau scan barcode'}
                                </p>
                            </div>
                        </div>
                        
                        {selectedCustomer ? (
                            <div className="flex items-center gap-1 pl-1">
                                <button onClick={onTopUpClick} className={`text-[#52a37c] hover:bg-[#347758]/20 rounded-lg transition-colors ${ultraCompact ? 'p-1' : 'p-1.5'}`} title="Saldo">
                                    <Icon name="cash" className={ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                                </button>
                                <button onClick={() => onSelectCustomer(null)} className={`text-slate-400 hover:text-red-400 rounded-lg ${ultraCompact ? 'p-1' : 'p-1.5'}`}>
                                    <Icon name="close" className={ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 pl-1">
                                <button onClick={onOpenAddModal} className={`text-slate-400 hover:text-white rounded-lg ${ultraCompact ? 'p-1' : 'p-1.5'}`} title="Tambah Member">
                                    <Icon name="plus" className={ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                                </button>
                                <button onClick={onOpenScanner} className={`text-slate-400 hover:text-white rounded-lg ${ultraCompact ? 'p-1' : 'p-1.5'}`} title="Scan Barcode">
                                    <Icon name="barcode" className={ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

interface CartSidebarProps {
    isSessionLocked: boolean;
    onOpenDiscountModal: (cartItemId: string) => void;
    onOpenCartDiscountModal: () => void;
    onOpenRewardModal: () => void;
    onOpenPaymentModal: () => void;
    onOpenNameModal: (cartToRename: any) => void;
    onQuickPay: (amount: number) => void;
    selectedCustomer: Customer | null;
    setSelectedCustomer: (c: Customer | null) => void;
    onOpenCustomerForm: () => void;
    onSplitBill?: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ 
    isSessionLocked, 
    onOpenDiscountModal,
    onOpenCartDiscountModal,
    onOpenRewardModal,
    onOpenPaymentModal,
    onOpenNameModal,
    onQuickPay,
    selectedCustomer,
    setSelectedCustomer,
    onOpenCustomerForm,
    onSplitBill
}) => {
    const { 
        cart, cartDiscount, getCartTotals, clearCart, 
        heldCarts, activeHeldCartId, switchActiveCart, deleteHeldCart,
        orderType, setOrderType // tableNumber & paxCount handled inside CustomerSelection
    } = useCart();
    
    const { sessionSettings } = useSession();
    const { membershipSettings, addBalance } = useCustomer();
    const { receiptSettings } = useSettings();
    const { isDisplayConnected } = useCustomerDisplayStatus(); 

    const { subtotal, itemDiscountAmount, cartDiscountAmount, taxAmount, serviceChargeAmount, finalTotal } = getCartTotals();
    
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);
    const [isDualScreenModalOpen, setDualScreenModalOpen] = useState(false);
    const [isSavedCartsModalOpen, setIsSavedCartsModalOpen] = useState(false);
    const [savedCartSearchTerm, setSavedCartSearchTerm] = useState('');
    const [isCartMetaCollapsed, setCartMetaCollapsed] = useState(false);
    const [isTotalsExpanded, setTotalsExpanded] = useState(false);
    const [isCompactViewport, setIsCompactViewport] = useState(false);
    const [isUltraCompactViewport, setIsUltraCompactViewport] = useState(false);

    const filteredHeldCarts = heldCarts.filter(c => 
        c.name.toLowerCase().includes(savedCartSearchTerm.toLowerCase())
    );

    useEffect(() => {
        const updateViewportMode = () => {
            setIsCompactViewport(window.innerHeight <= 820 || window.innerWidth < 640);
            setIsUltraCompactViewport(window.innerHeight <= 720 || window.innerWidth < 480);
        };

        updateViewportMode();
        window.addEventListener('resize', updateViewportMode);

        return () => window.removeEventListener('resize', updateViewportMode);
    }, []);

    useEffect(() => {
        if (cart.length === 0) {
            setCartMetaCollapsed(false);
            setTotalsExpanded(false);
            return;
        }

        setCartMetaCollapsed(isCompactViewport);
        setTotalsExpanded(!(isCompactViewport || isUltraCompactViewport));
    }, [cart.length, isCompactViewport, isUltraCompactViewport]);

    const handleSwitchCart = (cartId: string | null) => {
        switchActiveCart(cartId);
        setSelectedCustomer(null);
    };

    const handleClearCart = () => {
        clearCart();
        setSelectedCustomer(null);
    }

    const handleConfirmTopUp = () => {
        if (!selectedCustomer || !topUpAmount) return;
        const amount = parseFloat(topUpAmount);
        if (amount > 0) {
            addBalance(selectedCustomer.id, amount, "Top Up via Kasir", true);
            setIsTopUpOpen(false);
            setTopUpAmount('');
        }
    };

    const triggerScanner = () => {
        window.dispatchEvent(new CustomEvent('open-pos-scanner'));
    };

    const CartActions = () => {
        if (!sessionSettings.enableCartHolding && activeHeldCartId === null) return null;

        if (activeHeldCartId === null) {
            return (
                 <Button onClick={() => onOpenNameModal(null)} disabled={cart.length === 0} variant="utility" className="flex-1 px-1 h-full flex flex-row items-center justify-center gap-1.5 text-[11px] font-bold" title="Simpan Pesanan">
                    <Icon name="save" className="w-4 h-4"/>
                    <span className="hidden sm:inline">Simpan</span>
                </Button>
            );
        }
        
        const currentCart = heldCarts.find(c => c.id === activeHeldCartId);
        if (!currentCart) return null;

        return (
            <>
                <Button variant="utility" className="flex-1 px-1 h-full flex flex-row items-center justify-center gap-1.5 text-[11px] font-bold" onClick={() => onOpenNameModal(currentCart)} title="Ganti Nama">
                    <Icon name="edit" className="w-3.5 h-3.5"/>
                    <span className="hidden sm:inline">Ganti</span>
                </Button>
                <Button variant="danger" className="flex-1 px-1 h-full flex flex-row items-center justify-center gap-1.5 text-[11px] font-bold" onClick={() => deleteHeldCart(currentCart.id)} title="Hapus Pesanan">
                    <Icon name="trash" className="w-3.5 h-3.5"/>
                    <span className="hidden sm:inline">Hapus Simpanan</span>
                </Button>
            </>
        );
    };

    return (
        <div className={`w-full md:w-96 lg:w-[420px] bg-slate-800 md:rounded-xl shadow-none md:shadow-2xl flex flex-col flex-shrink-0 h-full border-l-0 md:border-l border-slate-700 transition-all relative ${isUltraCompactViewport ? 'p-3' : 'p-4'}`}>
            {isSessionLocked && (
                <div className="absolute inset-0 bg-slate-900/80 z-20 flex items-center justify-center rounded-xl backdrop-blur-sm">
                    <div className="text-center p-4">
                        <Icon name="lock" className="w-12 h-12 text-slate-500 mx-auto mb-2"/>
                        <p className="text-slate-300 font-bold">Sesi Terkunci</p>
                    </div>
                </div>
            )}
            
            {/* Cart Header */}
            <div className={`flex items-center gap-2 ${isUltraCompactViewport ? 'mb-1.5' : 'mb-2'}`}>
                <div>
                    <h2 className={`${isUltraCompactViewport ? 'text-base' : 'text-lg'} font-bold text-white leading-none`}>Keranjang</h2>
                    <p className={`text-[11px] text-slate-500 mt-1 ${isCompactViewport ? 'hidden' : 'hidden md:block'}`}>Ringkasan pesanan dan pembayaran</p>
                </div>

                {/* New Cart Button */}
                {(sessionSettings.enableCartHolding) && (
                    <button 
                        onClick={() => handleSwitchCart(null)} 
                        className={`flex-shrink-0 flex items-center gap-1.5 ${isUltraCompactViewport ? 'px-2 py-1 text-[13px]' : 'px-2.5 py-1.5 text-sm'} rounded-lg transition-colors border
                            ${activeHeldCartId === null 
                                ? 'bg-[#347758] text-white font-semibold border-[#347758]' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`
                        }
                    >
                        <Icon name="plus" className="w-4 h-4" />
                        <span className="hidden sm:inline">Baru</span>
                    </button>
                )}

                {/* Saved Carts Modal Trigger */}
                {heldCarts.length > 0 && (
                    <button 
                        onClick={() => setIsSavedCartsModalOpen(true)}
                        className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg transition-colors border bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 ${isUltraCompactViewport ? 'px-2 py-1 text-[13px]' : 'px-2.5 py-1.5 text-sm'}`}
                    >
                        <Icon name="cart" className="w-4 h-4" />
                        <span className="hidden sm:inline">Tersimpan</span>
                        <span className="text-xs bg-slate-700 text-white rounded-full px-1.5 py-0.5">{heldCarts.length}</span>
                    </button>
                )}
                
                {/* Spacer */}
                <div className="flex-grow"></div>

                {/* Second Screen Button (far right) */}
                <button 
                    onClick={() => setDualScreenModalOpen(true)}
                    className={`flex-shrink-0 rounded-lg transition-colors ${isUltraCompactViewport ? 'p-1' : 'p-1.5'} ${isDisplayConnected ? 'bg-[#347758] text-white animate-pulse' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    title="Layar Kedua"
                >
                    <Icon name="cast" className={isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                </button>
            </div>

            {/* --- 1. TOP BOX: PINNED CONFIG BAR --- */}
            {cart.length > 0 && (
                <div className={`space-y-2 flex-shrink-0 ${isUltraCompactViewport ? 'mb-1.5' : 'mb-2'}`}>
                    {isCompactViewport && (
                        <button
                            type="button"
                            onClick={() => setCartMetaCollapsed(prev => !prev)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/50 text-left"
                        >
                            <div>
                                <p className="text-xs font-semibold text-white">Info Pesanan</p>
                                <p className="text-[11px] text-slate-500">
                                    {selectedCustomer ? selectedCustomer.name : 'Pelanggan umum'} • {cart.length} item
                                </p>
                            </div>
                            <Icon name={isCartMetaCollapsed ? 'chevron-down' : 'chevron-up'} className="w-4 h-4 text-slate-400" />
                        </button>
                    )}

                    <div className={`${isCartMetaCollapsed ? 'hidden' : 'block'} ${isUltraCompactViewport ? 'space-y-1.5' : 'space-y-2'}`}>
                        <CustomerSelection 
                            selectedCustomer={selectedCustomer} 
                            onSelectCustomer={setSelectedCustomer}
                            onOpenAddModal={onOpenCustomerForm}
                            onOpenSearchModal={() => setIsMemberSearchOpen(true)}
                            onOpenScanner={triggerScanner}
                            onSelectOrderType={setOrderType}
                            onTopUpClick={() => setIsTopUpOpen(true)}
                            orderType={orderType}
                            compact={isCompactViewport}
                            ultraCompact={isUltraCompactViewport}
                        />
                        
                        <div className={`grid ${isUltraCompactViewport ? 'gap-1.5' : 'gap-2'} ${onSplitBill ? 'grid-cols-3' : membershipSettings.enabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {membershipSettings.enabled && (
                                <button onClick={onOpenRewardModal} disabled={!selectedCustomer} className={`flex gap-2 items-center justify-center rounded-xl border transition-colors ${isUltraCompactViewport ? 'text-[11px] py-2' : 'text-xs py-2.5'} ${selectedCustomer ? 'border-amber-700/50 hover:bg-amber-700/20 text-amber-500' : 'border-slate-700 text-slate-600 cursor-not-allowed'}`}>
                                    <Icon name="award" className={isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> Loyalti
                                </button>
                            )}
                            <button onClick={onOpenCartDiscountModal} className={`flex gap-2 items-center justify-center rounded-xl border border-blue-700/50 hover:bg-blue-700/20 text-blue-400 transition-colors ${isUltraCompactViewport ? 'text-[11px] py-2' : 'text-xs py-2.5'}`}>
                                <Icon name={isUltraCompactViewport ? 'tag' : 'tag'} className={isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> Diskon
                            </button>
                            {onSplitBill && (
                                <button onClick={onSplitBill} className={`flex gap-2 items-center justify-center rounded-xl border border-purple-700/50 hover:bg-purple-700/20 text-purple-400 transition-colors ${isUltraCompactViewport ? 'text-[11px] py-2' : 'text-xs py-2.5'}`}>
                                    <Icon name="share" className={isUltraCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> Split
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                    <Icon name="cash" className="w-16 h-16 mb-4 opacity-50"/>
                    <p>Keranjang masih kosong</p>
                    <p className="text-sm">Ketuk produk untuk menambahkannya</p>
                </div>
            ) : (
                <>
                    {/* --- 2. MIDDLE BOX: SCROLLING ORDER ITEMS --- */}
                    <div className={`flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent border-t border-slate-700/50 min-h-[50px] ${isUltraCompactViewport ? 'pt-1' : 'pt-1.5'}`}>
                        <ActiveOrderList cart={cart} onOpenDiscountModal={onOpenDiscountModal} />
                    </div>
                    
                    {/* --- 3. BOTTOM BOX: COMPACT TOTALS & PAY --- */}
                    <div className={`mt-auto bg-slate-800 flex-shrink-0 relative z-10 border-t border-slate-700 ${isUltraCompactViewport ? 'pt-1' : 'pt-1.5'}`}>
                        <div className={`bg-slate-900/30 rounded-xl border border-slate-700/30 ${isUltraCompactViewport ? 'p-1.5 mb-1.5' : 'p-2 mb-2'}`}>
                            <button
                                type="button"
                                onClick={() => setTotalsExpanded(prev => !prev)}
                                className="w-full flex items-center justify-between gap-3"
                            >
                                <div className="text-left">
                                    <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total Bayar</p>
                                    <p className={`font-black text-[#52a37c] ${isUltraCompactViewport ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>{CURRENCY_FORMATTER.format(finalTotal)}</p>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <span className="hidden sm:inline text-xs">Rincian</span>
                                    <Icon name={isTotalsExpanded ? 'chevron-up' : 'chevron-down'} className="w-4 h-4" />
                                </div>
                            </button>

                            <div className={`${isTotalsExpanded ? 'block' : 'hidden'} space-y-0.5 text-xs ${isUltraCompactViewport ? 'mt-1.5 pt-1.5' : 'mt-2 pt-2'} border-t border-slate-700/50`}>
                                <div className="flex justify-between text-slate-400">
                                    <span>Subtotal</span>
                                    <span>{CURRENCY_FORMATTER.format(subtotal)}</span>
                                </div>
                                {(itemDiscountAmount > 0 || cartDiscountAmount > 0) && (
                                    <div className="flex justify-between text-green-400">
                                        <span className="flex items-center gap-1">
                                            Diskon
                                            {cartDiscount?.name && <span className="text-[9px] text-green-500/70 truncate max-w-[80px]">({cartDiscount.name})</span>}
                                        </span>
                                        <span>- {CURRENCY_FORMATTER.format(itemDiscountAmount + cartDiscountAmount)}</span>
                                    </div>
                                )}
                                {serviceChargeAmount > 0 && (
                                    <div className="flex justify-between text-slate-400">
                                        <span>Service ({receiptSettings.serviceChargeRate}%)</span>
                                        <span>{CURRENCY_FORMATTER.format(serviceChargeAmount)}</span>
                                    </div>
                                )}
                                {taxAmount > 0 && (
                                    <div className="flex justify-between text-slate-400">
                                        <span>Pajak</span>
                                        <span>{CURRENCY_FORMATTER.format(taxAmount)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`flex gap-2 ${isUltraCompactViewport ? 'h-10' : 'h-11 sm:h-12'}`}>
                             <Button variant="danger" className={`${isUltraCompactViewport ? 'w-10' : 'w-11 sm:w-12'} h-full flex-shrink-0 p-0 flex items-center justify-center`} onClick={handleClearCart}>
                                <Icon name="trash" className="w-5 h-5 text-white"/>
                            </Button>
                            
                            <CartActions />

                            <Button variant="primary" className={`flex-[2] font-black h-full shadow-lg shadow-[#347758]/20 ${isUltraCompactViewport ? 'text-[13px]' : 'text-sm sm:text-base'}`} onClick={onOpenPaymentModal} title="Shortcut: F2">
                                BAYAR
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {/* Quick Top Up Modal */}
            <Modal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} title="Top Up Cepat">
                <div className="space-y-4">
                    {selectedCustomer && (
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                            <p className="text-sm text-slate-400">Member:</p>
                            <p className="font-bold text-white text-lg">{selectedCustomer.name}</p>
                            <p className="text-xs text-slate-500">Saldo Saat Ini: {CURRENCY_FORMATTER.format(selectedCustomer.balance || 0)}</p>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nominal Top Up (Rp)</label>
                        <input 
                            type="number" 
                            min="0"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg font-bold"
                            placeholder="0"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-2">
                        {[10000, 20000, 50000, 100000].map(amt => (
                            <button 
                                key={amt}
                                onClick={() => setTopUpAmount(amt.toString())}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded"
                            >
                                {amt/1000}k
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="utility" onClick={() => setIsTopUpOpen(false)}>Batal</Button>
                        <Button onClick={handleConfirmTopUp} disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}>Konfirmasi</Button>
                    </div>
                </div>
            </Modal>

            {/* Saved Carts Modal */}
            <Modal
                isOpen={isSavedCartsModalOpen}
                onClose={() => setIsSavedCartsModalOpen(false)}
                title="Pesanan Tersimpan"
                size="lg"
                mobileLayout="fullscreen"
                bodyClassName="p-4 sm:p-6"
            >
                <div className="flex flex-col h-full">
                    <input 
                        type="text"
                        placeholder="Cari pesanan..."
                        value={savedCartSearchTerm}
                        onChange={(e) => {setSavedCartSearchTerm(e.target.value)}}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white mb-4 flex-shrink-0 text-sm sm:text-base"
                    />

                    <div className="flex-grow overflow-y-auto space-y-2 pr-1 -mr-2 sm:-mr-3">
                        {filteredHeldCarts.length > 0 ? filteredHeldCarts.map(cart => (
                            <button 
                                key={cart.id} 
                                onClick={() => {
                                    handleSwitchCart(cart.id);
                                    setIsSavedCartsModalOpen(false);
                                }}
                                className="w-full text-left p-3 sm:p-3.5 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors border border-slate-600/50"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white truncate">{cart.name}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {cart.items.length} item &bull; {CURRENCY_FORMATTER.format(cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0))}
                                        </p>
                                    </div>
                                    <Icon name="cart" className="w-4 h-4 text-slate-400 mt-0.5" />
                                </div>
                            </button>
                        )) : (
                            <div className="text-center text-slate-500 py-8">
                                <Icon name="search" className="w-10 h-10 mx-auto mb-2"/>
                                <p>Tidak ada pesanan tersimpan yang cocok.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            <MemberSearchModal 
                isOpen={isMemberSearchOpen}
                onClose={() => setIsMemberSearchOpen(false)}
                onSelect={(c) => setSelectedCustomer(c)}
                onAddNew={onOpenCustomerForm}
                onScan={triggerScanner}
            />

            <DualScreenModal
                isOpen={isDualScreenModalOpen}
                onClose={() => setDualScreenModalOpen(false)}
            />
        </div>
    );
};

export default CartSidebar;

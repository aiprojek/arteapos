
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useCustomer } from '../../context/CustomerContext';
import { useSession } from '../../context/SessionContext'; // IMPORTED
import { useCustomerDisplay } from '../../context/CustomerDisplayContext'; 
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
}> = ({ onSwitch, enableCartHolding }) => {
    const { heldCarts, activeHeldCartId } = useCart();
    return (
        <div className="mb-4 -mx-4 px-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
                 {enableCartHolding && (
                     <button 
                        onClick={() => onSwitch(null)} 
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors border
                            ${activeHeldCartId === null 
                                ? 'bg-[#347758] text-white font-semibold border-[#347758]' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`
                        }
                    >
                        <Icon name="plus" className="w-4 h-4" />
                        Baru
                    </button>
                 )}
                {heldCarts.map(cart => (
                    <button 
                        key={cart.id} 
                        onClick={() => onSwitch(cart.id)}
                        className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-lg transition-colors border
                             ${activeHeldCartId === cart.id 
                                ? 'bg-[#347758] text-white font-semibold border-[#347758]' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`
                        }
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
}> = ({ selectedCustomer, onSelectCustomer, onOpenAddModal, onOpenSearchModal, onOpenScanner, onSelectOrderType, onTopUpClick, orderType }) => {
    const { membershipSettings } = useCustomer();
    const { receiptSettings } = useSettings();
    const { sessionSettings } = useSession(); // Access Session Settings for Toggle
    const { tableNumber, setTableNumber, paxCount, setPaxCount } = useCart(); 
    
    const availableOrderTypes = receiptSettings.orderTypes && receiptSettings.orderTypes.length > 0
        ? receiptSettings.orderTypes
        : ['Makan di Tempat', 'Bawa Pulang', 'Pesan Antar'];
    
    const isDineIn = orderType.toLowerCase().includes('makan') || orderType.toLowerCase().includes('dine') || orderType.toLowerCase().includes('meja');

    // COMPACT CUSTOMER SELECTION BAR
    return (
        <div className="space-y-1">
            {/* Top Row: Selectors Row */}
            <div className="flex gap-1">
                {/* 1. Order Type Dropdown / Toggle */}
                <div className="flex-1 min-w-0 bg-slate-700/80 rounded-lg p-1 border border-slate-600/50 flex items-center overflow-x-auto scrollbar-hide">
                    {availableOrderTypes.map(type => (
                        <button 
                            key={type}
                            onClick={() => onSelectOrderType(type)} 
                            className={`flex-1 min-w-max px-2 py-1 text-[10px] leading-tight rounded transition-colors truncate ${orderType === type ? 'bg-[#347758] text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                            title={type}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-1">
                 {/* 2. Table & Pax Input (If Dine In) */}
                 {sessionSettings.enableTableManagement && isDineIn && (
                    <div className="flex gap-1 bg-slate-700/80 rounded-lg p-1 border border-slate-600/50 flex-shrink-0 animate-fade-in">
                        <div className="flex bg-slate-800 rounded px-1.5 items-center">
                            <span className="text-slate-500 font-bold text-[9px] mr-1">T</span>
                            <input 
                                type="text" 
                                value={tableNumber} 
                                onChange={(e) => setTableNumber(e.target.value)} 
                                placeholder="-"
                                className="w-6 bg-transparent text-white text-[11px] font-bold outline-none text-center"
                            />
                        </div>
                        <div className="flex bg-slate-800 rounded px-1.5 items-center">
                            <span className="text-slate-500 font-bold text-[9px] mr-1">P</span>
                            <input 
                                type="number" 
                                min="1"
                                value={paxCount || ''} 
                                onChange={(e) => setPaxCount(parseInt(e.target.value) || 0)} 
                                placeholder="-"
                                className="w-5 bg-transparent text-white text-[11px] font-bold outline-none text-center"
                            />
                        </div>
                    </div>
                )}

                {/* 3. Customer Pill */}
                {membershipSettings.enabled && (
                    <div className={`flex-1 flex items-center justify-between p-1 rounded-lg border ${selectedCustomer ? 'bg-[#347758]/20 border-[#347758]/30' : 'bg-slate-700/80 border-slate-600/50'}`}>
                        <div className="flex items-center gap-1.5 overflow-hidden pl-1 flex-1 cursor-pointer" onClick={() => !selectedCustomer && onOpenSearchModal()}>
                            <Icon name="users" className={`w-3 h-3 flex-shrink-0 ${selectedCustomer ? 'text-[#52a37c]' : 'text-slate-400'}`} />
                            <div className="min-w-0">
                                <p className={`font-bold text-[11px] leading-tight truncate ${selectedCustomer ? 'text-white' : 'text-slate-400'}`}>
                                    {selectedCustomer ? selectedCustomer.name : 'Pilih Member'}
                                </p>
                            </div>
                        </div>
                        
                        {selectedCustomer ? (
                            <div className="flex items-center gap-1 pl-1">
                                <button onClick={onTopUpClick} className="text-[#52a37c] hover:bg-[#347758]/20 p-1 rounded transition-colors" title="Saldo">
                                    <Icon name="cash" className="w-3 h-3"/>
                                </button>
                                <button onClick={() => onSelectCustomer(null)} className="text-slate-400 hover:text-red-400 p-1">
                                    <Icon name="close" className="w-3 h-3"/>
                                </button>
                            </div>
                        ) : (
                            <button onClick={onOpenScanner} className="text-slate-400 hover:text-white p-1" title="Scan Barcode">
                                <Icon name="barcode" className="w-3.5 h-3.5" />
                            </button>
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
    const { isDisplayConnected } = useCustomerDisplay(); 

    const { subtotal, itemDiscountAmount, cartDiscountAmount, taxAmount, serviceChargeAmount, finalTotal } = getCartTotals();
    const quickPayAmounts = [20000, 50000, 100000];

    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);
    const [isDualScreenModalOpen, setDualScreenModalOpen] = useState(false);

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
                 <Button onClick={() => onOpenNameModal(null)} disabled={cart.length === 0} variant="secondary" className="flex-1 px-1 h-full flex flex-row items-center justify-center gap-1.5 text-[11px] font-bold" title="Simpan Pesanan">
                    <Icon name="plus" className="w-4 h-4"/>
                    <span className="hidden sm:inline">Simpan</span>
                </Button>
            );
        }
        
        const currentCart = heldCarts.find(c => c.id === activeHeldCartId);
        if (!currentCart) return null;

        return (
            <>
                <Button variant="secondary" className="flex-1 px-1 h-full flex flex-row items-center justify-center gap-1.5 text-[11px] font-bold" onClick={() => onOpenNameModal(currentCart)} title="Ganti Nama">
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
        <div className="w-full md:w-96 lg:w-[420px] bg-slate-800 md:rounded-xl shadow-none md:shadow-2xl flex flex-col p-4 flex-shrink-0 h-full border-l-0 md:border-l border-slate-700 transition-all">
            {isSessionLocked && (
                <div className="absolute inset-0 bg-slate-900/80 z-20 flex items-center justify-center rounded-xl backdrop-blur-sm">
                    <div className="text-center p-4">
                        <Icon name="lock" className="w-12 h-12 text-slate-500 mx-auto mb-2"/>
                        <p className="text-slate-300 font-bold">Sesi Terkunci</p>
                    </div>
                </div>
            )}
            
            {(sessionSettings.enableCartHolding || heldCarts.length > 0) && <HeldCartsTabs onSwitch={handleSwitchCart} enableCartHolding={sessionSettings.enableCartHolding || false} />}
            
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white hidden md:block leading-none">Keranjang</h2>
                <button 
                    onClick={() => setDualScreenModalOpen(true)}
                    className={`p-1.5 rounded transition-colors ${isDisplayConnected ? 'bg-[#347758] text-white animate-pulse' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    title="Layar Kedua (Pelanggan)"
                >
                    <Icon name="cast" className="w-4 h-4"/>
                </button>
            </div>

            {/* --- 1. TOP BOX: PINNED CONFIG BAR --- */}
            {cart.length > 0 && (
                <div className="mb-2 space-y-1.5 flex-shrink-0">
                    <CustomerSelection 
                        selectedCustomer={selectedCustomer} 
                        onSelectCustomer={setSelectedCustomer}
                        onOpenAddModal={onOpenCustomerForm}
                        onOpenSearchModal={() => setIsMemberSearchOpen(true)}
                        onOpenScanner={triggerScanner}
                        onSelectOrderType={setOrderType}
                        onTopUpClick={() => setIsTopUpOpen(true)}
                        orderType={orderType}
                    />
                    
                    <div className="flex gap-1">
                        {membershipSettings.enabled && (
                            <button onClick={onOpenRewardModal} disabled={!selectedCustomer} className={`flex-1 flex gap-1 items-center justify-center text-[10px] py-1 rounded border transition-colors ${selectedCustomer ? 'border-amber-700/50 hover:bg-amber-700/20 text-amber-500' : 'border-slate-700 text-slate-600 cursor-not-allowed'}`}>
                                <Icon name="award" className="w-3 h-3"/> Loyalti
                            </button>
                        )}
                        <button onClick={onOpenCartDiscountModal} className="flex-1 flex gap-1 items-center justify-center text-[10px] py-1 rounded border border-blue-700/50 hover:bg-blue-700/20 text-blue-400 transition-colors">
                            <Icon name="tag" className="w-3 h-3"/> Diskon
                        </button>
                        {sessionSettings.enableCartHolding && onSplitBill && (
                            <button onClick={onSplitBill} className="flex-1 flex gap-1 items-center justify-center text-[10px] py-1 rounded border border-purple-700/50 hover:bg-purple-700/20 text-purple-400 transition-colors" title="Pisah item">
                                <Icon name="share" className="w-3 h-3"/> Split
                            </button>
                        )}
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
                    <div className="flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent border-t border-slate-700/50 pt-2 min-h-[50px]">
                        <ActiveOrderList cart={cart} onOpenDiscountModal={onOpenDiscountModal} />
                    </div>
                    
                    {/* --- 3. BOTTOM BOX: COMPACT TOTALS & PAY --- */}
                    <div className="pt-2 mt-auto bg-slate-800 flex-shrink-0 relative z-10 border-t border-slate-700">
                        {/* Compact Totals */}
                         <div className="space-y-0.5 text-xs bg-slate-900/30 p-1.5 rounded border border-slate-700/30 mb-2">
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
                            <div className="flex justify-between items-baseline pt-1 mt-1 border-t border-slate-700/50">
                                <span className="font-bold text-slate-300">TOTAL</span>
                                <span className="font-black text-xl text-[#52a37c]">{CURRENCY_FORMATTER.format(finalTotal)}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 h-12">
                             <Button variant="danger" className="w-12 h-full flex-shrink-0 p-0 flex items-center justify-center" onClick={handleClearCart}>
                                <Icon name="trash" className="w-5 h-5 text-white"/>
                            </Button>
                            
                            <CartActions />

                            <Button variant="primary" className="flex-[2] text-sm sm:text-base font-black h-full shadow-lg shadow-[#347758]/20" onClick={onOpenPaymentModal} title="Shortcut: F2">
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
                        <Button variant="secondary" onClick={() => setIsTopUpOpen(false)}>Batal</Button>
                        <Button onClick={handleConfirmTopUp} disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}>Konfirmasi</Button>
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

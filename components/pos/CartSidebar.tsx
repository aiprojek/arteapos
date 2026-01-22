
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
}> = ({ onSwitch }) => {
    const { heldCarts, activeHeldCartId } = useCart();
    return (
        <div className="mb-4 -mx-4 px-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
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

    return (
        <div className="space-y-3">
            <div className="flex bg-slate-700 p-1 rounded-lg">
                {availableOrderTypes.map(type => (
                    <button 
                        key={type}
                        onClick={() => onSelectOrderType(type)} 
                        className={`flex-1 py-1 text-xs rounded-md transition-colors ${orderType === type ? 'bg-[#347758] text-white font-semibold' : 'text-slate-300'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
            
            {/* CONDITIONAL RENDER: Table & Pax (Only if Enabled & Dine-In) */}
            {sessionSettings.enableTableManagement && isDineIn && (
                <div className="grid grid-cols-2 gap-2 animate-fade-in">
                    <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <span className="text-slate-500 text-xs font-bold">Meja</span>
                        </div>
                        <input 
                            type="text" 
                            value={tableNumber} 
                            onChange={(e) => setTableNumber(e.target.value)} 
                            placeholder="Nomor"
                            className="w-full bg-slate-700 border border-slate-600 rounded text-white text-sm pl-12 pr-2 py-1.5 focus:border-[#347758] outline-none text-center font-bold"
                        />
                    </div>
                    <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <Icon name="users" className="w-3 h-3 text-slate-500" />
                        </div>
                        <input 
                            type="number" 
                            min="1"
                            value={paxCount || ''} 
                            onChange={(e) => setPaxCount(parseInt(e.target.value) || 0)} 
                            placeholder="Pax"
                            className="w-full bg-slate-700 border border-slate-600 rounded text-white text-sm pl-8 pr-2 py-1.5 focus:border-[#347758] outline-none text-center font-bold"
                        />
                    </div>
                </div>
            )}
            
            {membershipSettings.enabled && (
                <div className="space-y-2">
                    {/* CUSTOMER CARD UI */}
                    <div className="flex gap-2 items-center">
                        <div className={`flex-1 flex items-center justify-between p-2 rounded-lg border ${selectedCustomer ? 'bg-slate-700 border-[#347758]' : 'bg-slate-700 border-slate-600'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className={`p-1.5 rounded-full ${selectedCustomer ? 'bg-[#347758]/20 text-[#52a37c]' : 'bg-slate-600 text-slate-400'}`}>
                                    <Icon name={selectedCustomer ? "users" : "users"} className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className={`font-bold text-sm truncate ${selectedCustomer ? 'text-white' : 'text-slate-400'}`}>
                                        {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum'}
                                    </p>
                                    {selectedCustomer && <p className="text-[10px] text-slate-400 truncate">{selectedCustomer.memberId}</p>}
                                </div>
                            </div>
                            
                            {selectedCustomer ? (
                                <button onClick={() => onSelectCustomer(null)} className="text-slate-400 hover:text-red-400 p-1">
                                    <Icon name="close" className="w-4 h-4"/>
                                </button>
                            ) : (
                                <button onClick={onOpenSearchModal} className="text-[#52a37c] hover:text-white text-xs font-bold px-2 py-1 bg-[#347758]/10 hover:bg-[#347758] rounded transition-colors">
                                    Cari
                                </button>
                            )}
                        </div>
                        
                        {!selectedCustomer && (
                            <button 
                                onClick={onOpenScanner}
                                className="bg-slate-700 border border-slate-600 p-2.5 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                                title="Scan Kartu Member"
                            >
                                <Icon name="barcode" className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    
                    {/* Show Wallet Balance with Top Up Button */}
                    {selectedCustomer && (
                        <div className="flex items-center justify-between text-xs bg-slate-900/50 p-2 rounded border border-slate-700 animate-fade-in">
                            <span className="text-slate-400">Saldo Member:</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-green-400 text-sm">{CURRENCY_FORMATTER.format(selectedCustomer.balance || 0)}</span>
                                <button 
                                    onClick={onTopUpClick}
                                    className="bg-[#347758] hover:bg-[#2a6046] text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors"
                                >
                                    <Icon name="plus" className="w-3 h-3"/> Isi
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
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
        if (!sessionSettings.enableCartHolding) return null;

        if (activeHeldCartId === null) {
            return (
                 <Button onClick={() => onOpenNameModal(null)} disabled={cart.length === 0} variant="secondary">
                    <Icon name="plus" className="w-4 h-4"/> Simpan Pesanan
                </Button>
            );
        }
        
        const currentCart = heldCarts.find(c => c.id === activeHeldCartId);
        if (!currentCart) return null;

        return (
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => onOpenNameModal(currentCart)}>
                    <Icon name="edit" className="w-4 h-4"/> Ganti Nama
                </Button>
                <Button variant="danger" onClick={() => deleteHeldCart(currentCart.id)}>
                    <Icon name="trash" className="w-4 h-4"/> Hapus Pesanan
                </Button>
            </div>
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
            
            {sessionSettings.enabled && sessionSettings.enableCartHolding && <HeldCartsTabs onSwitch={handleSwitchCart} />}
            
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-white hidden md:block">Keranjang</h2>
                <button 
                    onClick={() => setDualScreenModalOpen(true)}
                    className={`p-1.5 rounded transition-colors ${isDisplayConnected ? 'bg-[#347758] text-white animate-pulse' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    title="Layar Kedua (Pelanggan)"
                >
                    <Icon name="cast" className="w-5 h-5"/>
                </button>
            </div>
            
            {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                    <Icon name="cash" className="w-16 h-16 mb-4 opacity-50"/>
                    <p>Keranjang masih kosong</p>
                    <p className="text-sm">Ketuk produk untuk menambahkannya</p>
                </div>
            ) : (
                <>
                    <ActiveOrderList cart={cart} onOpenDiscountModal={onOpenDiscountModal} />
                    
                    <div className="border-t border-slate-700 pt-3 mt-auto space-y-3 bg-slate-800">
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
                        
                        <div className="flex gap-2">
                            {membershipSettings.enabled && (
                                <Button variant="secondary" size="sm" onClick={onOpenRewardModal} disabled={!selectedCustomer} className="flex-1">
                                    <Icon name="award" className="w-4 h-4"/> Tukar Poin
                                </Button>
                            )}
                            <Button variant="secondary" size="sm" onClick={onOpenCartDiscountModal} className="flex-1">
                                <Icon name="tag" className="w-4 h-4"/> Diskon Total
                            </Button>
                            {onSplitBill && (
                                <Button variant="secondary" size="sm" onClick={onSplitBill} disabled={cart.length === 0} className="flex-1" title="Pisah item untuk bayar sebagian">
                                    <Icon name="share" className="w-4 h-4"/> Split
                                </Button>
                            )}
                        </div>

                         <div className="space-y-1 text-sm bg-slate-900/50 p-3 rounded-lg">
                            <div className="flex justify-between text-slate-400">
                                <span>Subtotal</span>
                                <span>{CURRENCY_FORMATTER.format(subtotal)}</span>
                            </div>
                            {(itemDiscountAmount > 0 || cartDiscountAmount > 0) && (
                                <div className="flex justify-between text-green-400">
                                    <span>
                                        Total Diskon
                                        {cartDiscount?.name && <span className="text-xs block text-green-500/70">({cartDiscount.name})</span>}
                                    </span>
                                    <span>- {CURRENCY_FORMATTER.format(itemDiscountAmount + cartDiscountAmount)}</span>
                                </div>
                            )}
                            {serviceChargeAmount > 0 && (
                                <div className="flex justify-between text-slate-400">
                                    <span>Service Charge ({receiptSettings.serviceChargeRate}%)</span>
                                    <span>{CURRENCY_FORMATTER.format(serviceChargeAmount)}</span>
                                    </div>
                            )}
                            {taxAmount > 0 && (
                                <div className="flex justify-between text-slate-400">
                                    <span>Pajak</span>
                                    <span>{CURRENCY_FORMATTER.format(taxAmount)}</span>
                                </div>
                            )}
                            <div className="border-t border-slate-700 my-1 pt-1"></div>
                            <div className="flex justify-between font-bold text-xl text-white">
                                <span>TOTAL</span>
                                <span>{CURRENCY_FORMATTER.format(finalTotal)}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onQuickPay(finalTotal)}
                                disabled={cart.length === 0}
                                title="Bayar dengan uang pas"
                                className="bg-slate-700"
                            >
                                Pas
                            </Button>
                            {quickPayAmounts.map(amount => (
                                <Button
                                    key={amount}
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onQuickPay(amount)}
                                    disabled={cart.length === 0 || finalTotal > amount}
                                    className="bg-slate-700"
                                >
                                    {amount / 1000}k
                                </Button>
                            ))}
                        </div>


                        <div className="flex gap-3">
                            <Button variant="danger" className="flex-1" onClick={handleClearCart} disabled={cart.length === 0}>
                                <Icon name="trash" className="w-4 h-4"/>
                            </Button>
                            <Button variant="primary" className="flex-[3] text-lg py-3 shadow-lg shadow-[#347758]/20" onClick={onOpenPaymentModal} disabled={cart.length === 0} title="Shortcut: F2">
                                Bayar
                            </Button>
                        </div>
                        
                        <div className="text-center pt-1">
                          <CartActions />
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

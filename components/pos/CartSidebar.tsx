
import React from 'react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useCustomer } from '../../context/CustomerContext';
import { useSession } from '../../context/SessionContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Icon from '../Icon';
import Button from '../Button';
import CartItemComponent from '../CartItem';
import type { Customer, OrderType } from '../../types';

// Sub-components moved here for cleaner file structure
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
    onSelectOrderType: (type: OrderType) => void;
    orderType: OrderType;
}> = ({ selectedCustomer, onSelectCustomer, onOpenAddModal, onSelectOrderType, orderType }) => {
    const { customers, membershipSettings } = useCustomer();
    const { receiptSettings } = useSettings();
    
    const availableOrderTypes = receiptSettings.orderTypes && receiptSettings.orderTypes.length > 0
        ? receiptSettings.orderTypes
        : ['Makan di Tempat', 'Bawa Pulang', 'Pesan Antar'];

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
            
            {membershipSettings.enabled && (
                <div className="flex gap-2">
                    <select 
                        value={selectedCustomer?.id || ''}
                        onChange={(e) => onSelectCustomer(customers.find(c => c.id === e.target.value) || null)}
                        className="w-full bg-slate-700 p-2 rounded-md text-sm text-white outline-none focus:ring-1 focus:ring-[#347758]"
                    >
                        <option value="">Pelanggan Umum</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.points} poin)</option>)}
                    </select>
                    <button 
                        onClick={onOpenAddModal}
                        className="bg-[#347758] p-2 rounded-md text-white hover:bg-[#2a6046]"
                        title="Tambah Pelanggan Baru"
                    >
                        <Icon name="plus" className="w-5 h-5" />
                    </button>
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
    onSplitBill?: () => void; // New Prop
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
        heldCarts, activeHeldCartId, switchActiveCart, holdActiveCart, deleteHeldCart,
        orderType, setOrderType 
    } = useCart();
    
    const { sessionSettings } = useSession();
    const { membershipSettings } = useCustomer();
    const { receiptSettings } = useSettings();

    const { subtotal, itemDiscountAmount, cartDiscountAmount, taxAmount, serviceChargeAmount, finalTotal } = getCartTotals();
    const quickPayAmounts = [20000, 50000, 100000];

    // Actions Logic
    const handleSwitchCart = (cartId: string | null) => {
        switchActiveCart(cartId);
        setSelectedCustomer(null);
    };

    const handleClearCart = () => {
        clearCart();
        setSelectedCustomer(null);
    }

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
        <div className={`w-full md:w-96 lg:w-[420px] bg-slate-800 rounded-xl shadow-2xl flex flex-col p-4 flex-shrink-0 h-[45%] md:h-full border-l border-slate-700 ${isSessionLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {sessionSettings.enabled && sessionSettings.enableCartHolding && <HeldCartsTabs onSwitch={handleSwitchCart} />}
            
            <h2 className="text-xl font-bold mb-2 text-white">Keranjang</h2>
            
            {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                    <Icon name="cash" className="w-16 h-16 mb-4 opacity-50"/>
                    <p>Keranjang masih kosong</p>
                    <p className="text-sm">Ketuk produk untuk menambahkannya</p>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2 divide-y divide-slate-700">
                       {cart.map(item => <CartItemComponent key={item.cartItemId} item={item} onOpenDiscountModal={onOpenDiscountModal}/>)}
                    </div>
                    
                    <div className="border-t border-slate-700 pt-3 mt-auto space-y-3 bg-slate-800">
                        <CustomerSelection 
                            selectedCustomer={selectedCustomer} 
                            onSelectCustomer={setSelectedCustomer}
                            onOpenAddModal={onOpenCustomerForm}
                            onSelectOrderType={setOrderType}
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
                            {/* Split Bill Button */}
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
                                    <span>Pajak ({receiptSettings.taxRate}%)</span>
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
                                Uang Pas
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
                                    {amount / 1000}rb
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
        </div>
    );
};

export default CartSidebar;

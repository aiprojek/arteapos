
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { useDiscount } from '../context/DiscountContext';
import { useFinance } from '../context/FinanceContext';
import { useProduct } from '../context/ProductContext';
import { useSession } from '../context/SessionContext';
import { useSettings } from '../context/SettingsContext';
import { useUI } from '../context/UIContext';
import type { Product, CartItem as CartItemType, Transaction as TransactionType, Customer, Reward, Payment, PaymentMethod, HeldCart, Discount, Addon, DiscountDefinition, ProductVariant, ModifierGroup, SelectedModifier } from '../types';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import ReceiptModal from '../components/ReceiptModal';
import { CURRENCY_FORMATTER } from '../constants';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import KitchenNoteModal from '../components/KitchenNoteModal';
import EndSessionModal from '../components/EndSessionModal';
import SendReportModal from '../components/SendReportModal';
import CustomerFormModal from '../components/CustomerFormModal';
import StaffRestockModal from '../components/StaffRestockModal';
import StockOpnameModal from '../components/StockOpnameModal';

// Modular Components
import ProductBrowser from '../components/pos/ProductBrowser';
import CartSidebar from '../components/pos/CartSidebar';
import { SessionHistoryModal, PaymentModal, RewardsModal, DiscountModal, CashManagementModal } from '../components/pos/POSModals';

// --- Local Modals ---

const ModifierModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onConfirm: (selectedModifiers: SelectedModifier[]) => void;
}> = ({ isOpen, onClose, product, onConfirm }) => {
    const [selections, setSelections] = useState<Record<string, SelectedModifier[]>>({});

    useEffect(() => {
        if (isOpen) setSelections({});
    }, [isOpen]);

    if (!isOpen || !product || !product.modifierGroups) return null;

    const handleToggle = (group: ModifierGroup, option: any) => {
        setSelections(prev => {
            const current = prev[group.id] || [];
            const isSelected = current.find(s => s.optionId === option.id);
            
            // Single Choice (Radio)
            if (group.maxSelection === 1) {
                if (isSelected) {
                    // Only deselect if minSelection is 0 (optional)
                    if(group.minSelection === 0) return { ...prev, [group.id]: [] };
                    return prev;
                }
                return { 
                    ...prev, 
                    [group.id]: [{ 
                        groupId: group.id, groupName: group.name, 
                        optionId: option.id, name: option.name, price: option.price 
                    }] 
                };
            }

            // Multiple Choice (Checkbox)
            if (isSelected) {
                return { ...prev, [group.id]: current.filter(s => s.optionId !== option.id) };
            } else {
                if (current.length >= group.maxSelection) return prev; // Limit reached
                return { 
                    ...prev, 
                    [group.id]: [...current, { 
                        groupId: group.id, groupName: group.name, 
                        optionId: option.id, name: option.name, price: option.price 
                    }] 
                };
            }
        });
    };

    const isValid = product.modifierGroups.every(group => {
        const count = (selections[group.id] || []).length;
        return count >= group.minSelection;
    });

    const handleConfirm = () => {
        const flatSelections = Object.values(selections).flat();
        onConfirm(flatSelections);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pilihan ${product.name}`}>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                {product.modifierGroups.map(group => (
                    <div key={group.id} className="space-y-2">
                        <div className="flex justify-between items-baseline border-b border-slate-700 pb-1">
                            <h4 className="font-bold text-white">{group.name}</h4>
                            <span className="text-xs text-slate-400">
                                {group.minSelection > 0 ? `Wajib Pilih ${group.minSelection}` : 'Opsional'} 
                                {group.maxSelection > 1 ? ` (Max ${group.maxSelection})` : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.options.map(opt => {
                                const isSelected = (selections[group.id] || []).some(s => s.optionId === opt.id);
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleToggle(group, opt)}
                                        className={`flex justify-between items-center p-3 rounded-lg border text-sm transition-all
                                            ${isSelected 
                                                ? 'bg-[#347758]/20 border-[#347758] text-white' 
                                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                                    >
                                        <span>{opt.name}</span>
                                        {opt.price > 0 && <span className="font-mono text-[#52a37c]">+{CURRENCY_FORMATTER.format(opt.price)}</span>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="pt-4 mt-4 border-t border-slate-700">
                <Button onClick={handleConfirm} disabled={!isValid} className="w-full py-3">
                    Tambah ke Pesanan
                </Button>
            </div>
        </Modal>
    );
};

const SplitBillModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItemType[];
    onConfirm: (itemsToPay: string[]) => void;
}> = ({ isOpen, onClose, cartItems, onConfirm }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if(isOpen) setSelectedIds(new Set());
    }, [isOpen]);

    const toggleItem = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === cartItems.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(cartItems.map(i => i.cartItemId)));
    };

    const totalSelected = cartItems
        .filter(i => selectedIds.has(i.cartItemId))
        .reduce((sum, item) => {
            const mods = (item.selectedModifiers || []).reduce((s,m) => s + m.price, 0);
            return sum + ((item.price + mods) * item.quantity);
        }, 0);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Split Bill (Pisah Bayar)">
            <div className="space-y-4">
                <p className="text-sm text-slate-300">Pilih item yang ingin dibayar <strong className="text-white">SEKARANG</strong>. Item yang tidak dipilih akan disimpan ke keranjang terpisah.</p>
                
                <button onClick={toggleAll} className="text-xs text-[#52a37c] font-bold hover:underline mb-2">
                    {selectedIds.size === cartItems.length ? 'Batalkan Semua' : 'Pilih Semua'}
                </button>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {cartItems.map(item => {
                        const mods = (item.selectedModifiers || []).reduce((s,m) => s + m.price, 0);
                        const price = (item.price + mods) * item.quantity;
                        const isSelected = selectedIds.has(item.cartItemId);

                        return (
                            <button 
                                key={item.cartItemId}
                                onClick={() => toggleItem(item.cartItemId)}
                                className={`w-full flex justify-between items-center p-3 rounded-lg border text-left transition-colors
                                    ${isSelected ? 'bg-[#347758]/20 border-[#347758]' : 'bg-slate-800 border-slate-700'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-[#347758] border-[#347758]' : 'border-slate-500'}`}>
                                        {isSelected && <Icon name="check-circle-fill" className="w-3 h-3 text-white"/>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{item.quantity}x {item.name}</p>
                                        <p className="text-xs text-slate-400">{CURRENCY_FORMATTER.format(price)}</p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                <div className="pt-4 border-t border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-300">Akan Dibayar:</span>
                        <span className="font-bold text-xl text-white">{CURRENCY_FORMATTER.format(totalSelected)}</span>
                    </div>
                    <Button 
                        onClick={() => onConfirm(Array.from(selectedIds))} 
                        disabled={selectedIds.size === 0 || selectedIds.size === cartItems.length}
                        className="w-full"
                    >
                        Pisahkan & Bayar
                    </Button>
                    {selectedIds.size === cartItems.length && (
                        <p className="text-xs text-center text-yellow-500 mt-2">Untuk membayar semua, gunakan tombol "Bayar" biasa.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

const VariantModal: React.FC<{isOpen: boolean, onClose: () => void, product: Product | null, onSelect: (v: ProductVariant) => void}> = ({isOpen, onClose, product, onSelect}) => {
    if(!isOpen || !product || !product.variants) return null;
    return <Modal isOpen={isOpen} onClose={onClose} title={`Pilih Varian ${product.name}`}><div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">{product.variants.map(v => <button key={v.id} onClick={() => onSelect(v)} className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg text-left"><p className="font-bold text-white">{v.name}</p><p className="text-sm text-[#52a37c]">{CURRENCY_FORMATTER.format(v.price)}</p></button>)}</div><div className="mt-4 pt-4 border-t border-slate-700"><Button variant="secondary" onClick={onClose} className="w-full">Batal</Button></div></Modal>;
}

const AddonModal: React.FC<{isOpen: boolean, onClose: () => void, product: Product | null, variant: ProductVariant | null, onConfirm: (a: Addon[]) => void}> = ({isOpen, onClose, product, variant, onConfirm}) => {
    const [selected, setSelected] = useState<Addon[]>([]);
    useEffect(() => { if (!isOpen) setSelected([]); }, [isOpen]);
    if(!isOpen || !product || !product.addons) return null;
    const toggle = (addon: Addon) => setSelected(prev => prev.find(a => a.id === addon.id) ? prev.filter(a => a.id !== addon.id) : [...prev, addon]);
    return <Modal isOpen={isOpen} onClose={onClose} title={`Add-on ${product.name}`}><div className="space-y-3 max-h-64 overflow-y-auto">{product.addons.map(a => { const isSel = !!selected.find(x => x.id === a.id); return <label key={a.id} className={`flex items-center p-3 rounded-lg cursor-pointer ${isSel ? 'bg-[#347758]/30 border border-[#347758]' : 'bg-slate-700'}`}><input type="checkbox" checked={isSel} onChange={() => toggle(a)} className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-[#347758]"/><span className="ml-3 flex-1 text-slate-200">{a.name}</span><span className="text-slate-300">{CURRENCY_FORMATTER.format(a.price)}</span></label>})}</div><Button onClick={() => onConfirm(selected)} className="w-full mt-4">Tambah</Button></Modal>;
}

const NameCartModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (n: string) => void, currentName?: string}> = ({isOpen, onClose, onSave, currentName = ''}) => {
    const [name, setName] = useState('');
    useEffect(() => { if (isOpen) setName(currentName); }, [isOpen, currentName]);
    return <Modal isOpen={isOpen} onClose={onClose} title={currentName ? "Ganti Nama" : "Simpan Pesanan"}><div className="space-y-4"><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="cth: Meja 5" className="w-full bg-slate-700 p-2 rounded-md text-white" autoFocus/><Button onClick={() => name.trim() && onSave(name.trim())} className="w-full">Simpan</Button></div></Modal>;
}

const POSView: React.FC = () => {
    const { findProductByBarcode } = useProduct();
    const {
        cart, addToCart, addConfiguredItemToCart, saveTransaction, 
        appliedReward, removeRewardFromCart,
        holdActiveCart, updateHeldCartName,
        applyItemDiscount, removeItemDiscount,
        cartDiscount, applyCartDiscount, removeCartDiscount,
        getCartTotals, clearCart, splitCart
    } = useCart();
    const { showAlert } = useUI();
    const { sessionSettings, session, startSession } = useSession();
    const { transactions, refundTransaction } = useFinance();
    const { receiptSettings } = useSettings();
    const { addCustomer } = useCustomer();

    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [lastTransaction, setLastTransaction] = useState<TransactionType | null>(null);
    const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
    const [isBarcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isRewardsModalOpen, setRewardsModalOpen] = useState(false);
    const [isNameModalOpen, setNameModalOpen] = useState(false);
    const [cartToRename, setCartToRename] = useState<HeldCart | null>(null);
    const [discountingItem, setDiscountingItem] = useState<CartItemType | null>(null);
    const [isCartDiscountModalOpen, setCartDiscountModalOpen] = useState(false);
    const [isAddonModalOpen, setAddonModalOpen] = useState(false);
    const [productForAddons, setProductForAddons] = useState<Product | null>(null);
    const [isVariantModalOpen, setVariantModalOpen] = useState(false);
    const [productForVariant, setProductForVariant] = useState<Product | null>(null);
    const [selectedVariantForAddons, setSelectedVariantForAddons] = useState<ProductVariant | null>(null);
    const [transactionForKitchenNote, setTransactionForKitchenNote] = useState<TransactionType | null>(null);
    const [isCashMgmtOpen, setCashMgmtOpen] = useState(false);
    const [isStartSessionModalOpen, setStartSessionModalOpen] = useState(false);
    const [startingCashInput, setStartingCashInput] = useState('');
    const [isEndSessionModalOpen, setEndSessionModalOpen] = useState(false);
    const [isSendReportModalOpen, setSendReportModalOpen] = useState(false);
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
    const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
    const [receiptToView, setReceiptToView] = useState<TransactionType | null>(null);
    const [isStaffRestockOpen, setStaffRestockOpen] = useState(false); 
    const [isOpnameOpen, setIsOpnameOpen] = useState(false); 
    
    const [isModifierModalOpen, setModifierModalOpen] = useState(false);
    const [productForModifier, setProductForModifier] = useState<Product | null>(null);
    const [isSplitBillModalOpen, setSplitBillModalOpen] = useState(false);
    const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

    const totalCartItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    const { finalTotal } = getCartTotals();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (sessionSettings.enabled && !session) return; 
            if (e.key === 'F2') {
                e.preventDefault();
                if (cart.length > 0) setPaymentModalOpen(true);
            }
            if (e.key === 'F4') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('focus-search'));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart.length, session, sessionSettings.enabled]);

    useEffect(() => {
        if (!selectedCustomer && appliedReward) {
            removeRewardFromCart();
        }
    }, [selectedCustomer, appliedReward, removeRewardFromCart]);
    
    const handleProductClick = (product: Product) => {
        if (product.modifierGroups && product.modifierGroups.length > 0) {
            setProductForModifier(product);
            setModifierModalOpen(true);
            return;
        }
        if (product.variants && product.variants.length > 0) {
            setProductForVariant(product);
            setVariantModalOpen(true);
            return;
        }
        if (product.addons && product.addons.length > 0) {
            setProductForAddons(product);
            setSelectedVariantForAddons(null);
            setAddonModalOpen(true);
            return;
        }
        addToCart(product);
    };

    const handleVariantSelect = (variant: ProductVariant) => {
        setVariantModalOpen(false);
        if (productForVariant) {
            if (productForVariant.addons && productForVariant.addons.length > 0) {
                setProductForAddons(productForVariant);
                setSelectedVariantForAddons(variant);
                setAddonModalOpen(true);
            } else {
                addConfiguredItemToCart(productForVariant, [], variant);
                setProductForVariant(null);
            }
        }
    };

    const handleAddonConfirm = (selectedAddons: Addon[]) => {
        if (productForAddons) {
            addConfiguredItemToCart(productForAddons, selectedAddons, selectedVariantForAddons || undefined);
        }
        setAddonModalOpen(false);
        setProductForAddons(null);
        setSelectedVariantForAddons(null);
        setProductForVariant(null);
    };

    const handleModifierConfirm = (selectedModifiers: SelectedModifier[]) => {
        if (productForModifier) {
            // @ts-ignore
            addConfiguredItemToCart(productForModifier, [], undefined, selectedModifiers); 
        }
        setModifierModalOpen(false);
        setProductForModifier(null);
    }

    const handleStartSession = () => {
        startSession(parseFloat(startingCashInput) || 0);
        setStartSessionModalOpen(false);
        setStartingCashInput('');
    }

    const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'memberId' | 'points' | 'createdAt'> | Customer) => {
        addCustomer(customerData);
        setCustomerModalOpen(false);
        showAlert({ type: 'alert', title: 'Berhasil', message: 'Pelanggan berhasil ditambahkan.' });
    };

    const handleRefundTransaction = (transaction: TransactionType) => {
        showAlert({
            type: 'confirm',
            title: 'Refund Transaksi?',
            message: 'Stok akan dikembalikan dan omzet dikurangi. Yakin?',
            confirmVariant: 'danger',
            onConfirm: () => refundTransaction(transaction.id)
        });
    };

    const handleSaveTransaction = useCallback((payments: Array<Omit<Payment, 'id' | 'createdAt'>>, customerDetails: { customerId?: string, customerName?: string, customerContact?: string }) => {
        try {
            const newTransaction = saveTransaction({ payments, ...customerDetails });
            if (newTransaction.paymentStatus !== 'paid' && customerDetails.customerName && !customerDetails.customerId) {
                 showAlert({ type: 'alert', title: 'Transaksi Utang Disimpan', message: `Transaksi utang untuk "${customerDetails.customerName}" telah disimpan.` });
            }
            setLastTransaction(newTransaction);
            setPaymentModalOpen(false);
            setReceiptModalOpen(true);
            if (receiptSettings.enableKitchenPrinter) setTransactionForKitchenNote(newTransaction);
            setSelectedCustomer(null);
        } catch (error) {
            console.error(error);
            showAlert({type: 'alert', title: 'Error', message: 'Gagal menyimpan transaksi.'});
        }
    }, [saveTransaction, showAlert, receiptSettings.enableKitchenPrinter]);

    const handleQuickPay = useCallback((paymentAmount: number) => {
        if (cart.length === 0) return;
        const { finalTotal } = getCartTotals();
        if (paymentAmount < finalTotal - 0.01) {
            showAlert({ type: 'alert', title: 'Pembayaran Kurang', message: `Jumlah pembayaran cepat tidak mencukupi total tagihan.` });
            return;
        }
        const payments = [{ method: 'cash' as PaymentMethod, amount: paymentAmount }];
        let customerDetails: { customerId?: string; customerName?: string; customerContact?: string } = {};
        if (selectedCustomer) {
            customerDetails = { customerId: selectedCustomer.id, customerName: selectedCustomer.name, customerContact: selectedCustomer.contact };
        }
        try {
            const newTransaction = saveTransaction({ payments, ...customerDetails });
            setLastTransaction(newTransaction);
            setReceiptModalOpen(true);
            if (receiptSettings.enableKitchenPrinter) setTransactionForKitchenNote(newTransaction);
            setSelectedCustomer(null);
        } catch (error) {
            console.error(error);
            showAlert({type: 'alert', title: 'Error', message: 'Gagal menyimpan transaksi.'});
        }
    }, [cart.length, getCartTotals, saveTransaction, showAlert, selectedCustomer, receiptSettings.enableKitchenPrinter]);

    const handleBarcodeScan = useCallback((barcode: string) => {
        const product = findProductByBarcode(barcode);
        if (product) handleProductClick(product);
        else showAlert({type: 'alert', title: 'Produk Tidak Ditemukan', message: `Tidak ada produk dengan barcode: ${barcode}`});
        setBarcodeScannerOpen(false);
    }, [findProductByBarcode, showAlert]);

    const handleSaveName = (name: string) => {
        if (cartToRename) {
            updateHeldCartName(cartToRename.id, name);
            setCartToRename(null);
        } else {
            holdActiveCart(name);
        }
        setNameModalOpen(false);
    };

    const handleOpenDiscountModal = (cartItemId: string) => {
        const item = cart.find(i => i.cartItemId === cartItemId && !i.isReward);
        if (item) setDiscountingItem(item);
    };

    const handleSplitBill = (itemsToPay: string[]) => {
        splitCart(itemsToPay);
        setSplitBillModalOpen(false);
    };

    const sessionSummary = useMemo(() => {
        if (!session) return { cashSales: 0, cashIn: 0, cashOut: 0 };
        const sessionTrans = transactions.filter(t => new Date(t.createdAt) >= new Date(session.startTime) && t.paymentStatus !== 'refunded');
        const cashSales = sessionTrans.reduce((sum, t) => {
            const cashPay = t.payments.find(p => p.method === 'cash');
            return sum + (cashPay ? cashPay.amount : 0);
        }, 0);
        let cashIn = 0, cashOut = 0;
        session.cashMovements.forEach(m => {
            if (m.type === 'in') cashIn += m.amount;
            else cashOut += m.amount;
        });
        return { cashSales, cashIn, cashOut };
    }, [session, transactions]);

    const sessionTransactions = useMemo(() => {
        if (!session) return [];
        return transactions.filter(t => new Date(t.createdAt) >= new Date(session.startTime) && t.paymentStatus !== 'refunded');
    }, [session, transactions]);

    const isSessionLocked = sessionSettings.enabled && !session;

    return (
        <div className="flex flex-col h-full">
            <div className="md:hidden flex p-1 bg-slate-800 mb-4 rounded-lg gap-1 shrink-0">
                <button
                    onClick={() => setMobileTab('products')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${mobileTab === 'products' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Icon name="products" className="w-4 h-4"/> Menu
                </button>
                <button
                    onClick={() => setMobileTab('cart')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${mobileTab === 'cart' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Icon name="cash" className="w-4 h-4"/> Keranjang
                    {totalCartItems > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">
                            {totalCartItems}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex flex-col md:flex-row h-full gap-6 overflow-hidden">
                <div className={`flex-col min-w-0 md:flex-1 h-full ${mobileTab === 'cart' ? 'hidden md:flex' : 'flex'}`}>
                    {isSessionLocked ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700">
                            <div className="bg-slate-800 p-4 rounded-full mb-4 shadow-lg">
                                <Icon name="lock" className="w-12 h-12 text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Sesi Penjualan Belum Dimulai</h3>
                            <p className="text-slate-400 mb-6 max-w-xs text-sm">
                                Untuk keamanan dan pencatatan yang akurat, silakan mulai sesi baru dan masukkan modal awal kasir.
                            </p>
                            <Button onClick={() => setStartSessionModalOpen(true)} variant="primary" size="lg">
                                Mulai Sesi Sekarang
                            </Button>
                        </div>
                    ) : (
                        <>
                            {sessionSettings.enabled && session && (
                                <div className="flex items-center gap-2 mb-4 bg-slate-800 p-2 rounded-lg border border-slate-700 overflow-x-auto">
                                    <Button variant="secondary" size="sm" onClick={() => setHistoryModalOpen(true)} className="border-none bg-slate-700 hover:bg-slate-600">
                                        <Icon name="book" className="w-4 h-4" /> Riwayat
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => setCashMgmtOpen(true)} className="border-none bg-slate-700 hover:bg-slate-600">
                                        <Icon name="finance" className="w-4 h-4" /> Kas
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => setSendReportModalOpen(true)} className="border-none bg-slate-700 hover:bg-slate-600">
                                        <Icon name="chat" className="w-4 h-4" /> Laporan
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => setEndSessionModalOpen(true)} className="border-none bg-red-900/30 hover:bg-red-900/50 text-red-300 ml-auto">
                                        <Icon name="logout" className="w-4 h-4" /> Tutup
                                    </Button>
                                </div>
                            )}

                            <ProductBrowser 
                                onProductClick={handleProductClick}
                                isSessionLocked={isSessionLocked}
                                onOpenScanner={() => setBarcodeScannerOpen(true)}
                                onOpenRestock={() => setStaffRestockOpen(true)}
                                onOpenOpname={() => setIsOpnameOpen(true)}
                            />
                        </>
                    )}
                </div>
                
                <div className={`h-full ${mobileTab === 'products' ? 'hidden md:block' : 'block'}`}>
                    <CartSidebar 
                        isSessionLocked={isSessionLocked}
                        onOpenDiscountModal={handleOpenDiscountModal}
                        onOpenCartDiscountModal={() => setCartDiscountModalOpen(true)}
                        onOpenRewardModal={() => selectedCustomer ? setRewardsModalOpen(true) : showAlert({type: 'alert', title: 'Pilih Pelanggan', message: 'Silakan pilih pelanggan.'})}
                        onOpenPaymentModal={() => setPaymentModalOpen(true)}
                        onOpenNameModal={(cart) => { setCartToRename(cart); setNameModalOpen(true); }}
                        onQuickPay={handleQuickPay}
                        selectedCustomer={selectedCustomer}
                        setSelectedCustomer={setSelectedCustomer}
                        onOpenCustomerForm={() => setCustomerModalOpen(true)}
                        onSplitBill={() => {
                            if(cart.length > 0) setSplitBillModalOpen(true);
                            else showAlert({type: 'alert', title: 'Keranjang Kosong', message: 'Tidak ada item untuk dipisah.'});
                        }}
                    />
                </div>
            </div>
            
            {isPaymentModalOpen && (
                <PaymentModal 
                    isOpen={isPaymentModalOpen} 
                    onClose={() => setPaymentModalOpen(false)} 
                    onConfirm={handleSaveTransaction}
                    total={finalTotal}
                    selectedCustomer={selectedCustomer}
                />
            )}
            
            <CashManagementModal isOpen={isCashMgmtOpen} onClose={() => setCashMgmtOpen(false)} />
            
            {isHistoryModalOpen && <SessionHistoryModal 
                isOpen={isHistoryModalOpen} 
                onClose={() => setHistoryModalOpen(false)} 
                onViewReceipt={(t: TransactionType) => { setReceiptToView(t); setReceiptModalOpen(true); }}
                onRefund={handleRefundTransaction}
            />}

            {(lastTransaction || receiptToView) && (
                <ReceiptModal 
                    isOpen={isReceiptModalOpen} 
                    onClose={() => { setReceiptModalOpen(false); setReceiptToView(null); }} 
                    transaction={receiptToView || lastTransaction!}
                />
            )}

            <BarcodeScannerModal isOpen={isBarcodeScannerOpen} onClose={() => setBarcodeScannerOpen(false)} onScan={handleBarcodeScan} />
            {selectedCustomer && <RewardsModal isOpen={isRewardsModalOpen} onClose={() => setRewardsModalOpen(false)} customer={selectedCustomer} />}
            <NameCartModal isOpen={isNameModalOpen} onClose={() => setNameModalOpen(false)} onSave={handleSaveName} currentName={cartToRename?.name}/>
            <DiscountModal
                isOpen={!!discountingItem}
                onClose={() => setDiscountingItem(null)}
                title={`Diskon untuk ${discountingItem?.name}`}
                initialDiscount={discountingItem?.discount || null}
                onSave={(discount) => discountingItem && applyItemDiscount(discountingItem.cartItemId, discount)}
                onRemove={() => discountingItem && removeItemDiscount(discountingItem.cartItemId)}
            />
             <DiscountModal
                isOpen={isCartDiscountModalOpen}
                onClose={() => setCartDiscountModalOpen(false)}
                title="Diskon Keranjang"
                initialDiscount={cartDiscount}
                onSave={applyCartDiscount}
                onRemove={removeCartDiscount}
            />
            <VariantModal
                isOpen={isVariantModalOpen}
                onClose={() => { setVariantModalOpen(false); setProductForVariant(null); }}
                product={productForVariant}
                onSelect={handleVariantSelect}
            />
            <AddonModal
                isOpen={isAddonModalOpen}
                onClose={() => { setAddonModalOpen(false); setProductForAddons(null); setSelectedVariantForAddons(null); }}
                product={productForAddons}
                variant={selectedVariantForAddons}
                onConfirm={handleAddonConfirm}
            />
            <ModifierModal
                isOpen={isModifierModalOpen}
                onClose={() => { setModifierModalOpen(false); setProductForModifier(null); }}
                product={productForModifier}
                onConfirm={handleModifierConfirm}
            />
            <SplitBillModal 
                isOpen={isSplitBillModalOpen}
                onClose={() => setSplitBillModalOpen(false)}
                cartItems={cart}
                onConfirm={handleSplitBill}
            />

            {transactionForKitchenNote && (
                <KitchenNoteModal
                    isOpen={!!transactionForKitchenNote}
                    onClose={() => setTransactionForKitchenNote(null)}
                    transaction={transactionForKitchenNote}
                />
            )}
            
            <CustomerFormModal 
                isOpen={isCustomerModalOpen} 
                onClose={() => setCustomerModalOpen(false)} 
                onSave={handleSaveCustomer} 
                customer={null} 
            />
            <StaffRestockModal isOpen={isStaffRestockOpen} onClose={() => setStaffRestockOpen(false)} />
            <StockOpnameModal isOpen={isOpnameOpen} onClose={() => setIsOpnameOpen(false)} initialTab="product" />

            <Modal isOpen={isStartSessionModalOpen} onClose={() => setStartSessionModalOpen(false)} title="Mulai Sesi Penjualan">
                <div className="space-y-4">
                    <p className="text-slate-300">Masukkan jumlah uang tunai awal (modal) yang tersedia di laci kasir.</p>
                    <div>
                        <label htmlFor="startingCashPOS" className="block text-sm font-medium text-slate-300 mb-1">Uang Awalan (IDR)</label>
                        <input
                            id="startingCashPOS"
                            type="number"
                            min="0"
                            value={startingCashInput}
                            onChange={(e) => setStartingCashInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                    <Button onClick={handleStartSession} className="w-full py-3">
                        Mulai Sesi
                    </Button>
                </div>
            </Modal>

            {session && (
                <EndSessionModal
                    isOpen={isEndSessionModalOpen}
                    onClose={() => setEndSessionModalOpen(false)}
                    sessionSales={sessionSummary.cashSales}
                    startingCash={session.startingCash}
                    cashIn={sessionSummary.cashIn}
                    cashOut={sessionSummary.cashOut}
                />
            )}

            <SendReportModal
                isOpen={isSendReportModalOpen}
                onClose={() => setSendReportModalOpen(false)}
                data={sessionTransactions}
                adminWhatsapp={receiptSettings.adminWhatsapp}
                adminTelegram={receiptSettings.adminTelegram}
                startingCash={session?.startingCash || 0}
                cashIn={sessionSummary.cashIn}
                cashOut={sessionSummary.cashOut}
            />
        </div>
    );
};

export default POSView;

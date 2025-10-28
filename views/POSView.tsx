import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Product, CartItem as CartItemType, Transaction, Customer, Reward, Payment, PaymentMethod, HeldCart, Discount, Addon, DiscountDefinition } from '../types';
import ProductCard from '../components/ProductCard';
import CartItemComponent from '../components/CartItem';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import ReceiptModal from '../components/ReceiptModal';
import { CURRENCY_FORMATTER } from '../constants';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { useCameraAvailability } from '../hooks/useCameraAvailability';
import ProductPlaceholder from '../components/ProductPlaceholder';
import KitchenNoteModal from '../components/KitchenNoteModal';

// --- Addon Modal ---
const AddonModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onConfirm: (selectedAddons: Addon[]) => void;
}> = ({ isOpen, onClose, product, onConfirm }) => {
    const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedAddons([]);
        }
    }, [isOpen]);

    if (!isOpen || !product || !product.addons) return null;

    const handleToggleAddon = (addon: Addon) => {
        setSelectedAddons(prev =>
            prev.find(a => a.id === addon.id)
                ? prev.filter(a => a.id !== addon.id)
                : [...prev, addon]
        );
    };

    const totalAddonPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const totalItemPrice = product.price + totalAddonPrice;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pilih Add-on untuk ${product.name}`}>
            <div className="space-y-3 max-h-64 overflow-y-auto">
                {product.addons.map(addon => {
                    const isSelected = !!selectedAddons.find(a => a.id === addon.id);
                    return (
                        <label key={addon.id} className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-[#347758]/30 border border-[#347758]' : 'bg-slate-700 border border-transparent'}`}>
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleAddon(addon)}
                                className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-[#347758] focus:ring-[#347758]"
                            />
                            <span className="ml-3 flex-1 text-slate-200">{addon.name}</span>
                            <span className="text-slate-300">{CURRENCY_FORMATTER.format(addon.price)}</span>
                        </label>
                    );
                })}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700 space-y-4">
                <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-white">Total Harga Item</span>
                    <span className="font-bold text-[#52a37c]">{CURRENCY_FORMATTER.format(totalItemPrice)}</span>
                </div>
                <Button onClick={() => onConfirm(selectedAddons)} className="w-full text-lg py-3">
                    Tambah ke Keranjang
                </Button>
            </div>
        </Modal>
    );
};


// --- New Components for Held Carts Feature ---

const NameCartModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onSave: (name: string) => void,
    currentName?: string
}> = ({ isOpen, onClose, onSave, currentName = '' }) => {
    const [name, setName] = useState('');
    useEffect(() => {
        if (isOpen) setName(currentName);
    }, [isOpen, currentName]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={currentName ? "Ganti Nama Pesanan" : "Simpan Pesanan"}>
            <div className="space-y-4">
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="cth: Meja 5, Bawa Pulang"
                    className="w-full bg-slate-700 p-2 rounded-md text-white"
                    autoFocus
                />
                <Button onClick={handleSave} className="w-full">Simpan</Button>
            </div>
        </Modal>
    );
};

const HeldCartsTabs: React.FC<{
    onSwitch: (cartId: string | null) => void;
}> = ({ onSwitch }) => {
    const { heldCarts, activeHeldCartId } = useAppContext();

    return (
        <div className="mb-4 -mx-4 px-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                 <button 
                    onClick={() => onSwitch(null)} 
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors
                        ${activeHeldCartId === null 
                            ? 'bg-[#347758] text-white font-semibold' 
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`
                    }
                >
                    <Icon name="plus" className="w-4 h-4" />
                    Pesanan Baru
                </button>
                {heldCarts.map(cart => (
                    <button 
                        key={cart.id} 
                        onClick={() => onSwitch(cart.id)}
                        className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-lg transition-colors
                             ${activeHeldCartId === cart.id 
                                ? 'bg-[#347758] text-white font-semibold' 
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`
                        }
                    >
                        {cart.name}
                    </button>
                ))}
            </div>
        </div>
    );
}


// Payment Modal Component
const PaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payments: Array<Omit<Payment, 'id' | 'createdAt'>>, customerDetails: { customerId?: string, customerName?: string, customerContact?: string }) => void;
    total: number;
    selectedCustomer: Customer | null;
}> = ({ isOpen, onClose, onConfirm, total, selectedCustomer }) => {
    const [payments, setPayments] = useState<Array<Omit<Payment, 'id' | 'createdAt'>>>([]);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [tempCustomerName, setTempCustomerName] = useState('');
    const [tempCustomerContact, setTempCustomerContact] = useState('');


    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    const change = totalPaid - total;
    
    const isConfirmDisabled = useMemo(() => {
        const isPaymentSufficient = totalPaid >= total;
        if (isPaymentSufficient) return false;
        if (selectedCustomer) return false;
        if (tempCustomerName.trim() !== '') return false;
        return true;
    }, [totalPaid, total, selectedCustomer, tempCustomerName]);


    const addPayment = (method: PaymentMethod) => {
        const amount = parseFloat(paymentAmount);
        if (amount > 0) {
            setPayments(prev => [...prev, { method, amount }]);
            setPaymentAmount('');
        }
    };

    const handleConfirm = () => {
        let customerDetails: { customerId?: string; customerName?: string; customerContact?: string } = {};
        if (selectedCustomer) {
            customerDetails = {
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                customerContact: selectedCustomer.contact,
            };
        } else if (tempCustomerName.trim()) {
            customerDetails = {
                customerName: tempCustomerName.trim(),
                customerContact: tempCustomerContact.trim(),
            }
        }
        
        onConfirm(payments, customerDetails);
        resetState();
    };

    const resetState = () => {
        setPayments([]);
        setPaymentAmount('');
        setTempCustomerName('');
        setTempCustomerContact('');
    }

    const handleClose = () => {
        resetState();
        onClose();
    };

    const quickCashValues = [10000, 20000, 50000, 100000];

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Pembayaran">
            <div className="space-y-4">
                <div className="text-center bg-slate-900 p-4 rounded-lg">
                    <p className="text-slate-400">Total Tagihan</p>
                    <p className="text-4xl font-bold text-[#52a37c]">{CURRENCY_FORMATTER.format(total)}</p>
                </div>

                {selectedCustomer ? (
                     <div className="bg-slate-700 p-3 rounded-lg text-center">
                        <p className="text-sm text-slate-300">Pelanggan</p>
                        <p className="font-bold text-lg text-white">{selectedCustomer.name}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                         <input
                            type="text"
                            value={tempCustomerName}
                            onChange={e => setTempCustomerName(e.target.value)}
                            placeholder="Nama Pelanggan (Opsional)"
                            className="w-full bg-slate-700 p-2 rounded-md"
                         />
                         <input
                            type="text"
                            value={tempCustomerContact}
                            onChange={e => setTempCustomerContact(e.target.value)}
                            placeholder="Kontak (Opsional)"
                            className="w-full bg-slate-700 p-2 rounded-md"
                         />
                    </div>
                )}
                
                <div className="flex justify-between items-center text-lg">
                    <span className="text-slate-300">Total Dibayar:</span>
                    <span className="font-semibold text-green-400">{CURRENCY_FORMATTER.format(totalPaid)}</span>
                </div>
                 <div className="flex justify-between items-center text-lg">
                    <span className="text-slate-300">Kembalian:</span>
                    <span className="font-semibold text-yellow-400">{CURRENCY_FORMATTER.format(change > 0 ? change : 0)}</span>
                </div>

                <div className="space-y-2">
                    {payments.map((p, i) => (
                        <div key={i} className="flex justify-between p-2 bg-slate-700 rounded-md">
                            <span>Pembayaran {i+1} ({p.method === 'cash' ? 'Tunai' : 'Non-Tunai'})</span>
                            <span>{CURRENCY_FORMATTER.format(p.amount)}</span>
                        </div>
                    ))}
                </div>

                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Masukkan jumlah bayar" className="w-full bg-slate-700 p-3 text-xl text-center rounded-md" />
                
                <div className="grid grid-cols-4 gap-2 text-sm">
                    {quickCashValues.map(val => (
                        <Button key={val} variant="secondary" onClick={() => setPaymentAmount(String(val))}>
                            {val/1000}rb
                        </Button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => addPayment('cash')} disabled={!paymentAmount}>Tunai</Button>
                    <Button onClick={() => addPayment('non-cash')} disabled={!paymentAmount}>Non-Tunai</Button>
                </div>

                <Button variant="primary" onClick={handleConfirm} disabled={isConfirmDisabled} className="w-full text-lg py-3 mt-4">
                    Selesaikan Transaksi
                </Button>
            </div>
        </Modal>
    );
};

const RewardsModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    customer: Customer,
}> = ({ isOpen, onClose, customer }) => {
    const { membershipSettings, applyRewardToCart } = useAppContext();
    
    const availableRewards = useMemo(() =>
        membershipSettings.rewards.filter(r => r.pointsCost <= customer.points)
    , [membershipSettings.rewards, customer.points]);

    const handleApply = (reward: Reward) => {
        applyRewardToCart(reward, customer);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pilih Reward untuk ${customer.name}`}>
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {availableRewards.length > 0 ? availableRewards.map(reward => (
                    <div key={reward.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                        <div>
                            <p className="font-semibold">{reward.name}</p>
                            <p className="text-sm text-yellow-400">{reward.pointsCost} Poin</p>
                        </div>
                        <Button size="sm" onClick={() => handleApply(reward)}>Terapkan</Button>
                    </div>
                )) : (
                    <p className="text-center text-slate-400 py-8">
                        Poin pelanggan tidak cukup untuk menukar reward apapun.
                    </p>
                )}
            </div>
        </Modal>
    );
};

// A more generic Discount Modal
const DiscountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (discount: Discount) => void;
    onRemove?: () => void;
    initialDiscount: Discount | null;
    title: string;
}> = ({ isOpen, onClose, onSave, onRemove, initialDiscount, title }) => {
    const { discountDefinitions } = useAppContext();
    const [mode, setMode] = useState<'select' | 'manual'>('select');
    const [manualType, setManualType] = useState<'percentage' | 'amount'>('percentage');
    const [manualValue, setManualValue] = useState('');

    const activeDiscounts = useMemo(() => {
        const now = new Date();
        return (discountDefinitions || []).filter(d => {
            if (!d.isActive) return false;
            const startDate = d.startDate ? new Date(d.startDate) : null;
            const endDate = d.endDate ? new Date(d.endDate) : null;
            if (startDate && startDate > now) return false;
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                if (endOfDay < now) return false;
            }
            return true;
        });
    }, [discountDefinitions]);

    useEffect(() => {
        if (isOpen) {
            // If there's an initial discount that is NOT from a definition, switch to manual mode
            if (initialDiscount && !initialDiscount.discountId) {
                setMode('manual');
                setManualType(initialDiscount.type);
                setManualValue(String(initialDiscount.value));
            } else {
                setMode(activeDiscounts.length > 0 ? 'select' : 'manual');
                setManualType('percentage');
                setManualValue('');
            }
        }
    }, [initialDiscount, isOpen, activeDiscounts.length]);
    
    if (!isOpen) return null;

    const handleSelectDiscount = (def: DiscountDefinition) => {
        onSave({
            discountId: def.id,
            name: def.name,
            type: def.type,
            value: def.value,
        });
        onClose();
    };

    const handleSaveManual = () => {
        const discountValue = parseFloat(manualValue);
        if (!isNaN(discountValue) && discountValue >= 0) {
            onSave({ type: manualType, value: discountValue, name: 'Diskon Manual' });
            onClose();
        }
    };
    
    const handleRemove = () => {
        if (onRemove) {
            onRemove();
        }
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setMode('select')} disabled={activeDiscounts.length === 0} className={`flex-1 py-1 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'select' ? 'bg-[#347758] text-white font-semibold' : 'text-slate-300'}`}>Pilih Diskon</button>
                    <button onClick={() => setMode('manual')} className={`flex-1 py-1 text-sm rounded-md transition-colors ${mode === 'manual' ? 'bg-[#347758] text-white font-semibold' : 'text-slate-300'}`}>Diskon Manual</button>
                </div>

                {mode === 'select' && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {activeDiscounts.map(d => (
                            <button key={d.id} onClick={() => handleSelectDiscount(d)} className={`w-full text-left p-3 rounded-lg transition-colors ${initialDiscount?.discountId === d.id ? 'bg-[#347758]/50 ring-2 ring-[#347758]' : 'bg-slate-900 hover:bg-slate-700'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-white">{d.name}</span>
                                    <span className="text-sm font-bold text-[#7ac0a0]">{d.type === 'percentage' ? `${d.value}%` : CURRENCY_FORMATTER.format(d.value)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                
                {mode === 'manual' && (
                    <div className="space-y-3 pt-2">
                        <div className="flex bg-slate-900 p-1 rounded-lg">
                            <button onClick={() => setManualType('percentage')} className={`flex-1 py-1 text-sm rounded-md transition-colors ${manualType === 'percentage' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Persentase (%)</button>
                            <button onClick={() => setManualType('amount')} className={`flex-1 py-1 text-sm rounded-md transition-colors ${manualType === 'amount' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Jumlah (Rp)</button>
                        </div>
                        <input
                            type="number"
                            value={manualValue}
                            onChange={e => setManualValue(e.target.value)}
                            placeholder={manualType === 'percentage' ? 'cth: 10' : 'cth: 5000'}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            autoFocus
                        />
                    </div>
                )}

                <div className="flex justify-between items-center gap-2 pt-4 border-t border-slate-700">
                    <div>
                        {initialDiscount && onRemove && <Button variant="danger" onClick={handleRemove}>Hapus Diskon</Button>}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>Batal</Button>
                        {mode === 'manual' && <Button onClick={handleSaveManual} disabled={!manualValue}>Terapkan</Button>}
                    </div>
                </div>
            </div>
        </Modal>
    );
};


const CustomerSelection: React.FC<{
    selectedCustomer: Customer | null;
    onSelectCustomer: (customer: Customer | null) => void;
}> = ({ selectedCustomer, onSelectCustomer }) => {
    const { customers, membershipSettings } = useAppContext();
    if (!membershipSettings.enabled) return null;

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Pelanggan</label>
            <select 
                value={selectedCustomer?.id || ''}
                onChange={(e) => onSelectCustomer(customers.find(c => c.id === e.target.value) || null)}
                className="w-full bg-slate-700 p-2 rounded-md text-sm"
            >
                <option value="">Umum</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.points} poin)</option>)}
            </select>
        </div>
    );
}

const ProductListItem: React.FC<{
  product: Product;
  onClick: () => void;
  availability: { available: boolean; reason: string };
}> = ({ product, onClick, availability }) => {
  const { available, reason } = availability;
  return (
    <button
      onClick={onClick}
      disabled={!available}
      className="w-full flex items-center gap-4 p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 relative focus:outline-none focus:ring-2 focus:ring-[#347758] focus:ring-offset-2 focus:ring-offset-slate-900"
    >
        {!available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded-lg">
            <span className="text-white font-bold">{reason}</span>
            </div>
        )}
        {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
        ) : (
            <div className="w-12 h-12 rounded-md flex-shrink-0">
                <ProductPlaceholder productName={product.name} size="small" className="w-full h-full" />
            </div>
        )}
        <div className="flex-1 text-left min-w-0">
            <p className="font-semibold text-slate-100 truncate">{product.name}</p>
            <p className="text-xs text-slate-400 truncate">{product.category.join(', ')}</p>
        </div>
        <p className="font-semibold text-slate-300">{CURRENCY_FORMATTER.format(product.price)}</p>
    </button>
  );
};

const POSView: React.FC = () => {
    const { 
        products, categories, addToCart, addConfiguredItemToCart, cart, getCartTotals, clearCart, saveTransaction, 
        findProductByBarcode, isProductAvailable, membershipSettings, appliedReward, removeRewardFromCart, showAlert,
        sessionSettings, heldCarts, activeHeldCartId, switchActiveCart, holdActiveCart, deleteHeldCart, updateHeldCartName,
        transactions, applyItemDiscount, removeItemDiscount,
        cartDiscount, applyCartDiscount, removeCartDiscount, receiptSettings
    } = useAppContext();
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [searchTerm, setSearchTerm] = useState('');
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
    const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
    const [isBarcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isRewardsModalOpen, setRewardsModalOpen] = useState(false);
    const isCameraAvailable = useCameraAvailability();

    const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');
    const [isNameModalOpen, setNameModalOpen] = useState(false);
    const [cartToRename, setCartToRename] = useState<HeldCart | null>(null);
    const [discountingItem, setDiscountingItem] = useState<CartItemType | null>(null);
    const [isCartDiscountModalOpen, setCartDiscountModalOpen] = useState(false);

    const [isAddonModalOpen, setAddonModalOpen] = useState(false);
    const [productForAddons, setProductForAddons] = useState<Product | null>(null);
    const [transactionForKitchenNote, setTransactionForKitchenNote] = useState<Transaction | null>(null);


    useEffect(() => {
        if (!selectedCustomer && appliedReward) {
            removeRewardFromCart();
        }
    }, [selectedCustomer, appliedReward, removeRewardFromCart]);
    
    const handleClearCart = () => {
        clearCart();
        setSelectedCustomer(null);
    }

    const handleProductClick = (product: Product) => {
        if (product.addons && product.addons.length > 0) {
            setProductForAddons(product);
            setAddonModalOpen(true);
        } else {
            addToCart(product);
        }
    };

    const handleAddonConfirm = (selectedAddons: Addon[]) => {
        if (productForAddons) {
            addConfiguredItemToCart(productForAddons, selectedAddons);
        }
        setAddonModalOpen(false);
        setProductForAddons(null);
    };

    const bestSellingProductIds = useMemo(() => {
        const sales = new Map<string, number>();
        transactions.forEach(t => {
            t.items.forEach(item => {
                if (!item.isReward) {
                    sales.set(item.id, (sales.get(item.id) || 0) + item.quantity);
                }
            });
        });
        return Array.from(sales.entries())
            .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
            .slice(0, 10)
            .map(([id]) => id);
    }, [transactions]);

    const filteredProducts = useMemo(() => {
        let initialFilter: Product[] = [];

        if (activeCategory === '__FAVORITES__') {
            initialFilter = products.filter(p => p.isFavorite);
        } else if (activeCategory === '__BEST_SELLING__') {
            initialFilter = bestSellingProductIds
                .map(id => products.find(p => p.id === id))
                .filter((p): p is Product => p !== undefined);
        } else if (activeCategory === 'Semua') {
            initialFilter = products;
        } else {
            initialFilter = products.filter(p => p.category.includes(activeCategory));
        }

        return initialFilter.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, activeCategory, searchTerm, bestSellingProductIds]);
    
    const { subtotal, itemDiscountAmount, cartDiscountAmount, finalTotal } = getCartTotals();
    
    const handleSaveTransaction = useCallback((payments: Array<Omit<Payment, 'id' | 'createdAt'>>, customerDetails: { customerId?: string, customerName?: string, customerContact?: string }) => {
        try {
            const newTransaction = saveTransaction({ payments, ...customerDetails });
            
            if (newTransaction.paymentStatus !== 'paid' && customerDetails.customerName && !customerDetails.customerId) {
                 showAlert({
                    type: 'alert',
                    title: 'Transaksi Utang Disimpan',
                    message: `Transaksi utang untuk "${customerDetails.customerName}" telah disimpan. Disarankan untuk menambahkan pelanggan ini ke daftar (di menu Keuangan) agar mudah dilacak.`,
                });
            }

            setLastTransaction(newTransaction);
            setPaymentModalOpen(false);
            setReceiptModalOpen(true);

            if (receiptSettings.enableKitchenPrinter) {
                setTransactionForKitchenNote(newTransaction);
            }

            setSelectedCustomer(null);
        } catch (error) {
            console.error(error);
            showAlert({type: 'alert', title: 'Error', message: 'Gagal menyimpan transaksi.'});
        }
    }, [saveTransaction, showAlert, receiptSettings.enableKitchenPrinter]);

    const handleQuickPay = useCallback((paymentAmount: number) => {
        if (cart.length === 0) return;

        const amount = paymentAmount;

        if (amount < finalTotal - 0.01) { // Add tolerance for float issues
            showAlert({
                type: 'alert',
                title: 'Pembayaran Kurang',
                message: `Jumlah pembayaran cepat (${CURRENCY_FORMATTER.format(amount)}) tidak mencukupi total tagihan (${CURRENCY_FORMATTER.format(finalTotal)}).`
            });
            return;
        }

        const payments = [{ method: 'cash' as PaymentMethod, amount }];
        
        let customerDetails: { customerId?: string; customerName?: string; customerContact?: string } = {};
        if (selectedCustomer) {
            customerDetails = {
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                customerContact: selectedCustomer.contact,
            };
        }

        try {
            const newTransaction = saveTransaction({ payments, ...customerDetails });
            
            setLastTransaction(newTransaction);
            setPaymentModalOpen(false); // Ensure it's closed
            setReceiptModalOpen(true);

            if (receiptSettings.enableKitchenPrinter) {
                setTransactionForKitchenNote(newTransaction);
            }

            setSelectedCustomer(null);
        } catch (error) {
            console.error(error);
            showAlert({type: 'alert', title: 'Error', message: 'Gagal menyimpan transaksi.'});
        }
    }, [cart.length, finalTotal, saveTransaction, showAlert, selectedCustomer, receiptSettings.enableKitchenPrinter]);

    
    const handleBarcodeScan = useCallback((barcode: string) => {
        const product = findProductByBarcode(barcode);
        if (product) {
            handleProductClick(product);
        } else {
            showAlert({type: 'alert', title: 'Produk Tidak Ditemukan', message: `Tidak ada produk dengan barcode: ${barcode}`});
        }
        setBarcodeScannerOpen(false);
    }, [findProductByBarcode, showAlert]);

    const switchCart = (cartId: string | null) => {
        switchActiveCart(cartId);
        setSelectedCustomer(null);
    };

    const handleSaveName = (name: string) => {
        if (cartToRename) {
            updateHeldCartName(cartToRename.id, name);
            setCartToRename(null);
        } else {
            holdActiveCart(name);
        }
        setNameModalOpen(false);
    };

    const handleOpenRewardModal = () => {
        if (!selectedCustomer) {
            showAlert({type: 'alert', title: 'Pilih Pelanggan', message: 'Silakan pilih pelanggan terlebih dahulu untuk menukar poin.'});
            return;
        }
        setRewardsModalOpen(true);
    };

    const handleOpenDiscountModal = (cartItemId: string) => {
        const item = cart.find(i => i.cartItemId === cartItemId && !i.isReward);
        if (item) {
            setDiscountingItem(item);
        }
    };

    const quickPayAmounts = [20000, 50000, 100000];

    const CartActions = () => {
        if (!sessionSettings.enableCartHolding) return null;

        if (activeHeldCartId === null) {
            return (
                 <Button onClick={() => setNameModalOpen(true)} disabled={cart.length === 0} variant="secondary">
                    <Icon name="plus" className="w-4 h-4"/> Simpan Pesanan
                </Button>
            );
        }
        
        const currentCart = heldCarts.find(c => c.id === activeHeldCartId);
        if (!currentCart) return null;

        return (
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setCartToRename(currentCart); setNameModalOpen(true); }}>
                    <Icon name="edit" className="w-4 h-4"/> Ganti Nama
                </Button>
                <Button variant="danger" onClick={() => deleteHeldCart(currentCart.id)}>
                    <Icon name="trash" className="w-4 h-4"/> Hapus Pesanan
                </Button>
            </div>
        );
    };


    return (
        <div className="flex flex-col md:flex-row h-full gap-6">
            {/* Products & Tables Section */}
            <div className="flex flex-col min-w-0 md:flex-1 h-[55%] md:h-full">
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                         <input
                            type="text"
                            placeholder="Cari produk..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-[#347758] focus:border-[#347758]"
                        />
                         <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            onClick={() => setBarcodeScannerOpen(true)}
                            disabled={!isCameraAvailable}
                            title={isCameraAvailable ? "Pindai Barcode Produk" : "Tidak ada kamera terdeteksi"}
                        >
                            <Icon name="barcode" className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
                
                <>
                    <div className="flex items-center justify-between gap-4 pb-3 mb-2">
                         <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4">
                            <button onClick={() => setActiveCategory('Semua')} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full ${activeCategory === 'Semua' ? 'bg-[#347758] text-white' : 'bg-slate-700 text-slate-300'}`}>Semua</button>
                            <button onClick={() => setActiveCategory('__FAVORITES__')} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full flex items-center gap-1 transition-colors ${activeCategory === '__FAVORITES__' ? 'bg-[#347758] text-white' : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40'}`}>
                                ⭐ Favorit
                            </button>
                            <button onClick={() => setActiveCategory('__BEST_SELLING__')} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full flex items-center gap-1 transition-colors ${activeCategory === '__BEST_SELLING__' ? 'bg-[#347758] text-white' : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/40'}`}>
                                🔥 Terlaris
                            </button>
                            {categories.map(cat => (
                                <button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full ${activeCategory === cat ? 'bg-[#347758] text-white' : 'bg-slate-700 text-slate-300'}`}>{cat}</button>
                            ))}
                        </div>
                        <div className="flex items-center bg-slate-700 rounded-lg p-1">
                            <button onClick={() => setProductViewMode('grid')} className={`p-1 rounded-md ${productViewMode === 'grid' ? 'bg-[#347758]' : 'text-slate-400'}`}><Icon name="products" className="w-4 h-4"/></button>
                            <button onClick={() => setProductViewMode('list')} className={`p-1 rounded-md ${productViewMode === 'list' ? 'bg-[#347758]' : 'text-slate-400'}`}><Icon name="menu" className="w-4 h-4"/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                        {productViewMode === 'grid' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {filteredProducts.map(product => (
                                <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} availability={isProductAvailable(product)} />
                                ))}
                            </div>
                        ) : (
                             <div className="space-y-2">
                                {filteredProducts.map(product => (
                                    <ProductListItem key={product.id} product={product} onClick={() => handleProductClick(product)} availability={isProductAvailable(product)} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            </div>
            
            {/* Cart Section */}
            <div className="w-full md:w-96 lg:w-[420px] bg-slate-800 rounded-xl shadow-2xl flex flex-col p-4 flex-shrink-0 h-[45%] md:h-full">
                {sessionSettings.enabled && sessionSettings.enableCartHolding && <HeldCartsTabs onSwitch={switchCart} />}
                
                <h2 className="text-xl font-bold mb-2">Keranjang</h2>
                
                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                        <Icon name="cash" className="w-16 h-16 mb-4"/>
                        <p>Keranjang masih kosong</p>
                        <p className="text-sm">Ketuk produk untuk menambahkannya</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2 divide-y divide-slate-700">
                           {cart.map(item => <CartItemComponent key={item.cartItemId} item={item} onOpenDiscountModal={handleOpenDiscountModal}/>)}
                        </div>
                        <div className="border-t border-slate-700 pt-3 mt-auto space-y-3">
                            <CustomerSelection selectedCustomer={selectedCustomer} onSelectCustomer={setSelectedCustomer} />
                            
                            <div className="flex gap-2">
                                {membershipSettings.enabled && (
                                    <Button variant="secondary" size="sm" onClick={handleOpenRewardModal} disabled={!selectedCustomer}>
                                        <Icon name="award" className="w-4 h-4"/> Tukar Poin
                                    </Button>
                                )}
                                <Button variant="secondary" size="sm" onClick={() => setCartDiscountModalOpen(true)}>
                                    <Icon name="tag" className="w-4 h-4"/> Diskon Keranjang
                                </Button>
                            </div>

                             <div className="space-y-1 text-sm">
                                <div className="flex justify-between text-slate-400">
                                    <span>Subtotal</span>
                                    <span>{CURRENCY_FORMATTER.format(subtotal)}</span>
                                </div>
                                {(itemDiscountAmount > 0 || cartDiscountAmount > 0) && (
                                    <div className="flex justify-between text-green-400">
                                        <span>
                                            Total Diskon
                                            {cartDiscount?.name && <span className="text-xs block">({cartDiscount.name})</span>}
                                        </span>
                                        <span>- {CURRENCY_FORMATTER.format(itemDiscountAmount + cartDiscountAmount)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between font-bold text-xl text-white">
                                <span>TOTAL</span>
                                <span>{CURRENCY_FORMATTER.format(finalTotal)}</span>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 pt-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleQuickPay(finalTotal)}
                                    disabled={cart.length === 0}
                                    title="Bayar dengan uang pas"
                                >
                                    Uang Pas
                                </Button>
                                {quickPayAmounts.map(amount => (
                                    <Button
                                        key={amount}
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleQuickPay(amount)}
                                        disabled={cart.length === 0 || finalTotal > amount}
                                    >
                                        {amount / 1000}rb
                                    </Button>
                                ))}
                            </div>


                            <div className="flex gap-3">
                                <Button variant="danger" className="flex-1" onClick={handleClearCart} disabled={cart.length === 0}>
                                    <Icon name="trash" className="w-4 h-4"/> Bersihkan
                                </Button>
                                <Button variant="primary" className="flex-1 text-lg" onClick={() => setPaymentModalOpen(true)} disabled={cart.length === 0}>
                                    Bayar
                                </Button>
                            </div>
                            
                            <div className="text-center pt-2">
                              <CartActions />
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setPaymentModalOpen(false)} 
                onConfirm={handleSaveTransaction}
                total={finalTotal}
                selectedCustomer={selectedCustomer}
            />
            {lastTransaction && <ReceiptModal isOpen={isReceiptModalOpen} onClose={() => setReceiptModalOpen(false)} transaction={lastTransaction}/>}
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
            <AddonModal
                isOpen={isAddonModalOpen}
                onClose={() => setAddonModalOpen(false)}
                product={productForAddons}
                onConfirm={handleAddonConfirm}
            />
            {transactionForKitchenNote && (
                <KitchenNoteModal
                    isOpen={!!transactionForKitchenNote}
                    onClose={() => setTransactionForKitchenNote(null)}
                    transaction={transactionForKitchenNote}
                />
            )}
        </div>
    );
};

export default POSView;
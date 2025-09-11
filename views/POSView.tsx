import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Product, CartItem as CartItemType, Transaction, Customer, Reward, Payment, PaymentMethod, HeldCart } from '../types';
import ProductCard from '../components/ProductCard';
import CartItemComponent from '../components/CartItem';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import ReceiptModal from '../components/ReceiptModal';
import { CURRENCY_FORMATTER } from '../constants';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { useCameraAvailability } from '../hooks/useCameraAvailability';

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
                            ? 'bg-sky-500 text-white font-semibold' 
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
                                ? 'bg-sky-500 text-white font-semibold' 
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
    
    // New logic for enabling the confirm button
    const isConfirmDisabled = useMemo(() => {
        const isPaymentSufficient = totalPaid >= total;
        if (isPaymentSufficient) return false; // Always enable if paid in full
        if (selectedCustomer) return false; // Always enable for registered customers
        if (tempCustomerName.trim() !== '') return false; // Enable for anonymous if name is filled for debt tracking
        return true; // Disable otherwise
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
                    <p className="text-4xl font-bold text-sky-400">{CURRENCY_FORMATTER.format(total)}</p>
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

// Customer Selection Component
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


const POSView: React.FC = () => {
    const { 
        products, categories, addToCart, cart, getCartTotal, clearCart, saveTransaction, 
        findProductByBarcode, isProductAvailable, membershipSettings, appliedReward, removeRewardFromCart, showAlert,
        sessionSettings, heldCarts, activeHeldCartId, switchActiveCart, holdActiveCart, deleteHeldCart, updateHeldCartName,
        transactions, customers, addCustomer
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

    // --- State for Held Carts Feature ---
    const [isNameModalOpen, setNameModalOpen] = useState(false);
    const [cartToRename, setCartToRename] = useState<HeldCart | null>(null);

    useEffect(() => {
        // if a customer is deselected, remove any applied reward.
        if (!selectedCustomer && appliedReward) {
            removeRewardFromCart();
        }
    }, [selectedCustomer, appliedReward, removeRewardFromCart]);
    
    const handleClearCart = () => {
        clearCart();
        setSelectedCustomer(null);
    }

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
            .slice(0, 10) // Tampilkan 10 produk terlaris
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
    
    const cartTotal = getCartTotal();
    
    const handleSaveTransaction = useCallback((payments: Array<Omit<Payment, 'id' | 'createdAt'>>, customerDetails: { customerId?: string, customerName?: string, customerContact?: string }) => {
        try {
            const newTransaction = saveTransaction({ payments, ...customerDetails });
            
            // Check for debt on a new, temporary customer to suggest saving them
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
            setSelectedCustomer(null);
        } catch (error) {
            console.error(error);
            showAlert({type: 'alert', title: 'Error', message: 'Gagal menyimpan transaksi.'});
        }
    }, [saveTransaction, showAlert]);
    
    const handleBarcodeScan = useCallback((barcode: string) => {
        const product = findProductByBarcode(barcode);
        if (product) {
            addToCart(product);
        } else {
            showAlert({type: 'alert', title: 'Produk Tidak Ditemukan', message: `Tidak ada produk dengan barcode: ${barcode}`});
        }
        setBarcodeScannerOpen(false);
    }, [findProductByBarcode, addToCart, showAlert]);

    const handleSwitchCart = (cartId: string | null) => {
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
            {/* Products Section */}
            <div className="flex flex-col min-w-0 md:flex-1 h-[55%] md:h-full">
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                         <input
                            type="text"
                            placeholder="Cari produk..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-sky-500 focus:border-sky-500"
                        />
                         <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                     <Button 
                        variant="secondary" 
                        onClick={() => setBarcodeScannerOpen(true)}
                        disabled={!isCameraAvailable}
                        title={isCameraAvailable ? "Pindai Barcode Produk" : "Tidak ada kamera terdeteksi"}
                    >
                        <Icon name="barcode" className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4">
                    <button onClick={() => setActiveCategory('Semua')} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full ${activeCategory === 'Semua' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Semua</button>
                    
                    <button onClick={() => setActiveCategory('__FAVORITES__')} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full flex items-center gap-1 transition-colors ${activeCategory === '__FAVORITES__' ? 'bg-sky-500 text-white' : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40'}`}>
                        ⭐ Favorit
                    </button>
                     <button onClick={() => setActiveCategory('__BEST_SELLING__')} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full flex items-center gap-1 transition-colors ${activeCategory === '__BEST_SELLING__' ? 'bg-sky-500 text-white' : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/40'}`}>
                        🔥 Terlaris
                    </button>

                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-shrink-0 px-3 py-1 text-sm rounded-full ${activeCategory === cat ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{cat}</button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts.map(product => (
                           <ProductCard key={product.id} product={product} onClick={() => addToCart(product)} availability={isProductAvailable(product)} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Cart Section */}
            <div className="w-full md:w-96 bg-slate-800 rounded-lg p-4 flex flex-col flex-shrink-0 h-[45%] md:h-full">
                <h2 className="text-xl font-bold mb-4">Keranjang</h2>

                {sessionSettings.enableCartHolding && <HeldCartsTabs onSwitch={handleSwitchCart} />}
                
                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <Icon name="cash" className="w-16 h-16" />
                        <p>Keranjang kosong</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                        {cart.map(item => <CartItemComponent key={`${item.id}-${item.isReward}`} item={item} />)}
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                    {sessionSettings.enableCartHolding && (
                        <div className="flex justify-center pb-3">
                            <CartActions />
                        </div>
                    )}
                    
                    <CustomerSelection selectedCustomer={selectedCustomer} onSelectCustomer={setSelectedCustomer} />

                    {membershipSettings.enabled && (
                        <div>
                             <Button variant="secondary" onClick={handleOpenRewardModal} className="w-full" disabled={!!appliedReward || !selectedCustomer}>
                                <Icon name="award" className="w-4 h-4" /> Tukar Poin / Reward
                            </Button>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2">
                        <span>Total</span>
                        <span>{CURRENCY_FORMATTER.format(cartTotal)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="danger" onClick={handleClearCart} disabled={cart.length === 0}>
                            <Icon name="trash" className="w-5 h-5"/>
                            Bersihkan
                        </Button>
                         <Button variant="primary" onClick={() => setPaymentModalOpen(true)} disabled={cart.length === 0 || (cart.length === 1 && cart[0].isReward && cart[0].price === 0)}>
                            <Icon name="pay" className="w-5 h-5" />
                            Bayar
                        </Button>
                    </div>
                </div>
            </div>

            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setPaymentModalOpen(false)} 
                onConfirm={handleSaveTransaction} 
                total={cartTotal}
                selectedCustomer={selectedCustomer}
            />
            
            {lastTransaction && <ReceiptModal isOpen={isReceiptModalOpen} onClose={() => setReceiptModalOpen(false)} transaction={lastTransaction} />}
            
            <BarcodeScannerModal isOpen={isBarcodeScannerOpen} onClose={() => setBarcodeScannerOpen(false)} onScan={handleBarcodeScan} />
            
            {isRewardsModalOpen && selectedCustomer && <RewardsModal isOpen={isRewardsModalOpen} onClose={() => setRewardsModalOpen(false)} customer={selectedCustomer} />}

            <NameCartModal 
                isOpen={isNameModalOpen}
                onClose={() => { setNameModalOpen(false); setCartToRename(null); }}
                onSave={handleSaveName}
                currentName={cartToRename?.name}
            />
        </div>
    );
};

export default POSView;
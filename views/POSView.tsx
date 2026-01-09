
import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

// --- Local Modals (Consider moving these to components/pos/modals later for even more modularity) ---

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

// ... (Existing Modals: VariantModal, AddonModal, NameCartModal, CashManagementModal, SessionHistoryModal, PaymentModal, RewardsModal, DiscountModal) ...
// NOTE: I will keep existing modals as they are, just collapsed here for brevity in this response unless changes needed.
// Only explicitly adding the NEW modals to the component return.

const VariantModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSelect: (variant: ProductVariant) => void;
}> = ({ isOpen, onClose, product, onSelect }) => {
    if (!isOpen || !product || !product.variants || product.variants.length === 0) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pilih Varian ${product.name}`}>
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {product.variants.map(variant => (
                    <button
                        key={variant.id}
                        onClick={() => onSelect(variant)}
                        className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg text-left transition-colors focus:ring-2 focus:ring-[#347758] focus:outline-none"
                    >
                        <p className="font-bold text-white">{variant.name}</p>
                        <p className="text-sm text-[#52a37c]">{CURRENCY_FORMATTER.format(variant.price)}</p>
                    </button>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
                <Button variant="secondary" onClick={onClose} className="w-full">Batal</Button>
            </div>
        </Modal>
    );
};

const AddonModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    variant: ProductVariant | null;
    onConfirm: (selectedAddons: Addon[]) => void;
}> = ({ isOpen, onClose, product, variant, onConfirm }) => {
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

    const basePrice = variant ? variant.price : product.price;
    const totalAddonPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const totalItemPrice = basePrice + totalAddonPrice;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pilih Add-on untuk ${product.name} ${variant ? `(${variant.name})` : ''}`}>
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

const CashManagementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const { addCashMovement, session } = useSession();
    const { transactions } = useFinance();
    const { showAlert } = useUI();
    const [type, setType] = useState<'in' | 'out'>('out');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            setType('out');
            setAmount('');
            setDescription('');
        }
    }, [isOpen]);

    const currentDrawerBalance = useMemo(() => {
        if (!session) return 0;
        let balance = session.startingCash;
        const sessionTransactions = transactions.filter(t => 
            new Date(t.createdAt) >= new Date(session.startTime) && 
            t.paymentStatus !== 'refunded'
        );
        const cashSales = sessionTransactions.reduce((sum, t) => {
            const cashPay = t.payments.find(p => p.method === 'cash');
            return sum + (cashPay ? cashPay.amount : 0);
        }, 0);
        balance += cashSales;
        session.cashMovements.forEach(m => {
            if (m.type === 'in') balance += m.amount;
            else balance -= m.amount;
        });
        return balance;
    }, [session, transactions]);

    const handleSubmit = () => {
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) return;
        if (!description.trim()) return;

        addCashMovement(type, value, description);
        showAlert({ type: 'alert', title: 'Berhasil', message: 'Arus kas berhasil dicatat.' });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kelola Kas (Shift Ini)">
            <div className="space-y-4">
                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 text-center">
                    <p className="text-xs text-slate-400 mb-1">Estimasi Uang Tunai di Laci Saat Ini</p>
                    <p className="text-2xl font-bold text-white">{CURRENCY_FORMATTER.format(currentDrawerBalance)}</p>
                </div>

                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setType('in')} className={`flex-1 py-2 text-sm rounded-md transition-colors ${type === 'in' ? 'bg-green-600 text-white font-semibold' : 'text-slate-300'}`}>
                        Kas Masuk
                    </button>
                    <button onClick={() => setType('out')} className={`flex-1 py-2 text-sm rounded-md transition-colors ${type === 'out' ? 'bg-red-600 text-white font-semibold' : 'text-slate-300'}`}>
                        Kas Keluar
                    </button>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Jumlah</label>
                    <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" placeholder="0" autoFocus/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Keterangan</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" placeholder={type === 'in' ? "cth: Tambahan Modal Receh" : "cth: Beli Es Batu, Bensin"}/>
                </div>

                <Button onClick={handleSubmit} disabled={!amount || !description} className="w-full">
                    Simpan
                </Button>
            </div>
        </Modal>
    );
}

const SessionHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onViewReceipt: (transaction: TransactionType) => void;
    onRefund: (transaction: TransactionType) => void;
}> = ({ isOpen, onClose, onViewReceipt, onRefund }) => {
    const { session } = useSession();
    const { transactions } = useFinance();

    const sessionTransactions = useMemo(() => {
        if (!session) return [];
        return transactions
            .filter(t => new Date(t.createdAt) >= new Date(session.startTime))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [session, transactions]);

    const sessionSummary = useMemo(() => {
        const total = sessionTransactions
            .filter(t => t.paymentStatus !== 'refunded')
            .reduce((sum, t) => sum + t.total, 0);
        return { total, count: sessionTransactions.length };
    }, [sessionTransactions]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Riwayat Transaksi (Sesi Ini)">
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                    <div>
                        <p className="text-xs text-slate-400">Total Transaksi</p>
                        <p className="font-bold text-white">{sessionSummary.count}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400">Total Omzet Sesi</p>
                        <p className="font-bold text-[#52a37c]">{CURRENCY_FORMATTER.format(sessionSummary.total)}</p>
                    </div>
                </div>

                {sessionTransactions.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">Belum ada transaksi di sesi ini.</p>
                ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {sessionTransactions.map(t => (
                            <div key={t.id} className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white">{t.customerName || 'Umum'}</span>
                                        {t.paymentStatus === 'refunded' && (
                                            <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">Refunded</span>
                                        )}
                                        <span className="text-[10px] bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">
                                            {new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        #{t.id.slice(-4)} • {t.items.length} items
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${t.paymentStatus === 'refunded' ? 'text-slate-500 line-through' : 'text-[#52a37c]'}`}>
                                        {CURRENCY_FORMATTER.format(t.total)}
                                    </p>
                                    <div className="flex gap-2 mt-2 justify-end">
                                        <button 
                                            onClick={() => onViewReceipt(t)} 
                                            className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded text-white flex items-center gap-1"
                                        >
                                            <Icon name="printer" className="w-3 h-3" /> Struk
                                        </button>
                                        {t.paymentStatus !== 'refunded' && (
                                            <button 
                                                onClick={() => onRefund(t)} 
                                                className="text-xs bg-red-900/50 hover:bg-red-900 text-red-300 px-2 py-1 rounded flex items-center gap-1"
                                            >
                                                <Icon name="reset" className="w-3 h-3" /> Refund
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <Button variant="secondary" onClick={onClose} className="w-full">Tutup</Button>
            </div>
        </Modal>
    );
}

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
                            className="w-full bg-slate-700 p-2 rounded-md text-white"
                         />
                         <input
                            type="text"
                            value={tempCustomerContact}
                            onChange={e => setTempCustomerContact(e.target.value)}
                            placeholder="Kontak (Opsional)"
                            className="w-full bg-slate-700 p-2 rounded-md text-white"
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

                <input type="number" min="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Masukkan jumlah bayar" className="w-full bg-slate-700 p-3 text-xl text-center rounded-md text-white" />
                
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
    isOpen: boolean;
    onClose: () => void;
    customer: Customer,
}> = ({ isOpen, onClose, customer }) => {
    const { membershipSettings } = useCustomer();
    const { applyRewardToCart } = useCart();
    
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

const DiscountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (discount: Discount) => void;
    onRemove?: () => void;
    initialDiscount: Discount | null;
    title: string;
}> = ({ isOpen, onClose, onSave, onRemove, initialDiscount, title }) => {
    const { discountDefinitions } = useDiscount();
    const { receiptSettings } = useSettings();
    const [mode, setMode] = useState<'select' | 'manual'>('select');
    const [manualType, setManualType] = useState<'percentage' | 'amount'>('percentage');
    const [manualValue, setManualValue] = useState('');

    const activeDiscounts = useMemo(() => {
        const now = new Date();
        const currentStoreId = receiptSettings.storeId || '';

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
            if (d.validStoreIds && d.validStoreIds.length > 0) {
                if (!d.validStoreIds.includes(currentStoreId)) return false;
            }
            return true;
        });
    }, [discountDefinitions, receiptSettings.storeId]);

    useEffect(() => {
        if (isOpen) {
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

const POSView: React.FC = () => {
    // Contexts
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

    // State for Modals & Actions
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
    
    // NEW STATES for Modifiers & Split & Mobile Tabs
    const [isModifierModalOpen, setModifierModalOpen] = useState(false);
    const [productForModifier, setProductForModifier] = useState<Product | null>(null);
    const [isSplitBillModalOpen, setSplitBillModalOpen] = useState(false);
    const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

    // Calculate cart total quantity for badge
    const totalCartItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    const { finalTotal } = getCartTotals();

    // Effects
    useEffect(() => {
        if (!selectedCustomer && appliedReward) {
            removeRewardFromCart();
        }
    }, [selectedCustomer, appliedReward, removeRewardFromCart]);
    
    // --- Action Handlers ---

    const handleProductClick = (product: Product) => {
        // Priority 1: Advanced Modifiers (New System)
        if (product.modifierGroups && product.modifierGroups.length > 0) {
            setProductForModifier(product);
            setModifierModalOpen(true);
            return;
        }

        // Priority 2: Legacy Variants
        if (product.variants && product.variants.length > 0) {
            setProductForVariant(product);
            setVariantModalOpen(true);
            return;
        }

        // Priority 3: Legacy Addons
        if (product.addons && product.addons.length > 0) {
            setProductForAddons(product);
            setSelectedVariantForAddons(null);
            setAddonModalOpen(true);
            return;
        }
        
        // Priority 4: Direct Add
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

    // New Handler for Modifiers
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

    // Handle Split Bill
    const handleSplitBill = (itemsToPay: string[]) => {
        // itemsToPay are IDs of items to keep in CURRENT cart (to pay now).
        // Everything else moves to NEW held cart.
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
            {/* Mobile Tab Navigation */}
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
                {/* Products & Main Actions Area */}
                {/* Hidden on mobile if cart tab is active */}
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
                            {/* Session Actions Bar (Only visible if Session Enabled and Active) */}
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
                
                {/* Cart Sidebar */}
                {/* Hidden on mobile if products tab is active */}
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
            
            {/* --- Modals & Overlays --- */}
            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setPaymentModalOpen(false)} 
                onConfirm={handleSaveTransaction}
                total={finalTotal}
                selectedCustomer={selectedCustomer}
            />
            <CashManagementModal isOpen={isCashMgmtOpen} onClose={() => setCashMgmtOpen(false)} />
            
            <SessionHistoryModal 
                isOpen={isHistoryModalOpen} 
                onClose={() => setHistoryModalOpen(false)} 
                onViewReceipt={(t) => { setReceiptToView(t); setReceiptModalOpen(true); }}
                onRefund={handleRefundTransaction}
            />

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

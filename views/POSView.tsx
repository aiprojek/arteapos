
import React, { useEffect } from 'react';
import { usePOSLogic } from '../hooks/usePOSLogic';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import ReceiptModal from '../components/ReceiptModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import KitchenNoteModal from '../components/KitchenNoteModal';
import EndSessionModal from '../components/EndSessionModal';
import SendReportModal from '../components/SendReportModal';
import CustomerFormModal from '../components/CustomerFormModal';
import StaffRestockModal from '../components/StaffRestockModal';
import StockOpnameModal from '../components/StockOpnameModal';
import { CURRENCY_FORMATTER } from '../constants';

// Modular Components
import ProductBrowser from '../components/pos/ProductBrowser';
import CartSidebar from '../components/pos/CartSidebar';
import { SessionHistoryModal, PaymentModal, RewardsModal, DiscountModal, CashManagementModal, MemberSearchModal } from '../components/pos/POSModals';
import type { ModifierGroup, Product, ProductVariant, Addon, SelectedModifier, CartItem } from '../types';

// --- Local Modals ---

const ModifierModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onConfirm: (selectedModifiers: SelectedModifier[]) => void;
}> = ({ isOpen, onClose, product, onConfirm }) => {
    const [selections, ReactSetSelections] = React.useState<Record<string, SelectedModifier[]>>({});

    useEffect(() => {
        if (isOpen) ReactSetSelections({});
    }, [isOpen]);

    if (!isOpen || !product || !product.modifierGroups) return null;

    const handleToggle = (group: ModifierGroup, option: any) => {
        ReactSetSelections(prev => {
            const current = prev[group.id] || [];
            const isSelected = current.find(s => s.optionId === option.id);
            
            // Single Choice (Radio)
            if (group.maxSelection === 1) {
                if (isSelected) {
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
                if (current.length >= group.maxSelection) return prev;
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
    cartItems: CartItem[];
    onConfirm: (itemsToPay: string[]) => void;
}> = ({ isOpen, onClose, cartItems, onConfirm }) => {
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

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
    const [selected, setSelected] = React.useState<Addon[]>([]);
    useEffect(() => { if (!isOpen) setSelected([]); }, [isOpen]);
    if(!isOpen || !product || !product.addons) return null;
    const toggle = (addon: Addon) => setSelected(prev => prev.find(a => a.id === addon.id) ? prev.filter(a => a.id !== addon.id) : [...prev, addon]);
    return <Modal isOpen={isOpen} onClose={onClose} title={`Add-on ${product.name}`}><div className="space-y-3 max-h-64 overflow-y-auto">{product.addons.map(a => { const isSel = !!selected.find(x => x.id === a.id); return <label key={a.id} className={`flex items-center p-3 rounded-lg cursor-pointer ${isSel ? 'bg-[#347758]/30 border border-[#347758]' : 'bg-slate-700'}`}><input type="checkbox" checked={isSel} onChange={() => toggle(a)} className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-[#347758]"/><span className="ml-3 flex-1 text-slate-200">{a.name}</span><span className="text-slate-300">{CURRENCY_FORMATTER.format(a.price)}</span></label>})}</div><Button onClick={() => onConfirm(selected)} className="w-full mt-4">Tambah</Button></Modal>;
}

const NameCartModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (n: string) => void, currentName?: string}> = ({isOpen, onClose, onSave, currentName = ''}) => {
    const [name, setName] = React.useState('');
    useEffect(() => { if (isOpen) setName(currentName); }, [isOpen, currentName]);
    return <Modal isOpen={isOpen} onClose={onClose} title={currentName ? "Ganti Nama" : "Simpan Pesanan"}><div className="space-y-4"><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="cth: Meja 5" className="w-full bg-slate-700 p-2 rounded-md text-white" autoFocus/><Button onClick={() => name.trim() && onSave(name.trim())} className="w-full">Simpan</Button></div></Modal>;
}

const POSView: React.FC = () => {
    // Extracted Logic Hook
    const logic = usePOSLogic();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (logic.isSessionLocked) return; 
            if (e.key === 'F2') {
                e.preventDefault();
                if (logic.cart.length > 0) logic.setPaymentModalOpen(true);
            }
            if (e.key === 'F4') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('focus-search'));
            }
        };
        
        // Listener for Event from CartSidebar
        const handleOpenScannerEvent = () => logic.setBarcodeScannerOpen(true);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('open-pos-scanner', handleOpenScannerEvent);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('open-pos-scanner', handleOpenScannerEvent);
        };
    }, [logic.cart.length, logic.isSessionLocked, logic]);

    return (
        <div className="flex flex-col h-full">
            <div className="md:hidden flex p-1 bg-slate-800 mb-4 rounded-lg gap-1 shrink-0">
                <button
                    onClick={() => logic.setMobileTab('products')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${logic.mobileTab === 'products' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Icon name="products" className="w-4 h-4"/> Menu
                </button>
                <button
                    onClick={() => logic.setMobileTab('cart')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${logic.mobileTab === 'cart' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Icon name="cash" className="w-4 h-4"/> Keranjang
                    {logic.totalCartItems > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">
                            {logic.totalCartItems}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex flex-col md:flex-row h-full gap-6 overflow-hidden">
                <div className={`flex-col min-w-0 md:flex-1 h-full ${logic.mobileTab === 'cart' ? 'hidden md:flex' : 'flex'}`}>
                    {logic.isSessionLocked ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700">
                            <div className="bg-slate-800 p-4 rounded-full mb-4 shadow-lg">
                                <Icon name="lock" className="w-12 h-12 text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Sesi Penjualan Belum Dimulai</h3>
                            <p className="text-slate-400 mb-6 max-w-xs text-sm">
                                Untuk keamanan dan pencatatan yang akurat, silakan mulai sesi baru dan masukkan modal awal kasir.
                            </p>
                            <Button onClick={() => logic.setStartSessionModalOpen(true)} variant="primary" size="lg">
                                Mulai Sesi Sekarang
                            </Button>
                        </div>
                    ) : (
                        <>
                            {logic.receiptSettings.enableKitchenPrinter && logic.session && (
                                <div className="flex items-center gap-2 mb-4 bg-slate-800 p-2 rounded-lg border border-slate-700 overflow-x-auto">
                                    <Button variant="secondary" size="sm" onClick={() => logic.setHistoryModalOpen(true)} className="border-none bg-slate-700 hover:bg-slate-600">
                                        <Icon name="book" className="w-4 h-4" /> Riwayat
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => logic.setCashMgmtOpen(true)} className="border-none bg-slate-700 hover:bg-slate-600">
                                        <Icon name="finance" className="w-4 h-4" /> Kas
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => logic.setSendReportModalOpen(true)} className="border-none bg-slate-700 hover:bg-slate-600">
                                        <Icon name="chat" className="w-4 h-4" /> Laporan
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => logic.setEndSessionModalOpen(true)} className="border-none bg-red-900/30 hover:bg-red-900/50 text-red-300 ml-auto">
                                        <Icon name="logout" className="w-4 h-4" /> Tutup
                                    </Button>
                                </div>
                            )}

                            <ProductBrowser 
                                onProductClick={logic.handleProductClick}
                                isSessionLocked={logic.isSessionLocked}
                                onOpenScanner={() => logic.setBarcodeScannerOpen(true)}
                                onOpenRestock={() => logic.setStaffRestockOpen(true)}
                                onOpenOpname={() => logic.setIsOpnameOpen(true)}
                            />
                        </>
                    )}
                </div>
                
                <div className={`h-full ${logic.mobileTab === 'products' ? 'hidden md:block' : 'block'}`}>
                    <CartSidebar 
                        isSessionLocked={logic.isSessionLocked}
                        onOpenDiscountModal={logic.handleOpenDiscountModal}
                        onOpenCartDiscountModal={() => logic.setCartDiscountModalOpen(true)}
                        onOpenRewardModal={() => logic.selectedCustomer ? logic.setRewardsModalOpen(true) : alert('Silakan pilih pelanggan.')}
                        onOpenPaymentModal={() => logic.setPaymentModalOpen(true)}
                        onOpenNameModal={(cart) => { logic.setCartToRename(cart); logic.setNameModalOpen(true); }}
                        onQuickPay={logic.handleQuickPay}
                        selectedCustomer={logic.selectedCustomer}
                        setSelectedCustomer={logic.setSelectedCustomer}
                        onOpenCustomerForm={() => logic.setCustomerModalOpen(true)}
                        onSplitBill={() => logic.setSplitBillModalOpen(true)}
                    />
                </div>
            </div>
            
            {logic.isPaymentModalOpen && (
                <PaymentModal 
                    isOpen={logic.isPaymentModalOpen} 
                    onClose={() => logic.setPaymentModalOpen(false)} 
                    onConfirm={logic.handleSaveTransaction}
                    total={logic.finalTotal}
                    selectedCustomer={logic.selectedCustomer}
                />
            )}
            
            <CashManagementModal isOpen={logic.isCashMgmtOpen} onClose={() => logic.setCashMgmtOpen(false)} />
            
            {logic.isHistoryModalOpen && <SessionHistoryModal 
                isOpen={logic.isHistoryModalOpen} 
                onClose={() => logic.setHistoryModalOpen(false)} 
                onViewReceipt={(t) => { logic.setReceiptToView(t); logic.setReceiptModalOpen(true); }}
                onRefund={logic.handleRefundTransaction}
            />}

            {(logic.lastTransaction || logic.receiptToView) && (
                <ReceiptModal 
                    isOpen={logic.isReceiptModalOpen} 
                    onClose={() => { logic.setReceiptModalOpen(false); logic.setReceiptToView(null); }} 
                    transaction={logic.receiptToView || logic.lastTransaction!}
                />
            )}

            <BarcodeScannerModal isOpen={logic.isBarcodeScannerOpen} onClose={() => logic.setBarcodeScannerOpen(false)} onScan={logic.handleBarcodeScan} />
            {logic.selectedCustomer && <RewardsModal isOpen={logic.isRewardsModalOpen} onClose={() => logic.setRewardsModalOpen(false)} customer={logic.selectedCustomer} />}
            <NameCartModal isOpen={logic.isNameModalOpen} onClose={() => logic.setNameModalOpen(false)} onSave={logic.handleSaveName} currentName={logic.cartToRename?.name}/>
            <DiscountModal
                isOpen={!!logic.discountingItem}
                onClose={() => logic.setDiscountingItem(null)}
                title={`Diskon untuk ${logic.discountingItem?.name}`}
                initialDiscount={logic.discountingItem?.discount || null}
                onSave={(discount) => logic.discountingItem && logic.applyItemDiscount(logic.discountingItem.cartItemId, discount)}
                onRemove={() => logic.discountingItem && logic.removeItemDiscount(logic.discountingItem.cartItemId)}
            />
             <DiscountModal
                isOpen={logic.isCartDiscountModalOpen}
                onClose={() => logic.setCartDiscountModalOpen(false)}
                title="Diskon Keranjang"
                initialDiscount={logic.cartDiscount}
                onSave={logic.applyCartDiscount}
                onRemove={logic.removeCartDiscount}
            />
            <VariantModal
                isOpen={logic.isVariantModalOpen}
                onClose={() => { logic.setVariantModalOpen(false); logic.setProductForVariant(null); }}
                product={logic.productForVariant}
                onSelect={logic.handleVariantSelect}
            />
            <AddonModal
                isOpen={logic.isAddonModalOpen}
                onClose={() => { logic.setAddonModalOpen(false); logic.setProductForAddons(null); logic.setSelectedVariantForAddons(null); }}
                product={logic.productForAddons}
                variant={logic.selectedVariantForAddons}
                onConfirm={logic.handleAddonConfirm}
            />
            <ModifierModal
                isOpen={logic.isModifierModalOpen}
                onClose={() => { logic.setModifierModalOpen(false); logic.setProductForModifier(null); }}
                product={logic.productForModifier}
                onConfirm={logic.handleModifierConfirm}
            />
            <SplitBillModal 
                isOpen={logic.isSplitBillModalOpen}
                onClose={() => logic.setSplitBillModalOpen(false)}
                cartItems={logic.cart}
                onConfirm={logic.handleSplitBill}
            />

            {logic.transactionForKitchenNote && (
                <KitchenNoteModal
                    isOpen={!!logic.transactionForKitchenNote}
                    onClose={() => logic.setTransactionForKitchenNote(null)}
                    transaction={logic.transactionForKitchenNote}
                />
            )}
            
            <CustomerFormModal 
                isOpen={logic.isCustomerModalOpen} 
                onClose={() => logic.setCustomerModalOpen(false)} 
                onSave={logic.handleSaveCustomer} 
                customer={null} 
            />
            <StaffRestockModal isOpen={logic.isStaffRestockOpen} onClose={() => logic.setStaffRestockOpen(false)} />
            <StockOpnameModal isOpen={logic.isOpnameOpen} onClose={() => logic.setIsOpnameOpen(false)} initialTab="product" />

            <Modal isOpen={logic.isStartSessionModalOpen} onClose={() => logic.setStartSessionModalOpen(false)} title="Mulai Sesi Penjualan">
                <div className="space-y-4">
                    <p className="text-slate-300">Masukkan jumlah uang tunai awal (modal) yang tersedia di laci kasir.</p>
                    <div>
                        <label htmlFor="startingCashPOS" className="block text-sm font-medium text-slate-300 mb-1">Uang Awalan (IDR)</label>
                        <input
                            id="startingCashPOS"
                            type="number"
                            min="0"
                            value={logic.startingCashInput}
                            onChange={(e) => logic.setStartingCashInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                    <Button onClick={logic.handleStartSession} className="w-full py-3">
                        Mulai Sesi
                    </Button>
                </div>
            </Modal>

            {logic.session && (
                <EndSessionModal
                    isOpen={logic.isEndSessionModalOpen}
                    onClose={() => logic.setEndSessionModalOpen(false)}
                    sessionSales={logic.sessionSummary.cashSales}
                    startingCash={logic.session.startingCash}
                    cashIn={logic.sessionSummary.cashIn}
                    cashOut={logic.sessionSummary.cashOut}
                />
            )}

            <SendReportModal
                isOpen={logic.isSendReportModalOpen}
                onClose={() => logic.setSendReportModalOpen(false)}
                data={logic.sessionTransactions}
                adminWhatsapp={logic.receiptSettings.adminWhatsapp}
                adminTelegram={logic.receiptSettings.adminTelegram}
                startingCash={logic.session?.startingCash || 0}
                cashIn={logic.sessionSummary.cashIn}
                cashOut={logic.sessionSummary.cashOut}
            />
        </div>
    );
};

export default POSView;

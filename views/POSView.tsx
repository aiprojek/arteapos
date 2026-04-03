
import React, { useEffect, useState } from 'react';
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
import ChannelSalesModal from '../components/ChannelSalesModal';
import { CURRENCY_FORMATTER } from '../constants';

// Modular Components
import ProductBrowser from '../components/pos/ProductBrowser';
import CartSidebar from '../components/pos/CartSidebar';
import { SessionHistoryModal, PaymentModal, RewardsModal, DiscountModal, CashManagementModal, MemberSearchModal } from '../components/pos/POSModals';
import { AddonModal, ModifierModal, NameCartModal, SplitBillModal, VariantModal } from '../components/pos/modals';
import { useRenderProfiler } from '../utils/renderProfiler';

const MobileTabSwitcher: React.FC<{
    mobileTab: 'products' | 'cart';
    totalCartItems: number;
    onShowProducts: () => void;
    onShowCart: () => void;
}> = ({ mobileTab, totalCartItems, onShowProducts, onShowCart }) => {
    const [isCompactViewport, setIsCompactViewport] = useState(false);

    useEffect(() => {
        const updateViewportMode = () => {
            setIsCompactViewport(window.innerHeight <= 820 || window.innerWidth < 480);
        };

        updateViewportMode();
        window.addEventListener('resize', updateViewportMode);

        return () => window.removeEventListener('resize', updateViewportMode);
    }, []);

    return (
        <div className={`md:hidden flex bg-slate-800 rounded-lg shrink-0 ${isCompactViewport ? 'p-0.5 mb-2.5 gap-0.5' : 'p-1 mb-4 gap-1'}`}>
            <button
                onClick={onShowProducts}
                className={`flex-1 font-semibold rounded-md transition-colors flex items-center justify-center ${isCompactViewport ? 'py-1.5 text-[13px] gap-1.5' : 'py-2 text-sm gap-2'} ${mobileTab === 'products' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}
            >
                <Icon name="products" className={isCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                <span>Menu</span>
            </button>
            <button
                onClick={onShowCart}
                className={`flex-1 font-semibold rounded-md transition-colors flex items-center justify-center ${isCompactViewport ? 'py-1.5 text-[13px] gap-1.5' : 'py-2 text-sm gap-2'} ${mobileTab === 'cart' ? 'bg-[#347758] text-white' : 'text-slate-400 hover:text-white'}`}
            >
                <Icon name="cash" className={isCompactViewport ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                <span>Keranjang</span>
                {totalCartItems > 0 && (
                    <span className={`bg-red-500 text-white rounded-full ${isCompactViewport ? 'text-[9px] px-1.5' : 'text-[10px] px-1.5'}`}>
                        {totalCartItems}
                    </span>
                )}
            </button>
        </div>
    );
};

const SessionLockedState: React.FC<{
    onStartSession: () => void;
}> = ({ onStartSession }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700">
        <div className="bg-slate-800 p-4 rounded-full mb-4 shadow-lg">
            <Icon name="lock" className="w-12 h-12 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Sesi Penjualan Belum Dimulai</h3>
        <p className="text-slate-400 mb-6 max-w-xs text-sm">
            Untuk keamanan dan pencatatan yang akurat, silakan mulai sesi baru dan masukkan modal awal kasir.
        </p>
        <Button onClick={onStartSession} variant="primary" size="lg">
            Mulai Sesi Sekarang
        </Button>
    </div>
);

const SessionToolbar: React.FC<{
    onOpenHistory: () => void;
    onOpenCashManagement: () => void;
    onOpenReport: () => void;
    onOpenEndSession: () => void;
}> = ({ onOpenHistory, onOpenCashManagement, onOpenReport, onOpenEndSession }) => (
    <div className="flex items-center gap-2 mb-4 bg-slate-800 p-2 rounded-lg border border-slate-700 overflow-x-auto">
        <Button variant="secondary" size="sm" onClick={onOpenHistory} className="border-none bg-slate-700 hover:bg-slate-600 whitespace-nowrap">
            <Icon name="book" className="w-4 h-4" /> <span className="hidden sm:inline">Riwayat</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenCashManagement} className="border-none bg-slate-700 hover:bg-slate-600 whitespace-nowrap">
            <Icon name="finance" className="w-4 h-4" /> <span className="hidden sm:inline">Kas</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenReport} className="border-none bg-slate-700 hover:bg-slate-600 whitespace-nowrap">
            <Icon name="chat" className="w-4 h-4" /> <span className="hidden sm:inline">Laporan</span>
        </Button>
        <Button variant="danger" size="sm" onClick={onOpenEndSession} className="border-none bg-red-900/30 hover:bg-red-900/50 text-red-300 ml-auto whitespace-nowrap">
            <Icon name="logout" className="w-4 h-4" /> <span className="hidden sm:inline">Tutup</span>
        </Button>
    </div>
);

const POSView: React.FC = () => {
    // Extracted Logic Hook
    const logic = usePOSLogic();
    const [isChannelSalesOpen, setChannelSalesOpen] = useState(false);

    useRenderProfiler('POSView', {
        sessionLocked: logic.isSessionLocked,
        cartLines: logic.cart.length,
        totalCartItems: logic.totalCartItems,
        mobileTab: logic.mobileTab,
        paymentOpen: logic.isPaymentModalOpen,
        receiptOpen: logic.isReceiptModalOpen,
        scannerOpen: logic.isBarcodeScannerOpen,
        historyOpen: logic.isHistoryModalOpen,
        customerModalOpen: logic.isCustomerModalOpen,
        channelSalesOpen: isChannelSalesOpen,
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (logic.isSessionLocked) return; 
            if (e.key === 'F2') {
                e.preventDefault();
                if (logic.cart.length > 0) logic.handleOpenPayment(); // Use Handler with Validation
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
    }, [
        logic.cart.length,
        logic.handleOpenPayment,
        logic.isSessionLocked,
        logic.setBarcodeScannerOpen,
    ]);

    return (
        <div className="flex flex-col h-full">
            <MobileTabSwitcher
                mobileTab={logic.mobileTab}
                totalCartItems={logic.totalCartItems}
                onShowProducts={() => logic.setMobileTab('products')}
                onShowCart={() => logic.setMobileTab('cart')}
            />

            <div className="flex flex-col md:flex-row h-full gap-6 overflow-hidden">
                <div className={`flex-col min-w-0 md:flex-1 h-full ${logic.mobileTab === 'cart' ? 'hidden md:flex' : 'flex'}`}>
                    {logic.isSessionLocked ? (
                        <SessionLockedState onStartSession={() => logic.setStartSessionModalOpen(true)} />
                    ) : (
                        <>
                            {logic.receiptSettings.enableKitchenPrinter && logic.session && (
                                <SessionToolbar
                                    onOpenHistory={() => logic.setHistoryModalOpen(true)}
                                    onOpenCashManagement={() => logic.setCashMgmtOpen(true)}
                                    onOpenReport={() => logic.setSendReportModalOpen(true)}
                                    onOpenEndSession={() => logic.setEndSessionModalOpen(true)}
                                />
                            )}

                            <ProductBrowser 
                                onProductClick={logic.handleProductClick}
                                isSessionLocked={logic.isSessionLocked}
                                onOpenScanner={() => logic.setBarcodeScannerOpen(true)}
                                onOpenRestock={() => logic.setStaffRestockOpen(true)}
                                onOpenOpname={() => logic.setIsOpnameOpen(true)}
                                onOpenChannelSales={() => setChannelSalesOpen(true)}
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
                        onOpenPaymentModal={() => logic.handleOpenPayment()} // Use NEW handler
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
            <ChannelSalesModal isOpen={isChannelSalesOpen} onClose={() => setChannelSalesOpen(false)} />

            <Modal
                isOpen={logic.isStartSessionModalOpen}
                onClose={() => logic.setStartSessionModalOpen(false)}
                title="Mulai Sesi Penjualan"
                mobileLayout="sheet"
            >
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


import { useState, useCallback, useMemo, useEffect } from 'react';
import type { 
    Product, CartItem as CartItemType, Transaction as TransactionType, 
    Customer, Payment, PaymentMethod, HeldCart, Addon, ProductVariant, 
    ModifierGroup, SelectedModifier 
} from '../types';
import { useCart } from '../context/CartContext';
import { useSession } from '../context/SessionContext';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { useCustomer } from '../context/CustomerContext';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';

export const usePOSLogic = () => {
    const { findProductByBarcode } = useProduct();
    const {
        cart, addToCart, addConfiguredItemToCart, saveTransaction, 
        appliedReward, removeRewardFromCart,
        holdActiveCart, updateHeldCartName,
        applyItemDiscount, removeItemDiscount,
        cartDiscount, applyCartDiscount, removeCartDiscount,
        getCartTotals, splitCart,
        orderType, tableNumber, paxCount // Import order related info
    } = useCart();
    const { showAlert } = useUI();
    const { sessionSettings, session, startSession } = useSession();
    const { transactions, refundTransaction } = useFinance();
    const { receiptSettings } = useSettings();
    const { addCustomer, customers } = useCustomer(); // Get customers list for sync

    // -- State Definitions --
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
    
    // New State for Member Search
    const [isMemberSearchOpen, setMemberSearchOpen] = useState(false);

    const totalCartItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    const { finalTotal } = getCartTotals();

    // --- REAL-TIME CUSTOMER SYNC ---
    useEffect(() => {
        if (selectedCustomer) {
            const freshCustomerData = customers.find(c => c.id === selectedCustomer.id);
            if (freshCustomerData && JSON.stringify(freshCustomerData) !== JSON.stringify(selectedCustomer)) {
                setSelectedCustomer(freshCustomerData);
            }
        }
    }, [customers, selectedCustomer]);

    // -- Handlers --
    
    // NEW: Validation Logic
    const validateTransactionRequirements = useCallback(() => {
        if (cart.length === 0) {
            showAlert({ type: 'alert', title: 'Keranjang Kosong', message: 'Tambahkan produk sebelum membayar.' });
            return false;
        }

        // Check Table & Pax Requirement
        const isDineIn = orderType.toLowerCase().includes('makan') || orderType.toLowerCase().includes('dine') || orderType.toLowerCase().includes('meja');
        
        if (sessionSettings.enableTableManagement && sessionSettings.requireTableInfo && isDineIn) {
            const isTableFilled = tableNumber && tableNumber.trim().length > 0;
            const isPaxFilled = paxCount && paxCount > 0;

            if (!isTableFilled || !isPaxFilled) {
                let msg = 'Data pesanan belum lengkap.';
                if (!isTableFilled && !isPaxFilled) msg = 'Wajib mengisi Nomor Meja DAN Jumlah Tamu (Pax).';
                else if (!isTableFilled) msg = 'Wajib mengisi Nomor Meja.';
                else if (!isPaxFilled) msg = 'Wajib mengisi Jumlah Tamu (Pax).';

                showAlert({ 
                    type: 'alert', 
                    title: 'Info Meja Wajib', 
                    message: msg 
                });
                return false;
            }
        }
        return true;
    }, [cart.length, orderType, sessionSettings, tableNumber, paxCount, showAlert]);

    const handleOpenPayment = () => {
        if (validateTransactionRequirements()) {
            setPaymentModalOpen(true);
        }
    };

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
    };

    const handleStartSession = () => {
        startSession(parseFloat(startingCashInput) || 0);
        setStartSessionModalOpen(false);
        setStartingCashInput('');
    };

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
        // Use Validator first
        if (!validateTransactionRequirements()) return;

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
    }, [getCartTotals, saveTransaction, showAlert, selectedCustomer, receiptSettings.enableKitchenPrinter, validateTransactionRequirements]);

    // UPDATED: Logic Scan Barcode to support Member Card
    const handleBarcodeScan = useCallback((barcode: string) => {
        const cleanedBarcode = barcode.trim();

        // 1. Cek Apakah ID Member?
        const member = customers.find(c => c.memberId === cleanedBarcode);
        if (member) {
            setSelectedCustomer(member);
            showAlert({ 
                type: 'alert', 
                title: 'Member Terdeteksi', 
                message: `Berhasil login member: ${member.name} (${member.points} pts)` 
            });
            setBarcodeScannerOpen(false);
            return;
        }

        // 2. Jika bukan Member, Cek Produk
        const product = findProductByBarcode(cleanedBarcode);
        if (product) {
            handleProductClick(product);
            // Optional: Close scanner after scan if preferred, or keep open for multiple scans
            // setBarcodeScannerOpen(false); 
        } else {
            showAlert({type: 'alert', title: 'Tidak Ditemukan', message: `Kode "${cleanedBarcode}" tidak dikenali sebagai Produk atau Member.`});
        }
    }, [findProductByBarcode, showAlert, customers, handleProductClick]);

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

    return {
        // State
        isPaymentModalOpen, setPaymentModalOpen,
        lastTransaction, setLastTransaction,
        isReceiptModalOpen, setReceiptModalOpen,
        isBarcodeScannerOpen, setBarcodeScannerOpen,
        selectedCustomer, setSelectedCustomer,
        isRewardsModalOpen, setRewardsModalOpen,
        isNameModalOpen, setNameModalOpen,
        cartToRename, setCartToRename,
        discountingItem, setDiscountingItem,
        isCartDiscountModalOpen, setCartDiscountModalOpen,
        isAddonModalOpen, setAddonModalOpen,
        productForAddons, setProductForAddons,
        isVariantModalOpen, setVariantModalOpen,
        productForVariant, setProductForVariant,
        selectedVariantForAddons, setSelectedVariantForAddons,
        transactionForKitchenNote, setTransactionForKitchenNote,
        isCashMgmtOpen, setCashMgmtOpen,
        isStartSessionModalOpen, setStartSessionModalOpen,
        startingCashInput, setStartingCashInput,
        isEndSessionModalOpen, setEndSessionModalOpen,
        isSendReportModalOpen, setSendReportModalOpen,
        isCustomerModalOpen, setCustomerModalOpen,
        isHistoryModalOpen, setHistoryModalOpen,
        receiptToView, setReceiptToView,
        isStaffRestockOpen, setStaffRestockOpen,
        isOpnameOpen, setIsOpnameOpen,
        isModifierModalOpen, setModifierModalOpen,
        productForModifier, setProductForModifier,
        isSplitBillModalOpen, setSplitBillModalOpen,
        mobileTab, setMobileTab,
        isMemberSearchOpen, setMemberSearchOpen,
        
        // Computed
        totalCartItems,
        finalTotal,
        sessionSummary,
        sessionTransactions,
        isSessionLocked,
        session,
        receiptSettings,
        cartDiscount,
        cart,

        // Actions
        applyItemDiscount, removeItemDiscount,
        applyCartDiscount, removeCartDiscount,
        
        // Event Handlers
        handleProductClick,
        handleVariantSelect,
        handleAddonConfirm,
        handleModifierConfirm,
        handleStartSession,
        handleSaveCustomer,
        handleRefundTransaction,
        handleSaveTransaction,
        handleQuickPay,
        handleBarcodeScan,
        handleSaveName,
        handleOpenDiscountModal,
        handleSplitBill,
        
        // NEW EXPORT
        validateTransactionRequirements,
        handleOpenPayment
    };
};

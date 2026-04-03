
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useDataActions, useSalesData } from './DataContext';
import { useUIActions } from './UIContext';
import { useAuthState } from './AuthContext';
import { useProduct } from './ProductContext';
import { useSettings } from './SettingsContext';
import { calculateCartTotals } from '../utils/cartCalculations';
import { saveTransactionToData } from '../services/transactionService';
import { requestAutoSync, sendCustomerDisplayEvent, sendKitchenDisplayEvent } from '../services/appEvents';
import type { CartItem, Discount, Product, HeldCart, Transaction as TransactionType, Payment, PaymentMethod, Addon, Reward, Customer, OrderType, ProductVariant, SelectedModifier } from '../types';

interface CartContextType {
    cart: CartItem[];
    cartDiscount: Discount | null;
    heldCarts: HeldCart[];
    activeHeldCartId: string | null;
    appliedRewards: { reward: Reward, cartItem: CartItem }[];
    orderType: OrderType;
    tableNumber: string;
    paxCount: number;
    setOrderType: (type: OrderType) => void;
    setTableNumber: (num: string) => void;
    setPaxCount: (count: number) => void;
    addToCart: (product: Product) => void;
    addConfiguredItemToCart: (product: Product, addons: Addon[], variant?: ProductVariant, modifiers?: SelectedModifier[]) => void;
    updateCartQuantity: (cartItemId: string, quantity: number) => void;
    removeFromCart: (cartItemId: string) => void;
    clearCart: () => void;
    getCartTotals: () => { 
        subtotal: number; 
        itemDiscountAmount: number; 
        cartDiscountAmount: number; 
        taxAmount: number;
        serviceChargeAmount: number;
        finalTotal: number 
    };
    applyItemDiscount: (cartItemId: string, discount: Discount) => void;
    removeItemDiscount: (cartItemId: string) => void;
    applyCartDiscount: (discount: Discount) => void;
    removeCartDiscount: () => void;
    holdActiveCart: (name: string) => void;
    switchActiveCart: (cartId: string | null) => void;
    deleteHeldCart: (cartId: string) => void;
    updateHeldCartName: (cartId: string, newName: string) => void;
    saveTransaction: (details: {
        payments: Array<Omit<Payment, 'id' | 'createdAt'>>;
        customerName?: string;
        customerContact?: string;
        customerId?: string;
    }) => TransactionType;
    applyRewardToCart: (reward: Reward, customer: Customer, silent?: boolean) => void;
    applyManualReward: (pointsCost: number, discountAmount: number, customer: Customer) => void;
    removeRewardFromCart: () => void;
    splitCart: (itemsToKeep: string[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children?: React.ReactNode}> = ({ children }) => {
    const { setData } = useDataActions();
    const { heldCarts = [] } = useSalesData();
    const { showAlert } = useUIActions();
    const { currentUser } = useAuthState();
    const { receiptSettings } = useSettings();
    const { products, rawMaterials, inventorySettings } = useProduct();

    const defaultOrderType = receiptSettings.orderTypes && receiptSettings.orderTypes.length > 0 ? receiptSettings.orderTypes[0] : 'Makan di Tempat';
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartDiscount, setCartDiscount] = useState<Discount | null>(null);
    const [activeHeldCartId, setActiveHeldCartId] = useState<string | null>(null);
    const [appliedRewards, setAppliedRewards] = useState<{ reward: Reward, cartItem: CartItem }[]>([]);
    const [orderType, setOrderType] = useState<OrderType>(defaultOrderType);
    const [tableNumber, setTableNumber] = useState('');
    const [paxCount, setPaxCount] = useState(0);

    // --- EFFECT: SYNC TO CUSTOMER DISPLAY ---
    useEffect(() => {
        const totals = calculateCartTotals(cart, cartDiscount, receiptSettings);
        void sendCustomerDisplayEvent({
            type: 'CART_UPDATE',
            cartItems: cart,
            subtotal: totals.subtotal,
            discount: totals.itemDiscountAmount + totals.cartDiscountAmount,
            tax: totals.taxAmount + totals.serviceChargeAmount,
            total: totals.finalTotal,
            shopName: receiptSettings.shopName
        });
    }, [cart, cartDiscount, receiptSettings]);

    const removeRewardFromCart = useCallback(() => {
        setCart(prev => prev.filter(item => !item.isReward));
        setAppliedRewards([]);
    }, [setCart, setAppliedRewards]);

    const applyRewardToCart = useCallback((reward: Reward, customer: Customer, silent: boolean = false) => {
        // Calculate total points cost of existing rewards
        const totalExistingCost = appliedRewards.reduce((sum, ar) => sum + ar.reward.pointsCost, 0);
        const newTotalCost = totalExistingCost + reward.pointsCost;

        if (customer.points < newTotalCost) {
            if (!silent) {
                showAlert({ type: 'alert', title: 'Poin Tidak Cukup', message: `Total poin (${newTotalCost}) melebihi poin pelanggan (${customer.points}).` });
            }
            return;
        }

        let rewardCartItem: CartItem | null = null;
        if (reward.type === 'discount_amount' && reward.discountValue) {
            rewardCartItem = {
                id: `reward-${reward.id}`, cartItemId: `reward-${Date.now()}`, name: `Reward: ${reward.name}`,
                price: -reward.discountValue, quantity: 1, isReward: true, rewardId: reward.id, category: [],
            };
        } else if (reward.type === 'free_product' && reward.freeProductId) {
            const product = products.find(p => p.id === reward.freeProductId);
            if (product) {
                rewardCartItem = {
                    ...product, cartItemId: `reward-${Date.now()}`, price: 0, quantity: 1,
                    isReward: true, rewardId: reward.id, name: `${product.name} (Reward)`,
                };
            } else {
                if (!silent) {
                    showAlert({ type: 'alert', title: 'Produk Tidak Ditemukan', message: 'Produk untuk reward ini tidak dapat ditemukan.' });
                }
                return;
            }
        }

        if (rewardCartItem) {
            setCart(prev => [...prev, rewardCartItem!]);
            setAppliedRewards(prev => [...prev, { reward, cartItem: rewardCartItem! }]);
        }
    }, [products, showAlert, appliedRewards, setAppliedRewards]);

    const applyManualReward = useCallback((pointsCost: number, discountAmount: number, customer: Customer) => {
        const totalExistingCost = appliedRewards.reduce((sum, ar) => sum + ar.reward.pointsCost, 0);
        const newTotalCost = totalExistingCost + pointsCost;

        if (customer.points < newTotalCost) {
            showAlert({ type: 'alert', title: 'Poin Tidak Cukup', message: `Total poin (${newTotalCost}) melebihi poin pelanggan (${customer.points}).` });
            return;
        }

        const manualReward: Reward = {
            id: `manual-${Date.now()}`,
            name: `Potongan Poin (${pointsCost} Pts)`,
            type: 'discount_amount',
            pointsCost: pointsCost,
            discountValue: discountAmount
        };

        const rewardCartItem: CartItem = {
            id: manualReward.id,
            cartItemId: `reward-${Date.now()}`,
            name: manualReward.name,
            price: -discountAmount,
            quantity: 1,
            isReward: true,
            rewardId: manualReward.id,
            category: [],
        };

        setCart(prev => [...prev, rewardCartItem]);
        setAppliedRewards(prev => [...prev, { reward: manualReward, cartItem: rewardCartItem }]);
    }, [appliedRewards, setAppliedRewards, showAlert]);
    
    const checkStockAvailability = useCallback((productId: string, currentCartQuantity: number, addedQuantity: number) => {
        if (!inventorySettings.enabled || !inventorySettings.preventNegativeStock) return true;

        const product = products.find(p => p.id === productId);
        if (!product) return true;

        const totalRequested = currentCartQuantity + addedQuantity;

        // 1. Cek Stok Produk Langsung
        if (product.trackStock && (product.stock || 0) < totalRequested) {
            showAlert({ type: 'alert', title: 'Stok Tidak Cukup', message: `Hanya tersedia ${product.stock} ${product.name}.` });
            return false;
        }

        // 2. Cek Stok Bahan Baku (Resep)
        if (inventorySettings.trackIngredients && product.recipe && product.recipe.length > 0) {
            for (const item of product.recipe) {
                const requiredQtyPerUnit = item.quantity;
                const totalRequired = requiredQtyPerUnit * totalRequested;
                
                if (item.itemType === 'raw_material' && item.rawMaterialId) {
                    const material = rawMaterials.find(m => m.id === item.rawMaterialId);
                    if (material && (material.stock || 0) < totalRequired) {
                        const maxPossible = Math.floor((material.stock || 0) / requiredQtyPerUnit);
                        showAlert({ 
                            type: 'alert', 
                            title: 'Bahan Baku Habis', 
                            message: `Bahan '${material.name}' tidak cukup. Hanya bisa membuat ${maxPossible} porsi.` 
                        });
                        return false;
                    }
                }
            }
        }

        return true;
    }, [inventorySettings, products, rawMaterials, showAlert]);

    const addToCart = useCallback((product: Product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => 
                item.id === product.id && 
                !item.isReward && 
                (!item.selectedAddons || item.selectedAddons.length === 0) &&
                !item.selectedVariant &&
                (!item.selectedModifiers || item.selectedModifiers.length === 0)
            );
            const currentQty = existingItem ? existingItem.quantity : 0;
            if (!checkStockAvailability(product.id, currentQty, 1)) return prevCart;
            
            if (existingItem) {
                return prevCart.map(item => item.cartItemId === existingItem.cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prevCart, { ...product, quantity: 1, cartItemId: Date.now().toString() }];
        });
    }, [checkStockAvailability]);
    
    const addConfiguredItemToCart = useCallback((product: Product, addons: Addon[], variant?: ProductVariant, modifiers?: SelectedModifier[]) => {
      setCart(prevCart => {
         const currentTotalQty = prevCart.filter(i => i.id === product.id).reduce((sum, i) => sum + i.quantity, 0);
         if (!checkStockAvailability(product.id, currentTotalQty, 1)) return prevCart;
         
         const newItem: CartItem = { 
             ...product, 
             quantity: 1, 
             cartItemId: Date.now().toString(), 
             selectedAddons: addons, 
             selectedVariant: variant, 
             selectedModifiers: modifiers,
             price: variant ? variant.price : product.price,
             name: variant ? `${product.name} (${variant.name})` : product.name,
             costPrice: variant?.costPrice !== undefined ? variant.costPrice : product.costPrice
         };
         return [...prevCart, newItem];
      });
    }, [checkStockAvailability]);

    const updateCartQuantity = useCallback((cartItemId: string, quantity: number) => {
        setCart(prevCart => {
            const itemToUpdate = prevCart.find(item => item.cartItemId === cartItemId);
            if (!itemToUpdate) return prevCart;
            if (quantity <= 0) return prevCart.filter(item => item.cartItemId !== cartItemId || item.isReward);

            if (quantity > itemToUpdate.quantity) {
                const otherItemsQty = prevCart.filter(i => i.id === itemToUpdate.id && i.cartItemId !== cartItemId).reduce((sum, i) => sum + i.quantity, 0);
                const totalRequested = otherItemsQty + quantity; 
                if (!checkStockAvailability(itemToUpdate.id, 0, totalRequested)) return prevCart;
            }
            return prevCart.map(item => item.cartItemId === cartItemId && !item.isReward ? { ...item, quantity } : item);
        });
    }, [checkStockAvailability]);

    const removeFromCart = useCallback((cartItemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId || item.isReward));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        setAppliedRewards([]);
        setCartDiscount(null);
        setOrderType(defaultOrderType);
        setTableNumber(''); 
        setPaxCount(0);     

        void sendCustomerDisplayEvent({
            type: 'CART_UPDATE',
            cartItems: [],
            subtotal: 0, discount: 0, tax: 0, total: 0,
            shopName: receiptSettings.shopName
        });
    }, [setAppliedRewards, defaultOrderType, receiptSettings]);

    const getCartTotals = useCallback(() => {
        return calculateCartTotals(cart, cartDiscount, receiptSettings);
    }, [cart, cartDiscount, receiptSettings]);

    const applyItemDiscount = useCallback((cartItemId: string, discount: Discount) => {
        setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, discount } : item));
    }, []);

    const removeItemDiscount = useCallback((cartItemId: string) => {
        setCart(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) {
                const { discount, ...rest } = item;
                return rest;
            }
            return item;
        }));
    }, []);

    const applyCartDiscount = useCallback((discount: Discount) => {
        setCartDiscount(discount);
    }, []);

    const removeCartDiscount = useCallback(() => {
        setCartDiscount(null);
    }, []);

    const saveCurrentCartState = useCallback(() => {
        if (activeHeldCartId) {
            setData(prev => {
                const currentCartInState = prev.heldCarts?.find(c => c.id === activeHeldCartId);
                if (currentCartInState) {
                    return {
                        ...prev,
                        heldCarts: (prev.heldCarts || []).map(hc => hc.id === activeHeldCartId ? { 
                            ...hc, items: cart, orderType, tableNumber, paxCount 
                        } : hc)
                    };
                }
                return prev;
            });
        }
    }, [activeHeldCartId, cart, orderType, tableNumber, paxCount, setData]);

    const switchActiveCart = useCallback((newCartId: string | null) => {
        saveCurrentCartState();
        removeRewardFromCart();
        removeCartDiscount();
        
        if (newCartId === null) {
            setCart([]);
            setOrderType(defaultOrderType);
            setTableNumber('');
            setPaxCount(0);
            setActiveHeldCartId(null);
        } else {
            const targetCart = heldCarts.find(c => c.id === newCartId);
            if (targetCart) {
                setCart(targetCart.items);
                setOrderType(targetCart.orderType || defaultOrderType);
                setTableNumber(targetCart.tableNumber || '');
                setPaxCount(targetCart.paxCount || 0);
                setActiveHeldCartId(newCartId);
            }
        }
    }, [saveCurrentCartState, removeRewardFromCart, heldCarts, removeCartDiscount, defaultOrderType]);
      
    const holdActiveCart = useCallback((name: string) => {
        if (cart.length === 0) {
            showAlert({ type: 'alert', title: 'Keranjang Kosong', message: 'Tidak dapat menyimpan keranjang yang kosong.' });
            return;
        }
        saveCurrentCartState();
        const newHeldCart: HeldCart = { 
            id: Date.now().toString(), name, items: cart, 
            orderType, tableNumber, paxCount 
        };
        setData(prev => ({ ...prev, heldCarts: [...(prev.heldCarts || []), newHeldCart] }));
        
        void sendKitchenDisplayEvent({
            type: 'NEW_ORDER',
            orderId: newHeldCart.id,
            orderType: orderType,
            customerName: name,
            items: cart,
            timestamp: new Date().toISOString(),
            isPaid: false,
            tableNumber, 
            paxCount
        });

        switchActiveCart(newHeldCart.id);
        showAlert({ type: 'alert', title: 'Tersimpan & Terkirim', message: `Pesanan "${name}" disimpan dan dikirim ke Layar Dapur.` });
    }, [cart, orderType, tableNumber, paxCount, saveCurrentCartState, setData, switchActiveCart, showAlert]);

    const deleteHeldCart = useCallback((cartId: string) => {
        showAlert({
            type: 'confirm', title: 'Hapus Pesanan?',
            message: 'Anda yakin ingin menghapus pesanan yang disimpan ini secara permanen?',
            confirmVariant: 'danger',
            onConfirm: () => {
                if (cartId === activeHeldCartId) {
                    switchActiveCart(null);
                }
                setData(prev => {
                    const newHeldCarts = (prev.heldCarts || []).filter(c => c.id !== cartId);
                    return { ...prev, heldCarts: newHeldCarts };
                });
            }
        });
    }, [activeHeldCartId, setData, switchActiveCart, showAlert]);

    const updateHeldCartName = useCallback((cartId: string, newName: string) => {
        setData(prev => ({
            ...prev,
            heldCarts: (prev.heldCarts || []).map(c => c.id === cartId ? { ...c, name: newName } : c)
        }));
    }, [setData]);

    const splitCart = useCallback((itemsToKeep: string[]) => {
        const itemsToMove = cart.filter(item => !itemsToKeep.includes(item.cartItemId));
        const keptItems = cart.filter(item => itemsToKeep.includes(item.cartItemId));

        if (itemsToMove.length === 0) return;

        const timestamp = new Date();
        const timeStr = timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const newCartName = `Sisa Split ${timeStr}`;

        const newHeldCart: HeldCart = {
            id: `split-${Date.now()}`,
            name: newCartName,
            items: itemsToMove,
            orderType: orderType,
            tableNumber,
            paxCount
        };

        setCart(keptItems);
        setData(prev => ({ ...prev, heldCarts: [...(prev.heldCarts || []), newHeldCart] }));
        
        showAlert({ type: 'alert', title: 'Split Berhasil', message: `${itemsToMove.length} item dipindahkan ke "${newCartName}".` });

    }, [cart, orderType, tableNumber, paxCount, setData, showAlert]);

    // ==================================================================================
    // CORE LOGIC: Save Transaction & DEDUCT INVENTORY
    // ==================================================================================
    const saveTransaction = useCallback(({ payments, customerName, customerContact, customerId }: {
        payments: Array<Omit<Payment, 'id' | 'createdAt'>>; customerName?: string; customerContact?: string; customerId?: string;
    }) => {
        if (cart.length === 0) throw new Error("Cart is empty");
        if (!currentUser) throw new Error("No user is logged in");

        const totals = getCartTotals();
        const { finalTotal } = totals;
        const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const paymentStatus = amountPaid >= finalTotal - 0.01 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');
        
        const now = new Date();

        if (paymentStatus === 'paid') {
            const change = amountPaid - finalTotal;
            void sendCustomerDisplayEvent({
                type: 'PAYMENT_SUCCESS',
                cartItems: [], subtotal: 0, discount: 0, tax: 0,
                total: finalTotal, change: change > 0 ? change : 0, shopName: receiptSettings.shopName
            });
        }
        let newTransaction!: TransactionType;
        setData(prev => {
            const result = saveTransactionToData({
                prevData: prev,
                cart,
                cartDiscount,
                payments,
                customerName,
                customerContact,
                customerId,
                currentUser,
                appliedRewards,
                activeHeldCartId,
                orderType,
                tableNumber,
                paxCount,
                receiptSettings,
                totals,
                now,
            });
            newTransaction = result.transaction;
            return result.nextData;
        });

        void sendKitchenDisplayEvent({
            type: 'NEW_ORDER',
            orderId: newTransaction.id,
            orderType: orderType,
            customerName: customerName || `Order #${newTransaction.id.slice(-4)}`,
            items: cart,
            timestamp: now.toISOString(),
            isPaid: true,
            tableNumber,
            paxCount
        });

        switchActiveCart(null);
        setTimeout(() => requestAutoSync({ staffName: currentUser.name }), 500);

        return newTransaction;
    }, [cart, getCartTotals, setData, currentUser, appliedRewards, activeHeldCartId, switchActiveCart, cartDiscount, orderType, tableNumber, paxCount, receiptSettings]);
    
    return (
        <CartContext.Provider value={{
            cart, cartDiscount, heldCarts, activeHeldCartId, appliedRewards, 
            orderType, tableNumber, paxCount,
            setOrderType, setTableNumber, setPaxCount,
            addToCart, addConfiguredItemToCart, updateCartQuantity, removeFromCart, clearCart, getCartTotals,
            applyItemDiscount, removeItemDiscount, applyCartDiscount, removeCartDiscount,
            holdActiveCart, switchActiveCart, deleteHeldCart, updateHeldCartName, saveTransaction,
            applyRewardToCart, applyManualReward, removeRewardFromCart, splitCart
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

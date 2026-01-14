
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { useProduct } from './ProductContext';
import { useSettings } from './SettingsContext';
import { useCloudSync } from './CloudSyncContext'; // NEW
import { useAudit } from './AuditContext'; // IMPORT AUDIT
import { calculateCartTotals } from '../utils/cartCalculations'; // NEW
import type { CartItem, Discount, Product, HeldCart, Transaction as TransactionType, Payment, PaymentMethod, PaymentStatus, Addon, Reward, Customer, OrderType, ProductVariant, SelectedModifier } from '../types';

interface CartContextType {
    cart: CartItem[];
    cartDiscount: Discount | null;
    heldCarts: HeldCart[];
    activeHeldCartId: string | null;
    appliedReward: { reward: Reward, cartItem: CartItem } | null;
    orderType: OrderType;
    setOrderType: (type: OrderType) => void;
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
    applyRewardToCart: (reward: Reward, customer: Customer) => void;
    removeRewardFromCart: () => void;
    splitCart: (itemsToKeep: string[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children?: React.ReactNode}> = ({ children }) => {
    const { data, setData } = useData();
    const { triggerAutoSync } = useCloudSync(); // Use new hook
    const { logAudit } = useAudit(); // Hook Audit
    const { showAlert } = useUI();
    const { currentUser } = useAuth();
    const { receiptSettings } = useSettings();
    const { products, rawMaterials, inventorySettings, isProductAvailable } = useProduct();
    const { heldCarts = [] } = data;

    const defaultOrderType = receiptSettings.orderTypes && receiptSettings.orderTypes.length > 0 ? receiptSettings.orderTypes[0] : 'Makan di Tempat';
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartDiscount, setCartDiscount] = useState<Discount | null>(null);
    const [activeHeldCartId, setActiveHeldCartId] = useState<string | null>(null);
    const [appliedReward, setAppliedReward] = useState<{ reward: Reward, cartItem: CartItem } | null>(null);
    const [orderType, setOrderType] = useState<OrderType>(defaultOrderType);

    const removeRewardFromCart = useCallback(() => {
        setCart(prev => prev.filter(item => !item.isReward));
        setAppliedReward(null);
    }, [setCart, setAppliedReward]);

    const applyRewardToCart = useCallback((reward: Reward, customer: Customer) => {
        if (customer.points < reward.pointsCost) {
            showAlert({ type: 'alert', title: 'Poin Tidak Cukup', message: 'Poin pelanggan tidak cukup untuk menukarkan reward ini.' });
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
                showAlert({ type: 'alert', title: 'Produk Tidak Ditemukan', message: 'Produk untuk reward ini tidak dapat ditemukan.' });
                return;
            }
        }

        if (rewardCartItem) {
            removeRewardFromCart();
            setCart(prev => [...prev, rewardCartItem!]);
            setAppliedReward({ reward, cartItem: rewardCartItem });
        }
    }, [products, showAlert, removeRewardFromCart, setAppliedReward]);
    
    // --- Helper to check stock against current cart quantity ---
    const checkStockAvailability = useCallback((productId: string, currentCartQuantity: number, addedQuantity: number) => {
        if (!inventorySettings.enabled || !inventorySettings.preventNegativeStock) return true;

        const product = products.find(p => p.id === productId);
        if (!product) return true;

        const totalRequested = currentCartQuantity + addedQuantity;

        // 1. Simple Stock Check
        if (product.trackStock && (product.stock || 0) < totalRequested) {
            showAlert({ type: 'alert', title: 'Stok Tidak Cukup', message: `Hanya tersedia ${product.stock} ${product.name}.` });
            return false;
        }

        // 2. Recipe Ingredient Check (Simplification: Only checks first level ingredients)
        if (inventorySettings.trackIngredients && product.recipe && product.recipe.length > 0) {
            for (const item of product.recipe) {
                const requiredQty = item.quantity * totalRequested;
                
                if (item.itemType === 'raw_material' && item.rawMaterialId) {
                    const material = rawMaterials.find(m => m.id === item.rawMaterialId);
                    if (material && (material.stock || 0) < requiredQty) {
                        showAlert({ type: 'alert', title: 'Bahan Baku Habis', message: `Bahan ${material.name} tidak cukup untuk pesanan ini.` });
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
            
            // Validate Stock before adding
            if (!checkStockAvailability(product.id, currentQty, 1)) {
                return prevCart;
            }
            
            if (existingItem) {
                return prevCart.map(item => item.cartItemId === existingItem.cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prevCart, { ...product, quantity: 1, cartItemId: Date.now().toString() }];
        });
    }, [checkStockAvailability]);
    
    const addConfiguredItemToCart = useCallback((product: Product, addons: Addon[], variant?: ProductVariant, modifiers?: SelectedModifier[]) => {
      setCart(prevCart => {
         // Check total quantity of this product ID across all cart items (variants/addons matter for uniqueness but share same stock ID)
         const currentTotalQty = prevCart.filter(i => i.id === product.id).reduce((sum, i) => sum + i.quantity, 0);
         
         if (!checkStockAvailability(product.id, currentTotalQty, 1)) {
             return prevCart;
         }
         
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

            if (quantity <= 0) {
                return prevCart.filter(item => item.cartItemId !== cartItemId || item.isReward);
            }

            // Check if increasing quantity
            if (quantity > itemToUpdate.quantity) {
                // Calculate total existing quantity of this product in cart EXCLUDING this item
                const otherItemsQty = prevCart.filter(i => i.id === itemToUpdate.id && i.cartItemId !== cartItemId).reduce((sum, i) => sum + i.quantity, 0);
                const totalRequested = otherItemsQty + quantity; // New total if update allowed
                
                // We use checkStockAvailability with current=otherItemsQty and added=quantity because logic sums them
                // Actually easier: checkStockAvailability expects current (before add) and added (delta). 
                // Let's pass 0 as current and Total Requested as Added to reuse logic for total check.
                if (!checkStockAvailability(itemToUpdate.id, 0, totalRequested)) {
                    return prevCart;
                }
            }

            return prevCart.map(item => item.cartItemId === cartItemId && !item.isReward ? { ...item, quantity } : item);
        });
    }, [checkStockAvailability]);

    const removeFromCart = useCallback((cartItemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId || item.isReward));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        setAppliedReward(null);
        setCartDiscount(null);
        setOrderType(defaultOrderType);
    }, [setAppliedReward, defaultOrderType]);

    // REFACTORED: Use utility function
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
                if (currentCartInState && (JSON.stringify(currentCartInState.items) !== JSON.stringify(cart) || currentCartInState.orderType !== orderType)) {
                    return {
                        ...prev,
                        heldCarts: (prev.heldCarts || []).map(hc => hc.id === activeHeldCartId ? { ...hc, items: cart, orderType: orderType } : hc)
                    };
                }
                return prev;
            });
        }
    }, [activeHeldCartId, cart, orderType, setData]);

    const switchActiveCart = useCallback((newCartId: string | null) => {
        saveCurrentCartState();
        removeRewardFromCart();
        removeCartDiscount();
        
        if (newCartId === null) {
            setCart([]);
            setOrderType(defaultOrderType);
            setActiveHeldCartId(null);
        } else {
            const targetCart = data.heldCarts.find(c => c.id === newCartId);
            if (targetCart) {
                setCart(targetCart.items);
                setOrderType(targetCart.orderType || defaultOrderType);
                setActiveHeldCartId(newCartId);
            }
        }
    }, [saveCurrentCartState, removeRewardFromCart, data.heldCarts, removeCartDiscount, defaultOrderType]);
      
    const holdActiveCart = useCallback((name: string) => {
        if (cart.length === 0) {
            showAlert({ type: 'alert', title: 'Keranjang Kosong', message: 'Tidak dapat menyimpan keranjang yang kosong.' });
            return;
        }
        saveCurrentCartState();
        const newHeldCart: HeldCart = { id: Date.now().toString(), name, items: cart, orderType };
        setData(prev => ({ ...prev, heldCarts: [...(prev.heldCarts || []), newHeldCart] }));
        switchActiveCart(newHeldCart.id);
        showAlert({ type: 'alert', title: 'Tersimpan', message: `Pesanan "${name}" berhasil disimpan.` });
    }, [cart, orderType, saveCurrentCartState, setData, switchActiveCart, showAlert]);

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
            orderType: orderType
        };

        setCart(keptItems);
        setData(prev => ({ ...prev, heldCarts: [...(prev.heldCarts || []), newHeldCart] }));
        
        showAlert({ type: 'alert', title: 'Split Berhasil', message: `${itemsToMove.length} item dipindahkan ke "${newCartName}".` });

    }, [cart, orderType, setData, showAlert]);

    const saveTransaction = useCallback(({ payments, customerName, customerContact, customerId }: {
        payments: Array<Omit<Payment, 'id' | 'createdAt'>>; customerName?: string; customerContact?: string; customerId?: string;
    }) => {
        if (cart.length === 0) throw new Error("Cart is empty");
        if (!currentUser) throw new Error("No user is logged in");

        const { finalTotal, taxAmount, serviceChargeAmount } = getCartTotals();
        const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        let paymentStatus: PaymentStatus = amountPaid >= finalTotal - 0.01 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');
        
        const now = new Date();
        const fullPayments: Payment[] = payments.map((p, index) => ({ ...p, id: `${now.getTime()}-${index}`, createdAt: now.toISOString() }));

        const cartWithCost = cart.map(item => {
            const product = products.find(p => p.id === item.id);
            const addonsCost = item.selectedAddons?.reduce((sum, addon) => sum + (addon.costPrice || 0), 0) || 0;

            if (inventorySettings.enabled && inventorySettings.trackIngredients && product?.recipe) {
                const recipeCost = product.recipe.reduce((sum, recipeItem) => {
                    if (recipeItem.itemType === 'product' && recipeItem.productId) {
                        const subProduct = products.find(p => p.id === recipeItem.productId);
                        return sum + ((subProduct?.costPrice || 0) * recipeItem.quantity);
                    } else {
                        const materialId = recipeItem.rawMaterialId || '';
                        const material = rawMaterials.find(rm => rm.id === materialId);
                        return sum + ((material?.costPerUnit || 0) * recipeItem.quantity);
                    }
                }, 0);
                return { ...item, costPrice: recipeCost + addonsCost };
            }
            return { ...item, costPrice: (item.costPrice || product?.costPrice || 0) + addonsCost };
        });

        // GENERATE GLOBAL UNIQUE ID: [STORE_ID]-[TIMESTAMP]-[USER_SUFFIX]-[RANDOM_2]
        const storeIdPrefix = receiptSettings.storeId ? receiptSettings.storeId.replace(/[^a-zA-Z0-9]/g, '') : 'LOC';
        const timestampId = now.getTime().toString();
        // User Suffix ensures 2 cashiers in same store at same second have different IDs
        const userSuffix = currentUser.id.slice(-4).replace(/[^a-zA-Z0-9]/g, 'X').toUpperCase(); 
        const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
        
        const uniqueId = `${storeIdPrefix}-${timestampId}-${userSuffix}${randomSuffix}`;

        const newTransaction: TransactionType = {
            id: uniqueId, 
            items: cartWithCost, 
            subtotal: getCartTotals().subtotal,
            cartDiscount, 
            total: finalTotal, amountPaid,
            tax: taxAmount, serviceCharge: serviceChargeAmount, orderType,
            paymentStatus, payments: fullPayments, createdAt: now.toISOString(), userId: currentUser.id,
            userName: currentUser.name, customerName, customerContact, customerId,
            storeId: receiptSettings.storeId || 'LOCAL'
        };

        setData(prev => {
            let updatedCustomers = prev.customers;
            let updatedProducts = prev.products;
            let updatedRawMaterials = prev.rawMaterials;
            let updatedHeldCarts = prev.heldCarts || [];

            if (prev.membershipSettings.enabled && customerId) {
                const customer = prev.customers.find(c => c.id === customerId);
                const currentStoreId = receiptSettings.storeId || '';

                if(customer) {
                    let pointsEarned = 0;
                    const cartWithoutRewards = cart.filter(item => !item.isReward);
                    const spendTotal = cartWithoutRewards.reduce((sum, item) => {
                        const addonsTotal = item.selectedAddons?.reduce((s, addon) => s + addon.price, 0) || 0;
                        const modifierTotal = item.selectedModifiers?.reduce((s, mod) => s + mod.price, 0) || 0;
                        const itemTotal = (item.price + addonsTotal + modifierTotal) * item.quantity;
                        return sum + itemTotal;
                    }, 0);
                    
                    prev.membershipSettings.pointRules.forEach(rule => {
                        if (rule.validStoreIds && rule.validStoreIds.length > 0) {
                            if (!rule.validStoreIds.includes(currentStoreId)) return;
                        }

                        if(rule.type === 'spend' && rule.spendAmount && rule.spendAmount > 0 && rule.pointsEarned) {
                            pointsEarned += Math.floor(spendTotal / rule.spendAmount) * rule.pointsEarned;
                        } else if ((rule.type === 'product' || rule.type === 'category') && rule.targetId && rule.pointsPerItem) {
                            cartWithoutRewards.forEach(item => {
                                const isMatch = (rule.type === 'product' && item.id === rule.targetId) || 
                                                (rule.type === 'category' && item.category.includes(rule.targetId));
                                if(isMatch) pointsEarned += (item.quantity * rule.pointsPerItem);
                            });
                        }
                    });
                    
                    newTransaction.pointsEarned = pointsEarned;
                    let pointsSpent = 0;
                    if (appliedReward) {
                        pointsSpent = appliedReward.reward.pointsCost;
                        newTransaction.rewardRedeemed = {
                            rewardId: appliedReward.reward.id,
                            pointsSpent: pointsSpent,
                            description: appliedReward.reward.name,
                        };
                        
                        // AUDIT LOG: Record Reward Redemption
                        logAudit(
                            currentUser,
                            'OTHER', // Generic action type or define REWARD
                            `Tukar Poin: ${appliedReward.reward.name} (-${pointsSpent} pts) oleh ${customer.name}`,
                            uniqueId
                        );
                    }
                    updatedCustomers = prev.customers.map(c => c.id === customerId ? {...c, points: c.points + pointsEarned - pointsSpent} : c);
                }
            }

            if (activeHeldCartId) updatedHeldCarts = updatedHeldCarts.filter(c => c.id !== activeHeldCartId);
            
            if (prev.inventorySettings.enabled) {
                const rawMaterialUpdates = new Map<string, number>();
                const productUpdates = new Map<string, number>();

                const cartWithoutFreeRewards = cart.filter(item => !(item.isReward && item.price === 0));

                cartWithoutFreeRewards.forEach(item => {
                    const product = prev.products.find(p => p.id === item.id);
                    if (!product) return;
                    if (prev.inventorySettings.trackIngredients && product.recipe && product.recipe.length > 0) {
                        product.recipe.forEach(recipeItem => {
                            if (recipeItem.itemType === 'product' && recipeItem.productId) {
                                const totalToDecrement = recipeItem.quantity * item.quantity;
                                productUpdates.set(recipeItem.productId, (productUpdates.get(recipeItem.productId) || 0) + totalToDecrement);
                            } else {
                                const materialId = recipeItem.rawMaterialId || '';
                                const totalToDecrement = recipeItem.quantity * item.quantity;
                                rawMaterialUpdates.set(materialId, (rawMaterialUpdates.get(materialId) || 0) + totalToDecrement);
                            }
                        });
                    } else if (product.trackStock) {
                        productUpdates.set(product.id, (productUpdates.get(product.id) || 0) + item.quantity);
                    }
                });

                if (rawMaterialUpdates.size > 0) {
                    updatedRawMaterials = prev.rawMaterials.map(m => rawMaterialUpdates.has(m.id) ? { ...m, stock: m.stock - (rawMaterialUpdates.get(m.id) || 0) } : m);
                }
                
                if (productUpdates.size > 0) {
                    updatedProducts = prev.products.map(p => {
                        if (productUpdates.has(p.id) && p.trackStock) {
                            return { ...p, stock: (p.stock || 0) - (productUpdates.get(p.id) || 0) };
                        }
                        return p;
                    });
                }
            }
            return { ...prev, transactionRecords: [newTransaction, ...prev.transactionRecords], products: updatedProducts, rawMaterials: updatedRawMaterials, customers: updatedCustomers, heldCarts: updatedHeldCarts };
        });
        
        switchActiveCart(null);
        
        // Pass User Name for Sync Log
        setTimeout(() => triggerAutoSync(currentUser.name), 500);

        return newTransaction;
    }, [cart, getCartTotals, setData, currentUser, appliedReward, activeHeldCartId, switchActiveCart, cartDiscount, inventorySettings, rawMaterials, products, orderType, receiptSettings.storeId, triggerAutoSync, logAudit]);
    
    return (
        <CartContext.Provider value={{
            cart, cartDiscount, heldCarts, activeHeldCartId, appliedReward, orderType, setOrderType,
            addToCart, addConfiguredItemToCart, updateCartQuantity, removeFromCart, clearCart, getCartTotals,
            applyItemDiscount, removeItemDiscount, applyCartDiscount, removeCartDiscount,
            holdActiveCart, switchActiveCart, deleteHeldCart, updateHeldCartName, saveTransaction,
            applyRewardToCart, removeRewardFromCart, splitCart
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

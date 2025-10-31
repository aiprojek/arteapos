import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { useProduct } from './ProductContext';
import type { CartItem, Discount, Product, HeldCart, Transaction as TransactionType, Payment, PaymentMethod, PaymentStatus, Addon, Reward, Customer } from '../types';

interface CartContextType {
    cart: CartItem[];
    cartDiscount: Discount | null;
    heldCarts: HeldCart[];
    activeHeldCartId: string | null;
    appliedReward: { reward: Reward, cartItem: CartItem } | null;
    addToCart: (product: Product) => void;
    addConfiguredItemToCart: (product: Product, addons: Addon[]) => void;
    updateCartQuantity: (cartItemId: string, quantity: number) => void;
    removeFromCart: (cartItemId: string) => void;
    clearCart: () => void;
    getCartTotals: () => { subtotal: number; itemDiscountAmount: number; cartDiscountAmount: number; finalTotal: number };
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// FIX: Change to React.FC to fix children prop type error
export const CartProvider: React.FC<{children?: React.ReactNode}> = ({ children }) => {
    const { data, setData } = useData();
    const { showAlert } = useUI();
    const { currentUser } = useAuth();
    const { products, rawMaterials, inventorySettings, isProductAvailable } = useProduct();
    const { heldCarts = [] } = data;

    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartDiscount, setCartDiscount] = useState<Discount | null>(null);
    const [activeHeldCartId, setActiveHeldCartId] = useState<string | null>(null);
    const [appliedReward, setAppliedReward] = useState<{ reward: Reward, cartItem: CartItem } | null>(null);

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
            removeRewardFromCart(); // Hapus reward lama jika ada
            setCart(prev => [...prev, rewardCartItem!]);
            setAppliedReward({ reward, cartItem: rewardCartItem });
        }
    }, [products, showAlert, removeRewardFromCart, setAppliedReward]);
    
    const addToCart = useCallback((product: Product) => {
        setCart(prevCart => {
            const { available, reason } = isProductAvailable(product);
            if (!available) {
                showAlert({ type: 'alert', title: 'Gagal Menambahkan Produk', message: `Tidak dapat menambahkan ${product.name}. ${reason}.` });
                return prevCart;
            }
            const existingItem = prevCart.find(item => item.id === product.id && !item.isReward && (!item.selectedAddons || item.selectedAddons.length === 0));
            if (existingItem) {
                return prevCart.map(item => item.cartItemId === existingItem.cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prevCart, { ...product, quantity: 1, cartItemId: Date.now().toString() }];
        });
    }, [isProductAvailable, showAlert]);
    
    const addConfiguredItemToCart = useCallback((product: Product, addons: Addon[]) => {
      setCart(prevCart => {
         const { available, reason } = isProductAvailable(product);
         if (!available) {
            showAlert({ type: 'alert', title: 'Gagal Menambahkan Produk', message: `Tidak dapat menambahkan ${product.name}. ${reason}.`});
            return prevCart;
         }
         const newItem: CartItem = { ...product, quantity: 1, cartItemId: Date.now().toString(), selectedAddons: addons };
         return [...prevCart, newItem];
      });
    }, [isProductAvailable, showAlert]);

    const updateCartQuantity = useCallback((cartItemId: string, quantity: number) => {
        setCart(prevCart => {
            if (quantity <= 0) {
                return prevCart.filter(item => item.cartItemId !== cartItemId || item.isReward);
            }
            return prevCart.map(item => item.cartItemId === cartItemId && !item.isReward ? { ...item, quantity } : item);
        });
    }, []);

    const removeFromCart = useCallback((cartItemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId || item.isReward));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        setAppliedReward(null);
        setCartDiscount(null);
    }, [setAppliedReward]);

    const getCartTotals = useCallback(() => {
        let subtotal = 0;
        let itemDiscountAmount = 0;

        cart.forEach(item => {
            if(item.isReward) {
                // Reward items might have negative price (for discounts)
                subtotal += item.price * item.quantity;
                return;
            }
            const addonsTotal = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
            const itemOriginalTotal = (item.price + addonsTotal) * item.quantity;
            let currentItemDiscount = 0;
            if (item.discount) {
                if (item.discount.type === 'amount') {
                    currentItemDiscount = item.discount.value * item.quantity;
                } else {
                    currentItemDiscount = itemOriginalTotal * (item.discount.value / 100);
                }
            }
            currentItemDiscount = Math.min(currentItemDiscount, itemOriginalTotal);
            subtotal += itemOriginalTotal;
            itemDiscountAmount += currentItemDiscount;
        });

        const subtotalAfterItemDiscounts = subtotal - itemDiscountAmount;
        let cartDiscountAmount = 0;
        if (cartDiscount) {
            if (cartDiscount.type === 'amount') {
                cartDiscountAmount = cartDiscount.value;
            } else {
                cartDiscountAmount = subtotalAfterItemDiscounts * (cartDiscount.value / 100);
            }
        }
        cartDiscountAmount = Math.min(cartDiscountAmount, subtotalAfterItemDiscounts);
        const finalTotal = subtotalAfterItemDiscounts - cartDiscountAmount;
        return { subtotal, itemDiscountAmount, cartDiscountAmount, finalTotal };
    }, [cart, cartDiscount]);

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
                if (currentCartInState && JSON.stringify(currentCartInState.items) !== JSON.stringify(cart)) {
                    return {
                        ...prev,
                        heldCarts: (prev.heldCarts || []).map(hc => hc.id === activeHeldCartId ? { ...hc, items: cart } : hc)
                    };
                }
                return prev;
            });
        }
    }, [activeHeldCartId, cart, setData]);

    const switchActiveCart = useCallback((newCartId: string | null) => {
        saveCurrentCartState();
        removeRewardFromCart();
        removeCartDiscount();
        
        if (newCartId === null) {
            setCart([]);
            setActiveHeldCartId(null);
        } else {
            const targetCart = data.heldCarts.find(c => c.id === newCartId);
            if (targetCart) {
                setCart(targetCart.items);
                setActiveHeldCartId(newCartId);
            }
        }
    }, [saveCurrentCartState, removeRewardFromCart, data.heldCarts, removeCartDiscount]);
      
    const holdActiveCart = useCallback((name: string) => {
        if (cart.length === 0) {
            showAlert({ type: 'alert', title: 'Keranjang Kosong', message: 'Tidak dapat menyimpan keranjang yang kosong.' });
            return;
        }
        saveCurrentCartState();
        const newHeldCart: HeldCart = { id: Date.now().toString(), name, items: cart };
        setData(prev => ({ ...prev, heldCarts: [...(prev.heldCarts || []), newHeldCart] }));
        switchActiveCart(newHeldCart.id);
        showAlert({ type: 'alert', title: 'Tersimpan', message: `Pesanan "${name}" berhasil disimpan.` });
    }, [cart, saveCurrentCartState, setData, switchActiveCart, showAlert]);

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

    const saveTransaction = useCallback(({ payments, customerName, customerContact, customerId }: {
        payments: Array<Omit<Payment, 'id' | 'createdAt'>>; customerName?: string; customerContact?: string; customerId?: string;
    }) => {
        if (cart.length === 0) throw new Error("Cart is empty");
        if (!currentUser) throw new Error("No user is logged in");

        const { subtotal, finalTotal } = getCartTotals();
        const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        let paymentStatus: PaymentStatus = amountPaid >= finalTotal - 0.01 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');
        
        const now = new Date();
        const fullPayments: Payment[] = payments.map((p, index) => ({ ...p, id: `${now.getTime()}-${index}`, createdAt: now.toISOString() }));

        const cartWithCost = cart.map(item => {
            const product = products.find(p => p.id === item.id);
            const addonsCost = item.selectedAddons?.reduce((sum, addon) => sum + (addon.costPrice || 0), 0) || 0;

            if (inventorySettings.enabled && inventorySettings.trackIngredients && product?.recipe) {
                const recipeCost = product.recipe.reduce((sum, recipeItem) => {
                    const material = rawMaterials.find(rm => rm.id === recipeItem.rawMaterialId);
                    return sum + ((material?.costPerUnit || 0) * recipeItem.quantity);
                }, 0);
                return { ...item, costPrice: recipeCost + addonsCost };
            }
            return { ...item, costPrice: (product?.costPrice || 0) + addonsCost };
        });

        const newTransaction: TransactionType = {
            id: now.getTime().toString(), items: cartWithCost, subtotal, cartDiscount, total: finalTotal, amountPaid,
            paymentStatus, payments: fullPayments, createdAt: now.toISOString(), userId: currentUser.id,
            userName: currentUser.name, customerName, customerContact, customerId,
        };

        setData(prev => {
            let updatedCustomers = prev.customers;
            let updatedProducts = prev.products;
            let updatedRawMaterials = prev.rawMaterials;
            let updatedHeldCarts = prev.heldCarts || [];

            if (prev.membershipSettings.enabled && customerId) {
                const customer = prev.customers.find(c => c.id === customerId);
                if(customer) {
                    let pointsEarned = 0;
                    const cartWithoutRewards = cart.filter(item => !item.isReward);
                    const spendTotal = cartWithoutRewards.reduce((sum, item) => {
                        const addonsTotal = item.selectedAddons?.reduce((s, addon) => s + addon.price, 0) || 0;
                        const itemTotal = (item.price + addonsTotal) * item.quantity;
                        return sum + itemTotal;
                    }, 0);
                    
                    prev.membershipSettings.pointRules.forEach(rule => {
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
                    }
                    updatedCustomers = prev.customers.map(c => c.id === customerId ? {...c, points: c.points + pointsEarned - pointsSpent} : c);
                }
            }

            if (activeHeldCartId) updatedHeldCarts = updatedHeldCarts.filter(c => c.id !== activeHeldCartId);
            
            if (prev.inventorySettings.enabled) {
                const rawMaterialUpdates = new Map<string, number>();
                const cartWithoutFreeRewards = cart.filter(item => !(item.isReward && item.price === 0));

                cartWithoutFreeRewards.forEach(item => {
                    const product = prev.products.find(p => p.id === item.id);
                    if (!product) return;
                    if (prev.inventorySettings.trackIngredients && product.recipe?.length > 0) {
                        product.recipe.forEach(recipeItem => {
                            const totalToDecrement = recipeItem.quantity * item.quantity;
                            rawMaterialUpdates.set(recipeItem.rawMaterialId, (rawMaterialUpdates.get(recipeItem.rawMaterialId) || 0) + totalToDecrement);
                        });
                    } else if (product.trackStock) {
                        updatedProducts = updatedProducts.map(p => p.id === item.id ? { ...p, stock: (p.stock || 0) - item.quantity } : p);
                    }
                });

                if (rawMaterialUpdates.size > 0) {
                    updatedRawMaterials = prev.rawMaterials.map(m => rawMaterialUpdates.has(m.id) ? { ...m, stock: m.stock - (rawMaterialUpdates.get(m.id) || 0) } : m);
                }
            }
            // FIX: Update 'transactionRecords' instead of 'transactions'.
            return { ...prev, transactionRecords: [newTransaction, ...prev.transactionRecords], products: updatedProducts, rawMaterials: updatedRawMaterials, customers: updatedCustomers, heldCarts: updatedHeldCarts };
        });
        
        switchActiveCart(null);
        return newTransaction;
    }, [cart, getCartTotals, setData, currentUser, appliedReward, activeHeldCartId, switchActiveCart, cartDiscount, inventorySettings, rawMaterials, products]);
    
    return (
        <CartContext.Provider value={{
            cart, cartDiscount, heldCarts, activeHeldCartId, appliedReward,
            addToCart, addConfiguredItemToCart, updateCartQuantity, removeFromCart, clearCart, getCartTotals,
            applyItemDiscount, removeItemDiscount, applyCartDiscount, removeCartDiscount,
            holdActiveCart, switchActiveCart, deleteHeldCart, updateHeldCartName, saveTransaction,
            applyRewardToCart, removeRewardFromCart
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
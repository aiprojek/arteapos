
import React, { useState, useEffect } from 'react';
import type { CartItem } from '../../types';
import CartItemComponent from '../CartItem';
import { useCart } from '../../context/CartContext';

interface ActiveOrderListProps {
    cart: CartItem[];
    onOpenDiscountModal: (cartItemId: string) => void;
}

const ActiveOrderList: React.FC<ActiveOrderListProps> = ({ cart, onOpenDiscountModal }) => {
    const { removeFromCart } = useCart();
    // Selected Item state for Keyboard Shortcuts (Del)
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [listDensity, setListDensity] = useState<'normal' | 'compact' | 'ultra-compact'>('normal');

    // Auto-select last added item
    useEffect(() => {
        if (cart.length > 0) {
            // Only auto-select if nothing is selected or the previously selected item is gone
            if (!selectedItemId || !cart.find(i => i.cartItemId === selectedItemId)) {
                setSelectedItemId(cart[cart.length - 1].cartItemId);
            }
        } else {
            setSelectedItemId(null);
        }
    }, [cart.length]);

    // Handle Delete Key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Ignore if typing in an input
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

                if (selectedItemId) {
                    e.preventDefault();
                    removeFromCart(selectedItemId);
                    setSelectedItemId(null); // Clear selection after delete
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItemId, removeFromCart]);

    useEffect(() => {
        const updateCompactMode = () => {
            const isUltraCompact = window.innerHeight <= 720 || cart.length >= 8;
            const isCompact = window.innerHeight <= 820 || cart.length >= 5;

            if (isUltraCompact) {
                setListDensity('ultra-compact');
                return;
            }

            if (isCompact) {
                setListDensity('compact');
                return;
            }

            setListDensity('normal');
        };

        updateCompactMode();
        window.addEventListener('resize', updateCompactMode);

        return () => window.removeEventListener('resize', updateCompactMode);
    }, [cart.length]);

    const isCompactList = listDensity !== 'normal';
    const isUltraCompactList = listDensity === 'ultra-compact';

    return (
        <div className={`flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 pb-2 h-full ${isUltraCompactList ? 'space-y-0.5' : isCompactList ? 'space-y-1' : 'space-y-1.5'}`}>
            {cart.map(item => (
                <div 
                    key={item.cartItemId} 
                    onClick={() => setSelectedItemId(item.cartItemId)}
                    className={`cursor-pointer rounded-lg transition-colors border ${selectedItemId === item.cartItemId ? 'border-[#347758] ring-1 ring-[#347758] bg-slate-700/40' : 'border-transparent'}`}
                >
                    <CartItemComponent
                        item={item}
                        onOpenDiscountModal={onOpenDiscountModal}
                        compact={isCompactList}
                        ultraCompact={isUltraCompactList}
                    />
                </div>
            ))}
        </div>
    );
};

export default ActiveOrderList;

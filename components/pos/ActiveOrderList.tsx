
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

    return (
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-2 pb-2">
            {cart.map(item => (
                <div 
                    key={item.cartItemId} 
                    onClick={() => setSelectedItemId(item.cartItemId)}
                    className={`cursor-pointer rounded-lg transition-colors border ${selectedItemId === item.cartItemId ? 'border-[#347758] ring-1 ring-[#347758] bg-slate-700' : 'border-transparent'}`}
                >
                    <CartItemComponent item={item} onOpenDiscountModal={onOpenDiscountModal}/>
                </div>
            ))}
        </div>
    );
};

export default ActiveOrderList;

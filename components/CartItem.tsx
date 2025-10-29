import React from 'react';
import type { CartItem as CartItemType } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { useCart } from '../context/CartContext';
import Icon from './Icon';

interface CartItemProps {
  item: CartItemType;
  onOpenDiscountModal: (cartItemId: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onOpenDiscountModal }) => {
  const { updateCartQuantity, removeFromCart, removeRewardFromCart } = useCart();

  const handleQuantityChange = (delta: number) => {
    updateCartQuantity(item.cartItemId, item.quantity + delta);
  };
  
  const addonsTotal = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
  const pricePerItem = item.price + addonsTotal;
  const originalPrice = pricePerItem * item.quantity;
  let finalPrice = originalPrice;
  let discountDisplay = '';

  if (item.discount) {
      if (item.discount.type === 'amount') {
          finalPrice -= item.discount.value * item.quantity;
          discountDisplay = `Diskon ${CURRENCY_FORMATTER.format(item.discount.value * item.quantity)}`;
      } else { // percentage
          finalPrice -= originalPrice * (item.discount.value / 100);
          discountDisplay = `Diskon ${item.discount.value}%`;
      }
  }


  if (item.isReward) {
      return (
         <div className="flex items-center justify-between py-3 bg-[#347758]/10 border-l-4 border-[#347758] px-2 rounded-md">
            <div className="flex-1">
                <p className="font-semibold text-[#7ac0a0] flex items-center gap-2"><Icon name="award" className="w-4 h-4" />{item.name}</p>
                <p className="text-sm text-slate-400">{item.price === 0 ? 'GRATIS' : `Potongan ${CURRENCY_FORMATTER.format(item.price * -1)}`}</p>
            </div>
            <div className="w-24 text-right font-medium text-[#52a37c]">{CURRENCY_FORMATTER.format(item.price * item.quantity)}</div>
            <button onClick={removeRewardFromCart} className="ml-3 text-slate-500 hover:text-red-500">
                <Icon name="trash" className="w-5 h-5" />
            </button>
        </div>
      )
  }

  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1">
        <p className="font-semibold text-slate-200">{item.name}</p>
        {item.discount?.name && <p className="text-xs text-green-400 font-medium">{item.discount.name}</p>}
        {item.selectedAddons && item.selectedAddons.length > 0 && (
            <div className="text-xs text-slate-400 pl-2">
                {item.selectedAddons.map(addon => (
                    <p key={addon.id}>+ {addon.name} ({CURRENCY_FORMATTER.format(addon.price)})</p>
                ))}
            </div>
        )}
        <div className="text-sm text-slate-400 mt-1">
            {item.discount ? (
                <>
                    <span className="line-through">{CURRENCY_FORMATTER.format(pricePerItem)}</span>
                    <span className="text-green-400 font-semibold ml-2">{discountDisplay}</span>
                </>
            ) : (
                <span>{CURRENCY_FORMATTER.format(pricePerItem)}</span>
            )}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => handleQuantityChange(-1)} className="w-7 h-7 bg-slate-600 rounded-full flex items-center justify-center hover:bg-slate-500">-</button>
        <span>{item.quantity}</span>
        <button onClick={() => handleQuantityChange(1)} className="w-7 h-7 bg-slate-600 rounded-full flex items-center justify-center hover:bg-slate-500">+</button>
      </div>
      <div className="w-24 text-right font-medium pt-1">{CURRENCY_FORMATTER.format(finalPrice)}</div>
      <div className="flex gap-2 ml-3 pt-1">
        <button onClick={() => onOpenDiscountModal(item.cartItemId)} className={`p-1 rounded-full ${item.discount ? 'bg-green-500/20 text-green-300' : 'text-slate-500 hover:text-sky-400'}`} title="Beri diskon item">
            <Icon name="tag" className="w-4 h-4" />
        </button>
        <button onClick={() => removeFromCart(item.cartItemId)} className="text-slate-500 hover:text-red-500" title="Hapus item">
            <Icon name="trash" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CartItem;

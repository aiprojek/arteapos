import React from 'react';
import type { CartItem as CartItemType } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { useAppContext } from '../context/AppContext';
import Icon from './Icon';

interface CartItemProps {
  item: CartItemType;
}

const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateCartQuantity, removeFromCart, removeRewardFromCart } = useAppContext();

  const handleQuantityChange = (delta: number) => {
    updateCartQuantity(item.id, item.quantity + delta);
  };

  if (item.isReward) {
      return (
         <div className="flex items-center justify-between py-3 bg-[#347758]/10 border-l-4 border-[#347758] px-2 rounded-md">
            <div className="flex-1">
                <p className="font-semibold text-[#7ac0a0] flex items-center gap-2"><Icon name="award" className="w-4 h-4" />{item.name}</p>
                <p className="text-sm text-slate-400">{item.price === 0 ? 'GRATIS' : 'Diskon'}</p>
            </div>
            <div className="w-24 text-right font-medium text-[#52a37c]">{CURRENCY_FORMATTER.format(item.price * item.quantity)}</div>
            <button onClick={removeRewardFromCart} className="ml-3 text-slate-500 hover:text-red-500">
                <Icon name="trash" className="w-5 h-5" />
            </button>
        </div>
      )
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="font-semibold text-slate-200">{item.name}</p>
        <p className="text-sm text-slate-400">{CURRENCY_FORMATTER.format(item.price)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => handleQuantityChange(-1)} className="w-7 h-7 bg-slate-600 rounded-full flex items-center justify-center hover:bg-slate-500">-</button>
        <span>{item.quantity}</span>
        <button onClick={() => handleQuantityChange(1)} className="w-7 h-7 bg-slate-600 rounded-full flex items-center justify-center hover:bg-slate-500">+</button>
      </div>
      <div className="w-24 text-right font-medium">{CURRENCY_FORMATTER.format(item.price * item.quantity)}</div>
      <button onClick={() => removeFromCart(item.id)} className="ml-3 text-slate-500 hover:text-red-500">
        <Icon name="trash" className="w-5 h-5" />
      </button>
    </div>
  );
};

export default CartItem;

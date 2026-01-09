
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
  const modifiersTotal = item.selectedModifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;
  
  const pricePerItem = item.price + addonsTotal + modifiersTotal;
  const originalPrice = pricePerItem * item.quantity;
  let finalPrice = originalPrice;
  let discountDisplay = '';

  if (item.discount) {
      if (item.discount.type === 'amount') {
          finalPrice -= item.discount.value * item.quantity;
          discountDisplay = `Disc ${CURRENCY_FORMATTER.format(item.discount.value * item.quantity)}`;
      } else { // percentage
          finalPrice -= originalPrice * (item.discount.value / 100);
          discountDisplay = `Disc ${item.discount.value}%`;
      }
  }

  // --- REWARD ITEM VIEW ---
  if (item.isReward) {
      return (
         <div className="flex items-center justify-between py-3 bg-[#347758]/10 border border-[#347758]/50 px-3 rounded-lg shadow-sm">
            <div className="flex-1 min-w-0 mr-2">
                <p className="font-semibold text-[#7ac0a0] flex items-center gap-2 truncate">
                    <Icon name="award" className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                </p>
                <p className="text-xs text-slate-400">{item.price === 0 ? 'GRATIS' : `Potongan ${CURRENCY_FORMATTER.format(item.price * -1)}`}</p>
            </div>
            <div className="text-right">
                <div className="font-bold text-[#52a37c] text-sm">{CURRENCY_FORMATTER.format(item.price * item.quantity)}</div>
                <button onClick={removeRewardFromCart} className="text-slate-500 hover:text-red-500 mt-1">
                    <Icon name="trash" className="w-4 h-4" />
                </button>
            </div>
        </div>
      )
  }

  // --- STANDARD ITEM VIEW (Card Layout) ---
  return (
    <div className="bg-slate-700/40 border border-slate-700 p-3 rounded-lg flex flex-col gap-2">
      {/* Top Row: Name & Actions */}
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-2 min-w-0">
            <p className="font-semibold text-white leading-tight break-words">{item.name}</p>
            {item.discount?.name && <p className="text-xs text-green-400 font-medium mt-0.5">{item.discount.name}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onOpenDiscountModal(item.cartItemId)} className={`p-1.5 rounded-lg transition-colors ${item.discount ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-400 hover:text-white'}`} title="Diskon Item">
                <Icon name="tag" className="w-4 h-4" />
            </button>
            <button onClick={() => removeFromCart(item.cartItemId)} className="p-1.5 rounded-lg bg-slate-700 text-red-400 hover:bg-red-900/30 hover:text-red-300" title="Hapus">
                <Icon name="trash" className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Details Row: Modifiers/Addons */}
      {(item.selectedAddons?.length || 0) > 0 || (item.selectedModifiers?.length || 0) > 0 ? (
          <div className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded">
              {item.selectedAddons?.map(addon => (
                  <div key={addon.id} className="flex justify-between">
                      <span>+ {addon.name}</span>
                      <span>{CURRENCY_FORMATTER.format(addon.price).replace('Rp', '')}</span>
                  </div>
              ))}
              {item.selectedModifiers?.map((mod, idx) => (
                  <div key={`${mod.optionId}-${idx}`} className="flex justify-between">
                      <span>• {mod.name}</span>
                      {mod.price > 0 && <span>+{CURRENCY_FORMATTER.format(mod.price).replace('Rp', '')}</span>}
                  </div>
              ))}
          </div>
      ) : null}

      {/* Bottom Row: Qty & Price */}
      <div className="flex justify-between items-end mt-1">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-600">
            <button onClick={() => handleQuantityChange(-1)} className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-white font-bold transition-colors">-</button>
            <span className="w-8 text-center font-mono font-bold text-white">{item.quantity}</span>
            <button onClick={() => handleQuantityChange(1)} className="w-8 h-8 flex items-center justify-center bg-[#347758] hover:bg-[#2a6046] rounded text-white font-bold transition-colors">+</button>
          </div>

          <div className="text-right">
              {item.discount && (
                  <div className="text-[10px] text-green-400 mb-0.5">{discountDisplay}</div>
              )}
              <div className="flex flex-col items-end">
                  {item.discount && <span className="text-xs text-slate-500 line-through decoration-slate-500">{CURRENCY_FORMATTER.format(originalPrice)}</span>}
                  <span className="font-bold text-lg text-white leading-none">{CURRENCY_FORMATTER.format(finalPrice)}</span>
              </div>
          </div>
      </div>
    </div>
  );
};

export default CartItem;

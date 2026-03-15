
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
  const [inputValue, setInputValue] = React.useState(item.quantity.toString());

  const handleQuantityChange = (newQuantity: number) => {
    const quantity = Math.max(1, newQuantity);
    updateCartQuantity(item.cartItemId, quantity);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const newQuantity = parseInt(inputValue, 10);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      handleQuantityChange(newQuantity);
    } else {
      setInputValue(item.quantity.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setInputValue(item.quantity.toString());
      (e.target as HTMLInputElement).blur();
    }
  };

  React.useEffect(() => {
    setInputValue(item.quantity.toString());
  }, [item.quantity]);
  
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
    <div className="bg-slate-700/40 border border-slate-700 p-2 rounded-lg">
      <div className="flex flex-col">
        {/* Item Name */}
        <div className="min-w-0">
          <p className="font-semibold text-white break-words">{item.name}</p>
        </div>

        {/* Controls container */}
        <div className="flex items-center gap-2 mt-2">
          {/* Quantity Controls */}
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-600 flex-shrink-0">
            <button onClick={() => handleQuantityChange(item.quantity - 1)} className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-l-md text-white font-bold transition-colors">-</button>
            <input
              type="number"
              className="w-8 text-center font-mono text-sm font-bold text-white bg-transparent no-spinners"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              min="1"
            />
            <button onClick={() => handleQuantityChange(item.quantity + 1)} className="w-7 h-7 flex items-center justify-center bg-[#347758] hover:bg-[#2a6046] rounded-r-md text-white font-bold transition-colors">+</button>
          </div>

          {/* Price */}
          <div className="flex-grow text-right">
              <div className="flex flex-col items-end">
                  {item.discount && <span className="text-xs text-slate-500 line-through decoration-slate-500">{CURRENCY_FORMATTER.format(originalPrice)}</span>}
                  <span className="font-bold text-base text-white leading-none">{CURRENCY_FORMATTER.format(finalPrice)}</span>
              </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-shrink-0">
              <button onClick={() => onOpenDiscountModal(item.cartItemId)} className={`p-1.5 rounded-lg transition-colors ${item.discount ? 'text-green-300' : 'text-slate-400 hover:text-white'}`} title="Diskon Item">
                  <Icon name="tag" className="w-4 h-4" />
              </button>
              <button onClick={() => removeFromCart(item.cartItemId)} className="p-1.5 rounded-lg text-red-400 hover:text-red-300 transition-colors" title="Hapus">
                  <Icon name="trash" className="w-4 h-4" />
              </button>
          </div>
        </div>
      </div>

      {/* Optional Details Row (for addons/modifiers/discount name) */}
      {((item.selectedAddons?.length || 0) > 0 || (item.selectedModifiers?.length || 0) > 0 || item.discount?.name) && (
          <div className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded mt-2">
              {item.discount?.name && <p className="font-semibold text-green-400">{item.discount.name}</p>}
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
      )}
    </div>
  );
};

export default CartItem;


import React from 'react';
import type { CartItem as CartItemType } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import { useCart } from '../context/CartContext';
import Icon from './Icon';

interface CartItemProps {
  item: CartItemType;
  onOpenDiscountModal: (cartItemId: string) => void;
  compact?: boolean;
  ultraCompact?: boolean;
}

const CartItem: React.FC<CartItemProps> = ({ item, onOpenDiscountModal, compact = false, ultraCompact = false }) => {
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
         <div className={`flex items-center justify-between bg-[#347758]/10 border border-[#347758]/50 rounded-lg shadow-sm ${ultraCompact ? 'px-2 py-1' : compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'}`}>
            <div className="flex-1 min-w-0 mr-2">
                <p className={`font-semibold text-[#7ac0a0] flex items-center truncate ${ultraCompact ? 'gap-1 text-xs' : 'gap-2'}`}>
                    <Icon name="award" className={`${ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} flex-shrink-0`} />
                    <span className="truncate">{item.name}</span>
                </p>
                <p className={`${ultraCompact ? 'text-[10px]' : 'text-xs'} text-slate-400`}>
                  {item.price === 0 ? 'GRATIS' : `Potongan ${CURRENCY_FORMATTER.format(item.price * -1)}`}
                </p>
            </div>
            <div className="text-right">
                <div className={`font-bold text-[#52a37c] ${ultraCompact ? 'text-xs' : 'text-sm'}`}>
                  {CURRENCY_FORMATTER.format(item.price * item.quantity)}
                </div>
                <button onClick={removeRewardFromCart} className={`text-slate-500 hover:text-red-500 ${ultraCompact ? 'mt-0.5' : 'mt-1'}`}>
                    <Icon name="trash" className={`${ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                </button>
            </div>
        </div>
      )
  }

  // --- STANDARD ITEM VIEW (Card Layout) ---
  return (
    <div className={`bg-slate-700/30 border border-slate-700/70 rounded-lg ${ultraCompact ? 'px-2 py-0.5' : compact ? 'px-2 py-1.5' : 'px-2.5 py-2'}`}>
      <div className={`flex flex-col ${ultraCompact ? 'gap-1' : compact ? 'gap-1.5' : 'gap-2'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-white break-words ${ultraCompact ? 'text-[11px] leading-tight' : compact ? 'text-[13px] leading-snug' : 'text-sm leading-snug'}`}>{item.name}</p>
            {!compact && !ultraCompact && ((item.selectedAddons?.length || 0) > 0 || (item.selectedModifiers?.length || 0) > 0 || item.discount?.name) ? (
              <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                {item.discount?.name && <p className="font-semibold text-green-400 truncate">{item.discount.name}</p>}
                {item.selectedAddons?.slice(0, 2).map(addon => (
                    <div key={addon.id} className="truncate">
                        + {addon.name}
                    </div>
                ))}
                {item.selectedModifiers?.slice(0, 2).map((mod, idx) => (
                    <div key={`${mod.optionId}-${idx}`} className="truncate">
                        • {mod.name}
                    </div>
                ))}
                {((item.selectedAddons?.length || 0) > 2 || (item.selectedModifiers?.length || 0) > 2) && (
                    <div className="text-slate-500">Detail lain tersimpan</div>
                )}
              </div>
            ) : null}
          </div>

          <div className="text-right shrink-0">
            {!compact && item.discount && <span className="block text-[11px] text-slate-500 line-through decoration-slate-500">{CURRENCY_FORMATTER.format(originalPrice)}</span>}
            <span className={`font-bold text-white leading-none ${ultraCompact ? 'text-xs' : compact ? 'text-sm' : 'text-sm sm:text-base'}`}>{CURRENCY_FORMATTER.format(finalPrice)}</span>
            {(compact || ultraCompact) && item.discount ? <span className="block text-[10px] text-green-400 mt-0.5">Disc</span> : null}
            {!compact && discountDisplay && <span className="block text-[10px] text-green-400 mt-1">{discountDisplay}</span>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-600 flex-shrink-0">
            <button onClick={() => handleQuantityChange(item.quantity - 1)} className={`${ultraCompact ? 'w-5 h-5 text-[10px]' : compact ? 'w-6 h-6 text-sm' : 'w-7 h-7'} flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-l-md text-white font-bold transition-colors`}>-</button>
            <input
              type="number"
              className={`${ultraCompact ? 'w-5 text-[11px]' : compact ? 'w-7 text-[13px]' : 'w-8 text-sm'} text-center font-mono font-bold text-white bg-transparent no-spinners`}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              min="1"
            />
            <button onClick={() => handleQuantityChange(item.quantity + 1)} className={`${ultraCompact ? 'w-5 h-5 text-[10px]' : compact ? 'w-6 h-6 text-sm' : 'w-7 h-7'} flex items-center justify-center bg-[#347758] hover:bg-[#2a6046] rounded-r-md text-white font-bold transition-colors`}>+</button>
          </div>

          <div className={`flex items-center flex-shrink-0 ${ultraCompact ? 'gap-0' : 'gap-0.5'}`}>
              <button onClick={() => onOpenDiscountModal(item.cartItemId)} className={`${ultraCompact ? 'p-0.5' : compact ? 'p-1' : 'p-1.5'} rounded-lg transition-colors ${item.discount ? 'text-green-300 bg-green-900/20' : 'text-slate-400 hover:text-white'}`} title="Diskon Item">
                  <Icon name={`${ultraCompact ? 'tag' : 'tag'}`} className={`${ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </button>
              <button onClick={() => removeFromCart(item.cartItemId)} className={`${ultraCompact ? 'p-0.5' : compact ? 'p-1' : 'p-1.5'} rounded-lg text-red-400 hover:text-red-300 transition-colors`} title="Hapus">
                  <Icon name="trash" className={`${ultraCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;

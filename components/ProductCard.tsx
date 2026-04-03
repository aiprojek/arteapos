
import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import ProductPlaceholder from './ProductPlaceholder';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  availability: { available: boolean; reason: string };
  compact?: boolean;
  ultraCompact?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
  availability,
  compact = false,
  ultraCompact = false,
}) => {
  const { available, reason } = availability;
  const [imageSrc, setImageSrc] = useState<string | undefined>();

  useEffect(() => {
    let objectUrl: string | undefined;
    if (product.image instanceof Blob) {
      objectUrl = URL.createObjectURL(product.image);
      setImageSrc(objectUrl);
    } else {
      setImageSrc(product.imageUrl);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [product.image, product.imageUrl]);

  const hasVariants = product.variants && product.variants.length > 0;

  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={`bg-slate-800 rounded-lg shadow-lg overflow-hidden text-left flex flex-col group transition-transform transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#347758] focus:ring-offset-2 focus:ring-offset-slate-900 relative disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${ultraCompact ? 'rounded-md' : ''}`}
    >
      {!available && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
          <span className="text-white font-bold text-lg">{reason}</span>
        </div>
      )}
      {imageSrc ? (
        <img
            src={imageSrc}
            alt={product.name}
            className={`w-full object-cover ${ultraCompact ? 'h-20' : compact ? 'h-24 sm:h-24 lg:h-28' : 'h-24 sm:h-28 lg:h-32'}`}
        />
      ) : (
        <ProductPlaceholder productName={product.name} className={`w-full ${ultraCompact ? 'h-20' : compact ? 'h-24 sm:h-24 lg:h-28' : 'h-24 sm:h-28 lg:h-32'}`} />
      )}
      <div className={`flex flex-col flex-grow ${ultraCompact ? 'p-2' : compact ? 'p-2.5' : 'p-2.5 sm:p-3'}`}>
        <h3 className={`font-semibold text-slate-100 group-hover:text-[#52a37c] transition-colors flex-grow ${ultraCompact ? 'text-[13px] leading-tight' : compact ? 'text-sm leading-snug' : 'text-sm sm:text-base leading-snug'}`}>{product.name}</h3>
        <div className={`flex justify-between items-baseline ${ultraCompact ? 'mt-0.5' : 'mt-1'}`}>
            <p className={`${ultraCompact ? 'text-[11px]' : 'text-xs sm:text-sm'} text-slate-400`}>{CURRENCY_FORMATTER.format(product.price)}</p>
            {hasVariants && <span className={`${ultraCompact ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'} bg-blue-500/20 text-blue-300 rounded`}>Varian</span>}
        </div>
      </div>
    </button>
  );
};

export default ProductCard;

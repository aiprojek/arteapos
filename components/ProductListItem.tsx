
import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import ProductPlaceholder from './ProductPlaceholder';

interface ProductListItemProps {
  product: Product;
  onClick: () => void;
  availability: { available: boolean; reason: string };
}

const ProductListItem: React.FC<ProductListItemProps> = ({ product, onClick, availability }) => {
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

  return (
    <button
      onClick={onClick}
      disabled={!available}
      className="w-full bg-slate-800 hover:bg-slate-700 p-2 rounded-lg flex items-center gap-3 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent focus:border-[#347758]"
    >
      <div className="w-12 h-12 flex-shrink-0 bg-slate-700 rounded-md overflow-hidden relative">
         {!available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
              <span className="text-white font-bold text-[10px] text-center leading-none px-1">{reason}</span>
            </div>
          )}
        {imageSrc ? (
            <img src={imageSrc} alt={product.name} className="w-full h-full object-cover" />
        ) : (
            <ProductPlaceholder productName={product.name} size="small" className="w-full h-full" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white truncate group-hover:text-[#52a37c] transition-colors">{product.name}</h4>
        <div className="flex justify-between items-center mt-0.5">
             <p className="text-sm text-slate-400">{CURRENCY_FORMATTER.format(product.price)}</p>
             {product.variants && product.variants.length > 0 && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Varian</span>}
        </div>
      </div>
    </button>
  );
};

export default ProductListItem;

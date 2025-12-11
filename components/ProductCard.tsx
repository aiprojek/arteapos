
import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import ProductPlaceholder from './ProductPlaceholder';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  availability: { available: boolean; reason: string };
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, availability }) => {
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
      className="bg-slate-800 rounded-lg shadow-lg overflow-hidden text-left flex flex-col group transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#347758] focus:ring-offset-2 focus:ring-offset-slate-900 relative disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
            className="w-full h-32 object-cover"
        />
      ) : (
        <ProductPlaceholder productName={product.name} className="w-full h-32" />
      )}
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="font-semibold text-slate-100 group-hover:text-[#52a37c] transition-colors flex-grow">{product.name}</h3>
        <div className="flex justify-between items-baseline mt-1">
            <p className="text-sm text-slate-400">{CURRENCY_FORMATTER.format(product.price)}</p>
            {hasVariants && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Varian</span>}
        </div>
      </div>
    </button>
  );
};

export default ProductCard;

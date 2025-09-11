import React from 'react';
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

  return (
    <button
      onClick={onClick}
      disabled={!available}
      className="bg-slate-800 rounded-lg shadow-lg overflow-hidden text-left flex flex-col group transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 relative disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
    >
      {!available && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
          <span className="text-white font-bold text-lg">{reason}</span>
        </div>
      )}
      {product.imageUrl ? (
        <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-32 object-cover"
        />
      ) : (
        <ProductPlaceholder productName={product.name} className="w-full h-32" />
      )}
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="font-semibold text-slate-100 group-hover:text-sky-400 transition-colors flex-grow">{product.name}</h3>
        <p className="text-sm text-slate-400">{CURRENCY_FORMATTER.format(product.price)}</p>
      </div>
    </button>
  );
};

export default ProductCard;
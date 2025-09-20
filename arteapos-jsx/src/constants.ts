import type { Product } from './types';

export const CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Es Kopi Susu', price: 18000, category: ['Kopi'] },
  { id: '2', name: 'Americano', price: 15000, category: ['Kopi'] },
  { id: '3', name: 'Croissant', price: 20000, category: ['Makanan'] },
  { id: '4', name: 'Red Velvet Latte', price: 22000, category: ['Non-Kopi'] },
  { id: '5', name: 'Teh Lemon', price: 12000, category: ['Non-Kopi'] },
  { id: '6', name: 'Nasi Goreng', price: 25000, category: ['Makanan'] },
];

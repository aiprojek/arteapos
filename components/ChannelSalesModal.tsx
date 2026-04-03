import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { useProduct } from '../context/ProductContext';
import type { Product } from '../types';

interface Row {
  productId: string;
  quantity: string;
}

interface ChannelSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChannelSalesModal: React.FC<ChannelSalesModalProps> = ({ isOpen, onClose }) => {
  const { products, applyChannelSales } = useProduct();
  const [rows, setRows] = useState<Row[]>([{ productId: '', quantity: '' }]);
  const [channelName, setChannelName] = useState('ShopeeFood/Grab');
  const [notes, setNotes] = useState('');

  const productOptions = useMemo(
    () => products.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows(prev => [...prev, { productId: '', quantity: '' }]);
  const removeRow = (index: number) => setRows(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = () => {
    const items = rows
      .map(r => ({ productId: r.productId, quantity: parseFloat(r.quantity) || 0 }))
      .filter(r => r.productId && r.quantity > 0);

    const ok = applyChannelSales(items, channelName.trim() || 'Online', notes.trim());
    if (ok) {
      setRows([{ productId: '', quantity: '' }]);
      setNotes('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Potong Stok Channel Online" mobileLayout="fullscreen" size="lg">
      <div className="space-y-4 h-full flex flex-col min-h-0">
        <div className="bg-slate-900 border border-slate-700 rounded p-3 text-xs text-slate-300">
          Gunakan menu ini untuk penjualan dari ShopeeFood/Grab/GoFood agar stok dan bahan baku tetap akurat
          tanpa mencatat omzet dua kali.
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Nama Channel</label>
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
            placeholder="ShopeeFood/Grab"
          />
        </div>

        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-900/40 border border-slate-700 rounded-lg p-3">
              <select
                value={row.productId}
                onChange={(e) => updateRow(idx, { productId: e.target.value })}
                className="sm:col-span-8 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white"
              >
                <option value="">Pilih Produk</option>
                {productOptions.map((p: Product) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-[1fr_auto] gap-2 sm:col-span-4">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={row.quantity}
                  onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                  className="bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white"
                  placeholder="Qty"
                />
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="inline-flex items-center justify-center px-3 rounded border border-red-900/40 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  title="Hapus baris"
                >
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={addRow} className="w-full">Tambah Baris</Button>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Catatan (Opsional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
            placeholder="Contoh: Rekap hari ini"
          />
        </div>

        <Button onClick={handleSubmit} className="w-full shrink-0">Potong Stok</Button>
      </div>
    </Modal>
  );
};

export default ChannelSalesModal;

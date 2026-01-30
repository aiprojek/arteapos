
import React from 'react';
import type { InventorySettings } from '../../types';

interface InventoryTabProps {
    form: InventorySettings;
    onChange: (settings: InventorySettings) => void;
}

const SettingsCard: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="bg-slate-800 rounded-lg shadow-md border border-slate-700 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-700 bg-slate-800">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
        </div>
        <div className="p-4 space-y-4">
            {children}
        </div>
    </div>
);

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; description?: string }> = ({ label, checked, onChange, description }) => (
    <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 pr-2">
            <span className="text-slate-200 font-medium block leading-snug">{label}</span>
            {description && <p className="text-xs text-slate-400 mt-0.5 leading-normal">{description}</p>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#347758] focus:ring-offset-2 focus:ring-offset-slate-800 ${checked ? 'bg-[#347758]' : 'bg-slate-700'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const InventoryTab: React.FC<InventoryTabProps> = ({ form, onChange }) => {
    return (
        <div className="animate-fade-in">
            <SettingsCard title="Manajemen Inventaris">
                <div className="space-y-4">
                    <ToggleSwitch 
                        label="Aktifkan Pelacakan Stok" 
                        description="Mengaktifkan fitur stok pada produk. Jika mati, stok tidak akan berkurang saat penjualan."
                        checked={form.enabled} 
                        onChange={(val) => onChange({...form, enabled: val})} 
                    />
                    
                    {form.enabled && (
                        <>
                            <div className="border-t border-slate-700 my-2"></div>
                            
                            <ToggleSwitch 
                                label="Cegah Transaksi Stok Habis (Strict Mode)" 
                                description="Jika aktif, produk tidak bisa ditambahkan ke keranjang jika stok 0 atau kurang (Termasuk bahan baku)."
                                checked={form.preventNegativeStock || false} 
                                onChange={(val) => onChange({...form, preventNegativeStock: val})} 
                            />

                            <ToggleSwitch 
                                label="Mode Resep & Bahan Baku (Advanced)" 
                                description="Stok produk berkurang berdasarkan bahan baku (Resep). Jika dimatikan, stok produk berkurang langsung."
                                checked={form.trackIngredients} 
                                onChange={(val) => onChange({...form, trackIngredients: val})} 
                            />
                        </>
                    )}
                </div>
            </SettingsCard>
        </div>
    );
};

export default InventoryTab;

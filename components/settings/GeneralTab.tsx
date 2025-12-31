
import React, { useState } from 'react';
import type { ReceiptSettings, Branch } from '../../types';
import Icon from '../Icon';
import Button from '../Button';
import Modal from '../Modal';

interface GeneralTabProps {
    form: ReceiptSettings;
    onChange: (settings: ReceiptSettings) => void;
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
    <div className="flex items-center justify-between">
        <div>
            <span className="text-slate-200 font-medium">{label}</span>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#347758] focus:ring-offset-2 focus:ring-offset-slate-800 ${checked ? 'bg-[#347758]' : 'bg-slate-700'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const OrderTypeManager: React.FC<{
    types: string[];
    onChange: (newTypes: string[]) => void;
}> = ({ types, onChange }) => {
    const [newType, setNewType] = useState('');

    const handleAdd = () => {
        if (newType.trim() && !types.map(t => t.toLowerCase()).includes(newType.trim().toLowerCase())) {
            onChange([...types, newType.trim()]);
            setNewType('');
        }
    };

    const handleRemove = (typeToRemove: string) => {
        onChange(types.filter(t => t !== typeToRemove));
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tipe Pesanan</label>
            <div className="flex flex-wrap gap-2 p-2 bg-slate-900 border border-slate-600 rounded-lg mb-2 min-h-[44px]">
                {types.map(type => (
                    <div key={type} className="flex items-center gap-1 bg-[#347758]/20 text-[#7ac0a0] text-sm font-medium px-2 py-1 rounded-full">
                        {type}
                        <button type="button" onClick={() => handleRemove(type)} className="text-[#a0d9bf] hover:text-white">
                            <Icon name="close" className="w-3 h-3"/>
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                    placeholder="cth: Reservasi"
                    className="flex-grow w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
                <Button type="button" variant="secondary" onClick={handleAdd}>Tambah</Button>
            </div>
             <p className="text-xs text-slate-500 mt-1">Tipe pesanan ini akan muncul sebagai pilihan di halaman kasir.</p>
        </div>
    );
};

const BranchManager: React.FC<{
    branches: Branch[];
    currentStoreId: string;
    onChange: (branches: Branch[]) => void;
    onSelectStore: (id: string) => void;
}> = ({ branches, currentStoreId, onChange, onSelectStore }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [newBranch, setNewBranch] = useState({ id: '', name: '', address: '' });

    const handleAdd = () => {
        if (!newBranch.id || !newBranch.name) return;
        const cleanId = newBranch.id.toUpperCase().replace(/\s/g, '');
        
        // Prevent duplicate IDs
        if (branches.some(b => b.id === cleanId)) {
            alert('ID Cabang sudah ada!');
            return;
        }

        onChange([...branches, { ...newBranch, id: cleanId }]);
        setModalOpen(false);
        setNewBranch({ id: '', name: '', address: '' });
    };

    const handleDelete = (id: string) => {
        if (id === currentStoreId) {
            alert('Tidak bisa menghapus cabang yang sedang aktif digunakan.');
            return;
        }
        onChange(branches.filter(b => b.id !== id));
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Identitas Perangkat Ini (Store ID)</label>
                {branches.length > 0 ? (
                    <select
                        value={currentStoreId || ''}
                        onChange={(e) => onSelectStore(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold"
                    >
                        <option value="">-- Pilih Cabang --</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                        ))}
                    </select>
                ) : (
                    <p className="text-sm text-red-400 italic">Belum ada daftar cabang. Silakan tambah cabang di bawah ini.</p>
                )}
                <p className="text-xs text-slate-500 mt-1">Pilih cabang mana yang dioperasikan oleh perangkat ini.</p>
            </div>

            <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">Daftar Cabang</label>
                    <Button size="sm" onClick={() => setModalOpen(true)}>+ Tambah Cabang</Button>
                </div>
                <div className="space-y-2">
                    {branches.map(branch => (
                        <div key={branch.id} className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-600">
                            <div>
                                <span className="font-bold text-white block">{branch.name}</span>
                                <span className="text-xs text-slate-400">{branch.id}</span>
                            </div>
                            <button onClick={() => handleDelete(branch.id)} className="text-red-400 hover:text-white p-1">
                                <Icon name="trash" className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                    {branches.length === 0 && <div className="text-center text-slate-500 text-xs py-2">Belum ada cabang.</div>}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Tambah Cabang Baru">
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">ID Cabang (Unik)</label>
                        <input 
                            type="text" 
                            placeholder="cth: JKT-01" 
                            value={newBranch.id}
                            onChange={e => setNewBranch({...newBranch, id: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white uppercase"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Nama Cabang</label>
                        <input 
                            type="text" 
                            placeholder="cth: Artea Jakarta Pusat" 
                            value={newBranch.name}
                            onChange={e => setNewBranch({...newBranch, name: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                        />
                    </div>
                    <Button onClick={handleAdd} disabled={!newBranch.id || !newBranch.name} className="w-full">Simpan</Button>
                </div>
            </Modal>
        </div>
    );
};

const GeneralTab: React.FC<GeneralTabProps> = ({ form, onChange }) => {
    return (
        <div className="animate-fade-in">
            <SettingsCard title="Informasi Toko & Cabang" description="Kelola identitas toko dan cabang Anda.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Nama Brand Utama</label>
                            <input 
                                type="text" 
                                value={form.shopName} 
                                onChange={(e) => onChange({...form, shopName: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Alamat (Default)</label>
                            <input 
                                type="text" 
                                value={form.address} 
                                onChange={(e) => onChange({...form, address: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Pesan Footer Struk</label>
                            <input 
                                type="text" 
                                value={form.footerMessage} 
                                onChange={(e) => onChange({...form, footerMessage: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <BranchManager 
                            branches={form.branches || []}
                            currentStoreId={form.storeId || ''}
                            onChange={(branches) => onChange({...form, branches})}
                            onSelectStore={(id) => onChange({...form, storeId: id})}
                        />
                    </div>
                    
                    <div className="md:col-span-2 pt-4 border-t border-slate-700">
                        <OrderTypeManager
                            types={form.orderTypes || []}
                            onChange={(newTypes) => onChange({ ...form, orderTypes: newTypes })}
                        />
                    </div>
                </div>
            </SettingsCard>
            
            <SettingsCard title="Pajak & Layanan" description="Persentase tambahan pada total belanja.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Pajak (PB1/PPN) %</label>
                        <input 
                            type="number" 
                            value={form.taxRate || 0} 
                            onChange={(e) => onChange({...form, taxRate: parseFloat(e.target.value) || 0})}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Service Charge %</label>
                        <input 
                            type="number" 
                            value={form.serviceChargeRate || 0} 
                            onChange={(e) => onChange({...form, serviceChargeRate: parseFloat(e.target.value) || 0})}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                        />
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard title="Printer & Kontak Admin" description="Pengaturan cetak dan tombol bantuan di Login.">
                <div className="space-y-4">
                    <ToggleSwitch 
                        label="Aktifkan Catatan Dapur Otomatis" 
                        description="Otomatis membuka dialog cetak 'Pesanan Dapur' setelah transaksi selesai."
                        checked={form.enableKitchenPrinter || false} 
                        onChange={(val) => onChange({...form, enableKitchenPrinter: val})} 
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Admin WhatsApp (62...)</label>
                            <input 
                                type="text" 
                                value={form.adminWhatsapp || ''} 
                                onChange={(e) => onChange({...form, adminWhatsapp: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                placeholder="62812..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Admin Telegram (Username)</label>
                            <input 
                                type="text" 
                                value={form.adminTelegram || ''} 
                                onChange={(e) => onChange({...form, adminTelegram: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                placeholder="@username"
                            />
                        </div>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
};

export default GeneralTab;

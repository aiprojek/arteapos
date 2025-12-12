
import React, { useRef, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../context/ProductContext';
import { useSettings } from '../context/SettingsContext';
import { useSession } from '../context/SessionContext';
import { useCustomer } from '../context/CustomerContext';
import { useDiscount } from '../context/DiscountContext';
import { useFinance } from '../context/FinanceContext';
import { dataService } from '../services/dataService';
import { dropboxService } from '../services/dropboxService';
import { supabaseService, SETUP_SQL_SCRIPT } from '../services/supabaseService';
import { decryptReport } from '../utils/crypto';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import type { AppData, ReceiptSettings, InventorySettings, User, AuthSettings, MembershipSettings, PointRule, Reward, SessionSettings, DiscountDefinition, Transaction } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

const SettingsCard: React.FC<{title: string, description: string, children: React.ReactNode}> = ({title, description, children}) => (
    <div className="bg-slate-800 p-6 rounded-lg mb-6 shadow-sm border border-slate-700/50">
        <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-3 mb-3">{title}</h2>
        <p className="text-slate-400 text-sm mb-6 bg-slate-900/50 p-3 rounded-lg border-l-4 border-slate-600">
            <Icon name="info-circle" className="w-4 h-4 inline mr-2 text-slate-500"/>
            {description}
        </p>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const UserForm: React.FC<{
    user?: User | null,
    onSave: (user: Omit<User, 'id'> | User) => void,
    onCancel: () => void
}> = ({ user, onSave, onCancel }) => {
    const { showAlert } = useUI();
    const [formData, setFormData] = useState({ name: '', pin: '', role: 'staff' as 'admin' | 'staff' });

    useEffect(() => {
        if (user) {
            setFormData({ name: user.name, pin: '', role: user.role });
        } else {
            setFormData({ name: '', pin: '', role: 'staff' });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user && (formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin))) {
            showAlert({ type: 'alert', title: 'PIN Tidak Valid', message: 'PIN harus terdiri dari 4 digit angka untuk pengguna baru.' });
            return;
        }

        if (user && formData.pin && (formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin))) {
             showAlert({ type: 'alert', title: 'PIN Baru Tidak Valid', message: 'Jika ingin mengubah, PIN baru harus terdiri dari 4 digit angka.' });
            return;
        }

        const userData = { ...formData };
        if (user && 'id' in user) {
            const dataToSave = {
                ...user,
                name: userData.name,
                role: userData.role,
                pin: userData.pin || user.pin 
            };
            onSave(dataToSave);
        } else {
            onSave(userData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nama Pengguna</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">PIN (4 Digit Angka)</label>
                <input type="password" name="pin" value={formData.pin} onChange={handleChange} required={!user} placeholder={user ? 'Kosongkan jika tidak diubah' : 'Wajib diisi'} maxLength={4} pattern="\d{4}" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Peran (Role)</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                    <option value="staff">Staff / Kasir</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant="primary">Simpan</Button>
            </div>
        </form>
    );
};

const UserManagement: React.FC = () => {
    const { users, addUser, updateUser, deleteUser, currentUser, resetUserPin } = useAuth();
    const { showAlert } = useUI();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleSaveUser = async (userData: Omit<User, 'id'> | User) => {
        if ('id' in userData) {
            await updateUser(userData);
        } else {
            await addUser(userData);
        }
        setModalOpen(false);
    };

    const handleDeleteUser = (userId: string) => {
        showAlert({
            type: 'confirm',
            title: 'Hapus Pengguna?',
            message: 'Apakah Anda yakin ingin menghapus pengguna ini?',
            onConfirm: () => deleteUser(userId),
            confirmVariant: 'danger',
            confirmText: 'Ya, Hapus'
        });
    };

    const handleResetPin = (user: User) => {
        showAlert({
            type: 'confirm',
            title: `Reset PIN untuk ${user.name}?`,
            message: 'PIN pengguna ini akan direset ke "0000". Pengguna harus segera menggantinya setelah login.',
            confirmText: 'Ya, Reset',
            onConfirm: async () => {
                const resetName = await resetUserPin(user.id);
                if (resetName) {
                    showAlert({ type: 'alert', title: 'PIN Berhasil Direset', message: `PIN untuk pengguna '${resetName}' telah direset ke '0000'.` });
                }
            }
        });
    }

    return (
        <div>
            <div className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded-md border-l-4 border-slate-600 mb-4">
                <p className="font-bold text-slate-300">Penjelasan Peran:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li><strong className="text-slate-300">Admin:</strong> Akses penuh ke semua fitur, termasuk laporan dan pengaturan.</li>
                    <li><strong className="text-slate-300">Staff / Kasir:</strong> Akses terbatas hanya pada halaman Kasir untuk transaksi.</li>
                </ul>
            </div>
            <div className="space-y-3">
                {users.map(user => (
                    <div key={user.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-md">
                        <div>
                            <p className="font-semibold text-white">{user.name}</p>
                            <p className="text-sm text-slate-400 capitalize">{user.role}</p>
                        </div>
                        <div className="flex gap-3">
                             <button onClick={() => handleResetPin(user)} disabled={user.id === currentUser?.id} className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed" title="Reset PIN Pengguna"><Icon name="reset" className="w-5 h-5" /></button>
                            <button onClick={() => { setEditingUser(user); setModalOpen(true); }} className="text-sky-400 hover:text-sky-300" title="Edit Pengguna"><Icon name="edit" className="w-5 h-5" /></button>
                            <button onClick={() => handleDeleteUser(user.id)} disabled={user.id === currentUser?.id} className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed" title="Hapus Pengguna"><Icon name="trash" className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4">
                <Button variant="secondary" onClick={() => { setEditingUser(null); setModalOpen(true); }}><Icon name="plus" className="w-5 h-5"/> Tambah Pengguna</Button>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}>
                <UserForm user={editingUser} onSave={handleSaveUser} onCancel={() => setModalOpen(false)} />
            </Modal>
        </div>
    );
}

const ReceiptSettingsForm: React.FC = () => {
    const { receiptSettings, updateReceiptSettings } = useSettings();
    const [settings, setSettings] = useState<ReceiptSettings>(receiptSettings);
    const [saved, setSaved] = useState(false);

    useEffect(() => { setSettings(receiptSettings); }, [receiptSettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setSettings({ ...settings, [name]: type === 'number' ? parseFloat(value) || 0 : value });
    };

    const handleToggleChange = (key: keyof ReceiptSettings, value: boolean) => {
        setSettings({ ...settings, [key]: value });
    }

    const handleSave = () => {
        updateReceiptSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="w-full space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nama Toko</label>
                <input type="text" name="shopName" value={settings.shopName} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Alamat / Info Kontak</label>
                <input type="text" name="address" value={settings.address} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Pesan Footer</label>
                <input type="text" name="footerMessage" value={settings.footerMessage} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">WhatsApp Admin (cth: 628123...)</label>
                    <input type="text" name="adminWhatsapp" value={settings.adminWhatsapp || ''} onChange={handleChange} placeholder="Tanpa '+'" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Username Telegram Admin</label>
                    <input type="text" name="adminTelegram" value={settings.adminTelegram || ''} onChange={handleChange} placeholder="Tanpa '@'" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>
            </div>
            <div className="pt-4 border-t border-slate-700">
                <h3 className="text-sm font-bold text-white mb-3">Pajak & Biaya Layanan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Pajak (PB1/PPN) dalam %</label>
                        <input type="number" min="0" step="0.1" name="taxRate" value={settings.taxRate || ''} onChange={handleChange} placeholder="0" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                        <p className="text-xs text-slate-500 mt-1">Contoh: Isi 10 untuk 10%.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Biaya Layanan (Service Charge) dalam %</label>
                        <input type="number" min="0" step="0.1" name="serviceChargeRate" value={settings.serviceChargeRate || ''} onChange={handleChange} placeholder="0" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                        <p className="text-xs text-slate-500 mt-1">Contoh: Isi 5 untuk 5%.</p>
                    </div>
                </div>
            </div>
            <div className="pt-4 border-t border-slate-700">
                <ToggleSwitch checked={settings.enableKitchenPrinter ?? false} onChange={(checked) => handleToggleChange('enableKitchenPrinter', checked)} label="Aktifkan Cetak Catatan Dapur Otomatis" />
                <p className="text-xs text-slate-500 mt-2 ml-9">Jika diaktifkan, dialog cetak untuk catatan dapur akan otomatis muncul setelah setiap transaksi berhasil.</p>
            </div>
            <div className="flex justify-end items-center gap-4">
                {saved && <span className="text-sm text-green-400">Tersimpan!</span>}
                <Button onClick={handleSave} variant="primary">Simpan Pengaturan Struk</Button>
            </div>
        </div>
    );
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean; }> = ({ checked, onChange, label, disabled = false }) => (
    <label className={`flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className="relative">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
            <div className={`w-11 h-6 bg-slate-700 rounded-full transition-colors peer-checked:bg-[#347758] ${disabled ? 'opacity-50' : ''}`}></div>
            <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform transform peer-checked:translate-x-full ${disabled ? 'opacity-50' : ''}`}></div>
        </div>
        <span className="ml-3 text-sm font-medium text-slate-300">{label}</span>
    </label>
);

const CategoryManagement: React.FC = () => {
    const { categories, addCategory, deleteCategory } = useProduct();
    const { showAlert } = useUI();
    const [newCategory, setNewCategory] = useState('');

    const handleAddCategory = () => {
        if (newCategory.trim()) {
            addCategory(newCategory.trim());
            setNewCategory('');
        }
    };
    
    const handleDeleteCategory = (category: string) => {
        showAlert({
            type: 'confirm', title: 'Hapus Kategori?', message: `Anda yakin ingin menghapus kategori "${category}"? Tindakan ini tidak akan menghapusnya dari produk yang sudah ada.`, confirmVariant: 'danger', confirmText: 'Ya, Hapus',
            onConfirm: () => deleteCategory(category),
        })
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded-md border border-slate-700 mb-4">
                {categories.length > 0 ? categories.map(cat => (
                    <div key={cat} className="flex items-center gap-1 bg-slate-700 text-slate-200 text-sm font-medium px-2 py-1 rounded-full">
                        {cat}
                        <button type="button" onClick={() => handleDeleteCategory(cat)} className="text-slate-400 hover:text-white"><Icon name="close" className="w-3 h-3"/></button>
                    </div>
                )) : <p className="text-sm text-slate-500">Belum ada kategori.</p>}
            </div>
            <div className="flex gap-2">
                <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} placeholder="Nama kategori baru" className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <Button onClick={handleAddCategory} disabled={!newCategory.trim()}><Icon name="plus" className="w-5 h-5"/><span className="hidden sm:inline">Tambah</span></Button>
            </div>
        </div>
    );
};

const PointRuleModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (rule: Omit<PointRule, 'id'> | PointRule) => void, rule: PointRule | null }> = ({ isOpen, onClose, onSave, rule }) => {
    const { products, categories } = useProduct();
    const [form, setForm] = useState<Partial<PointRule>>({ type: 'spend', description: '', spendAmount: 0, pointsEarned: 0, targetId: '', pointsPerItem: 0 });

    useEffect(() => {
        if (rule) setForm(rule);
        else setForm({ type: 'spend', description: '', spendAmount: 0, pointsEarned: 0, targetId: '', pointsPerItem: 0 });
    }, [rule, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Construct valid rule object
        const ruleData: any = {
            description: form.description,
            type: form.type,
        };
        if (form.type === 'spend') {
            ruleData.spendAmount = Number(form.spendAmount);
            ruleData.pointsEarned = Number(form.pointsEarned);
        } else {
            ruleData.targetId = form.targetId;
            ruleData.pointsPerItem = Number(form.pointsPerItem);
        }

        if (rule) onSave({ ...ruleData, id: rule.id });
        else onSave(ruleData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={rule ? 'Edit Aturan Poin' : 'Tambah Aturan Poin'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                    <option value="spend">Berdasarkan Total Belanja</option>
                    <option value="product">Berdasarkan Produk</option>
                    <option value="category">Berdasarkan Kategori</option>
                </select>
                
                <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Deskripsi (cth: 1 Poin tiap 10rb)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />

                {form.type === 'spend' && (
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" min="0" value={form.spendAmount} onChange={e => setForm({...form, spendAmount: Number(e.target.value)})} placeholder="Jlh Belanja (Rp)" required className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                        <input type="number" min="0" value={form.pointsEarned} onChange={e => setForm({...form, pointsEarned: Number(e.target.value)})} placeholder="Poin Didapat" required className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                    </div>
                )}

                {(form.type === 'product' || form.type === 'category') && (
                    <div className="space-y-4">
                        <select value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                            <option value="">Pilih Target</option>
                            {form.type === 'product' 
                                ? products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                : categories.map(c => <option key={c} value={c}>{c}</option>)
                            }
                        </select>
                        <input type="number" min="0" value={form.pointsPerItem} onChange={e => setForm({...form, pointsPerItem: Number(e.target.value)})} placeholder="Poin Per Item" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};

const RewardModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (reward: Omit<Reward, 'id'> | Reward) => void, reward: Reward | null }> = ({ isOpen, onClose, onSave, reward }) => {
    const { products } = useProduct();
    const [form, setForm] = useState<Partial<Reward>>({ type: 'discount_amount', name: '', pointsCost: 0, discountValue: 0, freeProductId: '' });

    useEffect(() => {
        if (reward) setForm(reward);
        else setForm({ type: 'discount_amount', name: '', pointsCost: 0, discountValue: 0, freeProductId: '' });
    }, [reward, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const rewardData: any = {
            name: form.name,
            type: form.type,
            pointsCost: Number(form.pointsCost),
        };
        if (form.type === 'discount_amount') {
            rewardData.discountValue = Number(form.discountValue);
        } else {
            rewardData.freeProductId = form.freeProductId;
        }

        if (reward) onSave({ ...rewardData, id: reward.id });
        else onSave(rewardData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={reward ? 'Edit Reward' : 'Tambah Reward'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                    <option value="discount_amount">Potongan Harga (Rp)</option>
                    <option value="free_product">Produk Gratis</option>
                </select>
                
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama Reward" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="number" min="0" value={form.pointsCost} onChange={e => setForm({...form, pointsCost: Number(e.target.value)})} placeholder="Biaya Poin" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />

                {form.type === 'discount_amount' && (
                    <input type="number" min="0" value={form.discountValue} onChange={e => setForm({...form, discountValue: Number(e.target.value)})} placeholder="Nilai Potongan (Rp)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                )}

                {form.type === 'free_product' && (
                    <select value={form.freeProductId} onChange={e => setForm({...form, freeProductId: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                        <option value="">Pilih Produk Gratis</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};

const MembershipManagement: React.FC = () => {
    const { membershipSettings, updateMembershipSettings } = useCustomer();
    const [isRuleModalOpen, setRuleModalOpen] = useState(false);
    const [isRewardModalOpen, setRewardModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PointRule | null>(null);
    const [editingReward, setEditingReward] = useState<Reward | null>(null);

    const handleSaveRule = (ruleData: Omit<PointRule, 'id'> | PointRule) => {
        let newRules = [...membershipSettings.pointRules];
        if ('id' in ruleData) {
            newRules = newRules.map(r => r.id === ruleData.id ? ruleData : r);
        } else {
            newRules.push({ ...ruleData, id: Date.now().toString() });
        }
        updateMembershipSettings({ ...membershipSettings, pointRules: newRules });
        setRuleModalOpen(false);
    };

    const handleDeleteRule = (id: string) => {
        updateMembershipSettings({
            ...membershipSettings,
            pointRules: membershipSettings.pointRules.filter(r => r.id !== id)
        });
    };

    const handleSaveReward = (rewardData: Omit<Reward, 'id'> | Reward) => {
        let newRewards = [...membershipSettings.rewards];
        if ('id' in rewardData) {
            newRewards = newRewards.map(r => r.id === rewardData.id ? rewardData : r);
        } else {
            newRewards.push({ ...rewardData, id: Date.now().toString() });
        }
        updateMembershipSettings({ ...membershipSettings, rewards: newRewards });
        setRewardModalOpen(false);
    };

    const handleDeleteReward = (id: string) => {
        updateMembershipSettings({
            ...membershipSettings,
            rewards: membershipSettings.rewards.filter(r => r.id !== id)
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold text-white mb-2 flex justify-between items-center">
                    Aturan Poin
                    <Button size="sm" onClick={() => { setEditingRule(null); setRuleModalOpen(true); }}>
                        <Icon name="plus" className="w-4 h-4" /> Tambah
                    </Button>
                </h3>
                <div className="space-y-2">
                    {membershipSettings.pointRules.map(rule => (
                        <div key={rule.id} className="bg-slate-900 p-3 rounded-md flex justify-between items-center text-sm">
                            <div>
                                <p className="font-medium text-white">{rule.description}</p>
                                <p className="text-xs text-slate-400">Tipe: {rule.type}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingRule(rule); setRuleModalOpen(true); }} className="text-sky-400"><Icon name="edit" className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteRule(rule.id)} className="text-red-400"><Icon name="trash" className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                    {membershipSettings.pointRules.length === 0 && <p className="text-xs text-slate-500 italic">Belum ada aturan poin.</p>}
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-white mb-2 flex justify-between items-center">
                    Daftar Reward
                    <Button size="sm" onClick={() => { setEditingReward(null); setRewardModalOpen(true); }}>
                        <Icon name="plus" className="w-4 h-4" /> Tambah
                    </Button>
                </h3>
                <div className="space-y-2">
                    {membershipSettings.rewards.map(reward => (
                        <div key={reward.id} className="bg-slate-900 p-3 rounded-md flex justify-between items-center text-sm">
                            <div>
                                <p className="font-medium text-white">{reward.name}</p>
                                <p className="text-xs text-slate-400">{reward.pointsCost} Poin</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingReward(reward); setRewardModalOpen(true); }} className="text-sky-400"><Icon name="edit" className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteReward(reward.id)} className="text-red-400"><Icon name="trash" className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                    {membershipSettings.rewards.length === 0 && <p className="text-xs text-slate-500 italic">Belum ada reward.</p>}
                </div>
            </div>

            <PointRuleModal isOpen={isRuleModalOpen} onClose={() => setRuleModalOpen(false)} onSave={handleSaveRule} rule={editingRule} />
            <RewardModal isOpen={isRewardModalOpen} onClose={() => setRewardModalOpen(false)} onSave={handleSaveReward} reward={editingReward} />
        </div>
    );
};

const DiscountFormModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (discount: Omit<DiscountDefinition, 'id'> | DiscountDefinition) => void, discount: DiscountDefinition | null }> = ({ isOpen, onClose, onSave, discount }) => {
    const [form, setForm] = useState<Partial<DiscountDefinition>>({ name: '', type: 'percentage', value: 0, isActive: true, startDate: '', endDate: '' });

    useEffect(() => {
        if (discount) setForm(discount);
        else setForm({ name: '', type: 'percentage', value: 0, isActive: true, startDate: '', endDate: '' });
    }, [discount, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: any = {
            name: form.name,
            type: form.type,
            value: Number(form.value),
            isActive: form.isActive,
            startDate: form.startDate,
            endDate: form.endDate,
        };
        if (discount) onSave({ ...data, id: discount.id });
        else onSave(data);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={discount ? 'Edit Diskon' : 'Buat Diskon Baru'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama Diskon (cth: Promo Merdeka)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                
                <div className="flex gap-2">
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                        <option value="percentage">Persentase (%)</option>
                        <option value="amount">Nominal (Rp)</option>
                    </select>
                    <input type="number" min="0" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} placeholder="Nilai" required className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Mulai (Opsional)</label>
                        <input type="datetime-local" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-xs" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Berakhir (Opsional)</label>
                        <input type="datetime-local" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-xs" />
                    </div>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-[#347758] focus:ring-[#347758]" />
                    <span className="text-slate-300">Diskon Aktif</span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};

const DiscountManagement: React.FC = () => {
    const { discountDefinitions, addDiscountDefinition, updateDiscountDefinition, deleteDiscountDefinition } = useDiscount();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<DiscountDefinition | null>(null);

    const handleSave = (discount: Omit<DiscountDefinition, 'id'> | DiscountDefinition) => {
        if ('id' in discount) updateDiscountDefinition(discount);
        else addDiscountDefinition(discount);
        setModalOpen(false);
    };

    return (
        <div>
            <div className="space-y-3">
                {discountDefinitions.map(d => (
                    <div key={d.id} className="bg-slate-900 p-3 rounded-md flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-white flex items-center gap-2">
                                {d.name}
                                {!d.isActive && <span className="text-xs bg-red-900/50 text-red-300 px-2 rounded">Nonaktif</span>}
                            </p>
                            <p className="text-xs text-slate-400">{d.type === 'percentage' ? `${d.value}%` : CURRENCY_FORMATTER.format(d.value)}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingDiscount(d); setModalOpen(true); }} className="text-sky-400 hover:text-sky-300"><Icon name="edit" className="w-5 h-5"/></button>
                            <button onClick={() => deleteDiscountDefinition(d.id)} className="text-red-500 hover:text-red-400"><Icon name="trash" className="w-5 h-5"/></button>
                        </div>
                    </div>
                ))}
                {discountDefinitions.length === 0 && <p className="text-sm text-slate-500 italic">Belum ada preset diskon.</p>}
            </div>
            <div className="mt-4">
                <Button variant="secondary" onClick={() => { setEditingDiscount(null); setModalOpen(true); }}><Icon name="plus" className="w-5 h-5"/> Tambah Diskon</Button>
            </div>
            <DiscountFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} discount={editingDiscount} />
        </div>
    );
};

const ImportTransactionsModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { importTransactions } = useFinance();
    const { showAlert } = useUI();
    const [textInput, setTextInput] = useState('');

    const handleImport = () => {
        try {
            // Check if encrypted
            if (textInput.trim().startsWith('ARTEA_ENC::')) {
                const decryptedData = decryptReport(textInput.trim());
                if (decryptedData && Array.isArray(decryptedData)) {
                    importTransactions(decryptedData);
                    showAlert({ type: 'alert', title: 'Sukses', message: `${decryptedData.length} transaksi berhasil diimpor.` });
                    onClose();
                    setTextInput('');
                    return;
                } else {
                    throw new Error("Gagal mendekripsi atau format data salah.");
                }
            }
            
            // Fallback: Try parsing as standard JSON (for manual backups)
            const data = JSON.parse(textInput);
            if (Array.isArray(data)) {
                importTransactions(data);
                showAlert({ type: 'alert', title: 'Sukses', message: `${data.length} transaksi berhasil diimpor.` });
                onClose();
                setTextInput('');
            } else {
                throw new Error("Format JSON tidak valid (harus array transaksi).");
            }
        } catch (error) {
            showAlert({ type: 'alert', title: 'Gagal Import', message: (error as Error).message });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Transaksi (Teks/Enkripsi)">
            <div className="space-y-4">
                <p className="text-sm text-slate-400">Tempel kode enkripsi dari laporan WhatsApp/Telegram atau JSON transaksi di sini.</p>
                <textarea 
                    value={textInput} 
                    onChange={e => setTextInput(e.target.value)} 
                    rows={6}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs font-mono text-white"
                    placeholder="ARTEA_ENC::..."
                />
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Batal</Button>
                    <Button onClick={handleImport} disabled={!textInput.trim()}>Import Data</Button>
                </div>
            </div>
        </Modal>
    );
};

// -- SUPABASE SQL MODAL --
const SupabaseSetupModal: React.FC<{isOpen: boolean, onClose: () => void}> = ({isOpen, onClose}) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Setup Database Supabase">
            <div className="space-y-4 text-sm text-slate-300">
                <p>Agar aplikasi bisa menyimpan data ke Project Supabase Anda, tabel harus dibuat terlebih dahulu.</p>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Buka Dashboard Supabase Project Anda.</li>
                    <li>Masuk ke menu <strong>SQL Editor</strong>.</li>
                    <li>Buat "New Query", lalu salin & tempel kode di bawah ini:</li>
                </ol>
                <div className="relative">
                    <pre className="bg-slate-900 p-3 rounded-lg overflow-x-auto text-xs text-green-400 border border-slate-700">
                        {SETUP_SQL_SCRIPT}
                    </pre>
                    <button 
                        onClick={() => navigator.clipboard.writeText(SETUP_SQL_SCRIPT)}
                        className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs"
                    >
                        Salin
                    </button>
                </div>
                <p>Klik <strong>Run</strong> di SQL Editor. Setelah sukses, Anda bisa melakukan Tes Koneksi di sini.</p>
                <div className="flex justify-end">
                    <Button onClick={onClose}>Tutup</Button>
                </div>
            </div>
        </Modal>
    );
};

// -- Main Settings View with Tabbed Layout --

type SettingsTab = 'general' | 'operational' | 'inventory' | 'customer' | 'data';

const SettingsView: React.FC = () => {
    const { data, restoreData } = useData();
    const { showAlert } = useUI();
    const { currentUser, authSettings, updateAuthSettings } = useAuth();
    const { products, inventorySettings, updateInventorySettings, bulkAddProducts } = useProduct();
    const { receiptSettings } = useSettings();
    const { session, endSession, sessionSettings, updateSessionSettings } = useSession();
    const { membershipSettings, updateMembershipSettings } = useCustomer();
    const { importTransactions } = useFinance();
    
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [isImportTransOpen, setIsImportTransOpen] = useState(false);
    
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const importProductsInputRef = useRef<HTMLInputElement>(null);
    const importTransactionsInputRef = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    
    // Dropbox State
    const [dropboxToken, setDropboxToken] = useState(localStorage.getItem('ARTEA_DBX_TOKEN') || '');
    const [isSyncing, setIsSyncing] = useState(false);

    // Supabase State
    const [sbUrl, setSbUrl] = useState(localStorage.getItem('ARTEA_SB_URL') || '');
    const [sbKey, setSbKey] = useState(localStorage.getItem('ARTEA_SB_KEY') || '');
    const [isSbSetupOpen, setSbSetupOpen] = useState(false);

    const handleBackup = async () => {
        await dataService.exportData();
        setMessage({ type: 'success', text: 'Data backup berhasil diunduh.' });
    };

    const handleRestoreChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            showAlert({
                type: 'confirm', title: 'Konfirmasi Pemulihan Data', message: 'Apakah Anda yakin ingin memulihkan data? Semua data saat ini akan ditimpa dan aplikasi akan dimuat ulang.', confirmVariant: 'danger', confirmText: 'Ya, Pulihkan',
                onConfirm: async () => {
                    try {
                        const data = await dataService.importData(file);
                        await restoreData(data);
                    } catch (error) {
                        setMessage({ type: 'error', text: (error as Error).message });
                    } finally {
                        if(restoreInputRef.current) restoreInputRef.current.value = "";
                    }
                }
            });
        }
    };

    const handleExportProducts = () => {
        dataService.exportProductsCSV(products);
        setMessage({ type: 'success', text: 'Data produk (CSV) berhasil diunduh.' });
    };

    const handleImportProductsChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const newProducts = await dataService.importProductsCSV(file);
                bulkAddProducts(newProducts);
                 setMessage({ type: 'success', text: `${newProducts.length} produk berhasil diimpor/diperbarui.` });
            } catch (error) {
                 setMessage({ type: 'error', text: (error as Error).message });
            } finally {
                if(importProductsInputRef.current) importProductsInputRef.current.value = "";
            }
        }
    };

    const handleImportTransactionsChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const newTransactions = await dataService.importTransactionsCSV(file);
                importTransactions(newTransactions);
                setMessage({ type: 'success', text: `${newTransactions.length} transaksi berhasil diimpor.` });
            } catch (error) {
                setMessage({ type: 'error', text: (error as Error).message });
            } finally {
                if(importTransactionsInputRef.current) importTransactionsInputRef.current.value = "";
            }
        }
    };
    
    const handleInventoryToggle = (key: keyof InventorySettings, value: boolean) => {
        const newSettings = { ...inventorySettings, [key]: value };
        if (key === 'enabled' && !value) newSettings.trackIngredients = false;
        updateInventorySettings(newSettings);
    }
    
    const handleAuthToggle = (enabled: boolean) => updateAuthSettings({ ...authSettings, enabled });

    const handleSessionToggle = (key: keyof SessionSettings, value: boolean) => {
        let newSettings = { ...sessionSettings, [key]: value };
        if (key === 'enabled' && !value) {
            if (session) {
                showAlert({
                    type: 'confirm', title: 'Nonaktifkan Sesi Penjualan?', message: 'Menonaktifkan fitur ini akan mengakhiri sesi yang sedang berjalan dan menonaktifkan fitur simpan pesanan. Lanjutkan?',
                    onConfirm: () => {
                        endSession();
                        updateSessionSettings({ enabled: false, enableCartHolding: false });
                    }
                });
                return;
            } else {
                newSettings.enableCartHolding = false;
            }
        }
        updateSessionSettings(newSettings);
    };
    
    const handleExportAllReports = () => {
        dataService.exportAllReportsCSV(data);
        setMessage({ type: 'success', text: 'Semua laporan berhasil diunduh.' });
    };

    // --- Dropbox Handlers ---
    const handleSaveDropboxToken = () => {
        localStorage.setItem('ARTEA_DBX_TOKEN', dropboxToken);
        setMessage({ type: 'success', text: 'Token Dropbox tersimpan.' });
    }

    const handleUploadToDropbox = async () => {
        if(!dropboxToken) {
            setMessage({ type: 'error', text: 'Token Dropbox belum diisi.' });
            return;
        }
        setIsSyncing(true);
        try {
            await dropboxService.uploadBackup(dropboxToken);
            setMessage({ type: 'success', text: 'Data berhasil diunggah ke Dropbox.' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setIsSyncing(false);
        }
    }

    const handleRestoreFromDropbox = async () => {
        if(!dropboxToken) {
            setMessage({ type: 'error', text: 'Token Dropbox belum diisi.' });
            return;
        }
        
        showAlert({
            type: 'confirm',
            title: 'Restore dari Cloud?',
            message: 'Tindakan ini akan menimpa SEMUA data lokal saat ini dengan data dari Dropbox. Pastikan Anda sudah backup data lokal jika perlu. Lanjutkan?',
            confirmVariant: 'danger',
            confirmText: 'Ya, Restore',
            onConfirm: async () => {
                setIsSyncing(true);
                try {
                    const data = await dropboxService.downloadBackup(dropboxToken);
                    await restoreData(data);
                } catch (e: any) {
                    setMessage({ type: 'error', text: e.message });
                } finally {
                    setIsSyncing(false);
                }
            }
        });
    }

    // --- Supabase Handlers ---
    const handleSaveSupabaseConfig = () => {
        localStorage.setItem('ARTEA_SB_URL', sbUrl);
        localStorage.setItem('ARTEA_SB_KEY', sbKey);
        setMessage({ type: 'success', text: 'Konfigurasi Supabase tersimpan.' });
    };

    const handleTestSupabase = async () => {
        if (!sbUrl || !sbKey) {
            setMessage({ type: 'error', text: 'URL dan Key belum diisi.' });
            return;
        }
        supabaseService.init(sbUrl, sbKey);
        const res = await supabaseService.testConnection();
        if (res.success) {
            setMessage({ type: 'success', text: res.message });
        } else {
            setMessage({ type: 'error', text: res.message });
        }
    };

    const handleSyncToSupabase = async () => {
        if (!sbUrl || !sbKey) {
            setMessage({ type: 'error', text: 'Konfigurasi Supabase belum lengkap.' });
            return;
        }
        setIsSyncing(true);
        supabaseService.init(sbUrl, sbKey);
        const res = await supabaseService.syncTransactionsUp();
        setIsSyncing(false);
        
        if (res.success) {
            setMessage({ type: 'success', text: `Sukses! ${res.count} transaksi tersinkronisasi.` });
        } else {
            setMessage({ type: 'error', text: `Gagal sync: ${res.message}` });
        }
    };

    const tabs = [
        { id: 'general', label: 'Toko & Struk', icon: 'settings' },
        { id: 'operational', label: 'Operasional', icon: 'cash' },
        { id: 'inventory', label: 'Produk & Stok', icon: 'products' },
        { id: 'customer', label: 'Pelanggan & Promo', icon: 'users' },
        { id: 'data', label: 'Data & Sistem', icon: 'database' },
    ];

    if (currentUser?.role === 'staff') {
        return (
            <div className="text-center text-slate-400 p-8 bg-slate-800 rounded-lg max-w-lg mx-auto mt-10">
                <Icon name="lock" className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <h2 className="text-xl font-bold text-white mb-2">Akses Dibatasi</h2>
                <p>Pengaturan hanya dapat diakses oleh Admin.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto h-full flex flex-col">
            <h1 className="text-3xl font-bold text-white mb-6">Pengaturan</h1>
            
            <div className="flex overflow-x-auto gap-2 pb-2 mb-4 border-b border-slate-700 flex-shrink-0">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as SettingsTab)} className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap font-medium text-sm ${activeTab === tab.id ? 'bg-[#347758] text-white border-b-2 border-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <Icon name={tab.icon as any} className="w-4 h-4" />{tab.label}
                    </button>
                ))}
            </div>

            {message && (
                <div className={`p-4 rounded-lg mb-6 flex-shrink-0 flex justify-between items-center ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)}><Icon name="close" className="w-4 h-4"/></button>
                </div>
            )}
            
            <div className="flex-1 overflow-y-auto pr-2 pb-10">
                {activeTab === 'general' && <div className="animate-fade-in"><SettingsCard title="Pengaturan Struk & Toko" description="Sesuaikan informasi yang ditampilkan pada struk pelanggan dan kontak admin."><ReceiptSettingsForm /></SettingsCard></div>}

                {activeTab === 'operational' && (
                    <div className="animate-fade-in space-y-6">
                        <SettingsCard title="Keamanan & Akses Pengguna" description="Batasi akses staf hanya ke halaman kasir dengan PIN.">
                            <ToggleSwitch checked={authSettings.enabled} onChange={handleAuthToggle} label={authSettings.enabled ? 'Multi-Pengguna & Login PIN Aktif' : 'Multi-Pengguna & Login PIN Nonaktif'} />
                            <p className="text-xs text-slate-500 mt-2">Jika aktif, aplikasi akan meminta PIN saat dibuka.</p>
                            {authSettings.enabled && <p className="text-xs text-slate-500 mt-2"><strong>Lupa PIN Admin?</strong> Ketuk logo aplikasi 5 kali di halaman login untuk mereset PIN admin pertama ke `1111`.</p>}
                        </SettingsCard>
                        {authSettings.enabled && <SettingsCard title="Manajemen Pengguna" description="Tambah, edit, atau hapus akun pengguna untuk staf Anda."><UserManagement /></SettingsCard>}
                        <SettingsCard title="Manajemen Sesi Penjualan" description="Wajibkan kasir memulai dan menutup shift (sesi) untuk rekon uang kas.">
                            <ToggleSwitch checked={sessionSettings.enabled} onChange={(value) => handleSessionToggle('enabled', value)} label={sessionSettings.enabled ? 'Sesi Penjualan Aktif' : 'Sesi Penjualan Nonaktif'} />
                            {sessionSettings.enabled && (
                                <div className="pt-4 border-t border-slate-700 mt-4">
                                    <ToggleSwitch checked={sessionSettings.enableCartHolding ?? false} onChange={(enabled) => handleSessionToggle('enableCartHolding', enabled)} label="Aktifkan Fitur Simpan Pesanan (Open Bill)" />
                                    <p className="text-xs text-slate-500 mt-2">Memungkinkan kasir menyimpan beberapa pesanan sekaligus (cth: untuk meja restoran).</p>
                                </div>
                            )}
                        </SettingsCard>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="animate-fade-in space-y-6">
                        <SettingsCard title="Manajemen Inventaris" description="Aktifkan pelacakan stok produk dan penghitungan laba otomatis.">
                             <div className="space-y-4">
                                <ToggleSwitch checked={inventorySettings.enabled} onChange={(checked) => handleInventoryToggle('enabled', checked)} label={inventorySettings.enabled ? 'Pelacakan Stok & Laba Aktif' : 'Pelacakan Stok & Laba Nonaktif'} />
                                {inventorySettings.enabled && (
                                    <div className="pl-6 border-l-2 border-slate-700">
                                         <ToggleSwitch checked={inventorySettings.trackIngredients} onChange={(checked) => handleInventoryToggle('trackIngredients', checked)} label={inventorySettings.trackIngredients ? 'Pelacakan Bahan Baku & Resep Aktif' : 'Pelacakan Bahan Baku & Resep Nonaktif'} />
                                        <p className="text-xs text-slate-500 mt-2 ml-3">Jika aktif, stok produk akan dihitung berdasarkan bahan baku penyusunnya (Resep).</p>
                                    </div>
                                )}
                             </div>
                        </SettingsCard>
                        <SettingsCard title="Kategori Produk" description="Kelola daftar kategori agar produk lebih mudah ditemukan."><CategoryManagement /></SettingsCard>
                        <SettingsCard title="Import / Export Produk Massal" description="Gunakan file CSV untuk mengelola banyak produk sekaligus.">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button onClick={handleExportProducts} variant="secondary"><Icon name="download" className="w-5 h-5"/> Export Produk (CSV)</Button>
                                <Button onClick={() => importProductsInputRef.current?.click()} variant="secondary"><Icon name="upload" className="w-5 h-5"/> Import Produk (CSV)</Button>
                                <input type="file" ref={importProductsInputRef} onChange={handleImportProductsChange} className="hidden" accept=".csv" />
                            </div>
                        </SettingsCard>
                    </div>
                )}

                {activeTab === 'customer' && (
                    <div className="animate-fade-in space-y-6">
                        <SettingsCard title="Manajemen Diskon" description="Buat preset diskon untuk mempercepat proses di kasir."><DiscountManagement /></SettingsCard>
                        <SettingsCard title="Program Membership" description="Berikan poin kepada pelanggan setia untuk ditukar dengan hadiah.">
                            <ToggleSwitch checked={membershipSettings.enabled} onChange={(enabled) => updateMembershipSettings({ ...membershipSettings, enabled })} label={membershipSettings.enabled ? 'Sistem Keanggotaan Aktif' : 'Sistem Keanggotaan Nonaktif'} />
                            {membershipSettings.enabled && <div className="mt-4"><MembershipManagement /></div>}
                        </SettingsCard>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="animate-fade-in space-y-6">
                        <SettingsCard title="Backup & Restore Lokal" description="Amankan data Anda secara manual. Unduh file backup JSON secara berkala dan simpan di tempat aman.">
                            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                                <Button onClick={handleBackup} variant="secondary"><Icon name="download" className="w-5 h-5"/> Backup Data (JSON)</Button>
                                <Button onClick={() => restoreInputRef.current?.click()} variant="secondary"><Icon name="upload" className="w-5 h-5"/> Restore Data (JSON)</Button>
                                <input type="file" ref={restoreInputRef} onChange={handleRestoreChange} className="hidden" accept=".json" />
                            </div>
                        </SettingsCard>

                        <SettingsCard title="Sinkronisasi Cloud (Dropbox)" description="Backup dan Pulihkan data antar perangkat menggunakan Dropbox. Anda memerlukan 'Generated Access Token' dari Dropbox App Console.">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Dropbox Access Token</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="password" 
                                            value={dropboxToken} 
                                            onChange={e => setDropboxToken(e.target.value)} 
                                            placeholder="Tempel token di sini..."
                                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" 
                                        />
                                        <Button onClick={handleSaveDropboxToken} size="sm">Simpan Token</Button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Cara dapat token: Buka <a href="https://www.dropbox.com/developers/apps" target="_blank" className="text-sky-400 hover:underline">Dropbox Console</a> {'>'} Create App {'>'} Scoped Access {'>'} Generate Token.
                                    </p>
                                </div>
                                
                                <div className="flex gap-3 pt-2 border-t border-slate-700">
                                    <Button onClick={handleUploadToDropbox} disabled={isSyncing || !dropboxToken} variant="secondary">
                                        {isSyncing ? 'Proses...' : <><Icon name="upload" className="w-5 h-5" /> Upload ke Cloud</>}
                                    </Button>
                                    <Button onClick={handleRestoreFromDropbox} disabled={isSyncing || !dropboxToken} variant="secondary">
                                        {isSyncing ? 'Proses...' : <><Icon name="download" className="w-5 h-5" /> Restore dari Cloud</>}
                                    </Button>
                                </div>
                            </div>
                        </SettingsCard>

                        <SettingsCard title="Database Real-time (Supabase BYOB)" description="Hubungkan ke project Supabase milik Anda sendiri untuk sinkronisasi data real-time (bukan sekadar file backup).">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Project URL</label>
                                    <input 
                                        type="text" 
                                        value={sbUrl} 
                                        onChange={e => setSbUrl(e.target.value)} 
                                        placeholder="https://xyz.supabase.co"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white mb-3" 
                                    />
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Anon / Public Key</label>
                                    <input 
                                        type="password" 
                                        value={sbKey} 
                                        onChange={e => setSbKey(e.target.value)} 
                                        placeholder="eyJhbG..."
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" 
                                    />
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button onClick={handleSaveSupabaseConfig} size="sm">Simpan Config</Button>
                                    <Button onClick={() => setSbSetupOpen(true)} variant="secondary" size="sm">Panduan & SQL Script</Button>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-700">
                                    <Button onClick={handleTestSupabase} variant="secondary" disabled={!sbUrl || !sbKey}>
                                        <Icon name="wifi" className="w-4 h-4" /> Tes Koneksi
                                    </Button>
                                    <Button onClick={handleSyncToSupabase} variant="primary" disabled={isSyncing || !sbUrl || !sbKey}>
                                        {isSyncing ? 'Syncing...' : <><Icon name="upload" className="w-4 h-4" /> Push Data ke Cloud</>}
                                    </Button>
                                </div>
                                <p className="text-xs text-yellow-500 italic mt-2">
                                    Fitur ini bersifat eksperimental. Pastikan Anda telah menjalankan SQL Script di Supabase Dashboard Anda.
                                </p>
                            </div>
                        </SettingsCard>

                        <SettingsCard title="Laporan & Transaksi Lama" description="Export semua data laporan atau import riwayat transaksi dari perangkat lain.">
                             <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                                <Button onClick={handleExportAllReports} variant="secondary"><Icon name="download" className="w-5 h-5" /> Export Semua Laporan (CSV)</Button>
                                <Button onClick={() => setIsImportTransOpen(true)} variant="secondary"><Icon name="chat" className="w-5 h-5" /> Paste Teks (Encrypted)</Button>
                                <Button onClick={() => importTransactionsInputRef.current?.click()} variant="secondary"><Icon name="upload" className="w-5 h-5" /> Import File CSV</Button>
                                <input type="file" ref={importTransactionsInputRef} onChange={handleImportTransactionsChange} className="hidden" accept=".csv" />
                            </div>
                        </SettingsCard>
                    </div>
                )}
            </div>
            
            <ImportTransactionsModal isOpen={isImportTransOpen} onClose={() => setIsImportTransOpen(false)} />
            <SupabaseSetupModal isOpen={isSbSetupOpen} onClose={() => setSbSetupOpen(false)} />
        </div>
    );
};

export default SettingsView;

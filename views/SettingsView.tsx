import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { dataService } from '../services/dataService';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import type { AppData, ReceiptSettings, InventorySettings, User, AuthSettings, MembershipSettings, PointRule, Reward, SessionSettings } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

const SettingsCard: React.FC<{title: string, description: string, children: React.ReactNode}> = ({title, description, children}) => (
    <div className="bg-slate-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-slate-400 mt-1 mb-4">{description}</p>
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
    const { showAlert } = useAppContext();
    const [formData, setFormData] = useState({ name: '', pin: '', role: 'staff' as 'admin' | 'staff' });

    useEffect(() => {
        if (user) {
            setFormData({ name: user.name, pin: user.pin, role: user.role });
        } else {
            setFormData({ name: '', pin: '', role: 'staff' });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin)) {
            showAlert({
                type: 'alert',
                title: 'PIN Tidak Valid',
                message: 'PIN harus terdiri dari 4 digit angka.'
            });
            return;
        }
        const userData = { ...formData };
        if (user && 'id' in user) {
            onSave({ ...userData, id: user.id });
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
                <input type="password" name="pin" value={formData.pin} onChange={handleChange} required maxLength={4} pattern="\d{4}" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
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
    const { users, addUser, updateUser, deleteUser, currentUser, showAlert, resetUserPin } = useAppContext();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleSaveUser = (userData: Omit<User, 'id'> | User) => {
        if ('id' in userData) {
            updateUser(userData);
        } else {
            addUser(userData);
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
            onConfirm: () => {
                const resetName = resetUserPin(user.id);
                if (resetName) {
                    showAlert({
                        type: 'alert',
                        title: 'PIN Berhasil Direset',
                        message: `PIN untuk pengguna '${resetName}' telah direset ke '0000'.`
                    });
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
                             <button onClick={() => handleResetPin(user)} disabled={user.id === currentUser?.id} className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed" title="Reset PIN Pengguna">
                                <Icon name="reset" className="w-5 h-5" />
                            </button>
                            <button onClick={() => { setEditingUser(user); setModalOpen(true); }} className="text-sky-400 hover:text-sky-300" title="Edit Pengguna">
                                <Icon name="edit" className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} disabled={user.id === currentUser?.id} className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed" title="Hapus Pengguna">
                                <Icon name="trash" className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4">
                <Button variant="secondary" onClick={() => { setEditingUser(null); setModalOpen(true); }}>
                     <Icon name="plus" className="w-5 h-5"/> Tambah Pengguna
                </Button>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}>
                <UserForm user={editingUser} onSave={handleSaveUser} onCancel={() => setModalOpen(false)} />
            </Modal>
        </div>
    );
}

const ReceiptSettingsForm: React.FC = () => {
    const { receiptSettings, updateReceiptSettings } = useAppContext();
    const [settings, setSettings] = useState<ReceiptSettings>(receiptSettings);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setSettings(receiptSettings);
    }, [receiptSettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

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
            <div className="flex justify-end items-center gap-4">
                {saved && <span className="text-sm text-green-400">Tersimpan!</span>}
                <Button onClick={handleSave} variant="primary">Simpan Pengaturan Struk</Button>
            </div>
        </div>
    );
};

const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}> = ({ checked, onChange, label }) => (
    <label className="flex items-center cursor-pointer">
        <div className="relative">
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={(e) => onChange(e.target.checked)} 
                className="sr-only peer"
            />
            {/* Background */}
            <div className="w-11 h-6 bg-slate-700 rounded-full transition-colors peer-checked:bg-sky-600"></div>
            {/* Dot */}
            <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform transform peer-checked:translate-x-full"></div>
        </div>
        <span className="ml-3 text-sm font-medium text-slate-300">{label}</span>
    </label>
);

const CategoryManagement: React.FC = () => {
    const { categories, addCategory, deleteCategory, showAlert } = useAppContext();
    const [newCategory, setNewCategory] = useState('');

    const handleAddCategory = () => {
        const trimmedCategory = newCategory.trim();
        if (trimmedCategory) {
            addCategory(trimmedCategory);
            setNewCategory('');
        }
    };
    
    const handleDeleteCategory = (category: string) => {
        showAlert({
            type: 'confirm',
            title: 'Hapus Kategori?',
            message: `Anda yakin ingin menghapus kategori "${category}"? Tindakan ini tidak akan menghapusnya dari produk yang sudah ada.`,
            confirmVariant: 'danger',
            confirmText: 'Ya, Hapus',
            onConfirm: () => deleteCategory(category),
        })
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded-md border border-slate-700 mb-4">
                {categories.length > 0 ? categories.map(cat => (
                    <div key={cat} className="flex items-center gap-1 bg-slate-700 text-slate-200 text-sm font-medium px-2 py-1 rounded-full">
                        {cat}
                        <button type="button" onClick={() => handleDeleteCategory(cat)} className="text-slate-400 hover:text-white">
                            <Icon name="close" className="w-3 h-3"/>
                        </button>
                    </div>
                )) : <p className="text-sm text-slate-500">Belum ada kategori.</p>}
            </div>
            <div className="flex gap-2">
                <input 
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Nama kategori baru"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
                <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
                    <Icon name="plus" className="w-5 h-5"/>
                    <span className="hidden sm:inline">Tambah</span>
                </Button>
            </div>
        </div>
    );
};

const MembershipManagement: React.FC = () => {
    const { membershipSettings, updateMembershipSettings, products, categories } = useAppContext();
    const [isRuleModalOpen, setRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PointRule | null>(null);
    const [isRewardModalOpen, setRewardModalOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | null>(null);

    const handleSaveRule = (rule: Omit<PointRule, 'id'>) => {
        const newSettings = {...membershipSettings};
        if (editingRule) {
            newSettings.pointRules = newSettings.pointRules.map(r => r.id === editingRule.id ? {...rule, id: r.id} : r);
        } else {
            newSettings.pointRules.push({...rule, id: Date.now().toString()});
        }
        updateMembershipSettings(newSettings);
        setRuleModalOpen(false);
    }
    
    const handleDeleteRule = (ruleId: string) => {
        const newSettings = {...membershipSettings, pointRules: membershipSettings.pointRules.filter(r => r.id !== ruleId)};
        updateMembershipSettings(newSettings);
    }
    
    const handleSaveReward = (reward: Omit<Reward, 'id'>) => {
        const newSettings = {...membershipSettings};
        if (editingReward) {
            newSettings.rewards = newSettings.rewards.map(r => r.id === editingReward.id ? {...reward, id: r.id} : r);
        } else {
            newSettings.rewards.push({...reward, id: Date.now().toString()});
        }
        updateMembershipSettings(newSettings);
        setRewardModalOpen(false);
    }
    
    const handleDeleteReward = (rewardId: string) => {
        const newSettings = {...membershipSettings, rewards: membershipSettings.rewards.filter(r => r.id !== rewardId)};
        updateMembershipSettings(newSettings);
    }

    return (
        <div className="pl-6 border-l-2 border-slate-700 space-y-6 pt-4">
             {/* Point Rules Management */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-white">Aturan Perolehan Poin</h3>
                    <Button size="sm" variant="secondary" onClick={() => { setEditingRule(null); setRuleModalOpen(true); }}>
                        <Icon name="plus" className="w-4 h-4"/> Tambah Aturan
                    </Button>
                </div>
                <div className="space-y-2">
                    {membershipSettings.pointRules.map(rule => (
                        <div key={rule.id} className="flex justify-between items-center bg-slate-900 p-2 rounded-md">
                           <p className="text-sm text-slate-300">{rule.description}</p>
                           <div className="flex gap-2">
                                <button onClick={() => { setEditingRule(rule); setRuleModalOpen(true); }} className="text-sky-400 hover:text-sky-300"><Icon name="edit" className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteRule(rule.id)} className="text-red-500 hover:text-red-400"><Icon name="trash" className="w-4 h-4"/></button>
                           </div>
                        </div>
                    ))}
                    {membershipSettings.pointRules.length === 0 && <p className="text-sm text-slate-500">Belum ada aturan poin.</p>}
                </div>
            </div>
            
             {/* Rewards Management */}
            <div>
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-white">Reward yang Dapat Ditukar</h3>
                     <Button size="sm" variant="secondary" onClick={() => { setEditingReward(null); setRewardModalOpen(true); }}>
                        <Icon name="plus" className="w-4 h-4"/> Tambah Reward
                    </Button>
                </div>
                 <div className="space-y-2">
                     {membershipSettings.rewards.map(reward => (
                        <div key={reward.id} className="flex justify-between items-center bg-slate-900 p-2 rounded-md">
                           <div>
                                <p className="text-sm text-slate-300 font-semibold">{reward.name}</p>
                                <p className="text-xs text-slate-400">{reward.pointsCost} Poin</p>
                           </div>
                           <div className="flex gap-2">
                                <button onClick={() => { setEditingReward(reward); setRewardModalOpen(true); }} className="text-sky-400 hover:text-sky-300"><Icon name="edit" className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteReward(reward.id)} className="text-red-500 hover:text-red-400"><Icon name="trash" className="w-4 h-4"/></button>
                           </div>
                        </div>
                    ))}
                    {membershipSettings.rewards.length === 0 && <p className="text-sm text-slate-500">Belum ada reward.</p>}
                </div>
            </div>
             {isRuleModalOpen && <PointRuleModal isOpen={isRuleModalOpen} onClose={() => setRuleModalOpen(false)} onSave={handleSaveRule} rule={editingRule} products={products} categories={categories} />}
             {isRewardModalOpen && <RewardModal isOpen={isRewardModalOpen} onClose={() => setRewardModalOpen(false)} onSave={handleSaveReward} reward={editingReward} products={products} />}
        </div>
    )
}

const PointRuleModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (data: Omit<PointRule, 'id'>) => void, rule: PointRule | null, products: AppData['products'], categories: AppData['categories']}> = ({isOpen, onClose, onSave, rule, products, categories}) => {
    const [type, setType] = useState<PointRule['type']>('spend');
    const [spendAmount, setSpendAmount] = useState('');
    const [pointsEarned, setPointsEarned] = useState('');
    const [targetId, setTargetId] = useState('');
    const [pointsPerItem, setPointsPerItem] = useState('');

    useEffect(() => {
        if (rule) {
            setType(rule.type);
            setSpendAmount(rule.spendAmount?.toString() || '');
            setPointsEarned(rule.pointsEarned?.toString() || '');
            setTargetId(rule.targetId || '');
            setPointsPerItem(rule.pointsPerItem?.toString() || '');
        } else {
            setType('spend');
            setSpendAmount(''); setPointsEarned(''); setTargetId(''); setPointsPerItem('');
        }
    }, [rule, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let description = '';
        const ruleData: Omit<PointRule, 'id' | 'description'> = { type };
        
        if (type === 'spend') {
            const spend = parseFloat(spendAmount);
            const points = parseInt(pointsEarned, 10);
            description = `Dapat ${points} poin setiap belanja ${CURRENCY_FORMATTER.format(spend)}`;
            ruleData.spendAmount = spend;
            ruleData.pointsEarned = points;
        } else {
            const points = parseInt(pointsPerItem, 10);
            const targetName = type === 'product' ? products.find(p=>p.id === targetId)?.name : targetId;
            description = `Dapat ${points} poin setiap pembelian ${targetName}`;
            ruleData.targetId = targetId;
            ruleData.pointsPerItem = points;
        }

        onSave({ ...ruleData, description });
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={rule ? "Edit Aturan Poin" : "Tambah Aturan Poin"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Tipe Aturan</label>
                    <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                        <option value="spend">Berdasarkan Pengeluaran</option>
                        <option value="product">Berdasarkan Produk</option>
                        <option value="category">Berdasarkan Kategori</option>
                    </select>
                </div>
                {type === 'spend' && (
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" value={pointsEarned} onChange={e => setPointsEarned(e.target.value)} placeholder="Jumlah Poin" required className="bg-slate-700 p-2 rounded-md"/>
                        <input type="number" value={spendAmount} onChange={e => setSpendAmount(e.target.value)} placeholder="Setiap Belanja (Rp)" required className="bg-slate-700 p-2 rounded-md"/>
                    </div>
                )}
                {type === 'product' && (
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" value={pointsPerItem} onChange={e => setPointsPerItem(e.target.value)} placeholder="Poin per Item" required className="bg-slate-700 p-2 rounded-md"/>
                        <select value={targetId} onChange={e => setTargetId(e.target.value)} required className="bg-slate-700 p-2 rounded-md">
                            <option value="" disabled>Pilih Produk</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}
                {type === 'category' && (
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" value={pointsPerItem} onChange={e => setPointsPerItem(e.target.value)} placeholder="Poin per Item" required className="bg-slate-700 p-2 rounded-md"/>
                         <select value={targetId} onChange={e => setTargetId(e.target.value)} required className="bg-slate-700 p-2 rounded-md">
                             <option value="" disabled>Pilih Kategori</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    )
}

const RewardModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (data: Omit<Reward, 'id'>) => void, reward: Reward | null, products: AppData['products']}> = ({isOpen, onClose, onSave, reward, products}) => {
    const [form, setForm] = useState({ name: '', type: 'discount_amount' as Reward['type'], pointsCost: '', discountValue: '', freeProductId: ''});

    useEffect(() => {
        if(reward) {
            setForm({
                name: reward.name,
                type: reward.type,
                pointsCost: String(reward.pointsCost),
                discountValue: String(reward.discountValue || ''),
                freeProductId: reward.freeProductId || ''
            });
        } else {
             setForm({ name: '', type: 'discount_amount', pointsCost: '', discountValue: '', freeProductId: products[0]?.id || ''});
        }
    }, [reward, isOpen, products]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const rewardData: Omit<Reward, 'id'> = {
            name: form.name,
            type: form.type,
            pointsCost: parseInt(form.pointsCost, 10),
            discountValue: form.type === 'discount_amount' ? parseFloat(form.discountValue) : undefined,
            freeProductId: form.type === 'free_product' ? form.freeProductId : undefined
        };
        onSave(rewardData);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={reward ? "Edit Reward" : "Tambah Reward"}>
             <form onSubmit={handleSubmit} className="space-y-4">
                 <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama Reward (cth: Diskon 5rb)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                 <input type="number" value={form.pointsCost} onChange={e => setForm({...form, pointsCost: e.target.value})} placeholder="Biaya Poin" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                 <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                    <option value="discount_amount">Potongan Harga (Rp)</option>
                    <option value="free_product">Produk Gratis</option>
                 </select>
                 {form.type === 'discount_amount' && (
                     <input type="number" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} placeholder="Jumlah Potongan (Rp)" required className="w-full bg-slate-700 p-2 rounded-md"/>
                 )}
                  {form.type === 'free_product' && (
                     <select value={form.freeProductId} onChange={e => setForm({...form, freeProductId: e.target.value})} required className="w-full bg-slate-700 p-2 rounded-md">
                         <option value="" disabled>Pilih Produk</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 )}
                 <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
             </form>
        </Modal>
    )
}



const SettingsView: React.FC = () => {
    const { products, categories, rawMaterials, transactions, receiptSettings, inventorySettings, authSettings, users, expenses, suppliers, purchases, stockAdjustments, customers, membershipSettings, restoreData, bulkAddProducts, updateInventorySettings, updateAuthSettings, currentUser, session, endSession, sessionSettings, updateSessionSettings, showAlert, updateMembershipSettings, heldCarts } = useAppContext();
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const importProductsInputRef = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleBackup = () => {
        dataService.exportData({ products, categories, rawMaterials, transactions, receiptSettings, inventorySettings, users, authSettings, sessionSettings, expenses, suppliers, purchases, stockAdjustments, customers, membershipSettings, heldCarts });
        setMessage({ type: 'success', text: 'Data backup berhasil diunduh.' });
    };

    const handleRestoreChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            showAlert({
                type: 'confirm',
                title: 'Konfirmasi Pemulihan Data',
                message: 'Apakah Anda yakin ingin memulihkan data? Semua data saat ini akan ditimpa dan Anda mungkin perlu login kembali.',
                confirmVariant: 'danger',
                confirmText: 'Ya, Pulihkan',
                onConfirm: async () => {
                    try {
                        const data = await dataService.importData(file);
                        restoreData(data);
                        setMessage({ type: 'success', text: 'Data berhasil dipulihkan.' });
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
    
    const handleInventoryToggle = (key: keyof InventorySettings, value: boolean) => {
        const newSettings = { ...inventorySettings, [key]: value };
        if (key === 'enabled' && !value) {
            newSettings.trackIngredients = false;
        }
        updateInventorySettings(newSettings);
    }
    
    const handleAuthToggle = (enabled: boolean) => {
        updateAuthSettings({ ...authSettings, enabled });
    }

    const handleSessionToggle = (key: keyof SessionSettings, enabled: boolean) => {
         if (key === 'enabled' && !enabled && session) {
            showAlert({
                type: 'confirm',
                title: 'Nonaktifkan Sesi Penjualan?',
                message: 'Menonaktifkan fitur ini akan mengakhiri sesi yang sedang berjalan. Lanjutkan?',
                onConfirm: () => {
                    endSession();
                    updateSessionSettings({ ...sessionSettings, [key]: enabled });
                }
            });
        } else {
            updateSessionSettings({ ...sessionSettings, [key]: enabled });
        }
    }
    
    const handleExportAllReports = () => {
        const allData = { products, categories, rawMaterials, transactions, receiptSettings, inventorySettings, users, authSettings, sessionSettings, expenses, suppliers, purchases, stockAdjustments, customers, membershipSettings, heldCarts };
        dataService.exportAllReportsCSV(allData);
        setMessage({ type: 'success', text: 'Semua laporan berhasil diunduh.' });
    };


    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white">Pengaturan</h1>
            
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {message.text}
                </div>
            )}
            
            {currentUser?.role === 'admin' && (
                <>
                    <SettingsCard title="Keamanan & Akses Pengguna" description="Aktifkan fitur ini jika Anda memiliki staf dan ingin membatasi akses mereka hanya ke halaman kasir.">
                        <ToggleSwitch
                            checked={authSettings.enabled}
                            onChange={handleAuthToggle}
                            label={authSettings.enabled ? 'Multi-Pengguna & Login PIN Aktif' : 'Multi-Pengguna & Login PIN Nonaktif'}
                        />
                         <p className="text-xs text-slate-500 mt-2">
                            Jika diaktifkan, aplikasi akan meminta PIN saat dibuka.
                        </p>
                        {authSettings.enabled && (
                             <p className="text-xs text-slate-500 mt-2">
                                <strong>Lupa PIN Admin?</strong> Ketuk logo aplikasi 5 kali di halaman login untuk mereset PIN admin pertama ke `1111`.
                            </p>
                        )}
                    </SettingsCard>

                    {authSettings.enabled && (
                        <SettingsCard title="Manajemen Pengguna" description="Tambah, edit, atau hapus akun pengguna untuk staf Anda.">
                           <UserManagement />
                        </SettingsCard>
                    )}
                    
                    <SettingsCard title="Program Keanggotaan & Reward" description="Aktifkan sistem keanggotaan untuk memberikan poin dan reward kepada pelanggan setia.">
                        <ToggleSwitch
                            checked={membershipSettings.enabled}
                            onChange={(enabled) => updateMembershipSettings({ ...membershipSettings, enabled })}
                            label={membershipSettings.enabled ? 'Sistem Keanggotaan Aktif' : 'Sistem Keanggotaan Nonaktif'}
                        />
                        {membershipSettings.enabled && <MembershipManagement />}
                    </SettingsCard>

                    <SettingsCard title="Manajemen Kategori Produk" description="Kelola semua kategori produk di satu tempat. Kategori ini akan muncul sebagai saran saat menambahkan atau mengedit produk.">
                        <CategoryManagement />
                    </SettingsCard>

                    <SettingsCard title="Manajemen Sesi Penjualan & Kasir" description="Aktifkan fitur-fitur lanjutan untuk alur kerja kasir dan pelaporan harian.">
                        <ToggleSwitch
                            checked={sessionSettings.enabled}
                            onChange={(enabled) => handleSessionToggle('enabled', enabled)}
                            label={sessionSettings.enabled ? 'Sesi Penjualan Aktif' : 'Sesi Penjualan Nonaktif'}
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Jika diaktifkan, halaman Laporan akan meminta Anda untuk memulai dan mengakhiri sesi penjualan harian untuk rekon kas.
                        </p>
                        <div className="pt-4 border-t border-slate-700">
                             <ToggleSwitch
                                checked={sessionSettings.enableCartHolding ?? false}
                                onChange={(enabled) => handleSessionToggle('enableCartHolding', enabled)}
                                label="Aktifkan Fitur Simpan Pesanan (Tab)"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Memungkinkan kasir menyimpan beberapa pesanan yang sedang berjalan dan beralih di antara pesanan tersebut. Berguna untuk kafe atau restoran.
                            </p>
                        </div>
                    </SettingsCard>


                    <SettingsCard title="Manajemen Inventaris & Laba" description="Aktifkan fitur ini untuk melacak stok produk dan menghitung laba penjualan.">
                         <div className="space-y-4">
                            <ToggleSwitch
                                checked={inventorySettings.enabled}
                                onChange={(checked) => handleInventoryToggle('enabled', checked)}
                                label={inventorySettings.enabled ? 'Pelacakan Stok & Laba Aktif' : 'Pelacakan Stok & Laba Nonaktif'}
                            />
                            
                            {inventorySettings.enabled && (
                                <div className="pl-6 border-l-2 border-slate-700">
                                     <ToggleSwitch
                                        checked={inventorySettings.trackIngredients}
                                        onChange={(checked) => handleInventoryToggle('trackIngredients', checked)}
                                        label={inventorySettings.trackIngredients ? 'Pelacakan Bahan Baku & Resep Aktif' : 'Pelacakan Bahan Baku & Resep Nonaktif'}
                                     />
                                    <p className="text-xs text-slate-500 mt-2 ml-3">
                                        Jika diaktifkan, stok akan dikurangi dari bahan baku berdasarkan resep produk, bukan dari stok produk itu sendiri.
                                    </p>
                                </div>
                            )}
                         </div>
                    </SettingsCard>
                    
                    <SettingsCard title="Pengaturan Struk" description="Sesuaikan informasi yang ditampilkan pada struk pelanggan Anda.">
                        <ReceiptSettingsForm />
                    </SettingsCard>
                    
                    <SettingsCard title="Manajemen Data" description="Simpan semua data aplikasi (produk, transaksi, pengguna) ke file JSON, atau pulihkan dari file backup.">
                        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                            <Button onClick={handleBackup} variant="secondary">
                                <Icon name="download" className="w-5 h-5"/>
                                Backup Data (JSON)
                            </Button>
                            <Button onClick={() => restoreInputRef.current?.click()} variant="secondary">
                                <Icon name="upload" className="w-5 h-5"/>
                                Restore Data (JSON)
                            </Button>
                            <input type="file" ref={restoreInputRef} onChange={handleRestoreChange} className="hidden" accept=".json" />
                             <Button onClick={handleExportAllReports} variant="secondary">
                                <Icon name="download" className="w-5 h-5" />
                                Export Semua Laporan (CSV)
                            </Button>
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Manajemen Produk Massal" description="Export semua produk ke file CSV untuk diedit, atau import dari file CSV untuk menambah/memperbarui produk dengan cepat.">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button onClick={handleExportProducts} variant="secondary">
                                <Icon name="download" className="w-5 h-5"/>
                                Export Produk (CSV)
                            </Button>
                            <Button onClick={() => importProductsInputRef.current?.click()} variant="secondary">
                                <Icon name="upload" className="w-5 h-5"/>
                                Import Produk (CSV)
                            </Button>
                            <input type="file" ref={importProductsInputRef} onChange={handleImportProductsChange} className="hidden" accept=".csv" />
                        </div>
                    </SettingsCard>
                </>
            )}
             {currentUser?.role === 'staff' && (
                <div className="text-center text-slate-400 p-8 bg-slate-800 rounded-lg">
                    <p>Pengaturan hanya dapat diakses oleh Admin.</p>
                </div>
            )}
        </div>
    );
};

export default SettingsView;
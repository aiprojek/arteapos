
import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useProduct } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useCustomer } from '../context/CustomerContext';
import { useData } from '../context/DataContext';
import { useFinance } from '../context/FinanceContext';
import { useDiscount } from '../context/DiscountContext';
import { useSession } from '../context/SessionContext';
import { useUI } from '../context/UIContext';
import Button from '../components/Button';
import Modal from '../components/Modal'; 
import Icon from '../components/Icon';
import { dataService } from '../services/dataService';
import { supabaseService, SETUP_SQL_SCRIPT } from '../services/supabaseService'; 
import { dropboxService } from '../services/dropboxService';
import { decryptReport } from '../utils/crypto';
import type { AuditLog, Transaction as TransactionType, CartItem, DiscountDefinition, PointRule, Reward, AuthSettings, InventorySettings, ReceiptSettings, SessionSettings, MembershipSettings, PointRuleType } from '../types';
import VirtualizedTable from '../components/VirtualizedTable';
import { CURRENCY_FORMATTER } from '../constants';

// --- Sub-components ---

const SettingsCard: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="bg-slate-800 rounded-lg shadow-md border border-slate-700 overflow-hidden">
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

const AuditLogViewer: React.FC<{ logs: AuditLog[] }> = ({ logs }) => {
    const columns = [
        { label: 'Waktu', width: '1.5fr', render: (l: AuditLog) => <span className="text-slate-400 text-xs">{new Date(l.timestamp).toLocaleString()}</span> },
        { label: 'User', width: '1fr', render: (l: AuditLog) => <span className="text-white text-xs">{l.userName}</span> },
        { label: 'Aksi', width: '1fr', render: (l: AuditLog) => <span className="font-bold text-xs text-yellow-400">{l.action.replace(/_/g, ' ')}</span> },
        { label: 'Detail', width: '3fr', render: (l: AuditLog) => <span className="text-slate-300 text-xs">{l.details}</span> },
    ];

    return (
        <div className="h-96 bg-slate-900 rounded-lg border border-slate-700">
            {logs.length > 0 ? (
                <VirtualizedTable
                    data={logs}
                    columns={columns}
                    rowHeight={50}
                    minWidth={600}
                />
            ) : (
                <div className="flex items-center justify-center h-full text-slate-500">Belum ada log audit.</div>
            )}
        </div>
    );
};

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


// --- Form Modals ---
const DiscountFormModal: React.FC<{
    isOpen: boolean, onClose: () => void, onSave: (d: Omit<DiscountDefinition, 'id'> | DiscountDefinition) => void, discount: DiscountDefinition | null
}> = ({ isOpen, onClose, onSave, discount }) => {
    const [form, setForm] = useState({
        name: '', type: 'percentage' as 'percentage' | 'amount', value: '', 
        isActive: true, startDate: '', endDate: '', validStoreIds: ''
    });

    useEffect(() => {
        if (discount) {
            setForm({
                name: discount.name, type: discount.type, value: String(discount.value),
                isActive: discount.isActive, startDate: discount.startDate?.split('T')[0] || '',
                endDate: discount.endDate?.split('T')[0] || '',
                validStoreIds: (discount.validStoreIds || []).join(', ')
            });
        } else {
            setForm({ name: '', type: 'percentage', value: '', isActive: true, startDate: '', endDate: '', validStoreIds: '' });
        }
    }, [discount, isOpen]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            ...form,
            value: Number(form.value) || 0,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            validStoreIds: form.validStoreIds.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
        };
        if (discount) onSave({ ...data, id: discount.id });
        else onSave(data);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={discount ? "Edit Diskon" : "Tambah Diskon"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama Diskon (cth: Promo Gajian)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <div className="flex gap-2">
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                        <option value="percentage">Persen (%)</option>
                        <option value="amount">Jumlah (Rp)</option>
                    </select>
                    <input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="Nilai" required className="flex-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>
                <input type="text" value={form.validStoreIds} onChange={e => setForm({...form, validStoreIds: e.target.value})} placeholder="Berlaku di Cabang (ID, pisah koma)" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                 <p className="text-xs text-slate-500 -mt-2">Kosongkan agar berlaku di semua cabang.</p>
                <ToggleSwitch label="Aktifkan Diskon" checked={form.isActive} onChange={c => setForm({...form, isActive: c})} />
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};

const RewardFormModal: React.FC<{
    isOpen: boolean, onClose: () => void, onSave: (r: Omit<Reward, 'id'> | Reward) => void, reward: Reward | null
}> = ({ isOpen, onClose, onSave, reward }) => {
    const { products } = useProduct();
    const [form, setForm] = useState({
        name: '', type: 'free_product' as 'free_product' | 'discount_amount', pointsCost: '',
        discountValue: '', freeProductId: ''
    });

    useEffect(() => {
        if(reward) setForm({
            name: reward.name, type: reward.type, pointsCost: String(reward.pointsCost),
            discountValue: String(reward.discountValue || ''), freeProductId: reward.freeProductId || ''
        });
        else setForm({ name: '', type: 'free_product', pointsCost: '', discountValue: '', freeProductId: '' });
    }, [reward, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            ...form,
            pointsCost: Number(form.pointsCost) || 0,
            discountValue: form.type === 'discount_amount' ? Number(form.discountValue) : undefined,
            freeProductId: form.type === 'free_product' ? form.freeProductId : undefined
        };
        if (reward) onSave({ ...data, id: reward.id }); else onSave(data);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={reward ? "Edit Hadiah" : "Tambah Hadiah"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama Hadiah (cth: Gratis Es Teh)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="number" value={form.pointsCost} onChange={e => setForm({...form, pointsCost: e.target.value})} placeholder="Biaya Poin" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                    <option value="free_product">Produk Gratis</option>
                    <option value="discount_amount">Potongan Harga</option>
                </select>
                {form.type === 'free_product' ? (
                    <select value={form.freeProductId} onChange={e => setForm({...form, freeProductId: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                        <option value="">-- Pilih Produk --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                ) : (
                    <input type="number" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} placeholder="Jumlah Potongan (Rp)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                )}
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    )
}

const PointRuleFormModal: React.FC<{
    isOpen: boolean, onClose: () => void, onSave: (r: Omit<PointRule, 'id'> | PointRule) => void, rule: PointRule | null
}> = ({ isOpen, onClose, onSave, rule }) => {
    const { products, categories } = useProduct();
    const [form, setForm] = useState({
        type: 'spend' as PointRuleType,
        description: '',
        spendAmount: '',
        pointsEarned: '',
        targetId: '',
        pointsPerItem: '',
        validStoreIds: ''
    });

    useEffect(() => {
        if(rule) setForm({
            type: rule.type,
            description: rule.description,
            spendAmount: String(rule.spendAmount || ''),
            pointsEarned: String(rule.pointsEarned || ''),
            targetId: rule.targetId || '',
            pointsPerItem: String(rule.pointsPerItem || ''),
            validStoreIds: (rule.validStoreIds || []).join(', ')
        });
        else setForm({ type: 'spend', description: '', spendAmount: '', pointsEarned: '', targetId: '', pointsPerItem: '', validStoreIds: '' });
    }, [rule, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            ...form,
            spendAmount: form.type === 'spend' ? Number(form.spendAmount) : undefined,
            pointsEarned: form.type === 'spend' ? Number(form.pointsEarned) : undefined,
            targetId: (form.type === 'product' || form.type === 'category') ? form.targetId : undefined,
            pointsPerItem: (form.type === 'product' || form.type === 'category') ? Number(form.pointsPerItem) : undefined,
            validStoreIds: form.validStoreIds.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
        };
        if (rule) onSave({ ...data, id: rule.id }); else onSave(data);
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={rule ? "Edit Aturan Poin" : "Tambah Aturan Poin"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Deskripsi Aturan (cth: Poin per 10rb)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                    <option value="spend">Berdasarkan Total Belanja</option>
                    <option value="product">Berdasarkan Produk Spesifik</option>
                    <option value="category">Berdasarkan Kategori Produk</option>
                </select>
                
                {form.type === 'spend' && (
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={form.spendAmount} onChange={e => setForm({...form, spendAmount: e.target.value})} placeholder="Setiap (Rp)" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                        <input type="number" value={form.pointsEarned} onChange={e => setForm({...form, pointsEarned: e.target.value})} placeholder="Dapat Poin" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                    </div>
                )}
                
                {(form.type === 'product' || form.type === 'category') && (
                     <div className="grid grid-cols-2 gap-2">
                        {form.type === 'product' ? (
                             <select value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                                <option value="">-- Pilih Produk --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        ) : (
                             <select value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white">
                                <option value="">-- Pilih Kategori --</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                        <input type="number" value={form.pointsPerItem} onChange={e => setForm({...form, pointsPerItem: e.target.value})} placeholder="Poin per item" required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                    </div>
                )}
                
                <input type="text" value={form.validStoreIds} onChange={e => setForm({...form, validStoreIds: e.target.value})} placeholder="Berlaku di Cabang (ID, pisah koma)" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <p className="text-xs text-slate-500 -mt-2">Kosongkan agar berlaku di semua cabang.</p>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                </div>
            </form>
        </Modal>
    );
};


// --- Main Component ---

const SettingsView: React.FC = () => {
    // Original context data
    const { receiptSettings: originalReceiptSettings, updateReceiptSettings } = useSettings();
    const { inventorySettings: originalInventorySettings, updateInventorySettings, products } = useProduct();
    const { authSettings: originalAuthSettings, updateAuthSettings, users, addUser, deleteUser, resetUserPin } = useAuth();
    const { sessionSettings: originalSessionSettings, updateSessionSettings } = useSession();
    const { membershipSettings: originalMembershipSettings, updateMembershipSettings } = useCustomer();
    const { discountDefinitions, addDiscountDefinition, updateDiscountDefinition, deleteDiscountDefinition } = useDiscount();
    const { data, restoreData } = useData();
    const { importTransactions } = useFinance();
    const { showAlert } = useUI();
    
    // Local form state
    const [receiptForm, setReceiptForm] = useState<ReceiptSettings>(originalReceiptSettings);
    const [inventoryForm, setInventoryForm] = useState<InventorySettings>(originalInventorySettings);
    const [authForm, setAuthForm] = useState<AuthSettings>(originalAuthSettings);
    const [sessionForm, setSessionForm] = useState<SessionSettings>(originalSessionSettings);
    const [membershipForm, setMembershipForm] = useState<MembershipSettings>(originalMembershipSettings);
    const [isDirty, setIsDirty] = useState(false);

    const [activeTab, setActiveTab] = useState<'general' | 'features' | 'inventory' | 'auth' | 'data' | 'audit'>('general');
    
    // Cloud Settings State
    const [dropboxToken, setDropboxToken] = useState(localStorage.getItem('ARTEA_DBX_TOKEN') || '');
    const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('ARTEA_SB_URL') || '');
    const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('ARTEA_SB_KEY') || '');
    const [showSqlModal, setShowSqlModal] = useState(false);

    // Import State
    const [encryptedInput, setEncryptedInput] = useState('');
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);
    
    // Modals State
    const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<DiscountDefinition | null>(null);
    const [isRewardModalOpen, setRewardModalOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | null>(null);
    const [isPointRuleModalOpen, setPointRuleModalOpen] = useState(false);
    const [editingPointRule, setEditingPointRule] = useState<PointRule | null>(null);
    
    // Sync local state with context on initial load or external changes
    useEffect(() => setReceiptForm(originalReceiptSettings), [originalReceiptSettings]);
    useEffect(() => setInventoryForm(originalInventorySettings), [originalInventorySettings]);
    useEffect(() => setAuthForm(originalAuthSettings), [originalAuthSettings]);
    useEffect(() => setSessionForm(originalSessionSettings), [originalSessionSettings]);
    useEffect(() => setMembershipForm(originalMembershipSettings), [originalMembershipSettings]);

    // Check for changes to show/hide save button
    useEffect(() => {
        const hasChanges =
            JSON.stringify(receiptForm) !== JSON.stringify(originalReceiptSettings) ||
            JSON.stringify(inventoryForm) !== JSON.stringify(originalInventorySettings) ||
            JSON.stringify(authForm) !== JSON.stringify(originalAuthSettings) ||
            JSON.stringify(sessionForm) !== JSON.stringify(originalSessionSettings) ||
            JSON.stringify(membershipForm) !== JSON.stringify(originalMembershipSettings);
        setIsDirty(hasChanges);
    }, [receiptForm, inventoryForm, authForm, sessionForm, membershipForm, originalReceiptSettings, originalInventorySettings, originalAuthSettings, originalSessionSettings, originalMembershipSettings]);

    const handleSave = () => {
        updateReceiptSettings(receiptForm);
        updateInventorySettings(inventoryForm);
        updateAuthSettings(authForm);
        updateSessionSettings(sessionForm);
        updateMembershipSettings(membershipForm);
        showAlert({ type: 'alert', title: 'Tersimpan', message: 'Semua perubahan pengaturan berhasil disimpan.' });
        setIsDirty(false); // Hide button after save
    };

    const handleCancel = () => {
        setReceiptForm(originalReceiptSettings);
        setInventoryForm(originalInventorySettings);
        setAuthForm(originalAuthSettings);
        setSessionForm(originalSessionSettings);
        setMembershipForm(originalMembershipSettings);
        setIsDirty(false);
    };


    const saveCloudSettings = () => {
        localStorage.setItem('ARTEA_DBX_TOKEN', dropboxToken);
        localStorage.setItem('ARTEA_SB_URL', supabaseUrl);
        localStorage.setItem('ARTEA_SB_KEY', supabaseKey);
        showAlert({ type: 'alert', title: 'Tersimpan', message: 'Konfigurasi Cloud berhasil disimpan.' });
    };

    const copySqlToClipboard = () => {
        navigator.clipboard.writeText(SETUP_SQL_SCRIPT);
        showAlert({ type: 'alert', title: 'Disalin', message: 'Script SQL berhasil disalin ke clipboard.' });
    };

    // --- Restore & Import Logic ---

    const handleJSONRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        showAlert({
            type: 'confirm',
            title: 'Restore Database?',
            message: 'Tindakan ini akan menimpa SEMUA data saat ini dengan data dari file backup. Pastikan Anda sudah mem-backup data saat ini.',
            confirmVariant: 'danger',
            confirmText: 'Ya, Restore',
            onConfirm: async () => {
                try {
                    const backupData = await dataService.importData(file);
                    await restoreData(backupData);
                    showAlert({ type: 'alert', title: 'Berhasil', message: 'Data berhasil dipulihkan. Halaman akan dimuat ulang.' });
                } catch (e: any) {
                    showAlert({ type: 'alert', title: 'Gagal', message: e.message });
                } finally {
                    if (jsonInputRef.current) jsonInputRef.current.value = '';
                }
            }
        });
    };

    const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const txns = await dataService.importTransactionsCSV(file);
            importTransactions(txns);
            showAlert({ type: 'alert', title: 'Berhasil', message: `${txns.length} transaksi berhasil diimpor.` });
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: e.message });
        } finally {
            if (csvInputRef.current) csvInputRef.current.value = '';
        }
    };

    const handleEncryptedImport = () => {
        if (!encryptedInput.trim()) return;

        try {
            const decrypted = decryptReport(encryptedInput.trim());
            if (!decrypted || !Array.isArray(decrypted)) {
                throw new Error("Format kode tidak valid atau password enkripsi salah.");
            }

            // Convert decrypted simple objects to TransactionType
            const transactions: TransactionType[] = decrypted.map((d: any) => {
                const itemsStr = d.items || "";
                const items: CartItem[] = itemsStr.split(', ').map((s: string, idx: number) => ({
                    id: `imp-item-${Date.now()}-${idx}`,
                    cartItemId: `imp-cart-${Date.now()}-${idx}`,
                    name: s,
                    price: 0, 
                    quantity: 1,
                    category: ['Imported']
                }));

                const storeId = d.storeId || 'EXTERNAL';
                // KEY LOGIC: Prefix ID to prevent collision on owner's device
                const newId = d.id.startsWith(storeId) ? d.id : `${storeId}-${d.id}`;

                return {
                    id: newId,
                    createdAt: d.createdAt,
                    total: d.total,
                    amountPaid: d.amountPaid,
                    paymentStatus: d.paymentStatus,
                    items: items,
                    subtotal: d.total,
                    tax: 0,
                    serviceCharge: 0,
                    payments: [],
                    userId: 'import',
                    userName: d.userName || 'Imported',
                    orderType: 'dine-in',
                    storeId: storeId
                };
            });

            importTransactions(transactions);
            showAlert({ type: 'alert', title: 'Berhasil', message: `${transactions.length} transaksi dari laporan aman berhasil dimasukkan.` });
            setEncryptedInput('');

        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal Dekripsi', message: e.message });
        }
    };
    
    // CRUD Handlers for Modals
    const handleSaveDiscount = (d: Omit<DiscountDefinition, 'id'> | DiscountDefinition) => {
        if ('id' in d) updateDiscountDefinition(d); else addDiscountDefinition(d);
        setDiscountModalOpen(false);
    };

    const handleSaveReward = (r: Omit<Reward, 'id'> | Reward) => {
        const newRewards = 'id' in r
            ? membershipForm.rewards.map(oldR => oldR.id === r.id ? r : oldR)
            : [...membershipForm.rewards, { ...r, id: Date.now().toString() }];
        setMembershipForm({ ...membershipForm, rewards: newRewards });
    };
    
    const handleSavePointRule = (r: Omit<PointRule, 'id'> | PointRule) => {
        const newRules = 'id' in r
            ? membershipForm.pointRules.map(oldR => oldR.id === r.id ? r : oldR)
            : [...membershipForm.pointRules, { ...r, id: Date.now().toString() }];
        setMembershipForm({ ...membershipForm, pointRules: newRules });
    };

    const handleDeleteReward = (id: string) => {
        setMembershipForm({
            ...membershipForm,
            rewards: membershipForm.rewards.filter(r => r.id !== id)
        });
    }

    const handleDeletePointRule = (id: string) => {
        setMembershipForm({
            ...membershipForm,
            pointRules: membershipForm.pointRules.filter(r => r.id !== id)
        });
    }

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-3xl font-bold text-white">Pengaturan</h1>
            
            {/* Tabs */}
            <div className="flex flex-nowrap overflow-x-auto gap-2 border-b border-slate-700 pb-2">
                {[
                    { id: 'general', label: 'Toko & Struk', icon: 'settings' },
                    { id: 'features', label: 'Fitur Kasir', icon: 'star' },
                    { id: 'inventory', label: 'Inventaris', icon: 'boxes' },
                    { id: 'auth', label: 'Keamanan', icon: 'lock' },
                    { id: 'data', label: 'Data & Cloud', icon: 'database' },
                    { id: 'audit', label: 'Audit Log', icon: 'file-lock' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-[#347758] text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    >
                        <Icon name={tab.icon as any} className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeTab === 'general' && (
                <div className="space-y-6 animate-fade-in">
                    <SettingsCard title="Informasi Toko" description="Akan ditampilkan pada struk belanja.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nama Toko</label>
                                <input 
                                    type="text" 
                                    value={receiptForm.shopName} 
                                    onChange={(e) => setReceiptForm({...receiptForm, shopName: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">ID Toko (Store ID)</label>
                                <input 
                                    type="text" 
                                    value={receiptForm.storeId || ''} 
                                    onChange={(e) => setReceiptForm({...receiptForm, storeId: e.target.value.toUpperCase().replace(/\s/g, '')})}
                                    placeholder="CTH: JKT-01"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono uppercase"
                                />
                                <p className="text-xs text-slate-500 mt-1">Digunakan untuk sinkronisasi multi-cabang.</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1">Alamat</label>
                                <input 
                                    type="text" 
                                    value={receiptForm.address} 
                                    onChange={(e) => setReceiptForm({...receiptForm, address: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1">Pesan Footer Struk</label>
                                <input 
                                    type="text" 
                                    value={receiptForm.footerMessage} 
                                    onChange={(e) => setReceiptForm({...receiptForm, footerMessage: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                            <div className="md:col-span-2 pt-4 border-t border-slate-700">
                                <OrderTypeManager
                                    types={receiptForm.orderTypes || []}
                                    onChange={(newTypes) => setReceiptForm({ ...receiptForm, orderTypes: newTypes })}
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
                                    value={receiptForm.taxRate || 0} 
                                    onChange={(e) => setReceiptForm({...receiptForm, taxRate: parseFloat(e.target.value) || 0})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Service Charge %</label>
                                <input 
                                    type="number" 
                                    value={receiptForm.serviceChargeRate || 0} 
                                    onChange={(e) => setReceiptForm({...receiptForm, serviceChargeRate: parseFloat(e.target.value) || 0})}
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
                                checked={receiptForm.enableKitchenPrinter || false} 
                                onChange={(val) => setReceiptForm({...receiptForm, enableKitchenPrinter: val})} 
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Admin WhatsApp (62...)</label>
                                    <input 
                                        type="text" 
                                        value={receiptForm.adminWhatsapp || ''} 
                                        onChange={(e) => setReceiptForm({...receiptForm, adminWhatsapp: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="62812..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Admin Telegram (Username)</label>
                                    <input 
                                        type="text" 
                                        value={receiptForm.adminTelegram || ''} 
                                        onChange={(e) => setReceiptForm({...receiptForm, adminTelegram: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="@username"
                                    />
                                </div>
                            </div>
                        </div>
                    </SettingsCard>
                </div>
            )}
            
            {activeTab === 'features' && (
                <div className="space-y-6 animate-fade-in">
                    <SettingsCard title="Manajemen Sesi" description="Aktifkan mode Shift untuk kasir dan fitur simpan pesanan.">
                        <ToggleSwitch
                            label="Aktifkan Sesi Penjualan (Shift)"
                            description="Kasir harus memulai sesi dan memasukkan modal awal sebelum berjualan."
                            checked={sessionForm.enabled}
                            onChange={(val) => setSessionForm({ ...sessionForm, enabled: val })}
                        />
                        <ToggleSwitch
                            label="Aktifkan Fitur Simpan Pesanan (Open Bill)"
                            description="Memungkinkan kasir menyimpan beberapa keranjang belanja sekaligus."
                            checked={sessionForm.enableCartHolding || false}
                            onChange={(val) => setSessionForm({ ...sessionForm, enableCartHolding: val })}
                        />
                    </SettingsCard>
                    <SettingsCard title="Manajemen Diskon & Promo" description="Buat dan kelola diskon yang bisa diterapkan di kasir.">
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                           {discountDefinitions.map(d => (
                               <div key={d.id} className="flex justify-between items-center bg-slate-900 p-2 rounded">
                                   <div>
                                       <span className={`font-bold mr-2 ${d.isActive ? 'text-white' : 'text-slate-500 line-through'}`}>{d.name}</span>
                                       <span className={`text-xs px-1.5 py-0.5 rounded ${d.type === 'percentage' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                                           {d.type === 'percentage' ? `${d.value}%` : CURRENCY_FORMATTER.format(d.value)}
                                       </span>
                                        {d.validStoreIds && d.validStoreIds.length > 0 && <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">{d.validStoreIds.join(', ')}</span>}
                                   </div>
                                   <div className="flex gap-2">
                                       <Button type="button" size="sm" variant="secondary" onClick={() => {setEditingDiscount(d); setDiscountModalOpen(true);}}>Edit</Button>
                                       <Button type="button" size="sm" variant="danger" onClick={() => deleteDiscountDefinition(d.id)}>Hapus</Button>
                                   </div>
                               </div>
                           ))}
                        </div>
                        <div className="pt-2">
                            <Button type="button" size="sm" onClick={() => {setEditingDiscount(null); setDiscountModalOpen(true);}}>+ Tambah Diskon</Button>
                        </div>
                    </SettingsCard>
                    <SettingsCard title="Program Loyalitas Pelanggan" description="Atur sistem poin dan hadiah untuk pelanggan setia.">
                        <ToggleSwitch 
                            label="Aktifkan Membership & Poin" 
                            checked={membershipForm.enabled} 
                            onChange={(val) => setMembershipForm({...membershipForm, enabled: val})} 
                        />
                        {membershipForm.enabled && (
                            <div className="space-y-4 pt-4 border-t border-slate-700">
                                <div>
                                    <h4 className="font-semibold text-white mb-2">Hadiah (Rewards)</h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {membershipForm.rewards.map(r => (
                                            <div key={r.id} className="flex justify-between items-center bg-slate-900 p-2 rounded">
                                                <div>
                                                    <p className="font-semibold text-white">{r.name}</p>
                                                    <p className="text-xs text-yellow-400">{r.pointsCost} Poin</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingReward(r); setRewardModalOpen(true); }}>Edit</Button>
                                                    <Button type="button" size="sm" variant="danger" onClick={() => handleDeleteReward(r.id)}>Hapus</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" size="sm" onClick={() => { setEditingReward(null); setRewardModalOpen(true); }} className="mt-2">+ Tambah Hadiah</Button>
                                </div>
                                <div className="pt-4 border-t border-slate-700">
                                    <h4 className="font-semibold text-white mb-2">Aturan Poin</h4>
                                     <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {membershipForm.pointRules.map(r => (
                                            <div key={r.id} className="flex justify-between items-center bg-slate-900 p-2 rounded">
                                                <p className="font-semibold text-white text-sm">{r.description}</p>
                                                <div className="flex gap-2">
                                                    <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingPointRule(r); setPointRuleModalOpen(true); }}>Edit</Button>
                                                    <Button type="button" size="sm" variant="danger" onClick={() => handleDeletePointRule(r.id)}>Hapus</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" size="sm" onClick={() => { setEditingPointRule(null); setPointRuleModalOpen(true); }} className="mt-2">+ Tambah Aturan Poin</Button>
                                </div>
                            </div>
                        )}
                    </SettingsCard>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="space-y-6 animate-fade-in">
                    <SettingsCard title="Manajemen Inventaris">
                        <div className="space-y-4">
                            <ToggleSwitch 
                                label="Aktifkan Pelacakan Stok" 
                                checked={inventoryForm.enabled} 
                                onChange={(val) => setInventoryForm({...inventoryForm, enabled: val})} 
                            />
                            {inventoryForm.enabled && (
                                <ToggleSwitch 
                                    label="Mode Resep & Bahan Baku (Advanced)" 
                                    description="Stok produk berkurang berdasarkan bahan baku (Resep). Jika dimatikan, stok produk berkurang langsung."
                                    checked={inventoryForm.trackIngredients} 
                                    onChange={(val) => setInventoryForm({...inventoryForm, trackIngredients: val})} 
                                />
                            )}
                        </div>
                    </SettingsCard>
                </div>
            )}

            {activeTab === 'auth' && (
                <div className="space-y-6 animate-fade-in">
                    <SettingsCard title="Akses & Keamanan">
                        <ToggleSwitch 
                            label="Aktifkan Login Multi-User & PIN" 
                            checked={authForm.enabled} 
                            onChange={(val) => setAuthForm({...authForm, enabled: val})} 
                        />
                        {authForm.enabled && (
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <h4 className="text-md font-semibold text-white mb-2">Daftar Pengguna</h4>
                                <div className="space-y-2">
                                    {users.map(u => (
                                        <div key={u.id} className="flex justify-between items-center bg-slate-900 p-2 rounded">
                                            <div>
                                                <span className="font-bold text-white">{u.name}</span>
                                                <span className="text-xs text-slate-400 ml-2 uppercase">({u.role})</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button type="button" size="sm" variant="secondary" onClick={async () => {
                                                    await resetUserPin(u.id);
                                                    showAlert({type:'alert', title:'Reset PIN', message: `PIN untuk ${u.name} direset menjadi 0000`});
                                                }}>Reset PIN</Button>
                                                {u.role !== 'admin' && (
                                                    <Button type="button" size="sm" variant="danger" onClick={() => deleteUser(u.id)}>Hapus</Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-2 mt-2">
                                        <Button type="button" size="sm" onClick={() => {
                                            const name = prompt("Nama User Baru:");
                                            if(name) addUser({name, pin: '0000', role: 'staff'});
                                        }}>+ Tambah Staf</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </SettingsCard>
                </div>
            )}

            {activeTab === 'data' && (
                <div className="space-y-6 animate-fade-in">
                    <SettingsCard title="Backup & Restore Lokal" description="Unduh file database (.json) ke perangkat ini atau pulihkan data dari file cadangan.">
                        <div className="flex flex-wrap gap-3">
                            <Button onClick={dataService.exportData} variant="secondary">
                                <Icon name="download" className="w-4 h-4"/> Backup (JSON)
                            </Button>
                            
                            <Button onClick={() => jsonInputRef.current?.click()} variant="danger" className="border border-red-700 bg-red-900/30 text-red-100 hover:bg-red-800">
                                <Icon name="upload" className="w-4 h-4"/> Restore (JSON)
                            </Button>
                            <input 
                                type="file" 
                                ref={jsonInputRef} 
                                onChange={handleJSONRestore} 
                                className="hidden" 
                                accept=".json" 
                            />
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Laporan & Transaksi Lama" description="Impor data penjualan dari perangkat lain atau dari laporan WhatsApp yang aman.">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-300 font-bold">Import File CSV</label>
                                <p className="text-xs text-slate-400">Gabungkan riwayat transaksi dari file CSV (hasil export perangkat lain).</p>
                                <Button onClick={() => csvInputRef.current?.click()} variant="secondary" className="w-fit">
                                    <Icon name="upload" className="w-4 h-4"/> Pilih File CSV
                                </Button>
                                <input type="file" ref={csvInputRef} onChange={handleCSVImport} className="hidden" accept=".csv" />
                            </div>

                            <div className="border-t border-slate-700 my-2 pt-2"></div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-slate-300 font-bold">Paste Teks (Encrypted)</label>
                                <p className="text-xs text-slate-400">Salin kode acak dari pesan WhatsApp laporan "Anti-Edit" kasir Anda, lalu tempel di sini untuk memasukkannya ke database.</p>
                                <textarea 
                                    value={encryptedInput}
                                    onChange={(e) => setEncryptedInput(e.target.value)}
                                    placeholder="Tempel kode ARTEA_ENC::... di sini"
                                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs text-slate-300 font-mono"
                                />
                                <Button onClick={handleEncryptedImport} disabled={!encryptedInput} className="w-fit">
                                    <Icon name="lock" className="w-4 h-4"/> Dekripsi & Simpan
                                </Button>
                            </div>
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Koneksi Cloud Hybrid (Disarankan)" description="Anda dapat mengisi kedua layanan ini sekaligus untuk redundansi maksimal.">
                        <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r mb-4">
                            <div className="flex items-start gap-3">
                                <Icon name="info-circle" className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-blue-300 text-sm">Mode Hybrid (Supabase + Dropbox)</h4>
                                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                        Sistem akan otomatis mengirim data ke <strong>keduanya</strong> saat sinkronisasi:
                                    </p>
                                    <ul className="list-disc pl-4 text-xs text-slate-400 mt-2 space-y-1">
                                        <li><strong>Supabase:</strong> Untuk Database Real-time (Pantau omzet & stok live di Dashboard).</li>
                                        <li><strong>Dropbox:</strong> Untuk Arsip File (Menyimpan file backup JSON & laporan harian CSV).</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-slate-300">Supabase URL (Real-time DB)</label>
                                    <button onClick={() => setShowSqlModal(true)} className="text-xs text-sky-400 hover:underline flex items-center gap-1">
                                        <Icon name="question" className="w-3 h-3"/> Panduan & SQL Script
                                    </button>
                                </div>
                                <input 
                                    type="text" 
                                    value={supabaseUrl} 
                                    onChange={(e) => setSupabaseUrl(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                    placeholder="https://xyz.supabase.co"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Supabase Anon Key</label>
                                <input 
                                    type="password" 
                                    value={supabaseKey} 
                                    onChange={(e) => setSupabaseKey(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                            <div className="border-t border-slate-700 my-4 pt-4">
                                <label className="block text-sm font-medium text-slate-300 mb-1">Dropbox Access Token (File Backup)</label>
                                <input 
                                    type="password" 
                                    value={dropboxToken} 
                                    onChange={(e) => setDropboxToken(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Belum punya token? <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Buat App di Dropbox Developers</a>
                                </p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button onClick={saveCloudSettings}>Simpan Konfigurasi Cloud</Button>
                            </div>
                        </div>
                    </SettingsCard>
                </div>
            )}

            {activeTab === 'audit' && (
                <div className="animate-fade-in space-y-6">
                    <SettingsCard title="Audit Log (Riwayat Aktivitas Sensitif)" description="Memantau aktivitas penting seperti penghapusan produk, perubahan harga, refund, dan stock opname untuk keamanan internal.">
                        
                        {/* INFO BOX: Strategi Offline */}
                        <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r mb-4">
                            <h4 className="font-bold text-blue-300 text-sm mb-2 flex items-center gap-2">
                                <Icon name="info-circle" className="w-4 h-4"/> Strategi Penggunaan Offline (Black Box)
                            </h4>
                            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                                Data ini tersimpan <strong>LOKAL</strong> di perangkat ini (seperti rekaman CCTV di Harddisk). Meskipun tanpa internet, Owner dapat memanfaatkannya untuk:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                                    <li><strong>Cek Harian (Spot Check):</strong> Periksa log ini setiap tutup toko untuk melihat aktivitas mencurigakan hari itu.</li>
                                    <li><strong>Investigasi Selisih Kas:</strong> Jika uang kurang, cari log <em>"REFUND_TRANSACTION"</em>. (Modus: Struk dicetak -> Uang diterima -> Transaksi di-refund di sistem).</li>
                                </ul>
                                <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                                    <li><strong>Kontrol Stok (Anti-Tuyul):</strong> Pantau log <em>"STOCK_OPNAME"</em>. Pastikan perubahan stok manual hanya dilakukan oleh orang yang berwenang.</li>
                                    <li><strong>Efek Psikologis:</strong> Beritahu staf bahwa sistem merekam setiap penghapusan & perubahan harga ("Terekam & Tidak Bisa Dihapus").</li>
                                </ul>
                            </div>
                        </div>

                        <AuditLogViewer logs={data.auditLogs || []} />
                    </SettingsCard>
                </div>
            )}
            
            {/* Floating Save/Cancel Bar */}
            {isDirty && (
                <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 p-4 z-50 animate-fade-in">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <p className="text-yellow-400 text-sm">Anda memiliki perubahan yang belum disimpan.</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={handleCancel}>Batal</Button>
                            <Button variant="primary" onClick={handleSave}>Simpan Perubahan</Button>
                        </div>
                    </div>
                </div>
            )}


            {/* Modals */}
            <DiscountFormModal 
                isOpen={isDiscountModalOpen} 
                onClose={() => setDiscountModalOpen(false)} 
                onSave={handleSaveDiscount}
                discount={editingDiscount}
            />
            
            <RewardFormModal
                isOpen={isRewardModalOpen}
                onClose={() => setRewardModalOpen(false)}
                onSave={handleSaveReward}
                reward={editingReward}
            />
            
            <PointRuleFormModal
                isOpen={isPointRuleModalOpen}
                onClose={() => setPointRuleModalOpen(false)}
                onSave={handleSavePointRule}
                rule={editingPointRule}
            />

            <Modal isOpen={showSqlModal} onClose={() => setShowSqlModal(false)} title="Panduan Setup Supabase">
                <div className="space-y-4">
                    <p className="text-sm text-slate-300">
                        Untuk menggunakan fitur database real-time, Anda perlu membuat tabel di Project Supabase Anda.
                    </p>
                    <ol className="list-decimal pl-5 text-sm text-slate-300 space-y-1">
                        <li>Buka <a href="https://supabase.com/dashboard" target="_blank" className="text-sky-400 underline">Supabase Dashboard</a>.</li>
                        <li>Masuk ke project Anda, lalu pilih menu <strong>SQL Editor</strong>.</li>
                        <li>Buat Query baru, lalu salin dan tempel script di bawah ini.</li>
                        <li>Klik <strong>Run</strong>. Tabel akan dibuat otomatis.</li>
                    </ol>
                    
                    <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg max-h-60 overflow-y-auto">
                        <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap">{SETUP_SQL_SCRIPT}</pre>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setShowSqlModal(false)}>Tutup</Button>
                        <Button onClick={copySqlToClipboard}>Salin Script SQL</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SettingsView;

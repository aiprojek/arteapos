
import React, { useState } from 'react';
import type { AuthSettings, User } from '../../types';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useSettings } from '../../context/SettingsContext';
import { generateRecoveryCode, hashRecoveryCode } from '../../utils/recoveryCode';

interface AuthTabProps {
    form: AuthSettings;
    onChange: (settings: AuthSettings) => void;
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

const AuthTab: React.FC<AuthTabProps> = ({ form, onChange }) => {
    const { users, addUser, updateUser, deleteUser, createPinResetTicket } = useAuth();
    const { receiptSettings } = useSettings();
    const { showAlert } = useUI();
    
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState({ name: '', pin: '', role: 'staff' as User['role'], assignedBranch: 'all' });
    const [isTicketModalOpen, setTicketModalOpen] = useState(false);
    const [ticketTargetUser, setTicketTargetUser] = useState<User | null>(null);
    const [ticketTtl, setTicketTtl] = useState(10);
    const [generatedTicket, setGeneratedTicket] = useState('');
    const [generatedTicketExpiry, setGeneratedTicketExpiry] = useState('');
    const [isRecoveryCodeModalOpen, setRecoveryCodeModalOpen] = useState(false);
    const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState('');

    // Only show branch selection if branches are actually defined in General Settings
    const branches = receiptSettings.branches || [];
    const showBranchSelection = branches.length > 0;

    const handleSaveUser = () => {
        if (!userForm.name || !userForm.pin) return;
        
        const payload = {
            name: userForm.name,
            pin: userForm.pin,
            role: userForm.role,
            assignedBranch: userForm.assignedBranch
        };

        if (editingUser) {
            updateUser({ ...editingUser, ...payload });
        } else {
            addUser(payload);
        }
        
        setUserModalOpen(false);
        setEditingUser(null);
        setUserForm({ name: '', pin: '', role: 'staff', assignedBranch: 'all' });
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setUserForm({ 
            name: user.name, 
            pin: user.pin, 
            role: user.role, 
            assignedBranch: user.assignedBranch || 'all' 
        });
        setUserModalOpen(true);
    };

    const handleDeleteUser = (userId: string) => {
        showAlert({
            type: 'confirm',
            title: 'Hapus Pengguna?',
            message: 'User ini tidak akan bisa login lagi.',
            confirmVariant: 'danger',
            confirmText: 'Hapus',
            onConfirm: () => deleteUser(userId)
        });
    };

    const handleOpenTicketModal = (user: User) => {
        setTicketTargetUser(user);
        setTicketTtl(10);
        setGeneratedTicket('');
        setGeneratedTicketExpiry('');
        setTicketModalOpen(true);
    };

    const handleGenerateTicket = async () => {
        if (!ticketTargetUser) return;
        try {
            const ticket = await createPinResetTicket(ticketTargetUser.id, ticketTtl);
            if (!ticket) throw new Error('Gagal membuat tiket.');
            setGeneratedTicket(ticket.code);
            setGeneratedTicketExpiry(ticket.expiresAt);
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: e.message || 'Tidak bisa membuat tiket reset.' });
        }
    };

    const copyTicket = async () => {
        if (!generatedTicket) return;
        try {
            await navigator.clipboard.writeText(generatedTicket);
            showAlert({ type: 'alert', title: 'Disalin', message: 'Kode tiket berhasil disalin.' });
        } catch (e) {
            showAlert({ type: 'alert', title: 'Gagal', message: 'Tidak bisa menyalin kode tiket.' });
        }
    };

    const handleGenerateRecoveryCode = async () => {
        const code = generateRecoveryCode();
        const codeHash = await hashRecoveryCode(code);
        onChange({
            ...form,
            recoveryCodeHash: codeHash,
            recoveryCodeGeneratedAt: new Date().toISOString()
        });
        setGeneratedRecoveryCode(code);
        setRecoveryCodeModalOpen(true);
    };

    return (
        <div className="animate-fade-in">
            <SettingsCard title="Keamanan & Akses" description="Lindungi kasir dengan PIN.">
                <ToggleSwitch 
                    label="Multi-Pengguna & Login PIN" 
                    description="Wajibkan login menggunakan PIN saat membuka aplikasi."
                    checked={form.enabled} 
                    onChange={(val) => onChange({...form, enabled: val})} 
                />
            </SettingsCard>

            <SettingsCard title="Pertanyaan Keamanan (Security Challenge)" description="Digunakan untuk memulihkan akses darurat jika Admin lupa PIN.">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Pertanyaan Rahasia</label>
                        <input 
                            type="text" 
                            placeholder="cth: Siapa nama hewan peliharaan pertama?" 
                            value={form.securityQuestion || ''}
                            onChange={(e) => onChange({...form, securityQuestion: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Jawaban Rahasia</label>
                        <input 
                            type="password" 
                            placeholder="Jawaban Anda..." 
                            value={form.securityAnswer || ''}
                            onChange={(e) => onChange({...form, securityAnswer: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                        />
                        <p className="text-xs text-slate-500 mt-1">Jawaban ini tidak akan ditampilkan lagi. Harap diingat baik-baik.</p>
                    </div>
                    <div className="border-t border-slate-700 pt-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-sm text-slate-300 font-medium">Recovery Code (Single Admin)</p>
                            <Button size="sm" onClick={handleGenerateRecoveryCode}>
                                {form.recoveryCodeHash ? 'Regenerate' : 'Generate'}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Kode ini dipakai saat admin tunggal lupa PIN. Kode bersifat sekali pakai.
                        </p>
                        {form.recoveryCodeGeneratedAt && (
                            <p className="text-xs text-slate-400 mt-1">
                                Terakhir dibuat: {new Date(form.recoveryCodeGeneratedAt).toLocaleString('id-ID')}
                            </p>
                        )}
                    </div>
                </div>
            </SettingsCard>

            {form.enabled && (
                <SettingsCard title="Daftar Pengguna" description="Kelola siapa saja yang bisa mengakses aplikasi.">
                    <div className="space-y-3">
                        {users.map(user => (
                            <div key={user.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                                <div>
                                    <div className="font-semibold text-white flex items-center gap-2">
                                        {user.name}
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : user.role === 'manager' ? 'bg-yellow-500/20 text-yellow-300' : user.role === 'viewer' ? 'bg-green-500/20 text-green-300' : 'bg-sky-500/20 text-sky-300'}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Akses: <span className="text-slate-300 font-mono">
                                            {(!user.assignedBranch || user.assignedBranch === 'all') ? 'Semua (Pusat)' : user.assignedBranch}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenTicketModal(user)} className="text-xs bg-amber-700 hover:bg-amber-600 px-2 py-1 rounded text-white" title="Buat tiket reset PIN sekali pakai">
                                        Buat Tiket Reset
                                    </button>
                                    <button onClick={() => handleEditUser(user)} className="p-1 text-sky-400 hover:bg-slate-700 rounded">
                                        <Icon name="edit" className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="p-1 text-red-400 hover:bg-slate-700 rounded" disabled={users.length <= 1}>
                                        <Icon name="trash" className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        <Button onClick={() => { setEditingUser(null); setUserForm({name:'', pin:'', role:'staff', assignedBranch: 'all'}); setUserModalOpen(true); }} className="w-full">
                            <Icon name="plus" className="w-4 h-4"/> Tambah Pengguna
                        </Button>
                    </div>
                </SettingsCard>
            )}

            <Modal isOpen={isUserModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Nama</label>
                        <input 
                            type="text" 
                            value={userForm.name} 
                            onChange={e => setUserForm({...userForm, name: e.target.value})} 
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Peran (Role)</label>
                        <select 
                            value={userForm.role}
                            onChange={e => setUserForm({...userForm, role: e.target.value as any})}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                        >
                            <option value="staff">Staf (Kasir & Stok)</option>
                            <option value="viewer">Viewer (Laporan & Dashboard Saja)</option>
                            <option value="manager">Manager (Menu & Laporan)</option>
                            <option value="admin">Admin (Akses Penuh)</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {userForm.role === 'viewer' ? 'User ini HANYA bisa melihat Dashboard dan Laporan. Tidak bisa input penjualan.' : ''}
                        </p>
                    </div>
                    
                    {/* Only show Branch Selection if branches exist */}
                    {showBranchSelection && (
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Penugasan Cabang</label>
                            <select 
                                value={userForm.assignedBranch}
                                onChange={e => setUserForm({...userForm, assignedBranch: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                            >
                                <option value="all">Semua Cabang / Pusat</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Staf hanya bisa login jika perangkat menggunakan Store ID yang sesuai.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">PIN (4 Digit)</label>
                        <input 
                            type="text" 
                            maxLength={4}
                            value={userForm.pin} 
                            onChange={e => setUserForm({...userForm, pin: e.target.value})} 
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-center tracking-widest"
                            placeholder="****"
                        />
                    </div>
                    <Button onClick={handleSaveUser} disabled={!userForm.name || !userForm.pin} className="w-full">Simpan</Button>
                </div>
            </Modal>

            <Modal isOpen={isTicketModalOpen} onClose={() => setTicketModalOpen(false)} title="Generate Tiket Reset PIN">
                <div className="space-y-4">
                    <div className="text-sm text-slate-300 bg-slate-900 border border-slate-700 rounded p-3">
                        Target User: <span className="font-bold text-white">{ticketTargetUser?.name || '-'}</span>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Masa Berlaku (menit)</label>
                        <input
                            type="number"
                            min={5}
                            max={30}
                            value={ticketTtl}
                            onChange={(e) => setTicketTtl(Math.max(5, Math.min(30, parseInt(e.target.value || '10', 10))))}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                        />
                        <p className="text-xs text-slate-500 mt-1">Range aman: 5-30 menit.</p>
                    </div>

                    <Button onClick={handleGenerateTicket} className="w-full">Generate Tiket</Button>

                    {generatedTicket && (
                        <div className="space-y-2 bg-green-900/20 border border-green-800 rounded p-3">
                            <p className="text-xs text-green-300">Bagikan kode ini ke staf terkait. Kode hanya bisa dipakai sekali.</p>
                            <textarea
                                readOnly
                                value={generatedTicket}
                                className="w-full h-24 bg-slate-950 border border-slate-700 rounded p-2 text-green-300 font-mono text-xs"
                            />
                            <p className="text-xs text-slate-400">Expired: {new Date(generatedTicketExpiry).toLocaleString('id-ID')}</p>
                            <Button onClick={copyTicket} variant="secondary" className="w-full">Salin Kode</Button>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal isOpen={isRecoveryCodeModalOpen} onClose={() => setRecoveryCodeModalOpen(false)} title="Recovery Code Baru">
                <div className="space-y-4">
                    <div className="bg-red-900/20 border border-red-700 rounded p-3 text-xs text-red-200">
                        Simpan kode ini sekarang. Demi keamanan, kode tidak bisa ditampilkan lagi setelah modal ditutup.
                    </div>
                    <textarea
                        readOnly
                        value={generatedRecoveryCode}
                        className="w-full h-20 bg-slate-950 border border-slate-700 rounded p-2 text-green-300 font-mono text-sm text-center"
                    />
                    <Button onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(generatedRecoveryCode);
                            showAlert({ type: 'alert', title: 'Disalin', message: 'Recovery code disalin.' });
                        } catch {
                            showAlert({ type: 'alert', title: 'Gagal', message: 'Tidak bisa menyalin recovery code.' });
                        }
                    }} variant="secondary" className="w-full">
                        Salin Recovery Code
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default AuthTab;

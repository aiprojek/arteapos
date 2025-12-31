
import React, { useState } from 'react';
import type { SessionSettings, MembershipSettings, DiscountDefinition, PointRule } from '../../types';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import { useDiscount } from '../../context/DiscountContext';
import { CURRENCY_FORMATTER } from '../../constants';

interface FeaturesTabProps {
    sessionForm: SessionSettings;
    onSessionChange: (s: SessionSettings) => void;
    membershipForm: MembershipSettings;
    onMembershipChange: (s: MembershipSettings) => void;
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

const FeaturesTab: React.FC<FeaturesTabProps> = ({ sessionForm, onSessionChange, membershipForm, onMembershipChange }) => {
    const { discountDefinitions, addDiscountDefinition, deleteDiscountDefinition } = useDiscount();
    
    // Discount Modal State
    const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
    const [newDiscount, setNewDiscount] = useState({ name: '', type: 'percentage' as 'percentage' | 'amount', value: '' });

    // Point Rule State
    const [isRuleModalOpen, setRuleModalOpen] = useState(false);
    const [newRule, setNewRule] = useState({ 
        spendAmount: '', 
        pointsEarned: '',
        type: 'spend' as 'spend'
    });

    const handleAddDiscount = () => {
        const val = parseFloat(newDiscount.value);
        if (newDiscount.name && val > 0) {
            addDiscountDefinition({
                name: newDiscount.name,
                type: newDiscount.type,
                value: val,
                isActive: true
            });
            setDiscountModalOpen(false);
            setNewDiscount({ name: '', type: 'percentage', value: '' });
        }
    };

    const handleAddPointRule = () => {
        const spend = parseFloat(newRule.spendAmount);
        const points = parseFloat(newRule.pointsEarned);
        
        if (spend > 0 && points > 0) {
            const rule: PointRule = {
                id: Date.now().toString(),
                type: 'spend',
                description: `Dapat ${points} poin setiap belanja ${CURRENCY_FORMATTER.format(spend)}`,
                spendAmount: spend,
                pointsEarned: points
            };
            
            onMembershipChange({
                ...membershipForm,
                pointRules: [...(membershipForm.pointRules || []), rule]
            });
            setRuleModalOpen(false);
            setNewRule({ spendAmount: '', pointsEarned: '', type: 'spend' });
        }
    };

    const handleDeletePointRule = (id: string) => {
        onMembershipChange({
            ...membershipForm,
            pointRules: membershipForm.pointRules.filter(r => r.id !== id)
        });
    };

    return (
        <div className="animate-fade-in">
            <SettingsCard title="Manajemen Sesi Penjualan" description="Mengelola shift kasir dan pencatatan uang fisik.">
                <ToggleSwitch 
                    label="Wajibkan Sesi (Shift)" 
                    description="Kasir harus memasukkan modal awal saat mulai dan menghitung uang saat tutup toko."
                    checked={sessionForm.enabled} 
                    onChange={(val) => onSessionChange({...sessionForm, enabled: val})} 
                />
                <ToggleSwitch 
                    label="Fitur Simpan Pesanan (Open Bill)" 
                    description="Memungkinkan menyimpan pesanan sementara (cth: sistem meja di kafe)."
                    checked={sessionForm.enableCartHolding || false} 
                    onChange={(val) => onSessionChange({...sessionForm, enableCartHolding: val})} 
                />
            </SettingsCard>

            <SettingsCard title="Daftar Diskon & Promo" description="Diskon prasetel yang bisa dipilih kasir.">
                <div className="space-y-2">
                    {discountDefinitions.map(d => (
                        <div key={d.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                            <div>
                                <span className="font-semibold text-white">{d.name}</span>
                                <span className="text-sm text-slate-400 ml-2">
                                    ({d.type === 'percentage' ? `${d.value}%` : CURRENCY_FORMATTER.format(d.value)})
                                </span>
                            </div>
                            <button onClick={() => deleteDiscountDefinition(d.id)} className="text-red-400 hover:text-white">
                                <Icon name="trash" className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                    <Button onClick={() => setDiscountModalOpen(true)} variant="secondary" size="sm" className="w-full">
                        <Icon name="plus" className="w-4 h-4"/> Tambah Diskon Baru
                    </Button>
                </div>
            </SettingsCard>

            <SettingsCard title="Program Loyalitas Pelanggan" description="Berikan poin kepada pelanggan terdaftar.">
                <ToggleSwitch 
                    label="Aktifkan Membership & Poin" 
                    checked={membershipForm.enabled} 
                    onChange={(val) => onMembershipChange({...membershipForm, enabled: val})} 
                />
                
                {membershipForm.enabled && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <h4 className="font-bold text-white text-sm mb-2">Aturan Perolehan Poin</h4>
                        <div className="space-y-2 mb-3">
                            {(membershipForm.pointRules || []).map(rule => (
                                <div key={rule.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                                    <span className="text-sm text-slate-300">{rule.description}</span>
                                    <button onClick={() => handleDeletePointRule(rule.id)} className="text-red-400 hover:text-white">
                                        <Icon name="trash" className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <Button onClick={() => setRuleModalOpen(true)} variant="secondary" size="sm" className="w-full">
                            <Icon name="plus" className="w-4 h-4"/> Tambah Aturan Poin
                        </Button>
                    </div>
                )}
            </SettingsCard>

            {/* Add Discount Modal */}
            <Modal isOpen={isDiscountModalOpen} onClose={() => setDiscountModalOpen(false)} title="Tambah Diskon">
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Nama Promo (cth: Diskon Pelajar)" 
                        value={newDiscount.name}
                        onChange={e => setNewDiscount({...newDiscount, name: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                    />
                    <div className="flex bg-slate-700 p-1 rounded-lg">
                        <button onClick={() => setNewDiscount({...newDiscount, type: 'percentage'})} className={`flex-1 py-1 text-sm rounded ${newDiscount.type === 'percentage' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Persentase (%)</button>
                        <button onClick={() => setNewDiscount({...newDiscount, type: 'amount'})} className={`flex-1 py-1 text-sm rounded ${newDiscount.type === 'amount' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Nominal (Rp)</button>
                    </div>
                    <input 
                        type="number" 
                        placeholder="Nilai Diskon" 
                        value={newDiscount.value}
                        onChange={e => setNewDiscount({...newDiscount, value: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                    />
                    <Button onClick={handleAddDiscount} className="w-full">Simpan</Button>
                </div>
            </Modal>

            {/* Add Point Rule Modal */}
            <Modal isOpen={isRuleModalOpen} onClose={() => setRuleModalOpen(false)} title="Tambah Aturan Poin">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">Aturan sederhana: Pelanggan dapat poin berdasarkan total belanja.</p>
                    <div>
                        <label className="text-xs text-slate-300">Setiap Belanja Senilai (Rp)</label>
                        <input 
                            type="number" 
                            value={newRule.spendAmount}
                            onChange={e => setNewRule({...newRule, spendAmount: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-300">Akan Mendapatkan (Poin)</label>
                        <input 
                            type="number" 
                            value={newRule.pointsEarned}
                            onChange={e => setNewRule({...newRule, pointsEarned: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                        />
                    </div>
                    <Button onClick={handleAddPointRule} className="w-full">Simpan Aturan</Button>
                </div>
            </Modal>
        </div>
    );
};

export default FeaturesTab;

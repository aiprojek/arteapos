
import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useProduct } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useCustomer } from '../context/CustomerContext';
import { useSession } from '../context/SessionContext';
import { useUI } from '../context/UIContext';
import Button from '../components/Button';
import Icon from '../components/Icon';
import type { ReceiptSettings, InventorySettings, AuthSettings, SessionSettings, MembershipSettings } from '../types';

// Modular Imports
import GeneralTab from '../components/settings/GeneralTab';
import DataTab from '../components/settings/DataTab';
import InventoryTab from '../components/settings/InventoryTab';
import FeaturesTab from '../components/settings/FeaturesTab';
import AuthTab from '../components/settings/AuthTab';
import AuditTab from '../components/settings/AuditTab';
import HardwareTab from '../components/settings/HardwareTab';

const SettingsView: React.FC = () => {
    const { receiptSettings: originalReceiptSettings, updateReceiptSettings } = useSettings();
    const { inventorySettings: originalInventorySettings, updateInventorySettings } = useProduct();
    const { authSettings: originalAuthSettings, updateAuthSettings, currentUser } = useAuth();
    const { sessionSettings: originalSessionSettings, updateSessionSettings } = useSession();
    const { membershipSettings: originalMembershipSettings, updateMembershipSettings } = useCustomer();
    const { showAlert } = useUI();
    
    const isAdmin = currentUser?.role === 'admin';
    const isViewer = currentUser?.role === 'viewer'; // Check for Viewer

    // Form States
    const [receiptForm, setReceiptForm] = useState<ReceiptSettings>(originalReceiptSettings);
    const [inventoryForm, setInventoryForm] = useState<InventorySettings>(originalInventorySettings);
    const [authForm, setAuthForm] = useState<AuthSettings>(originalAuthSettings);
    const [sessionForm, setSessionForm] = useState<SessionSettings>(originalSessionSettings);
    const [membershipForm, setMembershipForm] = useState<MembershipSettings>(originalMembershipSettings);
    const [isDirty, setIsDirty] = useState(false);

    // Default tab for Viewer is 'audit', for others 'general'
    const [activeTab, setActiveTab] = useState<'general' | 'features' | 'inventory' | 'auth' | 'data' | 'audit' | 'hardware'>(
        isViewer ? 'audit' : 'general'
    );

    // Sync state
    useEffect(() => setReceiptForm(originalReceiptSettings), [originalReceiptSettings]);
    useEffect(() => setInventoryForm(originalInventorySettings), [originalInventorySettings]);
    useEffect(() => setAuthForm(originalAuthSettings), [originalAuthSettings]);
    useEffect(() => setSessionForm(originalSessionSettings), [originalSessionSettings]);
    useEffect(() => setMembershipForm(originalMembershipSettings), [originalMembershipSettings]);

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
        setIsDirty(false);
    };

    const handleCancel = () => {
        setReceiptForm(originalReceiptSettings);
        setInventoryForm(originalInventorySettings);
        setAuthForm(originalAuthSettings);
        setSessionForm(originalSessionSettings);
        setMembershipForm(originalMembershipSettings);
        setIsDirty(false);
    };

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-3xl font-bold text-white">Pengaturan</h1>
            
            {/* Tabs */}
            <div className="flex flex-nowrap overflow-x-auto gap-2 border-b border-slate-700 pb-2">
                {[
                    { id: 'general', label: 'Toko & Struk', icon: 'settings', restricted: false, hideForViewer: true },
                    { id: 'hardware', label: 'Perangkat Keras', icon: 'bluetooth', restricted: false, hideForViewer: true },
                    { id: 'features', label: 'Fitur Kasir', icon: 'star', restricted: false, hideForViewer: true },
                    { id: 'inventory', label: 'Inventaris', icon: 'boxes', restricted: false, hideForViewer: true },
                    { id: 'auth', label: 'Keamanan', icon: 'lock', restricted: true, hideForViewer: true }, 
                    { id: 'data', label: 'Data & Cloud', icon: 'database', restricted: true, hideForViewer: true },
                    { id: 'audit', label: 'Audit Log', icon: 'file-lock', restricted: false, hideForViewer: false },
                ].filter(tab => {
                    if (isViewer && tab.hideForViewer) return false;
                    if (tab.restricted && !isAdmin) return false;
                    return true;
                }).map(tab => (
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
            {activeTab === 'general' && !isViewer && (
                <GeneralTab 
                    form={receiptForm} 
                    onChange={setReceiptForm}
                    // Pass current session settings to check table feature status
                    isTableFeatureEnabled={sessionForm.enableTableManagement} 
                />
            )}
            
            {activeTab === 'hardware' && !isViewer && <HardwareTab />}

            {activeTab === 'features' && !isViewer && (
                <FeaturesTab 
                    sessionForm={sessionForm} 
                    onSessionChange={setSessionForm}
                    membershipForm={membershipForm}
                    onMembershipChange={setMembershipForm}
                    // Pass receipt settings to auto-add 'Makan di Tempat'
                    receiptForm={receiptForm}
                    onReceiptChange={setReceiptForm}
                />
            )}

            {activeTab === 'inventory' && !isViewer && <InventoryTab form={inventoryForm} onChange={setInventoryForm} />}
            
            {activeTab === 'auth' && !isViewer && <AuthTab form={authForm} onChange={setAuthForm} />}
            
            {activeTab === 'data' && !isViewer && <DataTab />}
            
            {activeTab === 'audit' && <AuditTab />}

            {/* Floating Save/Cancel Bar (Hidden for Viewer since they can't edit) */}
            {isDirty && !isViewer && (
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
        </div>
    );
};

export default SettingsView;

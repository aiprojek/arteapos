
import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useProduct } from '../context/ProductContext';
import { useAuthActions, useAuthState } from '../context/AuthContext';
import { useCustomer } from '../context/CustomerContext';
import { useSession } from '../context/SessionContext';
import { useUIActions } from '../context/UIContext';
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
    const { authSettings: originalAuthSettings, currentUser } = useAuthState();
    const { updateAuthSettings } = useAuthActions();
    const { sessionSettings: originalSessionSettings, updateSessionSettings } = useSession();
    const { membershipSettings: originalMembershipSettings, updateMembershipSettings } = useCustomer();
    const { showAlert } = useUIActions();
    
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

    const visibleTabs = [
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
    });

    const activeTabMeta = visibleTabs.find(tab => tab.id === activeTab);

    return (
        <div className={`space-y-6 ${isDirty && !isViewer ? 'pb-36' : 'pb-20'}`}>
            <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.35)] overflow-hidden">
                <div className="px-5 py-5 sm:px-6 sm:py-6 border-b border-slate-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(52,119,88,0.18),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.7))]">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/50 bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                                Pengaturan Sistem
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white">Pengaturan</h1>
                                <p className="mt-1 max-w-2xl text-sm text-slate-400 leading-relaxed">
                                    Kelola identitas toko, perangkat, keamanan, data, dan fitur kasir dari satu tempat dengan susunan yang lebih rapi.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[420px]">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Tab Aktif</p>
                                <p className="mt-1 text-sm font-semibold text-white">{activeTabMeta?.label || 'Pengaturan'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Akses</p>
                                <p className="mt-1 text-sm font-semibold capitalize text-white">{currentUser?.role || 'staff'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Status</p>
                                <p className={`mt-1 text-sm font-semibold ${isDirty ? 'text-yellow-300' : 'text-emerald-300'}`}>
                                    {isDirty ? 'Ada perubahan belum disimpan' : 'Semua pengaturan sinkron'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Tabs */}
            <div className="sticky top-0 z-20">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-xl px-3 py-3 shadow-lg">
                    <div className="relative">
                        <div className="overflow-x-auto hide-scrollbar flex">
                            <div className="flex gap-1.5 whitespace-nowrap min-w-max">
                                {visibleTabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-[#347758] text-white border-[#347758] shadow'
                                                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                                        }`}
                                    >
                                        <Icon name={tab.icon as any} className="w-4 h-4" />
                                        <span className="text-sm font-medium">{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-slate-900/90 to-transparent md:hidden" />
                        <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-slate-900/90 to-transparent md:hidden" />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-4 sm:p-5 shadow-[0_16px_60px_rgba(15,23,42,0.24)]">
                {activeTab === 'general' && !isViewer && (
                    <GeneralTab 
                        form={receiptForm} 
                        onChange={setReceiptForm}
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
                        receiptForm={receiptForm}
                        onReceiptChange={setReceiptForm}
                    />
                )}

                {activeTab === 'inventory' && !isViewer && <InventoryTab form={inventoryForm} onChange={setInventoryForm} />}
                
                {activeTab === 'auth' && !isViewer && <AuthTab form={authForm} onChange={setAuthForm} />}
                
                {activeTab === 'data' && !isViewer && <DataTab />}
                
                {activeTab === 'audit' && <AuditTab />}
            </section>

            {/* Floating Save/Cancel Bar (Hidden for Viewer since they can't edit) */}
            {isDirty && !isViewer && (
                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 p-4 z-50 animate-fade-in shadow-2xl">
                    <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                        <p className="text-yellow-400 text-sm flex items-center gap-2">
                            <Icon name="warning" className="w-4 h-4 shrink-0" />
                            <span>Anda memiliki perubahan yang belum disimpan.</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3 sm:flex">
                            <Button variant="secondary" onClick={handleCancel} className="h-11 sm:h-auto">
                                <Icon name="close" className="w-4 h-4" />
                                <span className="hidden sm:inline">Batal</span>
                            </Button>
                            <Button variant="primary" onClick={handleSave} className="h-11 sm:h-auto">
                                <Icon name="check-circle-fill" className="w-4 h-4" />
                                <span className="hidden sm:inline">Simpan Perubahan</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;

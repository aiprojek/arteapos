
import React, { useState, useRef } from 'react';
import type { View } from '../types';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Button from './Button';
import { dataService } from '../services/dataService';
import { useUI } from '../context/UIContext';
import { supabaseService } from '../services/supabaseService';
import { dropboxService } from '../services/dropboxService';
import Modal from './Modal';

interface HeaderProps {
    activeView: View;
    setActiveView: (view: View) => void;
    onMenuClick: () => void;
}

const viewTitles: Record<View, string> = {
    dashboard: 'Dashboard',
    pos: 'Point of Sale',
    products: 'Manajemen Produk',
    'raw-materials': 'Manajemen Bahan Baku',
    finance: 'Manajemen Keuangan',
    reports: 'Laporan Penjualan',
    settings: 'Pengaturan Aplikasi',
    help: 'Info & Bantuan'
};

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onMenuClick }) => {
    const { currentUser, logout, authSettings } = useAuth();
    const { restoreData, syncStatus, syncErrorMessage } = useData(); // Get sync status & error
    const { showAlert } = useUI();
    const [isDataModalOpen, setDataModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isAdmin = currentUser?.role === 'admin';

    // --- Handlers ---

    const handleLocalBackup = async () => {
        try {
            await dataService.exportData();
            showAlert({ type: 'alert', title: 'Backup Berhasil', message: 'File backup (JSON) berhasil diunduh.' });
            setDataModalOpen(false);
        } catch (error) {
            showAlert({ type: 'alert', title: 'Error', message: 'Gagal membuat backup.' });
        }
    };

    const handleLocalRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        setIsProcessing(true);
        try {
            const backupData = await dataService.importData(file);
            await restoreData(backupData);
            showAlert({ type: 'alert', title: 'Restore Berhasil', message: 'Data berhasil dipulihkan.' });
            setDataModalOpen(false);
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal Restore', message: e.message });
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        }
    };

    const handleCloudPull = async () => {
        const sbUrl = localStorage.getItem('ARTEA_SB_URL');
        const sbKey = localStorage.getItem('ARTEA_SB_KEY');
        const dbxToken = localStorage.getItem('ARTEA_DBX_TOKEN');

        if (!sbUrl && !dbxToken) {
            showAlert({ type: 'alert', title: 'Belum Dikonfigurasi', message: 'Admin belum mengatur koneksi Cloud (Supabase/Dropbox) di menu Pengaturan.' });
            return;
        }

        setIsProcessing(true);
        try {
            let message = "";
            if (sbUrl && sbKey) {
                // Priority 1: Supabase
                supabaseService.init(sbUrl, sbKey);
                const res = await supabaseService.pullMasterData();
                if (!res.success) throw new Error(res.message);
                message = "Berhasil menarik data terbaru dari Database Pusat (Supabase).";
            } else if (dbxToken) {
                // Priority 2: Dropbox
                await dropboxService.downloadAndMergeMasterData(dbxToken);
                message = "Berhasil menarik data terbaru dari Dropbox Pusat.";
            }
            
            showAlert({ type: 'alert', title: 'Update Sukses', message: message });
            setDataModalOpen(false);
            // Optional: Reload to ensure all contexts refresh perfectly
            setTimeout(() => window.location.reload(), 1500); 
        } catch (e: any) {
            console.error(e);
            showAlert({ type: 'alert', title: 'Gagal Update', message: `Terjadi kesalahan: ${e.message}` });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSyncErrorClick = () => {
        if (syncErrorMessage && (syncErrorMessage.includes('QUOTA') || syncErrorMessage.includes('Penuh'))) {
            showAlert({
                type: 'alert',
                title: 'Penyimpanan Cloud Penuh!',
                message: (
                    <div className="text-left">
                        <p className="mb-2 text-sm text-slate-300">Sinkronisasi gagal karena batas penyimpanan akun gratis (Dropbox/Supabase) telah tercapai.</p>
                        <p className="font-bold text-yellow-400 text-sm mb-2">Solusi:</p>
                        <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-1">
                            <li>Buka menu <strong>Pengaturan</strong> {'>'} <strong>Data & Cloud</strong>.</li>
                            <li>Gunakan fitur <strong>"Kosongkan Riwayat Cloud"</strong>.</li>
                            <li>Fitur ini akan mengarsipkan data ke lokal lalu membersihkan Cloud agar sinkronisasi bisa berjalan kembali.</li>
                        </ol>
                    </div>
                )
            });
        } else {
            showAlert({ type: 'alert', title: 'Gagal Sinkronisasi', message: syncErrorMessage || 'Terjadi kesalahan jaringan.' });
        }
    }

    return (
        <header className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center">
                <button onClick={onMenuClick} className="p-1 mr-3 md:hidden text-slate-300 hover:text-white" aria-label="Buka menu">
                    <Icon name="menu" className="w-6 h-6" />
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                    <h1 className="text-lg font-semibold text-white">{viewTitles[activeView]}</h1>
                    
                    {/* Sync Status Indicator */}
                    {syncStatus === 'syncing' && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-900/30 border border-blue-800 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            <span className="text-[10px] text-blue-300 font-medium">Syncing...</span>
                        </div>
                    )}
                    {syncStatus === 'success' && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-900/30 border border-green-800 transition-opacity duration-1000">
                            <Icon name="check-circle-fill" className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] text-green-300 font-medium">Tersimpan di Cloud</span>
                        </div>
                    )}
                    {syncStatus === 'error' && (
                        <button onClick={handleSyncErrorClick} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-900/30 border border-red-800 hover:bg-red-900/50 transition-colors">
                            <Icon name="warning" className="w-3 h-3 text-red-400" />
                            <span className="text-[10px] text-red-300 font-medium">
                                {syncErrorMessage && syncErrorMessage.includes('QUOTA') ? 'Cloud Penuh' : 'Gagal Sync'}
                            </span>
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                 
                 {/* Unified Data Action Button */}
                 <Button
                    onClick={() => setDataModalOpen(true)}
                    variant="secondary"
                    size="sm"
                    className="p-2 aspect-square bg-slate-700 border border-slate-600 hover:bg-slate-600"
                    aria-label="Menu Data & Sync"
                    title="Menu Data & Sinkronisasi"
                >
                    <Icon name="database" className="w-5 h-5" />
                </Button>

                 {activeView !== 'help' && (
                    <Button 
                        onClick={() => setActiveView('help')} 
                        variant="secondary" 
                        size="sm" 
                        className="p-2 aspect-square"
                        aria-label="Bantuan"
                        title="Bantuan & Info"
                    >
                        <Icon name="help" className="w-5 h-5" />
                    </Button>
                )}
                {currentUser && authSettings.enabled && (
                    <>
                        <span className="text-sm text-slate-300 hidden sm:block">
                            Login sebagai: <span className="font-bold text-white">{currentUser.name}</span>
                        </span>
                        <Button onClick={logout} variant="secondary" size="sm" aria-label="Logout">
                            <Icon name="logout" className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    </>
                )}
            </div>

            {/* Data Actions Modal */}
            <Modal isOpen={isDataModalOpen} onClose={() => setDataModalOpen(false)} title="Menu Data & Sinkronisasi">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400 mb-4">
                        Kelola penyimpanan data lokal atau sinkronkan dengan pusat.
                    </p>

                    {/* Option 1: Cloud Update (Priority for Staff) */}
                    <div className="bg-sky-900/20 border border-sky-800 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="wifi" className="w-5 h-5 text-sky-400"/>
                            <h4 className="font-bold text-white text-sm">Update dari Pusat</h4>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">
                            Tarik harga, produk, dan promo terbaru dari server Cloud. Tidak akan menghapus laporan penjualan Anda.
                        </p>
                        <Button onClick={handleCloudPull} disabled={isProcessing} className="w-full bg-sky-700 hover:bg-sky-600 text-white border-none">
                            {isProcessing ? 'Sedang Memproses...' : 'Update Data Sekarang'}
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-700 my-2"></div>

                    {/* Option 2: Local Backup */}
                    <div className="bg-slate-700/30 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="download" className="w-5 h-5 text-green-400"/>
                            <h4 className="font-bold text-white text-sm">Backup Lokal</h4>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">
                            Unduh file database (.json) ke perangkat ini untuk cadangan keamanan.
                        </p>
                        <Button onClick={handleLocalBackup} variant="secondary" className="w-full">
                            Unduh File Backup
                        </Button>
                    </div>

                    {/* Option 3: Local Restore (Admin Only) */}
                    {isAdmin && (
                        <div className="bg-red-900/10 border border-red-900/30 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon name="upload" className="w-5 h-5 text-red-400"/>
                                <h4 className="font-bold text-white text-sm">Restore Lokal (Admin)</h4>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">
                                Kembalikan data dari file JSON. <span className="text-red-300 font-bold">PERINGATAN: Menimpa semua data saat ini.</span>
                            </p>
                            <Button onClick={handleLocalRestoreClick} variant="danger" className="w-full">
                                Upload File & Restore
                            </Button>
                            {/* Hidden File Input */}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept=".json" 
                            />
                        </div>
                    )}
                    
                    <div className="pt-2 text-center">
                        <button onClick={() => setDataModalOpen(false)} className="text-slate-400 text-sm hover:text-white">Tutup</button>
                    </div>
                </div>
            </Modal>
        </header>
    );
};

export default Header;

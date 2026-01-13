
import React, { useState, useRef, useEffect } from 'react';
import type { View, Branch } from '../types';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useCloudSync } from '../context/CloudSyncContext'; 
import Button from './Button';
import { dataService } from '../services/dataService';
import { useUI } from '../context/UIContext';
import { dropboxService } from '../services/dropboxService';
import { db } from '../services/db'; 
import Modal from './Modal';
import DataArchivingModal from './DataArchivingModal'; 

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
    const { restoreData, dbUsageStatus } = useData(); 
    const { syncStatus, syncErrorMessage, triggerMasterDataPush } = useCloudSync(); 
    const { updateReceiptSettings, receiptSettings } = useSettings();
    const { showAlert } = useUI();
    
    const [isDataModalOpen, setDataModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isBranchModalOpen, setBranchModalOpen] = useState(false);
    const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    
    // Archiving Modal State
    const [isArchivingModalOpen, setIsArchivingModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // SECURITY CHECK: Only 'admin' role can see destructive cloud options
    const isAdmin = currentUser?.role === 'admin';

    // Show warning if database is heavy (e.g. > 5000 records)
    const showMemoryWarning = isAdmin && dbUsageStatus && dbUsageStatus.totalRecords > 5000;

    // --- Helper untuk Redirect ke Settings jika belum config ---
    const checkCloudConfig = () => {
        if (!dropboxService.isConfigured()) {
            setDataModalOpen(false);
            showAlert({ 
                type: 'confirm', 
                title: 'Belum Terhubung', 
                message: 'Fitur Cloud belum dikonfigurasi. Harap hubungkan akun Dropbox di menu Pengaturan terlebih dahulu.',
                confirmText: 'Ke Pengaturan',
                onConfirm: () => setActiveView('settings')
            });
            return false;
        }
        return true;
    };

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
            if (fileInputRef.current) fileInputRef.current.value = ''; 
        }
    };

    // PULL: Update Master Data (Cabang/Admin)
    const handleCloudPull = async () => {
        if (!checkCloudConfig()) return;

        setIsProcessing(true);
        try {
            await dropboxService.downloadAndMergeMasterData();
            
            // Ambil settings terbaru langsung dari DB (karena context mungkin belum refresh)
            const settingsDoc = await db.settings.get('receiptSettings');
            const freshSettings = settingsDoc?.value;
            const branches = freshSettings?.branches || [];
            const currentStoreId = freshSettings?.storeId || 'CABANG-01';

            // LOGIC FIX: Jangan tanya cabang jika ID sudah disetting valid (bukan default)
            // Default biasanya 'CABANG-01' atau kosong
            // Jika ID adalah 'PUSAT', kita anggap valid untuk admin
            const isConfigured = currentStoreId && currentStoreId !== 'CABANG-01' && currentStoreId !== 'MAIN';

            if (branches.length > 0 && !isConfigured) {
                // Jika belum dikonfigurasi, paksa pilih cabang
                setAvailableBranches(branches);
                setSelectedBranchId(currentStoreId);
                setDataModalOpen(false); 
                setBranchModalOpen(true); 
            } else {
                // Jika sudah config, langsung sukses
                showAlert({ type: 'alert', title: 'Menu & Harga Terupdate', message: "Data produk berhasil diperbarui dari Pusat." });
                setDataModalOpen(false);
                setTimeout(() => window.location.reload(), 1500); 
            }

        } catch (e: any) {
            console.error(e);
            let msg = `Terjadi kesalahan: ${e.message}`;
            if (e.message.includes('not_found') || e.message.includes('belum ada')) {
                msg = "Data Pusat belum tersedia. Minta Admin untuk menekan tombol 'Kirim Master' (Push) terlebih dahulu.";
            }
            showAlert({ type: 'alert', title: 'Gagal Update', message: msg });
        } finally {
            setIsProcessing(false);
        }
    };

    // PUSH: Upload Master Data (Admin Only)
    const handleCloudPush = async () => {
        if (!checkCloudConfig()) return;

        setIsProcessing(true);
        try {
            await dropboxService.uploadMasterData();
            showAlert({ type: 'alert', title: 'Upload Sukses', message: 'Master Data (Produk, Harga, Setting) berhasil dikirim ke Cloud.' });
            setDataModalOpen(false);
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal Upload', message: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    // RESTORE: Full Cloud Restore (Admin Only)
    const handleCloudRestoreFull = async () => {
        if (!checkCloudConfig()) return;

        // Mendapatkan nama file target untuk konfirmasi
        const targetFile = await dropboxService.getFileName();

        // Confirm first because this is destructive
        showAlert({
            type: 'confirm',
            title: 'Restore Total dari Cloud?',
            message: (
                <div className="text-left text-sm">
                    <p className="mb-2">PERINGATAN: Ini akan MENIMPA semua data lokal saat ini dengan file backup terakhir dari Dropbox.</p>
                    <p className="mb-2">Target File: <strong>{targetFile}</strong></p>
                    <p>Pastikan Anda sudah melakukan Backup Lokal jika ragu.</p>
                </div>
            ),
            confirmVariant: 'danger',
            confirmText: 'Ya, Timpa Data',
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    const dbx = dropboxService.getClient();
                    const fileName = await dropboxService.getFileName();
                    
                    // @ts-ignore
                    const response = await dbx.filesDownload({ path: fileName });
                    // @ts-ignore
                    const text = await response.result.fileBlob.text();
                    const backupData = JSON.parse(text);

                    await restoreData(backupData);
                    setDataModalOpen(false);
                    // restoreData handles reload
                } catch (e: any) {
                    setIsProcessing(false);
                    let msg = e.message;
                    if (e.error?.path?.['.tag'] === 'not_found') {
                        msg = "File backup tidak ditemukan di Cloud untuk ID Toko ini.";
                    }
                    showAlert({ type: 'alert', title: 'Gagal Restore', message: msg });
                }
            }
        });
    };

    const handleSaveBranchSelection = () => {
        if (!selectedBranchId) return;
        updateReceiptSettings({ ...receiptSettings, storeId: selectedBranchId });
        setBranchModalOpen(false);
        showAlert({ type: 'alert', title: 'Setup Selesai', message: `Identitas disimpan sebagai: ${selectedBranchId}. Aplikasi akan dimuat ulang.` });
        setTimeout(() => window.location.reload(), 1500);
    };

    // NEW: Handle Admin setting themselves as Central
    const handleSetAsCentral = () => {
        updateReceiptSettings({ ...receiptSettings, storeId: 'PUSAT' });
        setBranchModalOpen(false);
        showAlert({ type: 'alert', title: 'Mode Pusat Aktif', message: 'Perangkat ini diatur sebagai PUSAT (Admin). Aplikasi akan dimuat ulang.' });
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleSyncErrorClick = () => {
        if (syncErrorMessage && (syncErrorMessage.includes('QUOTA') || syncErrorMessage.includes('Penuh'))) {
            showAlert({
                type: 'alert',
                title: 'Penyimpanan Cloud Penuh!',
                message: (
                    <div className="text-left">
                        <p className="mb-2 text-sm text-slate-300">Sinkronisasi gagal karena batas penyimpanan akun gratis Dropbox telah tercapai.</p>
                        <p className="font-bold text-yellow-400 text-sm mb-2">Solusi:</p>
                        <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-1">
                            <li>Buka menu <strong>Pengaturan</strong> {'>'} <strong>Data & Cloud</strong>.</li>
                            <li>Gunakan fitur <strong>"Kosongkan Riwayat Cloud"</strong>.</li>
                            <li>Fitur ini akan mengarsipkan data ke lokal lalu membersihkan Dropbox agar sinkronisasi bisa berjalan kembali.</li>
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
                    
                    {/* MEMORY WARNING INDICATOR */}
                    {showMemoryWarning && (
                        <button 
                            onClick={() => setIsArchivingModalOpen(true)}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-900/30 border border-orange-800 hover:bg-orange-900/50 transition-colors animate-pulse"
                            title="Database penuh. Klik untuk bersihkan."
                        >
                            <Icon name="database" className="w-3 h-3 text-orange-400" />
                            <span className="text-[10px] text-orange-300 font-bold">Memori Penuh</span>
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
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

            {/* Modal Manajemen Data */}
            <Modal isOpen={isDataModalOpen} onClose={() => setDataModalOpen(false)} title="Menu Data & Sinkronisasi">
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    
                    {/* SECTION: Cloud Sync (Dropbox) */}
                    <div className="bg-sky-900/20 border border-sky-800 p-3 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon name="wifi" className="w-5 h-5 text-sky-400"/>
                            <h4 className="font-bold text-white text-sm">Sinkronisasi Cloud (Dropbox)</h4>
                        </div>
                        
                        {/* UPDATE / PULL (Primary Action for Staff & Admin) */}
                        <div className="bg-slate-800/50 p-2 rounded border border-sky-900/30">
                            <p className="text-[10px] text-sky-200 mb-1 font-bold">OPERASIONAL CABANG (HARIAN)</p>
                            <Button onClick={handleCloudPull} disabled={isProcessing} className="w-full bg-sky-600 hover:bg-sky-500 text-white border-none text-xs h-9">
                                {isProcessing ? 'Memproses...' : '⬇️ Cek Menu & Harga Baru'}
                            </Button>
                            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                <span className="text-green-400 font-bold">Info:</span> Laporan penjualan Anda terkirim <strong>otomatis</strong> ke Admin. Tombol ini hanya untuk mengambil update Harga/Menu dari Pusat.
                            </p>
                        </div>

                        {/* ADMIN ONLY ACTIONS - HIDDEN FOR STAFF */}
                        {isAdmin && (
                            <div className="border-t border-sky-800/50 pt-2">
                                <p className="text-[10px] text-yellow-500 font-bold mb-2 uppercase">Panel Admin Pusat (Hati-hati)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Button onClick={handleCloudPush} disabled={isProcessing} variant="secondary" className="w-full text-xs h-9 border-sky-700 text-sky-200 hover:bg-sky-900/50">
                                            ⬆️ Kirim Master
                                        </Button>
                                        <p className="text-[9px] text-slate-500 mt-1 leading-tight">Timpa data cabang dengan data perangkat ini.</p>
                                    </div>
                                    <div>
                                        <Button onClick={handleCloudRestoreFull} disabled={isProcessing} variant="secondary" className="w-full text-xs h-9 border-red-800 text-red-300 hover:bg-red-900/30">
                                            ⚠️ Restore Total
                                        </Button>
                                        <p className="text-[9px] text-slate-500 mt-1 leading-tight">Ganti data perangkat ini dengan backup Cloud.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-700 my-1"></div>

                    {/* SECTION: Local Backup/Restore */}
                    <div className="bg-slate-700/30 p-3 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon name="database" className="w-5 h-5 text-green-400"/>
                            <h4 className="font-bold text-white text-sm">Backup & Restore Lokal</h4>
                        </div>
                        
                        {/* Backup Action (Safe for All) */}
                        <div>
                            <Button onClick={handleLocalBackup} variant="secondary" className="w-full mb-1 text-xs">
                                📥 Unduh File Backup (.json)
                            </Button>
                            <p className="text-[10px] text-slate-400">
                                Simpan salinan data lengkap ke penyimpanan perangkat ini (Download).
                            </p>
                        </div>

                        {/* Restore Action (Admin Only - Dangerous) */}
                        {isAdmin && (
                            <div className="border-t border-slate-600/50 pt-2">
                                <p className="text-[10px] text-red-300 font-bold mb-1 uppercase">Zona Bahaya (Admin)</p>
                                <Button onClick={handleLocalRestoreClick} variant="danger" className="w-full text-xs bg-slate-800 border-red-900/50 text-red-300 hover:bg-red-900/20">
                                    ⚠️ Restore dari File
                                </Button>
                                <p className="text-[9px] text-slate-500 mt-1 leading-tight">
                                    PERINGATAN: Tindakan ini akan <strong>menimpa/menghapus</strong> seluruh data saat ini dengan isi file backup yang dipilih.
                                </p>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                    accept=".json" 
                                />
                            </div>
                        )}
                    </div>

                    {/* SECTION: Archiving (Admin Only) */}
                    {isAdmin && (
                        <div className="bg-orange-900/10 border border-orange-800/50 p-3 rounded-lg mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                                <Icon name="boxes" className="w-5 h-5 text-orange-400"/>
                                <h4 className="font-bold text-white text-sm">Perawatan Database</h4>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">
                                Aplikasi melambat? Gunakan fitur ini untuk menghapus transaksi lama yang sudah tidak dibutuhkan agar aplikasi tetap ringan.
                            </p>
                            <Button onClick={() => { setDataModalOpen(false); setIsArchivingModalOpen(true); }} variant="secondary" className="w-full text-orange-300 border-orange-800/50 hover:bg-orange-900/30 text-xs">
                                🧹 Buka Menu Arsip & Bersihkan
                            </Button>
                        </div>
                    )}
                    
                    <div className="pt-2 text-center">
                        <button onClick={() => setDataModalOpen(false)} className="text-slate-400 text-sm hover:text-white">Tutup</button>
                    </div>
                </div>
            </Modal>

            {/* Modal Pilih Cabang (Setelah Sync) */}
            <Modal isOpen={isBranchModalOpen} onClose={() => {}} title="Pilih Identitas Cabang">
                <div className="space-y-4">
                    <div className="bg-green-900/20 p-3 rounded-lg border border-green-800">
                        <p className="text-sm text-green-200 flex items-center gap-2">
                            <Icon name="check-circle-fill" className="w-4 h-4"/>
                            Data berhasil diperbarui dari Pusat.
                        </p>
                    </div>
                    
                    {/* Admin Override Option */}
                    {isAdmin && (
                        <button 
                            onClick={handleSetAsCentral}
                            className="w-full p-3 rounded-lg border border-purple-500 bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 flex items-center justify-between mb-2"
                        >
                            <div className="text-left">
                                <span className="font-bold block">Saya adalah Admin Pusat</span>
                                <span className="text-xs opacity-75">Tidak menjual barang (Monitoring)</span>
                            </div>
                            <Icon name="settings" className="w-5 h-5"/>
                        </button>
                    )}

                    <div>
                        <p className="text-slate-300 text-sm mb-2">Atau pilih lokasi operasional:</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {availableBranches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => setSelectedBranchId(branch.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors flex justify-between items-center
                                        ${selectedBranchId === branch.id 
                                            ? 'bg-[#347758] border-[#347758] text-white' 
                                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                                        }`}
                                >
                                    <div>
                                        <div className="font-bold">{branch.name}</div>
                                        <div className="text-xs opacity-75">{branch.id}</div>
                                    </div>
                                    {selectedBranchId === branch.id && <Icon name="check-circle-fill" className="w-5 h-5"/>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleSaveBranchSelection} disabled={!selectedBranchId} className="w-full">
                        Simpan & Mulai
                    </Button>
                </div>
            </Modal>

            {/* Data Archiving Modal */}
            <DataArchivingModal isOpen={isArchivingModalOpen} onClose={() => setIsArchivingModalOpen(false)} />
        </header>
    );
};

export default Header;


import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { View, Branch } from '../types';
import Icon from './Icon';
import { useAuthActions, useAuthState } from '../context/AuthContext';
import { useDataActions, useDataStatus } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useCloudSync } from '../context/CloudSyncContext'; 
import { useProduct } from '../context/ProductContext'; // NEW
import Button from './Button';
import { dataService } from '../services/dataService';
import { useUIActions } from '../context/UIContext';
import { dropboxService } from '../services/dropboxService';
import { db } from '../services/db'; 
import Modal from './Modal';
import DataArchivingModal from './DataArchivingModal'; 
import ConflictResolveModal from './ConflictResolveModal'; 
import Skeleton from './Skeleton';
import { useRenderProfiler } from '../utils/renderProfiler';

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
    help: 'Info & Bantuan',
    'customer-display': 'Layar Pelanggan',
    'kitchen-display': 'Layar Dapur'
};

interface SyncStatusBadgeProps {
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    syncErrorMessage?: string | null;
    showMemoryWarning: boolean;
    onSyncErrorClick: () => void;
    onOpenArchiving: () => void;
    compact?: boolean;
}

const SyncStatusBadge = memo(({
    syncStatus,
    syncErrorMessage,
    showMemoryWarning,
    onSyncErrorClick,
    onOpenArchiving,
    compact = false,
}: SyncStatusBadgeProps) => {
    const isQuotaSyncError = Boolean(
        syncErrorMessage && (syncErrorMessage.includes('QUOTA') || syncErrorMessage.includes('Penuh'))
    );

    return (
        <>
            <AnimatePresence mode="wait">
                {syncStatus === 'syncing' && (
                    <motion.div 
                        key="syncing"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`flex items-center gap-1.5 rounded-full bg-blue-900/30 border border-blue-800 shrink-0 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}
                    >
                        <Skeleton variant="pill" width={8} height={8} className="bg-blue-400" />
                        {!compact && <Skeleton variant="text" width={48} height={12} className="bg-blue-400/50" />}
                    </motion.div>
                )}
                {syncStatus === 'success' && (
                    <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-center gap-1.5 rounded-full bg-green-900/30 border border-green-800 shrink-0 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}
                    >
                        <Icon name="check-circle-fill" className="w-3 h-3 text-green-400" />
                        {!compact && <span className="text-[10px] text-green-300 font-medium">Tersimpan di Cloud</span>}
                    </motion.div>
                )}
                {syncStatus === 'error' && (
                    <motion.button 
                        key="error"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={onSyncErrorClick} 
                        className={`flex items-center gap-1.5 rounded-full bg-red-900/30 border border-red-800 hover:bg-red-900/50 transition-colors shrink-0 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}
                    >
                        <Icon name="warning" className="w-3 h-3 text-red-400" />
                        {!compact && <span className="text-[10px] text-red-300 font-medium">
                            {isQuotaSyncError ? 'Cloud Penuh' : 'Gagal Sync'}
                        </span>}
                    </motion.button>
                )}
            </AnimatePresence>

            {showMemoryWarning && (
                <button 
                    onClick={onOpenArchiving}
                    className={`flex items-center gap-1.5 rounded-full bg-orange-900/30 border border-orange-800 hover:bg-orange-900/50 transition-colors animate-pulse shrink-0 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}
                    title="Database penuh. Klik untuk bersihkan."
                >
                    <Icon name="database" className="w-3 h-3 text-orange-400" />
                    {!compact && <span className="text-[10px] text-orange-300 font-bold">Memori Penuh</span>}
                </button>
            )}
        </>
    );
});

SyncStatusBadge.displayName = 'SyncStatusBadge';

interface BranchSelectionListProps {
    availableBranches: Branch[];
    selectedBranchId: string;
    onSelectBranch: (branchId: string) => void;
}

const BranchSelectionList = memo(({
    availableBranches,
    selectedBranchId,
    onSelectBranch,
}: BranchSelectionListProps) => (
    <div className="space-y-2 max-h-60 overflow-y-auto">
        {availableBranches.map((branch) => (
            <button
                key={branch.id}
                onClick={() => onSelectBranch(branch.id)}
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
));

BranchSelectionList.displayName = 'BranchSelectionList';

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onMenuClick }) => {
    const { currentUser, authSettings } = useAuthState();
    const { logout } = useAuthActions();
    const { restoreData } = useDataActions();
    const { dbUsageStatus } = useDataStatus();
    const { syncStatus, syncErrorMessage } = useCloudSync(); 
    const { updateReceiptSettings, receiptSettings } = useSettings();
    const { processIncomingTransfers } = useProduct(); // NEW
    const { showAlert } = useUIActions();
    
    const [isDataModalOpen, setDataModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isBranchModalOpen, setBranchModalOpen] = useState(false);
    const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    
    // Archiving Modal State
    const [isArchivingModalOpen, setIsArchivingModalOpen] = useState(false);
    
    // Conflict Modal State
    const [isConflictModalOpen, setConflictModalOpen] = useState(false);
    const [isCompactViewport, setIsCompactViewport] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const updateViewportMode = () => {
            setIsCompactViewport(window.innerHeight <= 820 || window.innerWidth < 768);
        };

        updateViewportMode();
        window.addEventListener('resize', updateViewportMode);

        return () => window.removeEventListener('resize', updateViewportMode);
    }, []);

    // SECURITY CHECK: Only 'admin' role can see destructive cloud options
    const isAdmin = currentUser?.role === 'admin';

    // Show warning if database is heavy (e.g. > 5000 records)
    const showMemoryWarning = Boolean(
        isAdmin && dbUsageStatus && dbUsageStatus.totalRecords > 5000
    );

    useRenderProfiler('Header', {
        activeView,
        isDataModalOpen,
        isBranchModalOpen,
        isArchivingModalOpen,
        isConflictModalOpen,
        isProcessing,
        syncStatus,
        syncErrorMessage,
        showMemoryWarning,
        selectedBranchId,
        availableBranchesCount: availableBranches.length,
        currentUserId: currentUser?.id ?? null,
        compactViewport: isCompactViewport,
    });

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

    const handleLocalRestoreClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

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

    // PULL: Update Master Data (Cabang/Admin) + CHECK STOCK TRANSFERS
    const handleCloudPull = async () => {
        if (!checkCloudConfig()) return;

        setIsProcessing(true);
        let msg = "Data produk berhasil diperbarui dari Pusat.";
        
        try {
            // 1. Download Master Data (Prices, Products)
            await dropboxService.downloadAndMergeMasterData();
            
            // 2. Check for Pending Stock Transfers (From Warehouse)
            const currentStoreId = receiptSettings.storeId;
            if (currentStoreId && currentStoreId !== 'PUSAT') {
                try {
                    const transfers = await dropboxService.fetchPendingTransfers(currentStoreId);
                    if (transfers.length > 0) {
                        processIncomingTransfers(transfers);
                        msg += `\n\n📦 DITERIMA: ${transfers.length} paket stok dari Gudang telah ditambahkan ke inventaris.`;
                    }
                } catch (err: any) {
                    console.warn("Stock Transfer Check Failed", err);
                    // Don't block master data update success, just warn
                }
            }
            
            // Ambil settings terbaru langsung dari DB (karena context mungkin belum refresh)
            const settingsDoc = await db.settings.get('receiptSettings');
            const freshSettings = settingsDoc?.value;
            const branches = freshSettings?.branches || [];
            const freshStoreId = freshSettings?.storeId || 'CABANG-01';

            const isConfigured = freshStoreId && freshStoreId !== 'CABANG-01' && freshStoreId !== 'MAIN';

            if (branches.length > 0 && !isConfigured) {
                // Jika belum dikonfigurasi, paksa pilih cabang
                setAvailableBranches(branches);
                setSelectedBranchId(freshStoreId);
                setDataModalOpen(false); 
                setBranchModalOpen(true); 
            } else {
                showAlert({ type: 'alert', title: 'Update Berhasil', message: msg });
                setDataModalOpen(false);
                setTimeout(() => window.location.reload(), 2000); 
            }

        } catch (e: any) {
            console.error(e);
            let errMsg = `Terjadi kesalahan: ${e.message}`;
            if (e.message.includes('not_found') || e.message.includes('belum ada')) {
                errMsg = "Data Pusat belum tersedia. Minta Admin untuk menekan tombol 'Kirim Master' (Push) terlebih dahulu.";
            }
            showAlert({ type: 'alert', title: 'Gagal Update', message: errMsg });
        } finally {
            setIsProcessing(false);
        }
    };

    // PUSH: Upload Master Data (Admin Only)
    const handleCloudPush = async (force: boolean = false) => {
        if (!checkCloudConfig()) return;

        setIsProcessing(true);
        try {
            await dropboxService.uploadMasterData(force);
            showAlert({ type: 'alert', title: 'Upload Sukses', message: 'Master Data (Produk, Harga, Setting) berhasil dikirim ke Cloud.' });
            setDataModalOpen(false);
            setConflictModalOpen(false); 
        } catch (e: any) {
            if (e.message === 'CONFLICT_DETECTED') {
                setConflictModalOpen(true);
                setDataModalOpen(false); 
            } else {
                showAlert({ type: 'alert', title: 'Gagal Upload', message: e.message });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // CONFLICT RESOLUTION: Merge Strategy
    const handleConflictMerge = async () => {
        setIsProcessing(true);
        try {
            await dropboxService.downloadAndMergeMasterData();
            await dropboxService.uploadMasterData(false);
            showAlert({ type: 'alert', title: 'Berhasil', message: 'Konflik teratasi. Data cloud dan lokal telah digabungkan.' });
            setConflictModalOpen(false);
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal Merge', message: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    // RESTORE: Full Cloud Restore (Admin Only)
    const handleCloudRestoreFull = async () => {
        if (!checkCloudConfig()) return;

        const targetFile = await dropboxService.getFileName();

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

    const handleSaveBranchSelection = useCallback(() => {
        if (!selectedBranchId) return;
        updateReceiptSettings({ ...receiptSettings, storeId: selectedBranchId });
        setBranchModalOpen(false);
        showAlert({ type: 'alert', title: 'Setup Selesai', message: `Identitas disimpan sebagai: ${selectedBranchId}. Aplikasi akan dimuat ulang.` });
        setTimeout(() => window.location.reload(), 1500); 
    }, [receiptSettings, selectedBranchId, showAlert, updateReceiptSettings]);

    const handleSetAsCentral = useCallback(() => {
        updateReceiptSettings({ ...receiptSettings, storeId: 'PUSAT' });
        setBranchModalOpen(false);
        showAlert({ type: 'alert', title: 'Mode Pusat Aktif', message: 'Perangkat ini diatur sebagai PUSAT (Admin). Aplikasi akan dimuat ulang.' });
        setTimeout(() => window.location.reload(), 1500); 
    }, [receiptSettings, showAlert, updateReceiptSettings]);

    const handleSyncErrorClick = useCallback(() => {
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
                            <li>Gunakan fitur <strong>"Hapus Laporan"</strong>.</li>
                            <li>Fitur ini akan mengarsipkan data ke lokal lalu membersihkan Dropbox agar sinkronisasi bisa berjalan kembali.</li>
                        </ol>
                    </div>
                )
            });
        } else {
            showAlert({ type: 'alert', title: 'Gagal Sinkronisasi', message: syncErrorMessage || 'Terjadi kesalahan jaringan.' });
        }
    }, [showAlert, syncErrorMessage]);

    const openArchivingModal = useCallback(() => {
        setIsArchivingModalOpen(true);
    }, []);

    const handleSelectBranch = useCallback((branchId: string) => {
        setSelectedBranchId(branchId);
    }, []);

    return (
        <>
        <header className={`sticky top-0 z-[60] flex items-center justify-between bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 flex-shrink-0 ${isCompactViewport ? 'px-3 py-2.5 gap-2 min-h-[60px]' : 'p-4 gap-3 min-h-[68px]'}`}>
            <div className={`flex items-center min-w-0 ${isCompactViewport ? 'gap-1.5' : ''}`}>
                <button
                    onClick={onMenuClick}
                    className={`text-slate-100 md:hidden inline-flex items-center justify-center self-center rounded-xl border border-slate-600 bg-slate-700 hover:bg-slate-600 transition-colors ${isCompactViewport ? 'w-9 h-9' : 'w-10 h-10 mr-3'}`}
                    aria-label="Buka menu"
                    title="Buka menu"
                >
                    <Icon name="menu" className={`${isCompactViewport ? 'w-5 h-5' : 'w-6 h-6'} block`} />
                </button>
                <div className={`flex min-w-0 ${isCompactViewport ? 'items-center gap-2 min-h-[36px]' : 'flex-col sm:flex-row sm:items-center sm:gap-3'}`}>
                    <h1 className={`font-semibold text-white truncate ${isCompactViewport ? 'text-[15px] leading-tight max-w-[42vw] sm:max-w-[52vw]' : 'text-lg leading-tight max-w-[55vw] sm:max-w-none'}`}>{viewTitles[activeView]}</h1>
                    
                    <SyncStatusBadge
                        syncStatus={syncStatus}
                        syncErrorMessage={syncErrorMessage}
                        showMemoryWarning={showMemoryWarning}
                        onSyncErrorClick={handleSyncErrorClick}
                        onOpenArchiving={openArchivingModal}
                        compact={isCompactViewport}
                    />
                </div>
            </div>
            <div className={`flex items-center shrink-0 ${isCompactViewport ? 'gap-2' : 'gap-3'}`}>
                 <Button
                    onClick={() => setDataModalOpen(true)}
                    variant="utility"
                    size="sm"
                    className={`${isCompactViewport ? 'p-1.5' : 'p-2'} aspect-square`}
                    aria-label="Menu Data & Sync"
                    title="Menu Data & Sinkronisasi"
                >
                    <Icon name="database" className="w-5 h-5" />
                </Button>

                 {activeView !== 'help' && (
                    <Button 
                        onClick={() => setActiveView('help')} 
                        variant="utility" 
                        size="sm" 
                        className={`${isCompactViewport ? 'p-1.5' : 'p-2'} aspect-square`}
                        aria-label="Bantuan"
                        title="Bantuan & Info"
                    >
                        <Icon name="help" className="w-5 h-5" />
                    </Button>
                )}
                {currentUser && authSettings.enabled && (
                    <>
                        <span className={`text-sm text-slate-300 ${isCompactViewport ? 'hidden lg:block' : 'hidden sm:block'}`}>
                            Login sebagai: <span className="font-bold text-white">{currentUser.name}</span>
                        </span>
                        <Button onClick={logout} variant="utility" size="sm" aria-label="Logout" className={isCompactViewport ? 'px-2 py-1.5' : ''}>
                            <Icon name="logout" className="w-4 h-4" />
                            <span className={isCompactViewport ? 'hidden lg:inline' : 'hidden sm:inline'}>Logout</span>
                        </Button>
                    </>
                )}
            </div>
        </header>

        {/* Modal Manajemen Data */}
        <Modal
            isOpen={isDataModalOpen}
            onClose={() => setDataModalOpen(false)}
            title="Menu Data & Sinkronisasi"
            size="full"
            mobileLayout="fullscreen"
            bodyClassName="p-4 sm:p-6"
            panelClassName="sm:max-w-4xl"
        >
            <div className="space-y-5 pr-1">
                
                {/* SECTION: Cloud Sync (Dropbox) */}
                <div className="bg-sky-950/40 border border-sky-900/70 p-4 sm:p-5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Icon name="wifi" className="w-5 h-5 text-sky-400"/>
                            <h4 className="font-bold text-white text-sm sm:text-base">Sinkronisasi Cloud (Dropbox)</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Gunakan menu ini untuk mengambil pembaruan dari pusat, mengirim data master, atau melakukan pemulihan data jika dibutuhkan.
                        </p>
                    </div>
                    
                    <div className="bg-slate-900/70 p-4 rounded-2xl border border-sky-900/30 space-y-3">
                        <div>
                            <p className="text-[10px] text-sky-200 mb-1 font-bold tracking-wide">OPERASIONAL CABANG (HARIAN)</p>
                            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                Cek harga, menu, dan stok terbaru dari pusat atau gudang.
                            </p>
                        </div>
                        <Button onClick={handleCloudPull} disabled={isProcessing} className="w-full h-11 text-sm">
                            {isProcessing ? 'Memproses...' : '⬇️ Cek Update (Menu & Stok)'}
                        </Button>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            Tombol ini dipakai untuk mengambil harga dan menu terbaru, sekaligus menerima stok kiriman dari gudang jika ada.
                        </p>
                    </div>

                    {/* ADMIN ONLY ACTIONS */}
                    {isAdmin && (
                        <div className="border-t border-sky-800/50 pt-3 space-y-3">
                            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wide">Panel Admin Pusat</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3 space-y-2">
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                        Kirim data master terbaru ke cabang agar harga, menu, dan pengaturan utama ikut diperbarui.
                                    </p>
                                    <Button onClick={() => handleCloudPush(false)} disabled={isProcessing} variant="operational" className="w-full text-xs h-10 whitespace-nowrap">
                                        ⬆️ Kirim Master
                                    </Button>
                                </div>
                                <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-3 space-y-2">
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                        Ganti data di perangkat ini dengan salinan dari cloud. Gunakan hanya saat memang perlu memulihkan data.
                                    </p>
                                    <Button onClick={handleCloudRestoreFull} disabled={isProcessing} variant="danger" className="w-full text-xs h-10 whitespace-nowrap">
                                        ⚠️ Restore Total
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-700/70 my-1"></div>

                {/* SECTION: Local Backup/Restore */}
                <div className="bg-slate-900/50 border border-slate-700 p-4 sm:p-5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                        <Icon name="database" className="w-5 h-5 text-green-400"/>
                            <h4 className="font-bold text-white text-sm sm:text-base">Backup & Restore Lokal</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Simpan salinan data ke perangkat ini, atau pulihkan dari file cadangan bila diperlukan.
                        </p>
                    </div>
                    
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-3 space-y-2">
                        <Button onClick={handleLocalBackup} variant="utility" className="w-full h-10 text-sm">
                            📥 Backup (.json)
                        </Button>
                        <p className="text-[11px] text-slate-400">
                            Simpan salinan data lengkap ke penyimpanan perangkat ini (Download).
                        </p>
                    </div>

                    {isAdmin && (
                        <div className="border-t border-slate-600/50 pt-2 space-y-2">
                            <p className="text-[10px] text-red-300 font-bold uppercase">Zona Bahaya (Admin)</p>
                            <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-3 space-y-2">
                            <Button onClick={handleLocalRestoreClick} variant="danger" className="w-full text-xs h-10 bg-slate-800 border-red-900/50 text-red-300 hover:bg-red-900/20">
                                ⚠️ Restore dari File
                            </Button>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                PERINGATAN: Tindakan ini akan <strong>menimpa/menghapus</strong> seluruh data saat ini dengan isi file backup yang dipilih.
                            </p>
                            </div>
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
                    <div className="bg-orange-950/30 border border-orange-800/50 p-4 sm:p-5 rounded-2xl mt-2 space-y-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                            <Icon name="boxes" className="w-5 h-5 text-orange-400"/>
                                <h4 className="font-bold text-white text-sm sm:text-base">Perawatan Database</h4>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Jika aplikasi mulai terasa berat, buka menu ini untuk mengarsipkan data lama lebih dulu lalu membersihkannya dengan aman.
                            </p>
                        </div>
                        <Button onClick={() => { setDataModalOpen(false); setIsArchivingModalOpen(true); }} variant="utility" className="w-full h-11 text-sm">
                            🧹 Arsip & Bersihkan
                        </Button>
                    </div>
                )}
            </div>
        </Modal>

        {/* Modal Pilih Cabang */}
        <Modal isOpen={isBranchModalOpen} onClose={() => {}} title="Pilih Identitas Cabang">
            <div className="space-y-4">
                <div className="bg-green-900/20 p-3 rounded-lg border border-green-800">
                    <p className="text-sm text-green-200 flex items-center gap-2">
                        <Icon name="check-circle-fill" className="w-4 h-4"/>
                        Data berhasil diperbarui dari Pusat.
                    </p>
                </div>
                
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
                    <BranchSelectionList
                        availableBranches={availableBranches}
                        selectedBranchId={selectedBranchId}
                        onSelectBranch={handleSelectBranch}
                    />
                </div>

                <Button onClick={handleSaveBranchSelection} disabled={!selectedBranchId} className="w-full">
                    Simpan & Mulai
                </Button>
            </div>
        </Modal>

        {/* Data Archiving Modal */}
        <DataArchivingModal isOpen={isArchivingModalOpen} onClose={() => setIsArchivingModalOpen(false)} />
        
        {/* Conflict Resolve Modal */}
        <ConflictResolveModal 
            isOpen={isConflictModalOpen} 
            onClose={() => setConflictModalOpen(false)} 
            onMerge={handleConflictMerge}
            onForceOverwrite={() => handleCloudPush(true)}
            isProcessing={isProcessing}
        />
        </>
    );
};

export default Header;

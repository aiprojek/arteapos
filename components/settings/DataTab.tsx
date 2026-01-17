
import React, { useState, useRef, useEffect } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import { dataService } from '../../services/dataService';
import { dropboxService } from '../../services/dropboxService';
import { decryptReport, encryptCredentials, decryptCredentials } from '../../utils/crypto';
import { useData } from '../../context/DataContext';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';
import { db } from '../../services/db'; 
import type { CartItem, Transaction as TransactionType } from '../../types';
import BarcodeScannerModal from '../BarcodeScannerModal'; 
import DataArchivingModal from '../DataArchivingModal'; 
import { generateTablePDF } from '../../utils/pdfGenerator';
import { CURRENCY_FORMATTER } from '../../constants';

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

const DataTab: React.FC = () => {
    const { data, restoreData } = useData();
    const { importTransactions } = useFinance();
    const { showAlert } = useUI();
    
    // Cloud Settings State
    const [dbxKey, setDbxKey] = useState('');
    const [dbxSecret, setDbxSecret] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    
    const [showDbxHelpModal, setShowDbxHelpModal] = useState(false);
    const [dbxAuthCode, setDbxAuthCode] = useState('');
    const [isDbxConnecting, setIsDbxConnecting] = useState(false);
    
    // Pairing State
    const [showPairingModal, setShowPairingModal] = useState(false); 
    const [isScanningPairing, setIsScanningPairing] = useState(false);
    const [pairingTextCode, setPairingTextCode] = useState(''); 
    const [inputPairingCode, setInputPairingCode] = useState(''); 
    const [pairingMode, setPairingMode] = useState<'generate' | 'input'>('generate');
    // SECURITY UPDATE: PIN for Pairing
    const [pairingPin, setPairingPin] = useState(''); 
    const [pairingStep, setPairingStep] = useState<'pin_input' | 'show_code' | 'scan_success'>('pin_input');

    // Import State
    const [encryptedInput, setEncryptedInput] = useState('');
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isArchivingCloud, setIsArchivingCloud] = useState(false); 

    // Cloud Archive Dropdown
    const [isCloudArchiveDropdownOpen, setCloudArchiveDropdownOpen] = useState(false);
    const cloudArchiveDropdownRef = useRef<HTMLDivElement>(null);

    // Health Check State
    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [isChecking, setIsChecking] = useState(false);

    // Archiving Modal State
    const [isArchivingModalOpen, setIsArchivingModalOpen] = useState(false);

    // Storage Stats State
    const [storageStats, setStorageStats] = useState({
        localDataSize: 0,
        dropboxUsed: 0,
        dropboxTotal: 0,
        dropboxChecking: false
    });

    useEffect(() => {
        // Load credentials safely
        const creds = dropboxService.getCredentials();
        if (creds) {
            setDbxKey(creds.clientId);
            setDbxSecret(creds.clientSecret);
            setIsConfigured(true);
            checkDropboxQuota();
        } else {
            setIsConfigured(false);
        }

        // Calculate estimated local JSON size
        try {
            const json = JSON.stringify(data);
            const bytes = new Blob([json]).size;
            setStorageStats(prev => ({...prev, localDataSize: bytes}));
        } catch (e) {
            console.error("Failed to calc size", e);
        }
    }, [data]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cloudArchiveDropdownRef.current && !cloudArchiveDropdownRef.current.contains(event.target as Node)) {
                setCloudArchiveDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const checkDropboxQuota = async () => {
        if (!dropboxService.isConfigured()) return;
        setStorageStats(prev => ({...prev, dropboxChecking: true}));
        try {
            const usage = await dropboxService.getSpaceUsage();
            setStorageStats(prev => ({
                ...prev, 
                dropboxUsed: usage.used, 
                dropboxTotal: usage.allocated,
                dropboxChecking: false
            }));
        } catch (e) {
            console.error("Failed to check quota", e);
            setStorageStats(prev => ({...prev, dropboxChecking: false}));
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const saveCloudSettings = () => {
        const currentCreds = dropboxService.getCredentials();
        dropboxService.saveCredentials(dbxKey, dbxSecret, currentCreds?.refreshToken || '');
        showAlert({ type: 'alert', title: 'Tersimpan', message: 'Kredensial App Key/Secret diperbarui (Enkripsi Aktif).' });
    };

    const handleDisconnect = () => {
        dropboxService.clearCredentials();
        setDbxKey('');
        setDbxSecret('');
        setIsConfigured(false);
        showAlert({ type: 'alert', title: 'Terputus', message: 'Koneksi Dropbox diputuskan.' });
    };

    // --- Pairing Logic (QR & Text) ---
    
    const handleOpenPairingGenerator = () => {
        const creds = dropboxService.getCredentials();
        if (!creds) {
            showAlert({ type: 'alert', title: 'Belum Terhubung', message: 'Anda harus menghubungkan Dropbox terlebih dahulu sebelum membagikan akses.' });
            return;
        }
        
        setPairingPin(''); 
        setPairingStep('pin_input');
        setPairingMode('generate');
        setShowPairingModal(true);
    };

    const generatePairingCode = () => {
        if (pairingPin.length < 4) {
            alert("PIN Minimal 4 Karakter");
            return;
        }

        const creds = dropboxService.getCredentials();
        if (!creds) return;

        // Encrypt using the PIN provided by user
        const textCode = encryptCredentials({
            k: creds.clientId,
            s: creds.clientSecret,
            t: creds.refreshToken
        }, pairingPin);

        setPairingTextCode(textCode);
        setPairingStep('show_code');
    };

    const handleInputCodeInit = () => {
        setPairingMode('input');
        setPairingPin('');
        setPairingStep('pin_input'); // Ask for code first? No, standard is input code then PIN.
        // Let's modify: Input Code screen first, then if valid format, ask PIN.
        // For simplicity: We use the modal to capture code, then ask PIN if needed inside 'processPairingCode'.
        setShowPairingModal(true);
    };

    const processPairingCode = async (code: string) => {
        // We need to ask for PIN to decrypt
        // Use Prompt logic or simple flow
        // Since `window.prompt` is ugly, let's assume we use the state `pairingPin` if available
        // OR we enforce the flow: Scan -> Enter PIN -> Decrypt.
        
        // Let's use the modal flow for PIN entry
        setInputPairingCode(code);
        setIsScanningPairing(false); // Close scanner if open
        setPairingMode('input');
        setPairingStep('pin_input'); // Re-use pin input step for decryption
        setShowPairingModal(true);
    };

    const executeDecryption = async () => {
        if (!inputPairingCode || !pairingPin) return;

        try {
            const payload = decryptCredentials(inputPairingCode.trim(), pairingPin);

            if (payload && payload.k && payload.s && payload.t) {
                dropboxService.saveCredentials(payload.k, payload.s, payload.t);
                
                setDbxKey(payload.k);
                setDbxSecret(payload.s);
                setIsConfigured(true);

                showAlert({ 
                    type: 'alert', 
                    title: 'Kredensial Diterima', 
                    message: 'PIN Benar! Sedang mengunduh Master Data dari Cloud...' 
                });
                
                try {
                    await dropboxService.downloadAndMergeMasterData();
                    
                    showAlert({ 
                        type: 'alert', 
                        title: 'Pairing & Sync Sukses!', 
                        message: 'Perangkat berhasil terhubung. Aplikasi akan dimuat ulang.',
                        onConfirm: () => window.location.reload()
                    });
                } catch (syncErr: any) {
                    console.error(syncErr);
                    showAlert({ 
                        type: 'alert', 
                        title: 'Pairing Sukses, Sync Gagal', 
                        message: 'Terhubung, tapi gagal download Master Data. Coba "Update dari Pusat" nanti.' 
                    });
                }

                setShowPairingModal(false);
            } else {
                throw new Error("PIN Salah atau Kode Rusak.");
            }
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal Pairing', message: e.message });
        }
    };

    const getQRPairingString = () => {
        return pairingTextCode;
    };

    // --- System Health Check ---
    const runHealthCheck = async () => {
        setIsChecking(true);
        setHealthStatus(null);
        try {
            const tables = ['products', 'transactionRecords', 'users', 'expenses', 'customers', 'stockAdjustments', 'auditLogs'];
            const results: any = {};
            for (const table of tables) {
                // @ts-ignore
                const count = await db[table].count();
                results[table] = count;
            }

            let storageInfo = "Tidak tersedia";
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                if (estimate.usage && estimate.quota) {
                    const usageMB = (estimate.usage / 1024 / 1024).toFixed(2);
                    const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
                    storageInfo = `${usageMB} MB terpakai dari ${quotaMB} MB`;
                }
            }

            setHealthStatus({
                db: 'OK (IndexedDB Mounted)',
                counts: results,
                storage: storageInfo,
                timestamp: new Date().toLocaleString()
            });

        } catch (e: any) {
            setHealthStatus({ error: e.message });
        } finally {
            setIsChecking(false);
        }
    };

    // --- Dropbox Logic ---
    const handleDbxConnect = async () => {
        if (!dbxKey || !dbxSecret) {
            showAlert({ type: 'alert', title: 'Data Kurang', message: 'Masukkan App Key dan App Secret terlebih dahulu.' });
            return;
        }
        
        try {
            const authUrl = await dropboxService.getAuthUrl(dbxKey);
            window.open(authUrl, '_blank');
        } catch (e: any) {
            alert("Error generating URL: " + e.message);
        }
    };

    const handleDbxExchange = async () => {
        if (!dbxAuthCode) return;
        setIsDbxConnecting(true);
        try {
            const refreshToken = await dropboxService.exchangeCodeForToken(dbxKey, dbxSecret, dbxAuthCode);
            dropboxService.saveCredentials(dbxKey, dbxSecret, refreshToken);
            setIsConfigured(true);
            
            setDbxAuthCode('');
            setShowDbxHelpModal(false);
            showAlert({ type: 'alert', title: 'Terhubung!', message: 'Dropbox berhasil dihubungkan. Token telah diamankan.' });
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: e.message });
        } finally {
            setIsDbxConnecting(false);
        }
    };

    // NEW: Handle Cloud Archive with Multiple Formats
    const handleCloudArchive = async (format: 'json' | 'xlsx' | 'csv' | 'ods' | 'pdf' = 'json') => {
        if (!isConfigured) return;
        setIsArchivingCloud(true);
        setCloudArchiveDropdownOpen(false);
        
        try {
            // 1. Fetch ALL data from Dropbox (Aggregate)
            const aggregatedData = await dropboxService.fetchAllBranchData();
            
            if (aggregatedData.length === 0) {
                showAlert({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data di Dropbox untuk diarsipkan.' });
                setIsArchivingCloud(false);
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 10);
            
            if (format === 'json') {
                // Original JSON Backup Logic (Raw Data for Restore)
                const fileName = `Artea_Cloud_Archive_${timestamp}.json`;
                const jsonString = JSON.stringify(aggregatedData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                // Readable Formats (Flattened Transactions from all branches)
                const allTxns = aggregatedData.flatMap((branch: any) => {
                    const storeId = branch.storeId || 'Unknown';
                    return (branch.transactionRecords || []).map((t: any) => ({
                        ...t,
                        storeId: storeId
                    }));
                }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                const headers = ['Waktu', 'Cabang', 'ID', 'Pelanggan', 'Total', 'Status', 'Item'];
                const rows = allTxns.map((t: any) => [
                    new Date(t.createdAt).toLocaleString('id-ID'),
                    t.storeId,
                    t.id.slice(-6),
                    t.customerName || '-',
                    t.total, // Keep number for excel/csv
                    t.paymentStatus,
                    (t.items || []).map((i: any) => `${i.name} (x${i.quantity})`).join('; ')
                ]);

                const fileNameBase = `Artea_Cloud_Report_${timestamp}`;

                if (format === 'pdf') {
                    // Format currency string specifically for PDF visual
                    const pdfRows = rows.map(r => r.map((c, i) => i === 4 ? CURRENCY_FORMATTER.format(c as number) : c));
                    generateTablePDF('Arsip Transaksi Cloud (Semua Cabang)', headers, pdfRows, data.receiptSettings);
                } else {
                    dataService.exportToSpreadsheet(headers, rows, fileNameBase, format);
                }
            }

            showAlert({ 
                type: 'alert', 
                title: 'Arsip Siap', 
                message: `Data Cloud berhasil diunduh dalam format ${format.toUpperCase()}. Simpan file ini baik-baik sebagai backup.` 
            });

        } catch (e: any) {
            console.error(e);
            showAlert({ type: 'alert', title: 'Gagal Mengarsipkan', message: e.message });
        } finally {
            setIsArchivingCloud(false);
        }
    };

    const handleCloudPurge = () => {
        showAlert({
            type: 'confirm',
            title: 'Kosongkan Folder Laporan?',
            message: (
                <div className="text-left text-sm space-y-2">
                    <p className="text-red-400 font-bold">PERINGATAN: Tindakan ini permanen!</p>
                    <p>Folder "Laporan" di Dropbox akan dihapus untuk mengosongkan ruang.</p>
                    <p className="bg-slate-700 p-2 rounded border border-slate-600">
                        Disarankan untuk menekan tombol <strong>"Unduh Arsip"</strong> terlebih dahulu agar Anda memiliki salinan data penjualan cabang.
                    </p>
                </div>
            ),
            confirmVariant: 'danger',
            confirmText: 'Ya, Hapus Data Cloud',
            onConfirm: async () => {
                setIsCleaning(true);
                try {
                    if (isConfigured) {
                        const res = await dropboxService.clearOldBackups();
                        checkDropboxQuota(); // Refresh quota
                        showAlert({
                            type: 'alert',
                            title: 'Pembersihan Selesai',
                            message: res.message
                        });
                    }
                } catch (e: any) {
                    showAlert({ type: 'alert', title: 'Gagal', message: e.message });
                } finally {
                    setIsCleaning(false);
                }
            }
        });
    };

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

    // Safe Local Storage Access for Last Pull Time
    let lastPullTime = '';
    try {
        lastPullTime = localStorage.getItem('ARTEA_LAST_MASTER_PULL') || '';
    } catch (e) {
        // ignore
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showAlert({type:'alert', title:'Disalin', message:'Kode disalin ke clipboard.'});
        } catch (err) {
            showAlert({type:'alert', title:'Gagal Salin', message:'Gagal menyalin teks. Clipboard mungkin dibatasi.'});
        }
    };

    return (
        <div className="animate-fade-in">
            {/* --- System Health Check Section --- */}
            <SettingsCard title="Diagnosa Sistem" description="Cek kesehatan database lokal dan penyimpanan browser.">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-300">
                            Gunakan fitur ini jika aplikasi terasa lambat atau ada data yang tidak muncul.
                        </p>
                        <Button onClick={runHealthCheck} disabled={isChecking} size="sm">
                            {isChecking ? 'Mengecek...' : 'Cek Kesehatan Data'}
                        </Button>
                    </div>
                    
                    {healthStatus && (
                        <div className="bg-slate-900 border border-slate-600 p-4 rounded-lg mt-2 text-xs font-mono animate-fade-in">
                            {healthStatus.error ? (
                                <p className="text-red-400 font-bold">Error: {healthStatus.error}</p>
                            ) : (
                                <div className="space-y-2 text-slate-300">
                                    <p className="text-green-400 font-bold">✔ Database: {healthStatus.db}</p>
                                    <p>🕒 Waktu Cek: {healthStatus.timestamp}</p>
                                    <p>💾 Storage Browser: {healthStatus.storage}</p>
                                    <div className="border-t border-slate-700 pt-2 mt-2">
                                        <p className="font-bold text-slate-400 mb-1">Total Record:</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            <span>Produk: <span className="text-white">{healthStatus.counts.products}</span></span>
                                            <span>Transaksi: <span className="text-white">{healthStatus.counts.transactionRecords}</span></span>
                                            <span>Pelanggan: <span className="text-white">{healthStatus.counts.customers}</span></span>
                                            <span>Pengeluaran: <span className="text-white">{healthStatus.counts.expenses}</span></span>
                                            <span>Log Stok: <span className="text-white">{healthStatus.counts.stockAdjustments}</span></span>
                                            <span>Audit Log: <span className="text-white">{healthStatus.counts.auditLogs}</span></span>
                                        </div>
                                    </div>
                                    <p className="text-green-400 text-center mt-2 font-bold">SISTEM NORMAL</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </SettingsCard>

            <SettingsCard title="Manajemen Memori (Pengarsipan)" description="Hapus data lama untuk menjaga performa aplikasi tetap cepat.">
                <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded-r mb-4">
                    <div className="flex items-start gap-3">
                        <Icon name="boxes" className="w-5 h-5 text-orange-400 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-orange-300 text-sm">Arsipkan & Hapus Data Lama</h4>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                Jika database terlalu besar, aplikasi akan menjadi lambat. Gunakan fitur ini untuk memindahkan data lama ke Excel/PDF lalu menghapusnya dari aplikasi ini.
                            </p>
                        </div>
                    </div>
                </div>
                <Button onClick={() => setIsArchivingModalOpen(true)} className="w-full sm:w-auto" variant="secondary">
                    <Icon name="database" className="w-4 h-4"/> Buka Menu Pengarsipan
                </Button>
            </SettingsCard>

            <SettingsCard title="Manajemen Penyimpanan Dropbox" description="Pantau kuota penyimpanan dan lakukan pembersihan jika penuh.">
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-4">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300">Est. Ukuran Data Aplikasi (JSON)</span>
                            <span className="text-white font-bold">{formatBytes(storageStats.localDataSize)}</span>
                        </div>

                        {isConfigured ? (
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300 flex items-center gap-2">
                                        <Icon name="share" className="w-3 h-3 text-blue-400"/>
                                        Kuota Dropbox
                                    </span>
                                    {storageStats.dropboxChecking ? (
                                        <span className="text-xs text-slate-500 animate-pulse">Memuat...</span>
                                    ) : (
                                        <span className="text-white font-bold">
                                            {formatBytes(storageStats.dropboxUsed)} / {formatBytes(storageStats.dropboxTotal)}
                                        </span>
                                    )}
                                </div>
                                {!storageStats.dropboxChecking && storageStats.dropboxTotal > 0 && (
                                    <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className={`h-2.5 rounded-full ${
                                                (storageStats.dropboxUsed / storageStats.dropboxTotal) > 0.9 ? 'bg-red-500' :
                                                (storageStats.dropboxUsed / storageStats.dropboxTotal) > 0.75 ? 'bg-yellow-500' :
                                                'bg-blue-500'
                                            }`} 
                                            style={{ width: `${Math.min((storageStats.dropboxUsed / storageStats.dropboxTotal) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 italic">Hubungkan Dropbox untuk melihat kuota.</div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* NEW: Download Archive Dropdown */}
                    <div className="relative flex-1" ref={cloudArchiveDropdownRef}>
                        <Button 
                            onClick={() => setCloudArchiveDropdownOpen(!isCloudArchiveDropdownOpen)} 
                            disabled={isArchivingCloud || !isConfigured} 
                            variant="secondary" 
                            className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-900/30"
                        >
                            {isArchivingCloud ? 'Mengunduh...' : <><Icon name="download" className="w-4 h-4"/> Unduh Arsip</>}
                            <Icon name="chevron-down" className="w-3 h-3 ml-1"/>
                        </Button>
                        {isCloudArchiveDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full sm:w-48 bg-slate-700 rounded-lg shadow-xl z-20 border border-slate-600 overflow-hidden">
                                <button onClick={() => handleCloudArchive('json')} className="w-full text-left px-4 py-3 hover:bg-slate-600 text-white text-xs flex items-center gap-2">
                                    <Icon name="database" className="w-4 h-4 text-green-400"/> JSON (Backup Full)
                                </button>
                                <div className="border-t border-slate-600 my-1"></div>
                                <p className="px-4 py-1 text-[10px] text-slate-400 uppercase font-bold">Laporan Terbaca</p>
                                <button onClick={() => handleCloudArchive('xlsx')} className="w-full text-left px-4 py-2 hover:bg-slate-600 text-white text-xs flex items-center gap-2">
                                    <Icon name="boxes" className="w-4 h-4"/> Excel (.xlsx)
                                </button>
                                <button onClick={() => handleCloudArchive('csv')} className="w-full text-left px-4 py-2 hover:bg-slate-600 text-white text-xs flex items-center gap-2">
                                    <Icon name="tag" className="w-4 h-4"/> CSV
                                </button>
                                <button onClick={() => handleCloudArchive('pdf')} className="w-full text-left px-4 py-2 hover:bg-slate-600 text-white text-xs flex items-center gap-2">
                                    <Icon name="printer" className="w-4 h-4"/> PDF
                                </button>
                            </div>
                        )}
                    </div>

                    <Button 
                        onClick={handleCloudPurge} 
                        disabled={isCleaning || !isConfigured} 
                        variant="danger" 
                        className="flex-1"
                    >
                        {isCleaning ? 'Memproses...' : <><Icon name="trash" className="w-4 h-4"/> Hapus Laporan</>}
                    </Button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                    Gunakan "Unduh Arsip" untuk menyimpan data cabang ke file sebelum Anda menghapusnya dari Dropbox.
                </p>
            </SettingsCard>

            <SettingsCard title="Backup & Restore Lokal" description="Unduh file database (.json) ke perangkat ini atau pulihkan data dari file cadangan.">
                <div className="flex flex-wrap gap-3">
                    <Button onClick={dataService.exportData} variant="secondary">
                        <Icon name="download" className="w-4 h-4"/> Backup (JSON)
                    </Button>
                    
                    <Button onClick={() => jsonInputRef.current?.click()} variant="danger" className="border border-red-700 bg-red-900/30 text-red-100 hover:bg-red-800">
                        <Icon name="upload" className="w-4 h-4"/> Restore (JSON)
                    </Button>
                    <input type="file" ref={jsonInputRef} onChange={handleJSONRestore} className="hidden" accept=".json" />
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

            <SettingsCard title="Koneksi Cloud (Dropbox)" description="Hubungkan akun Dropbox untuk backup otomatis dan sinkronisasi antar cabang.">
                <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r mb-4">
                    <div className="flex items-start gap-3">
                        <Icon name="info-circle" className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-blue-300 text-sm">Mode Sinkronisasi</h4>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                Sistem akan menyimpan file backup JSON & laporan harian CSV ke Dropbox App Folder Anda.
                            </p>
                            {lastPullTime && (
                                <p className="text-xs text-green-300 mt-2 font-mono">
                                    ✔ Terakhir Update Master Data: {new Date(parseInt(lastPullTime)).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-slate-300">Dropbox App</label>
                            <button onClick={() => setShowDbxHelpModal(true)} className="text-xs text-sky-400 hover:underline flex items-center gap-1">
                                <Icon name="question" className="w-3 h-3"/> Bantuan & Koneksi
                            </button>
                        </div>
                        <div className="grid gap-3">
                            <input 
                                type="text" 
                                placeholder="App Key"
                                value={dbxKey} 
                                onChange={(e) => setDbxKey(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            />
                            {/* Mask the secret if already saved and connected */}
                            <input 
                                type="password" 
                                placeholder="App Secret"
                                value={dbxSecret} 
                                onChange={(e) => setDbxSecret(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            />
                            {isConfigured ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-2 rounded border border-green-800">
                                        <Icon name="check-circle-fill" className="w-4 h-4"/>
                                        <span className="text-xs font-bold">Terhubung (Token Terenkripsi)</span>
                                        <button onClick={handleDisconnect} className="ml-auto text-xs text-red-400 underline">Putuskan</button>
                                    </div>
                                    <Button onClick={handleOpenPairingGenerator} className="w-full bg-blue-700 hover:bg-blue-600 text-white">
                                        <Icon name="share" className="w-4 h-4" /> Pairing
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-xs text-yellow-500 bg-yellow-900/10 p-2 rounded border border-yellow-800">
                                        Belum Terhubung. Klik "Bantuan & Koneksi" atau "Input Kode".
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => setIsScanningPairing(true)} variant="secondary" className="flex-1 border-dashed border-2 border-slate-500">
                                            <Icon name="camera" className="w-4 h-4" /> Scan QR
                                        </Button>
                                        <Button onClick={handleInputCodeInit} variant="secondary" className="flex-1 border-dashed border-2 border-slate-500">
                                            <Icon name="keyboard" className="w-4 h-4" /> Input Kode
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button onClick={saveCloudSettings}>Simpan Konfigurasi</Button>
                    </div>
                </div>
            </SettingsCard>

            {/* Unified Pairing Modal (Generate/Input) */}
            <Modal isOpen={showPairingModal} onClose={() => setShowPairingModal(false)} title={pairingMode === 'generate' ? "Bagikan Akses Dropbox" : "Hubungkan ke Pusat"}>
                {pairingMode === 'generate' ? (
                    <div className="flex flex-col items-center justify-center space-y-4 p-2 text-center">
                        {pairingStep === 'pin_input' ? (
                            <div className="w-full space-y-3">
                                <p className="text-sm text-slate-300">
                                    Buat PIN Sementara untuk mengamankan kode QR ini.
                                </p>
                                <input 
                                    type="text" 
                                    maxLength={6}
                                    placeholder="PIN (cth: 1234)" 
                                    value={pairingPin}
                                    onChange={e => setPairingPin(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-center text-xl text-white font-mono tracking-widest"
                                    autoFocus
                                />
                                <p className="text-xs text-yellow-500">
                                    *Berikan PIN ini kepada Staff yang akan melakukan scan.
                                </p>
                                <Button onClick={generatePairingCode} disabled={pairingPin.length < 4} className="w-full">
                                    Buat QR Code Aman
                                </Button>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-slate-300">
                                    Pilih metode untuk membagikan akses ke perangkat cabang:
                                </p>
                                
                                {/* Option 1: QR */}
                                <div className="bg-white p-3 rounded-lg">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getQRPairingString())}`} 
                                        alt="Pairing QR" 
                                        className="w-40 h-40"
                                    />
                                </div>
                                <div className="bg-yellow-900/30 text-yellow-300 text-xs p-2 rounded border border-yellow-700">
                                    <strong>PIN: {pairingPin}</strong> (Berikan ke Staff)
                                </div>

                                <div className="w-full border-t border-slate-700 my-2"></div>

                                {/* Option 2: Text Code */}
                                <div className="w-full">
                                    <p className="text-sm text-white font-bold mb-2">Alternatif: Kode Teks</p>
                                    <textarea 
                                        readOnly
                                        value={pairingTextCode}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-slate-300 font-mono h-24 break-all"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <Button 
                                        onClick={() => copyToClipboard(pairingTextCode)}
                                        variant="secondary"
                                        className="w-full mt-2"
                                        size="sm"
                                    >
                                        <Icon name="clipboard" className="w-4 h-4"/> Salin & Kirim ke Staff
                                    </Button>
                                </div>

                                <Button onClick={() => setShowPairingModal(false)} className="w-full">Tutup</Button>
                            </>
                        )}
                    </div>
                ) : (
                    // INPUT MODE (Decrypt)
                    <div className="space-y-4">
                        {pairingStep === 'pin_input' ? (
                            <>
                                <p className="text-sm text-slate-300">
                                    Tempel (Paste) kode panjang dan masukkan PIN dari Admin Pusat.
                                </p>
                                <textarea 
                                    value={inputPairingCode}
                                    onChange={(e) => setInputPairingCode(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white font-mono h-24 break-all"
                                    placeholder="ARTEA_PAIR_SECURE::..."
                                />
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">PIN Keamanan</label>
                                    <input 
                                        type="text" 
                                        placeholder="PIN"
                                        value={pairingPin}
                                        onChange={e => setPairingPin(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white font-mono text-center tracking-widest"
                                    />
                                </div>
                                <Button onClick={executeDecryption} disabled={!inputPairingCode || !pairingPin} className="w-full">
                                    <Icon name="wifi" className="w-4 h-4"/> Dekripsi & Hubungkan
                                </Button>
                            </>
                        ) : null}
                    </div>
                )}
            </Modal>

            {/* Scan Pairing Modal (Camera) */}
            <BarcodeScannerModal 
                isOpen={isScanningPairing} 
                onClose={() => setIsScanningPairing(false)} 
                onScan={(code) => processPairingCode(code)}
            />

            {/* Dropbox Help & Connect Modal */}
            <Modal isOpen={showDbxHelpModal} onClose={() => setShowDbxHelpModal(false)} title="Hubungkan Dropbox">
                <div className="space-y-5">
                    <div className="space-y-2">
                        <h4 className="font-bold text-white text-sm">Langkah 1: Buat App</h4>
                        <ol className="list-decimal pl-5 text-xs text-slate-300 space-y-1">
                            <li>Buka <a href="https://www.dropbox.com/developers/apps" target="_blank" className="text-sky-400 underline">Dropbox App Console</a>.</li>
                            <li>Klik <strong>Create App</strong>.</li>
                            <li>Pilih <strong>Scoped Access</strong> {'>'} <strong>App Folder</strong> {'>'} Beri Nama App.</li>
                            <li>Masuk ke tab <strong>Permissions</strong>: Centang <code>files.content.write</code> dan <code>files.content.read</code>. Klik Submit.</li>
                            <li>Masuk ke tab <strong>Settings</strong>:
                                <ul className="list-disc pl-4 mt-1 space-y-1">
                                    <li>Salin <strong>App Key</strong> dan <strong>App Secret</strong> ke aplikasi ini.</li>
                                    <li><strong className="text-yellow-400">PENTING:</strong> Biarkan bagian <strong>Redirect URIs</strong> KOSONG. Jangan diisi URL apapun.</li>
                                </ul>
                            </li>
                        </ol>
                    </div>

                    <div className="border-t border-slate-700"></div>

                    <div className="space-y-3">
                        <h4 className="font-bold text-white text-sm">Langkah 2: Dapatkan Izin</h4>
                        <p className="text-xs text-slate-400">
                            Pastikan Anda sudah mengisi App Key & Secret di form utama, lalu klik tombol di bawah. Jendela baru akan terbuka, klik "Allow/Izinkan", lalu Anda akan mendapatkan kode.
                        </p>
                        <Button onClick={handleDbxConnect} variant="secondary" className="w-full bg-blue-600 hover:bg-blue-500 text-white border-none">
                            <Icon name="share" className="w-4 h-4"/> Buka Halaman Izin Dropbox
                        </Button>
                    </div>

                    <div className="border-t border-slate-700"></div>

                    <div className="space-y-3">
                        <h4 className="font-bold text-white text-sm">Langkah 3: Masukkan Kode</h4>
                        <p className="text-xs text-slate-400">
                            Tempel (Paste) kode yang Anda dapatkan di sini untuk mengaktifkan koneksi permanen.
                        </p>
                        <input 
                            type="text" 
                            placeholder="Tempel Access Code di sini..." 
                            value={dbxAuthCode}
                            onChange={(e) => setDbxAuthCode(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                        />
                        <Button onClick={handleDbxExchange} disabled={!dbxAuthCode || isDbxConnecting} className="w-full">
                            {isDbxConnecting ? 'Menghubungkan...' : 'Hubungkan & Simpan Token'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <DataArchivingModal 
                isOpen={isArchivingModalOpen} 
                onClose={() => setIsArchivingModalOpen(false)} 
            />
        </div>
    );
};

export default DataTab;

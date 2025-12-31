
import React, { useState, useRef, useEffect } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import { dataService } from '../../services/dataService';
import { supabaseService, SETUP_SQL_SCRIPT } from '../../services/supabaseService';
import { dropboxService } from '../../services/dropboxService';
import { decryptReport } from '../../utils/crypto';
import { useData } from '../../context/DataContext';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';
import { db } from '../../services/db'; // Import DB directly for health check
import type { CartItem, Transaction as TransactionType } from '../../types';

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
    const { restoreData } = useData();
    const { importTransactions } = useFinance();
    const { showAlert } = useUI();
    
    // Cloud Settings State
    const [dbxKey, setDbxKey] = useState(localStorage.getItem('ARTEA_DBX_KEY') || '');
    const [dbxSecret, setDbxSecret] = useState(localStorage.getItem('ARTEA_DBX_SECRET') || '');
    const [dbxRefreshToken, setDbxRefreshToken] = useState(localStorage.getItem('ARTEA_DBX_REFRESH_TOKEN') || '');
    
    const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('ARTEA_SB_URL') || '');
    const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('ARTEA_SB_KEY') || '');
    
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [showDbxHelpModal, setShowDbxHelpModal] = useState(false);
    const [dbxAuthCode, setDbxAuthCode] = useState('');
    const [isDbxConnecting, setIsDbxConnecting] = useState(false);
    
    // Import State
    const [encryptedInput, setEncryptedInput] = useState('');
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [isCleaning, setIsCleaning] = useState(false);

    // Health Check State
    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [isChecking, setIsChecking] = useState(false);

    const saveCloudSettings = () => {
        localStorage.setItem('ARTEA_DBX_KEY', dbxKey);
        localStorage.setItem('ARTEA_DBX_SECRET', dbxSecret);
        localStorage.setItem('ARTEA_DBX_REFRESH_TOKEN', dbxRefreshToken);
        
        localStorage.setItem('ARTEA_SB_URL', supabaseUrl);
        localStorage.setItem('ARTEA_SB_KEY', supabaseKey);
        
        showAlert({ type: 'alert', title: 'Tersimpan', message: 'Konfigurasi Cloud berhasil disimpan.' });
    };

    const copySqlToClipboard = () => {
        navigator.clipboard.writeText(SETUP_SQL_SCRIPT);
        showAlert({ type: 'alert', title: 'Disalin', message: 'Script SQL berhasil disalin ke clipboard.' });
    };

    // --- System Health Check ---
    const runHealthCheck = async () => {
        setIsChecking(true);
        setHealthStatus(null);
        try {
            // Check Local DB Integrity
            const tables = [
                'products', 'transactionRecords', 'users', 'expenses', 'customers', 
                'stockAdjustments', 'auditLogs'
            ];
            
            const results: any = {};
            for (const table of tables) {
                // @ts-ignore
                const count = await db[table].count();
                results[table] = count;
            }

            // Check Storage Quota
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
            setDbxRefreshToken(refreshToken);
            localStorage.setItem('ARTEA_DBX_REFRESH_TOKEN', refreshToken);
            // Also save key/secret immediately
            localStorage.setItem('ARTEA_DBX_KEY', dbxKey);
            localStorage.setItem('ARTEA_DBX_SECRET', dbxSecret);
            
            setDbxAuthCode('');
            setShowDbxHelpModal(false);
            showAlert({ type: 'alert', title: 'Terhubung!', message: 'Dropbox berhasil dihubungkan. Token telah disimpan.' });
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: e.message });
        } finally {
            setIsDbxConnecting(false);
        }
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

    const handleCloudPurge = () => {
        showAlert({
            type: 'confirm',
            title: 'Kosongkan Riwayat Cloud?',
            message: (
                <div className="text-left text-sm space-y-2">
                    <p>Tindakan ini akan <strong>MENGHAPUS SEMUA</strong> riwayat transaksi, log stok, dan audit di Supabase & Dropbox untuk mengatasi penyimpanan penuh.</p>
                    <p className="bg-slate-700 p-2 rounded border border-slate-600">
                        ⚠️ Data Master (Produk, Pelanggan, Diskon) di Cloud <strong>TIDAK</strong> akan dihapus.
                    </p>
                    <p>Sebelum menghapus, sistem akan otomatis mengunduh <strong>Backup Lokal (JSON)</strong> ke perangkat ini sebagai arsip.</p>
                </div>
            ),
            confirmVariant: 'danger',
            confirmText: 'Unduh Backup & Hapus',
            onConfirm: async () => {
                setIsCleaning(true);
                try {
                    await dataService.exportData(); 

                    let messages = [];
                    if (supabaseUrl && supabaseKey) {
                        supabaseService.init(supabaseUrl, supabaseKey);
                        const res = await supabaseService.clearOperationalData();
                        messages.push(res.success ? "✅ Supabase: Berhasil dibersihkan" : `❌ Supabase: ${res.message}`);
                    }
                    if (dbxRefreshToken && dbxKey && dbxSecret) {
                        // Manually re-init for maintenance task if needed, currently service pulls from localstorage
                        const res = await dropboxService.clearOldBackups();
                        messages.push(res.success ? "✅ Dropbox: Berhasil dibersihkan" : `❌ Dropbox: ${res.message}`);
                    }

                    showAlert({
                        type: 'alert',
                        title: 'Proses Selesai',
                        message: (
                            <ul className="list-disc pl-5 text-left text-sm">
                                <li>File Backup telah diunduh. Simpan baik-baik.</li>
                                {messages.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                        )
                    });

                } catch (e: any) {
                    showAlert({ type: 'alert', title: 'Gagal', message: e.message });
                } finally {
                    setIsCleaning(false);
                }
            }
        });
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

            <SettingsCard title="Manajemen Penyimpanan Cloud" description="Gunakan jika penyimpanan Cloud (Supabase/Dropbox) penuh atau mencapai kuota.">
                <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded-r mb-4">
                    <div className="flex items-start gap-3">
                        <Icon name="warning" className="w-5 h-5 text-orange-400 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-orange-300 text-sm">Pembersihan Berkala</h4>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                Layanan Cloud gratis memiliki batas penyimpanan. Tombol di bawah ini akan:
                            </p>
                            <ol className="list-decimal pl-4 text-xs text-slate-400 mt-2 space-y-1">
                                <li>Memaksa unduh <strong>Backup Lokal (.json)</strong> untuk arsip Anda.</li>
                                <li>Menghapus semua riwayat transaksi & log lama di Cloud (Supabase & Dropbox).</li>
                                <li>Mengembalikan kapasitas penyimpanan Cloud menjadi kosong.</li>
                                <li>Data Produk & Pelanggan di Cloud <strong>TIDAK</strong> akan dihapus.</li>
                            </ol>
                        </div>
                    </div>
                </div>
                <Button onClick={handleCloudPurge} disabled={isCleaning} variant="danger" className="w-full sm:w-auto">
                    {isCleaning ? 'Sedang Memproses...' : <><Icon name="trash" className="w-4 h-4"/> Kosongkan Riwayat Cloud (Reset)</>}
                </Button>
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
                    {/* Supabase Section */}
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

                    {/* Dropbox Section */}
                    <div className="border-t border-slate-700 my-4 pt-4">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-slate-300">Dropbox App (Backup File)</label>
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
                            <input 
                                type="password" 
                                placeholder="App Secret"
                                value={dbxSecret} 
                                onChange={(e) => setDbxSecret(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            />
                            {dbxRefreshToken ? (
                                <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-2 rounded border border-green-800">
                                    <Icon name="check-circle-fill" className="w-4 h-4"/>
                                    <span className="text-xs font-bold">Terhubung (Refresh Token Tersimpan)</span>
                                    <button onClick={() => {setDbxRefreshToken(''); localStorage.removeItem('ARTEA_DBX_REFRESH_TOKEN');}} className="ml-auto text-xs text-red-400 underline">Putuskan</button>
                                </div>
                            ) : (
                                <div className="text-xs text-yellow-500 bg-yellow-900/10 p-2 rounded border border-yellow-800">
                                    Belum Terhubung. Klik tombol "Bantuan & Koneksi" di atas.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button onClick={saveCloudSettings}>Simpan Konfigurasi Cloud</Button>
                    </div>
                </div>
            </SettingsCard>

            {/* Supabase Help Modal */}
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
        </div>
    );
};

export default DataTab;

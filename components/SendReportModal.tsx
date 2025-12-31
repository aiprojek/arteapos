
import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { useUI } from '../context/UIContext';
import { dataService } from '../services/dataService';
import { encryptReport } from '../utils/crypto';
import { CURRENCY_FORMATTER } from '../constants';
import type { Transaction as TransactionType } from '../types';
import { supabaseService } from '../services/supabaseService';
import { dropboxService } from '../services/dropboxService';
import { useProduct } from '../context/ProductContext'; // Import context product
import { useSettings } from '../context/SettingsContext';

interface SendReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: TransactionType[];
    adminWhatsapp?: string;
    adminTelegram?: string;
    startingCash?: number;
    cashIn?: number;
    cashOut?: number;
}

const SendReportModal: React.FC<SendReportModalProps> = ({ 
    isOpen, onClose, data, adminWhatsapp, adminTelegram, 
    startingCash = 0, cashIn = 0, cashOut = 0 
}) => {
    const { showAlert } = useUI();
    const { stockAdjustments } = useProduct(); // Access stock adjustment history
    const { receiptSettings } = useSettings();
    const [isSyncing, setIsSyncing] = useState(false);

    const summary = useMemo(() => {
        const totalSales = data.reduce((sum, t) => sum + t.total, 0);
        const totalTransactions = data.length;
        const cashSales = data.reduce((sum, t) => {
            const cashPay = t.payments.find(p => p.method === 'cash');
            return sum + (cashPay ? cashPay.amount : 0);
        }, 0);
        
        // Find time range
        const times = data.map(t => new Date(t.createdAt).getTime());
        const minTime = times.length ? new Date(Math.min(...times)) : new Date();
        const maxTime = times.length ? new Date(Math.max(...times)) : new Date();

        // Calculate Stock Adjustments (Restock & Waste) for this session/day
        const adjustmentsToday = stockAdjustments.filter(sa => {
            const adjTime = new Date(sa.createdAt).getTime();
            if (data.length > 0) {
                // Add buffer to range
                return adjTime >= minTime.getTime() - 600000 && adjTime <= maxTime.getTime() + 600000;
            } else {
                const todayStart = new Date();
                todayStart.setHours(0,0,0,0);
                return adjTime >= todayStart.getTime();
            }
        });

        // Separate In (Restock) and Out (Waste)
        const stockInSummary = adjustmentsToday
            .filter(adj => adj.change > 0)
            .map(adj => `- ${adj.productName}: +${adj.change}`)
            .join('\n');

        const stockOutSummary = adjustmentsToday
            .filter(adj => adj.change < 0)
            .map(adj => {
                // Extract reason from notes if possible (e.g. "[Cacat] Note...")
                // Or just show full note
                return `- ${adj.productName}: ${adj.change} (${adj.notes || 'Rusak/Hilang'})`;
            })
            .join('\n');

        return { totalSales, totalTransactions, cashSales, minTime, maxTime, stockInSummary, stockOutSummary };
    }, [data, stockAdjustments]);

    if (!isOpen) return null;

    // Helper to format Date
    const fmtTime = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const fmtDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    // 1. Send Short Summary via Chat
    const handleSendSummary = (platform: 'whatsapp' | 'telegram') => {
        if (data.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data untuk dikirim.' });
            return;
        }

        const finalCash = startingCash + summary.cashSales + cashIn - cashOut;
        const storeName = receiptSettings.shopName;
        const storeId = receiptSettings.storeId || '-';

        const message = `*LAPORAN SESI KASIR*\n` +
            `🏢 ${storeName} (${storeId})\n` +
            `📅 ${fmtDate(summary.minTime)}\n` +
            `⏰ ${fmtTime(summary.minTime)} - ${fmtTime(summary.maxTime)}\n\n` +
            `📊 *RINGKASAN PENJUALAN*\n` +
            `🛒 Transaksi: ${summary.totalTransactions}\n` +
            `💰 Omzet: ${CURRENCY_FORMATTER.format(summary.totalSales)}\n\n` +
            `💵 *ARUS KAS (LACI)*\n` +
            `➕ Modal Awal: ${CURRENCY_FORMATTER.format(startingCash)}\n` +
            `➕ Tunai Masuk: ${CURRENCY_FORMATTER.format(summary.cashSales)}\n` +
            (cashIn > 0 ? `➕ Kas Masuk Lain: ${CURRENCY_FORMATTER.format(cashIn)}\n` : '') +
            (cashOut > 0 ? `➖ Kas Keluar: ${CURRENCY_FORMATTER.format(cashOut)}\n` : '') +
            `-------------------\n` +
            `✅ *TOTAL UANG FISIK: ${CURRENCY_FORMATTER.format(finalCash)}*\n` +
            (summary.stockInSummary ? `\n📦 *BARANG MASUK (RESTOCK)*\n${summary.stockInSummary}\n` : '') +
            (summary.stockOutSummary ? `\n🗑️ *BARANG KELUAR/WASTE*\n${summary.stockOutSummary}\n` : '') +
            `\n_Dikirim dari Artea POS_`;

        const encodedMsg = encodeURIComponent(message);
        let url = '';

        if (platform === 'whatsapp') {
            const phoneNumber = adminWhatsapp ? adminWhatsapp.replace(/\D/g, '') : '';
            const target = phoneNumber.startsWith('0') ? `62${phoneNumber.slice(1)}` : (phoneNumber.startsWith('62') ? phoneNumber : `62${phoneNumber}`);
            
            if (!target) {
                 showAlert({ type: 'alert', title: 'Nomor WhatsApp Kosong', message: 'Silakan atur nomor WhatsApp admin di Pengaturan.' });
                 return;
            }
            url = `https://wa.me/${target}?text=${encodedMsg}`;
        } else if (platform === 'telegram') {
             // Use direct username link if available
             if (adminTelegram) {
                 const username = adminTelegram.replace('@', '');
                 url = `https://t.me/${username}?text=${encodedMsg}`;
             } else {
                 // Fallback for share URL
                 url = `https://t.me/share/url?url=&text=${encodedMsg}`;
             }
        }

        window.open(url, '_blank');
        onClose();
    };

    // 2. Share Detailed CSV File (Bypasses Text Limit)
    const handleShareFile = async () => {
        if (data.length === 0) return;

        const csvContent = dataService.generateTransactionsCSVString(data);
        const fileName = `Laporan_Transaksi_${receiptSettings.storeId}_${new Date().toISOString().slice(0, 10)}.csv`;
        const file = new File([csvContent], fileName, { type: 'text/csv' });

        // Check if Web Share API supports files (Works on Android/iOS)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'Laporan Transaksi Detail',
                    text: 'Berikut adalah lampiran detail transaksi (CSV).',
                    files: [file],
                });
                onClose();
            } catch (error) {
                if ((error as any).name !== 'AbortError') {
                    console.error("Share failed", error);
                    fallbackDownload();
                }
            }
        } else {
            // Fallback for Desktop: Download file
            fallbackDownload();
        }
    };

    // 3. Encrypted Report
    const handleSendEncrypted = (platform: 'whatsapp' | 'telegram') => {
        if (data.length === 0) return;

        // Generate CSV-like payload or pure JSON
        const payload = data.map(t => ({
            id: t.id,
            createdAt: t.createdAt,
            total: t.total,
            items: t.items.map(i => `${i.name} (x${i.quantity})`).join(', '),
            userName: t.userName,
            paymentStatus: t.paymentStatus,
            amountPaid: t.amountPaid,
            storeId: t.storeId || receiptSettings.storeId || 'LOCAL' // INCLUDE STORE ID
        }));

        const encryptedString = encryptReport(payload);
        
        const message = `🔐 *LAPORAN TERENKRIPSI*\n` +
            `Cabang: ${receiptSettings.storeId}\n` +
            `Tanggal: ${fmtDate(summary.minTime)}\n` +
            `Omzet: ${CURRENCY_FORMATTER.format(summary.totalSales)}\n` +
            `Total Fisik: ${CURRENCY_FORMATTER.format(startingCash + summary.cashSales + cashIn - cashOut)}\n\n` +
            (summary.stockOutSummary ? `🗑️ *WASTE HARI INI*\n${summary.stockOutSummary}\n\n` : '') +
            `*KODE DATA (Anti-Edit):*\n` +
            `${encryptedString}\n\n` +
            `(Salin pesan ini & tempel di menu Import Transaksi Admin)`;

        const encodedMsg = encodeURIComponent(message);
        let url = '';

        if (platform === 'whatsapp') {
            const phoneNumber = adminWhatsapp ? adminWhatsapp.replace(/\D/g, '') : '';
            const target = phoneNumber.startsWith('0') ? `62${phoneNumber.slice(1)}` : (phoneNumber.startsWith('62') ? phoneNumber : `62${phoneNumber}`);
            if (!target) {
                 showAlert({ type: 'alert', title: 'Nomor WhatsApp Kosong', message: 'Silakan atur nomor WhatsApp admin di Pengaturan.' });
                 return;
            }
            url = `https://wa.me/${target}?text=${encodedMsg}`;
        } else if (platform === 'telegram') {
             if (adminTelegram) {
                 const username = adminTelegram.replace('@', '');
                 url = `https://t.me/${username}?text=${encodedMsg}`;
             } else {
                 url = `https://t.me/share/url?url=&text=${encodedMsg}`;
             }
        }

        window.open(url, '_blank');
        onClose();
    };

    const fallbackDownload = () => {
        const csvContent = dataService.generateTransactionsCSVString(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Laporan_Detail_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showAlert({
            type: 'alert',
            title: 'File Diunduh',
            message: 'Perangkat Anda tidak mendukung berbagi file langsung. File laporan telah diunduh. Silakan kirim file tersebut secara manual ke Admin via WhatsApp Web/Desktop.'
        });
        onClose();
    };

    // 4. Cloud Sync Handler (Accessible to Staff)
    const handleCloudSync = async () => {
        setIsSyncing(true);
        let messages = [];
        
        // 1. Coba Dropbox
        const dbxToken = localStorage.getItem('ARTEA_DBX_TOKEN');
        if (dbxToken) {
            try {
                // A. Upload Full Backup (JSON) - Untuk Restore
                await dropboxService.uploadBackup();
                
                // B. Upload Laporan CSV Harian (Transaksi & Stok) - Untuk Admin Baca
                await dropboxService.uploadCSVReports();

                messages.push("✅ Dropbox: Berhasil (Backup + Laporan CSV)");
            } catch (e: any) {
                messages.push(`❌ Dropbox: Gagal (${e.message})`);
            }
        }

        // 2. Coba Supabase
        const sbUrl = localStorage.getItem('ARTEA_SB_URL');
        const sbKey = localStorage.getItem('ARTEA_SB_KEY');
        if (sbUrl && sbKey) {
            try {
                supabaseService.init(sbUrl, sbKey);
                const opRes = await supabaseService.syncOperationalDataUp();
                
                if (opRes.success) {
                    messages.push("✅ Supabase: Berhasil (Data & Stok)");
                } else {
                    messages.push(`❌ Supabase: Gagal (${opRes.message})`);
                }
            } catch (e: any) {
                messages.push(`❌ Supabase: Error (${e.message})`);
            }
        }

        setIsSyncing(false);

        if (messages.length === 0) {
            showAlert({ 
                type: 'alert', 
                title: 'Belum Dikonfigurasi', 
                message: 'Admin belum mengatur koneksi Dropbox atau Supabase di menu Pengaturan.' 
            });
        } else {
            showAlert({
                type: 'alert',
                title: 'Status Sinkronisasi',
                message: (
                    <ul className="text-left list-disc pl-5">
                        {messages.map((m, i) => <li key={i} className="mb-1">{m}</li>)}
                    </ul>
                )
            });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kirim Laporan ke Admin">
            <div className="space-y-6">
                
                {/* Opsi 0: Sync Cloud (New for Staff) */}
                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                    <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                        <Icon name="upload" className="w-4 h-4 text-purple-400"/> Sinkronisasi Cloud
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                        Kirim data transaksi dan stok terbaru ke server (Dropbox/Supabase) agar Admin bisa memantau dari jauh.
                    </p>
                    <Button onClick={handleCloudSync} disabled={isSyncing} className="w-full bg-purple-700 hover:bg-purple-600 text-white border-none">
                        {isSyncing ? 'Sedang Mengirim...' : <><Icon name="wifi" className="w-4 h-4" /> Sync Sekarang</>}
                    </Button>
                </div>

                {/* Option 1: Ringkasan */}
                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                    <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                        <Icon name="chat" className="w-4 h-4 text-[#52a37c]"/> Opsi 1: Ringkasan Cepat
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                        Mengirim ringkasan omzet dan total setoran via pesan teks.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <Button size="sm" onClick={() => handleSendSummary('whatsapp')} className="bg-[#25D366] hover:bg-[#1da851] text-white border-none">
                            <Icon name="whatsapp" className="w-4 h-4" /> WhatsApp
                        </Button>
                        <Button size="sm" onClick={() => handleSendSummary('telegram')} className="bg-[#0088cc] hover:bg-[#0077b5] text-white border-none">
                            <Icon name="telegram" className="w-4 h-4" /> Telegram
                        </Button>
                    </div>
                </div>

                {/* Option 2: Laporan Aman */}
                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                    <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                        <Icon name="lock" className="w-4 h-4 text-yellow-400"/> Opsi 2: Laporan Aman (Anti-Edit)
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                        Mengirim kode terenkripsi. Angka penjualan dijamin asli. Admin perlu mengimpor kode ini.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <Button size="sm" onClick={() => handleSendEncrypted('whatsapp')} variant="secondary" className="border-slate-500">
                            <Icon name="whatsapp" className="w-4 h-4" /> WhatsApp
                        </Button>
                        <Button size="sm" onClick={() => handleSendEncrypted('telegram')} variant="secondary" className="border-slate-500">
                            <Icon name="telegram" className="w-4 h-4" /> Telegram
                        </Button>
                    </div>
                </div>

                {/* Option 3: Detail File */}
                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                    <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                        <Icon name="database" className="w-4 h-4 text-blue-400"/> Opsi 3: File CSV Detail
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                        Mengirim file CSV berisi rincian item.
                    </p>
                    <Button onClick={handleShareFile} className="w-full" variant="secondary">
                        <Icon name="share" className="w-4 h-4" /> Bagikan File
                    </Button>
                </div>

            </div>
        </Modal>
    );
}

export default SendReportModal;

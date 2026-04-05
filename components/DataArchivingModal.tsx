
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import Skeleton from './Skeleton';
import { dataService } from '../services/dataService';
import { generateTablePDF } from '../utils/pdfGenerator';
import { useSettings } from '../context/SettingsContext';
import { useUIActions } from '../context/UIContext';
import { requestAutoSync } from '../services/appEvents';

interface DataArchivingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DataArchivingModal: React.FC<DataArchivingModalProps> = ({ isOpen, onClose }) => {
    const { receiptSettings } = useSettings();
    const { showAlert } = useUIActions();
    const [range, setRange] = useState<'1m' | '3m' | '6m' | '1y'>('3m');
    const [counts, setCounts] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [hasExported, setHasExported] = useState(false);
    const [isPurging, setIsPurging] = useState(false);

    useEffect(() => {
        if (isOpen) {
            calculateStats();
            setHasExported(false); // Reset export status
        }
    }, [isOpen, range]);

    const getCutoffDate = () => {
        const d = new Date();
        if (range === '1m') d.setMonth(d.getMonth() - 1);
        if (range === '3m') d.setMonth(d.getMonth() - 3);
        if (range === '6m') d.setMonth(d.getMonth() - 6);
        if (range === '1y') d.setFullYear(d.getFullYear() - 1);
        return d;
    };

    const calculateStats = async () => {
        setLoading(true);
        try {
            const cutoff = getCutoffDate();
            const data = await dataService.getOldOperationalData(cutoff);
            
            const totalCount = 
                data.transactions.length + 
                data.expenses.length + 
                data.purchases.length + 
                data.stockLogs.length + 
                data.auditLogs.length;

            setCounts({
                total: totalCount,
                transactions: data.transactions.length,
                logs: data.auditLogs.length,
                others: data.expenses.length + data.purchases.length + data.stockLogs.length
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: 'xlsx' | 'pdf' | 'json') => {
        setLoading(true);
        try {
            const cutoff = getCutoffDate();
            const data = await dataService.getOldOperationalData(cutoff);
            const timestamp = new Date().toISOString().slice(0, 10);
            const prefix = `Archive_${range}_${timestamp}`;

            if (data.transactions.length === 0 && data.expenses.length === 0) {
                showAlert({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data lama untuk diarsipkan pada rentang ini.' });
                setLoading(false);
                return;
            }

            if (format === 'json') {
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${prefix}_FULL.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (format === 'xlsx') {
                // Prepare Transaction Rows
                const txnHeaders = ['ID', 'Waktu', 'Total', 'Item', 'Status'];
                const txnRows = data.transactions.map((t: any) => [
                    t.id, t.createdAt, t.total, (t.items||[]).map((i:any)=>i.name).join(';'), t.paymentStatus
                ]);
                dataService.exportToSpreadsheet(txnHeaders, txnRows, `${prefix}_Transactions`, 'xlsx');
            } else if (format === 'pdf') {
                const txnHeaders = ['Waktu', 'ID', 'Total', 'Status'];
                const txnRows = data.transactions.map((t: any) => [
                    new Date(t.createdAt).toLocaleDateString(), t.id.slice(-6), t.total, t.paymentStatus
                ]);
                generateTablePDF('Arsip Transaksi Lama', txnHeaders, txnRows, receiptSettings);
            }

            setHasExported(true);
            showAlert({ type: 'alert', title: 'Ekspor Berhasil', message: 'File arsip telah diunduh. Simpan file ini di tempat aman sebelum menghapus data.' });

        } catch (e: any) {
            console.error(e);
            showAlert({ type: 'alert', title: 'Gagal Ekspor', message: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handlePurge = () => {
        if (!hasExported) {
            showAlert({ type: 'alert', title: 'Belum Ekspor', message: 'Anda WAJIB mengunduh arsip data terlebih dahulu sebelum menghapus.' });
            return;
        }

        showAlert({
            type: 'confirm',
            title: 'Hapus Permanen?',
            message: `Tindakan ini akan MENGHAPUS ${counts?.total} data operasional yang lebih lama dari ${range.replace('m', ' Bulan').replace('y', ' Tahun')} dari perangkat ini.`,
            confirmVariant: 'danger',
            confirmText: 'Ya, Hapus Data',
            onConfirm: async () => {
                setIsPurging(true);
                try {
                    const cutoff = getCutoffDate();
                    // 1. Hapus Lokal
                    await dataService.deleteOperationalDataByRange(cutoff);
                    
                    // 2. Trigger Sync ke Cloud (Agar file di Cloud ikut bersih/ringan)
                    await requestAutoSync({ staffName: 'System-Admin' });

                    showAlert({ 
                        type: 'alert', 
                        title: 'Pembersihan Selesai', 
                        message: 'Database lokal berhasil dikosongkan dan perubahan telah disinkronkan ke Cloud (Dropbox).',
                        onConfirm: () => window.location.reload()
                    });
                    onClose();
                } catch (e: any) {
                    showAlert({ type: 'alert', title: 'Gagal', message: e.message });
                } finally {
                    setIsPurging(false);
                }
            }
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Pengarsipan & Pembersihan Data"
            size="xl"
            mobileLayout="fullscreen"
            bodyClassName="p-4 sm:p-6"
        >
            <div className="space-y-5">
                <div className="rounded-2xl border border-yellow-700/50 bg-yellow-950/20 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-yellow-500/10 p-2 shrink-0">
                            <Icon name="warning" className="w-5 h-5 text-yellow-300" />
                        </div>
                        <div className="space-y-1.5">
                            <h4 className="font-bold text-yellow-200 text-sm sm:text-base">Solusi saat data lama mulai menumpuk</h4>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                Fitur ini membantu menyimpan arsip lebih dulu, lalu membersihkan data lama dari perangkat agar aplikasi tetap ringan dipakai.
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                                Langkah aman: unduh arsip terlebih dahulu, simpan file di tempat aman, lalu lanjutkan pembersihan.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 sm:p-5 space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-slate-100 mb-2">Pilih usia data yang ingin dibersihkan</label>
                        <p className="text-xs text-slate-400">Data yang lebih lama dari batas ini akan dihitung dan disiapkan untuk diarsipkan.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['1m', '3m', '6m', '1y'].map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setRange(opt as any)}
                                className={`h-11 rounded-xl text-sm font-medium transition-colors ${
                                    range === opt
                                        ? 'bg-[#347758] text-white shadow'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                {opt.replace('m', ' Bulan').replace('y', ' Tahun')}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500">
                        Data yang lebih tua dari {range.replace('m', ' bulan').replace('y', ' tahun')} akan diproses.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 sm:p-5">
                    {loading ? (
                        <div className="flex flex-col items-center space-y-3 py-3">
                            <Skeleton variant="text" width={120} height={32} className="bg-slate-600" />
                            <div className="flex flex-wrap justify-center gap-3">
                                <Skeleton variant="text" width={72} height={12} className="bg-slate-700" />
                                <Skeleton variant="text" width={72} height={12} className="bg-slate-700" />
                                <Skeleton variant="text" width={72} height={12} className="bg-slate-700" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-slate-400 text-sm mb-1">Data lama yang ditemukan</p>
                                <p className="text-3xl sm:text-4xl font-bold text-white">{counts?.total || 0}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-center">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Transaksi</p>
                                    <p className="text-sm font-semibold text-white">{counts?.transactions || 0}</p>
                                </div>
                                <div className="rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-center">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Log Audit</p>
                                    <p className="text-sm font-semibold text-white">{counts?.logs || 0}</p>
                                </div>
                                <div className="rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-center">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Data Lainnya</p>
                                    <p className="text-sm font-semibold text-white">{counts?.others || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-4 sm:p-5 space-y-4">
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Langkah 1: Unduh Arsip</p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Simpan arsip terlebih dahulu sebelum menghapus data. Pilih format yang paling sesuai dengan kebutuhan Anda.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button onClick={() => handleExport('pdf')} variant="utility" size="sm" disabled={counts?.total === 0} className="w-full h-10 sm:h-11 justify-center">
                            <Icon name="printer" className="w-4 h-4" /> PDF
                        </Button>
                        <Button onClick={() => handleExport('xlsx')} variant="utility" size="sm" disabled={counts?.total === 0} className="w-full h-10 sm:h-11 justify-center">
                            <Icon name="boxes" className="w-4 h-4" /> Excel
                        </Button>
                        <Button
                            onClick={() => handleExport('json')}
                            variant="operational"
                            size="sm"
                            disabled={counts?.total === 0}
                            className="w-full h-10 sm:h-11 justify-center"
                        >
                            <Icon name="database" className="w-4 h-4" /> JSON
                        </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                        Format JSON berisi salinan data paling lengkap. Excel dan PDF lebih nyaman untuk dibaca.
                    </p>
                </div>

                <div className={`rounded-2xl border border-red-900/50 bg-red-950/20 p-4 sm:p-5 space-y-4 transition-opacity duration-300 ${hasExported ? 'opacity-100' : 'opacity-60'}`}>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Langkah 2: Bersihkan Data Lama</p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Setelah arsip selesai diunduh, Anda bisa membersihkan data lama agar aplikasi tetap ringan dan sinkronisasi cloud ikut lebih rapi.
                        </p>
                    </div>
                    <Button
                        onClick={handlePurge}
                        disabled={isPurging || !hasExported || counts?.total === 0}
                        variant="danger"
                        className="w-full h-11"
                    >
                        {isPurging ? 'Sedang membersihkan data...' : <><Icon name="trash" className="w-4 h-4" /> Hapus & Update Cloud</>}
                    </Button>
                    {!hasExported ? (
                        <p className="text-[11px] text-red-300">
                            Tombol pembersihan akan aktif setelah Anda mengunduh arsip lebih dulu.
                        </p>
                    ) : (
                        <p className="text-[11px] text-slate-400">
                            Arsip sudah diunduh. Lanjutkan hanya jika file cadangan sudah tersimpan dengan aman.
                        </p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default DataArchivingModal;

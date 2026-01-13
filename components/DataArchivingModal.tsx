
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { dataService } from '../services/dataService';
import { generateTablePDF } from '../utils/pdfGenerator';
import { useSettings } from '../context/SettingsContext';
import { useUI } from '../context/UIContext';
import { useCloudSync } from '../context/CloudSyncContext'; // IMPORT CONTEXT

interface DataArchivingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DataArchivingModal: React.FC<DataArchivingModalProps> = ({ isOpen, onClose }) => {
    const { receiptSettings } = useSettings();
    const { showAlert } = useUI();
    const { triggerAutoSync } = useCloudSync(); // USE HOOK
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
                    await triggerAutoSync('System-Admin');

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
        <Modal isOpen={isOpen} onClose={onClose} title="Pengarsipan & Pembersihan Data">
            <div className="space-y-6">
                <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r">
                    <h4 className="font-bold text-yellow-300 text-sm mb-1 flex items-center gap-2">
                        <Icon name="warning" className="w-4 h-4"/> Solusi Memori Penuh
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        Fitur ini akan menghapus data lama dari <strong>Perangkat ini</strong> dan memperbarui file backup di <strong>Dropbox</strong> agar keduanya menjadi ringan.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Pilih Rentang Data Lama</label>
                    <div className="flex bg-slate-700 p-1 rounded-lg">
                        {['1m', '3m', '6m', '1y'].map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setRange(opt as any)}
                                className={`flex-1 py-2 text-sm rounded-md transition-colors ${range === opt ? 'bg-[#347758] text-white font-bold shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                {opt.replace('m', ' Bulan').replace('y', ' Tahun')}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                        Data yang lebih TUA dari {range.replace('m', ' Bulan').replace('y', ' Tahun')} lalu akan diproses.
                    </p>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    {loading ? (
                        <p className="text-sm text-slate-400 animate-pulse">Menghitung data...</p>
                    ) : (
                        <>
                            <p className="text-slate-400 text-sm mb-1">Ditemukan Data Lama:</p>
                            <p className="text-3xl font-bold text-white mb-2">{counts?.total || 0}</p>
                            <div className="flex justify-center gap-4 text-xs text-slate-500">
                                <span>🛒 {counts?.transactions} Transaksi</span>
                                <span>📝 {counts?.logs} Log Audit</span>
                                <span>📂 {counts?.others} Lainnya</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="space-y-3">
                    <p className="text-sm font-bold text-white">Langkah 1: Unduh Arsip (Backup)</p>
                    <div className="grid grid-cols-3 gap-2">
                        <Button onClick={() => handleExport('pdf')} variant="secondary" size="sm" disabled={counts?.total === 0}>
                            <Icon name="printer" className="w-4 h-4"/> PDF
                        </Button>
                        <Button onClick={() => handleExport('xlsx')} variant="secondary" size="sm" disabled={counts?.total === 0}>
                            <Icon name="boxes" className="w-4 h-4"/> Excel
                        </Button>
                        <Button onClick={() => handleExport('json')} variant="secondary" size="sm" disabled={counts?.total === 0} className="border border-green-500/50 text-green-400">
                            <Icon name="database" className="w-4 h-4"/> JSON (Raw)
                        </Button>
                    </div>
                </div>

                <div className={`space-y-3 transition-opacity duration-300 ${hasExported ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <p className="text-sm font-bold text-white">Langkah 2: Hapus & Sync</p>
                    <Button onClick={handlePurge} disabled={isPurging || !hasExported || counts?.total === 0} variant="danger" className="w-full">
                        {isPurging ? 'Sedang Membersihkan & Sync...' : <><Icon name="trash" className="w-4 h-4"/> Hapus & Update Cloud</>}
                    </Button>
                    {!hasExported && <p className="text-[10px] text-red-400 text-center">*Tombol ini aktif setelah Anda mengunduh arsip.</p>}
                </div>
            </div>
        </Modal>
    );
};

export default DataArchivingModal;

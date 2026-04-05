
import React, { useState, useEffect, useMemo } from 'react';
import type { AuditLog } from '../../types';
import Icon from '../Icon';
import VirtualizedTable from '../VirtualizedTable';
import { useAudit } from '../../context/AuditContext'; 
import { useUIActions } from '../../context/UIContext';
import Modal from '../Modal'; // Import Modal
import { dropboxService } from '../../services/dropboxService';
import { loadAuditCloudSource } from '../../services/cloudReadModel';

const SettingsCard: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/85 shadow-[0_10px_35px_rgba(15,23,42,0.22)]">
        <div className="border-b border-slate-700/80 bg-slate-800/90 p-4 sm:p-5">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && <p className="mt-1 text-sm leading-relaxed text-slate-400">{description}</p>}
        </div>
        <div className="space-y-4 p-4 sm:p-5">
            {children}
        </div>
    </div>
);

const AuditTab: React.FC = () => {
    const { auditLogs: localLogs, isLoadingLogs } = useAudit();
    const { showAlert } = useUIActions();
    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    const [cloudLogs, setCloudLogs] = useState<AuditLog[]>([]);
    const [isCloudLoading, setIsCloudLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // View Image State
    const [viewImage, setViewImage] = useState<string | null>(null);

    useEffect(() => {
        const loadCloudData = async () => {
            if (dataSource === 'local') return;

            if (dataSource === 'dropbox') {
                if (!dropboxService.isConfigured()) {
                    showAlert({ type: 'alert', title: 'Dropbox Belum Dikonfigurasi', message: 'Silakan hubungkan akun Dropbox di menu Data & Cloud.' });
                    setDataSource('local');
                    return;
                }
            }

            setIsCloudLoading(true);
            setCloudLogs([]);

            try {
                if (dataSource === 'dropbox') {
                    const result = await loadAuditCloudSource();
                    setCloudLogs(result.logs);
                    setLastUpdated(result.lastUpdated);
                }
            } catch (e: any) {
                console.error("Failed to load audit logs", e);
                showAlert({ type: 'alert', title: 'Gagal Memuat Log', message: e.message });
                setDataSource('local');
            } finally {
                setIsCloudLoading(false);
            }
        };

        loadCloudData();
    }, [dataSource, showAlert]);

    const activeLogs = dataSource === 'local' ? localLogs : cloudLogs;
    const isLoading = dataSource === 'local' ? isLoadingLogs : isCloudLoading;
    const filteredLogs = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return activeLogs;
        return activeLogs.filter((log) =>
            log.userName.toLowerCase().includes(keyword) ||
            log.action.toLowerCase().includes(keyword) ||
            log.details.toLowerCase().includes(keyword) ||
            new Date(log.timestamp).toLocaleString('id-ID').toLowerCase().includes(keyword) ||
            ((log as any).storeId || '').toLowerCase().includes(keyword)
        );
    }, [activeLogs, searchTerm]);
    const loginCount = filteredLogs.filter((log) => log.action === 'LOGIN').length;
    const evidenceCount = filteredLogs.filter((log) => !!log.evidenceImageUrl).length;

    const columns = [
        { label: 'Waktu', width: '1.2fr', render: (l: AuditLog) => <span className="text-slate-400 text-xs">{new Date(l.timestamp).toLocaleString()}</span> },
        { label: 'User', width: '1fr', render: (l: AuditLog) => (
            <div className="flex items-center gap-2">
                {l.evidenceImageUrl ? (
                    <button 
                        onClick={() => setViewImage(l.evidenceImageUrl || null)} 
                        className="p-1 bg-slate-700 hover:bg-blue-600 rounded text-sky-400 hover:text-white transition-colors"
                        title="Lihat Foto Wajah"
                    >
                        <Icon name="eye" className="w-3 h-3" />
                    </button>
                ) : (
                    <span className="w-5 h-5"></span> // Spacer
                )}
                <span className="text-white text-xs">{l.userName}</span>
            </div>
        ) },
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '0.8fr', 
            render: (l: any) => <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-300">{l.storeId || '-'}</span> 
        }] : []),
        { label: 'Aksi', width: '1fr', render: (l: AuditLog) => <span className={`font-bold text-xs ${l.action === 'LOGIN' ? 'text-green-400' : 'text-yellow-400'}`}>{l.action.replace(/_/g, ' ')}</span> },
        { label: 'Detail', width: '3fr', render: (l: AuditLog) => <span className="text-slate-300 text-xs">{l.details}</span> },
    ];

    return (
        <div className="animate-fade-in space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Log Tampil</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{filteredLogs.length}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Jumlah aktivitas sensitif yang sedang tampil pada sumber data aktif.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Login Tercatat</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{loginCount}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Jumlah aktivitas login yang terdeteksi pada daftar yang sedang tampil.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Foto Bukti</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{evidenceCount}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Log yang menyimpan bukti foto, misalnya saat login dengan verifikasi wajah.</p>
                </div>
            </div>

            <SettingsCard title="Audit Log" description="Riwayat aktivitas sensitif seperti login, perubahan data, refund, dan tindakan yang perlu bisa ditelusuri kembali.">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="bg-slate-700 p-1 rounded-xl flex items-center border border-slate-600 w-full lg:w-fit">
                            <button
                                onClick={() => setDataSource('local')}
                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${dataSource === 'local' ? 'bg-[#347758] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                Lokal
                            </button>
                            <button
                                onClick={() => setDataSource('dropbox')}
                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${dataSource === 'dropbox' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                Dropbox
                            </button>
                        </div>
                        {isLoading && <span className="text-xs text-slate-400 animate-pulse">Sedang memuat data...</span>}
                        {!isLoading && dataSource === 'dropbox' && lastUpdated && (
                            <span className="text-xs text-slate-500">Update {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Cari user, aksi, detail, waktu, atau cabang..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-12 text-white focus:border-[#347758] focus:ring-[#347758]"
                            />
                            <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                                    title="Bersihkan pencarian"
                                >
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-center sm:min-w-[150px]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Hasil Tampil</p>
                            <p className="mt-1 text-lg font-bold text-white">{filteredLogs.length}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-4">
                        <h4 className="font-bold text-red-300 text-sm mb-1 flex items-center gap-2">
                            <Icon name="warning" className="w-4 h-4"/> Pencatatan Sensitif Aktif
                        </h4>
                        <p className="text-xs leading-relaxed text-slate-300">
                            Semua tindakan penting seperti login, penghapusan data, perubahan harga, refund, dan aktivitas sensitif lain akan tetap tercatat agar mudah ditelusuri kembali.
                            Jika ada ikon <Icon name="eye" className="w-3 h-3 inline"/> pada baris log, Anda bisa membuka foto bukti yang ikut tersimpan bersama aktivitas tersebut.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                        {filteredLogs.length > 0 ? (
                            <>
                                <div className="md:hidden">
                                    <div className="space-y-2 p-2">
                                        {filteredLogs.map((log) => (
                                            <div key={log.id} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="truncate pr-1 text-[12px] font-bold leading-tight text-white">{log.userName}</p>
                                                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${log.action === 'LOGIN' ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                                                                {log.action.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 text-[10px] text-slate-400">
                                                            {new Date(log.timestamp).toLocaleString('id-ID')}{dataSource !== 'local' ? ` • ${(log as any).storeId || '-'}` : ''}
                                                        </p>
                                                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">{log.details}</p>
                                                    </div>
                                                </div>
                                                {log.evidenceImageUrl && (
                                                    <div className="mt-2">
                                                        <button
                                                            onClick={() => setViewImage(log.evidenceImageUrl || null)}
                                                            className="flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 text-[11px] text-sky-300 transition-colors hover:bg-sky-500/20"
                                                        >
                                                            <Icon name="eye" className="w-4 h-4" />
                                                            Lihat Bukti
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="hidden md:block h-96">
                                    <VirtualizedTable data={filteredLogs} columns={columns} rowHeight={50} minWidth={dataSource === 'local' ? 600 : 700} />
                                </div>
                            </>
                        ) : (
                            <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-slate-500">
                                {isLoading ? 'Memuat...' : 'Belum ada log audit yang sesuai dengan filter saat ini.'}
                            </div>
                        )}
                    </div>
                </div>
            </SettingsCard>

            {/* Modal View Image */}
            <Modal isOpen={!!viewImage} onClose={() => setViewImage(null)} title="Bukti Foto Login" size="xl" mobileLayout="fullscreen">
                <div className="flex justify-center p-4 bg-slate-900 rounded-lg">
                    {viewImage ? (
                        <img src={viewImage} alt="Bukti Login" className="rounded-lg shadow-lg border border-slate-700 max-h-[60vh] object-contain" />
                    ) : (
                        <p className="text-slate-500">Gambar tidak tersedia.</p>
                    )}
                </div>
                <div className="text-center mt-2 text-xs text-slate-400">
                    Foto ini diambil otomatis saat tombol PIN ditekan.
                </div>
            </Modal>
        </div>
    );
};

export default AuditTab;

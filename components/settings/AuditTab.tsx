
import React, { useState, useEffect } from 'react';
import type { AuditLog } from '../../types';
import Icon from '../Icon';
import VirtualizedTable from '../VirtualizedTable';
import { useData } from '../../context/DataContext';
import { dropboxService } from '../../services/dropboxService';
import { useUI } from '../../context/UIContext';

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

const AuditTab: React.FC = () => {
    const { data } = useData();
    const { showAlert } = useUI();
    const [dataSource, setDataSource] = useState<'local' | 'dropbox'>('local');
    const [cloudLogs, setCloudLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadCloudData = async () => {
            if (dataSource === 'local') return;

            // Pre-check credentials
            if (dataSource === 'dropbox') {
                const dbxToken = localStorage.getItem('ARTEA_DBX_REFRESH_TOKEN');
                if (!dbxToken) {
                    showAlert({ type: 'alert', title: 'Dropbox Belum Dikonfigurasi', message: 'Silakan hubungkan akun Dropbox di menu Data & Cloud.' });
                    setDataSource('local');
                    return;
                }
            }

            setIsLoading(true);
            setCloudLogs([]);

            try {
                if (dataSource === 'dropbox') {
                    const allBranches = await dropboxService.fetchAllBranchData();
                    let aggregatedLogs: any[] = [];
                    allBranches.forEach(branch => {
                        if (branch.auditLogs) {
                            // Add storeId info if not present
                            const logsWithStore = branch.auditLogs.map((l: any) => ({...l, storeId: branch.storeId}));
                            aggregatedLogs = [...aggregatedLogs, ...logsWithStore];
                        }
                    });
                    // Sort descending by time
                    aggregatedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    setCloudLogs(aggregatedLogs);
                }
            } catch (e: any) {
                console.error("Failed to load audit logs", e);
                showAlert({ type: 'alert', title: 'Gagal Memuat Log', message: e.message });
                setDataSource('local');
            } finally {
                setIsLoading(false);
            }
        };

        loadCloudData();
    }, [dataSource, showAlert]);

    const activeLogs = dataSource === 'local' ? (data.auditLogs || []) : cloudLogs;

    const columns = [
        { label: 'Waktu', width: '1.5fr', render: (l: AuditLog) => <span className="text-slate-400 text-xs">{new Date(l.timestamp).toLocaleString()}</span> },
        { label: 'User', width: '1fr', render: (l: AuditLog) => <span className="text-white text-xs">{l.userName}</span> },
        // Conditional Store Column
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '0.8fr', 
            render: (l: any) => <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-300">{l.storeId || '-'}</span> 
        }] : []),
        { label: 'Aksi', width: '1fr', render: (l: AuditLog) => <span className="font-bold text-xs text-yellow-400">{l.action.replace(/_/g, ' ')}</span> },
        { label: 'Detail', width: '3fr', render: (l: AuditLog) => <span className="text-slate-300 text-xs">{l.details}</span> },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <SettingsCard title="Audit Log (Riwayat Aktivitas Sensitif)" description="Memantau aktivitas penting seperti penghapusan produk, perubahan harga, refund, dan stock opname.">
                
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <div className="bg-slate-700 p-1 rounded-lg flex items-center border border-slate-600">
                        <button
                            onClick={() => setDataSource('local')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dataSource === 'local' ? 'bg-[#347758] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            Lokal
                        </button>
                        <button
                            onClick={() => setDataSource('dropbox')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dataSource === 'dropbox' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            Dropbox
                        </button>
                    </div>
                    {isLoading && <span className="text-xs text-slate-400 animate-pulse">Sedang memuat data dari {dataSource}...</span>}
                </div>

                {/* Security Warning Banner */}
                <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r mb-4">
                    <h4 className="font-bold text-red-300 text-sm mb-1 flex items-center gap-2">
                        <Icon name="warning" className="w-4 h-4"/> Sistem Pencatatan Aktif
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        Setiap tindakan sensitif (Hapus produk, Ubah harga, Refund, Edit Stok) yang dilakukan oleh user manapun akan <strong>terekam permanen</strong> di sini beserta waktu kejadiannya.
                    </p>
                </div>

                <div className="h-96 bg-slate-900 rounded-lg border border-slate-700">
                    {activeLogs.length > 0 ? (
                        <VirtualizedTable data={activeLogs} columns={columns} rowHeight={50} minWidth={dataSource === 'local' ? 600 : 700} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            {isLoading ? 'Memuat...' : 'Belum ada log audit.'}
                        </div>
                    )}
                </div>
            </SettingsCard>
        </div>
    );
};

export default AuditTab;

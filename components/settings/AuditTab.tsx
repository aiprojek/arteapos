
import React from 'react';
import type { AuditLog } from '../../types';
import Icon from '../Icon';
import VirtualizedTable from '../VirtualizedTable';
import { useData } from '../../context/DataContext';

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
    const columns = [
        { label: 'Waktu', width: '1.5fr', render: (l: AuditLog) => <span className="text-slate-400 text-xs">{new Date(l.timestamp).toLocaleString()}</span> },
        { label: 'User', width: '1fr', render: (l: AuditLog) => <span className="text-white text-xs">{l.userName}</span> },
        { label: 'Aksi', width: '1fr', render: (l: AuditLog) => <span className="font-bold text-xs text-yellow-400">{l.action.replace(/_/g, ' ')}</span> },
        { label: 'Detail', width: '3fr', render: (l: AuditLog) => <span className="text-slate-300 text-xs">{l.details}</span> },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <SettingsCard title="Audit Log (Riwayat Aktivitas Sensitif)" description="Memantau aktivitas penting seperti penghapusan produk, perubahan harga, refund, dan stock opname.">
                <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r mb-4">
                    <h4 className="font-bold text-blue-300 text-sm mb-2 flex items-center gap-2">
                        <Icon name="info-circle" className="w-4 h-4"/> Strategi Penggunaan Offline
                    </h4>
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                        Data ini tersimpan LOKAL. Gunakan untuk Cek Harian (Spot Check) atau investigasi selisih kas.
                    </p>
                </div>
                <div className="h-96 bg-slate-900 rounded-lg border border-slate-700">
                    {data.auditLogs && data.auditLogs.length > 0 ? (
                        <VirtualizedTable data={data.auditLogs} columns={columns} rowHeight={50} minWidth={600} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">Belum ada log audit.</div>
                    )}
                </div>
            </SettingsCard>
        </div>
    );
};

export default AuditTab;

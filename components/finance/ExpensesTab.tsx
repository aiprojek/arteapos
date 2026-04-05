
import React, { useState, useMemo, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import VirtualizedTable from '../VirtualizedTable';
import type { Expense, PaymentMethod } from '../../types';
import { compressImage } from '../../utils/imageCompression';
import { ocrService } from '../../services/ocrService';
import { useUIActions } from '../../context/UIContext';
import { Capacitor } from '@capacitor/core';
import { saveBinaryFileNative } from '../../utils/nativeHelper';
import CameraCaptureModal from '../CameraCaptureModal'; // NEW Import

interface ExpensesTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: Expense[];
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { expenses: localExpenses, addExpense, deleteExpense, updateExpense } = useFinance();
    const { showAlert } = useUIActions();
    const [isModalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ 
        description: '', 
        amount: '', 
        category: 'Operasional', 
        date: new Date().toISOString().slice(0, 10),
        evidenceImageUrl: '',
        paymentMethod: 'cash' as PaymentMethod
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    
    // UPDATED: Evidence Viewer State
    const [viewEvidence, setViewEvidence] = useState<{ url: string; filename: string } | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1); 
    
    // NEW: Camera Modal State
    const [isCameraOpen, setCameraOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeExpenses = dataSource === 'local' ? localExpenses : cloudData;

    const filteredExpenses = useMemo(() => 
        activeExpenses.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase())),
    [activeExpenses, searchTerm]);
    const totalExpenses = activeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const withEvidenceCount = activeExpenses.filter(expense => !!expense.evidenceImageUrl).length;
    const recentExpensesCount = filteredExpenses.length;

    const handleSubmit = () => {
        if (!formData.description || !formData.amount) return;
        const payload = {
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category,
            date: new Date(formData.date).toISOString(),
            amountPaid: parseFloat(formData.amount),
            evidenceImageUrl: formData.evidenceImageUrl,
            paymentMethod: formData.paymentMethod
        };

        if (editingId) {
            const old = localExpenses.find(e => e.id === editingId);
            if (old) updateExpense({ ...old, ...payload });
        } else {
            addExpense(payload);
        }
        closeModal();
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setFormData({ 
            description: '', 
            amount: '', 
            category: 'Operasional', 
            date: new Date().toISOString().slice(0, 10),
            evidenceImageUrl: '',
            paymentMethod: 'cash'
        });
    };

    const handleEdit = (exp: Expense) => {
        setEditingId(exp.id);
        setFormData({
            description: exp.description,
            amount: exp.amount.toString(),
            category: exp.category,
            date: exp.date.slice(0, 10),
            evidenceImageUrl: exp.evidenceImageUrl || '',
            paymentMethod: exp.paymentMethod || 'cash'
        });
        setModalOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setFormData(prev => ({ ...prev, evidenceImageUrl: compressed }));
            } catch (err) {
                console.error(err);
                showAlert({ type: 'alert', title: 'Error', message: 'Gagal memproses gambar.' });
            }
        }
    };

    const handleScanOCR = async () => {
        if (!formData.evidenceImageUrl) return;
        setIsScanning(true);
        try {
            const result = await ocrService.scanReceipt(formData.evidenceImageUrl);
            setFormData(prev => ({
                ...prev,
                amount: result.amount ? result.amount.toString() : prev.amount,
                date: result.date ? result.date : prev.date
            }));
            showAlert({ type: 'alert', title: 'Scan Selesai', message: `Ditemukan: ${result.amount ? 'Nominal ' + result.amount : ''} ${result.date ? 'Tanggal ' + result.date : ''}` });
        } catch (err: any) {
            showAlert({ type: 'alert', title: 'Gagal Scan', message: err.message });
        } finally {
            setIsScanning(false);
        }
    };

    const handleDownloadEvidence = async () => {
        if (!viewEvidence) return;
        try {
            const fileName = viewEvidence.filename;
            if (Capacitor.isNativePlatform()) {
                await saveBinaryFileNative(fileName, viewEvidence.url.split(',')[1]);
                showAlert({ type: 'alert', title: 'Berhasil', message: `Gambar disimpan: ${fileName}` });
            } else {
                const link = document.createElement('a');
                link.href = viewEvidence.url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: e.message });
        }
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
    const handleResetZoom = () => setZoomLevel(1);

    const columns = [
        { label: 'Tanggal', width: '1fr', render: (e: Expense) => new Date(e.date).toLocaleDateString('id-ID') },
        { label: 'Keterangan', width: '2fr', render: (e: Expense) => (
            <div className="flex items-center gap-2">
                {e.evidenceImageUrl && (
                    <button 
                        onClick={(evt) => { 
                            evt.stopPropagation(); 
                            const safeDesc = e.description.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                            setViewEvidence({
                                url: e.evidenceImageUrl!,
                                filename: `Bukti_Exp_${safeDesc}_${e.date.slice(0,10)}.jpg`
                            }); 
                            setZoomLevel(1); // Reset Zoom
                        }}
                        className="text-blue-400 hover:text-blue-300"
                        title="Lihat Bukti Foto"
                    >
                        <Icon name="camera" className="w-4 h-4" />
                    </button>
                )}
                <span>{e.description}</span>
            </div>
        ) },
        { label: 'Kat.', width: '1fr', render: (e: Expense) => <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{e.category}</span> },
        { label: 'Jumlah', width: '1fr', render: (e: Expense) => <span className="text-red-400 font-bold">{CURRENCY_FORMATTER.format(e.amount)}</span> },
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '1fr', 
            render: (e: any) => <span className="text-xs text-slate-400">{e.storeId || e.store_id || '-'}</span> 
        }] : []),
        { label: 'Aksi', width: '80px', render: (e: Expense) => (
            <div className="flex gap-2">
                {dataSource === 'local' ? (
                    <>
                        <button onClick={() => handleEdit(e)} className="text-sky-400 hover:text-white"><Icon name="edit" className="w-4 h-4"/></button>
                        <button onClick={() => deleteExpense(e.id)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4"/></button>
                    </>
                ) : <span className="text-xs text-slate-500">Read-only</span>}
            </div>
        )}
    ];

    return (
        <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Total Pengeluaran</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{CURRENCY_FORMATTER.format(totalExpenses)}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Akumulasi pengeluaran dari sumber data yang sedang aktif.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Bukti Tersimpan</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{withEvidenceCount}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Jumlah catatan pengeluaran yang sudah memiliki foto bukti.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Hasil Tampil</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{recentExpensesCount}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Jumlah pengeluaran yang sesuai dengan filter pencarian saat ini.</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder="Cari pengeluaran..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-12 text-white focus:ring-[#347758] focus:border-[#347758]" 
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
                    {dataSource === 'local' && (
                        <Button onClick={() => setModalOpen(true)} className="h-11 w-full sm:w-auto whitespace-nowrap">
                            <Icon name="plus" className="w-4 h-4" /> Catat Pengeluaran
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 overflow-hidden">
                {filteredExpenses.length > 0 ? (
                    <>
                        <div className="md:hidden">
                            <div className="space-y-2 p-2">
                                {filteredExpenses.map(expense => (
                                    <div key={expense.id} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="truncate pr-1 text-[12px] font-bold leading-tight text-white">{expense.description}</p>
                                                    <span className="rounded-full border border-slate-600 bg-slate-900/80 px-1.5 py-0.5 text-[9px] text-slate-300">{expense.category}</span>
                                                </div>
                                                <p className="mt-0.5 text-[10px] text-slate-400">
                                                    {new Date(expense.date).toLocaleDateString('id-ID')} • {expense.paymentMethod === 'cash' ? 'Tunai' : 'Non-tunai'}
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                                                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-red-300">
                                                        {CURRENCY_FORMATTER.format(expense.amount)}
                                                    </span>
                                                    {expense.evidenceImageUrl && (
                                                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-blue-300">
                                                            Ada bukti
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                                            <Button
                                                type="button"
                                                variant="utility"
                                                size="sm"
                                                onClick={() => handleEdit(expense)}
                                                disabled={dataSource !== 'local'}
                                                className="h-8 gap-1 px-2 text-[11px] sm:text-sm"
                                            >
                                                <Icon name="edit" className="w-4 h-4" />
                                                <span className="hidden min-[380px]:inline">Edit</span>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={expense.evidenceImageUrl ? 'operational' : 'danger'}
                                                size="sm"
                                                onClick={() => {
                                                    if (expense.evidenceImageUrl) {
                                                        const safeDesc = expense.description.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                                                        setViewEvidence({
                                                            url: expense.evidenceImageUrl,
                                                            filename: `Bukti_Exp_${safeDesc}_${expense.date.slice(0,10)}.jpg`
                                                        });
                                                        setZoomLevel(1);
                                                        return;
                                                    }
                                                    if (dataSource === 'local') deleteExpense(expense.id);
                                                }}
                                                disabled={dataSource !== 'local' && !expense.evidenceImageUrl}
                                                className="h-8 gap-1 px-2 text-[11px] sm:text-sm"
                                            >
                                                <Icon name={expense.evidenceImageUrl ? 'camera' : 'trash'} className="w-4 h-4" />
                                                <span className="hidden min-[380px]:inline">{expense.evidenceImageUrl ? 'Bukti' : 'Hapus'}</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="hidden md:block h-[500px]">
                            <VirtualizedTable data={filteredExpenses} columns={columns} rowHeight={50} minWidth={dataSource !== 'local' ? 900 : 800} />
                        </div>
                    </>
                ) : (
                    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                            <Icon name="finance" className="mx-auto h-10 w-10 text-slate-500" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-white">
                            {searchTerm ? 'Pengeluaran tidak ditemukan.' : 'Belum ada pengeluaran tercatat.'}
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                            {searchTerm
                                ? 'Coba ubah kata kunci pencarian atau periksa kembali keterangan yang Anda cari.'
                                : 'Catat pengeluaran pertama agar arus kas dan laporan keuangan mulai terbentuk dengan rapi.'}
                        </p>
                        {dataSource === 'local' && !searchTerm && (
                            <Button onClick={() => setModalOpen(true)} className="mt-4">
                                <Icon name="plus" className="w-4 h-4" /> Catat Pengeluaran Pertama
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"} size="xl" mobileLayout="fullscreen">
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* ... (Modal content unchanged) ... */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Foto Nota / Bukti Transfer (Opsional)</label>
                        <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-slate-600 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors">
                            {formData.evidenceImageUrl ? (
                                <div className="relative w-full">
                                    <img src={formData.evidenceImageUrl} alt="Bukti" className="h-40 w-full object-contain rounded bg-black/40" />
                                    <button 
                                        onClick={() => setFormData(prev => ({ ...prev, evidenceImageUrl: '' }))}
                                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-500"
                                        title="Hapus Foto"
                                    >
                                        <Icon name="close" className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : null}

                            {!formData.evidenceImageUrl && (
                                <div className="grid grid-cols-2 gap-3 w-full">
                                     <Button 
                                        variant="operational" 
                                        onClick={() => setCameraOpen(true)}
                                        className="flex flex-col items-center justify-center h-20 text-xs gap-1"
                                    >
                                        <Icon name="camera" className="w-6 h-6 text-slate-400" />
                                        Ambil Foto
                                    </Button>
                                    <div className="relative">
                                         <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                         <Button 
                                            variant="utility" 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full flex flex-col items-center justify-center h-20 text-xs gap-1"
                                        >
                                            <Icon name="upload" className="w-6 h-6 text-slate-400" />
                                            Upload File
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {formData.evidenceImageUrl && (
                                <div className="flex gap-2 w-full mt-2">
                                     <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                     <Button size="sm" variant="utility" onClick={() => setCameraOpen(true)} className="flex-1">
                                        Ganti Foto
                                     </Button>
                                     <Button size="sm" variant="operational" onClick={handleScanOCR} disabled={isScanning} className="flex-1">
                                         {isScanning ? 'Scanning...' : <><Icon name="eye" className="w-4 h-4" /> Scan Data (AI)</>}
                                     </Button>
                                 </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400">Tanggal</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Metode Bayar</label>
                            <select 
                                value={formData.paymentMethod} 
                                onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                            >
                                <option value="cash">Tunai (Kas Kecil)</option>
                                <option value="non-cash">Non-Tunai (Transfer/QRIS)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400">Keterangan</label>
                        <input type="text" placeholder="cth: Listrik, Gaji" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400">Jumlah (Rp)</label>
                            <input type="number" placeholder="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-bold" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Kategori</label>
                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                                <option>Operasional</option>
                                <option>Gaji Karyawan</option>
                                <option>Marketing</option>
                                <option>Maintenance</option>
                                <option>Lainnya</option>
                            </select>
                        </div>
                    </div>

                    <Button onClick={handleSubmit} className="w-full">{editingId ? "Simpan Perubahan" : "Simpan"}</Button>
                </div>
            </Modal>
            
            {/* Camera Modal */}
            <CameraCaptureModal 
                isOpen={isCameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={(img) => setFormData(prev => ({ ...prev, evidenceImageUrl: img }))}
            />

            {/* View Image Modal with Zoom */}
            <Modal isOpen={!!viewEvidence} onClose={() => setViewEvidence(null)} title="Bukti Transaksi">
                <div className="flex flex-col items-center gap-4 relative">
                    <div className="flex justify-center bg-black/40 p-2 rounded w-full overflow-hidden relative" style={{ maxHeight: '60vh' }}>
                        <div className="overflow-auto w-full h-full flex items-center justify-center">
                            {viewEvidence && (
                                <img 
                                    src={viewEvidence.url} 
                                    alt="Bukti" 
                                    style={{ 
                                        transform: `scale(${zoomLevel})`, 
                                        transformOrigin: 'top center',
                                        transition: 'transform 0.2s ease-out'
                                    }}
                                    className="max-w-full object-contain rounded" 
                                />
                            )}
                        </div>

                        {/* Floating Zoom Controls */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-slate-800/80 p-2 rounded-full backdrop-blur-sm border border-slate-600 shadow-lg z-10">
                            <button 
                                onClick={handleZoomOut} 
                                className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors"
                                title="Zoom Out"
                            >
                                <Icon name="zoom-out" className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-mono text-white min-w-[3rem] text-center">
                                {(zoomLevel * 100).toFixed(0)}%
                            </span>
                            <button 
                                onClick={handleZoomIn} 
                                className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors"
                                title="Zoom In"
                            >
                                <Icon name="zoom-in" className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-600 mx-1"></div>
                            <button 
                                onClick={handleResetZoom} 
                                className="text-xs text-sky-400 hover:text-white px-2 font-bold"
                                title="Reset Zoom"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 w-full">
                        <Button onClick={handleDownloadEvidence} className="bg-blue-600 hover:bg-blue-500 border-none">
                            <Icon name="download" className="w-4 h-4"/> Unduh
                        </Button>
                        <Button variant="utility" onClick={() => setViewEvidence(null)}>Tutup</Button>
                    </div>
                    {viewEvidence && <div className="text-[10px] text-slate-500 font-mono text-center w-full">{viewEvidence.filename}</div>}
                </div>
            </Modal>
        </div>
    );
};

export default ExpensesTab;

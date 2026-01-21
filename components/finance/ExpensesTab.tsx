
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
import { useUI } from '../../context/UIContext';
import { Capacitor } from '@capacitor/core';
import { saveBinaryFileNative } from '../../utils/nativeHelper';

interface ExpensesTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: Expense[];
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { expenses: localExpenses, addExpense, deleteExpense, updateExpense } = useFinance();
    const { showAlert } = useUI();
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
    // UPDATED: Using Object for evidence
    const [viewEvidence, setViewEvidence] = useState<{ url: string; filename: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeExpenses = dataSource === 'local' ? localExpenses : cloudData;

    const filteredExpenses = useMemo(() => 
        activeExpenses.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase())),
    [activeExpenses, searchTerm]);

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
            <div className="flex justify-between">
                <input type="text" placeholder="Cari pengeluaran..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                {dataSource === 'local' && <Button onClick={() => setModalOpen(true)}>+ Catat Pengeluaran</Button>}
            </div>
            
            <div className="h-[500px]">
                <VirtualizedTable data={filteredExpenses} columns={columns} rowHeight={50} minWidth={dataSource !== 'local' ? 900 : 800} />
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    
                    {/* ENHANCED EVIDENCE UPLOAD UI */}
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
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer py-4 w-full">
                                    <Icon name="camera" className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">Klik untuk ambil foto atau upload</p>
                                </div>
                            )}
                            
                            <div className="flex gap-2 w-full mt-2">
                                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1">
                                    {formData.evidenceImageUrl ? 'Ganti Foto' : 'Ambil Foto'}
                                </Button>
                                {formData.evidenceImageUrl && (
                                    <Button size="sm" variant="secondary" onClick={handleScanOCR} disabled={isScanning} className="flex-1 bg-blue-900/30 text-blue-300 border-blue-800">
                                        {isScanning ? 'Scanning...' : <><Icon name="eye" className="w-4 h-4" /> Scan Data (AI)</>}
                                    </Button>
                                )}
                            </div>
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

            {/* View Image Modal */}
            <Modal isOpen={!!viewEvidence} onClose={() => setViewEvidence(null)} title="Bukti Transaksi">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex justify-center bg-black/20 p-2 rounded w-full">
                        {viewEvidence && (
                            <img src={viewEvidence.url} alt="Bukti" className="max-h-[60vh] max-w-full object-contain rounded" />
                        )}
                    </div>
                    <div className="flex justify-end gap-3 w-full">
                        <Button onClick={handleDownloadEvidence} className="bg-blue-600 hover:bg-blue-500 border-none">
                            <Icon name="download" className="w-4 h-4"/> Unduh
                        </Button>
                        <Button variant="secondary" onClick={() => setViewEvidence(null)}>Tutup</Button>
                    </div>
                    {viewEvidence && <div className="text-[10px] text-slate-500 font-mono text-center w-full">{viewEvidence.filename}</div>}
                </div>
            </Modal>
        </div>
    );
};

export default ExpensesTab;

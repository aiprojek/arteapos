
import React, { useState, useMemo, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CURRENCY_FORMATTER } from '../../constants';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import VirtualizedTable from '../VirtualizedTable';
import type { OtherIncome, PaymentMethod } from '../../types';
import { compressImage } from '../../utils/imageCompression';
import { ocrService } from '../../services/ocrService';
import { useUI } from '../../context/UIContext';
import { Capacitor } from '@capacitor/core';
import { saveBinaryFileNative } from '../../utils/nativeHelper';
import CameraCaptureModal from '../CameraCaptureModal'; // NEW Import

interface IncomeTabProps {
    dataSource?: 'local' | 'cloud' | 'dropbox';
    cloudData?: OtherIncome[];
}

const IncomeTab: React.FC<IncomeTabProps> = ({ dataSource = 'local', cloudData = [] }) => {
    const { otherIncomes: localIncomes, addOtherIncome, deleteOtherIncome, updateOtherIncome } = useFinance();
    const { showAlert } = useUI();
    const [isModalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ 
        description: '', 
        amount: '', 
        category: 'Lainnya', 
        date: new Date().toISOString().slice(0, 10),
        evidenceImageUrl: '',
        paymentMethod: 'cash' as PaymentMethod
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    
    // UPDATED: View Evidence & Zoom State
    const [viewEvidence, setViewEvidence] = useState<{ url: string; filename: string } | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    // NEW: Camera Modal
    const [isCameraOpen, setCameraOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeIncomes = dataSource === 'local' ? localIncomes : cloudData;

    const filteredIncomes = useMemo(() => 
        activeIncomes.filter(i => i.description.toLowerCase().includes(searchTerm.toLowerCase())),
    [activeIncomes, searchTerm]);

    const handleSubmit = () => {
        if (!formData.description || !formData.amount) return;
        const payload = {
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category,
            date: new Date(formData.date).toISOString(),
            evidenceImageUrl: formData.evidenceImageUrl,
            paymentMethod: formData.paymentMethod
        };

        if (editingId) {
            const old = localIncomes.find(i => i.id === editingId);
            if (old) updateOtherIncome({ ...old, ...payload });
        } else {
            addOtherIncome(payload);
        }
        closeModal();
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setFormData({ 
            description: '', 
            amount: '', 
            category: 'Lainnya', 
            date: new Date().toISOString().slice(0, 10),
            evidenceImageUrl: '',
            paymentMethod: 'cash'
        });
    };

    const handleEdit = (inc: OtherIncome) => {
        setEditingId(inc.id);
        setFormData({
            description: inc.description,
            amount: inc.amount.toString(),
            category: inc.category,
            date: inc.date.slice(0, 10),
            evidenceImageUrl: inc.evidenceImageUrl || '',
            paymentMethod: inc.paymentMethod || 'cash'
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
            showAlert({ type: 'alert', title: 'Scan Selesai', message: 'Nominal & Tanggal diperbarui dari gambar.' });
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
        { label: 'Tanggal', width: '1fr', render: (i: OtherIncome) => new Date(i.date).toLocaleDateString('id-ID') },
        { label: 'Keterangan', width: '2fr', render: (i: OtherIncome) => (
            <div className="flex items-center gap-2">
                {i.evidenceImageUrl && (
                    <button 
                        onClick={(evt) => { 
                            evt.stopPropagation(); 
                            const safeDesc = i.description.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                            setViewEvidence({
                                url: i.evidenceImageUrl!,
                                filename: `Bukti_Masuk_${safeDesc}_${i.date.slice(0,10)}.jpg`
                            }); 
                            setZoomLevel(1); // Reset
                        }}
                        className="text-blue-400 hover:text-blue-300"
                        title="Lihat Bukti"
                    >
                        <Icon name="camera" className="w-4 h-4" />
                    </button>
                )}
                <span>{i.description}</span>
            </div>
        ) },
        { label: 'Kategori', width: '1fr', render: (i: OtherIncome) => <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{i.category}</span> },
        { label: 'Jumlah', width: '1fr', render: (i: OtherIncome) => <span className="text-green-400 font-bold">{CURRENCY_FORMATTER.format(i.amount)}</span> },
        ...(dataSource !== 'local' ? [{ 
            label: 'Cabang', 
            width: '1fr', 
            render: (e: any) => <span className="text-xs text-slate-400">{e.storeId || e.store_id || '-'}</span> 
        }] : []),
        { label: 'Aksi', width: '80px', render: (i: OtherIncome) => (
            <div className="flex gap-2">
                {dataSource === 'local' ? (
                    <>
                        <button onClick={() => handleEdit(i)} className="text-sky-400 hover:text-white"><Icon name="edit" className="w-4 h-4"/></button>
                        <button onClick={() => deleteOtherIncome(i.id)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4"/></button>
                    </>
                ) : <span className="text-xs text-slate-500">Read-only</span>}
            </div>
        )}
    ];

    return (
        <div className="space-y-4">
             {/* Responsive Header: Stack on Mobile, Row on Sm */}
            <div className="flex flex-col sm:flex-row justify-between gap-2">
                <input 
                    type="text" 
                    placeholder="Cari pemasukan..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full sm:w-auto flex-grow bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-[#347758] focus:border-[#347758]" 
                />
                {dataSource === 'local' && (
                    <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto whitespace-nowrap">
                        <Icon name="plus" className="w-4 h-4" /> Catat Pemasukan
                    </Button>
                )}
            </div>
            
            <div className="h-[500px]">
                <VirtualizedTable data={filteredIncomes} columns={columns} rowHeight={50} minWidth={dataSource !== 'local' ? 900 : 800}/>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Pemasukan" : "Catat Pemasukan Lain"}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* ... (Modal content unchanged) ... */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Foto Bukti (Opsional)</label>
                        <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-slate-600 rounded-lg bg-slate-900/50">
                            {formData.evidenceImageUrl ? (
                                <div className="relative w-full">
                                    <img src={formData.evidenceImageUrl} alt="Bukti" className="h-40 w-full object-contain rounded bg-black/40" />
                                    <button 
                                        onClick={() => setFormData(prev => ({ ...prev, evidenceImageUrl: '' }))}
                                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-500"
                                    >
                                        <Icon name="close" className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : null}
                            
                            {!formData.evidenceImageUrl && (
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <Button 
                                        variant="secondary" 
                                        onClick={() => setCameraOpen(true)}
                                        className="flex flex-col items-center justify-center h-20 text-xs gap-1"
                                    >
                                        <Icon name="camera" className="w-6 h-6 text-slate-400" />
                                        Ambil Foto
                                    </Button>
                                    <div className="relative">
                                         <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                         <Button 
                                            variant="secondary" 
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
                                <div className="flex gap-2 w-full mt-1">
                                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                    <Button size="sm" variant="secondary" onClick={() => setCameraOpen(true)} className="flex-1">
                                        Ganti Foto
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={handleScanOCR} disabled={isScanning} className="flex-1 bg-blue-900/30 text-blue-300 border-blue-800">
                                        {isScanning ? 'Scanning...' : <><Icon name="eye" className="w-4 h-4" /> Scan (AI)</>}
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
                            <label className="text-xs text-slate-400">Metode Terima</label>
                            <select 
                                value={formData.paymentMethod} 
                                onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                            >
                                <option value="cash">Tunai (Kas)</option>
                                <option value="non-cash">Non-Tunai (Rekening)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400">Keterangan</label>
                        <input type="text" placeholder="cth: Jual Kardus Bekas" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400">Jumlah (Rp)</label>
                            <input type="number" placeholder="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-bold" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Kategori</label>
                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                                <option>Lainnya</option>
                                <option>Modal Tambahan</option>
                                <option>Investasi</option>
                                <option>Hibah/Hadiah</option>
                            </select>
                        </div>
                    </div>

                    <Button onClick={handleSubmit} className="w-full">{editingId ? "Simpan Perubahan" : "Simpan"}</Button>
                </div>
            </Modal>

            {/* Camera Capture Modal */}
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
                        <Button variant="secondary" onClick={() => setViewEvidence(null)}>Tutup</Button>
                    </div>
                    {viewEvidence && <div className="text-[10px] text-slate-500 font-mono text-center w-full">{viewEvidence.filename}</div>}
                </div>
            </Modal>
        </div>
    );
};

export default IncomeTab;

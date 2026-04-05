
import React, { useState, useMemo, useRef } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { useFinance } from '../../context/FinanceContext';
import { useUIActions } from '../../context/UIContext';
import { useSettings } from '../../context/SettingsContext';
import { CURRENCY_FORMATTER } from '../../constants';
import { dataService } from '../../services/dataService';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import VirtualizedTable from '../VirtualizedTable';
import CustomerFormModal from '../CustomerFormModal';
import ReceiptModal from '../ReceiptModal';
import type { Customer, BalanceLog, Transaction } from '../../types';
import { useToImage } from '../../hooks/useToImage';
import { Capacitor } from '@capacitor/core';
import { shareFileNative, saveBinaryFileNative } from '../../utils/nativeHelper';
import { jsPDF } from "jspdf";

// --- TRANSACTION HISTORY MODAL (NEW) ---
const CustomerTransactionsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onViewReceipt: (t: Transaction) => void;
}> = ({ isOpen, onClose, customer, onViewReceipt }) => {
    const { transactions } = useFinance();

    const customerTransactions = useMemo(() => {
        if (!customer) return [];
        return transactions
            .filter(t => t.customerId === customer.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [customer, transactions]);

    if (!isOpen || !customer) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Riwayat Belanja: ${customer.name}`} mobileLayout="fullscreen" size="lg">
            <div className="space-y-4">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex justify-between items-center text-sm">
                    <span className="text-slate-400">Total Transaksi</span>
                    <span className="font-bold text-white">{customerTransactions.length} kali</span>
                </div>

                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                    {customerTransactions.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">Belum ada riwayat belanja.</p>
                    ) : (
                        customerTransactions.map(t => {
                            const isSplit = t.payments && t.payments.length > 1;
                            const itemsSummary = t.items.map(i => i.name).join(', ');

                            return (
                                <div key={t.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs text-slate-400">#{t.id.slice(-4)}</span>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(t.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </span>
                                                {isSplit && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                                                        Split Bill
                                                    </span>
                                                )}
                                                {t.paymentStatus === 'unpaid' && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                                                        Belum Lunas
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-300 truncate w-48 sm:w-64">{itemsSummary}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-white">{CURRENCY_FORMATTER.format(t.total)}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end pt-2 border-t border-slate-700/50">
                                        <button 
                                            onClick={() => onViewReceipt(t)}
                                            className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors"
                                        >
                                            <Icon name="printer" className="w-3 h-3" /> Lihat Struk
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Modal>
    );
};

// --- HISTORY MODAL (BALANCE) ---
const CustomerHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
}> = ({ isOpen, onClose, customer }) => {
    const { balanceLogs } = useCustomer();
    const { transactions } = useFinance(); 
    const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);

    const logs = useMemo(() => {
        if (!customer) return [];
        return balanceLogs
            .filter(log => log.customerId === customer.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [customer, balanceLogs]);

    if (!isOpen || !customer) return null;

    const getBadgeColor = (type: BalanceLog['type']) => {
        switch (type) {
            case 'topup': return 'bg-green-500/20 text-green-400';
            case 'payment': return 'bg-red-500/20 text-red-400';
            case 'refund': return 'bg-yellow-500/20 text-yellow-400';
            case 'change_deposit': return 'bg-blue-500/20 text-blue-400';
            default: return 'bg-slate-700 text-slate-300';
        }
    };

    const getLabel = (type: BalanceLog['type']) => {
        switch (type) {
            case 'topup': return 'Top Up';
            case 'payment': return 'Pembayaran';
            case 'refund': return 'Refund';
            case 'change_deposit': return 'Kembalian Disimpan';
            case 'correction': return 'Koreksi';
            default: return type;
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Riwayat Saldo: ${customer.name}`} mobileLayout="fullscreen" size="lg">
                <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                        <div>
                            <p className="text-sm text-slate-400">Sisa Saldo Saat Ini</p>
                            <p className="text-2xl font-bold text-white">{CURRENCY_FORMATTER.format(customer.balance || 0)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-400">Total Poin</p>
                            <p className="text-xl font-bold text-yellow-400">{customer.points} pts</p>
                        </div>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                        {logs.length === 0 ? (
                            <p className="text-center text-slate-500 py-4">Belum ada riwayat saldo.</p>
                        ) : (
                            logs.map(log => {
                                const linkedTransaction = log.transactionId 
                                    ? transactions.find(t => t.id === log.transactionId) 
                                    : null;
                                
                                const isSplitPayment = linkedTransaction && linkedTransaction.payments.length > 1;

                                return (
                                    <div key={log.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getBadgeColor(log.type)}`}>
                                                        {getLabel(log.type)}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </span>
                                                    {isSplitPayment && log.type === 'payment' && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                                                            Split Bill
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-300 truncate">{log.description}</p>
                                            </div>
                                            <div className={`text-sm font-bold whitespace-nowrap ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {log.amount > 0 ? '+' : ''}{CURRENCY_FORMATTER.format(log.amount)}
                                            </div>
                                        </div>

                                        {linkedTransaction && (
                                            <div className="flex justify-end border-t border-slate-700/50 pt-2">
                                                <button 
                                                    onClick={() => setReceiptTransaction(linkedTransaction)}
                                                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                                                >
                                                    <Icon name="printer" className="w-3 h-3" /> Lihat Struk #{linkedTransaction.id.slice(-4)}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </Modal>

            {receiptTransaction && (
                <ReceiptModal 
                    isOpen={!!receiptTransaction} 
                    onClose={() => setReceiptTransaction(null)} 
                    transaction={receiptTransaction} 
                />
            )}
        </>
    );
};

// --- MEMBER CARD MODAL ---
const MemberCardModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
}> = ({ isOpen, onClose, customer }) => {
    const { receiptSettings } = useSettings(); 
    // SCALE 3 (Reduced from 6) -> Stable on Android
    // Removed noiseFilter to prevent glitches
    const [cardRef, { isLoading, getImage }] = useToImage<HTMLDivElement>({
        quality: 0.95, 
        backgroundColor: '#0f172a', 
        scale: 3 
    });
    
    const { showAlert } = useUIActions();

    if (!isOpen || !customer) return null;

    // Sanitize filename to prevent "File not created" error on Android due to invalid chars
    const getSafeFilename = (name: string, ext: string) => {
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `MemberCard_${safeName}.${ext}`;
    }

    const handleDownload = async () => {
        try {
            const dataUrl = await getImage();
            if (!dataUrl) return;

            const filename = getSafeFilename(customer.name, 'png');

            if (Capacitor.isNativePlatform()) {
                await saveBinaryFileNative(filename, dataUrl.split(',')[1]);
                return;
            }

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            link.click();
        } catch (error: any) {
            showAlert({ type: 'alert', title: 'Gagal Simpan', message: error.message || 'Gagal menyimpan gambar.' });
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const dataUrl = await getImage();
            if (!dataUrl) return;

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [85.6, 53.98],
                compress: true
            });

            doc.addImage(dataUrl, 'PNG', 0, 0, 85.6, 53.98, undefined, 'FAST');
            const fileName = getSafeFilename(customer.name, 'pdf');

            if (Capacitor.isNativePlatform()) {
                const base64PDF = doc.output('datauristring').split(',')[1];
                await saveBinaryFileNative(fileName, base64PDF);
            } else {
                doc.save(fileName);
            }
        } catch (error: any) {
            showAlert({ type: 'alert', title: 'Gagal PDF', message: error.message });
        }
    };

    const handleShare = async () => {
        try {
            const dataUrl = await getImage();
            if (!dataUrl) return;

            const filename = getSafeFilename(customer.name, 'png');

            if (Capacitor.isNativePlatform()) {
                await shareFileNative(filename, dataUrl.split(',')[1], `Kartu Member ${customer.name}`);
                return;
            }

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], filename, { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Kartu Member - ${customer.name}`,
                    text: `Halo kak ${customer.name}, ini kartu member digital kakak. ID: ${customer.memberId}`,
                    files: [file]
                });
            } else {
                showAlert({ type: 'alert', title: 'Info', message: 'Browser tidak mendukung share.' });
            }
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kartu Member Digital" mobileLayout="fullscreen" size="lg">
            <div className="space-y-6 flex flex-col items-center">
                
                {/* --- CARD DESIGN START --- */}
                {/* Simplified for Native Stability: No SVG Filters, Lower Shadow, Simple Gradient */}
                <div className="p-2 bg-transparent" style={{ transform: 'translateZ(0)' }}>
                    <div 
                        ref={cardRef}
                        className="w-[340px] h-[210px] rounded-xl relative overflow-hidden shadow-xl text-white flex flex-col justify-between p-6 select-none font-sans"
                        style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', // Simpler gradient
                            border: '1px solid #334155'
                        }}
                    >
                        {/* Decorative Blob - CSS Only (No SVG/Filter) - Z-INDEX 0 */}
                        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[#347758] rounded-full blur-3xl opacity-30 pointer-events-none z-0"></div>
                        <div className="absolute bottom-[-30px] left-[-30px] w-32 h-32 bg-blue-600 rounded-full blur-3xl opacity-20 pointer-events-none z-0"></div>

                        {/* Top Bar - Z-INDEX 10 */}
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="text-yellow-500">
                                    <Icon name="award" className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm tracking-wide uppercase text-slate-100 leading-none">
                                        {receiptSettings.shopName || 'MEMBER CARD'}
                                    </h3>
                                    <p className="text-[9px] text-slate-400 tracking-wider mt-0.5">EXCLUSIVE MEMBER</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-50">
                                <span className="text-[8px] tracking-widest text-white font-light">ARTEA POS</span>
                            </div>
                        </div>

                        {/* NAME SECTION - Z-INDEX 20 (HIGHER) */}
                        <div className="relative z-20 mt-2 mb-auto pt-4">
                            {/* break-words instead of truncate to show full name, allow wrapping */}
                            <p className="font-bold text-xl text-white tracking-wide break-words leading-tight max-w-[280px]">
                                {customer.name}
                            </p>
                            {customer.contact ? (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono tracking-wide relative z-20">
                                    {customer.contact}
                                </p>
                            ) : (
                                <div className="h-4"></div>
                            )}
                        </div>

                        {/* Bottom Bar - Z-INDEX 10 */}
                        <div className="relative z-10 flex justify-between items-end">
                            <div className="space-y-2">
                                <div>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Member ID</p>
                                    <p className="font-mono text-sm text-[#52a37c] font-bold tracking-widest">
                                        {customer.memberId}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Valid Thru</p>
                                    <p className="text-[10px] text-slate-300">
                                        Lifetime
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-1.5 rounded-lg shadow-lg">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${customer.memberId}&color=000000&bgcolor=FFFFFF`}
                                    alt="QR"
                                    crossOrigin="anonymous"
                                    className="w-14 h-14"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* --- CARD DESIGN END --- */}

                <div className="grid grid-cols-3 gap-2 w-full">
                    <Button variant="utility" onClick={handleDownload} disabled={isLoading} className="text-xs px-2">
                        <Icon name="download" className="w-4 h-4"/> PNG
                    </Button>
                    <Button variant="utility" onClick={handleDownloadPDF} disabled={isLoading} className="text-xs px-2">
                        <Icon name="printer" className="w-4 h-4"/> PDF
                    </Button>
                    <Button onClick={handleShare} disabled={isLoading} className="text-xs px-2 bg-green-600 hover:bg-green-500 border-none">
                        <Icon name="whatsapp" className="w-4 h-4"/> Share
                    </Button>
                </div>
                
                <p className="text-center text-[10px] text-slate-500 max-w-xs italic">
                    Jika tombol PNG gagal, gunakan tombol <strong>Share</strong> lalu pilih "Simpan ke Galeri" atau kirim ke WhatsApp.
                </p>
            </div>
        </Modal>
    );
};

// --- BULK ADD MODAL (Unchanged) ---
const BulkCustomerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (customers: Omit<Customer, 'id' | 'memberId' | 'createdAt'>[]) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const { showAlert } = useUIActions();
    const [mode, setMode] = useState<'manual' | 'import'>('manual');
    const [rows, setRows] = useState<Array<{ name: string, contact: string, points: string, balance: string }>>([
        { name: '', contact: '', points: '0', balance: '0' },
        { name: '', contact: '', points: '0', balance: '0' },
        { name: '', contact: '', points: '0', balance: '0' },
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRowChange = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        (newRows[index] as any)[field] = value;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { name: '', contact: '', points: '0', balance: '0' }]);
    };

    const removeRow = (index: number) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleSaveManual = () => {
        const validRows = rows.filter(r => r.name.trim() !== '');
        if (validRows.length === 0) {
            showAlert({ type: 'alert', title: 'Data Kosong', message: 'Isi minimal satu Nama Pelanggan.' });
            return;
        }
        const customers = validRows.map(r => ({
            name: r.name,
            contact: r.contact,
            points: parseInt(r.points) || 0,
            balance: parseFloat(r.balance) || 0
        }));
        onSave(customers);
        setRows([{ name: '', contact: '', points: '0', balance: '0' }]);
    };

    const handleDownloadTemplate = () => {
        const headers = ['name', 'contact', 'points', 'balance'];
        const sample = ['Budi Santoso', '08123456789', '100', '50000'];
        const csvContent = [headers.join(','), sample.join(',')].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'template_pelanggan_artea.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const customers = await dataService.importCustomersCSV(file);
            if (customers.length > 0) {
                // @ts-ignore
                onSave(customers);
            } else {
                showAlert({ type: 'alert', title: 'Gagal', message: 'Tidak ada data valid ditemukan di file CSV.' });
            }
        } catch (err: any) {
            showAlert({ type: 'alert', title: 'Error Import', message: err.message });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tambah Pelanggan Massal" mobileLayout="fullscreen" size="lg">
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setMode('manual')} className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'manual' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300'}`}>Manual (Tabel)</button>
                    <button onClick={() => setMode('import')} className={`flex-1 py-2 text-sm rounded transition-colors ${mode === 'import' ? 'bg-[#347758] text-white font-bold' : 'text-slate-300'}`}>Upload CSV</button>
                </div>

                {mode === 'manual' ? (
                    <div className="space-y-4">
                        <div className="overflow-x-auto max-h-[50vh] border border-slate-600 rounded-lg">
                            <table className="w-full text-left text-sm text-slate-300 min-w-[600px]">
                                <thead className="bg-slate-700 text-white font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 w-48">Nama*</th>
                                        <th className="p-2 w-32">Kontak / ID</th>
                                        <th className="p-2 w-20">Saldo</th>
                                        <th className="p-2 w-20">Poin</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr key={idx} className="border-b border-slate-700 bg-slate-800">
                                            <td className="p-1"><input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.name} onChange={e => handleRowChange(idx, 'name', e.target.value)} placeholder="Nama" /></td>
                                            <td className="p-1"><input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.contact} onChange={e => handleRowChange(idx, 'contact', e.target.value)} placeholder="HP/NIK/Kelas" /></td>
                                            <td className="p-1"><input type="number" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.balance} onChange={e => handleRowChange(idx, 'balance', e.target.value)} placeholder="0" /></td>
                                            <td className="p-1"><input type="number" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white" value={row.points} onChange={e => handleRowChange(idx, 'points', e.target.value)} placeholder="0" /></td>
                                            <td className="p-1 text-center"><button onClick={() => removeRow(idx)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="utility" onClick={addRow}><Icon name="plus" className="w-4 h-4" /> Baris</Button>
                            <div className="flex-1"></div>
                            <Button onClick={handleSaveManual}>Simpan Semua</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 text-center py-4">
                        <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 inline-block text-left max-w-sm">
                            <h4 className="font-bold text-white mb-2">Instruksi:</h4>
                            <ol className="list-decimal pl-5 text-sm text-slate-300 space-y-1">
                                <li>Unduh template CSV.</li>
                                <li>Isi data pelanggan.</li>
                                <li>ID Member akan di-generate otomatis.</li>
                                <li>Simpan sebagai .CSV dan upload.</li>
                            </ol>
                        </div>
                        <div className="flex justify-center gap-4">
                            <Button variant="utility" onClick={handleDownloadTemplate}><Icon name="download" className="w-4 h-4"/> Unduh Template</Button>
                            <div className="relative">
                                <Button variant="primary" onClick={() => fileInputRef.current?.click()}><Icon name="upload" className="w-4 h-4"/> Upload CSV</Button>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportFile} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const CustomersTab: React.FC = () => {
    const { customers, addCustomer, updateCustomer, deleteCustomer, addBalance, bulkAddCustomers } = useCustomer();
    const { showAlert } = useUIActions();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [isBulkModalOpen, setBulkModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    
    // Member Card State
    const [isCardModalOpen, setCardModalOpen] = useState(false);
    const [selectedCardCustomer, setSelectedCardCustomer] = useState<Customer | null>(null);

    // History & Transaction Modal State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
    const [isTransactionsOpen, setIsTransactionsOpen] = useState(false); // NEW STATE
    const [transactionsCustomer, setTransactionsCustomer] = useState<Customer | null>(null); // NEW STATE
    
    // Receipt Modal (Global for this tab)
    const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);

    // Top Up State
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [topUpCustomer, setTopUpCustomer] = useState<Customer | null>(null);
    const [topUpAmount, setTopUpAmount] = useState('');

    const totalBalance = useMemo(
        () => customers.reduce((sum, customer) => sum + (customer.balance || 0), 0),
        [customers]
    );
    const activeMembersCount = customers.filter((customer) => (customer.balance || 0) > 0).length;
    const pointsHoldersCount = customers.filter((customer) => customer.points > 0).length;

    const filteredCustomers = useMemo(() => 
        customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (c.contact && c.contact.includes(searchTerm)) ||
            c.memberId.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => b.points - a.points), 
    [customers, searchTerm]);

    const handleSave = (customerData: Omit<Customer, 'id' | 'memberId' | 'points' | 'balance' | 'createdAt'> | Customer) => {
        if ('id' in customerData) {
            updateCustomer(customerData as Customer);
        } else {
            addCustomer(customerData);
        }
        setModalOpen(false);
        setEditingCustomer(null);
    };

    const handleBulkSave = (newCustomers: any[]) => {
        bulkAddCustomers(newCustomers);
        setBulkModalOpen(false);
        showAlert({ type: 'alert', title: 'Berhasil', message: `${newCustomers.length} data pelanggan berhasil diproses.` });
    };

    // --- NEW: Handle Export CSV ---
    const handleExport = () => {
        dataService.exportCustomersCSV(customers);
        // Note: alert is handled inside exportCustomersCSV via downloadCSV wrapper if native, or simple download if web.
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setModalOpen(true);
    };

    const handleShowCard = (customer: Customer) => {
        setSelectedCardCustomer(customer);
        setCardModalOpen(true);
    };

    const handleShowHistory = (customer: Customer) => {
        setHistoryCustomer(customer);
        setIsHistoryOpen(true);
    };

    const handleShowTransactions = (customer: Customer) => {
        setTransactionsCustomer(customer);
        setIsTransactionsOpen(true);
    };

    const openTopUp = (customer: Customer) => {
        setTopUpCustomer(customer);
        setTopUpAmount('');
        setIsTopUpOpen(true);
    };

    const handleConfirmTopUp = () => {
        if (!topUpCustomer || !topUpAmount) return;
        const amount = parseFloat(topUpAmount);
        if (amount > 0) {
            addBalance(topUpCustomer.id, amount, "Top Up Manual", true);
            setIsTopUpOpen(false);
            setTopUpCustomer(null);
        }
    };

    const columns = [
        {
            label: 'ID Member',
            width: '1.1fr',
            render: (c: Customer) => (
                <span className="inline-flex rounded-full border border-slate-600 bg-slate-900/80 px-2 py-1 font-mono text-[11px] text-slate-300">
                    {c.memberId}
                </span>
            )
        },
        {
            label: 'Nama',
            width: '1.9fr',
            className: 'overflow-hidden',
            render: (c: Customer) => (
                <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{c.name}</div>
                    <div className="truncate text-[11px] text-slate-500">{c.contact || 'Tanpa kontak tersimpan'}</div>
                </div>
            )
        },
        {
            label: 'Saldo',
            width: '1.1fr',
            render: (c: Customer) => (
                <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                    {CURRENCY_FORMATTER.format(c.balance || 0)}
                </span>
            )
        },
        {
            label: 'Poin',
            width: '0.9fr',
            render: (c: Customer) => (
                <span className="inline-flex rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[11px] font-semibold text-yellow-300">
                    {c.points} pts
                </span>
            )
        },
        {
            label: 'Status',
            width: '1fr',
            render: (c: Customer) => (
                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${((c.balance || 0) > 0 || c.points > 0) ? 'border border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border border-slate-600 bg-slate-900/80 text-slate-300'}`}>
                    {((c.balance || 0) > 0 || c.points > 0) ? 'Aktif' : 'Umum'}
                </span>
            )
        },
        {
            label: 'Aksi',
            width: '300px',
            className: 'overflow-visible',
            render: (c: Customer) => (
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="operational"
                        size="sm"
                        onClick={() => handleShowTransactions(c)}
                        title="Riwayat Belanja & Struk"
                        className="h-8 w-8 p-0"
                    >
                        <Icon name="printer" className="w-4 h-4"/>
                    </Button>
                    <Button
                        type="button"
                        variant="utility"
                        size="sm"
                        onClick={() => handleShowHistory(c)}
                        title="Riwayat Saldo (Topup/Pakai)"
                        className="h-8 w-8 p-0"
                    >
                        <Icon name="clock-history" className="w-4 h-4"/>
                    </Button>
                    <Button
                        type="button"
                        variant="utility"
                        size="sm"
                        onClick={() => handleShowCard(c)}
                        title="Kartu Member Digital"
                        className="h-8 w-8 p-0"
                    >
                        <Icon name="pay" className="w-4 h-4"/>
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => openTopUp(c)}
                        title="Top Up Saldo"
                        className="h-8 w-8 p-0"
                    >
                        <Icon name="plus" className="w-4 h-4"/>
                    </Button>
                    <Button
                        type="button"
                        variant="utility"
                        size="sm"
                        onClick={() => handleEdit(c)}
                        title="Edit Pelanggan"
                        className="h-8 w-8 p-0"
                    >
                        <Icon name="edit" className="w-4 h-4"/>
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => deleteCustomer(c.id)}
                        title="Hapus Pelanggan"
                        className="h-8 w-8 p-0"
                    >
                        <Icon name="trash" className="w-4 h-4"/>
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Total Member</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{customers.length}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Jumlah pelanggan yang tersimpan dan bisa dipakai untuk transaksi.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Total Saldo Member</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{CURRENCY_FORMATTER.format(totalBalance)}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Akumulasi saldo yang tersimpan di seluruh akun pelanggan.</p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-850/70 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Poin & Saldo Aktif</p>
                    <p className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{activeMembersCount} / {pointsHoldersCount}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">Member dengan saldo aktif dibanding jumlah member yang sudah mengumpulkan poin.</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder="Cari nama, kontak, atau ID member..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
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
                    <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-none">
                        <Button variant="utility" onClick={handleExport} className="h-11 w-full gap-1 px-2 sm:px-3" title="Export CSV">
                            <Icon name="download" className="w-4 h-4"/>
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                        <Button variant="utility" onClick={() => setBulkModalOpen(true)} className="h-11 w-full gap-1 px-2 sm:px-3" title="Import / Tambah Massal">
                            <Icon name="boxes" className="w-4 h-4"/>
                            <span className="hidden sm:inline">Massal</span>
                        </Button>
                        <Button onClick={() => { setEditingCustomer(null); setModalOpen(true); }} className="h-11 w-full gap-1 px-2 sm:px-3" title="Tambah Pelanggan Baru">
                            <Icon name="plus" className="w-4 h-4" />
                            <span className="hidden sm:inline">Tambah</span>
                        </Button>
                    </div>
                </div>
            </div>
            
            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 overflow-hidden">
                {filteredCustomers.length > 0 ? (
                    <>
                        <div className="md:hidden">
                            <div className="space-y-2 p-2">
                                {filteredCustomers.map((customer) => (
                                    <div key={customer.id} className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate pr-1 text-[12px] font-bold leading-tight text-white">{customer.name}</p>
                                                        <p className="mt-0.5 truncate text-[10px] text-slate-400">{customer.memberId} • {customer.contact || 'Tanpa kontak'}</p>
                                                    </div>
                                                    <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] text-yellow-300">
                                                        {customer.points} pts
                                                    </span>
                                                </div>
                                                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                                                        Saldo {CURRENCY_FORMATTER.format(customer.balance || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                                            <Button type="button" variant="operational" size="sm" onClick={() => handleShowTransactions(customer)} className="h-8 gap-1 px-2 text-[11px] sm:text-sm">
                                                <Icon name="printer" className="w-4 h-4" />
                                                <span className="hidden min-[390px]:inline">Struk</span>
                                            </Button>
                                            <Button type="button" variant="utility" size="sm" onClick={() => handleShowHistory(customer)} className="h-8 gap-1 px-2 text-[11px] sm:text-sm">
                                                <Icon name="clock-history" className="w-4 h-4" />
                                                <span className="hidden min-[390px]:inline">Riwayat</span>
                                            </Button>
                                            <Button type="button" variant="utility" size="sm" onClick={() => handleShowCard(customer)} className="h-8 gap-1 px-2 text-[11px] sm:text-sm">
                                                <Icon name="pay" className="w-4 h-4" />
                                                <span className="hidden min-[390px]:inline">Kartu</span>
                                            </Button>
                                        </div>
                                        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                                            <Button type="button" size="sm" onClick={() => openTopUp(customer)} className="h-8 gap-1 px-2 text-[11px] sm:text-sm">
                                                <Icon name="plus" className="w-4 h-4" />
                                                <span className="hidden min-[390px]:inline">Isi</span>
                                            </Button>
                                            <Button type="button" variant="utility" size="sm" onClick={() => handleEdit(customer)} className="h-8 gap-1 px-2 text-[11px] sm:text-sm">
                                                <Icon name="edit" className="w-4 h-4" />
                                                <span className="hidden min-[390px]:inline">Edit</span>
                                            </Button>
                                            <Button type="button" variant="danger" size="sm" onClick={() => deleteCustomer(customer.id)} className="h-8 gap-1 px-2 text-[11px] sm:text-sm">
                                                <Icon name="trash" className="w-4 h-4" />
                                                <span className="hidden min-[390px]:inline">Hapus</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <div className="border-b border-slate-700/70 px-4 py-3">
                                <h3 className="text-lg font-bold text-white">Daftar Pelanggan</h3>
                                <p className="mt-1 text-sm text-slate-400">Pantau member, saldo, poin, dan akses cepat ke riwayat atau kartu digital.</p>
                            </div>
                            <div className="h-[520px] p-3">
                                <VirtualizedTable data={filteredCustomers} columns={columns} rowHeight={64} minWidth={1080} />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                            <Icon name="users" className="mx-auto h-10 w-10 text-slate-500" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-white">
                            {searchTerm ? 'Pelanggan tidak ditemukan.' : 'Belum ada pelanggan tersimpan.'}
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                            {searchTerm
                                ? 'Coba ubah kata kunci pencarian atau periksa kembali nama, kontak, dan ID member yang Anda cari.'
                                : 'Tambahkan pelanggan pertama agar membership, saldo, dan riwayat belanja mulai tercatat dengan rapi.'}
                        </p>
                        {!searchTerm && (
                            <Button onClick={() => { setEditingCustomer(null); setModalOpen(true); }} className="mt-4">
                                <Icon name="plus" className="w-4 h-4" /> Tambah Pelanggan Pertama
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <CustomerFormModal 
                isOpen={isModalOpen} 
                onClose={() => { setModalOpen(false); setEditingCustomer(null); }} 
                onSave={handleSave} 
                customer={editingCustomer} 
            />

            <BulkCustomerModal 
                isOpen={isBulkModalOpen} 
                onClose={() => setBulkModalOpen(false)} 
                onSave={handleBulkSave} 
            />

            <MemberCardModal 
                isOpen={isCardModalOpen}
                onClose={() => setCardModalOpen(false)}
                customer={selectedCardCustomer}
            />

            <CustomerHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                customer={historyCustomer}
            />

            <CustomerTransactionsModal
                isOpen={isTransactionsOpen}
                onClose={() => setIsTransactionsOpen(false)}
                customer={transactionsCustomer}
                onViewReceipt={(t) => setReceiptTransaction(t)}
            />

            {/* Top Up Modal */}
            <Modal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} title="Top Up Saldo Member" mobileLayout="fullscreen" size="xl">
                <div className="space-y-4">
                    {topUpCustomer && (
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                            <p className="text-sm text-slate-400">Member:</p>
                            <p className="font-bold text-white text-lg">{topUpCustomer.name} <span className="text-sm text-slate-500 font-normal">({topUpCustomer.memberId})</span></p>
                            <p className="text-xs text-slate-500">Saldo Saat Ini: {CURRENCY_FORMATTER.format(topUpCustomer.balance || 0)}</p>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nominal Top Up (Rp)</label>
                        <input 
                            type="number" 
                            min="0"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg font-bold"
                            placeholder="0"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-2">
                        {[10000, 20000, 50000, 100000].map(amt => (
                            <button 
                                key={amt}
                                onClick={() => setTopUpAmount(amt.toString())}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded"
                            >
                                {amt/1000}k
                            </button>
                        ))}
                    </div>

                    <div className="text-xs text-yellow-500 bg-yellow-900/20 p-2 rounded">
                        <p>Catatan: Uang yang diterima dari Top Up akan dicatat sebagai <strong>Kas Masuk</strong> pada sesi kasir saat ini.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="utility" onClick={() => setIsTopUpOpen(false)}>Batal</Button>
                        <Button onClick={handleConfirmTopUp} disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}>Konfirmasi</Button>
                    </div>
                </div>
            </Modal>

            {/* Receipt Modal (Shared) */}
            {receiptTransaction && (
                <ReceiptModal 
                    isOpen={!!receiptTransaction} 
                    onClose={() => setReceiptTransaction(null)} 
                    transaction={receiptTransaction} 
                />
            )}
        </div>
    );
};

export default CustomersTab;

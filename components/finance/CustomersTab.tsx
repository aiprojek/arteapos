
import React, { useState, useMemo, useRef } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { useFinance } from '../../context/FinanceContext'; // Import Finance untuk ambil data transaksi
import { useUI } from '../../context/UIContext';
import { useSettings } from '../../context/SettingsContext';
import { CURRENCY_FORMATTER } from '../../constants';
import { dataService } from '../../services/dataService';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import VirtualizedTable from '../VirtualizedTable';
import CustomerFormModal from '../CustomerFormModal';
import ReceiptModal from '../ReceiptModal'; // Import ReceiptModal
import type { Customer, BalanceLog, Transaction } from '../../types';
import { useToImage } from '../../hooks/useToImage';
import { Capacitor } from '@capacitor/core';
import { shareFileNative, saveBinaryFileNative } from '../../utils/nativeHelper';
import { jsPDF } from "jspdf"; // Added for PDF Export

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
        <Modal isOpen={isOpen} onClose={onClose} title={`Riwayat Belanja: ${customer.name}`}>
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
            <Modal isOpen={isOpen} onClose={onClose} title={`Riwayat Saldo: ${customer.name}`}>
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
    const [cardRef, { isLoading, getImage }] = useToImage<HTMLDivElement>({
        quality: 1.0, // Max quality
        backgroundColor: null,
        scale: 4 // SCALE INCREASED TO 4X FOR SHARPNESS
    });
    
    const { showAlert } = useUI();

    if (!isOpen || !customer) return null;

    const handleDownload = async () => {
        try {
            const dataUrl = await getImage();
            if (!dataUrl) return;

            if (Capacitor.isNativePlatform()) {
                await saveBinaryFileNative(`MemberCard-${customer.name}.png`, dataUrl.split(',')[1]);
                showAlert({ type: 'alert', title: 'Berhasil', message: 'Gambar kartu tersimpan di Dokumen.' });
                return;
            }

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `MemberCard-${customer.name.replace(/\s+/g, '_')}.png`;
            link.click();
        } catch (error: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: error.message || 'Gagal membuat gambar kartu.' });
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const dataUrl = await getImage();
            if (!dataUrl) return;

            // ID-1 Standard Card Size: 85.60 × 53.98 mm
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [85.6, 53.98]
            });

            doc.addImage(dataUrl, 'PNG', 0, 0, 85.6, 53.98);
            const fileName = `MemberCard_${customer.name.replace(/\s+/g, '_')}.pdf`;

            if (Capacitor.isNativePlatform()) {
                const base64PDF = doc.output('datauristring').split(',')[1];
                await saveBinaryFileNative(fileName, base64PDF);
                showAlert({ type: 'alert', title: 'Berhasil', message: 'File PDF tersimpan di Dokumen.' });
            } else {
                doc.save(fileName);
            }
        } catch (error: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: 'Gagal membuat PDF: ' + error.message });
        }
    };

    const handleShare = async () => {
        try {
            const dataUrl = await getImage();
            if (!dataUrl) return;

            if (Capacitor.isNativePlatform()) {
                await shareFileNative(`MemberCard-${customer.name}.png`, dataUrl.split(',')[1], `Kartu Member ${customer.name}`);
                return;
            }

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "card.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Kartu Member - ${customer.name}`,
                    text: `Halo kak ${customer.name}, ini kartu member digital kakak. Simpan dan tunjukkan saat belanja untuk dapat poin ya! ID: ${customer.memberId}`,
                    files: [file]
                });
            } else {
                showAlert({ type: 'alert', title: 'Info', message: 'Browser tidak mendukung share langsung. Silakan unduh gambar manual.' });
            }
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kartu Member Digital">
            <div className="space-y-6 flex flex-col items-center">
                
                {/* --- CARD DESIGN START --- */}
                <div className="p-2 bg-transparent">
                    <div 
                        ref={cardRef}
                        className="w-[340px] h-[210px] rounded-xl relative overflow-hidden shadow-2xl text-white flex flex-col justify-between p-6 select-none font-sans"
                        style={{
                            background: 'linear-gradient(110deg, #0f172a 0%, #1e293b 100%)',
                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-[#347758] rounded-full blur-[60px] opacity-20"></div>
                        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>

                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="text-yellow-500">
                                    <Icon name="award" className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm tracking-wide uppercase text-slate-100 leading-none">
                                        {receiptSettings.shopName || 'MEMBER CARD'}
                                    </h3>
                                    <p className="text-[9px] text-slate-400 tracking-wider mt-0.5">EXCLUSIVE MEMBER</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-40">
                                <span className="text-[8px] tracking-widest text-white font-light">ARTEA POS</span>
                                <Icon name="logo" className="w-3 h-3 text-white" />
                            </div>
                        </div>

                        <div className="relative z-10 mt-2 mb-auto pt-4">
                            <p className="font-bold text-xl text-white tracking-wide truncate max-w-[280px]">
                                {customer.name}
                            </p>
                            {customer.contact ? (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono tracking-wide">
                                    {customer.contact}
                                </p>
                            ) : (
                                <div className="h-4"></div>
                            )}
                        </div>

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

                <p className="text-center text-sm text-slate-400 max-w-xs">
                    Unduh kartu ini dan kirimkan ke pelanggan via WhatsApp.
                </p>

                <div className="grid grid-cols-3 gap-2 w-full">
                    <Button variant="secondary" onClick={handleDownload} disabled={isLoading} className="text-xs px-2">
                        <Icon name="download" className="w-4 h-4"/> PNG
                    </Button>
                    <Button variant="secondary" onClick={handleDownloadPDF} disabled={isLoading} className="text-xs px-2">
                        <Icon name="printer" className="w-4 h-4"/> PDF
                    </Button>
                    <Button onClick={handleShare} disabled={isLoading} className="text-xs px-2 bg-green-600 hover:bg-green-500 border-none">
                        <Icon name="whatsapp" className="w-4 h-4"/> Share
                    </Button>
                </div>
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
    const { showAlert } = useUI();
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
        <Modal isOpen={isOpen} onClose={onClose} title="Tambah Pelanggan Massal">
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
                            <Button size="sm" variant="secondary" onClick={addRow}><Icon name="plus" className="w-4 h-4" /> Baris</Button>
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
                            <Button variant="secondary" onClick={handleDownloadTemplate}><Icon name="download" className="w-4 h-4"/> Unduh Template</Button>
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
    const { showAlert } = useUI();
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
        { label: 'ID Member', width: '1fr', render: (c: Customer) => <span className="font-mono text-slate-400">{c.memberId}</span> },
        { label: 'Nama', width: '2fr', render: (c: Customer) => <span className="font-bold text-white">{c.name}</span> },
        { label: 'Saldo', width: '1.5fr', render: (c: Customer) => <span className="text-green-400 font-bold">{CURRENCY_FORMATTER.format(c.balance || 0)}</span> },
        { label: 'Poin', width: '1fr', render: (c: Customer) => <span className="text-yellow-400 font-bold">{c.points} pts</span> },
        { label: 'Kontak / Info', width: '1.5fr', render: (c: Customer) => c.contact || '-' },
        { label: 'Aksi', width: '260px', render: (c: Customer) => (
            <div className="flex gap-2 items-center">
                {/* TOMBOL RIWAYAT BELANJA / STRUK (NEW) */}
                <button 
                    onClick={() => handleShowTransactions(c)}
                    className="p-1.5 rounded bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-500/30"
                    title="Riwayat Belanja & Struk"
                >
                    <Icon name="printer" className="w-4 h-4"/>
                </button>

                <button 
                    onClick={() => handleShowHistory(c)}
                    className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                    title="Riwayat Saldo (Topup/Pakai)"
                >
                    <Icon name="clock-history" className="w-4 h-4"/>
                </button>
                <button 
                    onClick={() => handleShowCard(c)}
                    className="p-1.5 rounded bg-purple-900/30 text-purple-300 hover:bg-purple-900/50"
                    title="Lihat Kartu Member Digital"
                >
                    <Icon name="pay" className="w-4 h-4"/>
                </button>
                <button 
                    onClick={() => openTopUp(c)} 
                    className="text-xs bg-[#347758] hover:bg-[#2a6046] text-white px-2 py-1 rounded flex items-center gap-1"
                    title="Top Up Saldo"
                >
                    <Icon name="plus" className="w-3 h-3"/> Isi
                </button>
                <button onClick={() => handleEdit(c)} className="text-sky-400 hover:text-white"><Icon name="edit" className="w-4 h-4"/></button>
                <button onClick={() => deleteCustomer(c.id)} className="text-red-400 hover:text-white"><Icon name="trash" className="w-4 h-4"/></button>
            </div>
        )}
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="relative flex-grow max-w-md">
                    <input 
                        type="text" 
                        placeholder="Cari nama, HP, atau ID member..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white" 
                    />
                    <Icon name="search" className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                </div>
                <div className="flex gap-2">
                    {/* NEW EXPORT BUTTON */}
                    <Button variant="secondary" onClick={handleExport} className="flex-shrink-0" title="Export CSV">
                        <Icon name="download" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export</span>
                    </Button>

                    <Button variant="secondary" onClick={() => setBulkModalOpen(true)} className="flex-shrink-0" title="Import / Tambah Massal">
                        <Icon name="boxes" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Massal</span>
                    </Button>
                    <Button onClick={() => { setEditingCustomer(null); setModalOpen(true); }} className="flex-shrink-0" title="Tambah Pelanggan Baru">
                        <Icon name="plus" className="w-5 h-5" />
                        <span className="hidden sm:inline">Tambah</span>
                    </Button>
                </div>
            </div>
            
            <div className="bg-slate-800 rounded-lg shadow-md h-[500px] border border-slate-700">
                <VirtualizedTable data={filteredCustomers} columns={columns} rowHeight={50} />
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
            <Modal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} title="Top Up Saldo Member">
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
                        <Button variant="secondary" onClick={() => setIsTopUpOpen(false)}>Batal</Button>
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

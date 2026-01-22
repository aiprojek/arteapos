
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { useSession } from '../context/SessionContext';
import { useProduct } from '../context/ProductContext';
import { useAudit } from '../context/AuditContext'; 
import { useAuth } from '../context/AuthContext';
import { CURRENCY_FORMATTER } from '../constants';

interface EndSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionSales: number;
    startingCash: number;
    cashIn: number;
    cashOut: number;
}

const EndSessionModal: React.FC<EndSessionModalProps> = ({ isOpen, onClose, sessionSales, startingCash, cashIn, cashOut }) => {
    const { endSession, sessionSettings } = useSession(); 
    const { products, performStockOpname } = useProduct();
    const { logAudit } = useAudit();
    const { currentUser } = useAuth();

    const [step, setStep] = useState(1);
    const [finalCashInput, setFinalCashInput] = useState('');
    
    // Audit Stok State
    const [auditItems, setAuditItems] = useState<Array<{id: string, name: string, systemStock: number, inputStock: string}>>([]);

    const expectedCash = startingCash + sessionSales + cashIn - cashOut;
    const finalCashAmount = parseFloat(finalCashInput) || 0;
    const difference = finalCashAmount - expectedCash;

    // Initialize Random Audit Items
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFinalCashInput('');
            
            // Pilih max 3 produk acak yang ditrack stoknya
            const trackableProducts = products.filter(p => p.trackStock);
            if (trackableProducts.length > 0) {
                const shuffled = [...trackableProducts].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, 3).map(p => ({
                    id: p.id,
                    name: p.name,
                    systemStock: p.stock || 0,
                    inputStock: ''
                }));
                setAuditItems(selected);
            } else {
                setAuditItems([]);
            }
        }
    }, [isOpen, products]);

    const handleAuditChange = (id: string, val: string) => {
        setAuditItems(prev => prev.map(item => item.id === id ? { ...item, inputStock: val } : item));
    };

    const handleProceedToAudit = () => {
        if (!finalCashInput) return;
        
        // CHECK SETTING: If Blind Audit is enabled AND there are items to audit
        // Safe check using optional chaining in case settings aren't loaded properly
        if (sessionSettings?.enableBlindAudit === true && auditItems.length > 0) {
            setStep(1.5); 
        } else {
            // Skip audit step if disabled or no items
            setStep(2);
        }
    }

    const handleProceedToSummary = () => {
        // Validasi input audit
        const allFilled = auditItems.every(i => i.inputStock !== '');
        if (!allFilled) {
            alert("Harap isi semua jumlah stok fisik.");
            return;
        }
        setStep(2);
    }

    const handleConfirmEnd = () => {
        // 1. Process Stock Audit Findings (Only if audit was performed)
        if (sessionSettings?.enableBlindAudit === true && auditItems.length > 0) {
            const discrepancies = auditItems.filter(i => parseFloat(i.inputStock) !== i.systemStock);
            
            if (discrepancies.length > 0) {
                // Log ke Audit System - Using safe strings
                const details = discrepancies.map(d => `${d.name}: Sys(${d.systemStock}) vs Fisik(${d.inputStock})`).join(', ');
                
                // Ensure currentUser is handled correctly
                logAudit(currentUser, 'STOCK_OPNAME', `Selisih Stok saat Tutup Shift: ${details}`, 'SHIFT-AUDIT');
                
                // Adjust Stock
                const opnamePayload = discrepancies.map(d => ({
                    id: d.id,
                    type: 'product' as const,
                    name: d.name,
                    systemStock: d.systemStock,
                    actualStock: parseFloat(d.inputStock)
                }));
                const auditNote = `Audit Tutup Shift oleh ${currentUser?.name || 'Staff'}`;
                performStockOpname(opnamePayload, auditNote);
            }
        }

        // 2. End Session
        endSession({
            actualCash: finalCashAmount,
            expectedCash: expectedCash,
            sales: sessionSales,
            cashIn,
            cashOut
        });
        onClose();
    }
    
    const handleClose = () => {
        setStep(1);
        setFinalCashInput('');
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Tutup Sesi Penjualan">
            
            {/* STEP 1: Uang Fisik */}
            {step === 1 && (
                <div className="space-y-4">
                     <p className="text-slate-300">Hitung semua uang tunai di laci kasir dan masukkan jumlah totalnya di bawah ini.</p>
                     <div>
                        <label htmlFor="finalCash" className="block text-sm font-medium text-slate-300 mb-1">Jumlah Uang di Laci (Dihitung)</label>
                        <input
                            id="finalCash"
                            type="number"
                            min="0"
                            value={finalCashInput}
                            onChange={(e) => setFinalCashInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                    <Button onClick={handleProceedToAudit} disabled={!finalCashInput} className="w-full py-3">
                        Lanjut
                    </Button>
                </div>
            )}

            {/* STEP 1.5: Audit Stok Acak (Blind Count) */}
            {step === 1.5 && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded-r">
                        <h4 className="font-bold text-yellow-400 flex items-center gap-2">
                            <Icon name="boxes" className="w-5 h-5" /> Pemeriksaan Acak (Spot Check)
                        </h4>
                        <p className="text-xs text-slate-300 mt-1">
                            Sistem memilih beberapa produk secara acak. Harap hitung sisa fisik barang ini di rak/kulkas sekarang.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {auditItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700">
                                <span className="font-semibold text-white flex-1">{item.name}</span>
                                <div className="w-24">
                                    <input 
                                        type="number" 
                                        placeholder="Sisa Fisik"
                                        value={item.inputStock}
                                        onChange={(e) => handleAuditChange(item.id, e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-center text-white font-bold focus:ring-1 focus:ring-[#347758]"
                                        autoFocus={auditItems.indexOf(item) === 0}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <Button onClick={handleProceedToSummary} className="w-full py-3">
                        Verifikasi & Lanjut
                    </Button>
                </div>
            )}

            {/* STEP 2: Ringkasan */}
            {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-lg font-bold text-white text-center">Ringkasan Sesi</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Modal Awal</span>
                            <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(startingCash)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Total Penjualan Tunai</span>
                             <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(sessionSales)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Kas Masuk (Lainnya)</span>
                             <span className="font-semibold text-green-400">+ {CURRENCY_FORMATTER.format(cashIn)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded-md">
                            <span className="text-slate-400">Kas Keluar</span>
                             <span className="font-semibold text-red-400">- {CURRENCY_FORMATTER.format(cashOut)}</span>
                        </div>
                         <div className="flex justify-between p-2 bg-slate-900 rounded-md font-bold border-t-2 border-slate-700">
                            <span className="text-slate-300">Uang di Laci Seharusnya</span>
                             <span className="text-white">{CURRENCY_FORMATTER.format(expectedCash)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-700 rounded-md">
                            <span className="text-slate-300">Uang di Laci (Dihitung)</span>
                            <span className="font-semibold text-white">{CURRENCY_FORMATTER.format(finalCashAmount)}</span>
                        </div>
                        <div className={`flex justify-between p-3 rounded-md font-bold text-lg
                            ${difference === 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            <span>Selisih</span>
                            <span>{CURRENCY_FORMATTER.format(difference)}</span>
                        </div>
                    </div>
                    
                    {sessionSettings?.enableBlindAudit && auditItems.length > 0 && (
                         <div className="text-xs text-slate-500 text-center bg-slate-800 p-2 rounded">
                            <Icon name="check-circle-fill" className="w-3 h-3 inline mr-1 text-[#52a37c]"/>
                            Hasil cek stok fisik telah direkam.
                        </div>
                    )}

                    <p className="text-xs text-slate-500 text-center">Pastikan semua data sudah benar sebelum mengakhiri sesi. Tindakan ini tidak dapat diurungkan.</p>
                     <Button onClick={handleConfirmEnd} variant="primary" className="w-full py-3">
                        Konfirmasi & Tutup Sesi
                    </Button>
                </div>
            )}
        </Modal>
    );
};

export default EndSessionModal;
        
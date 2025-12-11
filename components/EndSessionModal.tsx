
import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useSession } from '../context/SessionContext';
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
    const { endSession } = useSession();
    const [step, setStep] = useState(1);
    const [finalCashInput, setFinalCashInput] = useState('');

    const expectedCash = startingCash + sessionSales + cashIn - cashOut;
    const finalCashAmount = parseFloat(finalCashInput) || 0;
    const difference = finalCashAmount - expectedCash;

    const handleProceed = () => {
        if (finalCashInput) {
            setStep(2);
        }
    }

    const handleConfirmEnd = () => {
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
                    <Button onClick={handleProceed} disabled={!finalCashInput} className="w-full py-3">
                        Lanjutkan ke Ringkasan
                    </Button>
                </div>
            )}
            {step === 2 && (
                <div className="space-y-4">
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

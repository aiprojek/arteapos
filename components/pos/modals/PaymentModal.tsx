import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import Icon from '../../Icon';
import CameraCaptureModal from '../../CameraCaptureModal';
import { CURRENCY_FORMATTER } from '../../../constants';
import { useCustomer } from '../../../context/CustomerContext';
import { useAuthState } from '../../../context/AuthContext';
import { useCustomerDisplayCamera, useCustomerDisplayStatus } from '../../../context/CustomerDisplayContext';
import { emitAuditEvent, requestCustomerCameraCapture } from '../../../services/appEvents';
import type { Customer, PaymentMethod } from '../../../types';
import { compressImage } from '../../../utils/imageCompression';
import { useRenderProfiler } from '../../../utils/renderProfiler';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payments: any[], customerDetails: any) => void;
    total: number;
    selectedCustomer: Customer | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm, total, selectedCustomer }) => {
    const { addBalance } = useCustomer();
    const { currentUser } = useAuthState();
    const { isDisplayConnected } = useCustomerDisplayStatus();
    const { customerImage, clearCustomerImage } = useCustomerDisplayCamera();
    
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [customerName, setCustomerName] = useState('');
    const [depositChange, setDepositChange] = useState(false);
    const [evidenceImage, setEvidenceImage] = useState<string>('');
    const [isWaitingForCustomer, setIsWaitingForCustomer] = useState(false);
    const [isLocalCameraOpen, setLocalCameraOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [instantTopUpAmount, setInstantTopUpAmount] = useState('');
    const [splitCashInput, setSplitCashInput] = useState('');

    const memberBalance = selectedCustomer?.balance || 0;
    const payAmountInput = parseFloat(amountPaid) || 0;
    const change = payAmountInput - total;
    const canPayWithBalance = Boolean(selectedCustomer) && memberBalance >= total;
    const balanceShortage = total - memberBalance;
    const splitCashTendered = parseFloat(splitCashInput) || 0;
    const splitChange = splitCashTendered - balanceShortage;
    const quickAmounts = useMemo(() => [total, 20000, 50000, 100000], [total]);
    const [isCompactViewport, setIsCompactViewport] = useState(false);

    useEffect(() => {
        const updateViewportMode = () => {
            setIsCompactViewport(window.innerWidth < 640 || window.innerHeight <= 820);
        };

        updateViewportMode();
        window.addEventListener('resize', updateViewportMode);

        return () => window.removeEventListener('resize', updateViewportMode);
    }, []);

    useRenderProfiler('PaymentModal', {
        isOpen,
        total,
        paymentMethod,
        amountPaid,
        change,
        depositChange,
        selectedCustomerId: selectedCustomer?.id ?? null,
        memberBalance,
        instantTopUpAmount,
        splitCashInput,
        canPayWithBalance,
        evidenceAttached: Boolean(evidenceImage),
        waitingForCustomer: isWaitingForCustomer,
        localCameraOpen: isLocalCameraOpen,
    });

    useEffect(() => {
        if (isOpen) {
            setAmountPaid('');
            setPaymentMethod('cash');
            setCustomerName(selectedCustomer ? selectedCustomer.name : '');
            setDepositChange(false);
            setInstantTopUpAmount('');
            setSplitCashInput('');
            setEvidenceImage('');
            clearCustomerImage();
            setIsWaitingForCustomer(false);
        }
    }, [isOpen, selectedCustomer, clearCustomerImage]);

    useEffect(() => {
        if (customerImage && isWaitingForCustomer) {
            setEvidenceImage(customerImage);
            setIsWaitingForCustomer(false);
        }
    }, [customerImage, isWaitingForCustomer]);

    const handleQuickAmount = useCallback((amt: number) => {
        setAmountPaid(amt.toString());
    }, []);

    const handleMethodChange = useCallback((method: PaymentMethod) => {
        setPaymentMethod(method);
        setInstantTopUpAmount('');
        setSplitCashInput('');
        setEvidenceImage('');
        setIsWaitingForCustomer(false);
        
        if (method === 'member-balance' || method === 'non-cash') {
            setAmountPaid(total.toString());
        } else {
            setAmountPaid('');
        }
    }, [total]);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setEvidenceImage(compressed);
        } catch {
            alert('Gagal memproses gambar.');
        }
    }, []);

    const handleRequestCustomerPhoto = useCallback(() => {
        if (!isDisplayConnected) {
            alert('Layar pelanggan belum terhubung!');
            return;
        }
        setIsWaitingForCustomer(true);
        void requestCustomerCameraCapture();
    }, [isDisplayConnected]);

    const handleInstantTopUp = useCallback(() => {
        if (!selectedCustomer || !instantTopUpAmount) return;
        const amt = parseFloat(instantTopUpAmount);
        if (amt > 0) {
            addBalance(selectedCustomer.id, amt, 'Top Up Instan (Kasir)', true);
            setInstantTopUpAmount('');
        }
    }, [addBalance, instantTopUpAmount, selectedCustomer]);

    const handleConfirmSplitPayment = useCallback(() => {
        if (!selectedCustomer) return;
        
        const balanceAvailable = memberBalance;
        const cashTendered = splitCashTendered;
        const shortage = total - balanceAvailable;

        if (cashTendered < shortage) {
            alert('Uang tunai kurang dari sisa tagihan!');
            return;
        }

        addBalance(selectedCustomer.id, -balanceAvailable, 'Pembayaran Split (Saldo)');
        
        void emitAuditEvent({
            user: currentUser,
            action: 'OTHER',
            details: `Split Bayar: Saldo ${CURRENCY_FORMATTER.format(balanceAvailable)} + Tunai ${CURRENCY_FORMATTER.format(cashTendered)}`,
            targetId: selectedCustomer.id,
        });

        const payments = [
            { method: 'member-balance' as PaymentMethod, amount: balanceAvailable },
            { method: 'cash' as PaymentMethod, amount: cashTendered }
        ];

        const details = { 
            customerId: selectedCustomer.id, 
            customerName: selectedCustomer.name, 
            customerContact: selectedCustomer.contact 
        };

        onConfirm(payments, details);
    }, [addBalance, currentUser, memberBalance, onConfirm, selectedCustomer, splitCashTendered, total]);

    const handleConfirm = useCallback(() => {
        let finalPayAmount = payAmountInput;

        if (paymentMethod === 'member-balance' && selectedCustomer) {
            if (payAmountInput > (selectedCustomer.balance || 0)) {
                return;
            }
            addBalance(selectedCustomer.id, -payAmountInput, 'Pembayaran Belanja');
            void emitAuditEvent({
                user: currentUser,
                action: 'OTHER',
                details: `Pembayaran via Saldo Member: ${CURRENCY_FORMATTER.format(payAmountInput)}`,
                targetId: selectedCustomer.id,
            });
        }

        if (paymentMethod === 'cash' && change > 0 && depositChange && selectedCustomer) {
            finalPayAmount = total;
            addBalance(selectedCustomer.id, change, 'Kembalian Belanja Disimpan');
            void emitAuditEvent({
                user: currentUser,
                action: 'OTHER',
                details: `Simpan Kembalian ke Saldo: ${CURRENCY_FORMATTER.format(change)}`,
                targetId: selectedCustomer.id,
            });
        }

        const paymentObj: any = { method: paymentMethod, amount: finalPayAmount };
        if (paymentMethod === 'non-cash' && evidenceImage) {
            paymentObj.evidenceImageUrl = evidenceImage;
        }

        const payments = [paymentObj];
        const details = selectedCustomer
            ? { customerId: selectedCustomer.id, customerName: selectedCustomer.name, customerContact: selectedCustomer.contact }
            : { customerName: customerName || 'Pelanggan Umum' };

        onConfirm(payments, details);
    }, [
        addBalance,
        change,
        currentUser,
        customerName,
        depositChange,
        evidenceImage,
        onConfirm,
        payAmountInput,
        paymentMethod,
        selectedCustomer,
        total,
    ]);

    const getInputLabel = useCallback(() => {
        if (paymentMethod === 'member-balance') return 'Nominal Potong Saldo';
        if (paymentMethod === 'non-cash') return 'Nominal Transaksi';
        return 'Uang Tunai Diterima';
    }, [paymentMethod]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Pembayaran"
            size="lg"
            mobileLayout="fullscreen"
            bodyClassName="p-3 sm:p-6"
        >
            <div className={`${isCompactViewport ? 'space-y-3' : 'space-y-4'}`}>
                <div className={`text-center bg-slate-700 rounded-xl ${isCompactViewport ? 'p-3' : 'p-4'}`}>
                    <p className="text-slate-400 text-sm">Total Tagihan</p>
                    <p className={`${isCompactViewport ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>{CURRENCY_FORMATTER.format(total)}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleMethodChange('cash')} className={`${isCompactViewport ? 'p-2 min-h-[72px]' : 'p-2.5 min-h-[80px]'} rounded-xl border text-center transition-colors flex flex-col items-center justify-center ${paymentMethod === 'cash' ? 'bg-[#347758] border-[#347758] text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                        <Icon name="cash" className={`${isCompactViewport ? 'w-4 h-4 mb-1' : 'w-5 h-5 mb-1'}`} /> 
                        <span className={`${isCompactViewport ? 'text-[11px]' : 'text-xs'} font-bold`}>Tunai</span>
                    </button>
                    <button onClick={() => handleMethodChange('non-cash')} className={`${isCompactViewport ? 'p-2 min-h-[72px]' : 'p-2.5 min-h-[80px]'} rounded-xl border text-center transition-colors flex flex-col items-center justify-center ${paymentMethod === 'non-cash' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                        <Icon name="pay" className={`${isCompactViewport ? 'w-4 h-4 mb-1' : 'w-5 h-5 mb-1'}`} /> 
                        <span className={`${isCompactViewport ? 'text-[11px]' : 'text-xs'} font-bold`}>QRIS/Card</span>
                    </button>
                    <button 
                        onClick={() => selectedCustomer ? handleMethodChange('member-balance') : alert('Pilih pelanggan member terlebih dahulu.')}
                        disabled={!selectedCustomer}
                        className={`${isCompactViewport ? 'p-2 min-h-[72px]' : 'p-2.5 min-h-[80px]'} rounded-xl border text-center transition-colors flex flex-col items-center justify-center disabled:opacity-50 relative overflow-hidden ${paymentMethod === 'member-balance' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
                    >
                        <Icon name="finance" className={`${isCompactViewport ? 'w-4 h-4 mb-1' : 'w-5 h-5 mb-1'}`} /> 
                        <span className={`${isCompactViewport ? 'text-[11px]' : 'text-xs'} font-bold`}>Saldo</span>
                        {selectedCustomer && (
                            <span className={`${isCompactViewport ? 'text-[9px]' : 'text-[10px]'} block mt-0.5 bg-black/20 px-1 rounded`}>
                                {CURRENCY_FORMATTER.format(memberBalance).replace(',00', '').replace('Rp', '')}
                            </span>
                        )}
                    </button>
                </div>

                {paymentMethod === 'member-balance' && selectedCustomer && (
                    <div className={`border rounded-xl text-sm ${isCompactViewport ? 'p-2.5' : 'p-3'} ${canPayWithBalance ? 'bg-purple-900/30 border-purple-700' : 'bg-slate-800 border-slate-700'}`}>
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-300">Saldo Member:</span>
                            <span className={`font-bold ${canPayWithBalance ? 'text-white' : 'text-red-400'}`}>{CURRENCY_FORMATTER.format(memberBalance)}</span>
                        </div>

                        {!canPayWithBalance ? (
                            <div className="space-y-3 animate-fade-in">
                                <div className={`bg-red-900/40 rounded-xl flex justify-between items-center ${isCompactViewport ? 'p-2.5' : 'p-3'}`}>
                                    <span className="text-red-300 text-xs font-bold">⚠️ Saldo Kurang</span>
                                    <span className="text-white font-bold text-sm">{CURRENCY_FORMATTER.format(balanceShortage)}</span>
                                </div>
                                
                                <div className="border-t border-slate-700/50 my-1"></div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Split Bill: Bayar Sisa Tunai</p>
                                        <p className="text-[10px] text-slate-500">Potong Saldo: {CURRENCY_FORMATTER.format(memberBalance)}</p>
                                    </div>
                                    
                                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-600 mb-2">
                                        <label className="block text-[10px] text-slate-400 mb-1">Uang Tunai Diterima (untuk kekurangan):</label>
                                        <input 
                                            type="number" 
                                            placeholder={`Min ${balanceShortage}`}
                                            value={splitCashInput}
                                            onChange={(e) => setSplitCashInput(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white font-bold text-center text-lg focus:border-[#347758]"
                                            autoFocus
                                        />
                                    </div>

                                    {splitCashTendered >= balanceShortage && (
                                    <div className="bg-green-900/30 p-2 rounded-xl mb-2 text-center animate-fade-in">
                                            <p className="text-xs text-green-300">Kembalian</p>
                                            <p className="text-lg font-bold text-white">{CURRENCY_FORMATTER.format(splitChange)}</p>
                                        </div>
                                    )}

                                    <Button onClick={handleConfirmSplitPayment} disabled={splitCashTendered < balanceShortage} className="w-full">
                                        Konfirmasi Bayar Split
                                    </Button>
                                </div>
                                <div className="border-t border-slate-700/50 my-2 pt-2">
                                    <p className="text-xs text-slate-500 text-center mb-1">Atau Top Up dulu:</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[10000, 20000, 50000].map((amt) => (
                                            <button 
                                                key={amt} 
                                                onClick={() => setInstantTopUpAmount(amt.toString())}
                                                className="text-[10px] bg-slate-700 text-slate-300 px-2 py-2 rounded-lg hover:bg-slate-600"
                                            >
                                                +{amt/1000}k
                                            </button>
                                        ))}
                                        <button onClick={handleInstantTopUp} disabled={!instantTopUpAmount} className="text-[10px] bg-[#347758] text-white px-2 py-2 rounded-lg">Isi</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="text-center bg-green-900/20 p-2 rounded border border-green-800">
                                    <Icon name="check-circle-fill" className="w-4 h-4 inline mr-1 text-green-400"/> 
                                    <span className="text-xs text-green-300 font-bold">Saldo Mencukupi</span>
                                </div>
                                <Button onClick={handleConfirm} className="w-full">
                                    Bayar dengan Saldo
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {paymentMethod !== 'member-balance' && (
                    <div className="animate-fade-in">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">{getInputLabel()}</label>
                            <input 
                                type="number" 
                                value={amountPaid}
                                onChange={e => setAmountPaid(e.target.value)}
                                className={`w-full bg-slate-900 border border-slate-600 rounded-xl px-3 ${isCompactViewport ? 'py-2.5 text-lg' : 'py-3 text-xl'} font-bold text-center text-white`}
                                placeholder="0"
                                autoFocus
                            />
                        </div>

                        {paymentMethod === 'cash' && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                                {quickAmounts.map((amt, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleQuickAmount(amt)}
                                        disabled={amt < total && idx !== 0}
                                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white disabled:opacity-50"
                                    >
                                        {idx === 0 ? 'Uang Pas' : CURRENCY_FORMATTER.format(amt).replace(',00', '').replace('Rp', '')}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {paymentMethod === 'non-cash' && (
                    <div className={`bg-slate-700/50 border border-slate-600 animate-fade-in rounded-xl ${isCompactViewport ? 'p-2.5' : 'p-3'}`}>
                        <label className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1">
                            <Icon name="camera" className="w-3 h-3"/> Bukti Pembayaran (Opsional)
                        </label>
                        
                        {evidenceImage ? (
                            <div className="relative w-full mb-2">
                                <img src={evidenceImage} alt="Bukti" className={`${isCompactViewport ? 'h-28' : 'h-32'} w-full object-contain rounded-lg bg-black/40`} />
                                <button onClick={() => setEvidenceImage('')} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-500">
                                    <Icon name="close" className="w-4 h-4"/>
                                </button>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-3 gap-2">
                            <Button size="sm" variant="operational" onClick={() => setLocalCameraOpen(true)} className={`${isCompactViewport ? 'h-14' : 'h-16'} flex flex-col items-center justify-center text-xs p-1 rounded-xl`}>
                                <Icon name="camera" className="w-5 h-5 mb-1"/> Kamera
                            </Button>

                            <div className="relative">
                                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                <Button size="sm" variant="operational" onClick={() => fileInputRef.current?.click()} className={`${isCompactViewport ? 'h-14' : 'h-16'} w-full flex flex-col items-center justify-center text-xs p-1 rounded-xl`}>
                                    <Icon name="upload" className="w-5 h-5 mb-1"/> Upload
                                </Button>
                            </div>

                            {isDisplayConnected ? (
                                <Button 
                                    size="sm" 
                                    variant="operational"
                                    onClick={handleRequestCustomerPhoto}
                                    disabled={isWaitingForCustomer}
                                    className={`${isCompactViewport ? 'h-14' : 'h-16'} flex flex-col items-center justify-center text-xs p-1 rounded-xl ${isWaitingForCustomer ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-700 text-white hover:bg-purple-600'}`}
                                >
                                    {isWaitingForCustomer ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1"></span> Menunggu...</>
                                    ) : (
                                        <><Icon name="cast" className="w-5 h-5 mb-1"/> Minta Pelanggan</>
                                    )}
                                </Button>
                            ) : (
                                <div className={`${isCompactViewport ? 'h-14' : 'h-16'} flex flex-col items-center justify-center text-xs p-1 bg-slate-800 rounded-xl text-slate-500 border border-slate-600`}>
                                    <Icon name="cast" className="w-5 h-5 mb-1 opacity-50"/> 
                                    Offline
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!selectedCustomer && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nama Pelanggan (Opsional)</label>
                        <input 
                            type="text"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white"
                            placeholder="Pelanggan Umum"
                        />
                    </div>
                )}

                {change >= 0 && (
                    <div className={`bg-slate-700 rounded-xl animate-fade-in ${isCompactViewport ? 'p-2.5' : 'p-3'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-300">Kembalian</span>
                            <span className={`${isCompactViewport ? 'text-lg' : 'text-xl'} font-bold text-yellow-400`}>{CURRENCY_FORMATTER.format(change)}</span>
                        </div>
                        
                        {paymentMethod === 'cash' && selectedCustomer && change > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-600">
                                <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-slate-600 rounded-xl transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={depositChange}
                                        onChange={(e) => setDepositChange(e.target.checked)}
                                        className="h-5 w-5 rounded bg-slate-800 border-slate-500 text-purple-600 focus:ring-purple-500" 
                                    />
                                    <div className="text-left">
                                        <span className="text-sm text-purple-300 font-bold block">Simpan kembalian ke Saldo?</span>
                                        <span className="text-[10px] text-slate-400">Saldo {selectedCustomer.name} bertambah {CURRENCY_FORMATTER.format(change)}.</span>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {paymentMethod !== 'member-balance' && (
                    <Button onClick={handleConfirm} disabled={!amountPaid} className={`w-full ${isCompactViewport ? 'py-2.5 text-base' : 'py-3 text-lg'}`}>
                        {change >= 0 ? 'Selesaikan Transaksi' : 'Simpan Piutang'}
                    </Button>
                )}
            </div>

            <CameraCaptureModal 
                isOpen={isLocalCameraOpen}
                onClose={() => setLocalCameraOpen(false)}
                onCapture={(img) => setEvidenceImage(img)}
            />
        </Modal>
    );
};

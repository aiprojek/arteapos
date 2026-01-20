
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Icon from '../Icon';
import BarcodeScannerModal from '../BarcodeScannerModal';
import { CURRENCY_FORMATTER } from '../../constants';
import { useCart } from '../../context/CartContext';
import { useSession } from '../../context/SessionContext';
import { useFinance } from '../../context/FinanceContext';
import { useCustomer } from '../../context/CustomerContext';
import { useAudit } from '../../context/AuditContext'; 
import { useAuth } from '../../context/AuthContext';
import { useCustomerDisplay } from '../../context/CustomerDisplayContext'; // NEW
import type { Customer, Transaction, PaymentMethod, Discount, Reward } from '../../types';

// --- NEW: DUAL SCREEN MODAL ---
interface DualScreenModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DualScreenModal: React.FC<DualScreenModalProps> = ({ isOpen, onClose }) => {
    const { isDisplayConnected, connectToDisplay, disconnectDisplay } = useCustomerDisplay();
    const [isScanning, setIsScanning] = useState(false);
    const [displayIdInput, setDisplayIdInput] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async (id: string) => {
        setIsConnecting(true);
        try {
            await connectToDisplay(id);
            onClose();
        } catch (error) {
            alert('Gagal menghubungkan. Pastikan ID benar dan perangkat pelanggan sudah membuka halaman Display.');
        } finally {
            setIsConnecting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Layar Pelanggan (Dual Screen)">
            <div className="space-y-6">
                {isDisplayConnected ? (
                    <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Icon name="check-circle-fill" className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-green-300">Terhubung</h3>
                        <p className="text-sm text-slate-400 mt-2">
                            Keranjang belanja sedang ditampilkan ke pelanggan secara real-time.
                        </p>
                        <Button onClick={disconnectDisplay} variant="danger" className="w-full mt-4">
                            Putuskan Koneksi
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-slate-800 p-3 rounded text-sm text-slate-300">
                            <p className="mb-2"><strong>Cara Penggunaan:</strong></p>
                            <ol className="list-decimal pl-5 space-y-1">
                                <li>Siapkan Tablet/HP kedua untuk pelanggan.</li>
                                <li>Buka aplikasi Artea POS di perangkat tersebut.</li>
                                <li>Di halaman Login, klik tombol <strong>"Mode Layar Pelanggan"</strong>.</li>
                                <li>Scan QR Code yang muncul menggunakan tombol di bawah.</li>
                            </ol>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button onClick={() => setIsScanning(true)} className="w-full py-3 text-lg">
                                <Icon name="camera" className="w-5 h-5" /> Scan QR Code
                            </Button>
                            
                            <div className="relative flex py-1 items-center">
                                <div className="flex-grow border-t border-slate-700"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-500 text-xs">Atau Input ID</span>
                                <div className="flex-grow border-t border-slate-700"></div>
                            </div>

                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={displayIdInput}
                                    onChange={(e) => setDisplayIdInput(e.target.value)}
                                    placeholder="Masukkan ID Perangkat..."
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                                />
                                <Button onClick={() => handleConnect(displayIdInput)} disabled={!displayIdInput || isConnecting}>
                                    {isConnecting ? '...' : 'Hubungkan'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <BarcodeScannerModal 
                isOpen={isScanning}
                onClose={() => setIsScanning(false)}
                onScan={(code) => { setIsScanning(false); handleConnect(code); }}
            />
        </Modal>
    );
};

// --- NEW: MEMBER SEARCH MODAL ---
interface MemberSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: Customer) => void;
    onAddNew: () => void;
    onScan: () => void;
}

export const MemberSearchModal: React.FC<MemberSearchModalProps> = ({ isOpen, onClose, onSelect, onAddNew, onScan }) => {
    const { customers } = useCustomer();
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) setSearch('');
    }, [isOpen]);

    const filtered = useMemo(() => {
        if (!search) return customers.slice(0, 10); // Show recent 10 if empty
        const s = search.toLowerCase();
        return customers.filter(c => 
            c.name.toLowerCase().includes(s) || 
            (c.contact && c.contact.includes(s)) ||
            c.memberId.toLowerCase().includes(s)
        );
    }, [customers, search]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cari Pelanggan Member">
            <div className="space-y-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari Nama / HP / ID..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white auto-focus"
                            autoFocus
                        />
                        <Icon name="search" className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    </div>
                    <Button onClick={onScan} variant="secondary" className="px-3" title="Scan Kartu Member">
                        <Icon name="barcode" className="w-5 h-5"/>
                    </Button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 bg-slate-900/50 p-1 rounded-lg">
                    {filtered.map(c => (
                        <button 
                            key={c.id}
                            onClick={() => { onSelect(c); onClose(); }}
                            className="w-full flex justify-between items-center p-3 rounded bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-500 text-left group"
                        >
                            <div>
                                <p className="font-bold text-white group-hover:text-[#52a37c]">{c.name}</p>
                                <p className="text-xs text-slate-400">{c.memberId} {c.contact ? `• ${c.contact}` : ''}</p>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs text-yellow-400 font-bold">{c.points} Pts</span>
                                {c.balance > 0 && <span className="block text-xs text-green-400">{CURRENCY_FORMATTER.format(c.balance)}</span>}
                            </div>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-center py-4 text-slate-500 text-sm">
                            Member tidak ditemukan.
                        </div>
                    )}
                </div>

                <Button onClick={() => { onClose(); onAddNew(); }} className="w-full" variant="secondary">
                    <Icon name="plus" className="w-4 h-4" /> Daftar Member Baru
                </Button>
            </div>
        </Modal>
    );
}

// --- PAYMENT MODAL ---
interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payments: any[], customerDetails: any) => void;
    total: number;
    selectedCustomer: Customer | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm, total, selectedCustomer }) => {
    const { addBalance } = useCustomer();
    const { logAudit } = useAudit(); 
    const { currentUser } = useAuth();
    
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [customerName, setCustomerName] = useState(''); 
    const [depositChange, setDepositChange] = useState(false); 
    
    // Instant Top Up State
    const [instantTopUpAmount, setInstantTopUpAmount] = useState('');
    
    // Split Bill State
    const [splitCashInput, setSplitCashInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmountPaid('');
            setPaymentMethod('cash');
            setCustomerName(selectedCustomer ? selectedCustomer.name : '');
            setDepositChange(false);
            setInstantTopUpAmount('');
            setSplitCashInput('');
        }
    }, [isOpen, selectedCustomer]);

    const handleQuickAmount = (amt: number) => {
        setAmountPaid(amt.toString());
    };

    const handleMethodChange = (method: PaymentMethod) => {
        setPaymentMethod(method);
        setInstantTopUpAmount(''); 
        setSplitCashInput('');
        if (method === 'member-balance' || method === 'non-cash') {
            setAmountPaid(total.toString());
        } else {
            setAmountPaid(''); 
        }
    };

    const handleInstantTopUp = () => {
        if (!selectedCustomer || !instantTopUpAmount) return;
        const amt = parseFloat(instantTopUpAmount);
        if (amt > 0) {
            addBalance(selectedCustomer.id, amt, "Top Up Instan (Kasir)", true); 
            setInstantTopUpAmount('');
        }
    };

    // --- LOGIC BARU: SPLIT PAYMENT DENGAN KEMBALIAN ---
    const handleConfirmSplitPayment = () => {
        if (!selectedCustomer) return;
        
        const balanceAvailable = selectedCustomer.balance || 0;
        const cashTendered = parseFloat(splitCashInput) || 0;
        const shortage = total - balanceAvailable;

        if (cashTendered < shortage) {
            alert("Uang tunai kurang dari sisa tagihan!");
            return;
        }

        // 1. Potong Saldo Member (Full)
        addBalance(selectedCustomer.id, -balanceAvailable, "Pembayaran Split (Saldo)");
        
        // 2. Audit Log
        logAudit(
            currentUser, 
            'OTHER', 
            `Split Bayar: Saldo ${CURRENCY_FORMATTER.format(balanceAvailable)} + Tunai ${CURRENCY_FORMATTER.format(cashTendered)}`, 
            selectedCustomer.id
        );

        // 3. Catat Pembayaran
        // Kita mencatat 'amount' tunai sesuai yang diberikan (tendered) agar kembalian tercatat di struk
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
    };

    const handleConfirm = () => {
        const payAmountInput = parseFloat(amountPaid) || 0;
        
        let payments: any[] = [];
        let finalPayAmount = payAmountInput;

        // Logic Saldo Full
        if (paymentMethod === 'member-balance' && selectedCustomer) {
            if (payAmountInput > (selectedCustomer.balance || 0)) {
                return; // UI sudah memblokir, double check
            }
            addBalance(selectedCustomer.id, -payAmountInput, "Pembayaran Belanja");
            logAudit(currentUser, 'OTHER', `Pembayaran via Saldo Member: ${CURRENCY_FORMATTER.format(payAmountInput)}`, selectedCustomer.id);
        }

        // Logic Deposit Kembalian
        const change = payAmountInput - total;
        if (paymentMethod === 'cash' && change > 0 && depositChange && selectedCustomer) {
            finalPayAmount = total; 
            addBalance(selectedCustomer.id, change, "Kembalian Belanja Disimpan");
            logAudit(currentUser, 'OTHER', `Simpan Kembalian ke Saldo: ${CURRENCY_FORMATTER.format(change)}`, selectedCustomer.id);
        }

        payments = [{ method: paymentMethod, amount: finalPayAmount }];
        
        const details = selectedCustomer 
            ? { customerId: selectedCustomer.id, customerName: selectedCustomer.name, customerContact: selectedCustomer.contact }
            : { customerName: customerName || 'Pelanggan Umum' };

        onConfirm(payments, details);
    };

    const change = (parseFloat(amountPaid) || 0) - total;
    const quickAmounts = [total, 20000, 50000, 100000];
    
    // Balance Check
    const memberBalance = selectedCustomer?.balance || 0;
    const canPayWithBalance = selectedCustomer && memberBalance >= total;
    const balanceShortage = total - memberBalance;
    
    // Split Calculation
    const splitCashTendered = parseFloat(splitCashInput) || 0;
    const splitChange = splitCashTendered - balanceShortage;

    const getInputLabel = () => {
        if (paymentMethod === 'member-balance') return 'Nominal Potong Saldo';
        if (paymentMethod === 'non-cash') return 'Nominal Transaksi';
        return 'Uang Tunai Diterima';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pembayaran">
            <div className="space-y-4">
                <div className="text-center bg-slate-700 p-4 rounded-lg">
                    <p className="text-slate-400 text-sm">Total Tagihan</p>
                    <p className="text-3xl font-bold text-white">{CURRENCY_FORMATTER.format(total)}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button 
                        onClick={() => handleMethodChange('cash')}
                        className={`p-2 rounded-lg border text-center transition-colors flex flex-col items-center justify-center ${paymentMethod === 'cash' ? 'bg-[#347758] border-[#347758] text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
                    >
                        <Icon name="cash" className="w-5 h-5 mb-1"/> 
                        <span className="text-xs font-bold">Tunai</span>
                    </button>
                    <button 
                        onClick={() => handleMethodChange('non-cash')}
                        className={`p-2 rounded-lg border text-center transition-colors flex flex-col items-center justify-center ${paymentMethod === 'non-cash' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
                    >
                        <Icon name="pay" className="w-5 h-5 mb-1"/> 
                        <span className="text-xs font-bold">QRIS/Card</span>
                    </button>
                    <button 
                        onClick={() => selectedCustomer ? handleMethodChange('member-balance') : alert("Pilih pelanggan member terlebih dahulu.")}
                        disabled={!selectedCustomer}
                        className={`p-2 rounded-lg border text-center transition-colors flex flex-col items-center justify-center disabled:opacity-50 relative overflow-hidden ${paymentMethod === 'member-balance' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
                    >
                        <Icon name="finance" className="w-5 h-5 mb-1"/> 
                        <span className="text-xs font-bold">Saldo</span>
                        {selectedCustomer && (
                            <span className="text-[10px] block mt-0.5 bg-black/20 px-1 rounded">
                                {CURRENCY_FORMATTER.format(memberBalance).replace(',00','').replace('Rp','')}
                            </span>
                        )}
                    </button>
                </div>

                {/* --- LOGIC: MEMBER BALANCE PAYMENT --- */}
                {paymentMethod === 'member-balance' && selectedCustomer && (
                    <div className={`p-3 border rounded-lg text-sm ${canPayWithBalance ? 'bg-purple-900/30 border-purple-700' : 'bg-slate-800 border-slate-700'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-300">Saldo Member:</span>
                            <span className={`font-bold ${canPayWithBalance ? 'text-white' : 'text-red-400'}`}>{CURRENCY_FORMATTER.format(memberBalance)}</span>
                        </div>

                        {!canPayWithBalance ? (
                            <div className="space-y-3 animate-fade-in">
                                <div className="p-3 bg-red-900/40 rounded flex justify-between items-center">
                                    <span className="text-red-300 text-xs font-bold">⚠️ Saldo Kurang</span>
                                    <span className="text-white font-bold text-sm">{CURRENCY_FORMATTER.format(balanceShortage)}</span>
                                </div>
                                
                                <div className="border-t border-slate-700/50 my-1"></div>

                                {/* MENU SPLIT BILL YANG DISEMPURNAKAN */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Split Bill: Bayar Sisa Tunai</p>
                                        <p className="text-[10px] text-slate-500">Potong Saldo: {CURRENCY_FORMATTER.format(memberBalance)}</p>
                                    </div>
                                    
                                    <div className="bg-slate-900 p-2 rounded border border-slate-600 mb-2">
                                        <label className="block text-[10px] text-slate-400 mb-1">Uang Tunai Diterima (untuk kekurangan):</label>
                                        <input 
                                            type="number" 
                                            placeholder={`Min ${balanceShortage}`}
                                            value={splitCashInput}
                                            onChange={(e) => setSplitCashInput(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-2 text-white font-bold text-center text-lg focus:border-[#347758]"
                                            autoFocus
                                        />
                                    </div>

                                    {splitCashTendered >= balanceShortage && (
                                        <div className="bg-green-900/30 p-2 rounded mb-2 text-center animate-fade-in">
                                            <p className="text-xs text-green-300">Kembalian</p>
                                            <p className="text-lg font-bold text-white">{CURRENCY_FORMATTER.format(splitChange)}</p>
                                        </div>
                                    )}

                                    <Button 
                                        onClick={handleConfirmSplitPayment} 
                                        disabled={splitCashTendered < balanceShortage}
                                        className="w-full"
                                    >
                                        Konfirmasi Bayar Split
                                    </Button>
                                </div>

                                <div className="border-t border-slate-700/50 my-2 pt-2">
                                    <p className="text-xs text-slate-500 text-center mb-1">Atau Top Up dulu:</p>
                                    <div className="flex gap-2 justify-center">
                                        {[10000, 20000, 50000].map(amt => (
                                            <button 
                                                key={amt} 
                                                onClick={() => setInstantTopUpAmount(amt.toString())}
                                                className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded hover:bg-slate-600"
                                            >
                                                +{amt/1000}k
                                            </button>
                                        ))}
                                        <button onClick={handleInstantTopUp} disabled={!instantTopUpAmount} className="text-[10px] bg-[#347758] text-white px-2 py-1 rounded">Isi</button>
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

                {/* Hide Standard Input if Balance is insufficient (User must choose an option above) */}
                {!(paymentMethod === 'member-balance') && (
                    <div className="animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">{getInputLabel()}</label>
                            <input 
                                type="number" 
                                value={amountPaid}
                                onChange={e => setAmountPaid(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-3 text-white text-xl font-bold text-center"
                                placeholder="0"
                                autoFocus
                            />
                        </div>

                        {paymentMethod === 'cash' && (
                            <div className="flex gap-2 justify-center mt-2">
                                {quickAmounts.map((amt, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleQuickAmount(amt)}
                                        disabled={amt < total && idx !== 0}
                                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white disabled:opacity-50"
                                    >
                                        {idx === 0 ? 'Uang Pas' : CURRENCY_FORMATTER.format(amt).replace(',00', '').replace('Rp', '')}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!selectedCustomer && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nama Pelanggan (Opsional)</label>
                        <input 
                            type="text"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                            placeholder="Pelanggan Umum"
                        />
                    </div>
                )}

                {change >= 0 && (
                    <div className="bg-slate-700 p-3 rounded-lg animate-fade-in">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-300">Kembalian</span>
                            <span className="text-xl font-bold text-yellow-400">{CURRENCY_FORMATTER.format(change)}</span>
                        </div>
                        
                        {/* Deposit Change Option */}
                        {paymentMethod === 'cash' && selectedCustomer && change > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-600">
                                <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-slate-600 rounded transition-colors">
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

                {/* Main Action Button - Hide for Member Balance because it has its own logic above */}
                {paymentMethod !== 'member-balance' && (
                    <Button onClick={handleConfirm} disabled={!amountPaid} className="w-full py-3 text-lg">
                        {change >= 0 ? 'Selesaikan Transaksi' : 'Simpan Piutang'}
                    </Button>
                )}
            </div>
        </Modal>
    );
};

// --- REWARDS MODAL ---
export const RewardsModal: React.FC<{ isOpen: boolean, onClose: () => void, customer: Customer }> = ({ isOpen, onClose, customer }) => {
    const { membershipSettings } = useCustomer();
    const { applyRewardToCart } = useCart();

    const handleRedeem = (reward: Reward) => {
        applyRewardToCart(reward, customer);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Tukar Poin: ${customer.name}`}>
            <div className="space-y-4">
                <div className="text-center p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <p className="text-slate-400 text-sm">Poin Tersedia</p>
                    <p className="text-2xl font-bold text-yellow-400">{customer.points} pts</p>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {membershipSettings.rewards.map(reward => {
                        const canAfford = customer.points >= reward.pointsCost;
                        return (
                            <div key={reward.id} className={`p-3 rounded-lg border flex justify-between items-center ${canAfford ? 'bg-slate-800 border-slate-600' : 'bg-slate-800/50 border-slate-700 opacity-60'}`}>
                                <div>
                                    <p className="font-bold text-white">{reward.name}</p>
                                    <p className="text-xs text-slate-400">{reward.pointsCost} Poin</p>
                                </div>
                                <Button size="sm" onClick={() => handleRedeem(reward)} disabled={!canAfford} variant={canAfford ? 'primary' : 'secondary'}>
                                    Tukar
                                </Button>
                            </div>
                        )
                    })}
                    {membershipSettings.rewards.length === 0 && <p className="text-center text-slate-500">Belum ada reward yang tersedia.</p>}
                </div>
            </div>
        </Modal>
    );
};

// --- DISCOUNT MODAL ---
interface DiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    initialDiscount: Discount | null;
    onSave: (d: Discount) => void;
    onRemove: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, title, initialDiscount, onSave, onRemove }) => {
    const [type, setType] = useState<'percentage' | 'amount'>('percentage');
    const [value, setValue] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialDiscount) {
                setType(initialDiscount.type);
                setValue(initialDiscount.value.toString());
                setName(initialDiscount.name || '');
            } else {
                setType('percentage');
                setValue('');
                setName('');
            }
        }
    }, [isOpen, initialDiscount]);

    const handleSave = () => {
        const val = parseFloat(value);
        if (isNaN(val) || val < 0) return;
        onSave({ type, value: val, name });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setType('percentage')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'percentage' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Persen (%)</button>
                    <button onClick={() => setType('amount')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'amount' ? 'bg-[#347758] text-white' : 'text-slate-300'}`}>Nominal (Rp)</button>
                </div>
                <div>
                    <label className="block text-sm text-slate-300 mb-1">Nilai Diskon</label>
                    <input type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" autoFocus placeholder="0" />
                </div>
                <div>
                    <label className="block text-sm text-slate-300 mb-1">Keterangan (Opsional)</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" placeholder="cth: Promo Member" />
                </div>
                <div className="flex gap-3 pt-2">
                    {initialDiscount && <Button onClick={() => { onRemove(); onClose(); }} variant="danger" className="flex-1">Hapus</Button>}
                    <Button onClick={handleSave} className="flex-[2]">Simpan</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- CASH MANAGEMENT MODAL ---
export const CashManagementModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addCashMovement } = useSession();
    const [type, setType] = useState<'in' | 'out'>('out');
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');

    const handleSubmit = () => {
        if (!amount || !desc) return;
        addCashMovement(type, parseFloat(amount), desc);
        onClose();
        setAmount('');
        setDesc('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manajemen Kas (Petty Cash)">
            <div className="space-y-4">
                <div className="flex bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setType('in')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'in' ? 'bg-green-600 text-white' : 'text-slate-300'}`}>Masuk (In)</button>
                    <button onClick={() => setType('out')} className={`flex-1 py-2 text-sm rounded transition-colors ${type === 'out' ? 'bg-red-600 text-white' : 'text-slate-300'}`}>Keluar (Out)</button>
                </div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" placeholder="Jumlah (Rp)" />
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" placeholder="Keterangan (cth: Beli Es Batu)" />
                <Button onClick={handleSubmit} className="w-full">Simpan</Button>
            </div>
        </Modal>
    );
};

// --- SESSION HISTORY MODAL ---
interface SessionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onViewReceipt: (t: Transaction) => void;
    onRefund: (t: Transaction) => void;
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({ isOpen, onClose, onViewReceipt, onRefund }) => {
    const { session } = useSession();
    const { transactions } = useFinance();
    
    const sessionTransactions = useMemo(() => {
        if (!session) return [];
        return transactions
            .filter(t => new Date(t.createdAt) >= new Date(session.startTime))
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [session, transactions]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Riwayat Transaksi Sesi Ini">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {sessionTransactions.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">Belum ada transaksi.</p>
                ) : (
                    sessionTransactions.map(t => (
                        <div key={t.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-white text-sm">{t.customerName || 'Umum'} <span className="text-slate-500 font-normal">#{t.id.slice(-4)}</span></p>
                                <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleTimeString()} - {t.paymentStatus === 'refunded' ? 'Refunded' : 'Lunas'}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${t.paymentStatus === 'refunded' ? 'text-slate-500 line-through' : 'text-white'}`}>{CURRENCY_FORMATTER.format(t.total)}</p>
                                <div className="flex gap-2 justify-end mt-1">
                                    <button onClick={() => onViewReceipt(t)} className="text-xs text-sky-400 hover:underline">Struk</button>
                                    {t.paymentStatus !== 'refunded' && (
                                        <button onClick={() => onRefund(t)} className="text-xs text-red-400 hover:underline">Refund</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
                <Button onClick={onClose} variant="secondary" className="w-full">Tutup</Button>
            </div>
        </Modal>
    );
};

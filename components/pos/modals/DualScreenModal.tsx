import React, { useState } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import Icon from '../../Icon';
import BarcodeScannerModal from '../../BarcodeScannerModal';
import { useCustomerDisplayConnections, useCustomerDisplayStatus } from '../../../context/CustomerDisplayContext';

interface DualScreenModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DualScreenModal: React.FC<DualScreenModalProps> = ({ isOpen, onClose }) => {
    const { isDisplayConnected, isKitchenConnected } = useCustomerDisplayStatus();
    const { connectToDisplay, disconnectDisplay, connectToKitchen, disconnectKitchen } = useCustomerDisplayConnections();
    
    const [activeTab, setActiveTab] = useState<'customer' | 'kitchen'>('customer');
    const [isScanning, setIsScanning] = useState(false);
    const [displayIdInput, setDisplayIdInput] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    const isConnected = activeTab === 'customer' ? isDisplayConnected : isKitchenConnected;

    const handleConnect = async (id: string) => {
        setIsConnecting(true);
        try {
            if (activeTab === 'customer') {
                await connectToDisplay(id);
            } else {
                await connectToKitchen(id);
            }
        } catch {
            alert('Gagal menghubungkan. Pastikan ID benar dan perangkat target sudah standby.');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        if (activeTab === 'customer') disconnectDisplay();
        else disconnectKitchen();
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Koneksi Layar Tambahan"
            size="lg"
            mobileLayout="fullscreen"
        >
            <div className="space-y-5">
                <div className="flex gap-1 rounded-2xl border border-slate-700 bg-slate-900/70 p-1">
                    <button 
                        onClick={() => { setActiveTab('customer'); setDisplayIdInput(''); }} 
                        className={`flex-1 min-w-0 px-3 py-3 text-sm rounded-xl transition-all flex items-center justify-center gap-2 border ${
                            activeTab === 'customer'
                                ? 'bg-[#347758] text-white font-bold border-[#4d9a74] shadow-sm shadow-[#347758]/20'
                                : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'
                        }`}
                    >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            activeTab === 'customer' ? 'bg-white/15' : 'bg-slate-800 text-slate-400'
                        }`}>
                            <Icon name="users" className="w-4 h-4"/>
                        </span>
                        <span className="truncate">Pelanggan</span>
                    </button>
                    <button 
                        onClick={() => { setActiveTab('kitchen'); setDisplayIdInput(''); }} 
                        className={`flex-1 min-w-0 px-3 py-3 text-sm rounded-xl transition-all flex items-center justify-center gap-2 border ${
                            activeTab === 'kitchen'
                                ? 'bg-orange-600 text-white font-bold border-orange-500 shadow-sm shadow-orange-500/20'
                                : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'
                        }`}
                    >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            activeTab === 'kitchen' ? 'bg-white/15' : 'bg-slate-800 text-slate-400'
                        }`}>
                            <Icon name="tools" className="w-4 h-4"/>
                        </span>
                        <span className="truncate">Dapur (KDS)</span>
                    </button>
                </div>

                {isConnected ? (
                    <div className={`border p-5 rounded-2xl text-center ${activeTab === 'customer' ? 'bg-green-900/20 border-green-800' : 'bg-orange-900/20 border-orange-800'}`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${activeTab === 'customer' ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                            <Icon name="check-circle-fill" className={`w-8 h-8 ${activeTab === 'customer' ? 'text-green-400' : 'text-orange-400'}`} />
                        </div>
                        <h3 className={`text-xl font-bold ${activeTab === 'customer' ? 'text-green-300' : 'text-orange-300'}`}>Terhubung</h3>
                        <p className="text-sm text-slate-400 mt-2">
                            {activeTab === 'customer' 
                                ? 'Keranjang belanja muncul di layar pelanggan.' 
                                : 'Pesanan akan otomatis dikirim ke layar dapur.'}
                        </p>
                        <Button onClick={handleDisconnect} variant="danger" className="w-full mt-4">
                            Putuskan Koneksi
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 border border-slate-700 p-4 rounded-2xl text-sm text-slate-300">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeTab === 'customer' ? 'bg-[#347758]/20 text-[#8fd3b2]' : 'bg-orange-500/20 text-orange-300'}`}>
                                    <Icon name={activeTab === 'customer' ? 'users' : 'tools'} className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-white">
                                        {activeTab === 'customer' ? 'Sambungkan layar pelanggan' : 'Sambungkan layar dapur'}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {activeTab === 'customer'
                                            ? 'Tampilkan ringkasan keranjang ke layar kedua.'
                                            : 'Kirim pesanan masuk langsung ke tampilan dapur.'}
                                    </p>
                                </div>
                            </div>
                            <p className="mb-2 font-semibold text-slate-200">Cara Penggunaan:</p>
                            <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                                <li>Siapkan perangkat kedua (Tablet/HP).</li>
                                <li>Buka Artea POS di perangkat tersebut.</li>
                                <li>
                                    {activeTab === 'customer' 
                                        ? 'Di layar Login, klik "Mode Layar Pelanggan".' 
                                        : 'Di layar Login, klik "Mode Layar Pelanggan" lalu ganti URL menjadi ?view=kitchen-display atau pindai QR di bawah.'}
                                </li>
                                <li>Scan QR Code yang muncul di perangkat tersebut.</li>
                            </ol>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button onClick={() => setIsScanning(true)} variant="operational" className="w-full h-12 text-base">
                                <Icon name="camera" className="w-5 h-5" /> Scan QR Code
                            </Button>
                            
                            <div className="relative flex py-1 items-center">
                                <div className="flex-grow border-t border-slate-700"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-500 text-xs">Atau Input ID</span>
                                <div className="flex-grow border-t border-slate-700"></div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="text" 
                                    value={displayIdInput}
                                    onChange={(e) => setDisplayIdInput(e.target.value)}
                                    placeholder="Masukkan ID Perangkat..."
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-3 py-3 text-white"
                                />
                                <Button onClick={() => handleConnect(displayIdInput)} disabled={!displayIdInput || isConnecting} className="sm:min-w-[140px]">
                                    {isConnecting ? 'Menghubungkan...' : 'Hubungkan'}
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

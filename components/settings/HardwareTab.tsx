
import React, { useState, useEffect } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import { bluetoothPrinterService } from '../../utils/bluetoothPrinter';
import { useUI } from '../../context/UIContext';
import { useSettings } from '../../context/SettingsContext';
import type { Transaction } from '../../types';
import BarcodeScannerModal from '../BarcodeScannerModal';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

const SettingsCard: React.FC<{ title: string; description?: string; children: React.ReactNode; icon?: any }> = ({ title, description, children, icon }) => (
    <div className="bg-slate-800 rounded-lg shadow-md border border-slate-700 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-700 bg-slate-800 flex items-start gap-3">
            {icon && <div className="p-2 bg-slate-700 rounded-lg text-slate-300">{icon}</div>}
            <div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
            </div>
        </div>
        <div className="p-4 space-y-4">
            {children}
        </div>
    </div>
);

const HardwareTab: React.FC = () => {
    const { showAlert } = useUI();
    const { receiptSettings, updateReceiptSettings } = useSettings();
    const isNative = Capacitor.isNativePlatform();
    
    // Scanner Tester State
    const [testBarcode, setTestBarcode] = useState('');
    const [scannerStatus, setScannerStatus] = useState<'idle' | 'success'>('idle');
    
    // Camera Tester State
    const [isCameraTestOpen, setCameraTestOpen] = useState(false);

    // Native Bluetooth State
    const [pairedDevices, setPairedDevices] = useState<{name: string, address: string}[]>([]);
    const [isScanningBt, setIsScanningBt] = useState(false);

    const openAppSettings = async () => {
        try {
            await BarcodeScanner.openAppSettings();
        } catch (e) {
            console.error("Failed to open settings", e);
        }
    };

    // --- PRINTER HANDLERS ---
    
    const handleConnectWebBluetooth = async () => {
        try {
            const connected = await bluetoothPrinterService.connectWeb();
            if (connected) {
                showAlert({ type: 'alert', title: 'Terhubung', message: 'Printer siap digunakan.' });
            }
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal Koneksi', message: e.message });
        }
    };

    const handleScanNativeDevices = async () => {
        setIsScanningBt(true);
        try {
            const devices = await bluetoothPrinterService.listPairedDevicesNative();
            setPairedDevices(devices);
            if (devices.length === 0) {
                showAlert({type: 'alert', title: 'Tidak Ditemukan', message: 'Tidak ada perangkat Bluetooth yang ter-pairing. Silakan pairing printer di Pengaturan Bluetooth HP terlebih dahulu.'});
            }
        } catch (e: any) {
            showAlert({type: 'alert', title: 'Gagal Scan', message: e.message});
        } finally {
            setIsScanningBt(false);
        }
    };

    const handleSelectNativeDevice = (device: {name: string, address: string}) => {
        updateReceiptSettings({ ...receiptSettings, printerMacAddress: device.address });
        showAlert({ type: 'alert', title: 'Disimpan', message: `Printer ${device.name} dipilih sebagai default.` });
    };

    const handleClearNativeDevice = () => {
        updateReceiptSettings({ ...receiptSettings, printerMacAddress: undefined });
    };

    const handleTestPrint = async () => {
        try {
            await bluetoothPrinterService.printReceipt(getDummyTransaction(), receiptSettings);
        } catch (e: any) {
            showAlert({ 
                type: 'alert', 
                title: 'Gagal Cetak', 
                message: e.message 
            });
        }
    };

    const handleDownloadRawThermal = () => {
        // Link resmi Raw Thermal GitHub Release
        window.open('https://github.com/aiprojek/raw-thermal/releases/tag/release', '_blank');
    }

    // --- SCANNER HANDLERS ---
    const handleScannerTestInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (testBarcode.trim().length > 0) {
                setScannerStatus('success');
                setTimeout(() => {
                    setTestBarcode('');
                    setScannerStatus('idle');
                }, 2000);
            }
        }
    };

    const getDummyTransaction = (): Transaction => ({
        id: 'TEST-HARDWARE-001',
        storeId: receiptSettings.storeId || 'TEST',
        items: [
            { id: '1', cartItemId: '1', name: 'Tes Produk A', price: 15000, quantity: 1, category: ['Test'] },
            { id: '2', cartItemId: '2', name: 'Tes Produk B', price: 20000, quantity: 2, category: ['Test'] }
        ],
        subtotal: 55000,
        total: 55000,
        amountPaid: 60000,
        paymentStatus: 'paid',
        orderType: 'dine-in',
        payments: [{ id: 'p1', method: 'cash', amount: 60000, createdAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
        userId: 'user',
        userName: 'Admin',
        tax: 0,
        serviceCharge: 0
    });

    return (
        <div className="animate-fade-in space-y-6">
            
            {/* 1. PRINTER SECTION */}
            <SettingsCard 
                title="Printer Struk (Thermal)" 
                description="Koneksi ke Printer Bluetooth 58mm / 80mm."
                icon={<Icon name="printer" className="w-6 h-6"/>}
            >
                {isNative ? (
                    <div className="space-y-4">
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-600">
                            <h4 className="text-sm font-bold text-white mb-2">Metode 1: Direct Connection (Recommended)</h4>
                            <p className="text-xs text-slate-400 mb-3">
                                Koneksi langsung ke printer tanpa aplikasi tambahan. Pastikan printer sudah di-pairing di menu Bluetooth HP.
                            </p>
                            
                            {receiptSettings.printerMacAddress ? (
                                <div className="flex items-center justify-between bg-green-900/20 border border-green-800 p-2 rounded mb-3">
                                    <div>
                                        <p className="text-xs text-green-300 font-bold">Terhubung ke:</p>
                                        <p className="text-sm text-white font-mono">{receiptSettings.printerMacAddress}</p>
                                    </div>
                                    <button onClick={handleClearNativeDevice} className="text-red-400 text-xs underline">Hapus</button>
                                </div>
                            ) : (
                                <div className="text-xs text-yellow-500 mb-3 italic">Belum ada printer dipilih.</div>
                            )}

                            <Button onClick={handleScanNativeDevices} disabled={isScanningBt} variant="secondary" className="w-full bg-slate-700">
                                {isScanningBt ? 'Mencari...' : <><Icon name="search" className="w-4 h-4"/> Cari Perangkat Paired</>}
                            </Button>

                            {pairedDevices.length > 0 && (
                                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                                    {pairedDevices.map(dev => (
                                        <button 
                                            key={dev.address} 
                                            onClick={() => handleSelectNativeDevice(dev)}
                                            className="w-full text-left p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs flex justify-between"
                                        >
                                            <span className="font-bold text-white">{dev.name}</span>
                                            <span className="text-slate-400 font-mono">{dev.address}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-600 opacity-80">
                            <h4 className="text-sm font-bold text-white mb-2">Metode 2: Driver Eksternal (Raw Thermal)</h4>
                            <p className="text-xs text-slate-400 mb-2">
                                Gunakan ini jika Direct Connection gagal. Butuh install aplikasi 'Raw Thermal'.
                            </p>
                            <Button onClick={handleDownloadRawThermal} variant="secondary" size="sm" className="w-full bg-slate-700">
                                <Icon name="download" className="w-4 h-4"/> Install Driver (GitHub)
                            </Button>
                        </div>

                        <div className="pt-2 border-t border-slate-700">
                            <Button onClick={handleTestPrint} className="w-full py-3">
                                <Icon name="printer" className="w-5 h-5"/> Tes Print Struk
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded-r text-sm text-slate-300">
                            <p className="font-bold text-yellow-300 mb-1">Mode PC/Laptop (Web Bluetooth)</p>
                            <p>Gunakan Google Chrome atau Edge. Fitur ini mungkin tidak jalan di Firefox/Safari.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button onClick={handleConnectWebBluetooth} variant="secondary" className="flex-1">
                                <Icon name="bluetooth" className="w-4 h-4"/> 1. Cari Printer
                            </Button>
                            <Button onClick={handleTestPrint} className="flex-1">
                                <Icon name="printer" className="w-4 h-4"/> 2. Tes Print
                            </Button>
                        </div>
                    </div>
                )}
            </SettingsCard>

            {/* 2. SCANNER SECTION */}
            <SettingsCard 
                title="Barcode Scanner Fisik" 
                description="Tes alat scanner USB atau Bluetooth."
                icon={<Icon name="barcode" className="w-6 h-6"/>}
            >
                <div className="space-y-3">
                    <p className="text-sm text-slate-300">
                        Klik kolom di bawah, lalu scan barcode barang apapun untuk mengetes alat.
                    </p>
                    
                    <div className={`relative flex items-center p-3 rounded-lg border transition-colors ${scannerStatus === 'success' ? 'bg-green-900/20 border-green-500' : 'bg-slate-900 border-slate-600'}`}>
                        <Icon name="barcode" className={`w-6 h-6 mr-3 ${scannerStatus === 'success' ? 'text-green-400' : 'text-slate-500'}`} />
                        <input
                            type="text"
                            value={testBarcode}
                            onChange={(e) => setTestBarcode(e.target.value)}
                            onKeyDown={handleScannerTestInput}
                            placeholder="Scan disini..."
                            className="bg-transparent border-none outline-none text-white w-full placeholder-slate-500"
                        />
                        {scannerStatus === 'success' && (
                            <span className="text-xs font-bold text-green-400 animate-pulse bg-green-900/50 px-2 py-1 rounded">
                                SUKSES!
                            </span>
                        )}
                    </div>
                </div>
            </SettingsCard>

            {/* 3. CAMERA SECTION */}
            <SettingsCard 
                title="Kamera HP" 
                description="Izin kamera untuk scan barcode dan foto bukti."
                icon={<Icon name="camera" className="w-6 h-6"/>}
            >
                <div className="flex justify-between items-center gap-2 flex-wrap">
                    <div className="text-sm text-slate-300">
                       Pastikan izin kamera diberikan.
                    </div>
                    <div className="flex gap-2">
                        {isNative && (
                            <Button onClick={openAppSettings} variant="secondary" size="sm" className="shrink-0">
                                <Icon name="settings" className="w-4 h-4"/> Buka Setting
                            </Button>
                        )}
                        <Button onClick={() => setCameraTestOpen(true)} variant="secondary" size="sm" className="shrink-0">
                            <Icon name="camera" className="w-4 h-4"/> Tes Kamera
                        </Button>
                    </div>
                </div>
            </SettingsCard>

            {/* Camera Test Modal */}
            <BarcodeScannerModal 
                isOpen={isCameraTestOpen} 
                onClose={() => setCameraTestOpen(false)} 
                onScan={(code) => {
                    showAlert({ type: 'alert', title: 'Berhasil', message: `Kamera berfungsi. Kode: ${code}` });
                    setCameraTestOpen(false);
                }} 
            />
        </div>
    );
};

export default HardwareTab;

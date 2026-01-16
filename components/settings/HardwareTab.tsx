
import React, { useState, useEffect, useRef } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import { bluetoothPrinterService } from '../../utils/bluetoothPrinter';
import { useUI } from '../../context/UIContext';
import { useSettings } from '../../context/SettingsContext';
import type { Transaction } from '../../types';
import BarcodeScannerModal from '../BarcodeScannerModal';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'; // We use this plugin to request Camera permissions as proxy

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
    const { receiptSettings } = useSettings();
    const isNative = Capacitor.isNativePlatform();
    
    // Bluetooth State
    const [isBleSupported, setIsBleSupported] = useState(false);
    const [isBleConnected, setIsBleConnected] = useState(false);
    const [isBleScanning, setIsBleScanning] = useState(false);
    
    // Native List State
    const [pairedDevices, setPairedDevices] = useState<any[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    // Scanner Tester State
    const [testBarcode, setTestBarcode] = useState('');
    const [scannerStatus, setScannerStatus] = useState<'idle' | 'success'>('idle');
    const scannerInputRef = useRef<HTMLInputElement>(null);

    // Camera Tester State
    const [isCameraTestOpen, setCameraTestOpen] = useState(false);

    useEffect(() => {
        // Feature Detection
        if (isNative) {
            setIsBleSupported(true);
            checkNativeConnection();
        } else if (navigator.bluetooth) {
            setIsBleSupported(true);
        }
    }, [isNative]);

    const checkNativeConnection = () => {
        if (!window.bluetoothSerial) return;
        window.bluetoothSerial.isConnected(
            () => setIsBleConnected(true),
            () => setIsBleConnected(false)
        );
    }

    // --- BLUETOOTH HANDLERS ---
    const handleConnectBle = async () => {
        setIsBleScanning(true);
        
        if (isNative) {
            // NATIVE: List paired devices first
            try {
                // This call triggers permission prompt on Android 12+ if not granted
                const devices = await bluetoothPrinterService.listNativeDevices();
                setPairedDevices(devices);
                if (devices.length === 0) {
                    showAlert({type: 'alert', title: 'Kosong', message: 'Tidak ada perangkat Bluetooth yang terpasang (Paired). Silakan pasangkan printer di Pengaturan Bluetooth Android terlebih dahulu.'});
                }
            } catch (e: any) {
                console.error("Bluetooth Error:", e);
                const errorStr = e ? e.toString().toLowerCase() : "";
                
                // Handle Permission Errors specifically for Android 12+
                if (errorStr.includes('permission') || errorStr.includes('denied')) {
                    showAlert({
                        type: 'alert', 
                        title: 'Izin Bluetooth Ditolak', 
                        message: 'Untuk mencari printer, Aplikasi membutuhkan izin "Perangkat Sekitar" (Nearby Devices) dan "Bluetooth Connect". Mohon izinkan saat muncul pop-up, atau aktifkan manual di Pengaturan Aplikasi.'
                    });
                } else {
                    showAlert({type: 'alert', title: 'Gagal Memuat', message: 'Pastikan Bluetooth Aktif. Error: ' + e});
                }
            } finally {
                setIsBleScanning(false);
            }
        } else {
            // WEB: Scan directly
            try {
                const result = await bluetoothPrinterService.connectWeb();
                if (result) {
                    setIsBleConnected(true);
                    showAlert({ type: 'alert', title: 'Terhubung', message: 'Printer Bluetooth berhasil terhubung.' });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsBleScanning(false);
            }
        }
    };

    const handleNativePairSelection = async (macAddress: string) => {
        setSelectedDeviceId(macAddress);
        try {
            await bluetoothPrinterService.connectNative(macAddress);
            setIsBleConnected(true);
            showAlert({ type: 'alert', title: 'Terhubung', message: 'Printer berhasil terhubung!' });
            setPairedDevices([]); // Clear list to show connected status
        } catch (e: any) {
            showAlert({ type: 'alert', title: 'Gagal', message: 'Gagal terhubung: ' + e });
        }
    };

    const handleDisconnect = async () => {
        if (isNative) {
            await bluetoothPrinterService.disconnectNative();
            setIsBleConnected(false);
            setSelectedDeviceId(null);
        }
    };

    const handleTestPrintBle = async () => {
        if (!isBleConnected && !isNative) {
            // Web check only, native might be connected in background
            showAlert({ type: 'alert', title: 'Belum Terhubung', message: 'Silakan hubungkan printer terlebih dahulu.' });
            return;
        }
        await bluetoothPrinterService.printReceipt(getDummyTransaction(), receiptSettings);
    };

    // --- SYSTEM PRINTER HANDLERS ---
    const handleTestPrintSystem = () => {
        window.print();
    };

    // --- PHYSICAL SCANNER HANDLERS ---
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

    // --- PERMISSION REQUEST HELPER ---
    const requestCameraPermission = async () => {
        if (!isNative) return;
        try {
            // We use BarcodeScanner plugin to ask for camera since we don't have a dedicated permission plugin installed.
            const status = await BarcodeScanner.checkPermission({ force: true });
            if (status.granted) {
                showAlert({type:'alert', title:'Izin Diberikan', message:'Akses kamera telah diizinkan.'});
            } else {
                // If denied, sometimes we need to direct user to settings
                if (status.denied) {
                    showAlert({type:'alert', title:'Izin Ditolak', message:'Mohon buka Pengaturan > Aplikasi > Artea POS > Izin, lalu aktifkan Kamera.'});
                    BarcodeScanner.openAppSettings();
                }
            }
        } catch(e) {
            console.error(e);
        }
    }

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
            
            {/* 1. BLUETOOTH PRINTER SECTION */}
            <SettingsCard 
                title="Printer Thermal (Bluetooth)" 
                description="Koneksi langsung ke printer mobile/portable 58mm & 80mm."
                icon={<Icon name="bluetooth" className="w-6 h-6"/>}
            >
                {isBleSupported ? (
                    <>
                        <div className="bg-blue-900/20 border-l-4 border-blue-500 p-3 rounded-r text-xs text-slate-300 space-y-1">
                            <p><strong>Cara Pakai:</strong> Nyalakan Bluetooth HP & Printer. Pasangkan (Pair) printer di menu Bluetooth HP Anda terlebih dahulu.</p>
                            {isNative && <p className="text-green-400 font-bold">Mode Native Aktif: Mendukung semua printer Bluetooth Classic.</p>}
                        </div>
                        
                        <div className="flex flex-col gap-4 bg-slate-900 p-4 rounded-lg border border-slate-600">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${isBleConnected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                        <Icon name="printer" className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Status: {isBleConnected ? 'Terhubung' : 'Terputus'}</p>
                                        {isBleConnected && isNative && <p className="text-xs text-slate-400">ID: {selectedDeviceId}</p>}
                                    </div>
                                </div>
                                
                                {isBleConnected && isNative && (
                                    <button onClick={handleDisconnect} className="text-red-400 text-xs underline">Putuskan</button>
                                )}
                            </div>

                            {/* Native Device List */}
                            {isNative && pairedDevices.length > 0 && !isBleConnected && (
                                <div className="space-y-2 mt-2">
                                    <p className="text-xs text-slate-400">Pilih perangkat yang sudah dipairing:</p>
                                    {pairedDevices.map((dev: any) => (
                                        <button 
                                            key={dev.address} 
                                            onClick={() => handleNativePairSelection(dev.address)}
                                            className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded flex justify-between items-center"
                                        >
                                            <span className="font-bold text-white">{dev.name || 'Unknown Device'}</span>
                                            <span className="text-xs text-slate-500 font-mono">{dev.address}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2 w-full mt-2">
                                {!isBleConnected && (
                                    <Button 
                                        variant="primary" 
                                        onClick={handleConnectBle} 
                                        disabled={isBleScanning}
                                        className="flex-1"
                                        size="sm"
                                    >
                                        {isBleScanning ? 'Memindai...' : (isNative ? 'Cari Printer & Izin' : 'Cari Printer')}
                                    </Button>
                                )}
                                <Button 
                                    variant="secondary" 
                                    onClick={handleTestPrintBle} 
                                    className="flex-1"
                                    size="sm"
                                >
                                    Tes Print
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-3">
                        <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r">
                            <h4 className="font-bold text-red-300 text-sm flex items-center gap-2">
                                <Icon name="warning" className="w-4 h-4"/> Browser Tidak Mendukung
                            </h4>
                            <p className="text-xs text-slate-300 mt-1">
                                Jika di Laptop, gunakan Chrome/Edge. Jika di Android, instal aplikasi APK Artea POS.
                            </p>
                        </div>
                    </div>
                )}
            </SettingsCard>

            {/* 2. SYSTEM PRINTER SECTION */}
            <SettingsCard 
                title="Printer Kabel / Sistem (USB/WiFi)" 
                description="Printer desktop yang terinstal di komputer/laptop."
                icon={<Icon name="printer" className="w-6 h-6"/>}
            >
                <div className="flex justify-between items-center gap-4">
                    <div className="text-sm text-slate-300">
                        <p>Menggunakan dialog cetak bawaan (Ctrl+P).</p>
                    </div>
                    <Button onClick={handleTestPrintSystem} variant="secondary" size="sm" className="shrink-0">
                        <Icon name="printer" className="w-4 h-4"/> Buka Dialog Print
                    </Button>
                </div>
            </SettingsCard>

            {/* 3. PHYSICAL SCANNER SECTION */}
            <SettingsCard 
                title="Barcode Scanner Fisik" 
                description="Alat scanner USB atau Dongle Wireless."
                icon={<Icon name="barcode" className="w-6 h-6"/>}
            >
                <div className="space-y-3">
                    <p className="text-sm text-slate-300">
                        Klik kolom di bawah lalu scan barcode untuk tes.
                    </p>
                    
                    <div className={`relative flex items-center p-3 rounded-lg border transition-colors ${scannerStatus === 'success' ? 'bg-green-900/20 border-green-500' : 'bg-slate-900 border-slate-600'}`}>
                        <Icon name="barcode" className={`w-6 h-6 mr-3 ${scannerStatus === 'success' ? 'text-green-400' : 'text-slate-500'}`} />
                        <input
                            ref={scannerInputRef}
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

            {/* 4. CAMERA SECTION */}
            <SettingsCard 
                title="Kamera & Izin" 
                description="Menggunakan kamera HP sebagai scanner dan izin aplikasi."
                icon={<Icon name="camera" className="w-6 h-6"/>}
            >
                <div className="flex justify-between items-center gap-2 flex-wrap">
                    <div className="text-sm text-slate-300">
                       Tes fungsi kamera dan minta izin jika belum.
                    </div>
                    <div className="flex gap-2">
                        {isNative && (
                            <Button onClick={requestCameraPermission} variant="secondary" size="sm" className="shrink-0">
                                <Icon name="lock" className="w-4 h-4"/> Cek Izin
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

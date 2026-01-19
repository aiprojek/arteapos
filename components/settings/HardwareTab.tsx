
import React, { useState, useEffect, useRef } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import { bluetoothPrinterService } from '../../utils/bluetoothPrinter';
import { useUI } from '../../context/UIContext';
import { useSettings } from '../../context/SettingsContext';
import type { Transaction } from '../../types';
import BarcodeScannerModal from '../BarcodeScannerModal';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

// Interface untuk plugin Permissions
declare global {
    interface Window {
        cordova?: {
            plugins?: {
                permissions?: {
                    checkPermission: (permission: any, success: (status: any) => void, error: (err: any) => void) => void;
                    requestPermission: (permission: any, success: (status: any) => void, error: (err: any) => void) => void;
                    requestPermissions: (permissions: any[], success: (status: any) => void, error: (err: any) => void) => void;
                    BLUETOOTH_SCAN?: string;
                    BLUETOOTH_CONNECT?: string;
                    BLUETOOTH_ADVERTISE?: string;
                    ACCESS_COARSE_LOCATION?: string;
                }
            }
        }
    }
}

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
    const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'denied'>('unknown');
    
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

    const openAppSettings = async () => {
        try {
            await BarcodeScanner.openAppSettings();
        } catch (e) {
            console.error("Failed to open settings", e);
        }
    };

    // --- PERMISSION REQUEST HANDLER ---
    const requestAndroid12Permissions = (): Promise<boolean> => {
        return new Promise((resolve) => {
            const permissions = window.cordova?.plugins?.permissions;
            if (!permissions) {
                // Plugin belum siap atau tidak ada
                resolve(true); // Asumsi boleh/legacy
                return;
            }

            // List izin Android 12+
            // Kita gunakan string literal karena konstanta mungkin belum tersedia di runtime lama
            const scanPerm = permissions.BLUETOOTH_SCAN || 'android.permission.BLUETOOTH_SCAN';
            const connectPerm = permissions.BLUETOOTH_CONNECT || 'android.permission.BLUETOOTH_CONNECT';
            
            // Untuk Android 11 ke bawah, plugin bluetooth-serial biasanya handle sendiri, 
            // tapi kita bisa minta Coarse Location untuk jaga-jaga.
            const locationPerm = permissions.ACCESS_COARSE_LOCATION || 'android.permission.ACCESS_COARSE_LOCATION';

            permissions.requestPermissions([scanPerm, connectPerm, locationPerm], 
                (status: any) => {
                    if (!status.hasPermission) {
                        console.warn("Permission denied via plugin");
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                }, 
                () => {
                    console.error("Permission error via plugin");
                    resolve(false);
                }
            );
        });
    };

    // --- BLUETOOTH HANDLERS ---
    const handleConnectBle = async () => {
        setIsBleScanning(true);
        setPermissionStatus('unknown');
        
        if (isNative) {
            // STEP 1: Explicitly Ask for Android 12 Permissions
            const granted = await requestAndroid12Permissions();
            if (!granted) {
                setPermissionStatus('denied');
                setIsBleScanning(false);
                showAlert({
                    type: 'confirm', 
                    title: 'Izin Dibutuhkan', 
                    message: 'Aplikasi memerlukan izin "Perangkat Sekitar" (Nearby Devices) untuk menemukan printer. Mohon izinkan di Pengaturan.',
                    confirmText: 'Buka Pengaturan',
                    onConfirm: openAppSettings
                });
                return;
            }

            // STEP 2: List Devices
            try {
                const devices = await bluetoothPrinterService.listNativeDevices();
                setPairedDevices(devices);
                if (devices.length === 0) {
                    showAlert({type: 'alert', title: 'Kosong', message: 'Tidak ada perangkat Bluetooth yang terpasang (Paired). Silakan pasangkan printer di Pengaturan Bluetooth Android HP Anda terlebih dahulu, lalu kembali ke sini.'});
                }
            } catch (e: any) {
                console.error("Bluetooth Error:", e);
                const errorStr = e ? e.toString().toLowerCase() : "";
                
                if (errorStr.includes('permission') || errorStr.includes('denied')) {
                    setPermissionStatus('denied');
                } else {
                    showAlert({type: 'alert', title: 'Gagal Memuat', message: 'Pastikan Bluetooth Aktif. ' + e});
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
        // Ask permission again just in case 'Connect' needs it specifically
        await requestAndroid12Permissions();
        
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
                            {isNative && <p className="text-green-400 font-bold">Mode Native: Support Android 12+ (Nearby Devices).</p>}
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
                                    <p className="text-xs text-slate-400">Pilih printer yang sudah dipairing:</p>
                                    {pairedDevices.map((dev: any) => (
                                        <button 
                                            key={dev.address} 
                                            onClick={() => handleNativePairSelection(dev.address)}
                                            className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded flex justify-between items-center"
                                        >
                                            <div>
                                                <span className="font-bold text-white block">{dev.name || 'Unknown Device'}</span>
                                                <span className="text-xs text-slate-500 font-mono">{dev.address}</span>
                                            </div>
                                            <Icon name="bluetooth" className="w-4 h-4 text-sky-500" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Permission Denied UI */}
                            {permissionStatus === 'denied' && (
                                <div className="bg-red-900/30 border border-red-800 p-3 rounded text-center">
                                    <p className="text-xs text-red-300 mb-2 font-bold">Izin Bluetooth Ditolak</p>
                                    <p className="text-xs text-slate-300 mb-2">Android 12+ mewajibkan izin "Nearby Devices" agar aplikasi bisa mendeteksi printer.</p>
                                    <Button onClick={openAppSettings} size="sm" variant="secondary" className="w-full">
                                        <Icon name="settings" className="w-4 h-4" /> Buka Pengaturan & Izinkan
                                    </Button>
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
                                        {isBleScanning ? 'Memindai...' : (isNative ? 'Cari Printer (Pair)' : 'Cari Printer')}
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

            {/* 2. USB / SYSTEM PRINTER */}
            <SettingsCard 
                title="Printer Kabel (USB OTG / Windows)" 
                description="Untuk printer USB di Android, gunakan kabel OTG dan pastikan printer terdeteksi sistem."
                icon={<Icon name="printer" className="w-6 h-6"/>}
            >
                <div className="flex flex-col gap-3">
                    <div className="text-xs text-slate-300 bg-slate-900 p-3 rounded">
                        <p><strong>Android USB (OTG):</strong> Aplikasi ini belum mendukung <em>Direct USB</em>. Gunakan tombol di bawah untuk membuka dialog cetak sistem Android (via RawBT atau Print Service bawaan).</p>
                    </div>
                    <Button onClick={handleTestPrintSystem} variant="secondary" size="sm" className="w-full">
                        <Icon name="printer" className="w-4 h-4"/> Buka Dialog Print Sistem
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

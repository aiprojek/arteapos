
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
    const [pairedDevices, setPairedDevices] = useState<any[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    // Scanner Tester State
    const [testBarcode, setTestBarcode] = useState('');
    const [scannerStatus, setScannerStatus] = useState<'idle' | 'success'>('idle');
    const scannerInputRef = useRef<HTMLInputElement>(null);

    // Camera Tester State
    const [isCameraTestOpen, setCameraTestOpen] = useState(false);

    useEffect(() => {
        if (isNative) {
            setIsBleSupported(true);
        } else if ((navigator as any).bluetooth) {
            setIsBleSupported(true);
        }
    }, [isNative]);

    const openAppSettings = async () => {
        try {
            await BarcodeScanner.openAppSettings();
        } catch (e) {
            console.error("Failed to open settings", e);
        }
    };

    // --- BLUETOOTH HANDLERS ---
    const handleListDevices = async () => {
        setIsBleScanning(true);
        
        if (isNative) {
            try {
                // Menggunakan Plugin Custom "BluetoothPrinter"
                // Fungsi ini akan otomatis meminta izin CONNECT jika belum ada
                const devices = await bluetoothPrinterService.listNativeDevices();
                setPairedDevices(devices);
                if (devices.length === 0) {
                    showAlert({type: 'alert', title: 'Kosong', message: 'Tidak ada perangkat Bluetooth yang terpasang (Paired). Silakan pasangkan printer di Pengaturan Bluetooth HP Android Anda terlebih dahulu.'});
                }
            } catch (e: any) {
                console.error("Bluetooth Error:", e);
                showAlert({type: 'alert', title: 'Gagal Memuat', message: e.message || 'Pastikan Bluetooth Aktif & Izin Diberikan.'});
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
            // Jangan kosongkan list device, biarkan user bisa ganti jika mau
        } catch (e: any) {
            setIsBleConnected(false);
            showAlert({ type: 'alert', title: 'Gagal', message: 'Gagal terhubung: ' + e.message });
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
                            <p><strong>Cara Pakai:</strong></p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Nyalakan Printer & Bluetooth HP.</li>
                                <li>Buka <strong>Pengaturan Bluetooth HP</strong> Anda, lalu Pairing (Pasangkan) dengan printer.</li>
                                <li>Kembali ke sini, klik "Cari Perangkat" dan pilih printer Anda.</li>
                            </ol>
                            {isNative && <p className="text-yellow-400 font-bold mt-2">⚠️ Info: Jika fitur Bluetooth Native bermasalah, silakan gunakan Browser Chrome/Edge.</p>}
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
                            {isNative && pairedDevices.length > 0 && (
                                <div className="space-y-2 mt-2">
                                    <p className="text-xs text-slate-400">Pilih printer:</p>
                                    {pairedDevices.map((dev: any) => (
                                        <button 
                                            key={dev.address} 
                                            onClick={() => handleNativePairSelection(dev.address)}
                                            className={`w-full text-left p-3 border rounded flex justify-between items-center transition-colors
                                                ${selectedDeviceId === dev.address 
                                                    ? 'bg-[#347758]/20 border-[#347758] ring-1 ring-[#347758]' 
                                                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600'}`
                                            }
                                        >
                                            <div>
                                                <span className="font-bold text-white block">{dev.name || 'Unknown Device'}</span>
                                                <span className="text-xs text-slate-500 font-mono">{dev.address}</span>
                                            </div>
                                            {selectedDeviceId === dev.address && <Icon name="check-circle-fill" className="w-4 h-4 text-green-400" />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2 w-full mt-2">
                                <Button 
                                    variant="secondary" 
                                    onClick={handleListDevices} 
                                    disabled={isBleScanning}
                                    className="flex-1"
                                    size="sm"
                                >
                                    {isBleScanning ? 'Memuat...' : (isNative ? 'Cari Perangkat (Paired)' : 'Cari Printer')}
                                </Button>
                                <Button 
                                    variant="primary" 
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
                        <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r">
                            <h4 className="font-bold text-yellow-300 text-sm flex items-center gap-2">
                                <Icon name="info-circle" className="w-4 h-4"/> Mode Web Browser
                            </h4>
                            <p className="text-xs text-slate-300 mt-1">
                                Jika fitur native bermasalah atau Anda menggunakan Aplikasi APK yang belum stabil, silakan buka <strong>Google Chrome</strong> atau <strong>Edge</strong> di HP Anda untuk menggunakan fitur cetak Bluetooth ini.
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


import React, { useState, useEffect, useRef } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import { bluetoothPrinterService } from '../../utils/bluetoothPrinter';
import { useUI } from '../../context/UIContext';
import { useSettings } from '../../context/SettingsContext';
import type { Transaction } from '../../types';
import BarcodeScannerModal from '../BarcodeScannerModal';

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
    
    // Bluetooth State
    const [isBleSupported, setIsBleSupported] = useState(false);
    const [isBleConnected, setIsBleConnected] = useState(false);
    const [isBleScanning, setIsBleScanning] = useState(false);

    // Scanner Tester State
    const [testBarcode, setTestBarcode] = useState('');
    const [scannerStatus, setScannerStatus] = useState<'idle' | 'success'>('idle');
    const scannerInputRef = useRef<HTMLInputElement>(null);

    // Camera Tester State
    const [isCameraTestOpen, setCameraTestOpen] = useState(false);

    useEffect(() => {
        // Feature Detection for Web Bluetooth
        if (navigator.bluetooth) {
            setIsBleSupported(true);
        }
    }, []);

    // --- BLUETOOTH HANDLERS ---
    const handleConnectBle = async () => {
        setIsBleScanning(true);
        try {
            const result = await bluetoothPrinterService.connect();
            if (result) {
                setIsBleConnected(true);
                showAlert({ type: 'alert', title: 'Terhubung', message: 'Printer Bluetooth berhasil terhubung.' });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsBleScanning(false);
        }
    };

    const handleTestPrintBle = async () => {
        if (!isBleConnected) {
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
                // Reset visual cue after 2 seconds
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
                        <div className="bg-blue-900/20 border-l-4 border-blue-500 p-3 rounded-r text-xs text-slate-300">
                            <strong>Cara Pakai:</strong> Nyalakan Bluetooth Perangkat & Printer. Pasangkan (Pair) di pengaturan Bluetooth perangkat, lalu klik tombol di bawah.
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900 p-4 rounded-lg border border-slate-600">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isBleConnected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                    <Icon name="printer" className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Status Koneksi</p>
                                    <p className={`text-xs ${isBleConnected ? 'text-green-400' : 'text-slate-400'}`}>
                                        {isBleConnected ? 'Printer Siap Digunakan' : 'Belum Terhubung'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button 
                                    variant={isBleConnected ? "secondary" : "primary"} 
                                    onClick={handleConnectBle} 
                                    disabled={isBleScanning}
                                    className="flex-1 sm:flex-none"
                                    size="sm"
                                >
                                    {isBleScanning ? 'Mencari...' : (isBleConnected ? 'Hubungkan Ulang' : 'Cari Printer')}
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    onClick={handleTestPrintBle} 
                                    disabled={!isBleConnected}
                                    className="flex-1 sm:flex-none"
                                    size="sm"
                                >
                                    Tes Print
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r">
                        <h4 className="font-bold text-red-300 text-sm flex items-center gap-2">
                            <Icon name="warning" className="w-4 h-4"/> Browser Tidak Mendukung
                        </h4>
                        <p className="text-xs text-slate-300 mt-1">
                            Fitur ini butuh "Web Bluetooth API" (Hanya ada di Chrome/Edge). Untuk pengguna iOS, gunakan aplikasi browser khusus "Bluefy".
                        </p>
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
                        <p>Printer jenis ini menggunakan dialog cetak bawaan browser (Ctrl+P).</p>
                        <ul className="list-disc pl-4 mt-1 text-xs text-slate-400">
                            <li>Pastikan driver printer sudah terinstal.</li>
                            <li>Atur ukuran kertas (58mm/80mm/A4) di pengaturan "More Settings" pada dialog cetak.</li>
                            <li>Hilangkan centang "Headers and footers" agar hasil rapi.</li>
                        </ul>
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
                        Sebagian besar scanner fisik bekerja sebagai "Keyboard". Untuk mengetesnya, klik kolom di bawah ini lalu scan kode barang apa saja.
                    </p>
                    
                    <div className={`relative flex items-center p-3 rounded-lg border transition-colors ${scannerStatus === 'success' ? 'bg-green-900/20 border-green-500' : 'bg-slate-900 border-slate-600'}`}>
                        <Icon name="barcode" className={`w-6 h-6 mr-3 ${scannerStatus === 'success' ? 'text-green-400' : 'text-slate-500'}`} />
                        <input
                            ref={scannerInputRef}
                            type="text"
                            value={testBarcode}
                            onChange={(e) => setTestBarcode(e.target.value)}
                            onKeyDown={handleScannerTestInput}
                            placeholder="Klik di sini, lalu scan barcode..."
                            className="bg-transparent border-none outline-none text-white w-full placeholder-slate-500"
                        />
                        {scannerStatus === 'success' && (
                            <span className="text-xs font-bold text-green-400 animate-pulse bg-green-900/50 px-2 py-1 rounded">
                                SUKSES!
                            </span>
                        )}
                    </div>
                    {scannerStatus === 'success' && (
                        <p className="text-xs text-green-400 mt-1">
                            Scanner berfungsi! Alat berhasil membaca kode dan menekan 'Enter' otomatis.
                        </p>
                    )}
                </div>
            </SettingsCard>

            {/* 4. CAMERA SECTION */}
            <SettingsCard 
                title="Kamera Perangkat" 
                description="Menggunakan kamera Perangkat/Webcam sebagai scanner."
                icon={<Icon name="camera" className="w-6 h-6"/>}
            >
                <div className="flex justify-between items-center gap-4">
                    <div className="text-sm text-slate-300">
                        <p>Pastikan Anda telah memberikan izin (Permission) kepada browser untuk mengakses kamera.</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Jika gagal, cek pengaturan situs di browser (biasanya ikon gembok di sebelah alamat URL).
                        </p>
                    </div>
                    <Button onClick={() => setCameraTestOpen(true)} variant="secondary" size="sm" className="shrink-0">
                        <Icon name="camera" className="w-4 h-4"/> Tes Kamera
                    </Button>
                </div>
            </SettingsCard>

            {/* Camera Test Modal */}
            <BarcodeScannerModal 
                isOpen={isCameraTestOpen} 
                onClose={() => setCameraTestOpen(false)} 
                onScan={(code) => {
                    showAlert({ type: 'alert', title: 'Berhasil', message: `Kamera berfungsi normal. Terbaca: ${code}` });
                    setCameraTestOpen(false);
                }} 
            />
        </div>
    );
};

export default HardwareTab;

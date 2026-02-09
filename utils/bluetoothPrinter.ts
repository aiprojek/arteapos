
import type { Transaction, ReceiptSettings } from '../types';
import { Capacitor } from '@capacitor/core';

// --- DEFINISI GLOBAL UNTUK PLUGIN KOMUNITAS ---
declare global {
    interface Window {
        bluetoothSerial?: {
            isEnabled: (success: () => void, failure: (err: any) => void) => void;
            enable: (success: () => void, failure: (err: any) => void) => void;
            list: (success: (devices: any[]) => void, failure: (err: any) => void) => void;
            connect: (macAddress: string, success: () => void, failure: (err: any) => void) => void;
            disconnect: (success: () => void, failure: (err: any) => void) => void;
            write: (data: any, success: () => void, failure: (err: any) => void) => void;
            isConnected: (success: () => void, failure: () => void) => void;
        };
        AppInventor?: any; // Kodular Legacy
    }
    interface Navigator {
        bluetooth: any; // Web Bluetooth
    }
}

// --- ESC/POS COMMANDS ---
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

const COMMANDS = {
    INIT: ESC + '@',
    ALIGN_LEFT: ESC + 'a' + '\x00',
    ALIGN_CENTER: ESC + 'a' + '\x01',
    ALIGN_RIGHT: ESC + 'a' + '\x02',
    BOLD_ON: ESC + 'E' + '\x01',
    BOLD_OFF: ESC + 'E' + '\x00',
    SIZE_NORMAL: GS + '!' + '\x00',
    SIZE_LARGE: GS + '!' + '\x11', 
    CUT: GS + 'V' + '\x41' + '\x00', 
};

const formatCurrencySafe = (amount: number): string => {
    const numStr = Math.round(amount).toString();
    const formatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `Rp ${formatted}`;
};

const formatNumberSafe = (amount: number): string => {
    const numStr = Math.round(amount).toString();
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Generate Struk String
const generateReceiptData = (transaction: Transaction, settings: ReceiptSettings): string => {
    let data = '';

    // --- Header ---
    data += COMMANDS.INIT;
    data += COMMANDS.ALIGN_CENTER;
    data += COMMANDS.BOLD_ON + settings.shopName + COMMANDS.BOLD_OFF + LF;
    data += COMMANDS.SIZE_NORMAL;
    data += settings.address + LF;
    data += '--------------------------------' + LF;

    // --- Meta ---
    data += COMMANDS.ALIGN_LEFT;
    data += `ID: ${transaction.id.slice(-6)}` + LF;
    data += `Tgl: ${new Date(transaction.createdAt).toLocaleString('id-ID')}` + LF;
    if (transaction.userName) data += `Kasir: ${transaction.userName}` + LF;
    if (transaction.customerName) data += `Plg: ${transaction.customerName}` + LF;
    
    // Table Info
    if (transaction.tableNumber) {
        data += `Meja: ${transaction.tableNumber}`;
        if (transaction.paxCount) data += ` (Pax: ${transaction.paxCount})`;
        data += LF;
    }

    data += '--------------------------------' + LF;

    // --- Items ---
    transaction.items.forEach(item => {
        data += item.name + LF;
        if(item.selectedAddons) {
            item.selectedAddons.forEach(a => {
                data += ` + ${a.name} (${formatNumberSafe(a.price)})` + LF;
            })
        }
        const addonsTotal = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
        const price = item.price + addonsTotal;
        const sub = price * item.quantity;
        
        data += `  ${item.quantity} x ${formatNumberSafe(price)} = ${formatNumberSafe(sub)}` + LF;
    });
    
    data += '--------------------------------' + LF;

    // --- Totals ---
    data += COMMANDS.ALIGN_RIGHT;
    data += `Subtotal: ${formatCurrencySafe(transaction.subtotal)}` + LF;
    
    if (transaction.cartDiscount) {
        const val = transaction.cartDiscount.value;
        const discText = transaction.cartDiscount.type === 'percentage' ? `${val}%` : formatCurrencySafe(val);
        data += `Diskon: -${discText}` + LF;
    }
    
    if (transaction.serviceCharge > 0) data += `Service: ${formatCurrencySafe(transaction.serviceCharge)}` + LF;
    if (transaction.tax > 0) data += `Pajak: ${formatCurrencySafe(transaction.tax)}` + LF;
    
    data += COMMANDS.BOLD_ON;
    data += `TOTAL: ${formatCurrencySafe(transaction.total)}` + LF;
    data += COMMANDS.BOLD_OFF;
    data += `Bayar: ${formatCurrencySafe(transaction.amountPaid)}` + LF;
    
    const kembalian = transaction.amountPaid - transaction.total;
    if(kembalian > 0) data += `Kembali: ${formatCurrencySafe(kembalian)}` + LF;
    else if (kembalian < 0) data += `Kurang: ${formatCurrencySafe(Math.abs(kembalian))}` + LF;

    if (transaction.customerId) {
        data += '--------------------------------' + LF;
        data += COMMANDS.ALIGN_LEFT;
        if (transaction.customerBalanceSnapshot !== undefined) data += `Sisa Saldo: ${formatCurrencySafe(transaction.customerBalanceSnapshot)}` + LF;
        if (transaction.customerPointsSnapshot !== undefined) data += `Sisa Poin : ${transaction.customerPointsSnapshot} pts` + LF;
    }

    data += COMMANDS.ALIGN_CENTER;
    data += LF + settings.footerMessage + LF;
    data += '--------------------------------' + LF;
    data += 'Powered by Artea POS' + LF;
    data += 'aiprojek01.my.id' + LF; 
    
    data += LF + LF + LF; // Feed

    // Filter ASCII Only
    return data.replace(/[^\x00-\x7F]/g, "");
};

// State untuk Web Bluetooth
let webPrinterCharacteristic: any | null = null;

// Helper: Wrap BluetoothSerial callback style to Promise
const btSerial = {
    isEnabled: () => new Promise((resolve, reject) => window.bluetoothSerial?.isEnabled(() => resolve(undefined), reject)),
    list: () => new Promise<any[]>((resolve, reject) => window.bluetoothSerial?.list(resolve, reject)),
    connect: (mac: string) => new Promise<void>((resolve, reject) => window.bluetoothSerial?.connect(mac, () => resolve(), reject)),
    write: (data: string) => new Promise<void>((resolve, reject) => window.bluetoothSerial?.write(data, () => resolve(), reject)),
    isConnected: () => new Promise<void>((resolve, reject) => window.bluetoothSerial?.isConnected(() => resolve(), () => reject()))
};

export const bluetoothPrinterService = {
    
    // --- NATIVE METHODS (Menggunakan Plugin Komunitas) ---
    listPairedDevicesNative: async () => {
        if (!Capacitor.isNativePlatform()) throw new Error("Fitur ini hanya untuk Android App.");
        
        if (!window.bluetoothSerial) {
            throw new Error("Plugin 'bluetooth-serial' belum terinstall. Mohon jalankan 'npm install && npx cap sync'.");
        }

        try {
            await btSerial.isEnabled();
        } catch (e) {
            throw new Error("Bluetooth mati. Harap nyalakan Bluetooth.");
        }

        try {
            const devices = await btSerial.list();
            return devices.map(d => ({ name: d.name, address: d.address }));
        } catch (e: any) {
            throw new Error("Gagal mengambil daftar perangkat: " + e);
        }
    },

    // --- WEB METHODS (PC/LAPTOP) ---
    connectWeb: async (): Promise<boolean> => {
        if (!navigator.bluetooth) {
            throw new Error('Fitur Web Bluetooth tidak didukung. Gunakan Chrome/Edge.');
        }
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
                acceptAllDevices: false 
            });
            if (!device || !device.gatt) return false;
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const characteristics = await service.getCharacteristics();
            const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
            if (writeChar) {
                webPrinterCharacteristic = writeChar;
                return true;
            } else {
                throw new Error('Karakteristik Write tidak ditemukan pada printer ini.');
            }
        } catch (error: any) {
            console.error('Web Bluetooth Connection Error:', error);
            throw error;
        }
    },

    // --- MAIN PRINT FUNCTION ---
    printReceipt: async (transaction: Transaction, settings: ReceiptSettings): Promise<void> => {
        const rawData = generateReceiptData(transaction, settings);

        // 0. KODULAR / APP INVENTOR BRIDGE (Legacy)
        if (window.AppInventor) {
            window.AppInventor.setWebViewString(rawData);
            return;
        }

        // 1. ANDROID NATIVE (Plugin Komunitas)
        if (Capacitor.isNativePlatform() || /Android/i.test(navigator.userAgent)) {
            
            // OPSI 1: Plugin Native (bluetooth-serial)
            if (window.bluetoothSerial && settings.printerMacAddress) {
                try {
                    // Cek koneksi, jika belum connect, connect dulu
                    try {
                        await btSerial.isConnected();
                    } catch (e) {
                        await btSerial.connect(settings.printerMacAddress);
                    }
                    
                    // Kirim data
                    await btSerial.write(rawData);
                    return;
                } catch (e: any) {
                    console.error("Native Print Failed:", e);
                    // Jika gagal, lanjut ke Fallback Intent
                }
            }

            // OPSI 2: FALLBACK INTENT (Raw Thermal)
            // Ini opsi paling aman jika plugin gagal atau belum disetting
            try {
                const encoder = new TextEncoder();
                const bytes = encoder.encode(rawData);
                let binary = '';
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                // Package Raw Thermal sesuai request
                const intentUrl = `intent:base64,${base64}#Intent;scheme=rawbt;package=com.rawthermal.app;end;`;
                window.location.href = intentUrl;
                return;
            } catch (e: any) {
                throw new Error("Gagal memproses data cetak ke Raw Thermal: " + e.message);
            }
        }

        // 2. DESKTOP / PC WEB BROWSER
        if (webPrinterCharacteristic) {
            const encoder = new TextEncoder();
            try {
                const encodedData = encoder.encode(rawData);
                const CHUNK_SIZE = 100; 
                for (let i = 0; i < encodedData.length; i += CHUNK_SIZE) {
                    const chunk = encodedData.slice(i, i + CHUNK_SIZE);
                    await webPrinterCharacteristic?.writeValue(chunk);
                    await new Promise(r => setTimeout(r, 20)); 
                }
            } catch (e: any) {
                webPrinterCharacteristic = null; 
                throw new Error('Koneksi printer terputus. Silakan hubungkan ulang.');
            }
            return;
        }
        
        throw new Error("Printer belum terhubung. Silakan hubungkan di menu Pengaturan.");
    }
};

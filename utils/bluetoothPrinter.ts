
import type { Transaction, ReceiptSettings } from '../types';
import { Capacitor, registerPlugin, WebPlugin } from '@capacitor/core';

// --- DEFINISI INTERFACE PLUGIN ---
interface BluetoothPrinterPlugin {
    listPairedDevices(): Promise<{ devices: { name: string; address: string }[] }>;
    connect(options: { address: string }): Promise<void>;
    print(options: { data: string; type: 'text' | 'base64' }): Promise<void>;
    disconnect(): Promise<void>;
}

// --- IMPLEMENTASI WEB (FALLBACK) ---
// Ini penting agar jika Native gagal, aplikasi tidak crash dengan error "Not Implemented"
class BluetoothPrinterWeb extends WebPlugin implements BluetoothPrinterPlugin {
    async listPairedDevices() {
        console.warn('BluetoothPrinter: Native plugin not detected. Using Web Fallback.');
        return { devices: [] };
    }
    async connect(options: { address: string }) {
        console.log('BluetoothPrinter (Web): Connected to', options.address);
    }
    async print(options: { data: string; type: 'text' | 'base64' }) {
        console.log('BluetoothPrinter (Web): Printing...', options.data.substring(0, 50));
    }
    async disconnect() {
        console.log('BluetoothPrinter (Web): Disconnected');
    }
}

// Inisialisasi Plugin dengan Fallback Web
const BluetoothPrinter = registerPlugin<BluetoothPrinterPlugin>('BluetoothPrinter', {
    web: () => new BluetoothPrinterWeb()
});

// ----------------------------------------

// Define Web Bluetooth types for TS
interface BluetoothRemoteGATTCharacteristic {
    writeValue(value: BufferSource): Promise<void>;
    properties: {
        write: boolean;
        writeWithoutResponse: boolean;
    };
}

declare global {
    interface Navigator {
        bluetooth: any;
    }
    interface Window {
        AppInventor?: any;
    }
}

const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

// ESC/POS Commands
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
    FONT_B: ESC + 'M' + '\x01', 
    FONT_A: ESC + 'M' + '\x00', 
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

// Generate ESC/POS Data String
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
    
    if (transaction.userName) {
        data += `Kasir: ${transaction.userName}` + LF;
    }
    if (transaction.customerName) {
        data += `Plg: ${transaction.customerName}` + LF;
    }
    if (transaction.orderType) {
        const type = transaction.orderType.charAt(0).toUpperCase() + transaction.orderType.slice(1);
        data += `Tipe: ${type}` + LF;
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
    
    if (transaction.serviceCharge > 0) {
        data += `Service: ${formatCurrencySafe(transaction.serviceCharge)}` + LF;
    }

    if (transaction.tax > 0) {
        data += `Pajak: ${formatCurrencySafe(transaction.tax)}` + LF;
    }
    
    data += COMMANDS.BOLD_ON;
    data += `TOTAL: ${formatCurrencySafe(transaction.total)}` + LF;
    data += COMMANDS.BOLD_OFF;
    data += `Bayar: ${formatCurrencySafe(transaction.amountPaid)}` + LF;
    
    const kembalian = transaction.amountPaid - transaction.total;
    if(kembalian > 0) {
         data += `Kembali: ${formatCurrencySafe(kembalian)}` + LF;
    } else if (kembalian < 0) {
         data += `Kurang: ${formatCurrencySafe(Math.abs(kembalian))}` + LF;
    }

    if (transaction.customerId) {
        data += '--------------------------------' + LF;
        data += COMMANDS.ALIGN_LEFT;
        if (transaction.customerBalanceSnapshot !== undefined) {
            const saldo = formatCurrencySafe(transaction.customerBalanceSnapshot);
            data += `Sisa Saldo: ${saldo}` + LF;
        }
        if (transaction.customerPointsSnapshot !== undefined) {
            data += `Sisa Poin : ${transaction.customerPointsSnapshot} pts` + LF;
        }
    }

    data += COMMANDS.ALIGN_CENTER;
    data += LF + settings.footerMessage + LF;
    data += COMMANDS.FONT_B; 
    data += '--------------------------------' + LF;
    data += 'Powered by Artea POS' + LF;
    data += 'aiprojek01.my.id' + LF; 
    
    data += LF + LF + LF; // Feed

    // Filter ASCII Only
    return data.replace(/[^\x00-\x7F]/g, "");
};

// State untuk Web Bluetooth (Browser only fallback)
let webPrinterCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

export const bluetoothPrinterService = {
    // --- NATIVE ANDROID METHODS (CUSTOM PLUGIN) ---
    
    listNativeDevices: async (): Promise<any[]> => {
        try {
            // Capacitor.isNativePlatform() bisa true walaupun plugin belum terload.
            // Kita try-catch call ini.
            const result = await BluetoothPrinter.listPairedDevices();
            return result.devices;
        } catch (e: any) {
            console.error("List Native Devices Failed:", e);
            // Jika errornya "not implemented", berarti plugin Native belum ter-bridge
            if (e.message && e.message.includes('not implemented')) {
                throw new Error("Plugin Bluetooth belum terinstall di APK ini. Pastikan Anda sudah build ulang APK.");
            }
            throw e;
        }
    },

    connectNative: async (macAddress: string): Promise<boolean> => {
        try {
            await BluetoothPrinter.connect({ address: macAddress });
            return true;
        } catch (e) {
            console.error("Connect Failed", e);
            throw e;
        }
    },

    disconnectNative: async (): Promise<void> => {
        try {
            await BluetoothPrinter.disconnect();
        } catch (e) {}
    },

    // --- WEB METHODS ---

    connectWeb: async (): Promise<boolean> => {
        if (!navigator.bluetooth) {
            alert('Browser ini tidak mendukung Bluetooth Web API.');
            return false;
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
            const writeChar = characteristics.find((c: BluetoothRemoteGATTCharacteristic) => c.properties.write || c.properties.writeWithoutResponse);

            if (writeChar) {
                webPrinterCharacteristic = writeChar;
                return true;
            } else {
                alert('Printer tidak valid.');
                return false;
            }

        } catch (error) {
            console.error('Web Bluetooth Connection Error:', error);
            return false;
        }
    },

    // --- MAIN PRINT FUNCTION (DIRECT) ---

    printReceipt: async (transaction: Transaction, settings: ReceiptSettings) => {
        const rawData = generateReceiptData(transaction, settings);

        // 0. KODULAR / APP INVENTOR BRIDGE
        if (window.AppInventor) {
            window.AppInventor.setWebViewString(rawData);
            return;
        }

        // 1. ANDROID NATIVE CAPACITOR (Custom Plugin)
        if (Capacitor.isNativePlatform()) {
            try {
                // Konversi string ke Base64 agar aman dikirim ke Java
                const encoder = new TextEncoder();
                const bytes = encoder.encode(rawData);
                
                // Manual byte to base64 conversion
                let binary = '';
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                await BluetoothPrinter.print({ data: base64, type: 'base64' });
            } catch (e: any) {
                console.error("Native Print Error:", e);
                // Fallback message if plugin not found
                if (e.message && e.message.includes('not implemented')) {
                    alert("Gagal: Plugin Bluetooth belum terdeteksi. Silakan build ulang APK.");
                } else {
                    alert("Gagal mencetak: " + e.message);
                }
            }
            return;
        }

        // 2. WEB BROWSER
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
            } catch (e) {
                console.error('Failed to print via Web Bluetooth', e);
                webPrinterCharacteristic = null; 
            }
            return;
        }

        // 3. FALLBACK: RAWBT (Untuk Browser Android yang tidak support Web Bluetooth)
        // Jika tidak ada koneksi Web Bluetooth dan tidak di Native App.
        try {
            const encoder = new TextEncoder();
            const bytes = encoder.encode(rawData);
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);

            // Intent Scheme untuk RawBT
            const scheme = `rawbt:base64,${base64}`;
            
            if (confirm("Browser ini tidak mendukung koneksi Bluetooth langsung. Cetak menggunakan aplikasi RawBT?")) {
                window.location.href = scheme;
            }
        } catch (e) {
             console.error("RawBT Fallback Error", e);
        }
    },

    // --- OPTIONAL: RAWBT FALLBACK (Jika user tetap mau pakai) ---
    printViaExternalApp: (base64Image: string) => {
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
        const scheme = `rawbt:base64,${cleanBase64}`;
        window.location.href = scheme;
    }
};

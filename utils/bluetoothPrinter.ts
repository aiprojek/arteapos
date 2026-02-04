
import type { Transaction, ReceiptSettings } from '../types';
import { Capacitor, registerPlugin } from '@capacitor/core';

// --- DEFINISI PLUGIN NATIVE ---
interface BluetoothPrinterPlugin {
    listPairedDevices(): Promise<{ devices: { name: string; address: string }[] }>;
    connect(options: { address: string }): Promise<void>;
    print(options: { data: string }): Promise<void>; // Data dalam Base64
    disconnect(): Promise<void>;
}

const BluetoothPrinter = registerPlugin<BluetoothPrinterPlugin>('BluetoothPrinter');

// --- TYPE DEFINITIONS (WEB) ---
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
    }

    data += COMMANDS.ALIGN_CENTER;
    data += LF + settings.footerMessage + LF;
    data += COMMANDS.FONT_B; 
    data += '--------------------------------' + LF;
    data += 'Powered by Artea POS' + LF;
    
    data += LF + LF + LF; // Feed

    // Filter ASCII Only
    return data.replace(/[^\x00-\x7F]/g, "");
};

// State untuk Web Bluetooth
let webPrinterCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let connectedNativeAddress: string | null = null; // Menyimpan alamat MAC printer yang terkoneksi di Android

export const bluetoothPrinterService = {
    
    // --- CONNECT METHOD ---
    // Di Android: Akan membuka list Paired Devices
    // Di Web: Akan membuka dialog Browser Bluetooth
    connect: async (): Promise<boolean> => {
        // 1. NATIVE ANDROID
        if (Capacitor.isNativePlatform()) {
            try {
                const result = await BluetoothPrinter.listPairedDevices();
                const devices = result.devices;
                
                if (devices.length === 0) {
                    throw new Error("Tidak ada perangkat Bluetooth yang dipairing. Silakan pairing printer di Pengaturan Bluetooth HP Anda terlebih dahulu.");
                }

                // Sederhana: Kita minta user pilih (logic UI pemilihan bisa ditambahkan nanti)
                // Untuk sekarang, kita coba connect ke perangkat pertama yang namanya mengandung 'print' atau 'pos' atau ambil yang pertama
                // IDEALNYA: UI menampilkan list. Untuk MVP, kita ambil yang pertama.
                
                // TODO: Di masa depan, tampilkan Modal List Device.
                // Saat ini: Ambil device pertama.
                const targetDevice = devices[0]; 
                
                await BluetoothPrinter.connect({ address: targetDevice.address });
                connectedNativeAddress = targetDevice.address;
                return true;
                
            } catch (e: any) {
                console.error(e);
                throw new Error("Gagal koneksi Native: " + e.message);
            }
        }

        // 2. WEB BROWSER
        if (!navigator.bluetooth) {
            throw new Error('Web Bluetooth tidak didukung di browser ini.');
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
                throw new Error('Karakteristik Write tidak ditemukan.');
            }

        } catch (error: any) {
            console.error('Web Bluetooth Error:', error);
            throw error;
        }
    },

    // --- CONNECT WEB (Legacy/Specific naming) ---
    connectWeb: async (): Promise<boolean> => {
        return bluetoothPrinterService.connect();
    },

    // --- PRINT FUNCTION ---
    printReceipt: async (transaction: Transaction, settings: ReceiptSettings): Promise<void> => {
        const rawData = generateReceiptData(transaction, settings);

        // 1. KODULAR / APP INVENTOR BRIDGE
        if (window.AppInventor) {
            window.AppInventor.setWebViewString(rawData);
            return;
        }

        // 2. NATIVE ANDROID DIRECT (New Plugin)
        if (Capacitor.isNativePlatform()) {
            try {
                if (!connectedNativeAddress) {
                    // Coba connect dulu jika belum
                    await bluetoothPrinterService.connect();
                }
                
                // Encode ke Base64 untuk dikirim ke Plugin
                const encoder = new TextEncoder();
                const bytes = encoder.encode(rawData);
                let binary = '';
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                await BluetoothPrinter.print({ data: base64 });
                return;

            } catch (e: any) {
                console.error("Native Print Error:", e);
                // Fallback ke Intent jika Native Gagal total
                if (confirm("Gagal cetak langsung. Gunakan aplikasi driver eksternal (Raw Thermal)?")) {
                     const encoder = new TextEncoder();
                     const bytes = encoder.encode(rawData);
                     let binary = '';
                     const len = bytes.byteLength;
                     for (let i = 0; i < len; i++) {
                         binary += String.fromCharCode(bytes[i]);
                     }
                     const base64 = btoa(binary);
                     const intentUrl = `intent:base64,${base64}#Intent;scheme=rawbt;end;`;
                     const a = document.createElement('a');
                     a.href = intentUrl;
                     a.style.display = 'none';
                     document.body.appendChild(a);
                     a.click();
                     setTimeout(() => document.body.removeChild(a), 1000);
                } else {
                    throw new Error("Gagal mencetak: " + e.message);
                }
                return;
            }
        }

        // 3. WEB BROWSER
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
                console.error('Web Print Error', e);
                webPrinterCharacteristic = null; 
                throw new Error('Koneksi terputus. Hubungkan ulang.');
            }
            return;
        }
        
        throw new Error("Printer belum terhubung. Klik 'Cari Printer' terlebih dahulu.");
    }
};

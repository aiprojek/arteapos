
import type { Transaction, ReceiptSettings } from '../types';
import { Capacitor } from '@capacitor/core';

// --- TYPE DEFINITIONS ---
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
    
    // --- WEB METHODS (PC/LAPTOP) ---

    connectWeb: async (): Promise<boolean> => {
        if (!navigator.bluetooth) {
            // Updated Error Message to be generic
            throw new Error('Fitur Web Bluetooth tidak didukung. Jika di Android, gunakan tombol "Tes Print" (via Driver).');
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
                throw new Error('Karakteristik Write tidak ditemukan pada printer ini.');
            }

        } catch (error: any) {
            console.error('Web Bluetooth Connection Error:', error);
            // Re-throw so component can alert
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

        // 1. ANDROID NATIVE (RAWBT / RAW THERMAL INTENT SCHEME)
        if (Capacitor.isNativePlatform() || /Android/i.test(navigator.userAgent)) {
            try {
                // Encode ke Base64
                const encoder = new TextEncoder();
                const bytes = encoder.encode(rawData);
                let binary = '';
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                // Menggunakan scheme 'rawbt:' yang didukung oleh RawBT asli dan biasanya juga fork-nya.
                // Parameter package=com.rawthermal.app ditambahkan untuk mencoba memaksa membuka app spesifik jika ada,
                // tapi jika tidak ada, Android akan mencari aplikasi lain yang bisa menangani scheme 'rawbt'.
                
                // Prioritas 1: Coba target 'com.rawthermal.app'
                // Kita buat URL intent yang fleksibel
                
                const intentUrl = `intent:base64,${base64}#Intent;scheme=rawbt;package=com.rawthermal.app;end;`;
                
                // Fallback (jika user masih pakai RawBT Original):
                // Jika ingin mendukung keduanya, kita bisa menghapus 'package=...' dari string intent
                // dan membiarkan Android Picker muncul jika ada 2 aplikasi.
                // NAMUN, karena Anda spesifik ingin menggunakan Raw Thermal custom, kita coba target itu.
                // JIKA GAGAL (app tidak terinstall), tombol print tidak akan bereaksi.
                // Maka lebih aman menggunakan Intent umum 'rawbt' jika kita ingin support keduanya,
                // tapi karena kita sudah set <queries> di Manifest untuk 'com.rawthermal.app', 
                // kita bisa coba menargetkannya.
                
                // KEPUTUSAN: Gunakan Intent umum tanpa package spesifik di URL string agar lebih robust.
                // Android akan memilih aplikasi default (Raw Thermal) jika user sudah set, atau menampilkan pilihan.
                const universalIntentUrl = `intent:base64,${base64}#Intent;scheme=rawbt;end;`;
                
                // Trigger via anchor click
                const a = document.createElement('a');
                a.href = universalIntentUrl;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => document.body.removeChild(a), 1000);
                
                return;
                
            } catch (e: any) {
                console.error("Print Error:", e);
                throw new Error("Gagal memproses data cetak: " + e.message);
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
                console.error('Failed to print via Web Bluetooth', e);
                webPrinterCharacteristic = null; 
                throw new Error('Koneksi printer terputus. Silakan hubungkan ulang.');
            }
            return;
        }
        
        // Fallback if no method available
        throw new Error("Printer belum terhubung.\n\nAndroid: Pastikan 'Raw Thermal' terinstall dan berjalan.\nPC: Klik 'Cari Printer' terlebih dahulu.");
    }
};

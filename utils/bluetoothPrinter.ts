
import type { Transaction, ReceiptSettings, CartItem } from '../types';

// --- Web Bluetooth API Types Polyfill ---
interface BluetoothRemoteGATTCharacteristic {
    writeValue(value: BufferSource): Promise<void>;
    properties: {
        write: boolean;
        writeWithoutResponse: boolean;
        notify: boolean;
        indicate: boolean;
        read: boolean;
    };
}

interface BluetoothRemoteGATTService {
    getCharacteristics(characteristic?: string | number): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice {
    gatt?: BluetoothRemoteGATTServer;
    id: string;
    name?: string;
}

interface RequestDeviceOptions {
    filters?: Array<{ services?: Array<string | number>; name?: string; namePrefix?: string }>;
    optionalServices?: Array<string | number>;
    acceptAllDevices?: boolean;
}

interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

declare global {
    interface Navigator {
        bluetooth?: Bluetooth;
    }
}
// ----------------------------------------

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
    SIZE_LARGE: GS + '!' + '\x11', // Double width & height
    CUT: GS + 'V' + '\x41' + '\x00', // Cut paper
    FONT_B: ESC + 'M' + '\x01', // Small Font
    FONT_A: ESC + 'M' + '\x00', // Normal Font
};

let bluetoothDevice: BluetoothDevice | null = null;
let printerCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

// Helper: Format currency manually to ASCII to avoid UTF-8 artifacts (Chinese chars) on thermal printers
const formatCurrencySafe = (amount: number): string => {
    // 1. Convert to integer string (remove decimals if any for IDR usually)
    const numStr = Math.round(amount).toString();
    // 2. Add thousand separators manually
    const formatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `Rp ${formatted}`;
};

// Helper: Format number without Rp
const formatNumberSafe = (amount: number): string => {
    const numStr = Math.round(amount).toString();
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const bluetoothPrinterService = {
    connect: async (): Promise<boolean> => {
        if (!navigator.bluetooth) {
            alert('Browser ini tidak mendukung Bluetooth Web API. Gunakan Chrome di Android/Desktop.');
            return false;
        }

        try {
            // Request device
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: ['000018f0-0000-1000-8000-00805f9b34fb'] } // Common Thermal Printer Service UUID
                ],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
                acceptAllDevices: false 
            }).catch(async () => {
                 // Fallback: try accepting all devices if specific filter fails or user wants to see all
                 if (navigator.bluetooth) {
                    return await navigator.bluetooth.requestDevice({
                        acceptAllDevices: true,
                        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // We still need permission to access this service
                    });
                 }
                 throw new Error("Bluetooth API unavailable during fallback");
            });

            if (!bluetoothDevice || !bluetoothDevice.gatt) return false;

            const server = await bluetoothDevice.gatt.connect();
            // Try to get the specific service
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            // Try to get the characteristic for writing (usually the first writeable one)
            const characteristics = await service.getCharacteristics();
            const writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

            if (writeChar) {
                printerCharacteristic = writeChar;
                return true;
            } else {
                alert('Printer tidak memiliki karakteristik tulis yang valid.');
                return false;
            }

        } catch (error) {
            console.error('Bluetooth Connection Error:', error);
            return false;
        }
    },

    printReceipt: async (transaction: Transaction, settings: ReceiptSettings) => {
        if (!printerCharacteristic) {
            const connected = await bluetoothPrinterService.connect();
            if (!connected) return;
        }

        const encoder = new TextEncoder();
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
        
        // FIXED: Added Staff Name
        if (transaction.userName) {
            data += `Kasir: ${transaction.userName}` + LF;
        }
        
        // FIXED: Added Customer Name (Always check if exists)
        if (transaction.customerName) {
            data += `Plg: ${transaction.customerName}` + LF;
        }

        // FIXED: Added Order Type
        if (transaction.orderType) {
            // Capitalize first letter
            const type = transaction.orderType.charAt(0).toUpperCase() + transaction.orderType.slice(1);
            data += `Tipe: ${type}` + LF;
        }

        data += '--------------------------------' + LF;

        // --- Items ---
        transaction.items.forEach(item => {
            data += item.name + LF;
            
            // Addons
            if(item.selectedAddons) {
                item.selectedAddons.forEach(a => {
                    // Use formatNumberSafe to avoid encoding issues
                    data += ` + ${a.name} (${formatNumberSafe(a.price)})` + LF;
                })
            }

            const addonsTotal = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
            const price = item.price + addonsTotal;
            const sub = price * item.quantity;
            
            // Indent qty and price (Use formatNumberSafe)
            data += `  ${item.quantity} x ${formatNumberSafe(price)} = ${formatNumberSafe(sub)}` + LF;
        });
        
        data += '--------------------------------' + LF;

        // --- Totals ---
        data += COMMANDS.ALIGN_RIGHT;
        // Use formatCurrencySafe for totals
        data += `Subtotal: ${formatCurrencySafe(transaction.subtotal)}` + LF;
        
        if (transaction.cartDiscount) {
            const val = transaction.cartDiscount.value;
            // Handle percentage logic or amount logic for display
            const discText = transaction.cartDiscount.type === 'percentage' 
                ? `${val}%` 
                : formatCurrencySafe(val);
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

        // --- Member Info (Saldo & Poin) ---
        // ADDED: Logic to print member info on thermal receipt
        if (transaction.customerId) {
            data += '--------------------------------' + LF;
            data += COMMANDS.ALIGN_LEFT;
            
            // Saldo Snapshot
            if (transaction.customerBalanceSnapshot !== undefined) {
                const saldo = formatCurrencySafe(transaction.customerBalanceSnapshot);
                data += `Sisa Saldo: ${saldo}` + LF;
            }
            
            // Poin Snapshot
            if (transaction.customerPointsSnapshot !== undefined) {
                data += `Sisa Poin : ${transaction.customerPointsSnapshot} pts` + LF;
            }
            
            // Poin Earned
            if (transaction.pointsEarned && transaction.pointsEarned > 0) {
                data += `Poin Dapat: +${transaction.pointsEarned} pts` + LF;
            }
        }

        // --- Footer ---
        data += COMMANDS.ALIGN_CENTER;
        data += LF + settings.footerMessage + LF;
        
        // --- Branding ---
        data += COMMANDS.FONT_B; // Small font
        data += '--------------------------------' + LF;
        data += 'Powered by Artea POS' + LF;
        data += 'aiprojek01.my.id' + LF;
        data += COMMANDS.FONT_A; // Reset font
        
        data += LF + LF + LF; // Feed

        // CRITICAL FIX FOR CHINESE CHARACTERS:
        // Filter the final string to allow ONLY ASCII characters.
        // This removes invisible unicode characters (like NBSP from formatters) that thermal printers misinterpret.
        const cleanData = data.replace(/[^\x00-\x7F]/g, "");

        try {
            const encodedData = encoder.encode(cleanData);
            const CHUNK_SIZE = 100; // 100 bytes per packet
            
            for (let i = 0; i < encodedData.length; i += CHUNK_SIZE) {
                const chunk = encodedData.slice(i, i + CHUNK_SIZE);
                await printerCharacteristic?.writeValue(chunk);
                // Tiny delay to ensure buffer processing
                await new Promise(r => setTimeout(r, 20)); 
            }
        } catch (e) {
            console.error('Failed to print', e);
            alert('Gagal mengirim data ke printer. Coba sambungkan ulang.');
            printerCharacteristic = null; // Reset connection
        }
    }
};

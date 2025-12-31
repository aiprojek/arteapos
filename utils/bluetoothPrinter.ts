
import type { Transaction, ReceiptSettings, CartItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

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
        if (transaction.customerName) data += `Plg: ${transaction.customerName}` + LF;
        data += '--------------------------------' + LF;

        // --- Items ---
        transaction.items.forEach(item => {
            data += item.name + LF;
            
            // Addons
            if(item.selectedAddons) {
                item.selectedAddons.forEach(a => {
                    data += ` + ${a.name} (${CURRENCY_FORMATTER.format(a.price).replace('Rp', '')})` + LF;
                })
            }

            const addonsTotal = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
            const price = item.price + addonsTotal;
            const sub = price * item.quantity;
            
            // Indent qty and price
            data += `  ${item.quantity} x ${CURRENCY_FORMATTER.format(price).replace('Rp', '')} = ${CURRENCY_FORMATTER.format(sub).replace('Rp', '')}` + LF;
        });
        
        data += '--------------------------------' + LF;

        // --- Totals ---
        data += COMMANDS.ALIGN_RIGHT;
        data += `Subtotal: ${CURRENCY_FORMATTER.format(transaction.subtotal)}` + LF;
        if (transaction.cartDiscount) {
            const val = transaction.cartDiscount.value;
            const discText = transaction.cartDiscount.type === 'percentage' ? `${val}%` : CURRENCY_FORMATTER.format(val);
            data += `Diskon: -${discText}` + LF;
        }
        
        data += COMMANDS.BOLD_ON;
        data += `TOTAL: ${CURRENCY_FORMATTER.format(transaction.total)}` + LF;
        data += COMMANDS.BOLD_OFF;
        data += `Bayar: ${CURRENCY_FORMATTER.format(transaction.amountPaid)}` + LF;
        
        const kembalian = transaction.amountPaid - transaction.total;
        if(kembalian > 0) {
             data += `Kembali: ${CURRENCY_FORMATTER.format(kembalian)}` + LF;
        }

        // --- Footer ---
        data += COMMANDS.ALIGN_CENTER;
        data += LF + settings.footerMessage + LF;
        
        // --- Branding (Watermark replacement) ---
        data += COMMANDS.FONT_B; // Small font
        data += '--------------------------------' + LF;
        data += 'Powered by ARTEA POS' + LF;
        data += 'aiprojek01.my.id' + LF;
        data += COMMANDS.FONT_A; // Reset font
        
        data += LF + LF + LF; // Feed

        try {
            // FIX: Send data in chunks to prevent buffer overflow (truncation issues)
            const encodedData = encoder.encode(data);
            const CHUNK_SIZE = 100; // 100 bytes per packet is generally safe for thermal printers
            
            for (let i = 0; i < encodedData.length; i += CHUNK_SIZE) {
                const chunk = encodedData.slice(i, i + CHUNK_SIZE);
                await printerCharacteristic?.writeValue(chunk);
                // Optional: Tiny delay can help very slow printers processing buffer
                // await new Promise(r => setTimeout(r, 10)); 
            }
        } catch (e) {
            console.error('Failed to print', e);
            alert('Gagal mengirim data ke printer. Coba sambungkan ulang.');
            printerCharacteristic = null; // Reset connection
        }
    }
};


import type { Transaction, ReceiptSettings } from '../types';
import { Capacitor } from '@capacitor/core';

// --- Native Bluetooth Serial Interface (from Cordova Plugin) ---
interface BluetoothSerialPlugin {
    isEnabled: (success: () => void, failure: (err: any) => void) => void;
    list: (success: (devices: any[]) => void, failure: (err: any) => void) => void;
    connect: (macAddress: string, success: () => void, failure: (err: any) => void) => void;
    disconnect: (success: () => void, failure: (err: any) => void) => void;
    write: (data: any, success: () => void, failure: (err: any) => void) => void;
    isConnected: (success: () => void, failure: () => void) => void;
}

declare global {
    interface Window {
        bluetoothSerial?: BluetoothSerialPlugin;
    }
    interface Navigator {
        bluetooth?: any;
    }
}

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
    SIZE_LARGE: GS + '!' + '\x11', 
    CUT: GS + 'V' + '\x41' + '\x00', 
    FONT_B: ESC + 'M' + '\x01', 
    FONT_A: ESC + 'M' + '\x00', 
};

// State untuk Web Bluetooth
let webBluetoothDevice: BluetoothDevice | null = null;
let webPrinterCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

// State untuk Native Bluetooth (Android ID/MAC Address)
let nativeConnectedId: string | null = null;

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
    data += COMMANDS.FONT_A; 
    
    data += LF + LF + LF; // Feed

    // Filter ASCII Only
    return data.replace(/[^\x00-\x7F]/g, "");
};

export const bluetoothPrinterService = {
    // --- NATIVE ANDROID METHODS ---
    
    listNativeDevices: (): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            if (!window.bluetoothSerial) {
                reject("Bluetooth plugin not loaded");
                return;
            }
            window.bluetoothSerial.list(resolve, reject);
        });
    },

    connectNative: (macAddress: string): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            if (!window.bluetoothSerial) {
                reject("Bluetooth plugin not loaded");
                return;
            }
            window.bluetoothSerial.connect(macAddress, () => {
                nativeConnectedId = macAddress;
                resolve(true);
            }, reject);
        });
    },

    disconnectNative: (): Promise<void> => {
        return new Promise((resolve) => {
            if (window.bluetoothSerial) {
                window.bluetoothSerial.disconnect(() => {
                    nativeConnectedId = null;
                    resolve();
                }, () => resolve());
            } else {
                resolve();
            }
        });
    },

    // --- WEB METHODS ---

    connectWeb: async (): Promise<boolean> => {
        if (!navigator.bluetooth) {
            alert('Browser ini tidak mendukung Bluetooth Web API.');
            return false;
        }

        try {
            webBluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
                acceptAllDevices: false 
            }).catch(async () => {
                 if (navigator.bluetooth) {
                    return await navigator.bluetooth.requestDevice({
                        acceptAllDevices: true,
                        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] 
                    });
                 }
                 throw new Error("Bluetooth API unavailable");
            });

            if (!webBluetoothDevice || !webBluetoothDevice.gatt) return false;

            const server = await webBluetoothDevice.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const characteristics = await service.getCharacteristics();
            const writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

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

    // --- MAIN PRINT FUNCTION ---

    printReceipt: async (transaction: Transaction, settings: ReceiptSettings) => {
        const rawData = generateReceiptData(transaction, settings);

        // 1. ANDROID NATIVE
        if (Capacitor.isNativePlatform()) {
            if (!window.bluetoothSerial) {
                alert("Plugin Bluetooth belum dimuat. Restart aplikasi.");
                return;
            }

            // Check connection first
            window.bluetoothSerial.isConnected(
                () => {
                    // Connected, send data
                    window.bluetoothSerial!.write(rawData, 
                        () => console.log("Print success"), 
                        (err) => alert("Gagal mengirim data ke printer: " + err)
                    );
                },
                () => {
                    alert("Printer tidak terhubung. Silakan masuk ke Menu Pengaturan > Hardware untuk menghubungkan printer.");
                }
            );
            return;
        }

        // 2. WEB BROWSER
        if (!webPrinterCharacteristic) {
            const connected = await bluetoothPrinterService.connectWeb();
            if (!connected) return;
        }

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
            console.error('Failed to print', e);
            alert('Gagal mengirim data. Coba sambungkan ulang.');
            webPrinterCharacteristic = null; 
        }
    }
};

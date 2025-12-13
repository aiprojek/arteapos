
import { Dropbox } from 'dropbox';
import { dataService } from './dataService';
import { db } from './db'; // Import DB to get settings
import type { AppData, ReceiptSettings } from '../types';

const MASTER_DATA_FILENAME = '/artea_pos_master_config.json';

export const dropboxService = {
    // Inisialisasi klien Dropbox
    getClient: (accessToken: string) => {
        return new Dropbox({ accessToken });
    },

    // Helper untuk mendapatkan nama file berdasarkan Store ID (untuk Full Backup)
    getFileName: async (): Promise<string> => {
        try {
            const settings = await db.settings.get('receiptSettings');
            const receiptSettings = settings?.value as ReceiptSettings;
            const storeId = receiptSettings?.storeId ? receiptSettings.storeId.replace(/[^a-zA-Z0-9-_]/g, '') : 'MAIN';
            return `/artea_pos_backup_${storeId}.json`;
        } catch (e) {
            console.error("Failed to get store ID", e);
            return '/artea_pos_backup_default.json';
        }
    },

    // Upload data saat ini ke Dropbox (Full Backup)
    uploadBackup: async (accessToken: string): Promise<void> => {
        try {
            const data = await dataService.getExportData();
            const jsonString = JSON.stringify(data);
            const fileName = await dropboxService.getFileName();
            const dbx = new Dropbox({ accessToken });
            
            await dbx.filesUpload({
                path: fileName,
                contents: jsonString,
                mode: { '.tag': 'overwrite' }
            });
            
        } catch (error: any) {
            console.error('Dropbox Upload Error:', error);
            if (error.status === 401) throw new Error('Access Token tidak valid atau kadaluarsa.');
            throw new Error('Gagal mengunggah ke Dropbox. Periksa koneksi internet.');
        }
    },

    // Download data dari Dropbox (Full Restore)
    downloadBackup: async (accessToken: string): Promise<AppData> => {
        try {
            const dbx = new Dropbox({ accessToken });
            const fileName = await dropboxService.getFileName();
            
            const response = await dbx.filesDownload({ path: fileName });
            // @ts-ignore
            const fileBlob = response.result.fileBlob;
            const text = await fileBlob.text();
            return JSON.parse(text) as AppData;

        } catch (error: any) {
            console.error('Dropbox Download Error:', error);
            if (error.status === 409 || (error.error && error.error.error_summary && error.error.error_summary.includes('path/not_found'))) {
                throw new Error('File backup cabang ini tidak ditemukan di Dropbox.');
            }
            if (error.status === 401) throw new Error('Access Token tidak valid.');
            throw new Error('Gagal mengunggah dari Dropbox.');
        }
    },

    // --- NEW: CSV Reporting Upload ---
    // Uploads specific CSV files to a folder structure for easy admin reading
    uploadCSVReports: async (accessToken: string): Promise<void> => {
        try {
            const dbx = new Dropbox({ accessToken });
            const settings = await db.settings.get('receiptSettings');
            const receiptSettings = settings?.value as ReceiptSettings;
            const storeId = receiptSettings?.storeId ? receiptSettings.storeId.replace(/[^a-zA-Z0-9-_]/g, '') : 'MAIN';
            const today = new Date().toISOString().slice(0, 10);
            
            // Fetch data directly from IndexedDB via dataService helper
            const data = await dataService.getExportData();
            
            // 1. Transactions CSV
            if (data.transactionRecords && data.transactionRecords.length > 0) {
                const txnCsv = dataService.generateTransactionsCSVString(data.transactionRecords);
                await dbx.filesUpload({
                    path: `/Laporan/${storeId}/${today}_transaksi.csv`,
                    contents: txnCsv,
                    mode: { '.tag': 'overwrite' }
                });
            }

            // 2. Stock Log CSV (Restock & Waste)
            if (data.stockAdjustments && data.stockAdjustments.length > 0) {
                const stockCsv = dataService.generateStockAdjustmentsCSVString(data.stockAdjustments);
                await dbx.filesUpload({
                    path: `/Laporan/${storeId}/${today}_mutasi_stok.csv`,
                    contents: stockCsv,
                    mode: { '.tag': 'overwrite' }
                });
            }

        } catch (error: any) {
            console.error('Dropbox CSV Upload Error:', error);
            // Don't throw error here to avoid blocking the main sync process, just log it.
            // Or rethrow if strict
        }
    },

    // --- NEW: Master Data Sync (Similar to Supabase Push/Pull) ---

    // Admin PUSH: Upload hanya Produk, Diskon, Poin ke file 'artea_pos_master_config.json'
    uploadMasterData: async (accessToken: string): Promise<void> => {
        try {
            const data = await dataService.getExportData();
            
            // Filter hanya data master yang relevan untuk cabang
            const masterPayload: Partial<AppData> = {
                products: data.products,
                categories: data.categories,
                discountDefinitions: data.discountDefinitions,
                membershipSettings: data.membershipSettings,
                customers: data.customers,
                suppliers: data.suppliers, // Optional: Share suppliers list too
            };

            const jsonString = JSON.stringify(masterPayload);
            const dbx = new Dropbox({ accessToken });

            await dbx.filesUpload({
                path: MASTER_DATA_FILENAME,
                contents: jsonString,
                mode: { '.tag': 'overwrite' }
            });

        } catch (error: any) {
            console.error('Dropbox Master Upload Error:', error);
            if (error.status === 401) throw new Error('Access Token tidak valid.');
            throw new Error('Gagal push master data ke Dropbox.');
        }
    },

    // Cabang PULL: Download 'artea_pos_master_config.json' dan merge ke lokal
    downloadAndMergeMasterData: async (accessToken: string): Promise<void> => {
        try {
            const dbx = new Dropbox({ accessToken });
            const response = await dbx.filesDownload({ path: MASTER_DATA_FILENAME });
            
            // @ts-ignore
            const fileBlob = response.result.fileBlob;
            const text = await fileBlob.text();
            const masterData = JSON.parse(text) as AppData;

            // Merge Logic
            await dataService.mergeMasterData(masterData);

        } catch (error: any) {
            console.error('Dropbox Master Download Error:', error);
            if (error.status === 409 || (error.error && error.error.error_summary && error.error.error_summary.includes('path/not_found'))) {
                throw new Error('File Master Data belum ada di Dropbox (Admin belum Push).');
            }
            if (error.status === 401) throw new Error('Access Token tidak valid.');
            throw new Error('Gagal menarik master data dari Dropbox.');
        }
    }
};

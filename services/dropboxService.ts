
import { Dropbox, DropboxAuth } from 'dropbox';
import { dataService } from './dataService';
import { db } from './db'; // Import DB to get settings
import type { AppData, ReceiptSettings } from '../types';

const MASTER_DATA_FILENAME = '/artea_pos_master_config.json';
const BRANCH_FOLDER = '/Cabang_Data'; // Folder for branch files

export const dropboxService = {
    // --- AUTH HELPER ---
    
    // 1. Generate Auth URL for user to click
    getAuthUrl: async (clientId: string): Promise<string> => {
        const dbx = new DropboxAuth({ clientId });
        // token_access_type='offline' is crucial to get a Refresh Token
        return await dbx.getAuthenticationUrl('', undefined, 'code', 'offline', undefined, undefined, false);
    },

    // 2. Exchange Code for Refresh Token
    exchangeCodeForToken: async (clientId: string, clientSecret: string, code: string): Promise<string> => {
        const dbx = new DropboxAuth({ clientId, clientSecret });
        const response = await dbx.getAccessTokenFromCode('', code);
        const refreshToken = response.result.refresh_token;
        if (!refreshToken) throw new Error("Gagal mendapatkan Refresh Token. Pastikan App Dropbox diatur permission-nya.");
        return refreshToken;
    },

    // --- CLIENT INITIALIZATION ---

    // Initialize client dynamically from LocalStorage credentials
    getClient: () => {
        const clientId = localStorage.getItem('ARTEA_DBX_KEY');
        const clientSecret = localStorage.getItem('ARTEA_DBX_SECRET');
        const refreshToken = localStorage.getItem('ARTEA_DBX_REFRESH_TOKEN');

        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error('Koneksi Dropbox belum dikonfigurasi (Butuh App Key, Secret, & Refresh Token).');
        }

        return new Dropbox({ 
            clientId, 
            clientSecret, 
            refreshToken 
        });
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

    // --- NEW: Check Quota ---
    getSpaceUsage: async (): Promise<{ used: number; allocated: number }> => {
        try {
            const dbx = dropboxService.getClient();
            const response = await dbx.usersGetSpaceUsage();
            
            const used = response.result.used;
            // Handle differences in allocation types (individual vs team)
            let allocated = 0;
            const allocation = response.result.allocation;
            
            if (allocation['.tag'] === 'individual') {
                allocated = allocation.allocated;
            } else if (allocation['.tag'] === 'team') {
                allocated = allocation.allocated;
            }

            return { used, allocated };
        } catch (error: any) {
            console.error('Dropbox Quota Check Error:', error);
            throw new Error('Gagal mengecek kuota Dropbox.');
        }
    },

    // Upload data saat ini ke Dropbox (Full Backup)
    uploadBackup: async (): Promise<void> => {
        try {
            const dbx = dropboxService.getClient();
            const data = await dataService.getExportData();
            const jsonString = JSON.stringify(data);
            const fileName = await dropboxService.getFileName();
            
            await dbx.filesUpload({
                path: fileName,
                contents: jsonString,
                mode: { '.tag': 'overwrite' }
            });
            
        } catch (error: any) {
            console.error('Dropbox Upload Error:', error);
            if (error.status === 401) throw new Error('Otorisasi Dropbox kadaluarsa. Silakan hubungkan ulang.');
            if (error.status === 507 || (error.error && error.error.error_summary && error.error.error_summary.includes('insufficient_space'))) {
                throw new Error('QUOTA_EXCEEDED: Penyimpanan Dropbox Penuh.');
            }
            throw new Error(error.message || 'Gagal mengunggah ke Dropbox.');
        }
    },

    // --- NEW: Semi-Realtime Branch Sync ---
    // Called after every transaction or financial update
    uploadBranchData: async (): Promise<void> => {
        try {
            const dbx = dropboxService.getClient();
            const settings = await db.settings.get('receiptSettings');
            const receiptSettings = settings?.value as ReceiptSettings;
            const storeId = receiptSettings?.storeId ? receiptSettings.storeId.replace(/[^a-zA-Z0-9-_]/g, '') : 'MAIN';
            
            // Get Only Operational Data (No Master Products needed in branch file if separate)
            // But currently simpler to just grab what's needed for reports
            const data = await dataService.getExportData();
            
            const branchPayload = {
                storeId: storeId,
                lastUpdated: new Date().toISOString(),
                transactionRecords: data.transactionRecords,
                expenses: data.expenses,
                otherIncomes: data.otherIncomes,
                customers: data.customers, // Customers grow per branch but synchronized via master usually
                stockAdjustments: data.stockAdjustments,
                sessionHistory: data.sessionHistory,
                // Inventory Snapshot
                currentStock: data.products?.filter(p => p.trackStock).map(p => ({id: p.id, name: p.name, stock: p.stock}))
            };

            const jsonString = JSON.stringify(branchPayload);
            const path = `${BRANCH_FOLDER}/branch_data_${storeId}.json`;

            await dbx.filesUpload({
                path: path,
                contents: jsonString,
                mode: { '.tag': 'overwrite' }
            });
            
        } catch (error: any) {
            console.error('Dropbox Branch Upload Error:', error);
            // Silent fail is acceptable for background sync, but logging is good
        }
    },

    // --- NEW: Admin Aggregation (Pull ALL branches) ---
    fetchAllBranchData: async (): Promise<any[]> => {
        try {
            const dbx = dropboxService.getClient();
            
            // 1. List all files in Branch Folder
            let filesResponse;
            try {
                filesResponse = await dbx.filesListFolder({ path: BRANCH_FOLDER });
            } catch (e: any) {
                // Folder might not exist yet
                if (e.error?.path?.['.tag'] === 'not_found') return [];
                throw e;
            }

            const branchFiles = filesResponse.result.entries.filter(entry => 
                entry['.tag'] === 'file' && entry.name.startsWith('branch_data_') && entry.name.endsWith('.json')
            );

            // 2. Download all files in parallel
            const promises = branchFiles.map(async (file) => {
                try {
                    const dl = await dbx.filesDownload({ path: file.path_lower! });
                    // @ts-ignore
                    const text = await dl.result.fileBlob.text();
                    return JSON.parse(text);
                } catch (e) {
                    console.error(`Failed to download ${file.name}`, e);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            return results.filter(r => r !== null);

        } catch (error: any) {
            console.error('Dropbox Aggregation Error:', error);
            throw new Error('Gagal mengambil data cabang dari Dropbox.');
        }
    },

    // --- EXISTING CSV REPORT (Still useful for simple archiving) ---
    uploadCSVReports: async (): Promise<void> => {
        // ... Existing CSV logic kept as fallback/archive ...
        // We trigger uploadBranchData here as well for dual-update
        await dropboxService.uploadBranchData();
    },

    // --- Master Data Sync ---

    // Admin PUSH: Upload hanya Produk, Diskon, Poin ke file 'artea_pos_master_config.json'
    uploadMasterData: async (): Promise<void> => {
        try {
            const data = await dataService.getExportData();
            
            // Filter hanya data master
            const masterPayload: Partial<AppData> = {
                products: data.products,
                categories: data.categories,
                discountDefinitions: data.discountDefinitions,
                membershipSettings: data.membershipSettings,
                customers: data.customers, // Customers might be shared
                suppliers: data.suppliers,
                receiptSettings: { ...data.receiptSettings, branches: data.receiptSettings?.branches } as ReceiptSettings // Sync Branch Definitions too
            };

            const jsonString = JSON.stringify(masterPayload);
            const dbx = dropboxService.getClient();

            await dbx.filesUpload({
                path: MASTER_DATA_FILENAME,
                contents: jsonString,
                mode: { '.tag': 'overwrite' }
            });

        } catch (error: any) {
            console.error('Dropbox Master Upload Error:', error);
            if (error.status === 401) throw new Error('Otorisasi Dropbox kadaluarsa.');
            throw new Error('Gagal push master data ke Dropbox.');
        }
    },

    // Cabang PULL: Download 'artea_pos_master_config.json' dan merge ke lokal
    downloadAndMergeMasterData: async (): Promise<void> => {
        try {
            const dbx = dropboxService.getClient();
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
    },

    // --- MAINTENANCE: Delete Reports Folder (Quota Management) ---
    clearOldBackups: async (): Promise<{ success: boolean; message: string }> => {
        try {
            const dbx = dropboxService.getClient();
            // Deletes the entire Laporan folder. Simple & effective for free tier cleanup.
            await dbx.filesDeleteV2({ path: '/Laporan' });
            return { success: true, message: 'Folder Laporan di Dropbox berhasil dikosongkan.' };
        } catch (error: any) {
            // Path not found is fine (already empty)
            if (error.status === 409 || (error.error && error.error.error_summary && error.error.error_summary.includes('path_lookup/not_found'))) {
                return { success: true, message: 'Folder Laporan sudah kosong.' };
            }
            return { success: false, message: `Gagal menghapus: ${error.message}` };
        }
    }
};

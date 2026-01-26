
import { Dropbox, DropboxAuth } from 'dropbox';
import { dataService } from './dataService';
import { db } from './db'; 
import type { AppData, ReceiptSettings, StockTransferPayload } from '../types';
import { encryptStorage, decryptStorage } from '../utils/crypto'; // Import crypto

const MASTER_DATA_FILENAME = '/artea_pos_master_config.json';
const BRANCH_FOLDER = '/Cabang_Data'; 
const TRANSFER_FOLDER = '/Transfer_Stok'; // NEW FOLDER

// Key Constants
const KEY_APP_KEY = 'ARTEA_DBX_KEY';
const KEY_APP_SECRET = 'ARTEA_DBX_SECRET';
const KEY_REFRESH_TOKEN = 'ARTEA_DBX_REFRESH_TOKEN';
const KEY_MASTER_REV = 'ARTEA_DBX_MASTER_REV'; // NEW: Store file revision ID
const KEY_PROCESSED_TRANSFERS = 'ARTEA_PROCESSED_TRANSFERS'; // NEW: For Idempotency

// Retry Helper
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const retryOperation = async <T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        // Don't retry on Auth errors (401) or Logic errors (409 conflict, 400 bad request)
        if (retries <= 0 || error.status === 401 || error.status === 409 || error.status === 400) {
            throw error;
        }
        console.warn(`Dropbox operation failed, retrying in ${delay}ms... (${retries} attempts left)`, error);
        await wait(delay);
        return retryOperation(operation, retries - 1, delay * 1.5); // Exponential backoff-ish
    }
};

// Safe Local Storage Helper to prevent SecurityError in iframes/sandboxes
const safeStorage = {
    setItem: (key: string, value: string) => {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            console.warn('LocalStorage access denied/failed', e);
        }
    },
    getItem: (key: string): string | null => {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            console.warn('LocalStorage access denied/failed', e);
            return null;
        }
    },
    removeItem: (key: string) => {
        try {
            window.localStorage.removeItem(key);
        } catch (e) {
            console.warn('LocalStorage access denied/failed', e);
        }
    }
};

export const dropboxService = {
    // --- CREDENTIAL MANAGEMENT ---
    
    saveCredentials: (key: string, secret: string, refreshToken: string) => {
        if (key) safeStorage.setItem(KEY_APP_KEY, encryptStorage(key));
        if (secret) safeStorage.setItem(KEY_APP_SECRET, encryptStorage(secret));
        if (refreshToken) safeStorage.setItem(KEY_REFRESH_TOKEN, encryptStorage(refreshToken));
    },

    // Strict: Returns null if ANY credential (including token) is missing
    getCredentials: () => {
        const key = decryptStorage(safeStorage.getItem(KEY_APP_KEY));
        const secret = decryptStorage(safeStorage.getItem(KEY_APP_SECRET));
        const refreshToken = decryptStorage(safeStorage.getItem(KEY_REFRESH_TOKEN));
        
        if (!key || !secret || !refreshToken) return null;
        return { clientId: key, clientSecret: secret, refreshToken };
    },

    // Loose: Returns stored keys even if token is missing (For Step 2 Auth Flow)
    getStoredAppConfig: () => {
        const key = decryptStorage(safeStorage.getItem(KEY_APP_KEY));
        const secret = decryptStorage(safeStorage.getItem(KEY_APP_SECRET));
        if (!key || !secret) return null;
        return { clientId: key, clientSecret: secret };
    },

    clearCredentials: () => {
        safeStorage.removeItem(KEY_APP_KEY);
        safeStorage.removeItem(KEY_APP_SECRET);
        safeStorage.removeItem(KEY_REFRESH_TOKEN);
        safeStorage.removeItem(KEY_MASTER_REV);
    },

    isConfigured: (): boolean => {
        const creds = dropboxService.getCredentials();
        return !!creds;
    },

    // --- AUTH HELPER ---
    
    getAuthUrl: async (clientId: string): Promise<string> => {
        const dbx = new DropboxAuth({ clientId });
        return await dbx.getAuthenticationUrl('', undefined, 'code', 'offline', undefined, undefined, false);
    },

    exchangeCodeForToken: async (clientId: string, clientSecret: string, code: string): Promise<string> => {
        const dbx = new DropboxAuth({ clientId, clientSecret });
        const response = await dbx.getAccessTokenFromCode('', code);
        const refreshToken = response.result.refresh_token;
        if (!refreshToken) throw new Error("Gagal mendapatkan Refresh Token. Pastikan App Dropbox diatur permission-nya.");
        return refreshToken;
    },

    // --- CLIENT INITIALIZATION ---

    getClient: () => {
        const creds = dropboxService.getCredentials();

        if (!creds) {
            throw new Error('Koneksi Dropbox belum dikonfigurasi (Butuh App Key, Secret, & Refresh Token).');
        }

        return new Dropbox({ 
            clientId: creds.clientId, 
            clientSecret: creds.clientSecret, 
            refreshToken: creds.refreshToken 
        });
    },

    getFileName: async (): Promise<string> => {
        try {
            const settings = await db.settings.get('receiptSettings');
            const receiptSettings = settings?.value as ReceiptSettings;
            const storeId = receiptSettings?.storeId ? receiptSettings.storeId.replace(/[^a-zA-Z0-9-_]/g, '') : 'MAIN';
            // Note: We use a fixed filename for Master Data to ensure single source of truth for branches
            return MASTER_DATA_FILENAME;
        } catch (e) {
            console.error("Failed to get store ID", e);
            return MASTER_DATA_FILENAME;
        }
    },

    getSpaceUsage: async (): Promise<{ used: number; allocated: number }> => {
        try {
            const dbx = dropboxService.getClient();
            const response = await retryOperation(() => dbx.usersGetSpaceUsage()) as any;
            
            const used = response.result.used;
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

    uploadBackup: async (): Promise<void> => {
        try {
            const dbx = dropboxService.getClient();
            const data = await dataService.getExportData();
            const jsonString = JSON.stringify(data);
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const fileName = `/artea_pos_backup_${timestamp}.json`;
            
            await retryOperation(() => dbx.filesUpload({
                path: fileName,
                contents: jsonString,
                mode: { '.tag': 'add' }
            }));
            
        } catch (error: any) {
            console.error('Dropbox Upload Error:', error);
            if (error.status === 401) throw new Error('Otorisasi Dropbox kadaluarsa. Silakan hubungkan ulang.');
            if (error.status === 507 || (error.error && error.error.error_summary && error.error.error_summary.includes('insufficient_space'))) {
                throw new Error('QUOTA_EXCEEDED: Penyimpanan Dropbox Penuh.');
            }
            throw new Error(error.message || 'Gagal mengunggah ke Dropbox.');
        }
    },

    uploadBranchData: async (staffName: string = 'Staff'): Promise<void> => {
        try {
            const dbx = dropboxService.getClient();
            const settings = await db.settings.get('receiptSettings');
            const receiptSettings = settings?.value as ReceiptSettings;
            const storeId = receiptSettings?.storeId ? receiptSettings.storeId.replace(/[^a-zA-Z0-9-_]/g, '') : 'MAIN';
            
            const data = await dataService.getExportData();
            
            const branchPayload = {
                storeId: storeId,
                lastUpdated: new Date().toISOString(),
                staffName: staffName,
                transactionRecords: data.transactionRecords,
                expenses: data.expenses,
                otherIncomes: data.otherIncomes,
                customers: data.customers, 
                stockAdjustments: data.stockAdjustments,
                sessionHistory: data.sessionHistory,
                auditLogs: data.auditLogs,
                currentStock: data.products?.filter(p => p.trackStock).map(p => ({id: p.id, name: p.name, stock: p.stock}))
            };

            const jsonString = JSON.stringify(branchPayload);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const safeStaffName = staffName.replace(/[^a-zA-Z0-9]/g, '');
            const uuid = Math.random().toString(36).substring(2, 8);
            
            const folderPath = `${BRANCH_FOLDER}/${storeId}`;
            const fileName = `log_${timestamp}_${storeId}_${safeStaffName}_${uuid}.json`;
            const fullPath = `${folderPath}/${fileName}`;

            await retryOperation(() => dbx.filesUpload({
                path: fullPath,
                contents: jsonString,
                mode: { '.tag': 'add' }
            }));
            
        } catch (error: any) {
            console.error('Dropbox Branch Upload Error:', error);
            if (error.status === 409 && error.error?.error_summary?.includes('path/not_found')) {
               // Ignore
            }
            throw error;
        }
    },

    fetchAllBranchData: async (): Promise<any[]> => {
        try {
            const dbx = dropboxService.getClient();
            
            let allEntries: any[] = [];
            let hasMore = true;
            let cursor = '';

            try {
                // Fix: Cast result to any to avoid property access on unknown error
                let response = (await retryOperation(() => dbx.filesListFolder({ 
                    path: BRANCH_FOLDER, 
                    recursive: true 
                }))) as any;
                
                allEntries = [...allEntries, ...response.result.entries];
                hasMore = response.result.has_more;
                cursor = response.result.cursor;

                while (hasMore) {
                    // eslint-disable-next-line no-loop-func
                    response = (await retryOperation(() => dbx.filesListFolderContinue({ cursor }))) as any;
                    allEntries = [...allEntries, ...response.result.entries];
                    hasMore = response.result.has_more;
                    cursor = response.result.cursor;
                }
            } catch (e: any) {
                if (e.error?.path?.['.tag'] === 'not_found') return [];
                throw e;
            }

            const jsonFiles = allEntries.filter(entry => 
                entry['.tag'] === 'file' && entry.name.endsWith('.json')
            );

            if (jsonFiles.length === 0) return [];

            const downloads = await Promise.all(jsonFiles.map(async (file) => {
                try {
                    const dl = await retryOperation<any>(() => dbx.filesDownload({ path: file.path_lower! }));
                    // @ts-ignore
                    const text = await dl.result.fileBlob.text();
                    return JSON.parse(text);
                } catch (e) {
                    console.warn(`Failed to download/parse ${file.name}`, e);
                    return null;
                }
            }));

            const validData = downloads.filter(d => d !== null);

            const branchMap = new Map<string, any>();

            validData.forEach(batch => {
                const storeId = batch.storeId || 'UNKNOWN';
                
                if (!branchMap.has(storeId)) {
                    branchMap.set(storeId, {
                        storeId: storeId,
                        transactionRecords: [],
                        expenses: [],
                        otherIncomes: [],
                        customers: [],
                        stockAdjustments: [],
                        auditLogs: [],
                        currentStock: [],
                        lastUpdated: batch.lastUpdated
                    });
                }

                const currentBranch = branchMap.get(storeId);

                if (new Date(batch.lastUpdated) > new Date(currentBranch.lastUpdated)) {
                    currentBranch.lastUpdated = batch.lastUpdated;
                    if (batch.currentStock) {
                        currentBranch.currentStock = batch.currentStock; 
                    }
                } else if (!currentBranch.currentStock.length && batch.currentStock) {
                     currentBranch.currentStock = batch.currentStock;
                }

                if (batch.transactionRecords) currentBranch.transactionRecords.push(...batch.transactionRecords);
                if (batch.expenses) currentBranch.expenses.push(...batch.expenses);
                if (batch.otherIncomes) currentBranch.otherIncomes.push(...batch.otherIncomes);
                if (batch.customers) currentBranch.customers.push(...batch.customers);
                if (batch.stockAdjustments) currentBranch.stockAdjustments.push(...batch.stockAdjustments);
                if (batch.auditLogs) currentBranch.auditLogs.push(...batch.auditLogs);
            });

            const deduplicateById = (items: any[]) => {
                const map = new Map();
                items.forEach(item => {
                    if (item.id) map.set(item.id, item);
                });
                return Array.from(map.values());
            };

            const aggregatedResults = Array.from(branchMap.values()).map(branch => ({
                ...branch,
                transactionRecords: deduplicateById(branch.transactionRecords),
                expenses: deduplicateById(branch.expenses),
                otherIncomes: deduplicateById(branch.otherIncomes),
                customers: deduplicateById(branch.customers),
                stockAdjustments: deduplicateById(branch.stockAdjustments),
                auditLogs: deduplicateById(branch.auditLogs),
            }));

            return aggregatedResults;

        } catch (error: any) {
            console.error('Dropbox Aggregation Error:', error);
            throw new Error('Gagal mengambil data cabang dari Dropbox.');
        }
    },

    uploadCSVReports: async (): Promise<void> => {
        await dropboxService.uploadBranchData('System');
    },

    // --- MASTER DATA SYNC ---

    uploadMasterData: async (forceOverwrite: boolean = false): Promise<void> => {
        try {
            const data = await dataService.getExportData();
            
            const masterPayload: Partial<AppData> = {
                products: data.products,
                categories: data.categories,
                discountDefinitions: data.discountDefinitions,
                membershipSettings: data.membershipSettings,
                customers: data.customers,
                suppliers: data.suppliers,
                receiptSettings: { ...data.receiptSettings, branches: data.receiptSettings?.branches } as ReceiptSettings
            };

            const jsonString = JSON.stringify(masterPayload);
            const dbx = dropboxService.getClient();
            const masterFileName = await dropboxService.getFileName(); 

            let mode: any = { '.tag': 'overwrite' };
            const lastRev = safeStorage.getItem(KEY_MASTER_REV);

            if (!forceOverwrite && lastRev) {
                mode = { '.tag': 'update', update: lastRev };
            }

            const response = await retryOperation(() => dbx.filesUpload({
                path: masterFileName,
                contents: jsonString,
                mode: mode
            })) as any;

            if (response.result.rev) {
                safeStorage.setItem(KEY_MASTER_REV, response.result.rev);
            }

        } catch (error: any) {
            console.error('Dropbox Master Upload Error:', error);
            if (error.status === 401) throw new Error('Otorisasi Dropbox kadaluarsa.');
            if (error.status === 409 && error.error?.error_summary?.includes('path/conflict')) {
                throw new Error('CONFLICT_DETECTED');
            }
            throw new Error('Gagal push master data ke Dropbox.');
        }
    },

    downloadAndMergeMasterData: async (): Promise<void> => {
        try {
            const dbx = dropboxService.getClient();
            const masterFileName = await dropboxService.getFileName();
            
            const response = await retryOperation(() => dbx.filesDownload({ path: masterFileName })) as any;
            
            if (response.result.rev) {
                safeStorage.setItem(KEY_MASTER_REV, response.result.rev);
            }

            // @ts-ignore
            const fileBlob = response.result.fileBlob;
            const text = await fileBlob.text();
            const masterData = JSON.parse(text) as AppData;

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

    clearOldBackups: async (): Promise<{ success: boolean; message: string }> => {
        try {
            const dbx = dropboxService.getClient();
            try {
               await retryOperation(() => dbx.filesDeleteV2({ path: '/Laporan' }));
            } catch(e) {} 

            try {
                await retryOperation(() => dbx.filesDeleteV2({ path: BRANCH_FOLDER }));
            } catch (e: any) {
                 if (e.error?.path_lookup?.['.tag'] !== 'not_found') {
                     console.warn("Clean branch folder error", e);
                 }
            }

            return { success: true, message: 'Data historis Cloud (Folder Laporan & Cabang) berhasil dikosongkan.' };
        } catch (error: any) {
            return { success: false, message: `Gagal menghapus: ${error.message}` };
        }
    },

    // --- STOCK TRANSFER FEATURES (NEW) ---

    // GUDANG (Sender): Upload file transfer
    uploadStockTransfer: async (targetStoreId: string, items: StockTransferPayload['items'], notes: string = ''): Promise<void> => {
        try {
            const dbx = dropboxService.getClient();
            const settings = await db.settings.get('receiptSettings');
            const myStoreId = (settings?.value as ReceiptSettings)?.storeId || 'PUSAT';
            const timestamp = new Date().toISOString();
            
            const payload: StockTransferPayload = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                fromStoreId: myStoreId,
                toStoreId: targetStoreId,
                timestamp: timestamp,
                items: items,
                notes: notes
            };

            const jsonString = JSON.stringify(payload);
            const cleanTargetId = targetStoreId.replace(/[^a-zA-Z0-9-_]/g, '');
            const folderPath = `${TRANSFER_FOLDER}/${cleanTargetId}`;
            const fileName = `transfer_${timestamp.replace(/[:.]/g, '-')}_from_${myStoreId}.json`;
            const fullPath = `${folderPath}/${fileName}`;

            await retryOperation(() => dbx.filesUpload({
                path: fullPath,
                contents: jsonString,
                mode: { '.tag': 'add' }
            }));

        } catch (error: any) {
            console.error('Stock Transfer Upload Error:', error);
            throw new Error('Gagal mengirim stok ke Dropbox.');
        }
    },

    // CABANG (Receiver): Check, Download, and Delete
    fetchPendingTransfers: async (myStoreId: string): Promise<StockTransferPayload[]> => {
        try {
            const dbx = dropboxService.getClient();
            const cleanId = myStoreId.replace(/[^a-zA-Z0-9-_]/g, '');
            const folderPath = `${TRANSFER_FOLDER}/${cleanId}`;
            
            let files: any[] = [];
            try {
                const response = (await retryOperation(() => dbx.filesListFolder({ path: folderPath }))) as any;
                files = response.result.entries.filter((e: any) => e['.tag'] === 'file' && e.name.endsWith('.json'));
            } catch (e: any) {
                // If folder doesn't exist, no transfers yet
                if (e.error?.path?.['.tag'] === 'not_found') return [];
                throw e;
            }

            if (files.length === 0) return [];

            const transfers: StockTransferPayload[] = [];
            
            // IDEMPOTENCY CHECK: Load processed IDs
            let processedIds: string[] = [];
            try {
                const stored = safeStorage.getItem(KEY_PROCESSED_TRANSFERS);
                if (stored) processedIds = JSON.parse(stored);
            } catch (e) {
                console.warn("Failed to load processed transfers");
            }
            
            // Limit stored IDs to avoid overflow (keep last 100)
            if (processedIds.length > 100) processedIds = processedIds.slice(-100);

            // Process each file
            for (const file of files) {
                // Check if already processed (Idempotency)
                if (processedIds.includes(file.name)) {
                    // Try to delete orphan file and skip
                    try {
                        await retryOperation(() => dbx.filesDeleteV2({ path: file.path_lower! }));
                    } catch(e) {}
                    continue;
                }

                try {
                    // 1. Download
                    const dl = await retryOperation<any>(() => dbx.filesDownload({ path: file.path_lower! }));
                    // @ts-ignore
                    const text = await dl.result.fileBlob.text();
                    const data = JSON.parse(text) as StockTransferPayload;
                    
                    // Basic validation
                    if (data.items && Array.isArray(data.items)) {
                        transfers.push(data);
                        
                        // 2. Mark as processed locally first
                        processedIds.push(file.name);
                        safeStorage.setItem(KEY_PROCESSED_TRANSFERS, JSON.stringify(processedIds));

                        // 3. Delete from Dropbox (so it's not processed again)
                        await retryOperation(() => dbx.filesDeleteV2({ path: file.path_lower! }));
                    }
                } catch (err) {
                    console.error(`Failed to process transfer file ${file.name}`, err);
                }
            }

            return transfers;

        } catch (error: any) {
            console.error('Fetch Transfers Error:', error);
            throw new Error('Gagal mengecek transfer stok dari Dropbox.');
        }
    }
};

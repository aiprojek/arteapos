
import { Dropbox } from 'dropbox';
import { dataService } from './dataService';
import type { AppData } from '../types';

const BACKUP_FILENAME = '/artea_pos_backup.json';

export const dropboxService = {
    // Inisialisasi klien Dropbox
    getClient: (accessToken: string) => {
        return new Dropbox({ accessToken });
    },

    // Upload data saat ini ke Dropbox
    uploadBackup: async (accessToken: string): Promise<void> => {
        try {
            // 1. Dapatkan data lengkap aplikasi (sama seperti fungsi export manual)
            const data = await dataService.getExportData(); // Kita perlu memodifikasi dataService untuk mengekspos fungsi ini
            const jsonString = JSON.stringify(data);
            
            // 2. Upload ke Dropbox
            const dbx = new Dropbox({ accessToken });
            
            // Mode 'overwrite' agar file backup selalu yang terbaru
            await dbx.filesUpload({
                path: BACKUP_FILENAME,
                contents: jsonString,
                mode: { '.tag': 'overwrite' }
            });
            
        } catch (error: any) {
            console.error('Dropbox Upload Error:', error);
            // Handle error token expired atau network
            if (error.status === 401) {
                throw new Error('Access Token tidak valid atau kadaluarsa.');
            }
            throw new Error('Gagal mengunggah ke Dropbox. Periksa koneksi internet.');
        }
    },

    // Download data dari Dropbox
    downloadBackup: async (accessToken: string): Promise<AppData> => {
        try {
            const dbx = new Dropbox({ accessToken });
            
            const response = await dbx.filesDownload({
                path: BACKUP_FILENAME
            });

            // Blob ke Text ke JSON
            // @ts-ignore - SDK types terkadang tidak sinkron dengan respons fileBlob
            const fileBlob = response.result.fileBlob;
            const text = await fileBlob.text();
            const data = JSON.parse(text);
            
            return data as AppData;

        } catch (error: any) {
            console.error('Dropbox Download Error:', error);
            if (error.status === 409 || (error.error && error.error.error_summary && error.error.error_summary.includes('path/not_found'))) {
                throw new Error('File backup tidak ditemukan di Dropbox.');
            }
            if (error.status === 401) {
                throw new Error('Access Token tidak valid.');
            }
            throw new Error('Gagal mengunduh dari Dropbox.');
        }
    }
};

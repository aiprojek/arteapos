
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Return raw base64 without prefix
            resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Membagikan file (Gambar/PDF) menggunakan Native Share Sheet
 */
export async function shareFileNative(fileName: string, base64Data: string, title: string = 'Bagikan File') {
    try {
        // Tulis file ke cache terlebih dahulu
        const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
        });

        // Share menggunakan URI file
        await Share.share({
            title: title,
            files: [result.uri],
        });
    } catch (e: any) {
        console.error("Native share failed", e);
        throw new Error("Gagal membagikan file: " + e.message);
    }
}

/**
 * Menyimpan file teks (CSV/JSON/SVG) ke perangkat
 * Android: Menyimpan ke folder Documents
 */
export async function saveTextFileNative(fileName: string, content: string) {
    try {
        const result = await Filesystem.writeFile({
            path: fileName,
            data: content,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
        return result.uri;
    } catch (e: any) {
        console.error("Native save failed", e);
        // Fallback to cache if Documents fails (permissions)
        try {
             const result = await Filesystem.writeFile({
                path: fileName,
                data: content,
                directory: Directory.Cache,
                encoding: Encoding.UTF8,
            });
            return result.uri;
        } catch (e2) {
            throw new Error("Gagal menyimpan file. Izin penyimpanan diperlukan.");
        }
    }
}

/**
 * Menyimpan file Binary (Excel/PDF) ke perangkat
 */
export async function saveBinaryFileNative(fileName: string, base64Data: string) {
    try {
        const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
        });
        return result.uri;
    } catch (e: any) {
        console.error("Native binary save failed", e);
        throw new Error("Gagal menyimpan file: " + e.message);
    }
}

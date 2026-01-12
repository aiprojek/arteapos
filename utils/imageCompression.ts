
/**
 * Mengompres gambar untuk optimasi database IndexedDB dan Cloud Storage.
 * - Resize ke max dimensi 500px (menjaga aspect ratio).
 * - Konversi ke JPEG dengan kualitas 0.7 (70%).
 * 
 * @param source - File object, Blob, atau Base64 string
 * @returns Promise<string> - Base64 string dari gambar yang dikompres
 */
export const compressImage = (source: File | Blob | string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        // Handle source type
        if (typeof source === 'string') {
            img.src = source;
        } else {
            img.src = URL.createObjectURL(source);
        }

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error('Gagal membuat context canvas untuk kompresi.'));
                return;
            }

            // Target dimensions
            const MAX_WIDTH = 500;
            const MAX_HEIGHT = 500;
            let width = img.width;
            let height = img.height;

            // Calculate aspect ratio
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            // Resize
            canvas.width = width;
            canvas.height = height;
            
            // Draw to canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Export compressed base64
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
            
            // Cleanup memory if created via URL.createObjectURL
            if (typeof source !== 'string') {
                URL.revokeObjectURL(img.src);
            }

            resolve(compressedDataUrl);
        };

        img.onerror = (err) => {
            reject(new Error('Gagal memuat gambar untuk dikompres.'));
        };
    });
};

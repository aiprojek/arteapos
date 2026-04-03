import { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

interface ToImageOptions {
    quality?: number;
    backgroundColor?: string | null;
    // Opsi lain yang mungkin relevan untuk html2canvas
    scale?: number;
}

export const useToImage = <T extends HTMLElement>(options?: ToImageOptions) => {
    const ref = useRef<T>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const getImage = useCallback(async () => {
        if (ref.current === null) {
            return null;
        }
        
        setIsLoading(true);
        setError(null);

        try {
            const canvas = await html2canvas(ref.current, {
                backgroundColor: options?.backgroundColor,
                scale: options?.scale || 2,
                useCORS: true,
            });
            return canvas.toDataURL('image/png', options?.quality || 0.95);
        } catch (err) {
            if (err instanceof Error) {
                setError(err);
            } else {
                setError(new Error('Terjadi kesalahan yang tidak diketahui saat pembuatan gambar.'));
            }
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [options]);

    return [ref, { isLoading, error, getImage }] as const;
};

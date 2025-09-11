import { useRef, useState, useCallback } from 'react';

// Informasikan TypeScript tentang pustaka global `html2canvas`
// FIX: Corrected the type definition for html2canvas options to resolve an error.
// The previous type `Partial<HTMLCanvasElement>` was incorrect as it lacks
// properties like `backgroundColor`. A specific interface is now used.
interface Html2CanvasOptions {
    backgroundColor?: string | null;
    scale?: number;
    useCORS?: boolean;
}

declare global {
    interface Window {
        html2canvas: <T extends HTMLElement>(element: T, options?: Html2CanvasOptions) => Promise<HTMLCanvasElement>;
    }
}

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
        
        if (typeof window.html2canvas === 'undefined') {
            const err = new Error('Pustaka html2canvas tidak dimuat.');
            setError(err);
            console.error(err.message);
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            // html2canvas mengembalikan elemen canvas, bukan data URL secara langsung
            const canvas = await window.html2canvas(ref.current, {
                backgroundColor: options?.backgroundColor,
                scale: options?.scale || 2, // Meningkatkan resolusi untuk kualitas yang lebih baik
                useCORS: true,
            });
            // Kemudian kita konversi canvas ke data URL
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
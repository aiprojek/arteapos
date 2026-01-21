
import { createWorker } from 'tesseract.js';

interface OCRResult {
    date?: string;
    amount?: number;
    text: string;
}

export const ocrService = {
    scanReceipt: async (image: string): Promise<OCRResult> => {
        try {
            const worker = await createWorker('eng'); // English is better for numbers generally, can add 'ind'
            const { data: { text } } = await worker.recognize(image);
            await worker.terminate();

            // --- Intelligent Extraction Logic ---
            
            // 1. Extract Amount (Look for largest number, possibly with Rp prefix)
            // Cleanup text: remove common OCR noise like 'Rp', '.', ',' mixed confusion
            const cleanText = text.replace(/[^0-9.,\n]/g, ' '); 
            const potentialAmounts = cleanText.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g);
            
            let maxAmount = 0;
            if (potentialAmounts) {
                potentialAmounts.forEach(val => {
                    // Normalize: Remove dots as thousand separators, replace comma with dot for decimal
                    // Case Indonesia: 10.000,00 -> 10000.00
                    let normalized = val;
                    if (val.includes('.') && val.includes(',')) {
                        normalized = val.replace(/\./g, '').replace(',', '.');
                    } else if (val.includes('.')) {
                        // Ambiguous: 10.000 (ten thousand) vs 10.00 (ten)
                        // Heuristic: If it has 3 decimal places, it's thousand separator
                        const parts = val.split('.');
                        if (parts[parts.length-1].length === 3) {
                            normalized = val.replace(/\./g, '');
                        }
                    }
                    
                    const num = parseFloat(normalized);
                    if (!isNaN(num) && num > maxAmount) {
                        maxAmount = num;
                    }
                });
            }

            // 2. Extract Date (DD/MM/YYYY or YYYY-MM-DD)
            const dateRegex = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/;
            const dateMatch = text.match(dateRegex);
            let extractedDate = '';
            
            if (dateMatch) {
                // Try to construct YYYY-MM-DD for input field
                let day = dateMatch[1];
                let month = dateMatch[2];
                let year = dateMatch[3];
                
                if (year.length === 2) year = `20${year}`;
                if (day.length === 1) day = `0${day}`;
                if (month.length === 1) month = `0${month}`;
                
                // Basic validation
                if (parseInt(month) <= 12 && parseInt(day) <= 31) {
                    extractedDate = `${year}-${month}-${day}`;
                }
            }

            return {
                amount: maxAmount > 0 ? maxAmount : undefined,
                date: extractedDate || undefined,
                text: text // Return full text just in case needed
            };

        } catch (error) {
            console.error("OCR Failed:", error);
            throw new Error("Gagal membaca gambar. Pastikan gambar jelas.");
        }
    }
};

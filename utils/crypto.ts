
import CryptoJS from 'crypto-js';

const SECRET_KEY = "ARTEA_POS_SECRET_KEY_v1"; // Kunci statis untuk aplikasi ini
const PREFIX = "ARTEA_ENC::";

export const encryptReport = (data: any): string => {
    try {
        const jsonString = JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
        return `${PREFIX}${encrypted}`;
    } catch (error) {
        console.error("Encryption failed:", error);
        return "";
    }
};

export const decryptReport = (ciphertext: string): any | null => {
    try {
        if (!ciphertext.startsWith(PREFIX)) return null;
        
        const actualCipher = ciphertext.replace(PREFIX, "");
        const bytes = CryptoJS.AES.decrypt(actualCipher, SECRET_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!originalText) return null;
        
        return JSON.parse(originalText);
    } catch (error) {
        console.error("Decryption failed:", error);
        return null;
    }
};

export const isEncryptedReport = (text: string): boolean => {
    return text.startsWith(PREFIX);
};

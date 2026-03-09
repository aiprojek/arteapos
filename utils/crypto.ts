
import CryptoJS from 'crypto-js';

const LEGACY_SECRET_KEY = "ARTEA_POS_SECRET_KEY_v1";
const LEGACY_PAIRING_KEY_BASE = "ARTEA_PAIRING_SECURE_X99";
const LEGACY_STORAGE_KEY = "ARTEA_STORAGE_SECURE_K88";

const getEnvKey = (key: string, fallback: string): string => {
    const env = (import.meta as any)?.env;
    const value = env?.[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
};

const SECRET_KEY = getEnvKey('VITE_ARTEA_REPORT_KEY', LEGACY_SECRET_KEY);
const PAIRING_KEY_BASE = getEnvKey('VITE_ARTEA_PAIRING_KEY', LEGACY_PAIRING_KEY_BASE);
const STORAGE_KEY = getEnvKey('VITE_ARTEA_STORAGE_KEY', LEGACY_STORAGE_KEY);

const PREFIX = "ARTEA_ENC::";
const PAIRING_PREFIX = "ARTEA_PAIR_SECURE::";
const STORAGE_PREFIX = "SEC::";

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

// --- Credential Pairing Encryption (UPDATED with Dynamic Passphrase) ---

export const encryptCredentials = (payload: { k: string, s: string, t: string }, passphrase: string = ''): string => {
    try {
        const jsonString = JSON.stringify(payload);
        // Combine Base Key + Dynamic Passphrase for stronger security
        const dynamicKey = PAIRING_KEY_BASE + passphrase;
        const encrypted = CryptoJS.AES.encrypt(jsonString, dynamicKey).toString();
        return `${PAIRING_PREFIX}${encrypted}`;
    } catch (error) {
        console.error("Credential encryption failed:", error);
        return "";
    }
};

export const decryptCredentials = (ciphertext: string, passphrase: string = ''): { k: string, s: string, t: string } | null => {
    try {
        // Support Legacy (QR Lama tanpa PIN - fallback)
        if (ciphertext.startsWith("ARTEA_PAIR::")) {
             const base64 = ciphertext.replace('ARTEA_PAIR::', '');
             const json = atob(base64);
             return JSON.parse(json);
        }

        if (!ciphertext.startsWith(PAIRING_PREFIX)) return null;
        
        const actualCipher = ciphertext.replace(PAIRING_PREFIX, "");
        const dynamicKey = PAIRING_KEY_BASE + passphrase;
        
        const bytes = CryptoJS.AES.decrypt(actualCipher, dynamicKey);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!originalText) return null;
        
        return JSON.parse(originalText);
    } catch (error) {
        console.error("Credential decryption failed:", error);
        return null;
    }
};

// --- Local Storage Encryption ---

export const encryptStorage = (value: string): string => {
    if (!value) return '';
    try {
        const encrypted = CryptoJS.AES.encrypt(value, STORAGE_KEY).toString();
        return `${STORAGE_PREFIX}${encrypted}`;
    } catch (e) {
        console.error("Storage Encrypt Error", e);
        return value;
    }
};

export const decryptStorage = (value: string | null): string => {
    if (!value) return '';
    
    if (!value.startsWith(STORAGE_PREFIX)) {
        return value;
    }

    try {
        const actualCipher = value.replace(STORAGE_PREFIX, "");
        const bytes = CryptoJS.AES.decrypt(actualCipher, STORAGE_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || '';
    } catch (e) {
        console.warn("Storage Decrypt Error (Returning original):", e);
        return value;
    }
};

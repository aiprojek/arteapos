import { encryptStorage, decryptStorage } from './crypto';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LOCAL_RECOVERY_HASH_KEY = 'ARTEA_RECOVERY_CODE_HASH';
const LOCAL_RECOVERY_META_KEY = 'ARTEA_RECOVERY_CODE_META';

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

export const normalizeRecoveryCode = (code: string): string => {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const generateRecoveryCode = (): string => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let raw = '';
  for (let i = 0; i < bytes.length; i++) {
    raw += CHARSET[bytes[i] % CHARSET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
};

export const hashRecoveryCode = async (code: string): Promise<string> => {
  const normalized = normalizeRecoveryCode(code);
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const saveLocalRecoveryCode = (hash: string, generatedAt: string) => {
  if (!hash) return;
  safeStorage.setItem(LOCAL_RECOVERY_HASH_KEY, encryptStorage(hash));
  safeStorage.setItem(LOCAL_RECOVERY_META_KEY, encryptStorage(JSON.stringify({ generatedAt })));
};

export const loadLocalRecoveryCode = (): { hash: string; generatedAt?: string } | null => {
  const rawHash = decryptStorage(safeStorage.getItem(LOCAL_RECOVERY_HASH_KEY));
  if (!rawHash) return null;
  const metaRaw = decryptStorage(safeStorage.getItem(LOCAL_RECOVERY_META_KEY));
  try {
    const meta = metaRaw ? JSON.parse(metaRaw) : {};
    return { hash: rawHash, generatedAt: meta?.generatedAt };
  } catch {
    return { hash: rawHash };
  }
};

export const clearLocalRecoveryCode = () => {
  safeStorage.removeItem(LOCAL_RECOVERY_HASH_KEY);
  safeStorage.removeItem(LOCAL_RECOVERY_META_KEY);
};

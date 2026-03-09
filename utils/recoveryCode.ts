const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

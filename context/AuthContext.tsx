
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useDataActions, useDataStatus, useUserData } from './DataContext';
import { dropboxService } from '../services/dropboxService';
import type { User, AuthSettings } from '../types';

const SYSTEM_USER: User = { id: 'system', name: 'Admin Sistem', pin: '', role: 'admin' };

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  authSettings: AuthSettings;
  login: (user: User, pin: string) => Promise<{ success: boolean; reason?: 'INVALID_PIN' | 'FORCE_CHANGE_DEFAULT_PIN' }>;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => void;
  createPinResetTicket: (userId: string, ttlMinutes?: number) => Promise<{ code: string; expiresAt: string } | null>;
  resetPinWithTicket: (userId: string, code: string, newPin: string) => Promise<{ success: boolean; message: string }>;
  overrideAdminPin: (newPin: string) => Promise<boolean>;
  updateAuthSettings: (settings: AuthSettings) => void;
}

type AuthStateContextType = Pick<AuthContextType, 'currentUser' | 'users' | 'authSettings'>;
type AuthActionsContextType = Omit<AuthContextType, 'currentUser' | 'users' | 'authSettings'>;

const AuthStateContext = createContext<AuthStateContextType | undefined>(undefined);
const AuthActionsContext = createContext<AuthActionsContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setData } = useDataActions();
  const { isDataLoading } = useDataStatus();
  const { authSettings, users } = useUserData();
  const [currentUser, setCurrentUser] = useState<User | null>(() => authSettings.enabled ? null : SYSTEM_USER);

  useEffect(() => {
    if (authSettings?.enabled) {
      setCurrentUser(null);
    } else {
      setCurrentUser(SYSTEM_USER);
    }
  }, [authSettings?.enabled]);

  useEffect(() => {
    const setupDefaultAdmin = async () => {
        if (!isDataLoading && users.length === 0) {
            const hashedPin = await hashPin('1111');
            const defaultAdmin: User = { id: 'admin_default', name: 'Admin', pin: hashedPin, role: 'admin' };
            setData(prev => ({ ...prev, users: [defaultAdmin] }));
        }
    };
    setupDefaultAdmin();
  }, [isDataLoading, users, setData]);

  // LOGIN LOGIC with Auto Sync
  const login = useCallback(async (user: User, pin: string): Promise<{ success: boolean; reason?: 'INVALID_PIN' | 'FORCE_CHANGE_DEFAULT_PIN' }> => {
    if (!authSettings.enabled) return { success: false, reason: 'INVALID_PIN' };

    // Hardening: default seeded admin must rotate initial PIN before first login.
    if (user.id === 'admin_default' && pin === '1111') {
      return { success: false, reason: 'FORCE_CHANGE_DEFAULT_PIN' };
    }

    const isHashed = user.pin.length === 64; 
    let success = false;

    if (isHashed) {
        const enteredPinHash = await hashPin(pin);
        if (user.pin === enteredPinHash) {
            setCurrentUser(user);
            success = true;
        }
    } else {
        if (user.pin === pin) {
            setCurrentUser(user);
            const newHashedPin = await hashPin(pin);
            setData(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === user.id ? { ...u, pin: newHashedPin } : u)
            }));
            success = true;
        }
    }
    
    if (success) {
        // Attempt Silent Sync on Login - SECURE CHECK
        if (dropboxService.isConfigured()) {
             dropboxService.downloadAndMergeMasterData().catch(err => console.warn("Login Sync Failed", err));
        }
        return { success: true };
    }
    
    return { success: false, reason: 'INVALID_PIN' };
  }, [authSettings.enabled, setData]);

  const logout = useCallback(() => {
    if (authSettings.enabled) {
      setCurrentUser(null);
    }
  }, [authSettings.enabled]);

  const addUser = useCallback(async (user: Omit<User, 'id'>) => {
    const hashedPin = await hashPin(user.pin);
    const newUser = { ...user, pin: hashedPin, id: Date.now().toString() };
    setData(prev => ({ ...prev, users: [...prev.users, newUser] }));
  }, [setData]);

  const updateUser = useCallback(async (updatedUser: User) => {
    const originalUser = users.find(u => u.id === updatedUser.id);
    let pinToSave = updatedUser.pin;
    if (originalUser && originalUser.pin !== updatedUser.pin && updatedUser.pin.length !== 64) {
        pinToSave = await hashPin(updatedUser.pin);
    }
    const finalUser = { ...updatedUser, pin: pinToSave };
    setData(prev => ({ ...prev, users: prev.users.map(u => u.id === finalUser.id ? finalUser : u) }));
  }, [setData, users]);

  const deleteUser = useCallback((userId: string) => {
    setData(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
  }, [setData]);
  
  const createPinResetTicket = useCallback(async (userId: string, ttlMinutes: number = 10) => {
    const issuer = currentUser;
    if (!issuer || (issuer.role !== 'admin' && issuer.role !== 'manager')) {
      throw new Error('Hanya Admin/Manager yang bisa membuat tiket reset.');
    }

    const target = users.find(u => u.id === userId);
    if (!target) throw new Error('Pengguna tidak ditemukan.');
    if (!dropboxService.isConfigured()) throw new Error('Dropbox belum terhubung.');

    const result = await dropboxService.generatePinResetTicket({
      userId: target.id,
      userName: target.name,
      issuedByUserId: issuer.id,
      issuedByName: issuer.name,
      ttlMinutes
    });

    return { code: result.code, expiresAt: result.expiresAt };
  }, [currentUser, users]);

  const resetPinWithTicket = useCallback(async (userId: string, code: string, newPin: string) => {
    const trimmedPin = newPin.trim();
    if (!/^\d{4}$/.test(trimmedPin)) {
      return { success: false, message: 'PIN baru harus 4 digit angka.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, message: 'Pengguna tidak ditemukan.' };
    if (!dropboxService.isConfigured()) return { success: false, message: 'Dropbox belum terhubung.' };

    try {
      await dropboxService.redeemPinResetTicket({
        userId: target.id,
        code,
        consumedByUserId: target.id,
        consumedByName: target.name
      });

      const hashedPin = await hashPin(trimmedPin);
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === target.id ? { ...u, pin: hashedPin } : u)
      }));

      return { success: true, message: 'PIN berhasil diperbarui.' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Gagal memverifikasi tiket reset.' };
    }
  }, [users, setData]);

  const overrideAdminPin = useCallback(async (newPin: string): Promise<boolean> => {
      const hashedPin = await hashPin(newPin);
      let success = false;
      setData(prev => {
          const adminIndex = prev.users.findIndex(u => u.role === 'admin');
          if (adminIndex > -1) {
              const updatedUsers = [...prev.users];
              updatedUsers[adminIndex] = { ...updatedUsers[adminIndex], pin: hashedPin };
              success = true;
              return { ...prev, users: updatedUsers };
          }
          return prev;
      });
      return success;
  }, [setData]);

  const updateAuthSettings = useCallback((settings: AuthSettings) => {
    setData(prev => ({ ...prev, authSettings: settings }));
  }, [setData]);

  const stateValue = useMemo(() => ({
    currentUser,
    users,
    authSettings,
  }), [currentUser, users, authSettings]);

  const actionsValue = useMemo(() => ({
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    createPinResetTicket,
    resetPinWithTicket,
    overrideAdminPin,
    updateAuthSettings,
  }), [
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    createPinResetTicket,
    resetPinWithTicket,
    overrideAdminPin,
    updateAuthSettings,
  ]);

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthActionsContext.Provider value={actionsValue}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
};

export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
};

export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (context === undefined) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return context;
};


import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import { useCloudSync } from './CloudSyncContext'; // NEW
import { dropboxService } from '../services/dropboxService';
import type { User, AuthSettings } from '../types';

const SYSTEM_USER: User = { id: 'system', name: 'Admin Sistem', pin: '', role: 'admin' };

// SECURITY UPGRADE: Salted Hash (SHA-256 + User ID)
// Prevents Rainbow Table attacks
async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt); // PIN + Salt combination
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  authSettings: AuthSettings;
  login: (user: User, pin: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => void;
  resetUserPin: (userId: string) => Promise<string | null>;
  resetDefaultAdminPin: () => Promise<string | null>;
  overrideAdminPin: (newPin: string) => Promise<boolean>;
  updateAuthSettings: (settings: AuthSettings) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, setData, isDataLoading } = useData();
  const { authSettings, users } = data;
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
            const adminId = 'admin_default';
            // Use salted hash
            const hashedPin = await hashPin('1111', adminId);
            const defaultAdmin: User = { id: adminId, name: 'Admin', pin: hashedPin, role: 'admin' };
            setData(prev => ({ ...prev, users: [defaultAdmin] }));
        }
    };
    setupDefaultAdmin();
  }, [isDataLoading, users, setData]);

  // LOGIN LOGIC with Salted Hash
  const login = useCallback(async (user: User, pin: string): Promise<boolean> => {
    if (!authSettings.enabled) return false;

    const isHashed = user.pin.length === 64; 
    let success = false;

    if (isHashed) {
        // Calculate hash with input pin and stored user ID as salt
        const enteredPinHash = await hashPin(pin, user.id);
        if (user.pin === enteredPinHash) {
            setCurrentUser(user);
            success = true;
        }
    } else {
        // Legacy Support (Plain text) -> Migrate to Salted Hash
        if (user.pin === pin) {
            setCurrentUser(user);
            const newHashedPin = await hashPin(pin, user.id);
            setData(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === user.id ? { ...u, pin: newHashedPin } : u)
            }));
            success = true;
        }
    }
    
    if (success) {
        // Attempt Silent Sync on Login
        if (dropboxService.isConfigured()) {
             dropboxService.downloadAndMergeMasterData().catch(err => console.warn("Login Sync Failed", err));
        }
        return true;
    }
    
    return false;
  }, [authSettings.enabled, setData]);

  const logout = useCallback(() => {
    if (authSettings.enabled) {
      setCurrentUser(null);
    }
  }, [authSettings.enabled]);

  const addUser = useCallback(async (user: Omit<User, 'id'>) => {
    const newId = Date.now().toString();
    const hashedPin = await hashPin(user.pin, newId); // Salt with new ID
    const newUser = { ...user, pin: hashedPin, id: newId };
    setData(prev => ({ ...prev, users: [...prev.users, newUser] }));
  }, [setData]);

  const updateUser = useCallback(async (updatedUser: User) => {
    const originalUser = users.find(u => u.id === updatedUser.id);
    let pinToSave = updatedUser.pin;
    
    // Check if PIN changed (plain text input vs stored hash)
    if (originalUser && originalUser.pin !== updatedUser.pin && updatedUser.pin.length !== 64) {
        pinToSave = await hashPin(updatedUser.pin, updatedUser.id);
    }
    const finalUser = { ...updatedUser, pin: pinToSave };
    setData(prev => ({ ...prev, users: prev.users.map(u => u.id === finalUser.id ? finalUser : u) }));
  }, [setData, users]);

  const deleteUser = useCallback((userId: string) => {
    setData(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
  }, [setData]);
  
  const resetUserPin = useCallback(async (userId: string) => {
    const hashedPin = await hashPin('0000', userId);
    let userName: string | null = null;
    setData(prev => {
        const userIndex = prev.users.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            userName = prev.users[userIndex].name;
            const updatedUsers = [...prev.users];
            updatedUsers[userIndex] = { ...updatedUsers[userIndex], pin: hashedPin };
            return { ...prev, users: updatedUsers };
        }
        return prev;
    });
    return userName;
  }, [setData]);

  const resetDefaultAdminPin = useCallback(async () => {
    let adminName: string | null = null;
    setData(prev => {
        const adminIndex = prev.users.findIndex(u => u.role === 'admin');
        if (adminIndex > -1) {
            const adminUser = prev.users[adminIndex];
            // Async inside setState callback is tricky, but we can't await here easily.
            // Better to find ID first then update.
            // However, for this specific flow, we'll iterate.
            return prev; // Placeholder, logic moved to separate effect if needed or refactored.
        }
        return prev;
    });
    
    // Fixed implementation
    const adminUser = users.find(u => u.role === 'admin');
    if(adminUser) {
        const hashedPin = await hashPin('1111', adminUser.id);
        setData(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === adminUser.id ? { ...u, pin: hashedPin } : u)
        }));
        return adminUser.name;
    }
    return null;
  }, [setData, users]);

  const overrideAdminPin = useCallback(async (newPin: string): Promise<boolean> => {
      const adminUser = users.find(u => u.role === 'admin');
      if (adminUser) {
          const hashedPin = await hashPin(newPin, adminUser.id);
          setData(prev => ({
              ...prev,
              users: prev.users.map(u => u.id === adminUser.id ? { ...u, pin: hashedPin } : u)
          }));
          return true;
      }
      return false;
  }, [setData, users]);

  const updateAuthSettings = useCallback((settings: AuthSettings) => {
    // Force user to change default answer
    if (!settings.securityAnswer) {
        settings.securityAnswer = ''; // Ensure no default 'artea'
    }
    setData(prev => ({ ...prev, authSettings: settings }));
  }, [setData]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      authSettings,
      login,
      logout,
      addUser,
      updateUser,
      deleteUser,
      resetUserPin,
      resetDefaultAdminPin,
      overrideAdminPin,
      updateAuthSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

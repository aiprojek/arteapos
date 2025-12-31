
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import { supabaseService } from '../services/supabaseService';
import { dropboxService } from '../services/dropboxService';
import type { User, AuthSettings } from '../types';

const SYSTEM_USER: User = { id: 'system', name: 'Admin Sistem', pin: '', role: 'admin' };

// Helper function to hash PINs using SHA-256
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // convert bytes to hex string
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
  overrideAdminPin: (newPin: string) => Promise<boolean>; // NEW FUNCTION
  updateAuthSettings: (settings: AuthSettings) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, setData, isDataLoading, setSyncStatus } = useData();
  const { authSettings, users } = data;
  const { showAlert } = useUI();
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

  // AUTO SYNC LOGIC
  const performAutoSync = async () => {
      const sbUrl = localStorage.getItem('ARTEA_SB_URL');
      const sbKey = localStorage.getItem('ARTEA_SB_KEY');
      const dbxToken = localStorage.getItem('ARTEA_DBX_REFRESH_TOKEN');

      // Only sync if cloud is configured
      if (!sbUrl && !dbxToken) return;

      setSyncStatus('syncing');
      try {
          // Priority 1: Supabase
          if (sbUrl && sbKey) {
              supabaseService.init(sbUrl, sbKey);
              await supabaseService.pullMasterData();
          } 
          // Priority 2: Dropbox (fallback or alternative)
          else if (dbxToken) {
              await dropboxService.downloadAndMergeMasterData();
          }
          
          setSyncStatus('success');
          // Optional: Show non-intrusive notification via console or toast if UI supports it
          console.log("Auto-sync from cloud successful");
          
          setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (error) {
          console.error("Auto-sync failed:", error);
          setSyncStatus('error');
      }
  };

  const login = useCallback(async (user: User, pin: string): Promise<boolean> => {
    if (!authSettings.enabled) return false;

    // Check if stored pin is already hashed (SHA-256 hash is 64 hex characters)
    const isHashed = user.pin.length === 64; 

    let success = false;

    if (isHashed) {
        const enteredPinHash = await hashPin(pin);
        if (user.pin === enteredPinHash) {
            setCurrentUser(user);
            success = true;
        }
    } else { // Plaintext pin, migrate on successful login
        if (user.pin === pin) {
            setCurrentUser(user);
            // Migrate to hashed pin in the background
            const newHashedPin = await hashPin(pin);
            setData(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === user.id ? { ...u, pin: newHashedPin } : u)
            }));
            success = true;
        }
    }
    
    if (success) {
        // TRIGGER AUTO SYNC ON LOGIN
        // We don't await this so login is instant. Sync happens in background.
        performAutoSync(); 
        return true;
    }
    
    return false;
  }, [authSettings.enabled, setData, setSyncStatus]);

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
    // If pin has changed and it's not already a hash, then hash it.
    if (originalUser && originalUser.pin !== updatedUser.pin && updatedUser.pin.length !== 64) {
        pinToSave = await hashPin(updatedUser.pin);
    }
    
    const finalUser = { ...updatedUser, pin: pinToSave };
    setData(prev => ({ ...prev, users: prev.users.map(u => u.id === finalUser.id ? finalUser : u) }));
  }, [setData, users]);

  const deleteUser = useCallback((userId: string) => {
    setData(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
  }, [setData]);
  
  const resetUserPin = useCallback(async (userId: string) => {
    const hashedPin = await hashPin('0000');
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
    const hashedPin = await hashPin('1111');
    let adminName: string | null = null;
    setData(prev => {
        const adminIndex = prev.users.findIndex(u => u.role === 'admin');
        if (adminIndex > -1) {
            adminName = prev.users[adminIndex].name;
            const updatedUsers = [...prev.users];
            updatedUsers[adminIndex] = { ...updatedUsers[adminIndex], pin: hashedPin };
            return { ...prev, users: updatedUsers };
        }
        return prev;
    });
    return adminName;
  }, [setData]);

  // NEW: Override Admin PIN directly (used after Security Challenge)
  const overrideAdminPin = useCallback(async (newPin: string): Promise<boolean> => {
      const hashedPin = await hashPin(newPin);
      let success = false;
      
      setData(prev => {
          // Find first admin
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

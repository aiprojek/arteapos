import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useData } from './DataContext';
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
  updateAuthSettings: (settings: AuthSettings) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// FIX: Change to React.FC to fix children prop type error
export const AuthProvider: React.FC = ({ children }) => {
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
            const hashedPin = await hashPin('1111');
            const defaultAdmin: User = { id: 'admin_default', name: 'Admin', pin: hashedPin, role: 'admin' };
            setData(prev => ({ ...prev, users: [defaultAdmin] }));
        }
    };
    setupDefaultAdmin();
  }, [isDataLoading, users, setData]);

  const login = useCallback(async (user: User, pin: string): Promise<boolean> => {
    if (!authSettings.enabled) return false;

    // Check if stored pin is already hashed (SHA-256 hash is 64 hex characters)
    const isHashed = user.pin.length === 64; 

    if (isHashed) {
        const enteredPinHash = await hashPin(pin);
        if (user.pin === enteredPinHash) {
            setCurrentUser(user);
            return true;
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
            return true;
        }
    }
    
    return false;
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
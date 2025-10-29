import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useData } from './DataContext';
import type { User, AuthSettings } from '../types';

const SYSTEM_USER: User = { id: 'system', name: 'Admin Sistem', pin: '', role: 'admin' };

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  authSettings: AuthSettings;
  login: (user: User, pin: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  resetUserPin: (userId: string) => string | null;
  resetDefaultAdminPin: () => string | null;
  updateAuthSettings: (settings: AuthSettings) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data, setData } = useData();
  const { authSettings, users } = data;
  const [currentUser, setCurrentUser] = useState<User | null>(() => authSettings.enabled ? null : SYSTEM_USER);

  useEffect(() => {
    if (authSettings?.enabled) {
      setCurrentUser(null);
    } else {
      setCurrentUser(SYSTEM_USER);
    }
  }, [authSettings?.enabled]);

  useState(() => {
    if (!data.users || data.users.length === 0) {
      const defaultAdmin: User = { id: 'admin_default', name: 'Admin', pin: '1111', role: 'admin' };
      setData(prev => ({ ...prev, users: [defaultAdmin] }));
    }
  });

  const login = useCallback((user: User, pin: string): boolean => {
    if (!authSettings.enabled) return false;
    if (user && user.pin === pin) {
      setCurrentUser(user);
      return true;
    }
    return false;
  }, [authSettings.enabled]);

  const logout = useCallback(() => {
    if (authSettings.enabled) {
      setCurrentUser(null);
    }
  }, [authSettings.enabled]);

  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const newUser = { ...user, id: Date.now().toString() };
    setData(prev => ({ ...prev, users: [...prev.users, newUser] }));
  }, [setData]);

  const updateUser = useCallback((updatedUser: User) => {
    setData(prev => ({ ...prev, users: prev.users.map(u => u.id === updatedUser.id ? updatedUser : u) }));
  }, [setData]);

  const deleteUser = useCallback((userId: string) => {
    setData(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
  }, [setData]);
  
  const resetUserPin = useCallback((userId: string) => {
    let userName: string | null = null;
    setData(prev => {
        const userIndex = prev.users.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            userName = prev.users[userIndex].name;
            const updatedUsers = [...prev.users];
            updatedUsers[userIndex] = { ...updatedUsers[userIndex], pin: '0000' };
            return { ...prev, users: updatedUsers };
        }
        return prev;
    });
    return userName;
  }, [setData]);

  const resetDefaultAdminPin = useCallback(() => {
    let adminName: string | null = null;
    setData(prev => {
        const adminIndex = prev.users.findIndex(u => u.role === 'admin');
        if (adminIndex > -1) {
            adminName = prev.users[adminIndex].name;
            const updatedUsers = [...prev.users];
            updatedUsers[adminIndex] = { ...updatedUsers[adminIndex], pin: '1111' };
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

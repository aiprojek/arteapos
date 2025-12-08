import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { AlertType, AlertVariant } from '../components/AlertModal';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  type: AlertType;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: AlertVariant;
}

interface UIContextType {
  alertState: AlertState;
  showAlert: (config: Omit<AlertState, 'isOpen'>) => void;
  hideAlert: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: () => {},
  });

  const showAlert = useCallback((config: Omit<AlertState, 'isOpen'>) => {
    setAlertState({ ...config, isOpen: true });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <UIContext.Provider value={{ alertState, showAlert, hideAlert }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within an UIProvider');
  }
  return context;
};
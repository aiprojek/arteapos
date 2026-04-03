import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
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

type UIStateContextType = Pick<UIContextType, 'alertState'>;
type UIActionsContextType = Pick<UIContextType, 'showAlert' | 'hideAlert'>;

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);
const UIActionsContext = createContext<UIActionsContextType | undefined>(undefined);

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

  const stateValue = useMemo(() => ({ alertState }), [alertState]);
  const actionsValue = useMemo(() => ({ showAlert, hideAlert }), [showAlert, hideAlert]);
  return (
    <UIStateContext.Provider value={stateValue}>
      <UIActionsContext.Provider value={actionsValue}>
        {children}
      </UIActionsContext.Provider>
    </UIStateContext.Provider>
  );
};

export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within an UIProvider');
  }
  return context;
};

export const useUIActions = () => {
  const context = useContext(UIActionsContext);
  if (context === undefined) {
    throw new Error('useUIActions must be used within an UIProvider');
  }
  return context;
};

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useData } from './DataContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SessionState, SessionSettings } from '../types';

interface SessionContextType {
    session: SessionState | null;
    sessionSettings: SessionSettings;
    startSession: (startingCash: number) => void;
    endSession: () => void;
    updateSessionSettings: (settings: SessionSettings) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const { data, setData } = useData();
    const { sessionSettings } = data;
    const [session, setSession] = useLocalStorage<SessionState | null>('ai-projek-pos-session', null);

    const updateSessionSettings = useCallback((settings: SessionSettings) => {
        setData(prev => ({ ...prev, sessionSettings: settings }));
    }, [setData]);

    const startSession = useCallback((startingCash: number) => {
        setSession({ startingCash, startTime: new Date().toISOString() });
    }, [setSession]);

    const endSession = useCallback(() => {
        setSession(null);
    }, [setSession]);

    return (
        <SessionContext.Provider value={{
            session,
            sessionSettings: sessionSettings || { enabled: false, enableCartHolding: false }, // Fallback for safety
            startSession,
            endSession,
            updateSessionSettings
        }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};

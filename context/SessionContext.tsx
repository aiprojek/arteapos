import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { useData } from './DataContext';
import { db } from '../services/db';
import type { SessionState, SessionSettings } from '../types';

interface SessionContextType {
    session: SessionState | null;
    sessionSettings: SessionSettings;
    startSession: (startingCash: number) => void;
    endSession: () => void;
    updateSessionSettings: (settings: SessionSettings) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data, setData, isDataLoading } = useData();
    const { sessionSettings } = data;
    const [session, setSession] = useState<SessionState | null>(null);

    useEffect(() => {
        if (!isDataLoading) {
            db.session.get('activeSession').then(activeSession => {
                if (activeSession) {
                    setSession(activeSession.value);
                }
            });
        }
    }, [isDataLoading]);

    const updateSessionSettings = useCallback((settings: SessionSettings) => {
        setData(prev => ({ ...prev, sessionSettings: settings }));
    }, [setData]);

    const startSession = useCallback(async (startingCash: number) => {
        const newSession: SessionState = { startingCash, startTime: new Date().toISOString() };
        try {
            await db.session.put({ key: 'activeSession', value: newSession });
            setSession(newSession);
        } catch (error) {
            console.error("Failed to save session to DB", error);
        }
    }, [setSession]);

    const endSession = useCallback(async () => {
        try {
            await db.session.delete('activeSession');
            setSession(null);
        } catch (error) {
            console.error("Failed to delete session from DB", error);
        }
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

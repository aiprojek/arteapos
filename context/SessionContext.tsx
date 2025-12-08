
import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { db } from '../services/db';
import type { SessionState, SessionSettings, CashMovement } from '../types';

interface SessionContextType {
    session: SessionState | null;
    sessionSettings: SessionSettings;
    startSession: (startingCash: number) => void;
    endSession: () => void;
    updateSessionSettings: (settings: SessionSettings) => void;
    addCashMovement: (type: 'in' | 'out', amount: number, description: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data, setData, isDataLoading } = useData();
    const { currentUser } = useAuth();
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
        const newSession: SessionState = { 
            id: Date.now().toString(),
            startingCash, 
            startTime: new Date().toISOString(),
            userId: currentUser?.id || 'unknown',
            userName: currentUser?.name || 'Unknown',
            cashMovements: []
        };
        try {
            await db.session.put({ key: 'activeSession', value: newSession });
            setSession(newSession);
        } catch (error) {
            console.error("Failed to save session to DB", error);
        }
    }, [setSession, currentUser]);

    const endSession = useCallback(async () => {
        try {
            // Here you could choose to save the finished session to a 'shiftHistory' table if needed
            await db.session.delete('activeSession');
            setSession(null);
        } catch (error) {
            console.error("Failed to delete session from DB", error);
        }
    }, [setSession]);

    const addCashMovement = useCallback(async (type: 'in' | 'out', amount: number, description: string) => {
        if (!session) return;

        const newMovement: CashMovement = {
            id: Date.now().toString(),
            type,
            amount,
            description,
            timestamp: new Date().toISOString(),
            userId: currentUser?.id || 'unknown',
            userName: currentUser?.name || 'Unknown'
        };

        const updatedSession = { ...session, cashMovements: [...session.cashMovements, newMovement] };
        
        try {
            await db.session.put({ key: 'activeSession', value: updatedSession });
            setSession(updatedSession);
        } catch (error) {
            console.error("Failed to save cash movement", error);
        }
    }, [session, currentUser]);

    return (
        <SessionContext.Provider value={{
            session,
            sessionSettings: sessionSettings || { enabled: false, enableCartHolding: false }, // Fallback for safety
            startSession,
            endSession,
            updateSessionSettings,
            addCashMovement
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

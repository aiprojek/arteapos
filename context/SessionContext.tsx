
import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { useCloudSync } from './CloudSyncContext'; // NEW
import { db } from '../services/db';
import type { SessionState, SessionSettings, CashMovement, SessionHistory } from '../types';

interface SessionContextType {
    session: SessionState | null;
    sessionSettings: SessionSettings;
    startSession: (startingCash: number) => void;
    endSession: (data?: { actualCash: number, expectedCash: number, sales: number, cashIn: number, cashOut: number }) => void;
    updateSessionSettings: (settings: SessionSettings) => void;
    addCashMovement: (type: 'in' | 'out', amount: number, description: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data, setData, isDataLoading } = useData();
    const { triggerAutoSync } = useCloudSync(); // Use new hook
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

    const endSession = useCallback(async (finalData?: { actualCash: number, expectedCash: number, sales: number, cashIn: number, cashOut: number }) => {
        try {
            if (session && finalData) {
                const history: SessionHistory = {
                    ...session,
                    endTime: new Date().toISOString(),
                    actualCash: finalData.actualCash,
                    expectedCash: finalData.expectedCash,
                    totalSales: finalData.sales,
                    cashInTotal: finalData.cashIn,
                    cashOutTotal: finalData.cashOut,
                    variance: finalData.actualCash - finalData.expectedCash
                };
                
                setData(prev => ({
                    ...prev,
                    sessionHistory: [history, ...(prev.sessionHistory || [])]
                }));
            }

            await db.session.delete('activeSession');
            setSession(null);
            
            setTimeout(() => triggerAutoSync(), 1000);

        } catch (error) {
            console.error("Failed to delete session from DB", error);
        }
    }, [session, setData, triggerAutoSync]);

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
            sessionSettings: sessionSettings || { enabled: false, enableCartHolding: false },
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

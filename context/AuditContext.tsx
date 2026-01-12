
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuditLog, AuditAction, User } from '../types';
import { db } from '../services/db';

interface AuditContextType {
    auditLogs: AuditLog[];
    logAudit: (user: User | null, action: AuditAction, details: string, targetId?: string) => Promise<void>;
    isLoadingLogs: boolean;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);

    // Load initial logs
    useEffect(() => {
        const loadLogs = async () => {
            try {
                const logs = await db.auditLogs.orderBy('timestamp').reverse().limit(200).toArray();
                setAuditLogs(logs);
            } catch (error) {
                console.error("Failed to load audit logs", error);
            } finally {
                setIsLoadingLogs(false);
            }
        };
        loadLogs();
    }, []);

    const logAudit = useCallback(async (user: User | null, action: AuditAction, details: string, targetId?: string) => {
        const newLog: AuditLog = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            userId: user?.id || 'system',
            userName: user?.name || 'System/Guest',
            action,
            details,
            targetId
        };

        try {
            await db.auditLogs.add(newLog);
            setAuditLogs(prev => [newLog, ...prev]);
        } catch (error) {
            console.error("Failed to save audit log", error);
        }
    }, []);

    return (
        <AuditContext.Provider value={{ auditLogs, logAudit, isLoadingLogs }}>
            {children}
        </AuditContext.Provider>
    );
};

export const useAudit = () => {
    const context = useContext(AuditContext);
    if (context === undefined) {
        throw new Error('useAudit must be used within an AuditProvider');
    }
    return context;
};

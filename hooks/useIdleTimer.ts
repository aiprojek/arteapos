
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// Default timeout: 10 minutes
const DEFAULT_TIMEOUT = 10 * 60 * 1000; 

export const useIdleTimer = (timeout: number = DEFAULT_TIMEOUT) => {
    const { logout, authSettings, currentUser } = useAuth();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!authSettings.enabled || !currentUser) return;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                console.log("Idle timeout reached. Logging out...");
                logout();
            }, timeout);
        };

        // Events to listen for activity
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        
        const handleActivity = () => resetTimer();

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Initialize timer
        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [logout, authSettings.enabled, currentUser, timeout]);
};

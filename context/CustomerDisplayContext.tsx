
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { CustomerDisplayPayload } from '../types';
import Peer from 'peerjs';

interface CustomerDisplayContextType {
    isDisplayConnected: boolean;
    connectToDisplay: (displayId: string) => Promise<void>;
    disconnectDisplay: () => void;
    sendDataToDisplay: (data: CustomerDisplayPayload) => void;
    // Receiver (Display Side)
    myPeerId: string;
    setupReceiver: () => void;
    receivedData: CustomerDisplayPayload | null;
}

const CustomerDisplayContext = createContext<CustomerDisplayContextType | undefined>(undefined);

export const CustomerDisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- SENDER STATE (CASHIER) ---
    const [isDisplayConnected, setIsDisplayConnected] = useState(false);
    const cashierPeerRef = useRef<Peer | null>(null);
    const connectionRef = useRef<any>(null); // DataConnection

    // --- RECEIVER STATE (DISPLAY) ---
    const [myPeerId, setMyPeerId] = useState<string>('');
    const receiverPeerRef = useRef<Peer | null>(null);
    const [receivedData, setReceivedData] = useState<CustomerDisplayPayload | null>(null);

    // --- CASHIER LOGIC (SENDER) ---
    const connectToDisplay = useCallback(async (displayId: string) => {
        if (cashierPeerRef.current) {
            cashierPeerRef.current.destroy();
        }

        const peer = new Peer();
        cashierPeerRef.current = peer;

        return new Promise<void>((resolve, reject) => {
            peer.on('open', (id) => {
                console.log('Cashier Peer ID:', id);
                const conn = peer.connect(displayId);
                
                conn.on('open', () => {
                    console.log('Connected to Display:', displayId);
                    connectionRef.current = conn;
                    setIsDisplayConnected(true);
                    resolve();
                });

                conn.on('close', () => {
                    setIsDisplayConnected(false);
                    connectionRef.current = null;
                });

                conn.on('error', (err) => {
                    console.error('Connection Error:', err);
                    reject(err);
                });
            });

            peer.on('error', (err) => {
                console.error('Peer Error:', err);
                reject(err);
            });
        });
    }, []);

    const disconnectDisplay = useCallback(() => {
        if (connectionRef.current) {
            connectionRef.current.close();
        }
        if (cashierPeerRef.current) {
            cashierPeerRef.current.destroy();
        }
        setIsDisplayConnected(false);
        connectionRef.current = null;
    }, []);

    const sendDataToDisplay = useCallback((data: CustomerDisplayPayload) => {
        if (connectionRef.current && isDisplayConnected) {
            connectionRef.current.send(data);
        }
    }, [isDisplayConnected]);

    // --- DISPLAY LOGIC (RECEIVER) ---
    const setupReceiver = useCallback(() => {
        if (receiverPeerRef.current) return; // Already setup

        // Generate Random Short ID for easier typing if needed
        // But PeerJS default ID is UUID. Let's use custom ID if possible or just use generated.
        // For simplicity and avoiding collisions, we'll let PeerJS generate, but maybe prefix it?
        // Prefixing not supported well without own server. Let's rely on generated ID.
        
        const peer = new Peer(); 
        receiverPeerRef.current = peer;

        peer.on('open', (id) => {
            setMyPeerId(id);
        });

        peer.on('connection', (conn) => {
            console.log('Incoming connection from cashier...');
            
            conn.on('data', (data: any) => {
                setReceivedData(data);
            });

            conn.on('close', () => {
                // Reset to welcome screen if disconnected
                setReceivedData(prev => prev ? { ...prev, type: 'WELCOME' } : null);
            });
        });

        peer.on('error', (err) => {
            console.error('Receiver Peer Error:', err);
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (cashierPeerRef.current) cashierPeerRef.current.destroy();
            if (receiverPeerRef.current) receiverPeerRef.current.destroy();
        };
    }, []);

    return (
        <CustomerDisplayContext.Provider value={{
            isDisplayConnected,
            connectToDisplay,
            disconnectDisplay,
            sendDataToDisplay,
            myPeerId,
            setupReceiver,
            receivedData
        }}>
            {children}
        </CustomerDisplayContext.Provider>
    );
};

export const useCustomerDisplay = () => {
    const context = useContext(CustomerDisplayContext);
    if (context === undefined) {
        throw new Error('useCustomerDisplay must be used within a CustomerDisplayProvider');
    }
    return context;
};

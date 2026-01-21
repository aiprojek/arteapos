
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
    
    // NEW: Bi-directional Communication Features
    requestCustomerCamera: () => void;
    customerImage: string | null;
    clearCustomerImage: () => void;
    sendImageToCashier: (imageBase64: string) => void;
}

const CustomerDisplayContext = createContext<CustomerDisplayContextType | undefined>(undefined);

export const CustomerDisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- SENDER STATE (CASHIER) ---
    const [isDisplayConnected, setIsDisplayConnected] = useState(false);
    const cashierPeerRef = useRef<Peer | null>(null);
    const connectionRef = useRef<any>(null); // DataConnection
    const [customerImage, setCustomerImage] = useState<string | null>(null);

    // --- RECEIVER STATE (DISPLAY) ---
    const [myPeerId, setMyPeerId] = useState<string>('');
    const receiverPeerRef = useRef<Peer | null>(null);
    const [receivedData, setReceivedData] = useState<CustomerDisplayPayload | null>(null);
    const receiverConnectionRef = useRef<any>(null); // To reply back

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

                    // Listen for replies (Images)
                    conn.on('data', (data: any) => {
                        if (data && data.cameraImage) {
                            console.log("Image received from customer display");
                            setCustomerImage(data.cameraImage);
                        }
                    });
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

    // Request Camera specific helper
    const requestCustomerCamera = useCallback(() => {
        setCustomerImage(null); // Reset previous image
        sendDataToDisplay({ type: 'REQUEST_CAMERA' });
    }, [sendDataToDisplay]);

    const clearCustomerImage = useCallback(() => {
        setCustomerImage(null);
    }, []);

    // --- DISPLAY LOGIC (RECEIVER) ---
    const setupReceiver = useCallback(() => {
        if (receiverPeerRef.current) return; // Already setup

        const peer = new Peer(); 
        receiverPeerRef.current = peer;

        peer.on('open', (id) => {
            setMyPeerId(id);
        });

        peer.on('connection', (conn) => {
            console.log('Incoming connection from cashier...');
            receiverConnectionRef.current = conn;
            
            conn.on('data', (data: any) => {
                setReceivedData(data);
            });

            conn.on('close', () => {
                // Reset to welcome screen if disconnected
                setReceivedData(prev => prev ? { ...prev, type: 'WELCOME' } : null);
                receiverConnectionRef.current = null;
            });
        });

        peer.on('error', (err) => {
            console.error('Receiver Peer Error:', err);
        });
    }, []);

    const sendImageToCashier = useCallback((imageBase64: string) => {
        if (receiverConnectionRef.current) {
            // Send back simple object with the image
            receiverConnectionRef.current.send({ cameraImage: imageBase64 });
        }
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
            receivedData,
            requestCustomerCamera,
            customerImage,
            clearCustomerImage,
            sendImageToCashier
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

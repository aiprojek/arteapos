
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { CustomerDisplayPayload, KitchenDisplayPayload } from '../types';
import Peer from 'peerjs';

interface CustomerDisplayContextType {
    // CUSTOMER DISPLAY
    isDisplayConnected: boolean;
    connectToDisplay: (displayId: string) => Promise<void>;
    disconnectDisplay: () => void;
    sendDataToDisplay: (data: CustomerDisplayPayload) => void;
    
    // KITCHEN DISPLAY (NEW)
    isKitchenConnected: boolean;
    connectToKitchen: (displayId: string) => Promise<void>;
    disconnectKitchen: () => void;
    sendOrderToKitchen: (data: KitchenDisplayPayload) => void;

    // RECEIVER (Generic)
    myPeerId: string;
    setupReceiver: () => void;
    receivedData: any | null; // Generic received data
    
    // CAMERA FEATURES
    requestCustomerCamera: () => void;
    customerImage: string | null;
    clearCustomerImage: () => void;
    sendImageToCashier: (imageBase64: string) => void;
}

const CustomerDisplayContext = createContext<CustomerDisplayContextType | undefined>(undefined);

export const CustomerDisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [myPeerId, setMyPeerId] = useState<string>('');
    const cashierPeerRef = useRef<Peer | null>(null);
    const receiverPeerRef = useRef<Peer | null>(null);

    // --- CUSTOMER CONNECTION ---
    const [isDisplayConnected, setIsDisplayConnected] = useState(false);
    const customerConnectionRef = useRef<any>(null); 
    const [customerImage, setCustomerImage] = useState<string | null>(null);

    // --- KITCHEN CONNECTION (NEW) ---
    const [isKitchenConnected, setIsKitchenConnected] = useState(false);
    const kitchenConnectionRef = useRef<any>(null);

    // --- RECEIVER DATA ---
    const [receivedData, setReceivedData] = useState<any | null>(null);
    const receiverConnectionRef = useRef<any>(null); // To reply back

    // Helper: Init Cashier Peer if not exists
    const ensureCashierPeer = useCallback((): Promise<Peer> => {
        return new Promise((resolve, reject) => {
            if (cashierPeerRef.current && !cashierPeerRef.current.disconnected) {
                resolve(cashierPeerRef.current);
                return;
            }
            const peer = new Peer();
            peer.on('open', () => {
                cashierPeerRef.current = peer;
                resolve(peer);
            });
            peer.on('error', (err) => reject(err));
        });
    }, []);

    // --- CONNECT TO CUSTOMER ---
    const connectToDisplay = useCallback(async (displayId: string) => {
        const peer = await ensureCashierPeer();
        
        return new Promise<void>((resolve, reject) => {
            const conn = peer.connect(displayId);
            conn.on('open', () => {
                customerConnectionRef.current = conn;
                setIsDisplayConnected(true);
                resolve();

                // Listen for replies (Images)
                conn.on('data', (data: any) => {
                    if (data && data.cameraImage) {
                        setCustomerImage(data.cameraImage);
                    }
                });
            });
            conn.on('close', () => {
                setIsDisplayConnected(false);
                customerConnectionRef.current = null;
            });
            conn.on('error', (err) => reject(err));
        });
    }, [ensureCashierPeer]);

    // --- CONNECT TO KITCHEN ---
    const connectToKitchen = useCallback(async (displayId: string) => {
        const peer = await ensureCashierPeer();
        
        return new Promise<void>((resolve, reject) => {
            const conn = peer.connect(displayId);
            conn.on('open', () => {
                kitchenConnectionRef.current = conn;
                setIsKitchenConnected(true);
                resolve();
            });
            conn.on('close', () => {
                setIsKitchenConnected(false);
                kitchenConnectionRef.current = null;
            });
            conn.on('error', (err) => reject(err));
        });
    }, [ensureCashierPeer]);

    const disconnectDisplay = useCallback(() => {
        if (customerConnectionRef.current) customerConnectionRef.current.close();
        setIsDisplayConnected(false);
        customerConnectionRef.current = null;
    }, []);

    const disconnectKitchen = useCallback(() => {
        if (kitchenConnectionRef.current) kitchenConnectionRef.current.close();
        setIsKitchenConnected(false);
        kitchenConnectionRef.current = null;
    }, []);

    const sendDataToDisplay = useCallback((data: CustomerDisplayPayload) => {
        if (customerConnectionRef.current && isDisplayConnected) {
            customerConnectionRef.current.send(data);
        }
    }, [isDisplayConnected]);

    const sendOrderToKitchen = useCallback((data: KitchenDisplayPayload) => {
        if (kitchenConnectionRef.current && isKitchenConnected) {
            kitchenConnectionRef.current.send(data);
        }
    }, [isKitchenConnected]);

    // Request Camera specific helper
    const requestCustomerCamera = useCallback(() => {
        setCustomerImage(null); 
        sendDataToDisplay({ type: 'REQUEST_CAMERA' });
    }, [sendDataToDisplay]);

    const clearCustomerImage = useCallback(() => {
        setCustomerImage(null);
    }, []);

    // --- RECEIVER LOGIC (Display/Kitchen Device) ---
    const setupReceiver = useCallback(() => {
        if (receiverPeerRef.current) return; 

        const peer = new Peer(); 
        receiverPeerRef.current = peer;

        peer.on('open', (id) => {
            setMyPeerId(id);
        });

        peer.on('connection', (conn) => {
            receiverConnectionRef.current = conn;
            
            conn.on('data', (data: any) => {
                setReceivedData(data);
            });

            conn.on('close', () => {
                setReceivedData(null); // Reset or keep last state? Better reset to waiting.
                receiverConnectionRef.current = null;
            });
        });

        peer.on('error', (err) => {
            console.error('Receiver Peer Error:', err);
        });
    }, []);

    const sendImageToCashier = useCallback((imageBase64: string) => {
        if (receiverConnectionRef.current) {
            receiverConnectionRef.current.send({ cameraImage: imageBase64 });
        }
    }, []);

    useEffect(() => {
        return () => {
            if (cashierPeerRef.current) cashierPeerRef.current.destroy();
            if (receiverPeerRef.current) receiverPeerRef.current.destroy();
        };
    }, []);

    return (
        <CustomerDisplayContext.Provider value={{
            // Customer
            isDisplayConnected,
            connectToDisplay,
            disconnectDisplay,
            sendDataToDisplay,
            
            // Kitchen
            isKitchenConnected,
            connectToKitchen,
            disconnectKitchen,
            sendOrderToKitchen,

            // Common
            myPeerId,
            setupReceiver,
            receivedData,
            
            // Camera
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

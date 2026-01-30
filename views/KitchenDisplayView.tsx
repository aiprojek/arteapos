
import React, { useState, useEffect } from 'react';
import { useCustomerDisplay } from '../context/CustomerDisplayContext';
import { KitchenDisplayPayload } from '../types';
import Icon from '../components/Icon';
import Button from '../components/Button';

// Mock Order Interface for local state (since we receive payloads)
interface KitchenOrder extends KitchenDisplayPayload {
    status: 'new' | 'cooking' | 'done';
}

const KitchenDisplayView: React.FC = () => {
    const { setupReceiver, receivedData, myPeerId } = useCustomerDisplay();
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    
    // Setup receiver on mount
    useEffect(() => {
        setupReceiver();
    }, [setupReceiver]);

    // Listen for new orders
    useEffect(() => {
        if (receivedData && receivedData.type === 'NEW_ORDER') {
            const newOrder = receivedData as KitchenDisplayPayload;
            // Avoid duplicates
            setOrders(prev => {
                if (prev.find(o => o.orderId === newOrder.orderId)) return prev;
                return [...prev, { ...newOrder, status: 'new' }];
            });
            
            // Optional: Play Sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log("Audio play failed", e));
        }
    }, [receivedData]);

    const updateStatus = (orderId: string, status: 'new' | 'cooking' | 'done') => {
        setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
    };

    const getElapsedTime = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        return mins + 'm';
    };

    // Update times every minute
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    const renderColumn = (status: 'new' | 'cooking' | 'done', title: string, color: string) => {
        const filtered = orders.filter(o => o.status === status);
        
        return (
            <div className="flex-1 flex flex-col min-w-[300px] h-full bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className={`p-3 font-bold text-white text-center uppercase tracking-wider ${color}`}>
                    {title} ({filtered.length})
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {filtered.map(order => (
                        <div key={order.orderId} className="bg-slate-800 p-4 rounded-lg border border-slate-600 shadow-sm animate-fade-in">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-lg text-white">{order.customerName}</h4>
                                    <p className="text-xs text-slate-400">
                                        #{order.orderId.slice(-4)} • {new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                    {(order.tableNumber || order.paxCount) && (
                                        <p className="text-xs font-bold text-yellow-400 mt-1">
                                            {order.tableNumber ? `Meja: ${order.tableNumber}` : ''} 
                                            {order.tableNumber && order.paxCount ? ' | ' : ''}
                                            {order.paxCount ? `Pax: ${order.paxCount}` : ''}
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded text-slate-300">
                                    {getElapsedTime(order.timestamp)}
                                </span>
                            </div>
                            
                            <div className="space-y-1 mb-4">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 text-sm">
                                        <span className="font-bold text-white w-6">{item.quantity}x</span>
                                        <div className="flex-1 text-slate-300">
                                            {item.name}
                                            {/* Modifiers */}
                                            {((item.selectedAddons && item.selectedAddons.length > 0) || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                                                <div className="text-xs text-slate-500 pl-1 border-l-2 border-slate-600 mt-1">
                                                    {[...(item.selectedAddons || []), ...(item.selectedModifiers || [])].map((mod, i) => (
                                                        <span key={i} className="block">+ {mod.name}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                {status === 'new' && (
                                    <Button onClick={() => updateStatus(order.orderId, 'cooking')} className="w-full bg-blue-600 hover:bg-blue-500 border-none">
                                        Masak
                                    </Button>
                                )}
                                {status === 'cooking' && (
                                    <Button onClick={() => updateStatus(order.orderId, 'done')} className="w-full bg-green-600 hover:bg-green-500 border-none">
                                        Selesai
                                    </Button>
                                )}
                                {status === 'done' && (
                                    <Button onClick={() => updateStatus(order.orderId, 'cooking')} variant="secondary" className="w-full">
                                        Undo
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <p className="text-center text-slate-600 text-sm italic mt-10">Kosong</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen bg-slate-900 flex flex-col">
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Icon name="tools" className="w-6 h-6 text-orange-400" />
                    <h1 className="text-xl font-bold text-white">Kitchen Display System</h1>
                </div>
                <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded border border-slate-700">
                    ID: {myPeerId || 'Connecting...'}
                </div>
            </header>
            
            <div className="flex-1 p-4 overflow-x-auto">
                <div className="flex gap-4 h-full min-w-[1000px]">
                    {renderColumn('new', 'Baru', 'bg-blue-900/50 text-blue-200')}
                    {renderColumn('cooking', 'Sedang Dimasak', 'bg-orange-900/50 text-orange-200')}
                    {renderColumn('done', 'Selesai / Diantar', 'bg-green-900/50 text-green-200')}
                </div>
            </div>
        </div>
    );
};

export default KitchenDisplayView;

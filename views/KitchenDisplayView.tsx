
import React, { useEffect, useState } from 'react';
import { useCustomerDisplay } from '../context/CustomerDisplayContext';
import Icon from '../components/Icon';
import type { KitchenDisplayPayload } from '../types';

interface KitchenOrder extends KitchenDisplayPayload {
    receivedAt: number; // local timestamp
    status: 'new' | 'cooking' | 'done';
}

const KitchenDisplayView: React.FC = () => {
    const { setupReceiver, receivedData, myPeerId } = useCustomerDisplay();
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        setupReceiver();
    }, [setupReceiver]);

    useEffect(() => {
        if (receivedData && receivedData.type === 'NEW_ORDER') {
            setIsConnected(true);
            const newOrder: KitchenOrder = {
                ...receivedData,
                receivedAt: Date.now(),
                status: 'new'
            };
            // Add to top
            setOrders(prev => [newOrder, ...prev]);
        }
    }, [receivedData]);

    const handleStatusChange = (orderId: string, status: 'cooking' | 'done') => {
        setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
    };

    const handleClearDone = () => {
        setOrders(prev => prev.filter(o => o.status !== 'done'));
    };

    if (!isConnected && orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-8 space-y-8">
                <div className="text-center space-y-2">
                    <Icon name="tools" className="w-24 h-24 text-orange-500 mx-auto animate-pulse" />
                    <h1 className="text-4xl font-bold">Layar Dapur (KDS)</h1>
                    <p className="text-slate-400">Menunggu pesanan dari kasir...</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-xl">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${myPeerId}&color=000000&bgcolor=FFFFFF`}
                        alt="Pairing QR"
                        className="w-64 h-64"
                    />
                </div>

                <div className="text-center max-w-md text-sm text-slate-400 bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <p className="mb-2 font-bold text-white">Cara Sambung:</p>
                    <ol className="list-decimal pl-5 space-y-1 text-left">
                        <li>Buka menu Kasir di Tablet Utama.</li>
                        <li>Klik ikon <strong>"Dual Screen"</strong> (Toko/Cast).</li>
                        <li>Pilih tab <strong>"Layar Dapur"</strong> dan Scan QR ini.</li>
                    </ol>
                </div>
                 <button onClick={() => window.location.reload()} className="text-xs text-slate-500 hover:text-white">
                    Refresh ID: {myPeerId}
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-900 flex flex-col overflow-hidden text-slate-100">
            {/* Header */}
            <header className="p-4 bg-slate-800 shadow-md flex justify-between items-center z-10 shrink-0 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <Icon name="tools" className="w-8 h-8 text-orange-500" />
                    <h1 className="text-2xl font-bold text-white">Daftar Pesanan</h1>
                </div>
                <div className="flex items-center gap-4">
                     <span className="text-sm font-mono text-slate-400">
                        {new Date().toLocaleTimeString()}
                    </span>
                    <button 
                        onClick={handleClearDone} 
                        className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm text-white transition-colors"
                    >
                        Bersihkan Selesai
                    </button>
                </div>
            </header>

            {/* Orders Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {orders.map(order => (
                        <div 
                            key={order.orderId} 
                            className={`flex flex-col rounded-xl border-2 shadow-lg transition-all duration-300 ${
                                order.status === 'done' 
                                    ? 'bg-slate-800/50 border-slate-700 opacity-60' 
                                    : order.status === 'cooking' 
                                        ? 'bg-slate-800 border-yellow-500' 
                                        : 'bg-slate-800 border-green-500 animate-fade-in'
                            }`}
                        >
                            {/* Card Header */}
                            <div className={`p-3 border-b flex justify-between items-start ${
                                order.status === 'done' ? 'bg-slate-800 border-slate-700' :
                                order.status === 'cooking' ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-green-900/20 border-green-500/30'
                            }`}>
                                <div>
                                    <h3 className="font-bold text-lg text-white">
                                        {order.customerName || `Order #${order.orderId.slice(-4)}`}
                                    </h3>
                                    {order.tableNumber && (
                                        <div className="inline-block bg-white text-black px-2 py-0.5 rounded font-black text-sm my-1">
                                            MEJA: {order.tableNumber} {order.paxCount ? `(${order.paxCount} Pax)` : ''}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-300 font-mono uppercase mt-1">
                                        {order.orderType} • {new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <div className="text-xs font-bold px-2 py-1 rounded bg-black/30 text-white">
                                    {Math.floor((Date.now() - order.receivedAt) / 60000)}m lalu
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[300px]">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-start">
                                        <span className="font-bold text-lg w-8 text-center bg-slate-700 rounded text-white shrink-0">
                                            {item.quantity}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-bold text-white text-base leading-tight">{item.name}</p>
                                            {/* Modifiers */}
                                            {(item.selectedAddons || []).concat(item.selectedModifiers || []).length > 0 && (
                                                <div className="text-sm text-yellow-400 mt-1 pl-1 border-l-2 border-yellow-500/50">
                                                    {(item.selectedAddons || []).concat(item.selectedModifiers || []).map((mod, i) => (
                                                        <span key={i} className="block">+ {mod.name}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="p-3 border-t border-slate-700 flex gap-2">
                                {order.status === 'new' && (
                                    <button 
                                        onClick={() => handleStatusChange(order.orderId, 'cooking')}
                                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg uppercase tracking-wide transition-colors"
                                    >
                                        Mulai Masak
                                    </button>
                                )}
                                {order.status === 'cooking' && (
                                    <button 
                                        onClick={() => handleStatusChange(order.orderId, 'done')}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg uppercase tracking-wide transition-colors"
                                    >
                                        Selesai
                                    </button>
                                )}
                                {order.status === 'done' && (
                                    <div className="w-full text-center text-green-400 font-bold py-2 flex items-center justify-center gap-2">
                                        <Icon name="check-circle-fill" className="w-5 h-5"/> SELESAI
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KitchenDisplayView;

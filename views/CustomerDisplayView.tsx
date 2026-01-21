
import React, { useEffect, useState, useRef } from 'react';
import { useCustomerDisplay } from '../context/CustomerDisplayContext';
import { CURRENCY_FORMATTER } from '../constants';
import Icon from '../components/Icon';
import Button from '../components/Button';

const CustomerDisplayView: React.FC = () => {
    const { setupReceiver, receivedData, myPeerId, sendImageToCashier } = useCustomerDisplay();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Camera State
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    useEffect(() => {
        setupReceiver();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [setupReceiver]);

    // Handle Camera Request
    useEffect(() => {
        if (receivedData?.type === 'REQUEST_CAMERA') {
            startCamera();
        } else {
            stopCamera(); // Auto stop if type changes (e.g. payment success)
        }
    }, [receivedData]);

    const startCamera = async () => {
        setIsCameraActive(true);
        try {
            // Front camera by default for customer display
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' }, 
                audio: false 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access failed", err);
            // Optionally send error back or show alert on screen
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        setIsCapturing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context) {
            // 1. Set dimensions (Max 800px width for decent quality but manageable size)
            const maxWidth = 800;
            const ratio = video.videoWidth / video.videoHeight;
            canvas.width = maxWidth;
            canvas.height = maxWidth / ratio;

            // 2. Draw
            // Optional: Flip horizontally if we want to save "mirror" image as seen? 
            // Usually better to save normal image so text is readable. 
            // But user sees mirror. Let's save normal image (readable text).
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // 3. Compress & Send
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            // 4. Send back
            sendImageToCashier(dataUrl);

            // 5. Cleanup UI (Wait a bit or stop immediately)
            // Ideally we wait for next signal from cashier (e.g. Cart Update or Success)
            // But for now let's stop camera locally to indicate success
            stopCamera();
        }
        setIsCapturing(false);
    };

    const WaitingScreen = () => (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-8 space-y-8">
            <div className="text-center space-y-2">
                <Icon name="logo" className="w-24 h-24 text-[#52a37c] mx-auto animate-pulse" />
                <h1 className="text-3xl font-bold">Artea POS</h1>
                <p className="text-slate-400">Layar Pelanggan Siap</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-xl">
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${myPeerId}&color=000000&bgcolor=FFFFFF`}
                    alt="Pairing QR"
                    className="w-64 h-64"
                />
            </div>

            <div className="text-center max-w-md text-sm text-slate-400 bg-slate-800 p-4 rounded-lg border border-slate-700">
                <p className="mb-2 font-bold text-white">Instruksi Kasir:</p>
                <ol className="list-decimal pl-5 space-y-1 text-left">
                    <li>Buka menu Kasir di Tablet Utama.</li>
                    <li>Klik ikon <strong>"Layar Kedua"</strong> (di pojok kiri bawah keranjang).</li>
                    <li>Scan QR Code di atas.</li>
                </ol>
            </div>
            
            <button onClick={() => window.location.reload()} className="text-xs text-slate-500 hover:text-white">
                Refresh ID: {myPeerId}
            </button>
        </div>
    );

    if (!receivedData) return <WaitingScreen />;

    // --- CAMERA OVERLAY ---
    if (isCameraActive) {
        return (
            <div className="h-screen bg-black flex flex-col items-center justify-center relative">
                <h2 className="absolute top-8 text-2xl font-bold text-white z-20 text-center w-full drop-shadow-md">
                    Arahkan Bukti Transfer ke Kamera
                </h2>
                
                {/* Video Container with Mirror Effect */}
                <div className="relative w-full max-w-2xl aspect-[3/4] sm:aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-[#347758]">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover transform -scale-x-100" 
                    />
                    
                    {/* Capture Button Overlay */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30">
                        <button 
                            onClick={handleCapture}
                            disabled={isCapturing}
                            className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                        >
                            {isCapturing ? <div className="w-10 h-10 border-4 border-[#347758] border-t-transparent rounded-full animate-spin"/> : <div className="w-16 h-16 bg-[#347758] rounded-full" />}
                        </button>
                    </div>
                </div>

                <p className="text-slate-400 mt-4 text-sm animate-pulse">
                    Pastikan nominal dan tanggal terlihat jelas
                </p>
                <canvas ref={canvasRef} className="hidden" />
            </div>
        );
    }

    // --- REFUND ALERT SCREEN (ANTI-FRAUD) ---
    if (receivedData.type === 'REFUND_ALERT') {
        return (
            <div className="h-screen bg-red-600 flex flex-col items-center justify-center text-white p-8 text-center relative overflow-hidden animate-pulse">
                <div className="bg-white text-red-600 p-6 rounded-full shadow-xl mb-6">
                    <Icon name="warning" className="w-24 h-24" />
                </div>
                <h1 className="text-5xl font-black mb-4 uppercase tracking-wider">TRANSAKSI DIBATALKAN</h1>
                <div className="bg-black/30 p-6 rounded-xl border border-white/20 max-w-2xl w-full">
                    <p className="text-xl font-bold mb-2 opacity-80">ALASAN PEMBATALAN / REFUND:</p>
                    <p className="text-3xl font-bold text-yellow-300">"{receivedData.refundReason || 'Kesalahan Kasir'}"</p>
                    <div className="border-t border-white/30 my-4 pt-4">
                        <p className="text-lg">Total Dikembalikan:</p>
                        <p className="text-4xl font-mono font-bold">{CURRENCY_FORMATTER.format(receivedData.total)}</p>
                    </div>
                </div>
                <p className="mt-8 text-lg font-medium opacity-90 max-w-lg">
                    Jika Anda sudah membayar dan tidak menerima uang kembali, harap segera lapor ke Manajemen/Owner.
                </p>
            </div>
        );
    }

    // --- SUCCESS SCREEN ---
    if (receivedData.type === 'PAYMENT_SUCCESS') {
        return (
            <div className="h-screen bg-[#347758] flex flex-col items-center justify-center text-white p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <Icon name="check-circle-fill" className="w-full h-full" />
                </div>
                
                <div className="relative z-10 space-y-6">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl">
                        <Icon name="check-circle-fill" className="w-20 h-20 text-[#347758]" />
                    </div>
                    
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Pembayaran Berhasil!</h1>
                        <p className="text-xl opacity-90">Terima kasih telah berbelanja di {receivedData.shopName || 'Toko Kami'}.</p>
                    </div>

                    <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/20 w-full max-w-md mx-auto">
                        <div className="flex justify-between text-lg mb-2">
                            <span>Total Bayar</span>
                            <span className="font-bold">{CURRENCY_FORMATTER.format(receivedData.total)}</span>
                        </div>
                        {receivedData.change && receivedData.change > 0 && (
                            <div className="flex justify-between text-2xl font-bold text-yellow-300 border-t border-white/20 pt-2 mt-2">
                                <span>Kembalian</span>
                                <span>{CURRENCY_FORMATTER.format(receivedData.change)}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="absolute bottom-8 text-sm opacity-60">
                    Layar akan kembali ke menu dalam beberapa saat...
                </div>
            </div>
        );
    }

    // --- WELCOME (CONNECTED BUT EMPTY) ---
    if (receivedData.type === 'WELCOME' || (receivedData.cartItems && receivedData.cartItems.length === 0)) {
        return (
            <div className="h-screen bg-slate-900 flex flex-col">
                <header className="p-6 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <Icon name="logo" className="w-10 h-10 text-[#52a37c]" />
                        <h1 className="text-xl font-bold text-white">{receivedData.shopName || 'Artea POS'}</h1>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-white">{currentTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</p>
                        <p className="text-sm text-slate-400">{currentTime.toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long'})}</p>
                    </div>
                </header>
                
                <main className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
                    {/* CHANGED ICON HERE */}
                    <div className="w-64 h-64 bg-slate-800 rounded-full flex items-center justify-center animate-pulse">
                        <Icon name="logo" className="w-32 h-32 text-[#52a37c]" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Selamat Datang!</h2>
                    <p className="text-xl text-slate-400 max-w-lg">
                        Silakan pesan menu favorit Anda di kasir. Pesanan akan muncul di sini.
                    </p>
                </main>
            </div>
        );
    }

    // --- ACTIVE CART SCREEN ---
    return (
        <div className="h-screen bg-slate-900 flex flex-col text-slate-100">
            {/* Header */}
            <header className="p-4 bg-slate-800 shadow-md flex justify-between items-center z-10 shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-[#52a37c]">{receivedData.shopName}</h2>
                    <p className="text-xs text-slate-400">Pesanan Anda</p>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-bold">{currentTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            </header>

            {/* SECURITY BANNER - CHANGED TEXT HERE */}
            <div className="bg-yellow-600 text-black font-bold text-center py-2 px-4 text-sm sm:text-base animate-pulse shadow-md z-20">
                ⚠️ PASTIKAN ANDA MENERIMA STRUK/BUKTI TRANSAKSI SETELAH PEMBAYARAN
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Item List */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {receivedData.cartItems.map((item, idx) => (
                        <div key={`${item.cartItemId}-${idx}`} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border-l-4 border-[#347758] shadow-sm animate-fade-in">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center font-bold text-xl text-white">
                                    {item.quantity}x
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{item.name}</h3>
                                    {/* Addons / Modifiers */}
                                    <div className="text-sm text-slate-400">
                                        {[...(item.selectedAddons || []), ...(item.selectedModifiers || [])].map((mod, i) => (
                                            <span key={i} className="mr-2">+ {mod.name}</span>
                                        ))}
                                    </div>
                                    {item.discount && <span className="text-xs text-green-400 block mt-1">Diskon: {item.discount.name}</span>}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-white">
                                    {CURRENCY_FORMATTER.format(
                                        (item.price + 
                                        (item.selectedAddons?.reduce((s,a)=>s+a.price,0)||0) + 
                                        (item.selectedModifiers?.reduce((s,m)=>s+m.price,0)||0)) * item.quantity
                                    )}
                                </p>
                                {item.discount && (
                                    <p className="text-sm text-slate-500 line-through">
                                        {CURRENCY_FORMATTER.format(item.price * item.quantity)}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Totals (Sidebar style) */}
                <div className="w-1/3 bg-slate-800 p-6 flex flex-col justify-center border-l border-slate-700 shadow-2xl">
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between text-lg text-slate-400">
                            <span>Subtotal</span>
                            <span>{CURRENCY_FORMATTER.format(receivedData.subtotal)}</span>
                        </div>
                        {receivedData.discount > 0 && (
                            <div className="flex justify-between text-lg text-green-400 font-bold">
                                <span>Diskon</span>
                                <span>- {CURRENCY_FORMATTER.format(receivedData.discount)}</span>
                            </div>
                        )}
                        {receivedData.tax > 0 && (
                            <div className="flex justify-between text-lg text-slate-400">
                                <span>Pajak & Service</span>
                                <span>{CURRENCY_FORMATTER.format(receivedData.tax)}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="border-t-2 border-slate-600 pt-6">
                        <p className="text-sm text-slate-400 uppercase tracking-widest mb-2">Total Bayar</p>
                        <p className="text-5xl font-bold text-white break-words">
                            {CURRENCY_FORMATTER.format(receivedData.total)}
                        </p>
                    </div>

                    <div className="mt-auto pt-8 text-center opacity-50">
                        <Icon name="logo" className="w-12 h-12 mx-auto mb-2 text-slate-500"/>
                        <p className="text-xs">Terima Kasih</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDisplayView;

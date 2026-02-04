
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { LOGO_PATH } from './constants';
import { Capacitor } from '@capacitor/core';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

const root = ReactDOM.createRoot(rootElement);

const AppLoader = () => {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("Memeriksa sistem...");
  const [progress, setProgress] = useState(10);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    // 1. JIKA NATIVE (ANDROID/APK), LANGSUNG MASUK
    // Aplikasi Native file-nya sudah lokal, tidak butuh caching Service Worker.
    // Menunggu SW di Android sering menyebabkan layar blank.
    if (Capacitor.isNativePlatform()) {
        console.log("Native Platform detected. Skipping SW.");
        setIsReady(true);
        return;
    }

    // 2. Timer darurat: Jika macet lebih dari 5 detik, munculkan tombol paksa masuk
    const safetyTimer = setTimeout(() => {
      setShowSkip(true);
      setStatus("Mode Preview / Koneksi Lambat.");
    }, 5000);

    const init = async () => {
      // DETEKSI LINGKUNGAN PREVIEW (Google AI Studio / Stackblitz)
      const isPreview = window.location.hostname.includes('googleusercontent') || 
                        window.location.hostname.includes('webcontainer') ||
                        window.location.hostname === 'localhost';

      // Jika tidak support SW atau sedang di preview, skip saja
      if (!('serviceWorker' in navigator) || isPreview) {
        console.log("Service Worker dilewati (Mode Preview/Localhost).");
        setStatus("Mode Preview (Non-Offline)");
        setProgress(100);
        setTimeout(() => setIsReady(true), 500); 
        clearTimeout(safetyTimer);
        return;
      }

      try {
        setStatus("Mendaftarkan Service Worker...");
        
        const registration = await navigator.serviceWorker.register('./sw.js', {
            scope: './'
        });
        
        if (registration.active) {
          setStatus("Memuat aplikasi...");
          setProgress(100);
          setTimeout(() => setIsReady(true), 300);
          clearTimeout(safetyTimer);
          return;
        }

        if (registration.installing) {
          const sw = registration.installing;
          setStatus("Mengunduh aset offline (0%)...");
          
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed') {
              setStatus("Aset terunduh. Mengaktifkan...");
              setProgress(80);
            } else if (sw.state === 'activated') {
              setStatus("Selesai! Aplikasi siap offline.");
              setProgress(100);
              setTimeout(() => setIsReady(true), 500);
              clearTimeout(safetyTimer);
            }
          });
        } else {
            setIsReady(true);
            clearTimeout(safetyTimer);
        }
      } catch (error: any) {
        console.warn("SW Error (Aplikasi tetap berjalan online):", error);
        setStatus("Gagal Cache (Mode Online)");
        setProgress(100);
        setTimeout(() => setIsReady(true), 1000); 
        clearTimeout(safetyTimer);
      }
    };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            setIsReady(true);
        });
    }

    init();

    return () => clearTimeout(safetyTimer);
  }, []);

  const handleSkip = () => {
    setIsReady(true);
  };

  if (isReady) {
    return (
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#1a3c2d] text-white px-4 font-sans">
      <div className="w-16 h-16 mb-6 relative">
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#52a37c] fill-current animate-pulse">
           <path d={LOGO_PATH} transform="translate(-0.124 1.605) scale(0.152)" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2">Artea POS</h2>
      <p className="text-sm text-slate-300 mb-6 text-center max-w-xs animate-pulse">{status}</p>
      
      {!showSkip ? (
        <div className="w-64 bg-slate-800 rounded-full h-2.5 mb-2 overflow-hidden border border-slate-700">
          <div 
            className="bg-[#52a37c] h-2.5 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      ) : (
        <button 
          onClick={handleSkip}
          className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg transition-colors animate-bounce"
        >
          Masuk Sekarang
        </button>
      )}
    </div>
  );
};

root.render(<AppLoader />);

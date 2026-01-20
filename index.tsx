
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

const root = ReactDOM.createRoot(rootElement);

const AppLoader = () => {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("Memeriksa sistem...");
  const [progress, setProgress] = useState(10);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    // 1. Timer darurat: Jika dalam 8 detik belum selesai, munculkan tombol skip
    const safetyTimer = setTimeout(() => {
      setShowSkip(true);
      setStatus("Koneksi lambat atau unduhan tertunda.");
    }, 8000);

    const init = async () => {
      // Deteksi lingkungan
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      // Beberapa preview environment (seperti StackBlitz/CodeSandbox/AI Studio) menggunakan iframe dengan origin null/opaque atau domain acak
      // yang memblokir Service Worker. Kita coba deteksi.
      const isPreviewEnv = window.location.hostname.includes('googleusercontent') || window.location.hostname.includes('webcontainer');

      if (!('serviceWorker' in navigator) || isLocalhost || isPreviewEnv) {
        console.log("Service Worker skipped (Localhost/Preview Environment).");
        setIsReady(true);
        clearTimeout(safetyTimer);
        return;
      }

      try {
        setStatus("Mendaftarkan Service Worker...");
        // FIX: Gunakan path relatif './sw.js' dan scope './' eksplisit
        const registration = await navigator.serviceWorker.register('./sw.js', {
            scope: './'
        });
        
        // Jika sudah aktif sebelumnya
        if (registration.active) {
          setStatus("Memuat aplikasi...");
          setProgress(100);
          setTimeout(() => setIsReady(true), 300);
          clearTimeout(safetyTimer);
          return;
        }

        // Monitoring instalasi baru
        if (registration.installing) {
          const sw = registration.installing;
          setStatus("Mengunduh aset offline (0%)...");
          
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed') {
              setStatus("Aset terunduh. Mengaktifkan...");
              setProgress(80);
            } else if (sw.state === 'activated') {
              setStatus("Selesai!");
              setProgress(100);
              setTimeout(() => setIsReady(true), 500);
              clearTimeout(safetyTimer);
            }
          });
        } else {
            // Jika tidak ada installing (misal waiting), langsung masuk
            setIsReady(true);
            clearTimeout(safetyTimer);
        }
      } catch (error: any) {
        // Tangani error spesifik 'Scope URL' atau 'SecurityError' agar tidak panik
        if (error.message && (error.message.includes('same-origin') || error.name === 'SecurityError')) {
            console.warn("SW Registration Failed (Origin/Scope Issue):", error.message);
            setStatus("Mode Preview (SW Disabled)");
        } else {
            console.error("SW Error:", error);
            setStatus("Mode Online (Gagal Cache)");
        }
        
        // Tetap masuk meski gagal cache
        setTimeout(() => setIsReady(true), 1000);
        clearTimeout(safetyTimer);
      }
    };

    // Deteksi jika SW mengambil alih (claim)
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
    <div className="flex flex-col items-center justify-center h-screen bg-[#1a3c2d] text-white px-4">
      <div className="w-16 h-16 mb-6 relative">
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#52a37c] fill-current animate-pulse">
           <path d="m 7.4847131,91.696532 c -0.955144,-0.31127 -1.786142,-1.04943 -2.217636,-1.9699 -0.5244,-1.27971 -0.201199,-2.56329 0.320849,-3.78483 2.92093,-6.8857 7.5750739,-13.99307 12.5551279,-19.17303 l 0.8951,-0.93103 -0.374563,-0.86353 c -0.817115,-1.8838 -1.564511,-4.49971 -1.914401,-6.700471 -0.931168,-5.856932 -0.146411,-11.971369 2.259228,-17.602768 1.751824,-4.100873 4.65858,-8.172087 7.426644,-10.401778 3.829489,-3.084682 9.410329,-5.302874 17.423863,-6.925388 3.208572,-0.649646 6.113868,-1.103179 13.236547,-2.066298 11.861019,-1.60383 13.889087,-2.119176 19.622446,-4.986191 3.794758,-1.897599 8.038728,-4.471472 11.686488,-7.0502559 1.123567,-0.794305 1.437252,-1.099775 2.692918,-1.040227 1.106158,0.05246 1.626677,0.214442 2.282939,0.710446 1.397637,1.056332 1.620188,2.0795349 1.619736,7.4467289 0,5.012825 -0.430316,9.286155 -1.424047,14.155752 -3.759068,18.420658 -14.018944,33.38204 -29.862207,43.54632 -11.656738,7.47841 -22.215344,9.28013 -31.155349,5.31635 -3.090786,-1.37038 -6.610519,-3.96906 -8.830055,-6.51939 l -0.689401,-0.79215 -0.395196,0.43508 c -4.138252,4.55593 -8.208031,10.91526 -10.400194,16.25105 -0.26874,0.65413 -0.607554,1.3625 -0.75292,1.57417 -0.336855,0.49049 -0.934208,0.98021 -1.5117179,1.23933 -0.56543,0.2537 -1.903471,0.32452 -2.494199,0.13201 z" transform="translate(-0.124 1.605) scale(0.152)" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2">Artea POS</h2>
      <p className="text-sm text-slate-300 mb-6 text-center max-w-xs">{status}</p>
      
      {!showSkip ? (
        <div className="w-64 bg-slate-800 rounded-full h-2.5 mb-2 overflow-hidden">
          <div 
            className="bg-[#52a37c] h-2.5 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      ) : (
        <button 
          onClick={handleSkip}
          className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg transition-colors animate-fade-in"
        >
          Lewati & Masuk
        </button>
      )}
      
      <p className="text-xs text-slate-500 mt-2">
        {showSkip ? "Proses unduh berjalan di latar belakang." : "Menyiapkan database..."}
      </p>
    </div>
  );
};

root.render(<AppLoader />);


import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM for Portals
import Modal from './Modal';
import Icon from './Icon';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

declare const Html5Qrcode: any;

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNativeScanning, setIsNativeScanning] = useState(false);

  // --- KODULAR BRIDGE SCANNER ---
  const startKodularScan = () => {
    if (window.AppInventor) {
      window.AppInventor.setWebViewString("ACTION:SCAN_BARCODE");
      onClose(); 
      return true;
    }
    return false;
  };

  // --- NATIVE SCANNER LOGIC ---
  const startNativeScan = async () => {
      try {
          // Force Stop First (Membersihkan sesi kamera yang mungkin nyangkut)
          await BarcodeScanner.stopScan(); 
          
          const status = await BarcodeScanner.checkPermission({ force: false });
          if (!status.granted) {
              const request = await BarcodeScanner.checkPermission({ force: true });
              if (!request.granted) {
                  if (request.denied) {
                      const confirmSettings = window.confirm("Izin kamera ditolak. Buka pengaturan?");
                      if (confirmSettings) BarcodeScanner.openAppSettings();
                  }
                  setError("Izin kamera diperlukan.");
                  return;
              }
          }

          await BarcodeScanner.prepare();
          setIsNativeScanning(true);
          
          // HIDE MAIN APP CONTENT
          const mainApp = document.getElementById('main-app-layout');
          if (mainApp) mainApp.style.display = 'none';

          // MAKE BODY TRANSPARENT
          document.body.classList.add('barcode-scanner-active');
          document.documentElement.classList.add('barcode-scanner-active');
          
          await BarcodeScanner.hideBackground();
          
          const result = await BarcodeScanner.startScan(); 
          
          if (result.hasContent) {
              await stopNativeScan(); 
              onScan(result.content);
          } else {
              await stopNativeScan();
              onClose();
          }
      } catch (e: any) {
          console.error("Native Scan Error", e);
          setError("Gagal: " + e.message);
          await stopNativeScan();
      }
  };

  const stopNativeScan = async () => {
      try {
        await BarcodeScanner.showBackground();
        await BarcodeScanner.stopScan();
      } catch(e) {
          console.warn("Stop scan failed", e);
      }
      
      // RESTORE UI
      document.body.classList.remove('barcode-scanner-active');
      document.documentElement.classList.remove('barcode-scanner-active');
      
      const mainApp = document.getElementById('main-app-layout');
      if (mainApp) mainApp.style.display = 'flex'; // Restore layout

      setIsNativeScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);

      // 1. CEK KODULAR
      if (startKodularScan()) return;

      // 2. NATIVE CAPACITOR
      if (Capacitor.isNativePlatform()) {
          startNativeScan();
          return;
      }

      // 3. WEB BROWSER
      if (typeof Html5Qrcode === 'undefined') {
        setError("Library scanner web tidak dimuat.");
        return;
      }
      
      const scanner = new Html5Qrcode('barcode-scanner-container');
      scannerRef.current = scanner;
      scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, 
        (decodedText: string) => { 
            if(scannerRef.current) scannerRef.current.stop().catch(() => {});
            onScan(decodedText); 
            onClose(); 
        }, 
        () => {}
      ).catch((err: any) => {
          console.error(err);
          setError("Gagal akses kamera web.");
      });
      
      return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
        }
      };
    } else {
        if (isNativeScanning) stopNativeScan();
    }
  }, [isOpen]);

  // --- RENDER NATIVE OVERLAY (USING PORTAL) ---
  // Kita render langsung ke document.body agar terpisah dari hirarki App yang disembunyikan
  if (isNativeScanning) {
      return ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col bg-transparent">
              
              {/* Back Button */}
              <button 
                onClick={() => { stopNativeScan(); onClose(); }} 
                className="absolute top-10 left-4 z-50 bg-black/40 text-white p-3 rounded-full backdrop-blur-md border border-white/20"
              >
                  <Icon name="close" className="w-6 h-6"/>
              </button>

              {/* Guide Overlay */}
              <div className="flex-1 bg-black/50 flex items-center justify-center">
                  <p className="text-white font-bold text-sm bg-black/60 px-4 py-2 rounded-full border border-white/20">
                      Pindai Barcode
                  </p>
              </div>
              
              <div className="flex h-64 shrink-0">
                  <div className="flex-1 bg-black/50"></div>
                  <div className="w-80 h-64 border-2 border-[#52a37c] relative bg-transparent box-content rounded-lg">
                      <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_10px_rgba(255,0,0,0.8)] animate-[scan_2s_infinite]"></div>
                      {/* Corners */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-[#52a37c] rounded-tl-lg"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-[#52a37c] rounded-tr-lg"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-[#52a37c] rounded-bl-lg"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-[#52a37c] rounded-br-lg"></div>
                  </div>
                  <div className="flex-1 bg-black/50"></div>
              </div>

              <div className="flex-1 bg-black/50 flex flex-col items-center justify-center pb-10">
                  <div className="flex gap-4">
                      <button 
                        onClick={() => BarcodeScanner.toggleTorch()} 
                        className="bg-slate-800/80 text-white p-4 rounded-full border border-slate-600 active:bg-slate-700"
                      >
                          <Icon name="play" className="w-6 h-6 -rotate-90"/>
                      </button>
                  </div>
              </div>
              
              <style>{`@keyframes scan { 0% { top: 0; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>
          </div>,
          document.body // Portal target
      );
  }

  // --- RENDER WEB MODAL ---
  if (Capacitor.isNativePlatform()) return null; // Don't render modal structure on Native waiting phase

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pindai Barcode">
      <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center">
        {error ? (
            <div className="text-center p-6">
                <Icon name="warning" className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-slate-300">{error}</p>
                <button onClick={onClose} className="mt-4 text-sky-400 text-sm hover:underline">Tutup</button>
            </div>
        ) : (
            <div id="barcode-scanner-container" className="w-full h-full" />
        )}
      </div>
    </Modal>
  );
};

export default BarcodeScannerModal;

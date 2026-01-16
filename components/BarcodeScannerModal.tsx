
import React, { useEffect, useRef, useState } from 'react';
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

  const startNativeScan = async () => {
      try {
          const status = await BarcodeScanner.checkPermission({ force: true });
          if (status.granted) {
              setIsNativeScanning(true);
              await BarcodeScanner.hideBackground();
              document.body.classList.add('barcode-scanner-active');
              
              const result = await BarcodeScanner.startScan(); 
              
              if (result.hasContent) {
                  stopNativeScan(); // Stop first to restore UI
                  onScan(result.content);
              } else {
                  stopNativeScan();
                  onClose();
              }
          } else {
              setError("Izin kamera ditolak. Buka Pengaturan Aplikasi untuk mengizinkan.");
          }
      } catch (e: any) {
          setError("Gagal membuka scanner: " + e.message);
          stopNativeScan();
      }
  };

  const stopNativeScan = async () => {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
      document.body.classList.remove('barcode-scanner-active');
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

      // 3. WEB MODE
      if (typeof Html5Qrcode === 'undefined') {
        setError("Pustaka scanner tidak dimuat.");
        return;
      }
      
      const scanner = new Html5Qrcode('barcode-scanner-container');
      scannerRef.current = scanner;
      const config = { fps: 10, qrbox: { width: 250, height: 150 } };

      scanner.start({ facingMode: "environment" }, config, 
        (decodedText: string) => { onScan(decodedText); onClose(); }, 
        () => {}
      ).catch(() => setError("Gagal mengakses kamera."));
      
      return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
        }
      };
    } else {
        // Cleanup if closed externally
        if (isNativeScanning) {
            stopNativeScan();
        }
    }
  }, [isOpen]);

  // UI OVERLAY KHUSUS NATIVE (Agar tidak terlihat transparan kosong)
  if (isNativeScanning) {
      return (
          <div className="fixed inset-0 z-[9999] flex flex-col bg-transparent">
              {/* Top Mask */}
              <div className="flex-1 bg-black/60 flex items-center justify-center">
                  <p className="text-white font-bold text-sm bg-black/40 px-3 py-1 rounded-full">
                      Arahkan kamera ke barcode
                  </p>
              </div>
              
              {/* Center Area (Transparent Hole) */}
              <div className="flex h-64 shrink-0">
                  <div className="flex-1 bg-black/60"></div>
                  {/* The Scanner Hole */}
                  <div className="w-80 h-64 border-2 border-[#52a37c] relative bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                      {/* Scanning Animation Line */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-[scan_2s_infinite]"></div>
                      {/* Corner Markers */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-l-4 border-t-4 border-[#52a37c]"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-r-4 border-t-4 border-[#52a37c]"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-4 border-b-4 border-[#52a37c]"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-4 border-b-4 border-[#52a37c]"></div>
                  </div>
                  <div className="flex-1 bg-black/60"></div>
              </div>

              {/* Bottom Mask & Controls */}
              <div className="flex-1 bg-black/60 flex flex-col items-center justify-center gap-4 pb-10">
                  <p className="text-slate-300 text-xs text-center max-w-xs">
                      Pastikan pencahayaan cukup dan barcode ada di dalam kotak.
                  </p>
                  <button 
                    onClick={() => { stopNativeScan(); onClose(); }} 
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
                  >
                      <Icon name="close" className="w-5 h-5"/> Batalkan
                  </button>
              </div>
              
              <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
              `}</style>
          </div>
      );
  }

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

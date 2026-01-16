
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

  // --- NATIVE LOGIC ---
  const startNativeScan = async () => {
      try {
          // Check permission
          const status = await BarcodeScanner.checkPermission({ force: true });
          
          if (status.granted) {
              setIsNativeScanning(true);
              // Hide WebView background to make camera visible
              await BarcodeScanner.hideBackground();
              document.body.classList.add('barcode-scanner-active'); // CSS helper if needed

              const result = await BarcodeScanner.startScan(); 
              
              // If user stops scan or result found
              document.body.classList.remove('barcode-scanner-active');
              setIsNativeScanning(false);

              if (result.hasContent) {
                  onScan(result.content);
                  // stopScan is called automatically after result in single mode? verify.
                  // Just in case:
                  stopNativeScan();
              } else {
                  onClose();
              }
          } else {
              setError("Izin kamera ditolak. Buka Pengaturan Aplikasi untuk mengizinkan.");
          }
      } catch (e: any) {
          console.error("Native Scan Error:", e);
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

      // 1. NATIVE MODE
      if (Capacitor.isNativePlatform()) {
          startNativeScan();
          return;
      }

      // 2. WEB MODE
      if (typeof Html5Qrcode === 'undefined') {
        setError("Pustaka pemindai barcode tidak dimuat.");
        return;
      }
      
      const scanner = new Html5Qrcode('barcode-scanner-container');
      scannerRef.current = scanner;

      const config = { fps: 10, qrbox: { width: 250, height: 150 }, rememberLastUsedCamera: false };

      scanner.start({ facingMode: "user" }, config, 
        (decodedText: string) => { onScan(decodedText); onClose(); }, 
        () => {}
      ).catch(() => {
          // Fallback to back camera
          scanner.start({ facingMode: "environment" }, config, 
            (decodedText: string) => { onScan(decodedText); onClose(); },
            (err: any) => { 
                // Only show error if permission related, ignore parsing errors
                if (err?.name === 'NotAllowedError') setError("Izin kamera ditolak.");
            }
          );
      });
      
      return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
        }
      };
    } else {
        if (Capacitor.isNativePlatform()) {
            stopNativeScan();
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // UI RENDER
  if (isNativeScanning) {
      // Show transparent UI with Close button for Native Mode
      return (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end pb-10 items-center bg-transparent">
              <div className="text-white text-lg font-bold mb-4 drop-shadow-md">Arahkan kamera ke barcode</div>
              <button 
                onClick={() => { stopNativeScan(); onClose(); }}
                className="bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg"
              >
                  Batal / Tutup
              </button>
          </div>
      );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pindai Barcode">
      <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center">
        {error ? (
          <div className="text-center p-6 max-w-sm">
            <Icon name="warning" className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-slate-300 leading-relaxed mb-4">{error}</p>
            <button onClick={onClose} className="text-sm text-slate-400 hover:text-white underline">Tutup</button>
          </div>
        ) : (
          <div id="barcode-scanner-container" className="w-full h-full" />
        )}
      </div>
    </Modal>
  );
};

export default BarcodeScannerModal;

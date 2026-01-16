
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
      onClose(); // Tutup modal karena kamera native akan menimpa layar
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
              document.body.classList.remove('barcode-scanner-active');
              setIsNativeScanning(false);
              if (result.hasContent) {
                  onScan(result.content);
                  stopNativeScan();
              } else {
                  onClose();
              }
          } else {
              setError("Izin kamera ditolak.");
          }
      } catch (e: any) {
          setError("Gagal membuka scanner.");
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

      // 1. CEK KODULAR DULU (Prioritas)
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
    }
  }, [isOpen]);

  if (isNativeScanning) {
      return (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end pb-10 items-center bg-transparent">
              <button onClick={() => { stopNativeScan(); onClose(); }} className="bg-red-600 text-white px-6 py-3 rounded-full font-bold">Batal</button>
          </div>
      );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pindai Barcode">
      <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center">
        {error ? <div className="text-center p-6"><Icon name="warning" className="w-12 h-12 text-red-500 mx-auto mb-2" /><p className="text-sm text-slate-300">{error}</p></div> : <div id="barcode-scanner-container" className="w-full h-full" />}
      </div>
    </Modal>
  );
};

export default BarcodeScannerModal;

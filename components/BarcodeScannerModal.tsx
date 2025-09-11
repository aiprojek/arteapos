import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

// The html5-qrcode library is loaded via script tag in index.html
declare const Html5Qrcode: any;

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (typeof Html5Qrcode === 'undefined') {
        setError("Pustaka pemindai barcode (Html5Qrcode) tidak ditemukan.");
        return;
      }
      
      // We create a new instance every time the modal opens
      const scanner = new Html5Qrcode('barcode-scanner-container');
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        rememberLastUsedCamera: true,
      };

      const onScanSuccess = (decodedText: string) => {
        onScan(decodedText);
        onClose();
      };
      
      const onScanFailure = (errorMessage: string) => {
        // This is called frequently when no barcode is found.
        // We can ignore it unless we want to show a specific message.
      };

      // Start scanning
      scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
        .catch((err: any) => {
          console.error("Gagal memulai pemindai:", err);
          let message = "Gagal memulai pemindai. Pastikan Anda telah memberikan izin kamera.";
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
              message = "Izin kamera ditolak. Harap aktifkan di pengaturan browser Anda.";
          } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
              message = "Tidak ada kamera yang ditemukan.";
          }
          setError(message);
        });
      
      // Cleanup function
      return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch((err: any) => {
            console.error("Gagal menghentikan pemindai:", err);
          });
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pindai Barcode">
      <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-center text-red-400 p-4">
            <p className="font-semibold">Gagal Memulai Pemindai</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          <div id="barcode-scanner-container" className="w-full h-full" />
        )}
      </div>
      <p className="text-center text-sm text-slate-400 mt-4">
        Posisikan barcode produk di dalam area pemindaian.
      </p>
    </Modal>
  );
};

export default BarcodeScannerModal;

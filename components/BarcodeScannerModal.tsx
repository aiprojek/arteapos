
import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';

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
  const [errorType, setErrorType] = useState<'permission' | 'hardware' | 'unknown'>('unknown');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setErrorType('unknown');

      if (typeof Html5Qrcode === 'undefined') {
        setError("Pustaka pemindai barcode (Html5Qrcode) tidak ditemukan. Cek koneksi internet untuk memuat script.");
        return;
      }
      
      const scanner = new Html5Qrcode('barcode-scanner-container');
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        rememberLastUsedCamera: false, // Don't remember, enforce logic below
      };

      const onScanSuccess = (decodedText: string) => {
        onScan(decodedText);
        onClose();
      };
      
      const onScanFailure = (errorMessage: string) => {
        // Ignore parsing errors, keep scanning
      };

      const handleCameraError = (err: any) => {
          console.error("Scanner Error:", err);
          let message = "Gagal memulai kamera.";
          let type: 'permission' | 'hardware' | 'unknown' = 'unknown';

          const errName = err?.name || '';
          
          if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
              message = "Izin kamera ditolak oleh browser. Mohon izinkan akses kamera pada pengaturan situs (ikon gembok di URL bar).";
              type = 'permission';
          } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
              message = "Perangkat kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera yang berfungsi atau driver sudah terinstal.";
              type = 'hardware';
          } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
              message = "Kamera terdeteksi tetapi tidak dapat diakses. Mungkin sedang digunakan oleh aplikasi lain (Zoom/Meet) atau mengalami kerusakan hardware.";
              type = 'hardware';
          } else if (errName === 'OverconstrainedError') {
              message = "Kamera depan tidak tersedia atau tidak memenuhi syarat resolusi.";
              type = 'hardware';
          } else {
              message = `Terjadi kesalahan sistem kamera: ${err.message || err}`;
          }
          
          setError(message);
          setErrorType(type);
      };

      // LOGIC CHANGE: Try Front Camera (User) FIRST as requested
      scanner.start({ facingMode: "user" }, config, onScanSuccess, onScanFailure)
        .catch((err: any) => {
          console.warn("Front camera failed, trying back camera...", err);
          // Fallback to Environment (Back Camera)
          scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
            .catch((err2: any) => {
                handleCameraError(err2);
            });
        });
      
      return () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch((err: any) => console.error("Stop scan error:", err));
                }
                scannerRef.current.clear();
            } catch (e) {
                // ignore
            }
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pindai Barcode">
      <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center">
        {error ? (
          <div className="text-center p-6 max-w-sm">
            <div className="mb-3 flex justify-center">
                {errorType === 'permission' ? (
                    <Icon name="lock" className="w-12 h-12 text-yellow-500" />
                ) : (
                    <Icon name="warning" className="w-12 h-12 text-red-500" />
                )}
            </div>
            <h3 className="font-bold text-white text-lg mb-2">
                {errorType === 'permission' ? 'Izin Ditolak' : 'Kamera Bermasalah'}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">{error}</p>
            <button onClick={onClose} className="text-sm text-slate-400 hover:text-white underline">
                Tutup & Input Manual
            </button>
          </div>
        ) : (
          <div id="barcode-scanner-container" className="w-full h-full" />
        )}
      </div>
      {!error && (
          <div className="mt-4 text-center">
            <p className="text-sm text-white font-medium">Arahkan kode ke kamera depan/webcam.</p>
            <p className="text-xs text-slate-400 mt-1">Pastikan cahaya cukup terang.</p>
          </div>
      )}
    </Modal>
  );
};

export default BarcodeScannerModal;

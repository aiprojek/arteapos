
import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageBase64: string) => void;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    const startStream = async () => {
      stopStream();
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Browser ini tidak mendukung akses kamera.");
        return;
      }
      
      const handleCameraError = (err: any) => {
        console.error("Camera Error:", err);
        let message = "Gagal mengakses kamera.";
        
        // Detailed Error Mapping
        if (err instanceof DOMException) {
          switch(err.name) {
              case "NotAllowedError":
              case "PermissionDeniedError":
                  message = "Izin kamera ditolak. Silakan aktifkan di pengaturan browser.";
                  break;
              case "NotFoundError":
              case "DevicesNotFoundError":
                  message = "Kamera tidak ditemukan. Cek koneksi hardware Anda.";
                  break;
              case "NotReadableError":
              case "TrackStartError":
                  message = "Kamera rusak atau sedang dipakai aplikasi lain (Zoom/Meet).";
                  break;
              default:
                  message = `Error kamera: ${err.name}`;
                  break;
          }
        } else {
            message = `Gagal: ${err.message}`;
        }
        setError(message);
      };

      try {
        // For Product Photos, usually Back Camera (Environment) is still preferred as default
        // But we add fallback logic
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.warn("Back camera failed, trying default...", err.name);
        try {
             // Fallback to any available video source
             const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
             });
             streamRef.current = mediaStream;
             if (videoRef.current) {
               videoRef.current.srcObject = mediaStream;
             }
        } catch (fallbackErr: any) {
             handleCameraError(fallbackErr);
        }
      }
    };

    if (isOpen) {
      startStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  const handleCapture = () => {
    if (isProcessing || !videoRef.current || !canvasRef.current || !streamRef.current) {
      return;
    }

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      const targetWidth = 600; // Better quality for product photos
      const scale = targetWidth / video.videoWidth;
      const targetHeight = video.videoHeight * scale;

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.drawImage(video, 0, 0, targetWidth, targetHeight);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85); 
      onCapture(dataUrl);
      onClose();
    }
    setIsProcessing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ambil Foto Produk">
      <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center">
        {error ? (
          <div className="text-center p-6 max-w-xs text-slate-300">
            <Icon name="warning" className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="font-bold text-white mb-1">Kamera Bermasalah</p>
            <p className="text-sm mb-4">{error}</p>
            <Button size="sm" variant="secondary" onClick={onClose}>Tutup</Button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
      {!error && (
        <div className="mt-6 flex justify-center">
            <Button
            onClick={handleCapture}
            disabled={!!error || isProcessing}
            className="w-16 h-16 rounded-full bg-white text-black hover:bg-slate-200 border-4 border-slate-700 shadow-lg flex items-center justify-center"
            aria-label="Jepret Foto"
            >
            {isProcessing ? <span className="animate-spin text-xl">↻</span> : <Icon name="camera" className="w-8 h-8" />}
            </Button>
        </div>
      )}
    </Modal>
  );
};

export default CameraCaptureModal;

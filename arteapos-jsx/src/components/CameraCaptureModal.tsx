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
      // Clean up previous state
      stopStream();
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Fitur kamera tidak didukung di browser atau perangkat ini.");
        return;
      }
      
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        
        let message = "Gagal mengakses kamera. Pastikan Anda telah memberikan izin.";
        if (err instanceof DOMException) {
          switch(err.name) {
              case "NotAllowedError":
              case "PermissionDeniedError":
                  message = "Izin kamera ditolak. Harap aktifkan di pengaturan browser Anda.";
                  break;
              case "NotFoundError":
              case "DevicesNotFoundError":
                  message = "Tidak ada kamera yang ditemukan di perangkat ini.";
                  break;
              case "NotReadableError":
              case "TrackStartError":
                  message = "Kamera sedang digunakan oleh aplikasi lain atau terjadi error perangkat keras.";
                  break;
              case "OverconstrainedError":
              case "ConstraintNotSatisfiedError":
                  message = "Kamera perangkat tidak mendukung konfigurasi yang diminta.";
                  break;
              case "AbortError":
                  message = "Permintaan kamera dibatalkan.";
                  break;
              case "TypeError":
                  message = "Konfigurasi kamera tidak valid. Pastikan situs diakses melalui HTTPS.";
                  break;
              default:
                  message = `Terjadi error kamera yang tidak diketahui: ${err.name}`;
                  break;
          }
        } else if (err instanceof Error) {
          message = `Gagal mengakses kamera: ${err.message}`;
        }
        setError(message);
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
      const targetWidth = 400; // Resize image to a reasonable width
      const scale = targetWidth / video.videoWidth;
      const targetHeight = video.videoHeight * scale;

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.drawImage(video, 0, 0, targetWidth, targetHeight);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Compress image
      onCapture(dataUrl);
      // The onClose call will trigger the useEffect cleanup to stop the stream
      onClose();
    }
    setIsProcessing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ambil Gambar Produk">
      <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-center text-red-400 p-4">
            <p className="font-semibold">Gagal Mengakses Kamera</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleCapture}
          disabled={!!error || isProcessing}
          className="w-16 h-16 rounded-full"
          aria-label="Ambil Gambar"
        >
          {isProcessing ? "..." : <Icon name="camera" className="w-8 h-8" />}
        </Button>
      </div>
    </Modal>
  );
};

export default CameraCaptureModal;

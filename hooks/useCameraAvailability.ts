import { useState, useEffect } from 'react';

export const useCameraAvailability = () => {
  const [isCameraAvailable, setCameraAvailable] = useState<boolean>(false);

  useEffect(() => {
    // Periksa apakah API yang diperlukan didukung oleh browser
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setCameraAvailable(false);
      return;
    }

    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        // Cari setidaknya satu perangkat yang merupakan input video (kamera)
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        setCameraAvailable(hasCamera);
      })
      .catch(() => {
        // Jika terjadi error (misalnya, izin ditolak untuk enumerasi), asumsikan tidak ada kamera
        setCameraAvailable(false);
      });
  }, []);

  return isCameraAvailable;
};

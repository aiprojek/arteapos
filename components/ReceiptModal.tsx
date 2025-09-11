import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Receipt from './Receipt';
import Button from './Button';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';
import type { Transaction } from '../types';
import { useToImage } from '../hooks/useToImage';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, transaction }) => {
  const { receiptSettings, showAlert } = useAppContext();
  // FIX: Removed `cacheBust` property as it's not supported by the underlying
  // html2canvas library and was causing a type error.
  const [receiptRef, { isLoading: isProcessing, error: imageError, getImage }] = useToImage<HTMLDivElement>({
    quality: 0.95,
    backgroundColor: '#ffffff',
  });
  const [canShareImage, setCanShareImage] = useState(false);

  useEffect(() => {
    // Cek apakah browser mendukung Web Share API untuk file
    if (isOpen) {
      const dummyFile = new File([''], 'dummy.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [dummyFile] })) {
        setCanShareImage(true);
      } else {
        setCanShareImage(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (imageError) {
        console.error('Gagal membuat gambar struk:', imageError);
        showAlert({
            type: 'alert',
            title: 'Gagal Mengekspor Struk',
            message: 'Terjadi kesalahan saat mencoba membuat gambar struk. Silakan coba lagi.'
        });
    }
  }, [imageError, showAlert]);


  const handlePrint = () => {
    const receiptElement = receiptRef.current;
    if (!receiptElement) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showAlert({
            type: 'alert',
            title: 'Gagal Membuka Jendela Cetak',
            message: 'Pastikan pop-up diizinkan di pengaturan browser Anda untuk melanjutkan.'
        });
        return;
    }
    
    const styles = `
      @media print {
        @page { 
          margin: 0; 
        }
        body { 
          margin: 0; 
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
      }
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Transaksi</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>${styles}</style>
        </head>
        <body>
          ${receiptElement.outerHTML}
          <script>
            // Add a small delay to allow Tailwind's JIT compiler to process classes
            setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
            }, 250);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportImage = async () => {
    if (isProcessing) return;
    try {
        const dataUrl = await getImage();
        if (!dataUrl) {
            // error already handled by the hook's useEffect
            return;
        }

        if (canShareImage) {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `struk-${transaction.id}.png`, { type: 'image/png' });
            await navigator.share({
                title: 'Struk Transaksi',
                text: `Berikut adalah struk untuk transaksi Anda pada ${new Date(transaction.createdAt).toLocaleDateString()}.`,
                files: [file],
            });
        } else {
            // Fallback untuk desktop: unduh gambar
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `struk-${transaction.id}.png`;
            link.click();
        }
    } catch (error) {
        // Jangan tampilkan error jika pengguna membatalkan dialog 'share'
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.log("Aksi berbagi dibatalkan oleh pengguna.");
        } else {
            console.error('Gagal membagikan atau mengunduh gambar:', error);
            showAlert({
                type: 'alert',
                title: 'Gagal Mengekspor Struk',
                message: 'Terjadi kesalahan saat mencoba mengekspor gambar struk. Silakan coba lagi.'
            });
        }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Struk Transaksi">
      <div className="bg-slate-700 p-2 sm:p-4 rounded-lg overflow-y-auto max-h-[60vh]">
        {/* Wrapper for on-screen preview with a fixed width for better readability */}
        <div className="max-w-xs mx-auto">
            <Receipt ref={receiptRef} transaction={transaction} settings={receiptSettings} />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
        <Button variant="secondary" onClick={handlePrint}>
            <Icon name="printer" className="w-5 h-5"/>
            <span>Cetak Struk</span>
        </Button>
        <Button variant="primary" onClick={handleExportImage} disabled={isProcessing}>
            {canShareImage ? (
                <>
                    <Icon name="share" className="w-5 h-5"/>
                    <span>{isProcessing ? 'Memproses...' : 'Bagikan Gambar'}</span>
                </>
            ) : (
                <>
                    <Icon name="download" className="w-5 h-5"/>
                    <span>{isProcessing ? 'Memproses...' : 'Unduh Gambar'}</span>
                </>
            )}
        </Button>
      </div>
    </Modal>
  );
};

export default ReceiptModal;
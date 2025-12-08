
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Receipt from './Receipt';
import Button from './Button';
import Icon from './Icon';
import { useSettings } from '../context/SettingsContext';
import { useUI } from '../context/UIContext';
import { useFinance } from '../context/FinanceContext';
import type { Transaction as TransactionType } from '../types';
import { useToImage } from '../hooks/useToImage';
import { bluetoothPrinterService } from '../utils/bluetoothPrinter';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionType;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, transaction }) => {
  const { receiptSettings } = useSettings();
  const { showAlert } = useUI();
  const { refundTransaction } = useFinance();
  const [receiptRef, { isLoading: isProcessing, error: imageError, getImage }] = useToImage<HTMLDivElement>({
    quality: 0.95,
    backgroundColor: '#ffffff',
  });
  const [canShareImage, setCanShareImage] = useState(false);

  useEffect(() => {
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
    
    // We must ensure Tailwind is loaded in the new window for styles to apply
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
            // Wait for Tailwind to process classes before printing
            setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleBluetoothPrint = async () => {
      await bluetoothPrinterService.printReceipt(transaction, receiptSettings);
  };

  const handleExportImage = async () => {
    if (isProcessing) return;
    try {
        const dataUrl = await getImage();
        if (!dataUrl) {
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
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `struk-${transaction.id}.png`;
            link.click();
        }
    } catch (error) {
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

  const handleRefund = () => {
    showAlert({
        type: 'confirm',
        title: 'Batalkan Transaksi (Refund)?',
        message: 'Anda yakin ingin membatalkan transaksi ini? Stok produk akan dikembalikan dan omzet akan dikurangi.',
        confirmVariant: 'danger',
        confirmText: 'Ya, Refund',
        onConfirm: () => {
            refundTransaction(transaction.id);
            onClose();
        }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Struk Transaksi">
      <div className="bg-slate-700 p-2 sm:p-4 rounded-lg overflow-y-auto max-h-[60vh]">
        <div className="max-w-xs mx-auto">
            <Receipt ref={receiptRef} transaction={transaction} settings={receiptSettings} />
        </div>
      </div>
      <div className="flex flex-col gap-3 pt-6">
        <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button variant="secondary" onClick={handleBluetoothPrint} className="flex-1" title="Cetak langsung ke Printer Thermal Bluetooth (Android/Desktop)">
                <Icon name="bluetooth" className="w-5 h-5 text-blue-400"/>
                <span>Cetak BT</span>
            </Button>
            <Button variant="secondary" onClick={handlePrint} className="flex-1" title="Cetak via browser print dialog">
                <Icon name="printer" className="w-5 h-5"/>
                <span>Cetak PDF</span>
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button variant="primary" onClick={handleExportImage} disabled={isProcessing} className="flex-1">
                {canShareImage ? (
                    <>
                        <Icon name="share" className="w-5 h-5"/>
                        <span>{isProcessing ? '...' : 'Bagikan Gambar'}</span>
                    </>
                ) : (
                    <>
                        <Icon name="download" className="w-5 h-5"/>
                        <span>{isProcessing ? '...' : 'Unduh Gambar'}</span>
                    </>
                )}
            </Button>
            {transaction.paymentStatus !== 'refunded' && (
                <Button variant="danger" onClick={handleRefund} className="flex-1">
                    <Icon name="reset" className="w-5 h-5"/>
                    <span>Refund</span>
                </Button>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default ReceiptModal;

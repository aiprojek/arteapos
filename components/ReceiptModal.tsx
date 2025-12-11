
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

  const handleDownload = async () => {
    if (isProcessing) return;
    try {
        const dataUrl = await getImage();
        if (!dataUrl) return;

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `struk-${transaction.id}.png`;
        link.click();
    } catch (error) {
        console.error('Gagal mengunduh gambar:', error);
        showAlert({
            type: 'alert',
            title: 'Gagal Mengunduh',
            message: 'Terjadi kesalahan saat mencoba mengunduh gambar struk.'
        });
    }
  };

  const handleShare = async () => {
    if (isProcessing) return;
    try {
        const dataUrl = await getImage();
        if (!dataUrl) return;

        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `struk-${transaction.id}.png`, { type: 'image/png' });

        // Cek apakah browser mendukung fitur Share File native (biasanya di Mobile)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Struk Transaksi',
                text: `Berikut adalah struk untuk transaksi #${transaction.id.slice(-6)}.`,
                files: [file],
            });
        } else {
            // Fallback untuk Desktop: Salin gambar ke Clipboard
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob,
                    }),
                ]);
                showAlert({
                    type: 'alert',
                    title: 'Disalin ke Clipboard',
                    message: 'Gambar struk berhasil disalin. Anda dapat menempelkannya (Paste) langsung di WhatsApp Web atau Telegram Desktop.'
                });
            } catch (clipboardError) {
                console.error("Clipboard write failed", clipboardError);
                showAlert({
                    type: 'alert',
                    title: 'Gagal Membagikan',
                    message: 'Browser Anda tidak mendukung fitur berbagi otomatis atau salin gambar. Silakan gunakan tombol "Unduh".'
                });
            }
        }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.log("Aksi berbagi dibatalkan oleh pengguna.");
        } else {
            console.error('Gagal membagikan gambar:', error);
            showAlert({
                type: 'alert',
                title: 'Gagal Membagikan',
                message: 'Terjadi kesalahan saat mencoba membagikan struk.'
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
      <div className="bg-slate-700 p-2 sm:p-4 rounded-lg overflow-y-auto max-h-[50vh]">
        <div className="max-w-xs mx-auto transform scale-95 sm:scale-100 origin-top">
            <Receipt ref={receiptRef} transaction={transaction} settings={receiptSettings} />
        </div>
      </div>
      
      <div className="flex flex-col gap-3 pt-6">
        {/* Row 1: Print Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" onClick={handleBluetoothPrint} className="flex-1" title="Cetak langsung ke Printer Thermal Bluetooth (Android/Desktop)">
                <Icon name="bluetooth" className="w-5 h-5"/>
                <span>Cetak BT</span>
            </Button>
            <Button variant="secondary" onClick={handlePrint} className="flex-1" title="Cetak via browser print dialog">
                <Icon name="printer" className="w-5 h-5"/>
                <span>Cetak PDF</span>
            </Button>
        </div>

        {/* Row 2: Digital Actions (Download & Share) */}
        <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" onClick={handleDownload} className="flex-1" disabled={isProcessing}>
                <Icon name="download" className="w-5 h-5"/>
                <span>{isProcessing ? '...' : 'Unduh'}</span>
            </Button>
            <Button variant="primary" onClick={handleShare} className="flex-1" disabled={isProcessing}>
                <Icon name="share" className="w-5 h-5"/>
                <span>{isProcessing ? '...' : 'Bagikan'}</span>
            </Button>
        </div>

        {/* Row 3: Refund (Full Width) */}
        {transaction.paymentStatus !== 'refunded' && (
            <Button variant="danger" onClick={handleRefund} className="w-full mt-2">
                <Icon name="reset" className="w-5 h-5"/>
                <span>Refund Transaksi</span>
            </Button>
        )}
      </div>
    </Modal>
  );
};

export default ReceiptModal;

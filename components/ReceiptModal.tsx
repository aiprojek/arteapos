
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
import { Capacitor } from '@capacitor/core';

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

  const isAndroid = Capacitor.getPlatform() === 'android';

  useEffect(() => {
    if (imageError) {
        console.error('Gagal membuat gambar struk:', imageError);
        showAlert({ type: 'alert', title: 'Gagal', message: 'Terjadi kesalahan saat memproses gambar.' });
    }
  }, [imageError, showAlert]);

  const handlePrint = () => {
    const receiptElement = receiptRef.current;
    if (!receiptElement) return;
    
    try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showAlert({ type: 'alert', title: 'Gagal', message: 'Pop-up diblokir. Izinkan pop-up untuk situs ini.' });
            return;
        }
        
        const styles = `
          @media print { @page { margin: 0; } body { margin: 0; -webkit-print-color-adjust: exact; } }
        `;
        
        printWindow.document.write(`<html><head><title>Struk</title><script src="https://cdn.tailwindcss.com"></script><style>${styles}</style></head><body>${receiptElement.outerHTML}<script>setTimeout(()=>{window.print();window.onafterprint=()=>window.close();},500);</script></body></html>`);
        printWindow.document.close();
    } catch (e: any) {
        console.error("Print error:", e);
        showAlert({ type: 'alert', title: 'Gagal Mencetak', message: 'Browser memblokir akses pencetakan.' });
    }
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
        console.error(error);
    }
  };

  const handleShare = async () => {
    if (isProcessing) return;
    try {
        const dataUrl = await getImage();
        if (!dataUrl) return;
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `struk-${transaction.id}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
        } else {
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            showAlert({ type: 'alert', title: 'Disalin', message: 'Gambar disalin ke clipboard.' });
        }
    } catch (error) {
        console.error(error);
    }
  };

  const handleRefund = () => {
    showAlert({
        type: 'confirm',
        title: 'Refund?',
        message: 'Stok akan kembali & omzet berkurang.',
        confirmVariant: 'danger',
        onConfirm: () => { refundTransaction(transaction.id); onClose(); }
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
        <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" onClick={handleBluetoothPrint} className={`flex-1 ${isAndroid ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : ''}`} title="Cetak ke Printer Thermal">
                <Icon name="bluetooth" className="w-5 h-5"/>
                <span>Cetak Bluetooth</span>
            </Button>
            <Button variant="secondary" onClick={handlePrint} className="flex-1" title="Cetak via Browser">
                <Icon name="printer" className="w-5 h-5"/>
                <span>PDF / System</span>
            </Button>
        </div>

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

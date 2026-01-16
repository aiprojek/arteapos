
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
  const [receiptRef, { isLoading: isProcessing, getImage }] = useToImage<HTMLDivElement>({
    quality: 0.9,
    backgroundColor: '#ffffff',
  });

  const handleShare = async () => {
    if (isProcessing) return;
    try {
        const dataUrl = await getImage();
        if (!dataUrl) return;

        // KODULAR BRIDGE SHARE
        if (window.AppInventor) {
            window.AppInventor.setWebViewString(`SHARE_IMAGE:${dataUrl}`);
            return;
        }

        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `struk-${transaction.id}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
        } else {
            showAlert({ type: 'alert', title: 'Info', message: 'Fitur Share tidak didukung di browser ini. Gambar telah disalin ke clipboard.' });
        }
    } catch (error) {
        console.error(error);
    }
  };

  const handleBluetoothPrint = async () => {
      await bluetoothPrinterService.printReceipt(transaction, receiptSettings);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Struk Transaksi">
      <div className="bg-slate-700 p-2 sm:p-4 rounded-lg overflow-y-auto max-h-[50vh]">
        <div className="max-w-xs mx-auto">
            <Receipt ref={receiptRef} transaction={transaction} settings={receiptSettings} />
        </div>
      </div>
      
      <div className="flex flex-col gap-3 pt-6">
        <Button variant="primary" onClick={handleBluetoothPrint} className="w-full bg-blue-600 border-none">
            <Icon name="bluetooth" className="w-5 h-5"/> Cetak Struk Bluetooth
        </Button>
        <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={handleShare} disabled={isProcessing}>
                <Icon name="share" className="w-5 h-5"/> Bagikan Struk
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
                <Icon name="printer" className="w-5 h-5"/> PDF / Cetak
            </Button>
        </div>
        {transaction.paymentStatus !== 'refunded' && (
            <Button variant="danger" onClick={() => refundTransaction(transaction.id)} className="w-full mt-2">
                Refund Transaksi
            </Button>
        )}
      </div>
    </Modal>
  );
};

export default ReceiptModal;

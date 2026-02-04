
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Receipt from './Receipt';
import Button from './Button';
import Icon from './Icon';
import { useSettings } from '../context/SettingsContext';
import { useUI } from '../context/UIContext';
import { useFinance } from '../context/FinanceContext';
import { useCustomerDisplay } from '../context/CustomerDisplayContext'; // IMPORT
import type { Transaction as TransactionType } from '../types';
import { useToImage } from '../hooks/useToImage';
import { bluetoothPrinterService } from '../utils/bluetoothPrinter';
import { Capacitor } from '@capacitor/core';
import { shareFileNative } from '../utils/nativeHelper';

declare global {
    interface Window {
        AppInventor?: any;
    }
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionType;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, transaction }) => {
  const { receiptSettings } = useSettings();
  const { showAlert } = useUI();
  const { refundTransaction } = useFinance();
  const { sendDataToDisplay, isDisplayConnected } = useCustomerDisplay(); // NEW
  
  const [isRefundView, setIsRefundView] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const [receiptRef, { isLoading: isProcessing, getImage }] = useToImage<HTMLDivElement>({
    quality: 0.9,
    backgroundColor: '#ffffff',
  });

  // Reset state when modal opens/closes
  useEffect(() => {
      if(isOpen) {
          setIsRefundView(false);
          setRefundReason('');
      }
  }, [isOpen]);

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

        // CAPACITOR NATIVE SHARE
        if (Capacitor.isNativePlatform()) {
            await shareFileNative(`struk-${transaction.id}.png`, dataUrl.split(',')[1], 'Struk Transaksi');
            return;
        }

        // WEB SHARE
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `struk-${transaction.id}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
        } else {
            // Fallback: Copy to clipboard
            try {
                // Clipboard API for images is limited, so we copy as blob
                const item = new ClipboardItem({ "image/png": blob });
                await navigator.clipboard.write([item]);
                showAlert({ type: 'alert', title: 'Info', message: 'Gambar telah disalin ke clipboard.' });
            } catch(e) {
                showAlert({ type: 'alert', title: 'Info', message: 'Browser ini tidak mendukung share gambar.' });
            }
        }
    } catch (error: any) {
        console.error(error);
        showAlert({ type: 'alert', title: 'Error Share', message: error.message });
    }
  };

  const handleBluetoothPrint = async () => {
      try {
          await bluetoothPrinterService.printReceipt(transaction, receiptSettings);
      } catch (e: any) {
          showAlert({ type: 'alert', title: 'Gagal Mencetak', message: e.message });
      }
  };

  const handleConfirmRefund = () => {
      if(!refundReason.trim()) return;
      
      // 1. Execute Logic Refund
      refundTransaction(transaction.id); // Note: Should ideally pass reason to audit log in future update
      
      // 2. Alert Customer Display
      if(isDisplayConnected) {
          sendDataToDisplay({
              type: 'REFUND_ALERT',
              refundReason: refundReason,
              total: transaction.total,
              cartItems: [], subtotal: 0, discount: 0, tax: 0 // Dummy required fields
          });
      }

      onClose();
      showAlert({ type: 'alert', title: 'Refund Berhasil', message: 'Transaksi dibatalkan dan stok dikembalikan.' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRefundView ? "Konfirmasi Refund" : "Struk Transaksi"}>
      
      {isRefundView ? (
          <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg">
                  <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                      <Icon name="warning" className="w-5 h-5"/> Peringatan Keamanan
                  </h4>
                  <p className="text-sm text-slate-300">
                      Tindakan ini akan <strong>menampilkan peringatan di Layar Pelanggan</strong>. 
                      Pastikan Anda memiliki alasan yang valid.
                  </p>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Alasan Refund (Wajib)</label>
                  <input 
                      type="text" 
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Contoh: Salah input menu, Pelanggan cancel..."
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                      autoFocus
                  />
              </div>

              <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setIsRefundView(false)} className="flex-1">Batal</Button>
                  <Button variant="danger" onClick={handleConfirmRefund} disabled={!refundReason} className="flex-1">Proses Refund</Button>
              </div>
          </div>
      ) : (
          <>
            <div className="bg-slate-700 p-2 sm:p-4 rounded-lg overflow-y-auto max-h-[50vh]">
                <div className="max-w-xs mx-auto">
                    <Receipt ref={receiptRef} transaction={transaction} settings={receiptSettings} />
                </div>
            </div>
            
            <div className="flex flex-col gap-3 pt-6">
                
                <Button variant="primary" onClick={handleBluetoothPrint} className="w-full bg-blue-600 border-none">
                    <Icon name="bluetooth" className="w-5 h-5"/> Cetak Bluetooth
                </Button>

                <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={handleShare} disabled={isProcessing}>
                        <Icon name="share" className="w-5 h-5"/> Bagikan
                    </Button>
                    <Button variant="secondary" onClick={() => window.print()}>
                        <Icon name="printer" className="w-5 h-5"/> PDF
                    </Button>
                </div>
                
                {transaction.paymentStatus !== 'refunded' && (
                    <Button variant="danger" onClick={() => setIsRefundView(true)} className="w-full mt-2">
                        Refund Transaksi
                    </Button>
                )}
            </div>
          </>
      )}
    </Modal>
  );
};

export default ReceiptModal;

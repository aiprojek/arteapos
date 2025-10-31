import React, { useEffect, useRef } from 'react';
import KitchenNote from './KitchenNote';
import { useSettings } from '../context/SettingsContext';
import { useUI } from '../context/UIContext';
import type { Transaction as TransactionType } from '../types';
import Icon from './Icon';

interface KitchenNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionType;
}

const KitchenNoteModal: React.FC<KitchenNoteModalProps> = ({ isOpen, onClose, transaction }) => {
  const { receiptSettings } = useSettings();
  const { showAlert } = useUI();
  const noteRef = useRef<HTMLDivElement>(null);
  const hasTriggeredPrint = useRef(false);

  useEffect(() => {
    if (isOpen && !hasTriggeredPrint.current) {
      hasTriggeredPrint.current = true;
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);

      return () => clearTimeout(timer);
    }
    
    if (!isOpen) {
      hasTriggeredPrint.current = false;
    }
  }, [isOpen]);

  const handlePrint = () => {
    const noteElement = noteRef.current;
    if (!noteElement) {
        onClose();
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showAlert({
            type: 'alert',
            title: 'Gagal Membuka Jendela Cetak',
            message: 'Pastikan pop-up diizinkan di pengaturan browser Anda untuk melanjutkan.'
        });
        onClose();
        return;
    }
    
    const styles = `
      @media print {
        @page { 
          margin: 0.2in; 
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
          <title>Catatan Dapur</title>
           <style>${styles}</style>
        </head>
        <body style="font-family: monospace;">
          ${noteElement.outerHTML}
          <script>
              window.print();
              window.onafterprint = () => window.close();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    onClose();
  };

  if (!isOpen) {
      return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-800 rounded-xl shadow-lg p-6 text-center text-white">
          <Icon name="printer" className="w-10 h-10 mx-auto mb-4 animate-pulse" />
          <p>Mempersiapkan catatan dapur...</p>
          <div className="hidden">
            <KitchenNote ref={noteRef} transaction={transaction} settings={receiptSettings} />
          </div>
      </div>
    </div>
  );
};

export default KitchenNoteModal;
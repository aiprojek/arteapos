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
      }, 500); // Increased delay slightly to ensure DOM is ready

      return () => clearTimeout(timer);
    }
    
    if (!isOpen) {
      hasTriggeredPrint.current = false;
    }
  }, [isOpen]);

  const handlePrint = () => {
    const noteElement = noteRef.current;
    if (!noteElement) {
        // Do not auto-close if element not found, let user close.
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showAlert({
            type: 'alert',
            title: 'Gagal Membuka Jendela Cetak',
            message: 'Browser memblokir jendela pop-up. Izinkan pop-up untuk situs ini agar fitur cetak otomatis berfungsi.'
        });
        // Keep modal open so user can try again or close manually
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
    
    // We close the modal after triggering print window
    onClose();
  };

  if (!isOpen) {
      return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-800 rounded-xl shadow-lg p-6 text-center text-white relative w-full max-w-sm mx-auto">
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors"
            aria-label="Tutup"
          >
            <Icon name="close" className="w-6 h-6" />
          </button>

          <Icon name="printer" className="w-12 h-12 mx-auto mb-4 text-[#52a37c] animate-pulse" />
          <h3 className="text-lg font-bold mb-2">Sedang Mencetak...</h3>
          <p className="text-slate-400 text-sm mb-4">
            Mempersiapkan catatan dapur. Jendela cetak akan muncul sebentar lagi.
          </p>
          
          <div className="hidden">
            <KitchenNote ref={noteRef} transaction={transaction} settings={receiptSettings} />
          </div>
          
          <button 
            onClick={() => { hasTriggeredPrint.current = false; handlePrint(); }}
            className="text-sm text-[#52a37c] hover:underline"
          >
            Klik di sini jika tidak muncul
          </button>
      </div>
    </div>
  );
};

export default KitchenNoteModal;
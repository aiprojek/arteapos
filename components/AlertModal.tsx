import React from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';

export type AlertType = 'alert' | 'confirm';
export type AlertVariant = 'primary' | 'danger';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string | React.ReactNode;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: AlertVariant;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'alert',
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  confirmVariant = 'primary'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };
  
  const getIcon = () => {
      if (type === 'confirm' && confirmVariant === 'danger') {
          return <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
              <Icon name="trash" className="h-6 w-6 text-red-400" />
          </div>
      }
       return <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#1a3c2d]/50 sm:mx-0 sm:h-10 sm:w-10">
          <Icon name="logo" className="h-6 w-6 text-[#52a37c]" />
      </div>
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description">
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            {getIcon()}
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-lg font-semibold leading-6 text-white" id="dialog-title">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-slate-400" id="dialog-description">{message}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-xl">
            {type === 'confirm' ? (
                <>
                    <Button onClick={handleConfirm} variant={confirmVariant} className="w-full sm:ml-3 sm:w-auto">
                        {confirmText}
                    </Button>
                    <Button onClick={onClose} variant="secondary" className="mt-3 w-full sm:mt-0 sm:w-auto">
                        {cancelText}
                    </Button>
                </>
            ) : (
                 <Button onClick={onClose} variant="primary" className="w-full sm:w-auto sm:ml-3">
                    OK
                 </Button>
            )}
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
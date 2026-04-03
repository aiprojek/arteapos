
import React, { ReactNode, useEffect } from 'react';
import Icon from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  mobileLayout?: 'dialog' | 'sheet' | 'fullscreen';
  bodyClassName?: string;
  panelClassName?: string;
}

const sizeClassMap: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  full: 'sm:max-w-5xl',
};

const mobileLayoutClassMap: Record<NonNullable<ModalProps['mobileLayout']>, string> = {
  dialog: 'rounded-2xl sm:rounded-xl max-h-[90dvh] sm:max-h-[90vh]',
  sheet: 'rounded-t-2xl sm:rounded-xl max-h-[92dvh] sm:max-h-[90vh]',
  fullscreen: 'rounded-none sm:rounded-xl h-[100dvh] sm:h-auto sm:max-h-[90vh]',
};

const getOverlayAlignment = (mobileLayout: NonNullable<ModalProps['mobileLayout']>) => {
  if (mobileLayout === 'sheet') {
    return 'items-end sm:items-center';
  }

  return 'items-center';
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  mobileLayout = 'dialog',
  bodyClassName = '',
  panelClassName = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/70 flex justify-center z-[1000] p-0 sm:p-4 ${getOverlayAlignment(mobileLayout)}`}>
      <div className={`bg-slate-800 shadow-2xl w-full flex flex-col overflow-hidden ${sizeClassMap[size]} ${mobileLayoutClassMap[mobileLayout]} ${panelClassName}`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-white pr-4">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" title="Tutup (Esc)">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        <div className={`p-4 sm:p-6 overflow-y-auto flex-1 ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

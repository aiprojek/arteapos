
import React from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';

interface ConflictResolveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMerge: () => void;
    onForceOverwrite: () => void;
    isProcessing: boolean;
}

const ConflictResolveModal: React.FC<ConflictResolveModalProps> = ({ isOpen, onClose, onMerge, onForceOverwrite, isProcessing }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Konflik Data Ditemukan">
            <div className="space-y-5 text-center">
                <div className="bg-yellow-900/30 p-4 rounded-full inline-block mb-2">
                    <Icon name="warning" className="w-12 h-12 text-yellow-500" />
                </div>
                
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Data di Cloud Berbeda</h3>
                    <p className="text-sm text-slate-300">
                        Admin lain mungkin telah mengubah data (harga/produk) di Dropbox sejak terakhir kali Anda melakukan sinkronisasi.
                    </p>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-left text-sm space-y-3">
                    <p className="font-bold text-slate-200">Apa yang ingin Anda lakukan?</p>
                    
                    <div className="flex gap-3 items-start">
                        <div className="mt-1"><Icon name="download" className="w-4 h-4 text-green-400"/></div>
                        <div>
                            <strong className="text-green-400 block mb-1">Pilihan 1: Tarik & Gabungkan (Aman)</strong>
                            <p className="text-xs text-slate-400">Download data terbaru dari cloud, lalu gabungkan dengan perubahan lokal Anda. Setelah itu Anda bisa mencoba upload lagi.</p>
                        </div>
                    </div>

                    <div className="border-t border-slate-700 my-1"></div>

                    <div className="flex gap-3 items-start">
                        <div className="mt-1"><Icon name="upload" className="w-4 h-4 text-red-400"/></div>
                        <div>
                            <strong className="text-red-400 block mb-1">Pilihan 2: Timpa Paksa (Bahaya)</strong>
                            <p className="text-xs text-slate-400">Abaikan data di cloud dan ganti sepenuhnya dengan data di perangkat ini. Data admin lain akan hilang.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <Button onClick={onMerge} disabled={isProcessing} className="w-full bg-green-600 hover:bg-green-500 border-none justify-center py-3">
                        {isProcessing ? 'Memproses...' : 'Tarik & Gabungkan (Recommended)'}
                    </Button>
                    
                    <Button onClick={onForceOverwrite} disabled={isProcessing} variant="danger" className="w-full justify-center bg-transparent border border-red-900/50 hover:bg-red-900/20 text-red-400">
                        Timpa Cloud (Force Push)
                    </Button>
                    
                    <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300 underline mt-2">
                        Batalkan
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConflictResolveModal;

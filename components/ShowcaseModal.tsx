
import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';

interface ShowcaseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShowcaseModal: React.FC<ShowcaseModalProps> = ({ isOpen, onClose }) => {
    const [slideIndex, setSlideIndex] = useState(0);

    const slides = [
        {
            title: "Kasir Offline Handal",
            desc: "Jualan lancar tanpa tergantung sinyal internet. Data tersimpan aman di perangkat Anda (Local Database), anti macet dan super cepat.",
            icon: "wifi",
            color: "text-green-400",
            bg: "bg-green-900/30",
            glow: "shadow-green-500/50"
        },
        {
            title: "Multi-Cabang Hemat",
            desc: "Punya banyak cabang? Sinkronisasi laporan omzet dan stok secara otomatis menggunakan akun Dropbox gratisan. Tanpa biaya server mahal.",
            icon: "cloud",
            color: "text-blue-400",
            bg: "bg-blue-900/30",
            glow: "shadow-blue-500/50"
        },
        {
            title: "Ekosistem Layar Ganda",
            desc: "Ubah HP bekas menjadi 'Layar Pelanggan' untuk menampilkan keranjang QRIS, atau 'Layar Dapur' (KDS) untuk koki. Terhubung via WiFi lokal.",
            icon: "cast",
            color: "text-purple-400",
            bg: "bg-purple-900/30",
            glow: "shadow-purple-500/50"
        },
        {
            title: "Smart Inventory & Resep",
            desc: "Bukan cuma stok barang jadi. Artea POS melacak stok bahan baku per gram/ml berdasarkan resep menu yang Anda buat.",
            icon: "boxes",
            color: "text-orange-400",
            bg: "bg-orange-900/30",
            glow: "shadow-orange-500/50"
        },
        {
            title: "Aman & Transparan",
            desc: "Fitur Audit Log mencatat setiap aktivitas sensitif (Hapus item, Refund, Edit Stok) untuk mencegah kecurangan karyawan.",
            icon: "lock",
            color: "text-red-400",
            bg: "bg-red-900/30",
            glow: "shadow-red-500/50"
        }
    ];

    const nextSlide = () => {
        if (slideIndex < slides.length - 1) setSlideIndex(prev => prev + 1);
        else onClose(); // Close on last slide
    };

    const prevSlide = () => {
        if (slideIndex > 0) setSlideIndex(prev => prev - 1);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col h-[550px]">
                
                {/* Image/Icon Area */}
                <div className={`flex-[1.3] flex items-center justify-center p-8 relative overflow-hidden transition-colors duration-500 ${slides[slideIndex].bg}`}>
                    
                    {/* Decorative Elements */}
                    <div key={`deco-${slideIndex}`} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Background Blob */}
                        <div className={`absolute w-[120%] h-[120%] bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl opacity-40`}></div>
                        
                        {/* Rotating Rings */}
                        <div className={`absolute w-64 h-64 border-2 border-white/5 rounded-full animate-[spin_10s_linear_infinite]`}></div>
                        <div className={`absolute w-48 h-48 border border-white/10 rounded-full`}></div>
                        
                        {/* Center Glow */}
                        <div className={`absolute w-32 h-32 ${slides[slideIndex].bg.replace('/30', '/60')} blur-3xl rounded-full`}></div>
                    </div>
                    
                    {/* Main Icon */}
                    <div key={slideIndex} className="relative z-10 animate-fade-in flex flex-col items-center">
                         {/* @ts-ignore */}
                         <Icon 
                            name={slides[slideIndex].icon} 
                            // Gunakan text-[8rem] atau lebih besar untuk memaksa font icon membesar
                            className={`w-40 h-40 text-[8rem] ${slides[slideIndex].color} drop-shadow-2xl filter`} 
                         />
                    </div>

                    <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-black/20 p-1 rounded-full transition-colors z-20">
                        <Icon name="close" className="w-6 h-6"/>
                    </button>
                </div>

                {/* Text Content */}
                <div className="p-6 flex flex-col justify-between flex-1 bg-slate-800 relative z-10 border-t border-slate-700/50">
                    <div key={slideIndex + "_text"} className="animate-fade-in text-center">
                        <h2 className="text-2xl font-bold text-white mb-3">{slides[slideIndex].title}</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">{slides[slideIndex].desc}</p>
                    </div>

                    <div className="mt-4">
                        {/* Dots Indicator */}
                        <div className="flex justify-center gap-2 mb-5">
                            {slides.map((_, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => setSlideIndex(idx)}
                                    className={`h-2 rounded-full transition-all duration-300 ${idx === slideIndex ? `w-8 ${slides[slideIndex].color.replace('text-', 'bg-')}` : 'w-2 bg-slate-600 hover:bg-slate-500'}`} 
                                />
                            ))}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex gap-3">
                            {slideIndex > 0 ? (
                                <Button variant="secondary" onClick={prevSlide} className="flex-1">
                                    Kembali
                                </Button>
                            ) : (
                                <Button variant="secondary" onClick={onClose} className="flex-1">
                                    Tutup
                                </Button>
                            )}
                            <Button onClick={nextSlide} className="flex-[2] shadow-lg shadow-green-900/20">
                                {slideIndex === slides.length - 1 ? "Mulai Sekarang" : "Lanjut"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShowcaseModal;

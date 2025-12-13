
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { APP_LICENSE_ID } from '../constants';
import type { View } from '../types';

interface OnboardingModalsProps {
    setActiveView: (view: View) => void;
}

const OnboardingModals: React.FC<OnboardingModalsProps> = ({ setActiveView }) => {
    const { currentUser } = useAuth();
    const [showAdminWelcome, setShowAdminWelcome] = useState(false);
    const [showStaffBriefing, setShowStaffBriefing] = useState(false);
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [cloudMode, setCloudMode] = useState<'cloud' | 'local'>('local');

    useEffect(() => {
        if (!currentUser) return;

        if (currentUser.role === 'admin') {
            // Cek apakah admin sudah pernah melihat welcome screen
            const hasSeenWelcome = localStorage.getItem('ARTEA_WELCOME_SEEN');
            if (!hasSeenWelcome) {
                setShowAdminWelcome(true);
            }
        } else if (currentUser.role === 'staff') {
            // Cek konfigurasi cloud owner untuk menentukan pesan briefing
            const sbUrl = localStorage.getItem('ARTEA_SB_URL');
            const dbxToken = localStorage.getItem('ARTEA_DBX_TOKEN');
            if (sbUrl || dbxToken) {
                setCloudMode('cloud');
            } else {
                setCloudMode('local');
            }
            // Staff selalu melihat ini setiap kali app dimuat/login ulang (sesi baru)
            setShowStaffBriefing(true);
        }
    }, [currentUser]);

    const handleDismissAdmin = () => {
        localStorage.setItem('ARTEA_WELCOME_SEEN', 'true');
        setShowAdminWelcome(false);
    };

    const handleGoToHelp = () => {
        localStorage.setItem('ARTEA_WELCOME_SEEN', 'true');
        setShowAdminWelcome(false);
        setActiveView('help');
    };

    const handleDismissStaff = () => {
        setShowStaffBriefing(false);
    };

    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            let content = line.trim();
            if(!content) return <br key={idx}/>;
            
            if (content.startsWith('###')) {
                return <h3 key={idx} className="text-lg font-bold text-[#52a37c] mt-4 mb-2">{content.replace('###', '')}</h3>
            }
            if (content.startsWith('**')) {
                return <p key={idx} className="font-bold text-white mt-3 mb-1">{content.replace(/\*\*/g, '')}</p>
            }
            return <p key={idx} className="text-slate-300 leading-relaxed text-sm mb-1">{content.replace(/\*\*/g, '')}</p>
        });
    };

    // --- RENDER ADMIN WELCOME ---
    if (showAdminWelcome) {
        return (
            <Modal isOpen={true} onClose={handleDismissAdmin} title="Selamat Datang di Artea POS!">
                <div className="text-center space-y-6">
                    <div className="flex flex-col items-center">
                        <div className="bg-[#347758]/20 p-4 rounded-full mb-3">
                            <Icon name="logo" className="w-16 h-16 text-[#52a37c]" />
                        </div>
                        <div className="font-arabic text-xl text-[#52a37c] font-medium tracking-wide mb-2">
                            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم
                        </div>
                    </div>
                    
                    <div className="space-y-2 text-slate-300">
                        <p>
                            Terima kasih telah memilih <strong>Artea POS</strong>. Aplikasi kasir ini didesain untuk bekerja 100% Offline di perangkat Anda, namun tetap memiliki fitur canggih seperti manajemen stok, laporan keuangan, dan sinkronisasi cloud opsional.
                        </p>
                        <p className="text-sm bg-slate-900 p-3 rounded-lg border border-slate-700 mt-4">
                            💡 <strong>Tips Awal:</strong> Pastikan Anda mengatur <strong>"Store ID"</strong> di menu Pengaturan jika Anda berencana memiliki lebih dari satu cabang.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button onClick={handleGoToHelp} variant="secondary" className="w-full justify-center">
                            <Icon name="book" className="w-5 h-5"/> Baca Panduan Pengguna (Disarankan)
                        </Button>
                        <Button onClick={handleDismissAdmin} className="w-full justify-center">
                            Mulai Gunakan Aplikasi
                        </Button>
                        
                        <div className="mt-2 text-center">
                            <button 
                                onClick={() => setShowLicenseModal(true)}
                                className="text-[10px] text-slate-500 hover:text-[#52a37c] underline underline-offset-2 transition-colors"
                            >
                                Lisensi: GNU General Public License v3.0 (Klik untuk detail)
                            </button>
                        </div>
                    </div>
                </div>

                {/* License Overlay Modal */}
                {showLicenseModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                        <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center p-4 border-b border-slate-700">
                                <h3 className="font-bold text-white">Lisensi & Hak Cipta</h3>
                                <button onClick={() => setShowLicenseModal(false)} className="text-slate-400 hover:text-white">
                                    <Icon name="close" className="w-6 h-6"/>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                {renderMarkdown(APP_LICENSE_ID)}
                            </div>
                            <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-xl">
                                <Button onClick={() => setShowLicenseModal(false)} className="w-full">Tutup</Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        );
    }

    // --- RENDER STAFF BRIEFING ---
    if (showStaffBriefing) {
        return (
            <Modal isOpen={true} onClose={() => {}} title="Briefing Awal Shift">
                <div className="space-y-5">
                    <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded-r-lg">
                        <h4 className="font-bold text-yellow-400 flex items-center gap-2">
                            <Icon name="warning" className="w-5 h-5"/> PERHATIAN STAF
                        </h4>
                        <p className="text-sm text-yellow-100 mt-1">
                            Aplikasi ini menggunakan mode <strong>{cloudMode === 'cloud' ? 'ONLINE (Cloud)' : 'OFFLINE (Lokal)'}</strong>. Ikuti prosedur berikut:
                        </p>
                    </div>

                    {cloudMode === 'cloud' ? (
                        <div className="space-y-4">
                            {/* Step 1: PULL */}
                            <div className="flex gap-3 items-start">
                                <div className="bg-blue-900/50 w-8 h-8 flex items-center justify-center rounded text-blue-300 font-bold shrink-0">1</div>
                                <div>
                                    <h5 className="font-bold text-white flex items-center gap-2">
                                        Ambil Data Terbaru (PULL)
                                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Wajib Awal Shift</span>
                                    </h5>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Pastikan harga & produk sinkron dengan pusat sebelum berjualan.
                                    </p>
                                    <div className="mt-2 bg-slate-800 p-2 rounded border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                                        <span>👉 Caranya: Klik ikon</span>
                                        <span className="bg-slate-700 border border-slate-600 p-1 rounded"><Icon name="database" className="w-3 h-3"/></span>
                                        <span>di pojok kanan atas header, lalu pilih <strong>"Update dari Pusat"</strong>.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: CASH */}
                            <div className="flex gap-3 items-start">
                                <div className="bg-blue-900/50 w-8 h-8 flex items-center justify-center rounded text-blue-300 font-bold shrink-0">2</div>
                                <div>
                                    <h5 className="font-bold text-white">Cek Modal Kasir</h5>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Klik tombol "Mulai Sesi" dan masukkan jumlah uang cash yang ada di laci.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3: PUSH */}
                            <div className="flex gap-3 items-start">
                                <div className="bg-blue-900/50 w-8 h-8 flex items-center justify-center rounded text-blue-300 font-bold shrink-0">3</div>
                                <div>
                                    <h5 className="font-bold text-white flex items-center gap-2">
                                        Kirim Laporan (PUSH)
                                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Wajib Akhir Shift</span>
                                    </h5>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Saat tutup toko, kirim data penjualan ke server pusat agar Owner bisa memantau.
                                    </p>
                                    <div className="mt-2 bg-slate-800 p-2 rounded border border-slate-700 text-xs text-slate-300">
                                        <span>👉 Caranya: Menu Laporan (tombol di atas daftar produk) {'>'} Kirim Laporan {'>'} Klik tombol <strong>"Sync Cloud"</strong>.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex gap-3 items-start">
                                <div className="bg-slate-700 w-8 h-8 flex items-center justify-center rounded text-white font-bold shrink-0">1</div>
                                <div>
                                    <h5 className="font-bold text-white">Cek Modal Kasir</h5>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Hitung uang receh di laci dan masukkan nominalnya saat menekan tombol "Mulai Sesi".
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="bg-slate-700 w-8 h-8 flex items-center justify-center rounded text-white font-bold shrink-0">2</div>
                                <div>
                                    <h5 className="font-bold text-white">Peringatan Penyimpanan</h5>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Data tersimpan di HP ini. <strong>DILARANG</strong> menghapus cache browser atau data penjualan bisa hilang.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-slate-700">
                        <Button onClick={handleDismissStaff} className="w-full justify-center py-3">
                            Saya Mengerti, Buka Kasir
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    return null;
};

export default OnboardingModals;

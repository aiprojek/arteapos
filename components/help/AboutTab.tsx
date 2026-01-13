
import React from 'react';
import Icon from '../Icon';
import Button from '../Button';

const AboutTab: React.FC = () => {
    return (
        <div className="max-w-2xl mx-auto text-center animate-fade-in space-y-8">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700">
                <Icon name="logo" className="w-20 h-20 text-[#52a37c] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Artea POS</h2>
                <p className="text-slate-400 font-mono text-sm mb-6">Versi 20260113 (Community Edition)</p>
                
                <div className="text-left text-slate-300 space-y-4 mb-8 text-sm leading-relaxed">
                    <p>
                        <strong>Artea POS</strong> adalah aplikasi Point of Sale (POS) atau kasir <em>offline-first</em> berbasis web yang dirancang untuk usaha kecil dan menengah di bidang makanan dan minuman serta usaha lainnya. Aplikasi ini sepenuhnya berjalan di browser Anda, menyimpan semua data secara lokal, sehingga dapat beroperasi dengan lancar meski tanpa koneksi internet.
                    </p>
                    <div className="bg-slate-900/50 p-4 rounded-lg border-l-4 border-[#52a37c] text-slate-400 text-xs sm:text-sm my-4">
                        <strong className="text-white block mb-2 text-base">⚠️ Disclaimer & Latar Belakang</strong>
                        <p className="mb-2">
                            Aplikasi ini awalnya dibuat dan dikembangkan secara spesifik untuk memenuhi kebutuhan operasional internal di lini usaha kami sendiri yang bernama <a href="https://arteagrup.my.id" target="_blank" rel="noopener noreferrer" className="text-[#52a37c] hover:underline font-bold">Artea</a>.
                        </p>
                        <p>
                            Oleh karena itu, fitur-fitur di dalamnya disesuaikan dengan alur kerja (workflow) kami. Kami membagikannya sebagai <em>Open Source</em> agar bermanfaat bagi UMKM lain, namun harap dimaklumi jika fitur belum selengkap aplikasi kasir komersial/berbayar buatan korporat besar.
                        </p>
                    </div>
                    <p>
                        Proyek ini bersifat <em>open-source</em> dengan tujuan menyediakan alternatif aplikasi kasir yang bebas, mudah digunakan, dan dapat diandalkan.
                    </p>

                    {/* Release Notes Link Card */}
                    <a href="https://github.com/aiprojek/arteapos/commits/main/" target="_blank" rel="noopener noreferrer" className="block mt-4 group">
                        <div className="bg-slate-900/50 hover:bg-slate-900 p-4 rounded-lg border border-slate-700 hover:border-[#52a37c] transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-slate-800 text-[#52a37c]">
                                    <Icon name="clock-history" className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-white text-sm group-hover:text-[#52a37c] transition-colors">Catatan Rilis (Changelog)</h4>
                                    <p className="text-xs text-slate-400">Lihat riwayat perubahan dan pembaruan teknis terbaru.</p>
                                </div>
                            </div>
                            <Icon name="share" className="w-4 h-4 text-slate-500 group-hover:text-white" />
                        </div>
                    </a>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4">
                    <a href="https://github.com/aiprojek/arteapos" target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" className="bg-slate-700 hover:bg-slate-600 border border-slate-600">
                            <Icon name="github" className="w-5 h-5" /> GitHub Repo
                        </Button>
                    </a>
                    <a href="https://t.me/aiprojek_community/32" target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-900/50">
                            <Icon name="telegram" className="w-5 h-5" /> Komunitas
                        </Button>
                    </a>
                    <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" className="bg-pink-900/30 text-pink-400 hover:bg-pink-900/50 border border-pink-900/50">
                            <Icon name="donate" className="w-5 h-5" /> Traktir Kopi
                        </Button>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AboutTab;

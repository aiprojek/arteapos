
import React from 'react';
import Icon from '../Icon';
import Button from '../Button';

const formatVersionDate = (date: Date) =>
    `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getFullYear()).slice(-2)}`;

const AboutTab: React.FC = () => {
    const buildDate = new Date();
    const buildLabel = formatVersionDate(buildDate);

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 shadow-[0_16px_50px_rgba(15,23,42,0.28)]">
                <div className="px-6 py-8 sm:px-8 sm:py-10">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-5 rounded-3xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
                            <Icon name="logo" className="w-20 h-20 sm:w-24 sm:h-24 text-[#52a37c]" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">Artea POS</h2>
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-mono text-slate-300">
                                Build {buildLabel}
                            </span>
                        </div>
                        <p className="mt-5 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
                            Aplikasi kasir <em>offline-first</em> yang dirancang untuk membantu operasional usaha tetap berjalan lancar, termasuk saat koneksi internet sedang tidak tersedia.
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-700/80 bg-slate-800/80 p-5 sm:p-6 space-y-5 shadow-[0_10px_35px_rgba(15,23,42,0.22)]">
                <div className="space-y-3 text-sm sm:text-[15px] text-slate-300 leading-relaxed">
                    <p>
                        <strong>Artea POS</strong> adalah aplikasi Point of Sale (POS) berbasis web yang dibangun untuk kebutuhan usaha kecil dan menengah, khususnya di bidang makanan dan minuman. Data aplikasi disimpan langsung di perangkat, sehingga operasional inti tetap bisa berjalan lebih tenang.
                    </p>
                    <p>
                        Proyek ini dibagikan sebagai <em>open-source</em> agar bisa bermanfaat bagi lebih banyak pelaku usaha yang membutuhkan aplikasi kasir yang ringan, fleksibel, dan mudah diandalkan.
                    </p>
                </div>

                <div className="rounded-2xl border border-[#52a37c]/30 bg-slate-900/60 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-[#52a37c]/10 p-2 text-[#52a37c] shrink-0">
                            <Icon name="info-circle" className="w-5 h-5" />
                        </div>
                        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
                            <h3 className="font-bold text-white text-base">Latar Belakang</h3>
                            <p>
                                Aplikasi ini awalnya dibuat untuk kebutuhan operasional internal usaha kami sendiri yang bernama <a href="https://arteagrup.my.id" target="_blank" rel="noopener noreferrer" className="text-[#52a37c] hover:underline font-bold">Artea</a>.
                            </p>
                            <p>
                                Karena itu, beberapa alur dan fitur mengikuti kebutuhan nyata di lapangan. Kami membagikannya agar bisa berguna untuk UMKM lain, walau tentu pengembangannya masih terus bertahap.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <a href="https://github.com/aiprojek/arteapos/commits/main/" target="_blank" rel="noopener noreferrer" className="block group">
                    <div className="h-full rounded-3xl border border-slate-700/80 bg-slate-800/80 p-4 sm:p-5 transition-all hover:border-[#52a37c] hover:bg-slate-800 shadow-[0_10px_35px_rgba(15,23,42,0.22)]">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-slate-900/80 p-3 text-[#52a37c]">
                                    <Icon name="clock-history" className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm sm:text-base group-hover:text-[#52a37c] transition-colors">Catatan Rilis</h4>
                                    <p className="text-xs sm:text-sm text-slate-400">Lihat perubahan dan pembaruan terbaru proyek.</p>
                                </div>
                            </div>
                            <Icon name="share" className="w-4 h-4 text-slate-500 group-hover:text-white" />
                        </div>
                    </div>
                </a>

                <div className="rounded-3xl border border-slate-700/80 bg-slate-800/80 p-4 sm:p-5 shadow-[0_10px_35px_rgba(15,23,42,0.22)]">
                    <h3 className="font-bold text-white text-sm sm:text-base mb-3">Tautan Komunitas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <a href="https://github.com/aiprojek/arteapos" target="_blank" rel="noopener noreferrer">
                            <Button variant="utility" className="w-full h-11">
                                <Icon name="github" className="w-5 h-5" /> GitHub
                            </Button>
                        </a>
                        <a href="https://t.me/aiprojek_community/32" target="_blank" rel="noopener noreferrer">
                            <Button variant="operational" className="w-full h-11 border-blue-900/50 bg-blue-900/20 text-blue-300 hover:bg-blue-900/30">
                                <Icon name="telegram" className="w-5 h-5" /> Komunitas
                            </Button>
                        </a>
                        <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer">
                            <Button variant="operational" className="w-full h-11 border-pink-900/50 bg-pink-900/20 text-pink-300 hover:bg-pink-900/30">
                                <Icon name="donate" className="w-5 h-5" /> Dukung
                            </Button>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutTab;

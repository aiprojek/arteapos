
import React, { useState } from 'react';
import Icon from '../components/Icon';
import Button from '../components/Button';

// Types for Accordion
interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    icon?: 'question' | 'wifi' | 'database' | 'printer' | 'cash' | 'products' | 'users' | 'warning' | 'tag' | 'plus';
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, isOpen, onToggle, icon = 'question' }) => (
    <div className={`border rounded-lg transition-all duration-300 overflow-hidden mb-3 ${isOpen ? 'border-[#347758] bg-slate-800' : 'border-slate-700 bg-slate-800/50'}`}>
        <button 
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 text-left focus:outline-none group"
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-[#347758]/20 text-[#52a37c]' : 'bg-slate-700 text-slate-400 group-hover:text-slate-200'}`}>
                    <Icon name={icon} className="w-5 h-5" />
                </div>
                <span className={`font-semibold text-sm sm:text-base ${isOpen ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{title}</span>
            </div>
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} className={`w-5 h-5 transition-colors ${isOpen ? 'text-[#52a37c]' : 'text-slate-500'}`} />
        </button>
        <div 
            className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
            <div className="p-4 pt-0 border-t border-slate-700/50 text-slate-300 text-sm leading-relaxed space-y-2 bg-slate-900/30">
                {children}
            </div>
        </div>
    </div>
);

const QuickStartCard: React.FC<{ step: number; title: string; description: React.ReactNode; icon: 'cash' | 'products' | 'reports' | 'settings' | 'users' | 'wifi' }> = ({ step, title, description, icon }) => (
    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm relative group hover:border-[#52a37c]/50 transition-colors h-full flex flex-col">
        <div className="absolute -top-3 -left-3 w-8 h-8 bg-[#347758] rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-slate-900">
            {step}
        </div>
        <div className="mb-4 text-[#7ac0a0] self-start bg-[#347758]/10 p-2 rounded-lg">
            <Icon name={icon} className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <div className="text-sm text-slate-400 flex-grow">
            {description}
        </div>
    </div>
);

const HelpView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'quick-start' | 'faq' | 'about'>('quick-start');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(prev => prev === id ? null : id);
    };

    const tabs = [
        { id: 'quick-start', label: 'Panduan Cepat', icon: 'play' },
        { id: 'faq', label: 'FAQ & Detail', icon: 'book' },
        { id: 'about', label: 'Tentang', icon: 'info-circle' },
    ] as const;

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="text-center py-8">
                <div className="inline-block p-3 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-lg">
                    <Icon name="logo" className="w-12 h-12 text-[#52a37c]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Pusat Bantuan</h1>
                <p className="text-slate-400 mt-2 max-w-xl mx-auto text-sm sm:text-base">
                    Pelajari cara menggunakan Artea POS secara maksimal untuk bisnis Anda.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center mb-8 sticky top-0 z-20 bg-slate-900/90 backdrop-blur-sm py-2">
                <div className="bg-slate-800 p-1 rounded-xl flex gap-1 shadow-lg border border-slate-700">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                                ${activeTab === tab.id 
                                    ? 'bg-[#347758] text-white shadow-md transform scale-105' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            <Icon name={tab.icon} className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content: Quick Start */}
            {activeTab === 'quick-start' && (
                <div className="animate-fade-in space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <QuickStartCard 
                            step={1} 
                            icon="wifi" 
                            title="Instalasi (Wajib)" 
                            description={
                                <>
                                    <p className="mb-2">Agar aplikasi berjalan offline 100% dan layar penuh:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong>Android (Chrome):</strong> Buka menu (titik tiga) {'>'} "Install App" atau "Tambahkan ke Layar Utama".</li>
                                        <li><strong>iOS (Safari):</strong> Klik tombol Share {'>'} "Add to Home Screen".</li>
                                        <li><strong>PC/Laptop:</strong> Klik ikon install di ujung kanan address bar.</li>
                                    </ul>
                                </>
                            }
                        />
                        <QuickStartCard 
                            step={2} 
                            icon="settings" 
                            title="Pengaturan Toko" 
                            description="Masuk ke menu Pengaturan. Sesuaikan nama toko, alamat, dan pesan footer struk. Aktifkan fitur 'Lacak Stok' atau 'Resep Bahan Baku' jika bisnis Anda membutuhkannya."
                        />
                        <QuickStartCard 
                            step={3} 
                            icon="products" 
                            title="Input Produk" 
                            description="Tambahkan menu Anda. Masukkan harga modal (opsional) untuk menghitung laba. Gunakan kamera HP untuk memotret produk atau scan barcode kemasan."
                        />
                        <QuickStartCard 
                            step={4} 
                            icon="users" 
                            title="Mulai Sesi (Shift)" 
                            description="Penting! Di menu Laporan, klik 'Mulai Sesi'. Masukkan uang modal di laci (kasir). Ini memastikan perhitungan setoran akhir hari akurat."
                        />
                        <QuickStartCard 
                            step={5} 
                            icon="cash" 
                            title="Transaksi Kasir" 
                            description="Pilih produk, lalu tekan 'Bayar' (atau F2). Jika ada kembalian, sistem akan menghitungnya. Struk bisa dicetak (printer thermal bluetooth/USB) atau dikirim via gambar."
                        />
                        <QuickStartCard 
                            step={6} 
                            icon="reports" 
                            title="Tutup Kasir" 
                            description="Saat toko tutup, kembali ke menu Laporan dan klik 'Tutup Sesi'. Hitung uang fisik di laci dan input ke sistem untuk melihat selisih. Download laporan CSV untuk arsip."
                        />
                    </div>
                    
                    <div className="bg-gradient-to-r from-[#347758]/20 to-slate-800 border border-[#347758]/30 p-6 rounded-xl flex flex-col md:flex-row items-start gap-6">
                        <div className="bg-[#347758] p-3 rounded-xl text-white shrink-0 shadow-lg">
                            <Icon name="keyboard" className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Tips Pro: Jalan Pintas Keyboard</h3>
                            <p className="text-slate-300 text-sm mb-4">Percepat pelayanan kasir menggunakan keyboard fisik (PC/Laptop/Tablet dengan keyboard bluetooth):</p>
                            <div className="flex flex-wrap gap-3">
                                <div className="px-4 py-2 bg-slate-900/80 rounded-lg border border-slate-600 flex items-center gap-2">
                                    <span className="font-mono text-yellow-400 font-bold">Ctrl + K</span>
                                    <span className="text-slate-400 text-xs">atau</span>
                                    <span className="font-mono text-yellow-400 font-bold">/</span>
                                    <span className="text-white text-sm">= Cari Produk</span>
                                </div>
                                <div className="px-4 py-2 bg-slate-900/80 rounded-lg border border-slate-600 flex items-center gap-2">
                                    <span className="font-mono text-yellow-400 font-bold">F2</span>
                                    <span className="text-white text-sm">= Bayar Sekarang</span>
                                </div>
                                <div className="px-4 py-2 bg-slate-900/80 rounded-lg border border-slate-600 flex items-center gap-2">
                                    <span className="font-mono text-yellow-400 font-bold">Esc</span>
                                    <span className="text-white text-sm">= Batal / Tutup Pop-up</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content: FAQ */}
            {activeTab === 'faq' && (
                <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                    
                    {/* Kategori: Umum */}
                    <div>
                        <h3 className="text-lg font-bold text-[#52a37c] mb-3 flex items-center gap-2 uppercase tracking-wider text-xs">
                            <Icon name="settings" className="w-4 h-4" /> Umum & Teknis
                        </h3>
                        <AccordionItem title="Apakah aplikasi ini benar-benar offline?" isOpen={openAccordion === 'offline'} onToggle={() => toggleAccordion('offline')} icon="wifi">
                            <p><strong>Ya, 100%.</strong></p>
                            <p>Setelah Anda membuka aplikasi ini pertama kali (dan aset selesai dimuat), Anda bisa mematikan internet total. Semua data disimpan di <i>browser database</i> (IndexedDB) perangkat Anda. Tidak ada data yang dikirim ke server cloud kami.</p>
                        </AccordionItem>
                        <AccordionItem title="Bagaimana jika saya ganti HP/Laptop?" isOpen={openAccordion === 'device'} onToggle={() => toggleAccordion('device')} icon="warning">
                            <p className="text-yellow-300 font-bold">PENTING:</p>
                            <p>Karena data disimpan lokal, data di HP A <strong>tidak otomatis muncul</strong> di HP B. Untuk pindah perangkat:</p>
                            <ol className="list-decimal pl-5 mt-2 space-y-1">
                                <li>Di perangkat lama: Buka <strong>Pengaturan {'>'} Manajemen Data {'>'} Backup Data (JSON)</strong>. File akan terunduh.</li>
                                <li>Kirim file tersebut ke perangkat baru (via WA/Email/Flashdisk).</li>
                                <li>Di perangkat baru: Buka <strong>Pengaturan {'>'} Restore Data</strong> dan pilih file tadi.</li>
                            </ol>
                        </AccordionItem>
                        <AccordionItem title="Bagaimana cara print struk?" isOpen={openAccordion === 'print'} onToggle={() => toggleAccordion('print')} icon="printer">
                            <p>Saat transaksi selesai, ada 2 opsi cetak:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-2">
                                <li>
                                    <strong>Cetak BT (Rekomendasi untuk Android):</strong> 
                                    <br/>Menghubungkan langsung ke printer thermal Bluetooth tanpa aplikasi tambahan. 
                                    <br/><span className="text-xs text-yellow-300">*Hanya berfungsi di Chrome Android & Desktop. Belum support iOS.</span>
                                </li>
                                <li>
                                    <strong>Cetak PDF (Universal):</strong> 
                                    <br/>Membuka dialog cetak browser standar. Di laptop/PC, gunakan ini untuk print ke printer USB. 
                                    <br/>Di Android, ini bisa disimpan sebagai PDF atau dicetak menggunakan layanan plugin printer (seperti RawBT atau layanan bawaan merek printer).
                                </li>
                            </ul>
                        </AccordionItem>
                    </div>

                    {/* Kategori: Transaksi */}
                    <div>
                        <h3 className="text-lg font-bold text-[#52a37c] mb-3 flex items-center gap-2 uppercase tracking-wider text-xs">
                            <Icon name="cash" className="w-4 h-4" /> Transaksi & Kasir
                        </h3>
                        <AccordionItem title="Apa fungsi 'Simpan Pesanan' (Open Bill)?" isOpen={openAccordion === 'hold'} onToggle={() => toggleAccordion('hold')} icon="users">
                            <p>Fitur ini berguna untuk kafe/restoran di mana pelanggan pesan dulu, duduk, lalu bayar belakangan (atau tambah pesanan).</p>
                            <p className="mt-2"><strong>Cara pakai:</strong></p>
                            <ol className="list-decimal pl-5 space-y-1">
                                <li>Aktifkan dulu di <strong>Pengaturan {'>'} Sesi Penjualan</strong>.</li>
                                <li>Di Kasir, masukkan item, lalu klik tombol "Simpan Pesanan" (ikon plus).</li>
                                <li>Beri nama (misal: "Meja 5").</li>
                                <li>Anda bisa melayani pelanggan lain. Untuk kembali ke Meja 5, klik tab "Meja 5" di atas daftar produk.</li>
                            </ol>
                        </AccordionItem>
                        <AccordionItem title="Salah input transaksi, bisa dibatalkan/refund?" isOpen={openAccordion === 'refund'} onToggle={() => toggleAccordion('refund')} icon="question">
                            <p><strong>Ya, bisa.</strong></p>
                            <p className="mt-2">Caranya:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Buka menu <strong>Laporan</strong>.</li>
                                <li>Cari transaksi yang ingin dibatalkan.</li>
                                <li>Klik tombol <strong>Aksi</strong>, lalu pilih <strong>Refund</strong>.</li>
                                <li>Stok produk dan poin pelanggan (jika ada) akan otomatis dikembalikan. Uang penjualan juga akan dikurangi dari total laporan.</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Apakah bisa diskon per item dan diskon total?" isOpen={openAccordion === 'discount'} onToggle={() => toggleAccordion('discount')} icon="tag">
                            <p><strong>Bisa keduanya.</strong></p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>Diskon per item:</strong> Klik ikon label (tag) pada baris produk di keranjang.</li>
                                <li><strong>Diskon total (Keranjang):</strong> Klik tombol "Diskon Keranjang" di bagian bawah panel kasir.</li>
                            </ul>
                            <p className="mt-2 text-xs text-slate-400">Tips: Anda bisa membuat preset diskon (misal: "Promo Merdeka 17%") di menu Pengaturan agar tidak perlu ketik manual terus.</p>
                        </AccordionItem>
                    </div>

                    {/* Kategori: Produk & Stok */}
                    <div>
                        <h3 className="text-lg font-bold text-[#52a37c] mb-3 flex items-center gap-2 uppercase tracking-wider text-xs">
                            <Icon name="products" className="w-4 h-4" /> Produk & Stok
                        </h3>
                        <AccordionItem title="Apa bedanya 'Lacak Stok' dan 'Resep'?" isOpen={openAccordion === 'stock'} onToggle={() => toggleAccordion('stock')} icon="database">
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Lacak Stok (Simple):</strong> Digunakan untuk barang jadi. Contoh: Jual Coca-Cola kaleng. Beli 10, laku 1, sisa 9.</li>
                                <li><strong>Resep / Bahan Baku (Advanced):</strong> Digunakan untuk barang racikan. Contoh: Jual "Kopi Susu". 
                                    <br/>Anda tidak stok "Kopi Susu", tapi stok "Biji Kopi" (gram) dan "Susu" (ml). 
                                    <br/>Setiap "Kopi Susu" terjual, sistem otomatis mengurangi stok Biji Kopi 18gr dan Susu 100ml.</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Bagaimana cara input stok awal?" isOpen={openAccordion === 'input_stock'} onToggle={() => toggleAccordion('input_stock')} icon="plus">
                            <ol className="list-decimal pl-5 space-y-1">
                                <li>Masuk menu <strong>Produk</strong> (atau Bahan Baku).</li>
                                <li>Edit produk, centang "Lacak Stok".</li>
                                <li>Masukkan jumlah stok saat ini.</li>
                                <li>Untuk penambahan stok berikutnya (Belanja), gunakan menu <strong>Keuangan {'>'} Pembelian</strong> agar tercatat sebagai pengeluaran modal, ATAU klik ikon tambah (+) kecil di sebelah stok pada tabel Produk untuk penyesuaian cepat.</li>
                            </ol>
                        </AccordionItem>
                    </div>

                </div>
            )}

            {/* Content: About */}
            {activeTab === 'about' && (
                <div className="max-w-2xl mx-auto text-center animate-fade-in space-y-8">
                    <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700">
                        <Icon name="logo" className="w-20 h-20 text-[#52a37c] mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Artea POS</h2>
                        <p className="text-slate-400 font-mono text-sm mb-6">Versi 2.1.0 (PWA Ready)</p>
                        
                        <p className="text-slate-300 mb-8 leading-relaxed">
                            Aplikasi Point of Sale (POS) offline-first yang modern, gratis, dan open-source. 
                            Dirancang khusus untuk membantu UMKM Indonesia mengelola bisnis dengan lebih cerdas, 
                            tanpa biaya langganan, dan tanpa ketergantungan internet.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 text-left bg-slate-900/50 p-6 rounded-xl mb-8 border border-slate-700/50">
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Lisensi</span>
                                <p className="text-white mt-1">GNU GPL v3.0 (Open Source)</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Database</span>
                                <p className="text-white mt-1">IndexedDB (Lokal di Browser)</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Privasi</span>
                                <p className="text-white mt-1">Data 100% milik Anda. Tidak ada tracking.</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Developer</span>
                                <p className="text-[#52a37c] font-semibold mt-1">AI Projek</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-4">
                            <a href="https://github.com/aiprojek/arteapos" target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" className="bg-slate-700 hover:bg-slate-600 border border-slate-600">
                                    <Icon name="github" className="w-5 h-5" /> GitHub Repo
                                </Button>
                            </a>
                            <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" className="bg-pink-900/30 text-pink-400 hover:bg-pink-900/50 border border-pink-900/50">
                                    <Icon name="donate" className="w-5 h-5" /> Traktir Kopi
                                </Button>
                            </a>
                            <a href="https://t.me/aiprojek_community" target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" className="bg-sky-900/30 text-sky-400 hover:bg-sky-900/50 border border-sky-900/50">
                                    <Icon name="telegram" className="w-5 h-5" /> Gabung Komunitas
                                </Button>
                            </a>
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-600">
                        Dibuat dengan ❤️ dan ☕ oleh komunitas untuk komunitas.
                    </p>
                </div>
            )}
        </div>
    );
};

export default HelpView;

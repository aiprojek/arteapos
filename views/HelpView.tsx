
import React, { useState } from 'react';
import Icon from '../components/Icon';
import Button from '../components/Button';

// Types for Accordion
interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    icon?: 'question' | 'wifi' | 'database' | 'printer' | 'cash' | 'products' | 'users' | 'warning' | 'tag' | 'plus' | 'settings' | 'award' | 'download' | 'reports' | 'finance' | 'chat' | 'lock' | 'share';
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
            className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
            <div className="p-4 pt-0 border-t border-slate-700/50 text-slate-300 text-sm leading-relaxed space-y-3 bg-slate-900/30">
                {children}
            </div>
        </div>
    </div>
);

const FlowStep: React.FC<{ number: number; title: string; desc: string; icon: any }> = ({ number, title, desc, icon }) => (
    <div className="relative flex flex-col items-center text-center p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-md flex-1 min-w-[160px] z-10">
        <div className="absolute -top-3 -left-3 w-8 h-8 bg-[#347758] rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-slate-900 z-10">
            {number}
        </div>
        <div className="mb-3 text-[#7ac0a0] bg-[#347758]/10 p-3 rounded-full">
            <Icon name={icon} className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-white mb-1">{title}</h4>
        <p className="text-xs text-slate-400 leading-snug">{desc}</p>
    </div>
);

const HelpView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'flow' | 'features' | 'about'>('flow');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(prev => prev === id ? null : id);
    };

    const tabs = [
        { id: 'flow', label: 'Mulai & Alur', icon: 'play' },
        { id: 'features', label: 'Fitur & Panduan', icon: 'book' },
        { id: 'about', label: 'Tentang', icon: 'info-circle' },
    ] as const;

    // Comprehensive feature list based on actual codebase capabilities
    const featureList = [
        { title: 'Offline 100%', desc: 'Tanpa internet.', icon: 'wifi' },
        { title: 'POS Cepat', desc: 'Transaksi kilat.', icon: 'cash' },
        { title: 'AI Cerdas', desc: 'Analisis bisnis.', icon: 'chat' },
        { title: 'Stok & Resep', desc: 'Lacak bahan baku.', icon: 'database' },
        { title: 'Produk Bundling', desc: 'Paket hemat.', icon: 'products' },
        { title: 'Utang Piutang', desc: 'Catat kasbon.', icon: 'pay' },
        { title: 'Varian Harga', desc: 'Regular / Jumbo.', icon: 'tag' },
        { title: 'Pajak & Service', desc: 'PB1 otomatis.', icon: 'finance' },
        { title: 'Promo & Diskon', desc: 'Atur potongan.', icon: 'tag' },
        { title: 'Laporan Aman', desc: 'Anti-edit staf.', icon: 'lock' },
        { title: 'Laporan', desc: 'Analisis omzet.', icon: 'reports' },
        { title: 'Order Dapur', desc: 'Cetak pesanan.', icon: 'check-circle-fill' },
        { title: 'Multi User', desc: 'Admin & Kasir.', icon: 'users' },
        { title: 'Membership', desc: 'Poin pelanggan.', icon: 'award' },
        { title: 'Printer BT', desc: 'Cetak struk.', icon: 'printer' },
        { title: 'Data Pemasok', desc: 'Beli stok.', icon: 'ingredients' },
        { title: 'Open Bill', desc: 'Simpan pesanan.', icon: 'plus' },
        { title: 'Barcode', desc: 'Scan kamera.', icon: 'barcode' },
        { title: 'Backup Data', desc: 'Aman & lokal.', icon: 'download' },
    ];

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="text-center py-8">
                <div className="inline-block p-3 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-lg">
                    <Icon name="logo" className="w-12 h-12 text-[#52a37c]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Pusat Bantuan</h1>
                <p className="text-slate-400 mt-2 max-w-xl mx-auto text-sm sm:text-base">
                    Pelajari cara menggunakan Artea POS dari awal hingga mahir.
                </p>
            </div>

            {/* Tab Navigation - Fixed Spacing Logic */}
            <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-8 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 flex justify-center transition-all shadow-sm">
                <div className="bg-slate-800 p-1 rounded-xl flex gap-1 shadow-lg border border-slate-700">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                                ${activeTab === tab.id 
                                    ? 'bg-[#347758] text-white shadow-md transform scale-105' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            <Icon name={tab.icon as any} className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content: Flow & Start */}
            {activeTab === 'flow' && (
                <div className="animate-fade-in space-y-8">
                    
                    {/* User Flow Diagram */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 px-2">
                            <Icon name="trending-up" className="w-5 h-5 text-[#52a37c]" /> Skema Arus Penggunaan
                        </h3>
                        
                        {/* Scroll Container */}
                        <div className="w-full overflow-x-auto pb-4">
                            {/* Inner Container - Updated to be strictly horizontal (flex-row) with min-width */}
                            <div className="flex flex-row gap-6 relative min-w-[950px] p-6">
                                {/* Connector Line (Visible on all screens now) */}
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 z-0 -translate-y-1/2 mx-6"></div>
                                
                                <FlowStep 
                                    number={1} 
                                    title="Persiapan" 
                                    desc="Atur Profil Toko, Keamanan, & Fitur di Pengaturan." 
                                    icon="settings" 
                                />
                                <FlowStep 
                                    number={2} 
                                    title="Data" 
                                    desc="Input Kategori, Bahan Baku, & Produk." 
                                    icon="products" 
                                />
                                <FlowStep 
                                    number={3} 
                                    title="Buka Kasir" 
                                    desc="Mulai Sesi Shift & Masukkan Modal Awal." 
                                    icon="users" 
                                />
                                <FlowStep 
                                    number={4} 
                                    title="Transaksi" 
                                    desc="Layani Pelanggan, Diskon, & Terima Pembayaran." 
                                    icon="cash" 
                                />
                                <FlowStep 
                                    number={5} 
                                    title="Tutup & Laporan" 
                                    desc="Tutup Sesi, Rekap Kas, & Analisis Laporan." 
                                    icon="reports" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4">Langkah Pertama (Wajib)</h3>
                        <ul className="space-y-4 text-sm text-slate-300">
                            <li className="flex gap-3">
                                <div className="bg-[#347758]/20 p-2 rounded-lg h-fit"><Icon name="wifi" className="w-5 h-5 text-[#52a37c]"/></div>
                                <div>
                                    <strong className="text-white block mb-1">1. Instalasi Aplikasi</strong>
                                    Untuk performa terbaik, instal aplikasi ini ke perangkat Anda (PWA).
                                    <ul className="list-disc pl-5 mt-1 text-xs text-slate-400">
                                        <li>Android (Chrome): Menu {'>'} "Install App" / "Tambahkan ke Layar Utama".</li>
                                        <li>iOS (Safari): Share {'>'} "Add to Home Screen".</li>
                                        <li>PC (Chrome/Edge): Klik ikon instal di pojok kanan kolom alamat.</li>
                                    </ul>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="bg-[#347758]/20 p-2 rounded-lg h-fit"><Icon name="settings" className="w-5 h-5 text-[#52a37c]"/></div>
                                <div>
                                    <strong className="text-white block mb-1">2. Konfigurasi Awal</strong>
                                    Buka menu <strong>Pengaturan</strong> untuk mengatur Nama Toko, Alamat, dan mengaktifkan fitur-fitur penting seperti <strong>Sesi Kasir</strong> atau <strong>Inventaris</strong> sesuai kebutuhan bisnis Anda.
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Content: Detailed Features */}
            {activeTab === 'features' && (
                <div className="animate-fade-in space-y-10">
                    
                    {/* Feature Scrollable List - Width Aligned with Accordion */}
                    <div className="max-w-3xl mx-auto">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Icon name="star-fill" className="w-5 h-5 text-[#52a37c]" /> Fitur Unggulan
                        </h3>
                        <div className="w-full overflow-x-auto pb-4 -mx-1 px-1">
                            <div className="flex gap-3">
                                {featureList.map((feat, idx) => (
                                    <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-[#347758] transition-colors group flex-shrink-0 w-36 flex flex-col justify-between">
                                        <div>
                                            <div className="bg-[#347758]/10 w-fit p-2 rounded-lg mb-3 group-hover:bg-[#347758]/20 transition-colors">
                                                <Icon name={feat.icon as any} className="w-6 h-6 text-[#52a37c]" />
                                            </div>
                                            <h4 className="font-bold text-white text-sm mb-1 group-hover:text-[#52a37c] transition-colors">{feat.title}</h4>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-tight mt-2">{feat.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Feature Details Accordion */}
                    <div className="max-w-3xl mx-auto space-y-10 border-t border-slate-700 pt-8">
                        
                        {/* Section: Skenario Lapangan (NEW) */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="users" className="w-5 h-5" /> Skenario Penggunaan Lapangan
                            </h3>
                            <AccordionItem title="Sistem Tunggal (Owner Jaga Sendiri)" isOpen={openAccordion === 'single_device'} onToggle={() => toggleAccordion('single_device')} icon="users">
                                <p>Skenario ini paling sederhana. Anda menggunakan <strong>satu perangkat (HP/Tablet)</strong> untuk semuanya.</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-300">
                                    <li>Login sebagai <strong>Admin</strong>.</li>
                                    <li>Anda memiliki akses penuh: Kasir, Laporan, Stok, dan Keuangan dalam satu aplikasi.</li>
                                    <li>Data tersimpan aman di perangkat tersebut.</li>
                                    <li>Jangan lupa rutin melakukan <strong>Backup Data</strong> ke Google Drive/WA untuk keamanan jika HP hilang/rusak.</li>
                                </ul>
                            </AccordionItem>
                            
                            <AccordionItem title="Sistem Terpisah (Owner & Staf Beda Lokasi)" isOpen={openAccordion === 'split_device'} onToggle={() => toggleAccordion('split_device')} icon="share">
                                <p>Skenario ini digunakan jika Owner tidak di toko, dan ada Staf yang menjaga kasir menggunakan HP Toko.</p>
                                <div className="mt-3 space-y-4">
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-white text-xs mb-2">1. Di Perangkat Toko (HP Staf):</h5>
                                        <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                                            <li>Staf login sebagai <strong>Kasir/Staff</strong> (Akses terbatas).</li>
                                            <li>Staf melakukan penjualan seharian.</li>
                                            <li>Saat tutup toko, Staf klik tombol <strong>"Laporan"</strong> di pojok kanan atas kasir.</li>
                                            <li>Pilih <strong>"Laporan Aman (Anti-Edit)"</strong> dan kirim via WhatsApp ke Owner.</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-white text-xs mb-2">2. Di Perangkat Owner (HP Rumah):</h5>
                                        <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                                            <li>Owner menerima pesan WA berisi ringkasan dan <strong>KODE TERENKRIPSI</strong>.</li>
                                            <li>Owner membuka aplikasi Artea POS di HP-nya sendiri (Login Admin).</li>
                                            <li>Masuk ke <strong>Pengaturan {'>'} Laporan & Transaksi Lama</strong>.</li>
                                            <li>Klik <strong>"Paste Teks (Encrypted)"</strong> dan tempel kode dari WA tadi.</li>
                                            <li><strong>Hasil:</strong> Data penjualan hari itu akan masuk ke HP Owner, sehingga Owner bisa melihat grafik, laba, dan stok terkini tanpa perlu memegang HP Toko.</li>
                                        </ul>
                                    </div>
                                </div>
                            </AccordionItem>
                        </div>

                        {/* Section 1: Pengaturan & Keamanan */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="settings" className="w-5 h-5" /> Konfigurasi & Keamanan
                            </h3>
                            <AccordionItem title="Keamanan & Multi-Pengguna (PIN)" isOpen={openAccordion === 'auth'} onToggle={() => toggleAccordion('auth')} icon="users">
                                <p>Secara default, keamanan dimatikan untuk kemudahan awal. Untuk mengaktifkan:</p>
                                <ol className="list-decimal pl-5 space-y-1 mb-3">
                                    <li>Buka <strong>Pengaturan {'>'} Keamanan & Akses Pengguna</strong>.</li>
                                    <li>Aktifkan tombol "Multi-Pengguna & Login PIN".</li>
                                    <li>PIN Default Admin pertama: <strong>1111</strong>.</li>
                                </ol>

                                <h4 className="font-bold text-white mt-4 mb-2 flex items-center gap-2">
                                    <Icon name="chat" className="w-4 h-4 text-[#52a37c]"/> Skema Pemulihan PIN Staf
                                </h4>
                                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                    <div className="flex flex-col gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-700 px-2 py-1 rounded text-white">1. Setup</span>
                                            <span className="text-slate-400">Admin mengisi No. WA / Telegram di menu <strong>Pengaturan Struk & Toko</strong>.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-700 px-2 py-1 rounded text-white">2. Lupa?</span>
                                            <span className="text-slate-400">Staf klik tombol <strong>"Lupa PIN?"</strong> di layar login.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-700 px-2 py-1 rounded text-white">3. Kirim</span>
                                            <span className="text-slate-400">Pilih WhatsApp/Telegram. Pesan otomatis terkirim ke HP Admin.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-700 px-2 py-1 rounded text-white">4. Reset</span>
                                            <span className="text-slate-400">Admin mereset PIN staf melalui menu <strong>Manajemen Pengguna</strong>.</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-4 text-xs text-yellow-400 flex gap-2 items-start">
                                    <Icon name="warning" className="w-4 h-4 flex-shrink-0" />
                                    <span><strong>Darurat Admin:</strong> Jika lupa PIN Admin, ketuk logo aplikasi di halaman login sebanyak 5 kali untuk mereset PIN Admin ke 1111.</span>
                                </p>
                            </AccordionItem>
                            <AccordionItem title="Pengaturan Struk & Toko" isOpen={openAccordion === 'receipt'} onToggle={() => toggleAccordion('receipt')} icon="printer">
                                <p>Informasi pada struk dapat diubah di <strong>Pengaturan {'>'} Pengaturan Struk & Toko</strong>.</p>
                                <p>Anda bisa mengatur <strong>Pajak (PB1)</strong> dan <strong>Service Charge</strong> di menu ini.</p>
                                <p>Anda juga bisa memasukkan nomor WhatsApp Admin agar kasir bisa mengirim laporan harian langsung ke WA pemilik melalui tombol di halaman Laporan.</p>
                            </AccordionItem>
                        </div>

                        {/* Section 2: Operasional Kasir */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="cash" className="w-5 h-5" /> Operasional Kasir
                            </h3>
                            <AccordionItem title="Manajemen Sesi / Shift (Penting)" isOpen={openAccordion === 'shift'} onToggle={() => toggleAccordion('shift')} icon="users">
                                <p>Fitur ini <strong>sangat disarankan</strong> untuk mencegah kecurangan atau selisih uang kas.</p>
                                <p><strong>Cara Mengaktifkan:</strong> Buka Pengaturan {'>'} Manajemen Sesi Penjualan {'>'} Aktifkan.</p>
                                <p className="mt-2"><strong>Alur Kerja Sesi:</strong></p>
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li><strong>Buka Toko:</strong> Klik "Mulai Sesi". Masukkan uang modal yang ada di laci (misal: 200.000 untuk kembalian).</li>
                                    <li><strong>Operasional:</strong> Lakukan transaksi seperti biasa. Jika ada pengeluaran kas kecil (beli es batu, bensin), catat lewat tombol "Kelola Kas" di halaman kasir.</li>
                                    <li><strong>Tutup Toko:</strong> Klik "Tutup Sesi". Hitung fisik uang di laci dan masukkan ke aplikasi. Aplikasi akan menghitung selisih otomatis.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Laporan Shift & Anti-Edit" isOpen={openAccordion === 'sendreport'} onToggle={() => toggleAccordion('sendreport')} icon="lock">
                                <p>Staf dapat mengirim laporan penjualan harian/shift langsung ke Admin tanpa masuk ke menu Laporan utama.</p>
                                <p className="mt-2 font-bold text-white">Fitur Laporan Aman (Anti-Edit):</p>
                                <p>Kasir dapat mengirim <strong>Kode Terenkripsi</strong> via WhatsApp yang berisi data penjualan asli. Staf tidak bisa mengubah angka di pesan tersebut. Admin kemudian menyalin kode tersebut dan menempelkannya di menu <strong>Pengaturan {'>'} Laporan & Transaksi Lama {'>'} Paste Teks</strong> untuk melihat laporan asli.</p>
                            </AccordionItem>
                            <AccordionItem title="Simpan Pesanan (Open Bill)" isOpen={openAccordion === 'heldcart'} onToggle={() => toggleAccordion('heldcart')} icon="plus">
                                <p>Berguna untuk restoran/kafe (Order dulu, bayar nanti).</p>
                                <p><strong>Cara Mengaktifkan:</strong> Buka Pengaturan {'>'} Manajemen Sesi {'>'} Aktifkan "Fitur Simpan Pesanan".</p>
                                <p>Di halaman kasir akan muncul tab baru. Klik tombol (+) untuk membuat pesanan baru (misal: "Meja 1"). Anda bisa berpindah antar pesanan dengan mudah.</p>
                            </AccordionItem>
                            <AccordionItem title="Diskon Item & Diskon Total" isOpen={openAccordion === 'discount'} onToggle={() => toggleAccordion('discount')} icon="tag">
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Diskon Item:</strong> Klik ikon tag pada produk di keranjang.</li>
                                    <li><strong>Diskon Total:</strong> Klik tombol "Diskon Keranjang" di bawah total harga.</li>
                                    <li><strong>Diskon Preset:</strong> Anda bisa membuat daftar diskon tetap (misal: "Diskon Karyawan 20%") di menu <strong>Pengaturan {'>'} Manajemen Diskon</strong> agar kasir tidak perlu input manual.</li>
                                </ul>
                            </AccordionItem>
                        </div>

                        {/* Section 3: Produk & Inventaris */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="products" className="w-5 h-5" /> Produk & Inventaris
                            </h3>
                            <AccordionItem title="Varian Harga & Ukuran" isOpen={openAccordion === 'variants'} onToggle={() => toggleAccordion('variants')} icon="tag">
                                <p>Fitur ini memungkinkan satu produk memiliki beberapa variasi harga atau ukuran tanpa harus membuat banyak produk terpisah.</p>
                                <p className="mb-2"><strong>Contoh:</strong> Kopi Susu (Regular: 15rb, Jumbo: 20rb) atau Mie Ayam (Biasa: 12rb, Spesial: 18rb).</p>
                                <p><strong>Cara Mengatur:</strong></p>
                                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300">
                                    <li>Buka menu <strong>Produk</strong>, lalu klik Tambah atau Edit Produk.</li>
                                    <li>Scroll ke bawah ke bagian <strong>"Varian Harga"</strong>.</li>
                                    <li>Masukkan nama varian (misal: "Jumbo") dan harganya.</li>
                                    <li>Jika menggunakan inventaris, Anda juga bisa mengatur Harga Modal khusus untuk varian tersebut.</li>
                                    <li>Simpan produk.</li>
                                </ol>
                                <p className="mt-2"><strong>Cara Transaksi:</strong> Di halaman kasir, saat produk tersebut diklik, akan muncul pop-up untuk memilih varian yang diinginkan.</p>
                            </AccordionItem>
                            <AccordionItem title="Kategori Produk" isOpen={openAccordion === 'category'} onToggle={() => toggleAccordion('category')} icon="tag">
                                <p>Kategori memudahkan pencarian produk. Anda bisa mengelola daftar kategori (Edit/Hapus) secara terpusat di <strong>Pengaturan {'>'} Manajemen Kategori Produk</strong>.</p>
                            </AccordionItem>
                            <AccordionItem title="Manajemen Inventaris & Laba" isOpen={openAccordion === 'inventory'} onToggle={() => toggleAccordion('inventory')} icon="database">
                                <p>Fitur ini harus diaktifkan di <strong>Pengaturan</strong>.</p>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li><strong>Stok Sederhana:</strong> Centang "Lacak Stok" pada produk. Stok berkurang saat dijual.</li>
                                    <li><strong>Resep / Bahan Baku:</strong> Untuk produk racikan (cth: Kopi Susu). 
                                        <br/>1. Input bahan mentah di menu "Bahan Baku" (Susu, Biji Kopi).
                                        <br/>2. Di menu Produk, edit Kopi Susu, tambahkan "Resep".
                                        <br/>3. Saat Kopi Susu terjual, stok Susu & Biji Kopi yang berkurang otomatis.</li>
                                    <li><strong>Laba:</strong> Sistem menghitung laba berdasarkan (Harga Jual - Harga Modal/HPP Resep).</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Produk Komposit / Bundling" isOpen={openAccordion === 'bundling'} onToggle={() => toggleAccordion('bundling')} icon="tag">
                                <p>Fitur ini memungkinkan Anda membuat produk paket (Bundling) yang terdiri dari campuran produk lain yang sudah ada.</p>
                                <ol className="list-decimal pl-5 mt-2 space-y-1">
                                    <li>Pastikan fitur <strong>"Pelacakan Bahan Baku & Resep"</strong> sudah aktif di menu <strong>Pengaturan {'>'} Manajemen Inventaris</strong>.</li>
                                    <li>Buka menu <strong>Produk</strong>, lalu klik <strong>"Tambah Produk"</strong> (atau edit produk lama).</li>
                                    <li>Scroll ke bawah ke bagian <strong>Resep / Komposisi & Bundling</strong>.</li>
                                    <li>Klik tombol "Tambah Komposisi".</li>
                                    <li><strong>PENTING:</strong> Ubah dropdown di sebelah kiri dari "Bahan Baku" menjadi <strong>"Produk Jadi"</strong>.</li>
                                    <li>Pilih produk yang ingin dimasukkan ke dalam paket (misal: Es Kopi + Roti).</li>
                                    <li>Simpan. Saat paket ini terjual, stok produk penyusun (Es Kopi & Roti) akan otomatis berkurang.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Import & Export Produk Massal" isOpen={openAccordion === 'bulk'} onToggle={() => toggleAccordion('bulk')} icon="download">
                                <p>Kelola ribuan produk dengan mudah menggunakan Excel/CSV.</p>
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>Buka <strong>Pengaturan {'>'} Manajemen Produk Massal</strong>.</li>
                                    <li>Klik "Export Produk" untuk mendapatkan template CSV (atau backup data lama).</li>
                                    <li>Edit file CSV di aplikasi spreadsheet (Excel/Google Sheets).</li>
                                    <li>Simpan sebagai CSV, lalu "Import Produk" kembali ke aplikasi.</li>
                                </ol>
                            </AccordionItem>
                        </div>

                        {/* Section 4: CRM (Pelanggan) */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="users" className="w-5 h-5" /> Pelanggan & Reward
                            </h3>
                            <AccordionItem title="Program Keanggotaan (Membership)" isOpen={openAccordion === 'member'} onToggle={() => toggleAccordion('member')} icon="award">
                                <p>Bangun loyalitas pelanggan dengan poin.</p>
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>Aktifkan di <strong>Pengaturan {'>'} Program Keanggotaan</strong>.</li>
                                    <li>Buat <strong>Aturan Poin</strong> (misal: Belanja 10.000 dapat 1 poin).</li>
                                    <li>Buat <strong>Reward</strong> (misal: 50 poin = Diskon 5.000 atau Gratis Es Teh).</li>
                                    <li>Saat transaksi, pilih pelanggan di menu Kasir. Poin akan masuk otomatis setelah bayar.</li>
                                </ol>
                            </AccordionItem>
                        </div>

                        {/* Section 5: Data */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="database" className="w-5 h-5" /> Manajemen Data
                            </h3>
                            <AccordionItem title="Import Riwayat Transaksi (Pindah HP)" isOpen={openAccordion === 'import_trans'} onToggle={() => toggleAccordion('import_trans')} icon="upload">
                                <p>Fitur ini digunakan jika Anda ingin memindahkan data laporan penjualan dari perangkat kasir satu ke perangkat lain (misal: HP Karyawan ke HP Owner).</p>
                                <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-slate-300">
                                    <li><strong>Di Perangkat Sumber (HP Kasir):</strong> Pergi ke menu Laporan, klik <strong>"Export CSV"</strong>. Kirim file CSV tersebut ke HP tujuan.</li>
                                    <li><strong>Di Perangkat Tujuan (HP Owner):</strong> Buka <strong>Pengaturan {'>'} Data & Sistem</strong>.</li>
                                    <li>Klik tombol <strong>"Import File CSV"</strong> di bagian Laporan & Transaksi Lama.</li>
                                    <li>Pilih file CSV yang tadi dikirim. Riwayat transaksi akan digabungkan ke aplikasi ini.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Backup & Restore (Sangat Penting)" isOpen={openAccordion === 'backup'} onToggle={() => toggleAccordion('backup')} icon="warning">
                                <p className="text-yellow-300 font-bold mb-2">Aplikasi ini berjalan OFFLINE di browser Anda. Jika Anda menghapus cache browser atau ganti HP, data bisa hilang jika tidak dibackup.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Backup:</strong> Pergi ke Pengaturan {'>'} Manajemen Data {'>'} Backup Data. Simpan file JSON yang terunduh di tempat aman (Google Drive/WA).</li>
                                    <li><strong>Restore:</strong> Gunakan file JSON tersebut untuk mengembalikan data di perangkat baru.</li>
                                </ul>
                            </AccordionItem>
                        </div>
                    </div>

                </div>
            )}

            {/* Content: About */}
            {activeTab === 'about' && (
                <div className="max-w-2xl mx-auto text-center animate-fade-in space-y-8">
                    <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700">
                        <Icon name="logo" className="w-20 h-20 text-[#52a37c] mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Artea POS</h2>
                        <p className="text-slate-400 font-mono text-sm mb-6">Versi 2.1.0</p>
                        
                        <p className="text-slate-300 mb-6 leading-relaxed">
                            Artea POS adalah aplikasi Point of Sale (POS) atau kasir yang dirancang untuk usaha kecil dan menengah di bidang makanan dan minuman. Aplikasi ini dapat berjalan di browser tanpa memerlukan koneksi internet untuk operasional sehari-hari, memastikan bisnis Anda tetap berjalan lancar kapan saja.
                        </p>

                        {/* Disclaimer / Developer Note */}
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 mb-8 text-left">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                                <Icon name="info-circle" className="w-4 h-4 text-[#52a37c]"/> Catatan dari Pengembang
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Tujuan awal dibuatnya aplikasi ini adalah untuk membantu merapikan administrasi di usaha kami yang bernama <a href="https://arteagrup.my.id" target="_blank" rel="noopener noreferrer" className="text-[#52a37c] hover:underline hover:text-[#7ac0a0]">Artea</a>. Jadi, harap maklum jika fiturnya belum selengkap aplikasi kasir komersial. Dengan dipublikasikannya aplikasi ini, kami berharap bisa bermanfaat bagi yang membutuhkan dan dapat berkembang bersama melalui kolaborasi komunitas. Bagi anda yang merasa terbantu dan ingin mendukung proyek ini bisa memberikan traktir kopi atau merekomendasikan aplikasi ini ke saudara kita yang membutuhkan.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-left bg-slate-900/50 p-6 rounded-xl mb-8 border border-slate-700/50">
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Lisensi</span>
                                <p className="text-white mt-1">GNU GPL v3.0</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Teknologi</span>
                                <p className="text-white mt-1">React + IndexedDB</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Privasi</span>
                                <p className="text-white mt-1">Data Lokal (No Cloud)</p>
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

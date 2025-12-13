
import React, { useState } from 'react';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { APP_LICENSE_ID } from '../constants';

// Types for Accordion
interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    icon?: React.ComponentProps<typeof Icon>['name'];
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

// Changelog Data
const releaseNotes = [
    {
        version: "v2.3.1",
        date: "13 Desember 2025",
        changes: [
            "Fitur Baru: Role Pengguna 'Manager' (Supervisor).",
            "Update: Pembedaan hak akses yang lebih detail (Admin vs Manager vs Staf).",
            "Update: Staf dapat melihat stok barang saat melakukan pelaporan waste/restock.",
            "Perbaikan: Mengembalikan menu pengaturan 'Aturan Poin' (Loyalty) yang sempat hilang.",
            "Fitur Baru: 'Manajemen Penyimpanan Cloud' untuk mengatasi masalah kuota penuh pada akun gratis (Supabase/Dropbox).",
            "Fitur Baru: Tombol 'Kosongkan Riwayat Cloud' yang secara otomatis membackup data lokal sebelum membersihkan server.",
            "Update: Deteksi pesan error yang lebih spesifik saat sinkronisasi gagal (misal: Quota Exceeded).",
            "Fitur Baru: Pengaturan Tipe Pesanan (Order Type) yang bisa dikustomisasi.",
            "Fitur Baru: Sinkronisasi Cloud Otomatis (Background Sync) setiap kali transaksi selesai.",
            "Fitur Baru: Audit Log (Mencatat aktivitas sensitif seperti hapus produk, ubah harga, refund & opname) untuk anti-fraud.",
            "Fitur Baru: Strategi 'Black Box' untuk pengawasan toko offline.",
            "Fitur Baru: Stock Opname (Audit Stok Fisik) Massal.",
            "Update: Akses Stock Opname & Restock kini tersedia untuk Staf di menu Kasir.",
            "Fitur Baru: Pencatatan otomatis nama pengguna pada log stok.",
            "Fitur Baru: Harga Produk Khusus per Cabang (Remote Pricing).",
            "Fitur Baru: Pengaturan Diskon & Promo Spesifik per Cabang.",
            "Fitur Baru: Aturan Poin Membership Spesifik per Cabang.",
            "Update: Logika sinkronisasi pintar (Mempertahankan harga lokal jika tidak di-override pusat).",
            "Fix: Sinkronisasi data 'Pemasukan Lain' ke Cloud.",
            "Fix: Pencatatan riwayat stok otomatis saat Refund transaksi."
        ]
    },
    {
        version: "v2.2.0",
        date: "12 Desember 2024",
        changes: [
            "Fitur Baru: Dukungan Multi-Cabang dengan 'Store ID'.",
            "Fitur Baru: Sinkronisasi Cloud (Dropbox & Supabase) per cabang.",
            "Fitur Baru: Enkripsi Laporan untuk keamanan data via WhatsApp.",
            "Update: UI baru pada Laporan & Pengaturan.",
        ]
    },
    {
        version: "v2.1.0",
        date: "10 Mei 2024",
        changes: [
            "Fitur Baru: Manajemen Keuangan (Pemasukan Lain & Pengeluaran).",
            "Fitur Baru: Manajemen Stok Bahan Baku & Resep.",
            "Fitur Baru: Manajemen Utang Piutang & Supplier.",
            "Update: AI Assistant Dashboard (Beta).",
        ]
    },
    {
        version: "v2.0.0",
        date: "1 April 2024",
        changes: [
            "Major Update: Migrasi dari LocalStorage ke IndexedDB (Dexie.js).",
            "UI/UX: Redesign tampilan dengan tema Dark Mode modern.",
            "Fitur Baru: Dukungan PWA (Installable App).",
            "Fitur Baru: Multi-user dengan PIN Access.",
        ]
    },
    {
        version: "v1.0.0",
        date: "1 Januari 2024",
        changes: [
            "Rilis Awal Aplikasi.",
            "Fitur Dasar: Kasir, Produk, Laporan Sederhana.",
            "Penyimpanan data berbasis LocalStorage.",
        ]
    }
];

const HelpView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'flow' | 'features' | 'about' | 'license'>('flow');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(prev => prev === id ? null : id);
    };

    const tabs = [
        { id: 'flow', label: 'Mulai & Alur', icon: 'play' },
        { id: 'features', label: 'Fitur', icon: 'book' },
        { id: 'license', label: 'Lisensi', icon: 'lock' },
        { id: 'about', label: 'Tentang', icon: 'info-circle' },
    ] as const;

    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            let content = line.trim();
            if(!content) return <br key={idx}/>;
            
            if (content.startsWith('###')) {
                return <h3 key={idx} className="text-lg font-bold text-[#52a37c] mt-4 mb-2">{content.replace('###', '')}</h3>
            }
            if (content.startsWith('**')) {
                // Handle bold headers (simple parser)
                return <p key={idx} className="font-bold text-white mt-3 mb-1">{content.replace(/\*\*/g, '')}</p>
            }
            if (content.startsWith('---')) {
                return <hr key={idx} className="border-slate-700 my-4"/>
            }
            
            return <p key={idx} className="text-slate-300 leading-relaxed text-sm mb-1">{content.replace(/\*\*/g, '')}</p>
        });
    };

    // Comprehensive feature list based on actual codebase capabilities
    const featureList = [
        { title: 'Offline 100%', desc: 'Tanpa internet.', icon: 'wifi' },
        { title: 'POS Cepat', desc: 'Transaksi kilat.', icon: 'cash' },
        { title: 'Manajemen Shift', desc: 'Kelola arus kas laci.', icon: 'clock-history' }, // ADDED with correct icon
        { title: 'Audit Log', desc: 'Anti-fraud & keamanan.', icon: 'file-lock' }, // ENSURED
        { title: 'Stock Opname', desc: 'Audit stok fisik.', icon: 'boxes' },
        { title: 'Multi Cabang', desc: 'Kelola banyak toko.', icon: 'share' },
        { title: 'Sync Dropbox', desc: 'Backup terpisah.', icon: 'upload' },
        { title: 'Realtime DB', desc: 'Sync Supabase.', icon: 'database' },
        { title: 'AI Cerdas', desc: 'Analisis bisnis.', icon: 'chat' },
        { title: 'Stok & Resep', desc: 'Lacak bahan baku.', icon: 'database' },
        { title: 'Produk Bundling', desc: 'Paket hemat.', icon: 'products' },
        { title: 'Utang Piutang', desc: 'Catat kasbon.', icon: 'pay' },
        { title: 'Varian Harga', desc: 'Regular / Jumbo.', icon: 'tag' },
        { title: 'Pajak & Service', desc: 'PB1 otomatis.', icon: 'finance' },
        { title: 'Promo & Diskon', desc: 'Atur potongan.', icon: 'tag' },
        { title: 'Laporan Aman', desc: 'Anti-edit staf.', icon: 'lock' },
        { title: 'Order Dapur', desc: 'Cetak pesanan.', icon: 'check-circle-fill' },
        { title: 'Multi User', desc: 'Admin & Kasir.', icon: 'users' },
        { title: 'Membership', desc: 'Poin pelanggan.', icon: 'award' },
        { title: 'Printer BT', desc: 'Cetak struk.', icon: 'printer' },
        { title: 'Data Pemasok', desc: 'Beli stok.', icon: 'ingredients' },
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

            {/* Tab Navigation */}
            <div className="sticky top-0 z-30 py-3 mb-8 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
                <div className="overflow-x-auto">
                    <div className="flex justify-start md:justify-center px-4 md:px-6">
                        <div className="bg-slate-800 p-1 rounded-xl flex gap-1 shadow-lg border border-slate-700">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap
                                        ${activeTab === tab.id 
                                            ? 'bg-[#347758] text-white shadow-md transform scale-105' 
                                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                        }`}
                                >
                                    <Icon name={tab.icon as any} className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
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
                            <div className="flex flex-row gap-6 relative min-w-[1200px] p-6">
                                {/* Connector Line (Visible on all screens now) */}
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 z-0 -translate-y-1/2 mx-6"></div>
                                
                                <FlowStep 
                                    number={1} 
                                    title="Persiapan" 
                                    desc="Atur Store ID, Keamanan, & Koneksi Cloud (Opsional)." 
                                    icon="settings" 
                                />
                                <FlowStep 
                                    number={2} 
                                    title="Data" 
                                    desc="Input Produk Baru atau Restore Data Lama." 
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
                                    title="Tutup & Sync" 
                                    desc="Tutup Sesi & Sync ke Cloud (Dropbox/Supabase)." 
                                    icon="upload" 
                                />
                                <FlowStep 
                                    number={6} 
                                    title="Audit & Pantau" 
                                    desc="Aktivitas sensitif direkam & disinkron ke Cloud." 
                                    icon="lock" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Icon name="wifi" className="w-5 h-5 text-[#52a37c]"/> Persiapan Perangkat (Wajib)
                            </h3>
                            <ul className="space-y-4 text-sm text-slate-300">
                                <li>
                                    <strong className="text-white block mb-1">1. Instalasi (PWA)</strong>
                                    Aplikasi ini berjalan di browser. Untuk pengalaman terbaik, "Instal" ke perangkat Anda.
                                    <ul className="list-disc pl-4 mt-1 text-xs text-slate-400 space-y-1">
                                        <li><strong>Android/iOS:</strong> Menu Browser {'>'} Install App / Tambah ke Layar Utama.</li>
                                        <li><strong>Desktop (PC/Laptop):</strong> Klik ikon "Install" (monitor panah bawah) di ujung kanan kolom alamat browser.</li>
                                    </ul>
                                </li>
                                <li>
                                    <strong className="text-white block mb-1">2. Konfigurasi Awal</strong>
                                    Buka menu <strong>Pengaturan</strong>. Atur Nama Toko, Alamat, dan fitur lain sesuai kebutuhan.
                                </li>
                            </ul>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 border-l-4 border-l-[#347758]">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Icon name="share" className="w-5 h-5 text-[#52a37c]"/> Setup Cabang Baru
                            </h3>
                            <div className="space-y-3 text-sm text-slate-300">
                                <p>Jika Anda membuka cabang baru, lakukan langkah ini di perangkat kasir cabang tersebut:</p>
                                <ol className="list-decimal pl-5 space-y-2">
                                    <li>Masuk sebagai <strong>Admin</strong>.</li>
                                    <li>Buka <strong>Pengaturan {'>'} Toko & Struk</strong>.</li>
                                    <li>
                                        Isi <strong>ID Toko (Store ID)</strong> dengan kode unik. 
                                        <br/><span className="text-xs text-yellow-400">Contoh: JKT-01, BDG-02. Jangan gunakan spasi.</span>
                                    </li>
                                    <li>
                                        (Opsional) Masukkan <strong>Token Dropbox / Supabase</strong> yang sama dengan pusat agar data tersinkronisasi ke akun yang sama.
                                    </li>
                                </ol>
                            </div>
                        </div>
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
                        
                        {/* Section: Skenario Lapangan */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="users" className="w-5 h-5" /> Skenario Penggunaan Lapangan
                            </h3>
                            
                            {/* PANDUAN KHUSUS STAFF (New) */}
                            <AccordionItem title="Panduan Staf: Cara Update Data Produk Baru" isOpen={openAccordion === 'staff_update'} onToggle={() => toggleAccordion('staff_update')} icon="wifi">
                                <p className="mb-3">Jika Admin atau Owner menambahkan produk baru atau mengubah harga dari pusat, Staf dapat memperbarui data di kasir tanpa perlu login Admin.</p>
                                <div className="space-y-3">
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-sky-400 text-sm mb-1">Langkah Update:</h5>
                                        <ol className="list-decimal pl-5 text-xs text-slate-300 space-y-1">
                                            <li>Lihat ke pojok kanan atas aplikasi (di sebelah tombol tanda tanya).</li>
                                            <li>Klik ikon <strong>Database/Awan</strong> <span className="inline-block align-middle bg-slate-700 p-1 rounded mx-1"><Icon name="database" className="w-3 h-3"/></span>.</li>
                                            <li>Pilih tombol <strong>"Update dari Pusat"</strong>.</li>
                                            <li>Tunggu proses selesai. Halaman akan dimuat ulang otomatis.</li>
                                        </ol>
                                        <p className="text-[10px] text-yellow-400 mt-2">Catatan: Data penjualan lokal di perangkat ini AMAN dan tidak akan hilang saat update.</p>
                                    </div>
                                </div>
                            </AccordionItem>

                            <AccordionItem title="Panduan Memilih Metode Data" isOpen={openAccordion === 'method_compare'} onToggle={() => toggleAccordion('method_compare')} icon="question">
                                <p className="mb-3">Aplikasi ini menyediakan 3 cara untuk memindahkan atau menyimpan data:</p>
                                <div className="space-y-3">
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-green-400 text-sm mb-1">1. Laporan WhatsApp (Manual/Enkripsi)</h5>
                                        <p className="text-xs text-slate-300"><strong>Cocok untuk:</strong> Harian, Sinyal Buruk, Pengguna Awam.</p>
                                        <p className="text-xs text-slate-400 mt-1">Paling tangguh. Tidak butuh server, pesan terkirim saat sinyal ada. Aman karena data shift dikunci.</p>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-blue-400 text-sm mb-1">2. Dropbox (Backup File)</h5>
                                        <p className="text-xs text-slate-300"><strong>Cocok untuk:</strong> Ganti Perangkat, Backup Mingguan, Multi-Cabang (Arsip).</p>
                                        <p className="text-xs text-slate-400 mt-1">Setiap cabang akan mengupload file terpisah (misal: <code>backup_JKT01.json</code>). Aman dari saling menimpa.</p>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-purple-400 text-sm mb-1">3. Supabase (Database Real-time)</h5>
                                        <p className="text-xs text-slate-300"><strong>Cocok untuk:</strong> Owner Teknis, Pemantauan Live, Multi-Cabang.</p>
                                        <p className="text-xs text-slate-400 mt-1">Data transaksi & stok dikirim per item ke database pusat. Owner bisa melihat stok seluruh cabang secara real-time.</p>
                                    </div>
                                </div>
                            </AccordionItem>

                            <AccordionItem title="Sistem Terpisah (Owner & Staf Beda Lokasi)" isOpen={openAccordion === 'split_device'} onToggle={() => toggleAccordion('split_device')} icon="share">
                                <p>Skenario ini digunakan jika Owner tidak di toko, dan ada Staf yang menjaga kasir menggunakan Perangkat Toko.</p>
                                <div className="mt-3 space-y-4">
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-white text-xs mb-2">1. Di Perangkat Toko (Tablet/PC):</h5>
                                        <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                                            <li>Staf login sebagai <strong>Kasir</strong>.</li>
                                            <li>Saat tutup toko, klik <strong>"Laporan"</strong> -> <strong>"Laporan Aman (Anti-Edit)"</strong> dan kirim via WhatsApp ke Owner.</li>
                                            <li>Atau klik <strong>"Sync Cloud"</strong> jika Dropbox/Supabase sudah disetting oleh Admin.</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-white text-xs mb-2">2. Di Perangkat Owner (Laptop/HP):</h5>
                                        <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                                            <li>Owner menerima kode terenkripsi dari WA.</li>
                                            <li>Owner membuka Artea POS -> <strong>Pengaturan {'>'} Laporan & Transaksi Lama</strong> -> <strong>"Paste Teks (Encrypted)"</strong>.</li>
                                            <li><strong>Hasil:</strong> Data penjualan masuk ke perangkat Owner tanpa perlu login ke perangkat Toko.</li>
                                        </ul>
                                    </div>
                                </div>
                            </AccordionItem>
                        </div>

                        {/* Section: Multi-Cabang & Ekspansi */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="share" className="w-5 h-5" /> Ekspansi & Multi-Cabang
                            </h3>
                            <AccordionItem title="Cara Kerja Multi-Cabang (Penting)" isOpen={openAccordion === 'multibranch'} onToggle={() => toggleAccordion('multibranch')} icon="info-circle">
                                <p>Karena aplikasi ini <strong>Offline-First</strong>, setiap perangkat cabang memiliki database sendiri. Agar data tidak bentrok saat disatukan (Sync), Anda wajib mengatur <strong>Store ID</strong>.</p>
                                <div className="mt-3 space-y-2">
                                    <p className="text-sm font-bold text-white">Logika Penyimpanan:</p>
                                    <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                                        <li><strong>Dropbox:</strong> Nama file backup akan otomatis menyertakan ID Toko. <br/>Contoh: Cabang A -> <code>artea_backup_CABANG-A.json</code>, Cabang B -> <code>artea_backup_CABANG-B.json</code>. Tidak akan saling menimpa.</li>
                                        <li><strong>Supabase:</strong> Setiap baris transaksi dan stok di database akan ditandai dengan kolom <code>store_id</code>. Anda bisa memfilter data per cabang di dashboard Supabase Anda.</li>
                                    </ul>
                                </div>
                            </AccordionItem>
                            <AccordionItem title="Manajemen Harga & Promo Multi-Cabang" isOpen={openAccordion === 'branch_pricing'} onToggle={() => toggleAccordion('branch_pricing')} icon="tag">
                                <p>Admin di pusat dapat mengatur harga dan promosi yang berbeda untuk setiap cabang.</p>
                                <div className="mt-3 space-y-3">
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-yellow-400 text-xs mb-1">1. Harga Khusus Cabang</h5>
                                        <p className="text-xs text-slate-300">
                                            Di menu Edit Produk, isi bagian "Harga Khusus Cabang" dengan <strong>Store ID</strong> cabang target (misal: <code>BDG-01</code>) dan harganya.
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-green-400 text-xs mb-1">2. Diskon & Poin Spesifik</h5>
                                        <p className="text-xs text-slate-300">
                                            Saat membuat Diskon atau Aturan Poin, isi kolom <strong>"Berlaku di Cabang"</strong> dengan kode Store ID (pisahkan koma jika banyak). Jika kosong, promo berlaku global.
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                        <h5 className="font-bold text-blue-400 text-xs mb-1">3. Sinkronisasi</h5>
                                        <p className="text-xs text-slate-300">
                                            Saat cabang menekan tombol <strong>"Update dari Pusat"</strong>, sistem otomatis mendeteksi Store ID mereka dan menerapkan harga/promo yang sesuai. Harga lokal yang tidak diatur pusat akan tetap aman.
                                        </p>
                                    </div>
                                </div>
                            </AccordionItem>
                            <AccordionItem title="Setup Teknis Cabang Baru" isOpen={openAccordion === 'setup_branch'} onToggle={() => toggleAccordion('setup_branch')} icon="settings">
                                <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-300">
                                    <li>Siapkan Perangkat (HP/Tablet/PC) baru di lokasi cabang.</li>
                                    <li>Buka aplikasi Artea POS, login sebagai Admin Default (PIN: 1111).</li>
                                    <li>Masuk ke <strong>Pengaturan {'>'} Toko & Struk</strong>.</li>
                                    <li>Isi kolom <strong>ID Toko / Kode Cabang</strong>. Gunakan kode singkat tanpa spasi (misal: <code>JKT-SELATAN</code>).</li>
                                    <li>Masuk ke <strong>Pengaturan {'>'} Data & Sistem</strong>.</li>
                                    <li>Masukkan Token Dropbox atau URL/Key Supabase yang <strong>SAMA</strong> dengan akun Owner pusat.</li>
                                    <li>Sekarang, saat staf di cabang menekan tombol "Sync", data akan masuk ke akun Cloud pusat Anda dengan label cabang tersebut.</li>
                                </ol>
                            </AccordionItem>
                        </div>

                        {/* Section 1: Pengaturan & Keamanan */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="settings" className="w-5 h-5" /> Konfigurasi & Keamanan
                            </h3>
                            <AccordionItem title="Audit Log (Riwayat Aktivitas Sensitif)" isOpen={openAccordion === 'audit'} onToggle={() => toggleAccordion('audit')} icon="lock">
                                <p>Sistem ini secara otomatis merekam tindakan sensitif untuk mencegah kecurangan (fraud) oleh karyawan.</p>
                                <p className="mt-2 text-sm font-bold text-white">Apa yang dicatat?</p>
                                <ul className="list-disc pl-5 text-sm text-slate-300 mt-1">
                                    <li><strong>Penghapusan Produk:</strong> Saat ada produk yang dihapus dari database.</li>
                                    <li><strong>Perubahan Harga:</strong> Saat harga jual produk diubah (untuk mencegah markup/markdown ilegal).</li>
                                    <li><strong>Stock Opname (Force Reset):</strong> Saat stok diubah secara manual tanpa melalui penjualan/pembelian.</li>
                                    <li><strong>Refund Transaksi:</strong> Saat transaksi yang sudah selesai dibatalkan (void).</li>
                                </ul>
                                <p className="mt-2 text-xs text-yellow-400">Admin dapat melihat riwayat ini di menu <strong>Pengaturan {'>'} Audit & Keamanan</strong>.</p>
                                
                                <div className="mt-3 bg-blue-900/20 border-l-4 border-blue-500 p-3 rounded-r">
                                    <h5 className="font-bold text-blue-300 text-xs mb-2 flex items-center gap-2">
                                        <Icon name="info-circle" className="w-4 h-4"/> Strategi Penggunaan Offline (Tanpa Internet)
                                    </h5>
                                    <p className="text-xs text-slate-300 mb-2">
                                        Meskipun Anda tidak menggunakan Cloud Sync, fitur ini bekerja seperti <strong>"Kotak Hitam" (Black Box)</strong> yang tersimpan aman di perangkat kasir:
                                    </p>
                                    <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                                        <li><strong>Cek Harian (Spot Check):</strong> Saat tutup toko, Owner bisa memeriksa menu Audit untuk melihat apakah ada aktivitas mencurigakan hari itu.</li>
                                        <li><strong>Investigasi Selisih Kas:</strong> Jika uang fisik kurang tapi laporan bersih, cek log "Refund". Modus umum adalah mencetak struk, menerima uang, lalu me-refund transaksi di sistem agar uang tidak tercatat sebagai penjualan.</li>
                                        <li><strong>Kontrol Stok (Anti-Tuyul):</strong> Pastikan "Stock Opname" hanya dilakukan saat ada izin. Log akan mencatat siapa yang mengubah angka stok secara manual.</li>
                                        <li><strong>Efek Psikologis:</strong> Staf yang mengetahui bahwa setiap perubahan harga dan penghapusan data "Terekam & Tidak Bisa Dihapus", akan cenderung bekerja lebih jujur dan disiplin.</li>
                                    </ul>
                                </div>

                                <div className="mt-3 bg-red-900/20 border-l-4 border-red-500 p-3 rounded-r">
                                    <p className="text-xs text-red-200 font-bold flex items-center gap-2">
                                        <Icon name="wifi" className="w-4 h-4"/> Sinkronisasi Cloud
                                    </p>
                                    <p className="text-xs text-slate-300 mt-1">
                                        Data Audit Log ini <strong>ikut terkirim</strong> saat proses Sync Cloud (Supabase/Dropbox). Ini berarti Owner/Admin Pusat dapat memantau aktivitas ini dari jarak jauh secara real-time, bahkan jika data lokal dihapus.
                                    </p>
                                </div>
                            </AccordionItem>
                            <AccordionItem title="Keamanan & Multi-Pengguna (PIN)" isOpen={openAccordion === 'auth'} onToggle={() => toggleAccordion('auth')} icon="users">
                                <p>Secara default, keamanan dimatikan untuk kemudahan awal. Untuk mengaktifkan:</p>
                                <ol className="list-decimal pl-5 space-y-1 mb-3">
                                    <li>Buka <strong>Pengaturan {'>'} Keamanan & Akses Pengguna</strong>.</li>
                                    <li>Aktifkan tombol "Multi-Pengguna & Login PIN".</li>
                                    <li>PIN Default Admin pertama: <strong>1111</strong>.</li>
                                </ol>

                                <h4 className="font-bold text-white mt-4 mb-2">Tingkatan Akses (Role)</h4>
                                <div className="mt-2 grid grid-cols-1 gap-4">
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-purple-500/30">
                                        <h5 className="font-bold text-purple-400 mb-2 flex items-center gap-2"><Icon name="lock" className="w-4 h-4"/> Admin (Owner)</h5>
                                        <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                                            <li>Akses Penuh ke semua menu.</li>
                                            <li>Mengubah Pengaturan Toko & Printer.</li>
                                            <li>Mengelola Produk & User.</li>
                                            <li>Manajemen Data (Backup/Reset/Cloud).</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-yellow-500/30">
                                        <h5 className="font-bold text-yellow-400 mb-2 flex items-center gap-2"><Icon name="star" className="w-4 h-4"/> Manager (Supervisor)</h5>
                                        <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                                            <li>Akses Dashboard & Laporan Lengkap.</li>
                                            <li>Mengelola Produk & Bahan Baku.</li>
                                            <li>Melihat Keuangan & Arus Kas.</li>
                                            <li>Mengubah Pengaturan Toko (Struk/Printer).</li>
                                            <li><strong>DIBATASI:</strong> Tidak bisa akses menu Keamanan (User) & Reset Data Cloud.</li>
                                        </ul>
                                    </div>

                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-sky-500/30">
                                        <h5 className="font-bold text-sky-400 mb-2 flex items-center gap-2"><Icon name="users" className="w-4 h-4"/> Staf (Kasir)</h5>
                                        <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                                            <li>Fokus pada halaman Kasir (POS).</li>
                                            <li>Memulai & Menutup Sesi (Shift).</li>
                                            <li>Mencatat Kas Masuk/Keluar.</li>
                                            <li>Stock Opname & Restock (jika diizinkan).</li>
                                            <li><strong>DIBATASI:</strong> Tidak bisa masuk menu Pengaturan, Laporan Analitik, atau Edit Produk.</li>
                                        </ul>
                                    </div>
                                </div>

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
                            </AccordionItem>
                        </div>

                        {/* Section 2: Operasional Kasir */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="cash" className="w-5 h-5" /> Operasional Kasir
                            </h3>
                            <AccordionItem title="Mengatur Tipe Pesanan (Dine In, Take Away, dll)" isOpen={openAccordion === 'order_types'} onToggle={() => toggleAccordion('order_types')} icon="edit">
                                <p>Anda dapat menyesuaikan pilihan tipe pesanan (misal: "Dine In", "Take Away") agar sesuai dengan kebutuhan bisnis Anda, seperti toko retail atau grosir.</p>
                                <p className="mt-2 font-bold text-white">Cara Mengatur:</p>
                                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300">
                                    <li>Buka menu <strong>Pengaturan</strong> {'>'} tab <strong>Toko & Struk</strong>.</li>
                                    <li>Scroll ke bawah ke bagian <strong>"Tipe Pesanan"</strong>.</li>
                                    <li>Ketik nama tipe baru (cth: "Grosir", "Reservasi") di kolom input, lalu klik <strong>Tambah</strong>.</li>
                                    <li>Untuk menghapus, klik ikon silang (x) pada tipe yang sudah ada.</li>
                                </ol>
                                <p className="mt-2 text-xs text-yellow-400">
                                    Perubahan akan langsung terlihat pada tombol pilihan di halaman Kasir.
                                </p>
                            </AccordionItem>
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
                                <p>Kasir dapat mengirim <strong>Kode Terenkripsi</strong> via WhatsApp yang berisi data penjualan asli. Staf tidak bisa mengubah angka di pesan tersebut. Admin harus copy-paste kode ini di menu <strong>Import Transaksi</strong>.</p>
                            </AccordionItem>
                            <AccordionItem title="Simpan Pesanan (Open Bill)" isOpen={openAccordion === 'heldcart'} onToggle={() => toggleAccordion('heldcart')} icon="plus">
                                <p>Berguna untuk restoran/kafe (Order dulu, bayar nanti).</p>
                                <p><strong>Cara Mengaktifkan:</strong> Buka Pengaturan {'>'} Manajemen Sesi {'>'} Aktifkan "Fitur Simpan Pesanan".</p>
                                <p>Di halaman kasir akan muncul tab baru. Klik tombol (+) untuk membuat pesanan baru (misal: "Meja 1"). Anda bisa berpindah antar pesanan dengan mudah.</p>
                            </AccordionItem>
                        </div>

                        {/* Section 3: Produk & Inventaris */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="products" className="w-5 h-5" /> Produk & Inventaris
                            </h3>
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
                            
                            {/* NEW: Staff Restock Documentation */}
                            <AccordionItem title="Lapor Stok Masuk & Barang Rusak (Waste)" isOpen={openAccordion === 'staff_restock'} onToggle={() => toggleAccordion('staff_restock')} icon="tag">
                                <p>Fitur ini memungkinkan Staf untuk mencatat penerimaan barang (Restock) atau melaporkan barang rusak/hilang (Waste) langsung dari halaman Kasir.</p>
                                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50 mt-2">
                                    <h5 className="font-bold text-white text-xs mb-2">Cara Penggunaan:</h5>
                                    <ol className="list-decimal pl-5 text-xs text-slate-300 space-y-2">
                                        <li>Di halaman Kasir (Header), klik ikon <strong>Tag</strong> <span className="inline-block align-middle bg-slate-700 p-1 rounded mx-1"><Icon name="tag" className="w-3 h-3"/></span> yang ada di sebelah tombol scan.</li>
                                        <li>Pilih Mode:
                                            <ul className="list-disc pl-4 mt-1 space-y-1">
                                                <li><span className="text-green-400 font-bold">Terima Barang</span> (Untuk stok masuk dari supplier).</li>
                                                <li><span className="text-red-400 font-bold">Lapor Kerusakan</span> (Untuk stok keluar karena rusak, expired, pecah, dll).</li>
                                            </ul>
                                        </li>
                                        <li>Cari nama barang dan masukkan jumlahnya.</li>
                                        <li>Jika melaporkan kerusakan, pilih <strong>Alasan</strong> (Cacat, Kadaluarsa, dll) dan tambahkan catatan jika perlu.</li>
                                        <li>Klik Simpan. Stok akan otomatis diperbarui dan tercatat di laporan.</li>
                                    </ol>
                                </div>
                            </AccordionItem>

                            <AccordionItem title="Stock Opname (Audit Stok)" isOpen={openAccordion === 'opname'} onToggle={() => toggleAccordion('opname')} icon="boxes">
                                <p className="mb-2">Fitur ini digunakan untuk menyesuaikan stok sistem dengan stok fisik yang ada di rak/gudang.</p>
                                <p><strong>Cara Akses:</strong></p>
                                <ul className="list-disc pl-5 mb-2 text-sm text-slate-300">
                                    <li><strong>Admin:</strong> Buka menu Produk atau Bahan Baku, klik tombol "Stock Opname" di bagian atas.</li>
                                    <li><strong>Staf (Kasir):</strong> Di halaman Kasir, klik tombol <strong>"Boxes/Opname"</strong> <span className="inline-block align-middle bg-slate-700 p-1 rounded mx-1"><Icon name="boxes" className="w-3 h-3"/></span> di samping tombol Tag/Restock.</li>
                                </ul>
                                <p><strong>Cara Melakukan Opname:</strong></p>
                                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300">
                                    <li>Pilih tab "Produk Jadi" atau "Bahan Baku".</li>
                                    <li>Cari nama barang yang ingin diaudit.</li>
                                    <li>Isi kolom <strong>"Fisik (Actual)"</strong> dengan jumlah yang Anda hitung secara manual.</li>
                                    <li>Sistem akan otomatis menghitung selisih (+/-) dan menandainya dengan warna.</li>
                                    <li>Isi catatan jika perlu (misal: "Audit Akhir Bulan").</li>
                                    <li>Klik "Simpan Hasil Opname" untuk menerapkan perubahan stok.</li>
                                </ol>
                            </AccordionItem>
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
                        </div>

                        {/* Section 4: Loyalty Program */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="award" className="w-5 h-5" /> Program Loyalitas
                            </h3>
                             <AccordionItem title="Mengatur Aturan Perolehan Poin" isOpen={openAccordion === 'point_rules'} onToggle={() => toggleAccordion('point_rules')} icon="star">
                                <p>Atur bagaimana pelanggan Anda mendapatkan poin setiap kali mereka berbelanja.</p>
                                <p className="mt-2 font-bold text-white">Cara Mengatur:</p>
                                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300">
                                    <li>Buka menu <strong>Pengaturan</strong> {'>'} tab <strong>Fitur Kasir</strong>.</li>
                                    <li>Aktifkan "Membership & Poin" jika belum.</li>
                                    <li>Di bagian "Program Loyalitas Pelanggan", klik <strong>"+ Tambah Aturan Poin"</strong>.</li>
                                </ol>
                                <p className="mt-2 font-bold text-white">Tipe Aturan:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-slate-300">
                                    <li><strong>Berdasarkan Total Belanja:</strong> Beri poin untuk setiap kelipatan jumlah tertentu. Contoh: Dapat 10 poin setiap belanja Rp 10.000.</li>
                                    <li><strong>Berdasarkan Produk Spesifik:</strong> Beri poin tambahan jika pelanggan membeli produk tertentu. Contoh: Beli "Kopi Spesial" dapat 25 poin.</li>
                                    <li><strong>Berdasarkan Kategori:</strong> Beri poin untuk setiap item dalam kategori tertentu. Contoh: Setiap pembelian item dari kategori "Makanan" dapat 5 poin.</li>
                                </ul>
                                 <p className="text-xs text-yellow-400 mt-2">Anda bisa membuat beberapa aturan sekaligus. Sistem akan mengakumulasi poin dari semua aturan yang cocok.</p>
                            </AccordionItem>
                        </div>

                        {/* Section 5: Data */}
                        <div>
                            <h3 className="text-lg font-bold text-[#52a37c] mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Icon name="database" className="w-5 h-5" /> Manajemen Data
                            </h3>
                            <AccordionItem title="Solusi Penyimpanan Cloud Penuh (Quota Exceeded)" isOpen={openAccordion === 'cloud_purge'} onToggle={() => toggleAccordion('cloud_purge')} icon="warning">
                                <p className="text-sm text-yellow-400 font-bold mb-2">PENTING: Gunakan fitur ini jika Anda gagal Sync karena batas penyimpanan gratis penuh.</p>
                                <p className="text-sm text-slate-300 mb-2">Layanan Cloud gratis (Dropbox/Supabase) memiliki batas kuota. Jika penuh, aplikasi tidak bisa mengirim data baru.</p>
                                <div className="mt-3 bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                    <h5 className="font-bold text-white text-xs mb-1">Langkah Pembersihan Aman:</h5>
                                    <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-300">
                                        <li>Buka menu <strong>Pengaturan {'>'} Data & Cloud</strong>.</li>
                                        <li>Cari bagian <strong>"Manajemen Penyimpanan Cloud"</strong>.</li>
                                        <li>Klik tombol merah <strong>"Kosongkan Riwayat Cloud (Reset)"</strong>.</li>
                                        <li>Sistem akan otomatis mengunduh <strong>Backup Lokal (.json)</strong> ke perangkat Anda sebagai arsip permanen.</li>
                                        <li>Setelah download selesai, sistem akan menghapus riwayat transaksi lama di Cloud untuk mengembalikan kapasitas.</li>
                                    </ol>
                                    <p className="text-[10px] text-green-400 mt-2 italic">Catatan: Data Produk, Pelanggan, dan Diskon di Cloud TIDAK akan dihapus. Hanya riwayat transaksi lama yang dibersihkan.</p>
                                </div>
                            </AccordionItem>
                            <AccordionItem title="Import Riwayat Transaksi (Pindah Perangkat)" isOpen={openAccordion === 'import_trans'} onToggle={() => toggleAccordion('import_trans')} icon="upload">
                                <p>Fitur ini digunakan jika Anda ingin memindahkan data laporan penjualan dari perangkat kasir satu ke perangkat lain (misal: Tablet Karyawan ke Laptop Owner).</p>
                                <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-slate-300">
                                    <li><strong>Di Perangkat Sumber (Perangkat Kasir):</strong> Pergi ke menu Laporan, klik <strong>"Export CSV"</strong>. Kirim file CSV tersebut ke perangkat tujuan.</li>
                                    <li><strong>Di Perangkat Tujuan (Perangkat Owner):</strong> Buka <strong>Pengaturan {'>'} Data & Sistem</strong>.</li>
                                    <li>Klik tombol <strong>"Import File CSV"</strong> di bagian Laporan & Transaksi Lama.</li>
                                    <li>Pilih file CSV yang tadi dikirim. Riwayat transaksi akan digabungkan ke aplikasi ini.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Backup & Restore (Lokal)" isOpen={openAccordion === 'backup'} onToggle={() => toggleAccordion('backup')} icon="warning">
                                <p className="text-yellow-300 font-bold mb-2">Aplikasi ini berjalan OFFLINE di browser Anda. Jika Anda menghapus cache browser atau ganti perangkat, data bisa hilang jika tidak dibackup.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Backup:</strong> Klik tombol database di kanan atas (sebelah tombol bantuan). Pilih "Backup Lokal". Simpan file JSON yang terunduh di tempat aman (Google Drive/WA).</li>
                                    <li><strong>Restore:</strong> (Hanya Admin) Gunakan file JSON tersebut untuk mengembalikan data di perangkat baru.</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Sinkronisasi Cloud (Dropbox)" isOpen={openAccordion === 'dropbox'} onToggle={() => toggleAccordion('dropbox')} icon="upload">
                                <p>Simpan dan sinkronkan data antar perangkat menggunakan akun Dropbox Anda.</p>
                                <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-slate-300">
                                    <li><strong>Persiapan:</strong> Anda butuh "Access Token" dari Dropbox App Console. (Panduan link ada di menu Pengaturan).</li>
                                    <li><strong>Setup:</strong> Masuk ke <strong>Pengaturan {'>'} Data & Sistem</strong>, tempel token di kolom "Dropbox Access Token".</li>
                                    <li><strong>Upload:</strong> Tekan "Upload ke Cloud" untuk mencadangkan data perangkat ini ke Dropbox.</li>
                                    <li><strong>Update Data:</strong> Staf bisa menekan tombol database di kanan atas dan memilih "Update dari Pusat" untuk mengambil data terbaru.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Database Real-time (Supabase BYOB)" isOpen={openAccordion === 'supabase'} onToggle={() => toggleAccordion('supabase')} icon="database">
                                <p><strong>Fitur Lanjutan untuk Admin / Pemilik Toko.</strong></p>
                                <p>Berbeda dengan Dropbox yang hanya menyimpan file backup, fitur ini mengirim data transaksi per-item secara <em>live</em> ke database cloud pribadi Anda.</p>
                                <p className="mt-2 font-bold text-white">Cara Setup:</p>
                                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300">
                                    <li>Daftar di <strong>Supabase.com</strong> dan buat project baru.</li>
                                    <li>Salin <strong>Project URL</strong> dan <strong>Anon Key</strong> dari pengaturan API Supabase.</li>
                                    <li>Tempel di aplikasi Artea POS menu <strong>Pengaturan {'>'} Data & Sistem</strong>.</li>
                                    <li>Klik tombol "Panduan & SQL Script" di pengaturan untuk membuat tabel database secara otomatis.</li>
                                </ol>
                            </AccordionItem>
                        </div>
                    </div>

                </div>
            )}

            {/* Content: License */}
            {activeTab === 'license' && (
                <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="text-center mb-6">
                            <Icon name="lock" className="w-12 h-12 text-[#52a37c] mx-auto mb-2" />
                            <h2 className="text-2xl font-bold text-white">Lisensi Perangkat Lunak</h2>
                            <p className="text-slate-400 text-sm">Hak dan kewajiban Anda sebagai pengguna.</p>
                        </div>
                        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                            {renderMarkdown(APP_LICENSE_ID)}
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
                        <p className="text-slate-400 font-mono text-sm mb-6">Versi 2.4.0 (15122025)</p>
                        
                        <p className="text-slate-300 mb-6 leading-relaxed">
                            Artea POS adalah aplikasi Point of Sale (POS) atau kasir yang dirancang untuk usaha kecil dan menengah di bidang makanan dan minuman. Aplikasi ini dapat berjalan di browser tanpa memerlukan koneksi internet untuk operasional sehari-hari, memastikan bisnis Anda tetap berjalan lancar kapan saja.
                        </p>

                        {/* Catatan dari Pengembang (Restored) */}
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 mb-8 text-left">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                                <Icon name="info-circle" className="w-4 h-4 text-[#52a37c]"/> Catatan dari Pengembang
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Tujuan awal dibuatnya aplikasi ini adalah untuk membantu merapikan administrasi di usaha kami yang bernama <a href="https://arteagrup.my.id" target="_blank" rel="noopener noreferrer" className="text-[#52a37c] hover:underline hover:text-[#7ac0a0]">Artea</a>. Jadi, harap maklum jika fiturnya belum selengkap aplikasi kasir komersial. Dengan dipublikasikannya aplikasi ini, kami berharap bisa bermanfaat bagi yang membutuhkan dan dapat berkembang bersama melalui kolaborasi komunitas. Bagi anda yang merasa terbantu dan ingin mendukung proyek ini bisa memberikan traktir kopi atau merekomendasikan aplikasi ini ke saudara kita yang membutuhkan.
                            </p>
                        </div>

                        {/* Changelog Section */}
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 mb-8 text-left">
                            <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-sm border-b border-slate-700 pb-2">
                                <Icon name="trending-up" className="w-4 h-4 text-[#52a37c]"/> Catatan Rilis (Changelog)
                            </h4>
                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                {releaseNotes.map((release, index) => (
                                    <div key={index}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-[#52a37c] text-xs">{release.version}</span>
                                            <span className="text-[10px] text-slate-500">{release.date}</span>
                                        </div>
                                        <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                                            {release.changes.map((change, idx) => (
                                                <li key={idx}>{change}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
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
                                <p className="text-white mt-1">Local-First (Cloud Opsional)</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Developer</span>
                                <a href="https://aiprojek01.my.id" target="_blank" rel="noopener noreferrer" className="text-[#52a37c] font-semibold mt-1 hover:underline hover:text-[#7ac0a0] block">
                                    AI Projek
                                </a>
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

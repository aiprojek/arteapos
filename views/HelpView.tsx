
import React, { useState } from 'react';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { APP_LICENSE_ID } from '../constants';

// --- UI Components for Help Section ---

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    icon?: React.ComponentProps<typeof Icon>['name'];
    colorClass?: string;
    badge?: string;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, isOpen, onToggle, icon = 'question', colorClass = 'text-slate-200', badge }) => (
    <div className={`border rounded-lg transition-all duration-300 overflow-hidden mb-3 ${isOpen ? 'border-[#347758] bg-slate-800' : 'border-slate-700 bg-slate-800/50'}`}>
        <button 
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 text-left focus:outline-none group hover:bg-slate-700/50 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-slate-900 ${colorClass}`}>
                    <Icon name={icon} className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <span className={`font-semibold text-sm sm:text-base ${isOpen ? 'text-white' : 'text-slate-300'}`}>{title}</span>
                    {badge && <span className="text-[10px] text-yellow-400 font-normal mt-0.5">{badge}</span>}
                </div>
            </div>
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} className={`w-5 h-5 transition-colors ${isOpen ? 'text-[#52a37c]' : 'text-slate-500'}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 pt-0 border-t border-slate-700/50 text-slate-300 text-sm leading-relaxed space-y-3 bg-slate-900/30">
                {children}
            </div>
        </div>
    </div>
);

const SectionHeader: React.FC<{ title: string; icon: any; desc: string }> = ({ title, icon, desc }) => (
    <div className="mb-4 mt-8 pb-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
            <Icon name={icon} className="w-6 h-6 text-[#52a37c]" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 ml-8">{desc}</p>
    </div>
);

const ScenarioCard: React.FC<{ 
    title: string; 
    icon: any; 
    color: string; 
    desc: string; 
    steps: string[] 
}> = ({ title, icon, color, desc, steps }) => {
    // Mapping color names to tailwind classes explicitly to ensure safelist
    const colorMap: Record<string, string> = {
        'green-400': 'text-green-400',
        'pink-400': 'text-pink-400',
        'yellow-400': 'text-yellow-400',
        'sky-400': 'text-sky-400',
    };
    const textColor = colorMap[color] || 'text-slate-400';

    return (
        <div className={`bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors relative overflow-hidden group h-full`}>
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${textColor}`}>
                <Icon name={icon} className="w-24 h-24" />
            </div>
            <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${textColor}`}>
                <Icon name={icon} className="w-6 h-6" /> {title}
            </h3>
            <p className="text-sm text-slate-300 mb-4 min-h-[40px] leading-relaxed">{desc}</p>
            <div className="space-y-3">
                {steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start text-sm text-slate-400">
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full bg-slate-900 ${textColor} flex items-center justify-center text-xs font-bold mt-0.5 border border-slate-700`}>
                            {idx + 1}
                        </span>
                        <span>{step}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HelpView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'scenarios' | 'manual' | 'license' | 'about'>('scenarios');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(prev => prev === id ? null : id);
    };

    const tabs = [
        { id: 'scenarios', label: 'Skenario & Alur', icon: 'share' },
        { id: 'manual', label: 'Buku Manual', icon: 'book' },
        { id: 'license', label: 'Lisensi', icon: 'lock' },
        { id: 'about', label: 'Tentang', icon: 'info-circle' },
    ] as const;

    const renderMarkdown = (text: string) => {
        return text.split('\n').map((line, idx) => {
            const content = line.trim();
            if (!content) return <br key={idx} />;
            if (content.startsWith('###')) return <h3 key={idx} className="text-lg font-bold text-[#52a37c] mt-4 mb-2">{content.replace('###', '')}</h3>;
            if (content.startsWith('**')) return <p key={idx} className="font-bold text-white mt-3 mb-1">{content.replace(/\*\*/g, '')}</p>;
            return <p key={idx} className="text-slate-300 leading-relaxed text-sm mb-1">{content.replace(/\*\*/g, '')}</p>;
        });
    };

    return (
        <div className="max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="text-center py-8">
                <div className="inline-block p-3 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-lg">
                    <Icon name="logo" className="w-12 h-12 text-[#52a37c]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Pusat Bantuan</h1>
                <p className="text-slate-400 mt-2 max-w-xl mx-auto text-sm sm:text-base">
                    Dokumentasi lengkap penggunaan Artea POS, mulai dari persiapan awal hingga manajemen multi-cabang.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="sticky top-0 z-30 py-3 mb-8 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
                <div className="flex justify-center overflow-x-auto px-4 hide-scrollbar">
                    <div className="bg-slate-800 p-1 rounded-xl flex gap-1 shadow-lg border border-slate-700">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as any); setOpenAccordion(null); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
                                    ${activeTab === tab.id ? 'bg-[#347758] text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                <Icon name={tab.icon} className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- TAB 1: SKENARIO PENGGUNAAN (Workflow) --- */}
            {activeTab === 'scenarios' && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl text-center max-w-3xl mx-auto">
                        <h2 className="text-xl font-bold text-white mb-2">Pilih Model Operasional Anda</h2>
                        <p className="text-slate-400 text-sm">
                            Aplikasi ini dirancang fleksibel. Anda tidak perlu menggunakan semua fitur. Cukup ikuti alur yang sesuai dengan kebutuhan bisnis Anda.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <ScenarioCard 
                            title="1. Solo / Mandiri (100% Offline)" 
                            icon="users" 
                            color="green-400"
                            desc="Cocok untuk pemilik toko yang menjaga kasir sendiri. Tidak butuh internet."
                            steps={[
                                "Login sebagai Admin.",
                                "Input Produk langsung di menu 'Produk'.",
                                "Jualan seperti biasa di menu 'Kasir'.",
                                "Lihat laporan harian langsung di menu 'Laporan'.",
                                "Wajib: Lakukan 'Backup Lokal (JSON)' seminggu sekali untuk keamanan data."
                            ]}
                        />

                        <ScenarioCard 
                            title="2. Satu Device, Banyak User" 
                            icon="lock" 
                            color="pink-400"
                            desc="Satu tablet/PC dipakai bergantian oleh Owner dan Staf (Shift). Cocok untuk 1 Toko."
                            steps={[
                                "Admin membuat akun 'Staf' di menu Pengaturan > Keamanan.",
                                "Tidak perlu isi 'Data Cabang' jika hanya punya 1 toko (otomatis Pusat).",
                                "Staf login menggunakan PIN-nya untuk berjualan (Akses Terbatas).",
                                "Saat ganti shift, klik Logout. Owner login dengan PIN Admin untuk cek laporan.",
                            ]}
                        />

                        <ScenarioCard 
                            title="3. Owner + Staf (Laporan & Import)" 
                            icon="whatsapp" 
                            color="yellow-400"
                            desc="Owner memantau dari jauh tanpa Cloud. Staf kirim file, Owner import di HP sendiri."
                            steps={[
                                "Staf berjualan dan melakukan Tutup Shift seperti biasa.",
                                "Di menu Laporan, Staf klik 'Kirim Laporan' -> Pilih 'Laporan Aman' (Kode) atau 'File CSV'.",
                                "Owner menerima kode enkripsi atau file laporan via WhatsApp.",
                                "Owner buka Artea POS di HP sendiri -> Masuk ke Pengaturan > Data > 'Import Transaksi' (CSV) atau 'Paste Teks' (Kode) untuk melihat detail lengkap."
                            ]}
                        />

                        <ScenarioCard 
                            title="4. Cloud Sync (Multi-Cabang)" 
                            icon="wifi" 
                            color="sky-400"
                            desc="Hubungkan banyak cabang secara terpusat. Gunakan Dropbox (Mudah) atau Supabase (Realtime)."
                            steps={[
                                "Admin (Pusat): Daftarkan semua ID cabang (misal: JKT-01, BDG-01) di menu Pengaturan > Toko.",
                                "Admin (Pusat): Hubungkan Cloud (Dropbox/Supabase) di menu Data, lalu data konfigurasi akan terkirim otomatis.",
                                "Cabang: Cukup hubungkan akun Cloud yang sama di menu Pengaturan > Data.",
                                "Cabang: Klik tombol 'Update dari Pusat' di menu atas. Popup pilihan cabang akan muncul otomatis."
                            ]}
                        />
                    </div>
                </div>
            )}

            {/* --- TAB 2: MANUAL FITUR LENGKAP --- */}
            {activeTab === 'manual' && (
                <div className="animate-fade-in max-w-4xl mx-auto">
                    
                    {/* 1. SETUP */}
                    <SectionHeader title="1. Persiapan Awal (Setup)" icon="settings" desc="Konfigurasi dasar sebelum mulai berjualan." />
                    <div className="space-y-2">
                        <AccordionItem title="Identitas Toko & Pajak" isOpen={openAccordion === 'setup_1'} onToggle={() => toggleAccordion('setup_1')} icon="printer" colorClass="text-blue-400">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Masuk ke <strong>Pengaturan {'>'} Toko & Struk</strong>.</li>
                                <li><strong>Store ID:</strong> Kode unik toko Anda (misal `TOKO-01`). Jika Anda hanya punya 1 toko, biarkan default atau isi `PUSAT`.</li>
                                <li><strong>Pajak & Service:</strong> Isi persentase (misal PPN 10%). Sistem akan otomatis menghitung pajak di setiap transaksi.</li>
                                <li><strong>Kontak Admin:</strong> Isi nomor WhatsApp Admin (format 628...) agar staf bisa mengirim laporan atau meminta reset PIN via WhatsApp.</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Manajemen User (Admin, Manager, Staf)" isOpen={openAccordion === 'setup_2'} onToggle={() => toggleAccordion('setup_2')} icon="users" colorClass="text-red-400">
                            <p>Artea POS mendukung 3 level akses:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2 mb-2">
                                <li><strong>Admin:</strong> Akses penuh (termasuk reset data).</li>
                                <li><strong>Manager:</strong> Bisa edit produk & lihat laporan, tapi tidak bisa hapus data/user.</li>
                                <li><strong>Staf:</strong> Hanya bisa transaksi kasir & laporan shift sendiri.</li>
                            </ul>
                            <div className="bg-slate-800 p-2 rounded border border-slate-600 mt-2">
                                💡 <strong>Tips:</strong> Segera ganti PIN default Admin (1111) di menu Pengaturan > Keamanan untuk mencegah akses tidak sah.
                            </div>
                        </AccordionItem>
                    </div>

                    {/* 2. PRODUK & STOK */}
                    <SectionHeader title="2. Manajemen Produk & Stok" icon="boxes" desc="Mengatur menu, varian, dan inventaris." />
                    <div className="space-y-2">
                        <AccordionItem title="Modifier & Varian (Baru!)" isOpen={openAccordion === 'inv_1'} onToggle={() => toggleAccordion('inv_1')} icon="tag" colorClass="text-purple-400" badge="Fitur Baru">
                            <p>Fitur <strong>Modifier</strong> menggantikan Varian lama dengan sistem yang lebih fleksibel.</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong>Grup Modifier:</strong> Contoh "Level Gula" atau "Topping".</li>
                                <li><strong>Single Selection (Radio):</strong> Gunakan untuk opsi yang harus dipilih satu (misal: Panas/Dingin). Set Max Pilih = 1.</li>
                                <li><strong>Multi Selection (Checkbox):</strong> Gunakan untuk topping (bisa pilih Keju DAN Coklat). Set Max Pilih > 1.</li>
                                <li>Harga pada opsi modifier akan otomatis ditambahkan ke harga dasar produk.</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Resep & Bundling (Potong Stok Bahan)" isOpen={openAccordion === 'inv_2'} onToggle={() => toggleAccordion('inv_2')} icon="ingredients" colorClass="text-orange-400">
                            <p>Gunakan fitur ini jika Anda ingin stok berkurang otomatis berdasarkan bahan baku.</p>
                            <ol className="list-decimal pl-5 space-y-1 mt-2">
                                <li>Input dulu bahan mentah di menu <strong>Bahan Baku</strong> (cth: Kopi Bubuk, Susu).</li>
                                <li>Di menu Produk, edit produk (cth: Kopi Susu).</li>
                                <li>Aktifkan "Lacak Stok" -> "Mode Resep".</li>
                                <li>Tambahkan komposisi: 1 Kopi Susu = 15gr Kopi Bubuk + 100ml Susu.</li>
                                <li>Saat Kopi Susu terjual, stok Kopi Bubuk & Susu akan berkurang.</li>
                            </ol>
                        </AccordionItem>
                        <AccordionItem title="Stock Opname (Audit Stok)" isOpen={openAccordion === 'inv_3'} onToggle={() => toggleAccordion('inv_3')} icon="file-lock" colorClass="text-sky-400">
                            <p>Lakukan ini secara berkala (mingguan/bulanan) untuk mencocokkan stok aplikasi dengan gudang.</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Klik tombol <strong>Stock Opname</strong> di menu Produk/Bahan Baku.</li>
                                <li>Isi kolom "Fisik" sesuai hitungan riil di gudang.</li>
                                <li>Sistem akan menghitung selisih dan mencatatnya di <strong>Laporan > Riwayat Stok</strong>.</li>
                                <li>Catatan audit akan menyertakan siapa yang melakukan opname.</li>
                            </ul>
                        </AccordionItem>
                    </div>

                    {/* 3. KASIR & TRANSAKSI */}
                    <SectionHeader title="3. Operasional Kasir (POS)" icon="cash" desc="Cara melakukan transaksi penjualan." />
                    <div className="space-y-2">
                        <AccordionItem title="Split Bill (Pisah Bayar)" isOpen={openAccordion === 'pos_split'} onToggle={() => toggleAccordion('pos_split')} icon="share" colorClass="text-blue-400" badge="Baru">
                            <p>Berguna jika satu meja ingin bayar masing-masing.</p>
                            <ol className="list-decimal pl-5 space-y-1 mt-2">
                                <li>Masukkan semua pesanan ke keranjang.</li>
                                <li>Klik tombol <strong>Split</strong> di bawah keranjang.</li>
                                <li>Pilih item mana saja yang mau dibayar <strong>sekarang</strong>.</li>
                                <li>Klik "Pisahkan & Bayar".</li>
                                <li>Item yang <strong>tidak dipilih</strong> akan otomatis dipindahkan ke "Pesanan Disimpan" (Tab Baru) untuk dibayar nanti.</li>
                            </ol>
                        </AccordionItem>
                        <AccordionItem title="Simpan Pesanan (Open Bill/Tab)" isOpen={openAccordion === 'pos_hold'} onToggle={() => toggleAccordion('pos_hold')} icon="clipboard" colorClass="text-yellow-400">
                            <p>Untuk restoran (sistem meja) atau pelanggan yang belum selesai belanja.</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Klik <strong>"Simpan Pesanan"</strong> (ikon + di atas keranjang). Beri nama (misal: "Meja 5").</li>
                                <li>Keranjang akan kosong dan siap untuk pelanggan lain.</li>
                                <li>Untuk memanggil kembali, klik tab nama pesanan di bagian atas keranjang.</li>
                                <li>Anda bisa punya banyak pesanan tersimpan sekaligus.</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Diskon & Potongan Harga" isOpen={openAccordion === 'pos_disc'} onToggle={() => toggleAccordion('pos_disc')} icon="tag" colorClass="text-green-400">
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Diskon Per Item:</strong> Klik ikon tag pada item di keranjang.</li>
                                <li><strong>Diskon Total (Keranjang):</strong> Klik tombol "Diskon Total" di bawah keranjang.</li>
                                <li>Anda bisa memilih diskon preset (diatur di Pengaturan) atau diskon manual (Rp atau %).</li>
                            </ul>
                        </AccordionItem>
                    </div>

                    {/* 4. KEUANGAN */}
                    <SectionHeader title="4. Keuangan & Laporan" icon="finance" desc="Memantau arus kas, utang, dan laba." />
                    <div className="space-y-2">
                        <AccordionItem title="Manajemen Shift (Buka/Tutup Kasir)" isOpen={openAccordion === 'fin_shift'} onToggle={() => toggleAccordion('fin_shift')} icon="clock-history" colorClass="text-slate-400">
                            <p>Fitur wajib untuk mencegah kecurangan kasir.</p>
                            <ol className="list-decimal pl-5 space-y-1 mt-2">
                                <li><strong>Mulai Sesi:</strong> Masukkan modal awal (recehan) di laci.</li>
                                <li><strong>Transaksi:</strong> Jualan seperti biasa.</li>
                                <li><strong>Kas Keluar:</strong> Jika ambil uang laci (beli bensin/es), catat di menu 'Kas' -> 'Kas Keluar'.</li>
                                <li><strong>Tutup Sesi:</strong> Hitung fisik uang di laci -> Input ke aplikasi. Sistem akan menghitung selisih (Variance).</li>
                            </ol>
                        </AccordionItem>
                        <AccordionItem title="Utang & Piutang (Kasbon)" isOpen={openAccordion === 'fin_debt'} onToggle={() => toggleAccordion('fin_debt')} icon="book" colorClass="text-red-400" badge="Penting">
                            <p>Mencatat pelanggan yang bayar belakangan.</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li>Saat bayar, pilih metode "Non-Tunai" atau masukkan nominal bayar 0 jika belum bayar sama sekali.</li>
                                <li>Status transaksi akan menjadi <strong>Unpaid</strong> atau <strong>Partial</strong>.</li>
                                <li>Untuk melunasi: Pergi ke menu <strong>Keuangan > Utang & Piutang</strong>. Klik "Bayar" pada transaksi tersebut.</li>
                                <li>Pelunasan tunai akan otomatis tercatat sebagai "Kas Masuk" di sesi kasir yang sedang aktif.</li>
                            </ul>
                        </AccordionItem>
                    </div>

                    {/* 5. DATA & CLOUD */}
                    <SectionHeader title="5. Data, Cloud & Keamanan" icon="database" desc="Backup, Restore, dan Sinkronisasi." />
                    <div className="space-y-2">
                        <AccordionItem title="Backup & Restore (Wajib Dibaca)" isOpen={openAccordion === 'data_1'} onToggle={() => toggleAccordion('data_1')} icon="download" colorClass="text-blue-500">
                            <p className="text-red-400 font-bold mb-1">PERINGATAN:</p>
                            <p>Secara default, data tersimpan di browser (Offline). Jika HP hilang/rusak atau cache dihapus, data hilang.</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Rutinlah melakukan <strong>Backup Lokal</strong> di menu Pengaturan > Data.</li>
                                <li>Simpan file <code>.json</code> yang diunduh ke tempat aman (Google Drive pribadi / WA).</li>
                                <li>Untuk memindahkan data ke HP baru, copy file json tersebut dan gunakan fitur <strong>Restore</strong> di HP baru.</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Cloud Sync: Dropbox vs Supabase" isOpen={openAccordion === 'data_cloud'} onToggle={() => toggleAccordion('data_cloud')} icon="wifi" colorClass="text-sky-500">
                            <p className="text-sm mb-2">Anda tidak wajib menggunakan keduanya. Pilih salah satu sesuai kebutuhan:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                <div className="bg-slate-800 p-3 rounded border border-slate-600">
                                    <strong className="text-blue-400 block mb-1">Dropbox (Semi-Realtime)</strong>
                                    <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                                        <li>Berbasis File (JSON/CSV).</li>
                                        <li>Update dikirim otomatis setiap kali transaksi selesai atau stok berubah.</li>
                                        <li>Mudah disetting, gratis, dan cukup untuk laporan harian.</li>
                                        <li>Juga berfungsi sebagai backup otomatis.</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-800 p-3 rounded border border-slate-600">
                                    <strong className="text-green-400 block mb-1">Supabase (Realtime DB)</strong>
                                    <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                                        <li>Berbasis Database SQL (Lebih Canggih).</li>
                                        <li>Data muncul di Dashboard Pusat detik itu juga (Live).</li>
                                        <li>Butuh setup teknis (SQL Script) di awal.</li>
                                        <li>Cocok untuk memantau traffic tinggi secara live.</li>
                                    </ul>
                                </div>
                            </div>
                        </AccordionItem>
                        <AccordionItem title="Reset Darurat & Lupa PIN" isOpen={openAccordion === 'data_2'} onToggle={() => toggleAccordion('data_2')} icon="warning" colorClass="text-red-500">
                            <p>Jika Admin lupa PIN dan tidak bisa masuk:</p>
                            <ol className="list-decimal pl-5 mt-2 space-y-1">
                                <li>Di layar Login, ketuk <strong>Logo Aplikasi</strong> sebanyak <strong>5 kali</strong> dengan cepat.</li>
                                <li>Jawab <strong>Pertanyaan Keamanan</strong> yang telah diatur Admin (Default: "artea").</li>
                                <li>Jika jawaban benar, Menu Pemulihan akan terbuka.</li>
                                <li>Pilih opsi utama <strong>"Atur PIN Admin Baru"</strong> untuk mengganti sandi tanpa menghapus data.</li>
                                <li>Jika database rusak, tersedia opsi lanjutan untuk Restore Backup atau Factory Reset.</li>
                            </ol>
                            <div className="bg-slate-800 p-2 rounded border border-slate-600 mt-2 text-xs">
                                💡 <strong>Tips untuk Staf:</strong> Jika Staf lupa PIN, cukup klik tombol "Lupa PIN" di layar login untuk menghubungi Admin via WhatsApp.
                            </div>
                        </AccordionItem>
                    </div>
                </div>
            )}

            {/* --- TAB 3: LICENSE --- */}
            {activeTab === 'license' && (
                <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="text-center mb-6">
                            <Icon name="lock" className="w-12 h-12 text-[#52a37c] mx-auto mb-2" />
                            <h2 className="text-2xl font-bold text-white">Lisensi Perangkat Lunak</h2>
                            <p className="text-slate-400 text-sm">Hak dan kewajiban Anda sebagai pengguna.</p>
                        </div>
                        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 max-h-[60vh] overflow-y-auto">
                            {renderMarkdown(APP_LICENSE_ID)}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 4: ABOUT --- */}
            {activeTab === 'about' && (
                <div className="max-w-2xl mx-auto text-center animate-fade-in space-y-8">
                    <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700">
                        <Icon name="logo" className="w-20 h-20 text-[#52a37c] mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Artea POS</h2>
                        <p className="text-slate-400 font-mono text-sm mb-6">Versi 13122025 (Community Edition)</p>
                        
                        <div className="text-left text-slate-300 space-y-4 mb-8 text-sm leading-relaxed">
                            <p>
                                <strong>Artea POS</strong> adalah aplikasi Point of Sale (POS) atau kasir <em>offline-first</em> berbasis web yang dirancang untuk usaha kecil dan menengah di bidang makanan dan minuman serta usaha lainnya. Aplikasi ini sepenuhnya berjalan di browser Anda, menyimpan semua data secara lokal, sehingga dapat beroperasi dengan lancar meski tanpa koneksi internet.
                            </p>
                            <p>
                                Proyek ini bersifat <em>open-source</em> dengan tujuan menyediakan alternatif aplikasi kasir yang bebas, mudah digunakan, dan dapat diandalkan.
                            </p>
                            <div className="bg-slate-900/50 p-4 rounded-lg border-l-4 border-[#52a37c] text-slate-400 text-xs sm:text-sm">
                                <strong className="text-white block mb-1">Catatan dari Pengembang:</strong>
                                Tujuan awal dibuatnya aplikasi ini adalah untuk membantu merapikan administrasi di usaha yang bernama <a href="https://arteagrup.my.id" target="_blank" rel="noopener noreferrer" className="text-[#52a37c] hover:underline">Artea</a>. Jadi, harap maklum jika fiturnya belum selengkap aplikasi kasir komersial. Dengan dipublikasikannya aplikasi ini, kami berharap bisa bermanfaat bagi yang membutuhkan dan dapat berkembang bersama melalui kolaborasi komunitas.
                            </div>

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
                            <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" className="bg-pink-900/30 text-pink-400 hover:bg-pink-900/50 border border-pink-900/50">
                                    <Icon name="donate" className="w-5 h-5" /> Traktir Kopi
                                </Button>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HelpView;

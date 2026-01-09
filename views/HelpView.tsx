
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
    <div className="mb-4 mt-10 pb-2 border-b border-slate-700 first:mt-0">
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
                        <span dangerouslySetInnerHTML={{__html: step}} />
                    </div>
                ))}
            </div>
        </div>
    );
};

const HelpView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'scenarios' | 'manual' | 'faq' | 'license' | 'about'>('scenarios');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(prev => prev === id ? null : id);
    };

    const tabs = [
        { id: 'scenarios', label: 'Skenario', icon: 'share' },
        { id: 'manual', label: 'Panduan Menu', icon: 'book' },
        { id: 'faq', label: 'FAQ', icon: 'question' },
        { id: 'license', label: 'Lisensi', icon: 'lock' },
        { id: 'about', label: 'Tentang', icon: 'info-circle' },
    ] as const;

    const renderMarkdown = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        return text.split('\n').map((line, idx) => {
            const content = line.trim();
            if (!content) return <br key={idx} />;
            
            if (content.startsWith('###')) {
                return <h3 key={idx} className="text-lg font-bold text-[#52a37c] mt-4 mb-2">{content.replace('###', '')}</h3>;
            }
            if (content.startsWith('####')) {
                return <h4 key={idx} className="text-md font-bold text-white mt-3 mb-2">{content.replace('####', '')}</h4>;
            }
            if (content.startsWith('**')) {
                return <p key={idx} className="font-bold text-white mt-3 mb-1">{content.replace(/\*\*/g, '')}</p>;
            }

            if (content.match(urlRegex)) {
                const parts = content.split(urlRegex);
                return (
                    <p key={idx} className="text-slate-300 leading-relaxed text-sm mb-1">
                        {parts.map((part, i) => 
                            part.match(urlRegex) ? 
                                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#52a37c] hover:underline break-all font-medium">{part}</a> 
                                : part.replace(/\*\*/g, '')
                        )}
                    </p>
                );
            }

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
                    Panduan lengkap penggunaan setiap fitur dan menu di Artea POS.
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

            {/* --- TAB 1: SKENARIO (WORKFLOW) --- */}
            {activeTab === 'scenarios' && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl text-center max-w-3xl mx-auto">
                        <h2 className="text-xl font-bold text-white mb-2">Pilih Model Operasional Anda</h2>
                        <p className="text-slate-400 text-sm">
                            Pahami cara kerja aplikasi berdasarkan kebutuhan bisnis Anda.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <ScenarioCard 
                            title="1. Offline Mandiri (Single Device)" 
                            icon="users" 
                            color="green-400"
                            desc="Cocok untuk pemilik toko yang menjaga kasir sendiri. Tidak butuh internet."
                            steps={[
                                "Input Produk langsung di menu 'Produk'.",
                                "Jualan di menu 'Kasir'. Data tersimpan di browser.",
                                "Lihat laporan harian di menu 'Laporan'.",
                                "Wajib: Lakukan 'Backup Lokal' (Settings &rarr; Data) seminggu sekali untuk keamanan."
                            ]}
                        />
                        <ScenarioCard 
                            title="2. Owner + Staff (Remote Report)" 
                            icon="whatsapp" 
                            color="yellow-400"
                            desc="Owner memantau dari jauh tanpa Cloud. Staff kirim laporan via WA."
                            steps={[
                                "Staff berjualan & Tutup Shift seperti biasa.",
                                "Di menu Laporan, Staff klik 'Kirim Laporan' &rarr; Pilih 'Laporan Aman' (Kode) atau 'File CSV'.",
                                "Kirim ke WA Owner.",
                                "Owner buka Artea POS di HP sendiri &rarr; 'Import Transaksi' &rarr; Paste Kode/Upload CSV untuk melihat data."
                            ]}
                        />
                        <ScenarioCard 
                            title="3. Cloud Sync (Multi-Cabang)" 
                            icon="wifi" 
                            color="sky-400"
                            desc="Sinkronisasi otomatis antar cabang menggunakan Dropbox."
                            steps={[
                                "Admin (Pusat): Hubungkan akun Dropbox di menu Pengaturan &rarr; Data.",
                                "Admin: Upload 'Master Data' (Produk/Harga/Diskon) ke Dropbox.",
                                "Cabang: Hubungkan akun Dropbox yang SAMA persis.",
                                "Cabang: Data penjualan terkirim otomatis. Admin <strong>WAJIB</strong> tekan tombol <strong>'Refresh Data'</strong> di Dashboard/Laporan untuk menarik data terbaru."
                            ]}
                        />
                        <ScenarioCard 
                            title="4. Shift & Keamanan (Anti-Fraud)" 
                            icon="lock" 
                            color="pink-400"
                            desc="Mencegah kecurangan kasir dengan sistem sesi dan audit."
                            steps={[
                                "Aktifkan 'Wajibkan Sesi' di Pengaturan.",
                                "Staff harus input modal awal saat login.",
                                "Semua aktivitas sensitif (Hapus produk, Refund, Edit Stok) tercatat di 'Audit Log'.",
                                "Saat tutup, sistem menghitung selisih (Variance) uang di laci vs sistem."
                            ]}
                        />
                    </div>
                </div>
            )}

            {/* --- TAB 2: PANDUAN PER MENU (MANUAL) --- */}
            {activeTab === 'manual' && (
                <div className="animate-fade-in max-w-4xl mx-auto space-y-12">
                    
                    {/* MENU 1: DASHBOARD */}
                    <div>
                        <SectionHeader title="Menu: Dashboard" icon="reports" desc="Pusat pemantauan performa bisnis secara visual." />
                        <div className="space-y-2">
                            <AccordionItem title="Statistik & Grafik" isOpen={openAccordion === 'dash_1'} onToggle={() => toggleAccordion('dash_1')} icon="trending-up" colorClass="text-sky-400">
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Kartu Atas:</strong> Ringkasan Penjualan Hari Ini, Jumlah Transaksi, Total Piutang Belum Dibayar, dan Peringatan Stok Menipis.</li>
                                    <li><strong>Grafik Tren:</strong> Menampilkan pergerakan omzet selama 7 hari terakhir.</li>
                                    <li><strong>Produk Terlaris:</strong> Top 5 produk dengan penjualan tertinggi minggu ini.</li>
                                    <li><strong>Mode Cloud:</strong> Aktifkan "Mode Dropbox" untuk melihat laporan gabungan dari semua cabang.</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Tombol Refresh (Khusus Admin)" isOpen={openAccordion === 'dash_3'} onToggle={() => toggleAccordion('dash_3')} icon="reset" colorClass="text-blue-400" badge="Penting">
                                <p>Jika Anda menggunakan fitur Cloud/Dropbox:</p>
                                <ul className="list-disc pl-5 space-y-1 mt-2">
                                    <li>Data cabang <strong>tidak muncul otomatis</strong> (real-time) di layar Admin.</li>
                                    <li>Anda harus menekan tombol <strong>"Refresh Data"</strong> (ikon panah melingkar) yang tersedia di Dashboard, Laporan, atau Keuangan.</li>
                                    <li>Tombol ini akan memerintahkan aplikasi untuk mengunduh file data terbaru yang dikirim oleh cabang ke Dropbox.</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Artea AI (Analisis Cerdas)" isOpen={openAccordion === 'dash_2'} onToggle={() => toggleAccordion('dash_2')} icon="chat" colorClass="text-purple-400" badge="AI">
                                <p>Asisten cerdas yang menganalisis data penjualan Anda.</p>
                                <ul className="list-disc pl-5 space-y-1 mt-2">
                                    <li>Ketik pertanyaan seperti "Bagaimana cara meningkatkan omzet?" atau "Analisis tren minggu ini".</li>
                                    <li>AI akan membaca data grafik dan memberikan saran strategi bisnis praktis dalam Bahasa Indonesia.</li>
                                </ul>
                            </AccordionItem>
                        </div>
                    </div>

                    {/* MENU 2: KASIR */}
                    <div>
                        <SectionHeader title="Menu: Kasir (POS)" icon="cash" desc="Halaman utama untuk melakukan transaksi penjualan." />
                        <div className="space-y-2">
                            <AccordionItem title="Alur Transaksi Dasar" isOpen={openAccordion === 'pos_1'} onToggle={() => toggleAccordion('pos_1')} icon="pay" colorClass="text-green-400">
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li><strong>Pilih Produk:</strong> Klik produk di daftar atau gunakan scan barcode.</li>
                                    <li><strong>Edit Keranjang:</strong> Klik item di keranjang kiri untuk mengubah jumlah, memberi diskon per item, atau menghapus.</li>
                                    <li><strong>Pilih Pelanggan (Opsional):</strong> Di bagian bawah keranjang, pilih pelanggan untuk mencatat poin member.</li>
                                    <li><strong>Bayar:</strong> Klik tombol "Bayar", pilih Tunai/Non-Tunai, masukkan nominal.</li>
                                    <li><strong>Struk:</strong> Setelah sukses, struk muncul. Bisa dicetak atau dibagikan gambar via WA.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Modifier & Varian (Topping/Level)" isOpen={openAccordion === 'pos_2'} onToggle={() => toggleAccordion('pos_2')} icon="tag" colorClass="text-blue-400">
                                <p>Jika produk memiliki varian (misal: Ukuran) atau modifier (misal: Topping, Gula):</p>
                                <ul className="list-disc pl-5 space-y-1 mt-2">
                                    <li>Pop-up akan muncul otomatis saat produk diklik.</li>
                                    <li><strong>Radio Button:</strong> Harus pilih satu (misal: Panas/Dingin).</li>
                                    <li><strong>Checkbox:</strong> Bisa pilih banyak (misal: Topping).</li>
                                    <li>Harga akan otomatis bertambah sesuai pilihan.</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Split Bill (Pisah Bayar)" isOpen={openAccordion === 'pos_3'} onToggle={() => toggleAccordion('pos_3')} icon="share" colorClass="text-orange-400" badge="Baru">
                                <p>Fitur untuk memecah satu pesanan menjadi beberapa pembayaran.</p>
                                <ol className="list-decimal pl-5 space-y-1 mt-2">
                                    <li>Masukkan semua pesanan ke keranjang.</li>
                                    <li>Klik tombol <strong>Split</strong> di bawah keranjang.</li>
                                    <li>Centang item mana saja yang mau dibayar <strong>sekarang</strong>.</li>
                                    <li>Klik "Pisahkan & Bayar". Item sisanya akan otomatis disimpan ke tab "Sisa Split" untuk dibayar orang berikutnya.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Simpan Pesanan (Open Bill)" isOpen={openAccordion === 'pos_4'} onToggle={() => toggleAccordion('pos_4')} icon="clipboard" colorClass="text-slate-400">
                                <p>Berguna untuk sistem meja (Restoran) atau pelanggan yang belum selesai belanja.</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Klik tombol <strong>"Simpan Pesanan"</strong>. Beri nama (misal: Meja 1).</li>
                                    <li>Keranjang akan bersih. Anda bisa melayani pelanggan lain.</li>
                                    <li>Untuk membuka kembali, klik tab nama pesanan di bagian atas keranjang.</li>
                                </ul>
                            </AccordionItem>
                        </div>
                    </div>

                    {/* MENU 3: PRODUK */}
                    <div>
                        <SectionHeader title="Menu: Produk & Bahan" icon="boxes" desc="Mengelola inventaris, harga, dan resep." />
                        <div className="space-y-2">
                            <AccordionItem title="Menambah & Mengedit Produk" isOpen={openAccordion === 'prod_1'} onToggle={() => toggleAccordion('prod_1')} icon="edit" colorClass="text-yellow-400">
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Info Dasar:</strong> Nama, Harga Jual, Kategori.</li>
                                    <li><strong>Gambar:</strong> Bisa upload file atau ambil foto langsung pakai kamera HP.</li>
                                    <li><strong>Barcode:</strong> Bisa diketik manual atau generate otomatis untuk diprint.</li>
                                    <li><strong>Harga Cabang:</strong> Anda bisa mengatur harga yang berbeda untuk Store ID tertentu (berguna saat sinkronisasi cloud).</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Resep & HPP (Tracking Bahan)" isOpen={openAccordion === 'prod_2'} onToggle={() => toggleAccordion('prod_2')} icon="ingredients" colorClass="text-red-400">
                                <p>Hubungkan produk dengan bahan baku untuk otomatisasi stok.</p>
                                <ol className="list-decimal pl-5 mt-2 space-y-1">
                                    <li>Masuk ke menu <strong>Bahan Baku</strong>, input stok mentah (misal: Kopi Bubuk, Susu).</li>
                                    <li>Di menu Produk, edit produk (misal: Kopi Susu). Aktifkan "Lacak Stok".</li>
                                    <li>Di bagian Resep, tambahkan komponen: 15gr Kopi + 100ml Susu.</li>
                                    <li><strong>HPP Otomatis:</strong> Sistem akan menghitung modal per cup berdasarkan harga bahan baku.</li>
                                    <li>Saat Kopi Susu terjual, stok Kopi Bubuk & Susu berkurang otomatis.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Stock Opname (Audit)" isOpen={openAccordion === 'prod_3'} onToggle={() => toggleAccordion('prod_3')} icon="file-lock" colorClass="text-blue-400">
                                <p>Fitur untuk mencocokkan stok di aplikasi dengan fisik di gudang.</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Klik tombol <strong>Stock Opname</strong>.</li>
                                    <li>Isi kolom "Fisik (Actual)" sesuai hitungan riil.</li>
                                    <li>Sistem akan menghitung selisih (Variance) dan mencatatnya di Log Audit.</li>
                                    <li>Stok di aplikasi akan diperbarui mengikuti angka Fisik.</li>
                                </ul>
                            </AccordionItem>
                        </div>
                    </div>

                    {/* MENU 4: KEUANGAN */}
                    <div>
                        <SectionHeader title="Menu: Keuangan" icon="finance" desc="Pusat pencatatan arus kas, utang, dan belanja." />
                        <div className="space-y-2">
                            <AccordionItem title="Arus Kas (Cash Flow)" isOpen={openAccordion === 'fin_1'} onToggle={() => toggleAccordion('fin_1')} icon="trending-up" colorClass="text-green-400">
                                <p>Tab ini adalah rangkuman dari semua aktivitas uang:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li><strong>Masuk:</strong> Penjualan Tunai + Pemasukan Lain.</li>
                                    <li><strong>Keluar:</strong> Pengeluaran Operasional + Pembelian Stok.</li>
                                    <li><strong>Saldo Bersih:</strong> Uang yang seharusnya ada di tangan saat ini (diluar modal kasir).</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Pembelian & Supplier (Kulakan)" isOpen={openAccordion === 'fin_2'} onToggle={() => toggleAccordion('fin_2')} icon="boxes" colorClass="text-blue-400">
                                <p>Gunakan fitur ini saat Anda belanja stok barang.</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Tambah Supplier dulu.</li>
                                    <li>Klik "Catat Pembelian". Masukkan barang apa saja yang dibeli dan harganya.</li>
                                    <li><strong>Otomatisasi:</strong> Stok barang akan bertambah, dan uang kas akan berkurang (tercatat sebagai pengeluaran).</li>
                                    <li>Bisa catat DP (Utang ke Supplier).</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Utang & Piutang (Kasbon)" isOpen={openAccordion === 'fin_3'} onToggle={() => toggleAccordion('fin_3')} icon="book" colorClass="text-red-400">
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Piutang (Kasbon Pelanggan):</strong> Terjadi jika saat transaksi kasir metode bayarnya "Non-Tunai" atau nominal bayar 0.</li>
                                    <li><strong>Cara Melunasi:</strong> Masuk tab Utang &amp; Piutang &rarr; Klik "Bayar" pada transaksi tersebut.</li>
                                    <li>Pelunasan akan masuk ke Arus Kas hari itu.</li>
                                </ul>
                            </AccordionItem>
                        </div>
                    </div>

                    {/* MENU 5: PENGATURAN */}
                    <div>
                        <SectionHeader title="Menu: Pengaturan" icon="settings" desc="Konfigurasi sistem, user, dan data." />
                        <div className="space-y-2">
                            <AccordionItem title="Perangkat Keras (Printer & Scanner)" isOpen={openAccordion === 'set_hw'} onToggle={() => toggleAccordion('set_hw')} icon="bluetooth" colorClass="text-purple-400" badge="Baru">
                                <p className="mb-2">Masuk ke tab <strong>"Perangkat Keras"</strong> untuk mengatur alat:</p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Printer Bluetooth:</strong> (Hanya Android/Chrome). Klik "Cari Printer", pilih perangkat, lalu tes print.</li>
                                    <li><strong>Printer USB/Kabel:</strong> Gunakan opsi "System Printer" (Dialog Browser). Pastikan matikan "Headers & Footers" di pengaturan print browser agar bersih.</li>
                                    <li><strong>Barcode Scanner:</strong> Sebagian besar scanner fisik bekerja sebagai keyboard. Colok/Pair, lalu arahkan kursor ke kolom tes untuk mencoba.</li>
                                    <li><strong>Kamera:</strong> Pastikan izin browser diberikan. Jika kamera belakang tidak terdeteksi, sistem akan mencoba kamera depan otomatis.</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Cloud Sync & Multi-Cabang (Dropbox)" isOpen={openAccordion === 'set_1'} onToggle={() => toggleAccordion('set_1')} icon="wifi" colorClass="text-sky-400">
                                <p>Fitur Cloud kini terpusat menggunakan <strong>Dropbox</strong> untuk kemudahan dan stabilitas.</p>
                                <div className="bg-slate-800 p-3 rounded border border-slate-600 mt-2">
                                    <strong className="text-blue-400 block mb-1">Fungsi Dropbox:</strong>
                                    <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                                        <li><strong>Backup Otomatis:</strong> Data penting disimpan ke folder aplikasi di Dropbox Anda.</li>
                                        <li><strong>Laporan Pusat:</strong> Jika Anda punya banyak cabang, setiap cabang akan mengirim data penjualan ke Dropbox.</li>
                                        <li><strong>Update Produk (Master Data):</strong> Admin pusat bisa mengupdate harga/produk lalu mengirimnya ke cabang via Dropbox.</li>
                                    </ul>
                                </div>
                                <p className="mt-2 text-xs text-slate-400">*Pastikan akun Dropbox yang digunakan di Pusat dan Cabang adalah <strong>akun yang sama</strong> agar data bisa saling terbaca.</p>
                            </AccordionItem>
                            <AccordionItem title="Keamanan & User" isOpen={openAccordion === 'set_2'} onToggle={() => toggleAccordion('set_2')} icon="lock" colorClass="text-red-400">
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Buat User Baru:</strong> Tambahkan akun Staf atau Manager.</li>
                                    <li><strong>PIN:</strong> Setiap user punya PIN 4 digit. Jangan gunakan PIN standar (1111).</li>
                                    <li><strong>Security Question:</strong> Jawaban rahasia untuk mereset PIN Admin jika lupa.</li>
                                </ul>
                            </AccordionItem>
                            <AccordionItem title="Audit Log (Jejak Aktivitas)" isOpen={openAccordion === 'set_3'} onToggle={() => toggleAccordion('set_3')} icon="file-lock" colorClass="text-slate-400">
                                <p>Fitur keamanan untuk pemilik toko.</p>
                                <p className="text-xs text-slate-400">Mencatat siapa yang menghapus produk, mengubah harga, melakukan refund, atau mengedit stok secara manual. Data ini tidak bisa dihapus oleh staf.</p>
                            </AccordionItem>
                        </div>
                    </div>

                </div>
            )}

            {/* --- TAB 3: FAQ --- */}
            {activeTab === 'faq' && (
                <div className="animate-fade-in max-w-3xl mx-auto space-y-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-bold text-white mb-2 text-lg">Tanya Jawab & Masalah Umum</h3>
                        <div className="space-y-4">
                            
                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <h4 className="font-bold text-[#52a37c] mb-1">Q: Kamera scan barcode error / tidak muncul?</h4>
                                <p className="text-slate-300 text-sm">
                                    A: Cek hal berikut:
                                    <ol className="list-decimal pl-5 mt-1">
                                        <li>Lihat ikon "Gembok" di sebelah alamat website (URL bar). Pastikan izin <strong>Kamera</strong> diatur ke "Allow" atau "Izinkan".</li>
                                        <li>Pastikan kamera tidak sedang dipakai aplikasi lain (Zoom/Meet/Kamera HP).</li>
                                        <li>Jika di Laptop tanpa kamera belakang, sistem akan otomatis beralih ke Webcam depan.</li>
                                    </ol>
                                </p>
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <h4 className="font-bold text-[#52a37c] mb-1">Q: Hasil print struk ada tulisan URL/Tanggal di atasnya?</h4>
                                <p className="text-slate-300 text-sm">
                                    A: Ini adalah pengaturan bawaan browser. Saat jendela print muncul, cari menu "More Settings" (Setelan Lainnya), lalu <strong>hilangkan centang</strong> pada opsi <strong>"Headers and footers"</strong>.
                                </p>
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <h4 className="font-bold text-[#52a37c] mb-1">Q: Mengapa data cabang tidak muncul otomatis di Admin?</h4>
                                <p className="text-slate-300 text-sm">
                                    A: Sistem Dropbox berbasis file, bukan database real-time. Data cabang sudah terkirim secara otomatis, namun Admin perlu menekan tombol <strong>"Refresh Data"</strong> (ikon panah melingkar) di Dashboard, Laporan, atau Keuangan untuk menarik/mengunduh update terbaru tersebut ke layar Anda.
                                </p>
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <h4 className="font-bold text-[#52a37c] mb-1">Q: Bagaimana cara print struk via Bluetooth?</h4>
                                <p className="text-slate-300 text-sm">
                                    A: Pastikan Anda menggunakan browser <strong>Google Chrome</strong> di Android atau Desktop. 
                                    Hidupkan Bluetooth dan pasangkan (pair) printer di pengaturan HP dulu. 
                                    Di aplikasi, klik "Cetak BT" &rarr; Pilih printer Anda.
                                </p>
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <h4 className="font-bold text-[#52a37c] mb-1">Q: Saya lupa PIN Admin, bagaimana cara masuk?</h4>
                                <p className="text-slate-300 text-sm">
                                    A: Di layar Login, ketuk <strong>Logo Aplikasi</strong> di atas sebanyak <strong>5 kali</strong> dengan cepat. 
                                    Anda akan diminta menjawab "Pertanyaan Keamanan" yang dibuat di pengaturan. Jika benar, Anda bisa membuat PIN baru.
                                </p>
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <h4 className="font-bold text-[#52a37c] mb-1">Q: Apakah data saya hilang jika HP rusak?</h4>
                                <p className="text-slate-300 text-sm">
                                    A: <strong>YA</strong>, jika Anda tidak menghubungkan Dropbox. Aplikasi ini Offline-first (data di HP). 
                                    Solusi: Segera hubungkan Dropbox di menu Pengaturan. Data akan otomatis ter-backup ke cloud.
                                </p>
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <h4 className="font-bold text-[#52a37c] mb-1">Q: Sinkronisasi Cloud gagal / Penuh?</h4>
                                <p className="text-slate-300 text-sm">
                                    A: Penyimpanan gratis Dropbox mungkin penuh. 
                                    Masuk ke Pengaturan &rarr; Data &rarr; Klik tombol merah <strong>"Kosongkan Folder Laporan"</strong>. 
                                    Ini akan menghapus log transaksi lama di cloud (tapi data di HP aman) agar sync bisa berjalan lagi.
                                </p>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 4: LICENSE --- */}
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

            {/* --- TAB 5: ABOUT --- */}
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

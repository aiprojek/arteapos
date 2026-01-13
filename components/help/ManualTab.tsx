
import React, { useState } from 'react';
import { SectionHeader, AccordionItem } from './SharedHelpComponents';

const ManualTab: React.FC = () => {
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(prev => prev === id ? null : id);
    };

    return (
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
                    <AccordionItem title="Modifier & Varian (Advanced)" isOpen={openAccordion === 'pos_2'} onToggle={() => toggleAccordion('pos_2')} icon="tag" colorClass="text-blue-400" badge="Update">
                        <p>Fitur baru untuk menangani pesanan yang kompleks (misal: Kopi Gula Aren).</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li><strong>Grup Modifier:</strong> Produk bisa memiliki banyak grup pilihan sekaligus (misal: Level Gula, Topping, Ukuran).</li>
                            <li><strong>Wajib vs Opsional:</strong> Sistem akan memaksa kasir memilih jika opsi tersebut "Wajib Pilih 1".</li>
                            <li>Harga akan otomatis bertambah sesuai pilihan (misal: Extra Shot +5.000).</li>
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
                    <AccordionItem title="Input Massal (Bulk Add)" isOpen={openAccordion === 'prod_bulk'} onToggle={() => toggleAccordion('prod_bulk')} icon="boxes" colorClass="text-purple-400" badge="Baru">
                        <p>Cara cepat memasukkan banyak data sekaligus tanpa input satu per satu.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Tersedia di menu <strong>Produk</strong> dan <strong>Bahan Baku</strong>.</li>
                            <li><strong>Input Tabel:</strong> Ketik langsung di tabel layaknya Excel di dalam aplikasi.</li>
                            <li><strong>Import CSV:</strong> Unduh template yang disediakan, isi di Excel/Spreadsheet, lalu upload kembali.</li>
                            <li>Sangat berguna saat pertama kali setup toko.</li>
                        </ul>
                    </AccordionItem>
                    <AccordionItem title="Konversi Satuan & Kalkulator HPP" isOpen={openAccordion === 'prod_conv'} onToggle={() => toggleAccordion('prod_conv')} icon="finance" colorClass="text-green-400" badge="Penting">
                        <p>Fitur cerdas untuk Bahan Baku agar stok akurat:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Kalkulator HPP:</strong> Tidak perlu hitung manual harga per gram. Cukup masukkan "Harga Beli Total" (misal: 25.000) dan "Berat/Isi Kemasan" (misal: 1000 gram). Sistem otomatis menghitung modal per unit (25 rupiah/gr).</li>
                            <li><strong>Konversi Satuan Beli:</strong> Atur jika Anda belanja dalam satuan besar (Dus/Karton) tapi pakai satuan kecil (Pcs/Ml).</li>
                            <li><em>Contoh:</em> 1 Karton = 12 Pcs. Saat belanja (Restock), staff pilih input "1 Karton", sistem otomatis menambah stok "12 Pcs".</li>
                        </ul>
                    </AccordionItem>
                    <AccordionItem title="Resep & Tracking Bahan" isOpen={openAccordion === 'prod_2'} onToggle={() => toggleAccordion('prod_2')} icon="ingredients" colorClass="text-red-400">
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
                            <li>Fitur ini mendukung <strong>Konversi Satuan</strong>. Jika bahan baku sudah disetting (misal beli per Karton), Anda bisa input pembelian dalam Karton, dan stok bertambah dalam Pcs.</li>
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
                    <AccordionItem title="Setup Perangkat Pusat (Admin)" isOpen={openAccordion === 'set_central'} onToggle={() => toggleAccordion('set_central')} icon="star" colorClass="text-yellow-400" badge="Baru">
                        <p className="mb-2">Jika Anda adalah Owner/Admin yang ingin memantau cabang dari jauh:</p>
                        <ol className="list-decimal pl-5 space-y-1 text-sm">
                            <li>Buka <strong>Pengaturan &rarr; Toko & Struk</strong>.</li>
                            <li>Pada bagian <strong>"Identitas Perangkat Ini (Store ID)"</strong>, pilih opsi <strong>"★ PUSAT (ADMIN MONITORING)"</strong>.</li>
                            <li>Sistem akan mengenali perangkat ini sebagai Pusat Pengendali (Control Center).</li>
                            <li>Sebagai Pusat, Anda tidak perlu memilih cabang saat menekan tombol "Refresh" atau "Update".</li>
                        </ol>
                    </AccordionItem>

                    <AccordionItem title="Cloud Sync & Multi-Cabang (Dropbox)" isOpen={openAccordion === 'set_1'} onToggle={() => toggleAccordion('set_1')} icon="wifi" colorClass="text-sky-400">
                        <p>Fitur Cloud kini terpusat menggunakan <strong>Dropbox</strong> untuk kemudahan dan stabilitas.</p>
                        <div className="bg-slate-800 p-3 rounded border border-slate-600 mt-2 mb-3">
                            <strong className="text-blue-400 block mb-1">Fungsi Dropbox:</strong>
                            <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                                <li><strong>Backup Otomatis:</strong> Data penting disimpan ke folder aplikasi di Dropbox Anda.</li>
                                <li><strong>Laporan Pusat:</strong> Jika Anda punya banyak cabang, setiap cabang akan mengirim data penjualan ke Dropbox.</li>
                                <li><strong>Push Master Data (Penting):</strong> Admin pusat bisa mengubah Harga/Produk di perangkat pusat, lalu menekan tombol <strong>"Kirim Master" (di menu Data)</strong>. Seluruh cabang bisa langsung mengambil update tersebut via tombol "Update Menu Baru".</li>
                            </ul>
                        </div>
                        
                        <div className="space-y-2 border-t border-slate-700 pt-2">
                            <strong className="text-yellow-400 text-sm block">Cara Pairing Cabang (Tanpa Login Email):</strong>
                            <ol className="list-decimal pl-5 text-sm text-slate-300 space-y-1">
                                <li><strong>Di Perangkat Admin (Pusat):</strong> Pastikan Dropbox terhubung. Di menu Data & Cloud, klik tombol biru <strong>"Bagikan Akses (Pairing)"</strong>.</li>
                                <li><strong>Di Perangkat Cabang:</strong> Buka Pengaturan &rarr; Data & Cloud. Klik tombol <strong>"Scan Akses Pusat"</strong> atau <strong>"Input Kode"</strong>.</li>
                                <li>Scan QR dari Admin. Selesai! Perangkat Cabang terhubung dan siap mengirim laporan.</li>
                            </ol>
                        </div>
                    </AccordionItem>

                    <AccordionItem title="Perangkat Keras (Printer & Scanner)" isOpen={openAccordion === 'set_hw'} onToggle={() => toggleAccordion('set_hw')} icon="bluetooth" colorClass="text-purple-400">
                        <p className="mb-2">Masuk ke tab <strong>"Perangkat Keras"</strong> untuk mengatur alat:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>Printer Bluetooth:</strong> (Hanya Android/Chrome). Klik "Cari Printer", pilih perangkat, lalu tes print.</li>
                            <li><strong>Printer USB/Kabel:</strong> Gunakan opsi "System Printer". Pastikan matikan "Headers & Footers" di pengaturan print browser agar rapi.</li>
                            <li><strong>Barcode Scanner:</strong> Sebagian besar scanner fisik bekerja sebagai keyboard. Colok/Pair, lalu tes di kolom yang disediakan.</li>
                        </ul>
                    </AccordionItem>
                    
                    <AccordionItem title="Manajemen Memori & Arsip" isOpen={openAccordion === 'set_mem'} onToggle={() => toggleAccordion('set_mem')} icon="database" colorClass="text-orange-400">
                        <p className="mb-2">Solusi jika aplikasi terasa lambat karena data menumpuk.</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>Indikator:</strong> Tombol "Memori Penuh" muncul di header.</li>
                            <li><strong>Cara Arsip:</strong> Pengaturan &rarr; Data & Cloud &rarr; Buka Menu Pengarsipan.</li>
                            <li><strong>Proses:</strong> Pilih rentang waktu &rarr; Unduh Arsip &rarr; Hapus Permanen. Data akan terhapus dari aplikasi tapi aman di file arsip Anda.</li>
                        </ul>
                    </AccordionItem>
                    
                    <AccordionItem title="Keamanan & User" isOpen={openAccordion === 'set_2'} onToggle={() => toggleAccordion('set_2')} icon="lock" colorClass="text-red-400">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Buat User Baru:</strong> Tambahkan akun Staf atau Manager.</li>
                            <li><strong>PIN:</strong> Setiap user wajib punya PIN 4 digit.</li>
                            <li><strong>Security Question:</strong> Jawaban rahasia untuk mereset PIN Admin jika lupa.</li>
                        </ul>
                    </AccordionItem>
                </div>
            </div>

        </div>
    );
};

export default ManualTab;

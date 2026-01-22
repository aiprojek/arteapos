
import React, { useState } from 'react';
import { SectionHeader, AccordionItem, TableOfContents } from './SharedHelpComponents';
import Icon from '../Icon';

const ManualTab: React.FC = () => {
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(prev => prev === id ? null : id);
    };

    const tocItems = [
        { id: 'menu_dashboard', label: 'Dashboard' },
        { id: 'menu_kasir', label: 'Kasir (POS)' },
        { id: 'menu_produk', label: 'Produk & Logistik' },
        { id: 'menu_laporan', label: 'Laporan' },
        { id: 'menu_keuangan', label: 'Keuangan' },
        { id: 'menu_pelanggan', label: 'Pelanggan' },
        { id: 'menu_setting', label: 'Pengaturan & Cloud' },
        { id: 'menu_share', label: 'Berbagi' },
    ];

    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-12">
            
            <TableOfContents items={tocItems} />

            <div className="space-y-12">
                {/* MENU 1: DASHBOARD */}
                <div id="menu_dashboard">
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
                <div id="menu_kasir">
                    <SectionHeader title="Menu: Kasir (POS)" icon="cash" desc="Halaman utama untuk melakukan transaksi penjualan." />
                    <div className="space-y-2">
                        <AccordionItem title="Alur Transaksi Dasar" isOpen={openAccordion === 'pos_1'} onToggle={() => toggleAccordion('pos_1')} icon="pay" colorClass="text-green-400">
                            <ol className="list-decimal pl-5 space-y-1">
                                <li><strong>Pilih Produk:</strong> Klik produk di daftar atau gunakan scan barcode.</li>
                                <li><strong>Edit Keranjang:</strong> Klik item di keranjang kiri untuk mengubah jumlah, memberi diskon per item, atau menghapus.</li>
                                <li><strong>Pilih Pelanggan (Opsional):</strong> Di bagian bawah keranjang, klik "Cari" untuk memilih pelanggan.</li>
                                <li><strong>Bayar:</strong> Klik tombol "Bayar", pilih Tunai/Non-Tunai, masukkan nominal.</li>
                                <li><strong>Struk:</strong> Setelah sukses, struk muncul. Bisa dicetak atau dibagikan gambar via WA.</li>
                            </ol>
                        </AccordionItem>
                        
                        <AccordionItem title="Nomor Meja & Pax (Restoran)" isOpen={openAccordion === 'pos_table'} onToggle={() => toggleAccordion('pos_table')} icon="ingredients" colorClass="text-orange-400" badge="Opsional">
                            <p>Fitur khusus untuk usaha FnB/Restoran.</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li>Jika Anda mengaktifkan <strong>"Manajemen Meja & Pax"</strong> di Pengaturan > Fitur Kasir.</li>
                                <li>Kolom input "Meja" dan "Pax" (Jumlah Orang) akan muncul di keranjang saat Anda memilih tipe pesanan <strong>"Makan di Tempat"</strong>.</li>
                                <li>Nomor Meja akan tercetak di struk dan muncul di Layar Dapur agar pelayan mudah mengantar pesanan.</li>
                            </ul>
                        </AccordionItem>
                        
                        <AccordionItem title="Upload Bukti Pembayaran (Transfer/QRIS)" isOpen={openAccordion === 'pos_evidence'} onToggle={() => toggleAccordion('pos_evidence')} icon="camera" colorClass="text-purple-400" badge="Baru">
                            <p>Simpan bukti transfer pelanggan langsung di aplikasi agar tidak tercampur di galeri HP pribadi.</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li>Saat menekan tombol <strong>"Bayar"</strong>, pilih metode <strong>"Non-Tunai"</strong>.</li>
                                <li>Klik kotak "Bukti Pembayaran (Opsional)".</li>
                                <li><strong>Cara 1 (Manual):</strong> Foto pakai kamera HP Kasir atau Upload file.</li>
                                <li><strong>Cara 2 (Via Pelanggan):</strong> Jika Layar Pelanggan terhubung, klik tombol <strong>"Minta Pelanggan"</strong>. Kamera di layar pelanggan akan menyala, minta mereka arahkan bukti transfer ke kamera tersebut. Foto akan otomatis masuk ke Tablet Kasir.</li>
                            </ul>
                        </AccordionItem>

                        <AccordionItem title="Ekosistem Layar Ganda (Dual Screen)" isOpen={openAccordion === 'pos_dual'} onToggle={() => toggleAccordion('pos_dual')} icon="cast" colorClass="text-yellow-400" badge="Update">
                            <p>Hubungkan HP/Tablet bekas untuk menjadi layar pendukung.</p>
                            
                            <div className="mt-3 space-y-3">
                                <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                    <strong className="text-[#52a37c] block mb-1">A. Layar Pelanggan (Customer Display)</strong>
                                    <ul className="list-disc pl-4 text-xs text-slate-300">
                                        <li>Menampilkan keranjang belanja & total harga real-time.</li>
                                        <li>Menampilkan peringatan MERAH jika kasir melakukan "Refund" (Anti-Fraud).</li>
                                        <li>Bisa digunakan sebagai kamera untuk memfoto bukti transfer.</li>
                                    </ul>
                                </div>
                                
                                <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                    <strong className="text-orange-400 block mb-1">B. Layar Dapur (Kitchen Display System)</strong>
                                    <ul className="list-disc pl-4 text-xs text-slate-300">
                                        <li>Menggantikan printer dapur. Pesanan otomatis muncul di sini.</li>
                                        <li>Koki bisa ubah status: "Baru" &rarr; "Dimasak" &rarr; "Selesai".</li>
                                        <li>Menampilkan durasi pesanan (Warna berubah jika terlalu lama).</li>
                                    </ul>
                                </div>

                                <div className="p-2 bg-blue-900/20 rounded border border-blue-800 text-xs">
                                    <strong>Cara Menghubungkan:</strong>
                                    <ol className="list-decimal pl-4 mt-1">
                                        <li>Di HP Kedua, buka Artea POS &rarr; Halaman Login &rarr; Klik tombol shortcut di bawah ("Mode Pelanggan" atau "Mode Dapur").</li>
                                        <li>Di Kasir Utama, klik ikon <strong>"Cast/Layar"</strong> (pojok kiri atas keranjang).</li>
                                        <li>Pilih tab yang sesuai, lalu Scan QR Code yang muncul di HP Kedua.</li>
                                    </ol>
                                </div>
                            </div>
                        </AccordionItem>

                        <AccordionItem title="Membership, Cari & Scan Kartu" isOpen={openAccordion === 'pos_member'} onToggle={() => toggleAccordion('pos_member')} icon="users" colorClass="text-pink-400" badge="Update">
                            <p>Kelola pelanggan dengan lebih cepat:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li><strong>Pencarian Cepat:</strong> Tidak perlu scroll dropdown. Klik tombol <strong>"Cari"</strong>, lalu ketik Nama, No HP, atau ID Member.</li>
                                <li><strong>Smart Scanner:</strong> Gunakan tombol Scanner di kasir untuk memindai kartu member. Sistem otomatis mengenali apakah itu Produk atau Member.</li>
                                <li><strong>Top Up Cepat:</strong> Klik tombol kecil <strong>"Isi"</strong> di sebelah saldo member untuk menambah deposit.</li>
                                <li><strong>Bayar Pakai Saldo:</strong> Saat menekan tombol "Bayar", pilih metode <strong>"Saldo"</strong>.</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Modifier & Varian (Advanced)" isOpen={openAccordion === 'pos_2'} onToggle={() => toggleAccordion('pos_2')} icon="tag" colorClass="text-blue-400" badge="Update">
                            <p>Fitur baru untuk menangani pesanan yang kompleks (misal: Kopi Gula Aren).</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li><strong>Grup Modifier:</strong> Produk bisa memiliki banyak grup pilihan sekaligus (misal: Level Gula, Topping, Ukuran).</li>
                                <li><strong>Wajib vs Opsional:</strong> Sistem akan memaksa kasir memilih jika opsi tersebut "Wajib Pilih 1".</li>
                                <li>Harga akan otomatis bertambah sesuai pilihan (misal: Extra Shot +5.000).</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Split Bill (Pisah Bayar)" isOpen={openAccordion === 'pos_3'} onToggle={() => toggleAccordion('pos_3')} icon="share" colorClass="text-orange-400" badge="Update">
                            <p>Fitur untuk memecah satu pesanan menjadi beberapa pembayaran.</p>
                            <ol className="list-decimal pl-5 space-y-1 mt-2">
                                <li>Klik tombol <strong>Split</strong> di bawah keranjang.</li>
                                <li>Centang item mana saja yang mau dibayar <strong>sekarang</strong>.</li>
                                <li><strong>Hitung Kembalian:</strong> Masukkan uang tunai yang diterima untuk item terpilih, sistem akan menghitung kembalian khusus untuk split tersebut.</li>
                                <li>Klik "Konfirmasi". Item sisanya akan otomatis dipindahkan ke tab baru untuk dibayar orang berikutnya.</li>
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
                <div id="menu_produk">
                    <SectionHeader title="Menu: Produk & Logistik" icon="boxes" desc="Mengelola inventaris, transfer stok, dan resep." />
                    <div className="space-y-2">
                        <AccordionItem title="Transfer Stok vs Stok Manual" isOpen={openAccordion === 'prod_logistik'} onToggle={() => toggleAccordion('prod_logistik')} icon="share" colorClass="text-blue-400" badge="Penting">
                            <p>Dua cara berbeda untuk menambah stok:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-2">
                                <li>
                                    <strong>Transfer Stok (Gudang &rarr; Cabang):</strong><br/>
                                    Digunakan saat Pusat mengirim barang ke Cabang.
                                    <br/><em>Cara Pakai:</em> Gudang buka menu Produk &rarr; Klik "Transfer Stok" &rarr; Pilih Cabang & Barang.
                                    <br/><em>Di Cabang:</em> Kasir cukup klik tombol <strong>"Cek Update"</strong> di Header untuk menerima stok otomatis.
                                </li>
                                <li>
                                    <strong>Stok Manual (Lokal):</strong><br/>
                                    Digunakan saat toko membeli barang sendiri dari pasar/supplier luar (bukan dari Gudang Pusat).
                                    <br/><em>Cara Pakai:</em> Buka menu Produk &rarr; Klik "Stok Manual" &rarr; Pilih "Barang Masuk" &rarr; Isi Jumlah.
                                </li>
                            </ul>
                        </AccordionItem>

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
                                <li><strong>Kalkulator HPP:</strong> Tidak perlu hitung manual harga per gram. Cukup masukkan "Harga Beli Total" (misal: 25.000) dan "Jumlah Isi/Berat" (misal: 1000 gram). Sistem otomatis menghitung modal per unit (25 rupiah/gr).</li>
                                <li><strong>Konversi Satuan Beli:</strong> Atur jika Anda belanja dalam satuan besar (Dus/Karton) tapi pakai satuan kecil (Pcs/Ml).</li>
                                <li><em>Contoh:</em> 1 Karton = 12 Pcs. Saat belanja (Restock), staff pilih input "1 Karton", sistem otomatis menambah stok "12 Pcs".</li>
                            </ul>
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

                {/* MENU 4: LAPORAN */}
                <div id="menu_laporan">
                    <SectionHeader title="Menu: Laporan" icon="file-lock" desc="Melihat riwayat transaksi dan pergerakan stok." />
                    <div className="space-y-2">
                        <AccordionItem title="Tab 1: Riwayat Penjualan & Unduh Bukti" isOpen={openAccordion === 'rep_sales'} onToggle={() => toggleAccordion('rep_sales')} icon="cash" colorClass="text-green-400">
                            <p>Menampilkan daftar transaksi penjualan kepada pelanggan.</p>
                            <ul className="list-disc pl-5 mt-2 space-y-2 text-sm">
                                <li>Gunakan filter waktu (Hari Ini/Minggu Ini/Bulan Ini).</li>
                                <li>Klik tombol <strong>PDF</strong> atau <strong>CSV</strong> untuk mengunduh laporan.</li>
                                <li>
                                    <strong>Lihat & Unduh Bukti:</strong> Jika ada transaksi dengan ikon kamera biru <Icon name="camera" className="w-3 h-3 inline"/>, klik ikon tersebut.
                                    <br/>Di jendela yang muncul, tekan tombol <strong>Unduh</strong>. File akan disimpan dengan nama yang mengandung <strong>ID Transaksi</strong> (cth: <code>Bukti_Trx_LOC-123...</code>) agar Admin Pusat mudah mencocokkannya dengan Laporan CSV/Excel.
                                </li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Tab 2: Mutasi Stok & Log" isOpen={openAccordion === 'rep_stock'} onToggle={() => toggleAccordion('rep_stock')} icon="boxes" colorClass="text-orange-400" badge="Penting">
                            <p>Di sinilah Anda memantau semua pergerakan barang (selain penjualan).</p>
                            <ul className="list-disc pl-5 mt-2 space-y-2 text-sm">
                                <li>
                                    <strong>Apa yang dicatat?</strong><br/>
                                    <span className="bg-green-900/50 text-green-300 px-1 rounded text-xs">MASUK</span> Barang dari supplier/stok manual.<br/>
                                    <span className="bg-red-900/50 text-red-300 px-1 rounded text-xs">KELUAR</span> Barang rusak, expired, atau waste.<br/>
                                    <span className="bg-blue-900/50 text-blue-300 px-1 rounded text-xs">OPNAME</span> Hasil penyesuaian stok fisik.<br/>
                                    <span className="bg-purple-900/50 text-purple-300 px-1 rounded text-xs">TRANSFER</span> Barang kiriman dari gudang.
                                </li>
                                <li>Cek kolom <strong>Catatan</strong> untuk melihat alasan kerusakan atau siapa staf yang melakukan input.</li>
                            </ul>
                        </AccordionItem>
                    </div>
                </div>

                {/* MENU 5: KEUANGAN */}
                <div id="menu_keuangan">
                    <SectionHeader title="Menu: Keuangan" icon="finance" desc="Pusat pencatatan arus kas, utang, dan belanja." />
                    <div className="space-y-2">
                        <AccordionItem title="Scan Nota Otomatis (OCR AI)" isOpen={openAccordion === 'fin_ocr'} onToggle={() => toggleAccordion('fin_ocr')} icon="eye" colorClass="text-purple-400" badge="Baru">
                            <p>Malas mengetik detail pengeluaran? Gunakan fitur Scan AI.</p>
                            <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                                <li>Buka menu <strong>Pengeluaran</strong> atau <strong>Pembelian</strong>.</li>
                                <li>Klik "Catat Baru" &rarr; Klik kotak kamera untuk ambil foto nota belanja.</li>
                                <li>Setelah foto muncul, klik tombol <strong>"Scan Data (AI)"</strong>.</li>
                                <li>Tunggu sebentar, sistem akan otomatis membaca <strong>Total Harga</strong> dan <strong>Tanggal</strong> dari foto tersebut dan mengisi kolom formulir untuk Anda.</li>
                            </ol>
                        </AccordionItem>
                        <AccordionItem title="Arus Kas (Cash Flow)" isOpen={openAccordion === 'fin_1'} onToggle={() => toggleAccordion('fin_1')} icon="trending-up" colorClass="text-green-400">
                            <p>Tab ini adalah rangkuman dari semua aktivitas uang:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>Masuk:</strong> Penjualan Tunai + Pemasukan Lain + Top Up Member.</li>
                                <li><strong>Keluar:</strong> Pengeluaran Operasional + Pembelian Stok + Refund.</li>
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
                                <li>Bukti nota yang diupload di sini juga bisa diunduh kembali dengan nama file sesuai ID Pembelian.</li>
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

                {/* MENU 6: PELANGGAN */}
                <div id="menu_pelanggan">
                    <SectionHeader title="Menu: Pelanggan (Membership)" icon="users" desc="Kelola database member dan kartu digital." />
                    <div className="space-y-2">
                        <AccordionItem title="Data Identitas Bebas (Sekolah/Kantor)" isOpen={openAccordion === 'cust_identity'} onToggle={() => toggleAccordion('cust_identity')} icon="tag" colorClass="text-sky-400" badge="Baru">
                            <p>Kolom 'Kontak' pada data pelanggan kini bersifat fleksibel. Anda tidak harus mengisinya dengan Nomor HP.</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li><strong>Koperasi Sekolah/Pesantren:</strong> Isi dengan Kelas, Asrama, atau NIS.</li>
                                <li><strong>Kantor/Karyawan:</strong> Isi dengan Divisi atau NIK.</li>
                                <li>Data ini bisa digunakan untuk pencarian di kasir.</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Kartu Member Digital & QR Code" isOpen={openAccordion === 'cust_card'} onToggle={() => toggleAccordion('cust_card')} icon="award" colorClass="text-yellow-400" badge="Baru">
                            <p>Berikan pengalaman profesional kepada pelanggan setia Anda tanpa biaya cetak kartu fisik.</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li>Masuk ke menu <strong>Keuangan &rarr; Tab Pelanggan &rarr; Ikon Kartu</strong>.</li>
                                <li>Klik ikon <strong>"Kartu"</strong> pada nama pelanggan.</li>
                                <li>Akan muncul Kartu Member Digital dengan Nama, ID Unik, dan QR Code.</li>
                                <li>Klik <strong>"Share WA"</strong> untuk mengirim gambar kartu langsung ke WhatsApp pelanggan.</li>
                                <li><strong>Fungsi QR:</strong> Saat pelanggan datang kembali, scan QR di kartu mereka menggunakan "Barcode Scanner" di menu Kasir untuk menemukan data mereka secara instan.</li>
                            </ul>
                        </AccordionItem>
                        <AccordionItem title="Saldo & Poin" isOpen={openAccordion === 'cust_bal'} onToggle={() => toggleAccordion('cust_bal')} icon="finance" colorClass="text-green-400">
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Top Up:</strong> Di tab Pelanggan, klik tombol "Isi Saldo". Uang yang diterima akan masuk ke Laporan Kas (Cash In).</li>
                                <li><strong>Poin:</strong> Poin bertambah otomatis saat transaksi. Atur rumus poin di Pengaturan.</li>
                            </ul>
                        </AccordionItem>
                    </div>
                </div>

                {/* MENU 7: PENGATURAN */}
                <div id="menu_setting">
                    <SectionHeader title="Menu: Pengaturan & Cloud" icon="settings" desc="Konfigurasi sistem, sinkronisasi, dan manajemen memori." />
                    <div className="space-y-2">
                        <AccordionItem title="Instalasi Aplikasi (Siap Offline)" isOpen={openAccordion === 'install_app'} onToggle={() => toggleAccordion('install_app')} icon="download" colorClass="text-green-400" badge="Wajib">
                            <p>Agar aplikasi bisa berjalan tanpa internet (Offline Mode), Anda wajib menginstalnya ke perangkat:</p>
                            <ol className="list-decimal pl-5 space-y-1 mt-2 text-sm text-slate-300">
                                <li>Masuk ke menu <strong>Pengaturan</strong> &rarr; Tab <strong>Data & Cloud</strong>.</li>
                                <li>Cari kartu paling atas bernama <strong>"Status Aplikasi"</strong>.</li>
                                <li>Tunggu hingga muncul status "Siap Offline".</li>
                                <li>Klik tombol biru <strong>"Install Aplikasi"</strong> (jika tersedia) atau <strong>"Download Aset Offline"</strong>.</li>
                                <li>Aplikasi akan muncul di layar utama HP Anda dan bisa dibuka kapan saja meski kuota habis.</li>
                            </ol>
                        </AccordionItem>

                        <AccordionItem title="Perangkat Keras (Printer & Scanner)" isOpen={openAccordion === 'set_hw'} onToggle={() => toggleAccordion('set_hw')} icon="bluetooth" colorClass="text-purple-400" badge="Penting">
                            <p className="mb-2">Masuk ke tab <strong>"Perangkat Keras"</strong> untuk mengatur alat:</p>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                <li><strong>Printer Bluetooth (Native App):</strong> Jika menggunakan aplikasi Android (APK), support printer bluetooth lebih stabil. Pastikan aktifkan Bluetooth dan pasangkan (pair) printer di pengaturan HP terlebih dahulu. Lalu di aplikasi Artea, klik "Cari Perangkat (Paired)".</li>
                                <li><strong>Printer USB/Kabel:</strong> Gunakan opsi "System Printer" untuk membuka dialog cetak bawaan Android/Windows (RawBT atau Print Service).</li>
                                <li><strong>Barcode Scanner:</strong> Mendukung scanner fisik (USB/Wireless) dan kamera HP.</li>
                            </ul>
                        </AccordionItem>

                        <AccordionItem title="Setup Perangkat Pusat (Admin)" isOpen={openAccordion === 'set_central'} onToggle={() => toggleAccordion('set_central')} icon="star" colorClass="text-yellow-400" badge="Baru">
                            <p className="mb-2">Jika Anda adalah Owner/Admin yang ingin memantau cabang dari jauh:</p>
                            <ol className="list-decimal pl-5 space-y-1 text-sm">
                                <li>Buka <strong>Pengaturan &rarr; Toko & Struk</strong>.</li>
                                <li>Pada bagian <strong>"Identitas Perangkat Ini (Store ID)"</strong>, pilih opsi <strong>"★ PUSAT (ADMIN MONITORING)"</strong>.</li>
                                <li>Sistem akan mengenali perangkat ini sebagai Pusat Pengendali (Control Center).</li>
                                <li>Sebagai Pusat, Anda tidak perlu memilih cabang saat menekan tombol "Refresh" atau "Update".</li>
                            </ol>
                        </AccordionItem>

                        <AccordionItem title="Strategi Admin Ringan (Mode Intip)" isOpen={openAccordion === 'cloud_strategy'} onToggle={() => toggleAccordion('cloud_strategy')} icon="eye" colorClass="text-sky-400" badge="Recommended">
                            <div className="bg-sky-900/20 border border-sky-700 p-3 rounded-lg mb-2">
                                <strong className="text-sky-300">Konsep Utama:</strong> Agar perangkat Admin tidak berat/lemot, Anda TIDAK PERLU menyimpan data semua cabang ke database HP Anda secara permanen.
                            </div>
                            <ul className="list-disc pl-5 text-sm text-slate-300 space-y-2">
                                <li><strong>Mode Intip (Viewer):</strong> Saat Anda menekan tombol "Refresh" di Dashboard/Laporan, data dari Cloud hanya ditampilkan sementara di layar (RAM). Ini sangat ringan.</li>
                                <li><strong>Kapan harus Simpan ke Lokal?</strong> Hanya jika Anda ingin mengedit data tersebut, melakukan refund, atau mengubah stok secara manual. Jika hanya untuk melihat omzet, biarkan dalam Mode Intip (Dropbox).</li>
                            </ul>
                        </AccordionItem>

                        <AccordionItem title="Siklus Bulanan (Jika Cloud Penuh)" isOpen={openAccordion === 'cloud_full'} onToggle={() => toggleAccordion('cloud_full')} icon="database" colorClass="text-orange-400">
                            <p>Apa yang harus dilakukan jika penyimpanan Dropbox penuh?</p>
                            <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-slate-300">
                                <li>Buka menu <strong>Pengaturan &rarr; Data & Cloud</strong>.</li>
                                <li>Klik tombol <strong>"Download Arsip Cloud"</strong>. Pilih format (Excel/PDF) yang diinginkan. Simpan file ini di Laptop/Google Drive sebagai arsip bulanan.</li>
                                <li>Setelah file aman terunduh, klik tombol merah <strong>"Kosongkan Folder Laporan"</strong>.</li>
                                <li>Dropbox Anda kembali bersih dan siap menerima data bulan berikutnya. Perangkat Admin Anda tetap ringan karena tidak perlu menampung ribuan data lama.</li>
                            </ol>
                        </AccordionItem>
                        
                        <AccordionItem title="Keamanan, User & Audit (PENTING)" isOpen={openAccordion === 'set_2'} onToggle={() => toggleAccordion('set_2')} icon="lock" colorClass="text-red-400" badge="Anti-Fraud">
                            <p>Cara mencegah Staff nakal melakukan Top Up palsu atau kecurangan:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li><strong>Wajibkan Sesi (Shift):</strong> Aktifkan di Pengaturan. Saat Top Up saldo member, sistem mencatatnya sebagai "Uang Masuk". Jika staff Top Up palsu tanpa memasukkan uang, laci kasir akan minus/selisih saat tutup toko. Staff harus mengganti selisih tersebut.</li>
                                <li><strong>Audit Log:</strong> Semua aktivitas Top Up Saldo, Refund, dan Hapus Produk tercatat di menu <strong>Pengaturan &rarr; Audit Log</strong>.</li>
                                <li><strong>PIN:</strong> Setiap user wajib punya PIN untuk identifikasi.</li>
                            </ul>
                        </AccordionItem>
                    </div>
                </div>

                {/* MENU 8: SHARE */}
                <div id="menu_share">
                    <SectionHeader title="Komunitas & Berbagi" icon="share" desc="Bantu UMKM lain naik kelas dengan membagikan aplikasi ini." />
                    <div className="space-y-2">
                        <AccordionItem title="Template Broadcast WhatsApp" isOpen={openAccordion === 'promo_wa'} onToggle={() => toggleAccordion('promo_wa')} icon="whatsapp" colorClass="text-green-500" badge="Teks Siap Salin">
                            <p>Ingin mengajak rekan pengusaha lain untuk menggunakan Artea POS? Salin pesan di bawah ini:</p>
                            <div className="bg-slate-900 p-3 rounded border border-slate-600 mt-2 font-mono text-xs text-slate-300 select-all cursor-text" onClick={(e) => {
                                const range = document.createRange();
                                range.selectNode(e.currentTarget);
                                window.getSelection()?.removeAllRanges();
                                window.getSelection()?.addRange(range);
                            }}>
                                Halo rekan-rekan pengusaha! 👋<br/><br/>
                                Saya mau berbagi info aplikasi kasir (POS) yang baru saya coba dan sangat membantu, namanya *Artea POS*.<br/><br/>
                                Kelebihannya yang bikin saya suka:<br/>
                                1. *Gratis & Open Source*, gak ada biaya langganan bulanan.<br/>
                                2. *Jalan Offline*, jadi gak ketergantungan sinyal internet.<br/>
                                3. *Bisa Multi-Cabang* pakai sinkronisasi Dropbox (Hemat banget!).<br/>
                                4. Fiturnya lengkap: Stok bahan baku, Laporan Laba Rugi, sampai ada AI consultant-nya.<br/><br/>
                                Buat teman-teman yang lagi cari sistem kasir buat usahanya tapi mau hemat budget, ini *recommended* banget.
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 italic">*Klik teks di atas untuk menyorot semua, lalu salin (Copy).</p>
                        </AccordionItem>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ManualTab;

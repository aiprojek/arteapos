
import { IconName } from '../Icon';

// --- TIPE DATA ---
export interface HelpSection {
    id: string;
    label: string;
    icon: IconName;
    desc: string;
    items: HelpItem[];
}

export interface HelpItem {
    id: string;
    title: string;
    icon: IconName;
    colorClass: string;
    badge?: string;
    content: string; // HTML String
}

export interface FaqItem {
    id: string;
    category: string;
    title: string;
    content: string;
}

// --- KONTEN MANUAL (PANDUAN LENGKAP) ---
export const MANUAL_SECTIONS: HelpSection[] = [
    {
        id: 'menu_dashboard',
        label: 'Dashboard',
        icon: 'reports',
        desc: 'Pusat pemantauan performa bisnis secara visual.',
        items: [
            {
                id: 'dash_1', title: 'Statistik & Grafik', icon: 'trending-up', colorClass: 'text-sky-400',
                content: `
                    <ul class="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Kartu Atas:</strong> Ringkasan Penjualan Hari Ini, Jumlah Transaksi, Total Piutang Belum Dibayar, dan Peringatan Stok Menipis.</li>
                        <li><strong>Grafik Tren:</strong> Menampilkan pergerakan omzet selama 7 hari terakhir.</li>
                        <li><strong>Produk Terlaris:</strong> Top 5 produk dengan penjualan tertinggi minggu ini.</li>
                        <li><strong>Mode Cloud:</strong> Aktifkan "Mode Dropbox" untuk melihat laporan gabungan dari semua cabang.</li>
                    </ul>
                `
            },
            {
                id: 'dash_3', title: 'Tombol Refresh (Khusus Admin)', icon: 'reset', colorClass: 'text-blue-400', badge: 'Penting',
                content: `
                    <p>Jika Anda menggunakan fitur Cloud/Dropbox:</p>
                    <ul class="list-disc pl-5 space-y-1 mt-2 text-sm">
                        <li>Data cabang <strong>tidak muncul otomatis</strong> (real-time) di layar Admin.</li>
                        <li>Anda harus menekan tombol <strong>"Refresh Data"</strong> (ikon panah melingkar) yang tersedia di Dashboard, Laporan, atau Keuangan.</li>
                        <li>Tombol ini akan memerintahkan aplikasi untuk mengunduh file data terbaru yang dikirim oleh cabang ke Dropbox.</li>
                    </ul>
                `
            },
            {
                id: 'dash_2', title: 'Artea AI (Analisis Cerdas)', icon: 'chat', colorClass: 'text-purple-400', badge: 'AI',
                content: `
                    <p>Asisten cerdas yang menganalisis data penjualan Anda.</p>
                    <ul class="list-disc pl-5 space-y-1 mt-2 text-sm">
                        <li>Ketik pertanyaan seperti <em>"Bagaimana cara meningkatkan omzet?"</em> atau <em>"Analisis tren minggu ini"</em>.</li>
                        <li>AI akan membaca data grafik dan memberikan saran strategi bisnis praktis dalam Bahasa Indonesia.</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'menu_kasir',
        label: 'Kasir (POS)',
        icon: 'cash',
        desc: 'Halaman utama untuk melakukan transaksi penjualan.',
        items: [
            {
                id: 'pos_1', title: 'Alur Transaksi Dasar', icon: 'pay', colorClass: 'text-green-400',
                content: `
                    <ol class="list-decimal pl-5 space-y-1 text-sm">
                        <li><strong>Pilih Produk:</strong> Klik produk di daftar atau gunakan scan barcode.</li>
                        <li><strong>Edit Keranjang:</strong> Klik item di keranjang kiri untuk mengubah jumlah, memberi diskon per item, atau menghapus.</li>
                        <li><strong>Pilih Pelanggan (Opsional):</strong> Di bagian bawah keranjang, klik "Cari" untuk memilih pelanggan.</li>
                        <li><strong>Bayar:</strong> Klik tombol "Bayar", pilih Tunai/Non-Tunai, masukkan nominal.</li>
                        <li><strong>Struk:</strong> Setelah sukses, struk muncul. Bisa dicetak atau dibagikan gambar via WA.</li>
                    </ol>
                `
            },
            {
                id: 'pos_table', title: 'Nomor Meja & Pax (Restoran)', icon: 'ingredients', colorClass: 'text-orange-400', badge: 'Penting',
                content: `
                    <p>Fitur manajemen pesanan untuk restoran/kafe:</p>
                    <ul class="list-disc pl-5 space-y-1 mt-2 text-sm">
                        <li><strong>Aktivasi:</strong> Buka Pengaturan &gt; Fitur Kasir &gt; Nyalakan "Manajemen Meja & Pax".</li>
                        <li><strong>Mode Wajib (Strict):</strong> Jika Anda mengaktifkan opsi tambahan <em>"Wajibkan Isi Meja & Pax"</em>, kasir <strong>TIDAK BISA BAYAR</strong> jika kolom Meja atau Jumlah Tamu (Pax) masih kosong.</li>
                        <li><strong>Aturan Validasi:</strong> Keduanya (Meja DAN Pax) harus diisi. Ini berguna untuk mencegah kecurangan dan memastikan data laporan rata-rata pengunjung akurat.</li>
                    </ul>
                `
            },
            {
                id: 'pos_evidence', title: 'Upload Bukti Pembayaran (Transfer/QRIS)', icon: 'camera', colorClass: 'text-purple-400', badge: 'Baru',
                content: `
                    <p>Simpan bukti transfer pelanggan langsung di aplikasi agar tidak tercampur di galeri HP pribadi.</p>
                    <ul class="list-disc pl-5 space-y-1 mt-2 text-sm">
                        <li>Saat menekan tombol <strong>"Bayar"</strong>, pilih metode <strong>"Non-Tunai"</strong>.</li>
                        <li>Klik kotak "Bukti Pembayaran (Opsional)".</li>
                        <li><strong>Cara 1 (Manual):</strong> Foto pakai kamera HP Kasir atau Upload file.</li>
                        <li><strong>Cara 2 (Via Pelanggan):</strong> Jika Layar Pelanggan terhubung, klik tombol <strong>"Minta Pelanggan"</strong>. Kamera di layar pelanggan akan menyala, minta mereka arahkan bukti transfer ke kamera tersebut. Foto akan otomatis masuk ke Tablet Kasir.</li>
                    </ul>
                `
            },
            {
                id: 'pos_dual', title: 'Ekosistem Layar Ganda (Dual Screen)', icon: 'cast', colorClass: 'text-yellow-400', badge: 'Update',
                content: `
                    <p>Hubungkan HP/Tablet bekas untuk menjadi layar pendukung.</p>
                    <div class="mt-3 space-y-3 text-sm">
                        <div class="bg-slate-900/50 p-2 rounded border border-slate-700">
                            <strong class="text-[#52a37c] block mb-1">A. Layar Pelanggan (Customer Display)</strong>
                            <ul class="list-disc pl-4 text-xs text-slate-300">
                                <li>Menampilkan keranjang belanja & total harga real-time.</li>
                                <li>Menampilkan peringatan MERAH jika kasir melakukan "Refund" (Anti-Fraud).</li>
                                <li>Bisa digunakan sebagai kamera untuk memfoto bukti transfer.</li>
                            </ul>
                        </div>
                        <div class="bg-slate-900/50 p-2 rounded border border-slate-700">
                            <strong class="text-orange-400 block mb-1">B. Layar Dapur (KDS)</strong>
                            <ul class="list-disc pl-4 text-xs text-slate-300">
                                <li>Menggantikan printer dapur. Pesanan otomatis muncul di sini.</li>
                                <li>Koki bisa ubah status: "Baru" &rarr; "Dimasak" &rarr; "Selesai".</li>
                                <li>Menampilkan durasi pesanan (Warna berubah jika terlalu lama).</li>
                            </ul>
                        </div>
                        <div class="p-2 bg-blue-900/20 rounded border border-blue-800 text-xs">
                            <strong>Cara Menghubungkan:</strong><br/>
                            1. Di HP Kedua, buka Artea POS &rarr; Halaman Login &rarr; Klik tombol shortcut di bawah ("Mode Pelanggan" atau "Mode Dapur").<br/>
                            2. Di Kasir Utama, klik ikon <strong>"Cast/Layar"</strong> (pojok kiri atas keranjang).<br/>
                            3. Pilih tab yang sesuai, lalu Scan QR Code yang muncul di HP Kedua.
                        </div>
                    </div>
                `
            },
            {
                id: 'pos_member', title: 'Membership, Cari & Scan Kartu', icon: 'users', colorClass: 'text-pink-400', badge: 'Update',
                content: `
                    <p>Kelola pelanggan dengan lebih cepat:</p>
                    <ul class="list-disc pl-5 space-y-1 mt-2 text-sm">
                        <li><strong>Pencarian Cepat:</strong> Tidak perlu scroll dropdown. Klik tombol <strong>"Cari"</strong>, lalu ketik Nama, No HP, atau ID Member.</li>
                        <li><strong>Smart Scanner:</strong> Gunakan tombol Scanner di kasir untuk memindai kartu member. Sistem otomatis mengenali apakah itu Produk atau Member.</li>
                        <li><strong>Top Up Cepat:</strong> Klik tombol kecil <strong>"Isi"</strong> di sebelah saldo member untuk menambah deposit.</li>
                        <li><strong>Bayar Pakai Saldo:</strong> Saat menekan tombol "Bayar", pilih metode <strong>"Saldo"</strong>.</li>
                    </ul>
                `
            },
            {
                id: 'pos_2', title: 'Modifier & Varian (Advanced)', icon: 'tag', colorClass: 'text-blue-400', badge: 'Update',
                content: `
                    <p>Fitur baru untuk menangani pesanan yang kompleks (misal: Kopi Gula Aren).</p>
                    <ul class="list-disc pl-5 space-y-1 mt-2 text-sm">
                        <li><strong>Grup Modifier:</strong> Produk bisa memiliki banyak grup pilihan sekaligus (misal: Level Gula, Topping, Ukuran).</li>
                        <li><strong>Wajib vs Opsional:</strong> Sistem akan memaksa kasir memilih jika opsi tersebut "Wajib Pilih 1".</li>
                        <li>Harga akan otomatis bertambah sesuai pilihan (misal: Extra Shot +5.000).</li>
                    </ul>
                `
            },
            {
                id: 'pos_3', title: 'Split Bill (Pisah Bayar)', icon: 'share', colorClass: 'text-orange-400', badge: 'Update',
                content: `
                    <p>Fitur untuk memecah satu pesanan menjadi beberapa pembayaran.</p>
                    <ol class="list-decimal pl-5 space-y-1 mt-2 text-sm">
                        <li>Klik tombol <strong>Split</strong> di bawah keranjang.</li>
                        <li>Centang item mana saja yang mau dibayar <strong>sekarang</strong>.</li>
                        <li><strong>Hitung Kembalian:</strong> Masukkan uang tunai yang diterima untuk item terpilih, sistem akan menghitung kembalian khusus untuk split tersebut.</li>
                        <li>Klik "Konfirmasi". Item sisanya akan otomatis dipindahkan ke tab baru untuk dibayar orang berikutnya.</li>
                    </ol>
                `
            },
            {
                id: 'pos_4', title: 'Simpan Pesanan (Open Bill)', icon: 'clipboard', colorClass: 'text-slate-400',
                content: `
                    <p>Berguna untuk sistem meja (Restoran) atau pelanggan yang belum selesai belanja.</p>
                    <ul class="list-disc pl-5 mt-1 space-y-1 text-sm">
                        <li>Klik tombol <strong>"Simpan Pesanan"</strong>. Beri nama (misal: Meja 1).</li>
                        <li>Keranjang akan bersih. Anda bisa melayani pelanggan lain.</li>
                        <li>Untuk membuka kembali, klik tab nama pesanan di bagian atas keranjang.</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'menu_produk',
        label: 'Produk & Logistik',
        icon: 'boxes',
        desc: 'Mengelola inventaris, transfer stok, dan resep.',
        items: [
            {
                id: 'prod_logistik', title: 'Transfer Stok vs Stok Manual', icon: 'share', colorClass: 'text-blue-400', badge: 'Penting',
                content: `
                    <p>Dua cara berbeda untuk menambah stok:</p>
                    <ul class="list-disc pl-5 mt-2 space-y-2 text-sm">
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
                `
            },
            {
                id: 'prod_bulk', title: 'Input Massal (Bulk Add)', icon: 'boxes', colorClass: 'text-purple-400', badge: 'Baru',
                content: `
                    <p>Cara cepat memasukkan banyak data sekaligus tanpa input satu per satu.</p>
                    <ul class="list-disc pl-5 mt-2 space-y-1 text-sm">
                        <li>Tersedia di menu <strong>Produk</strong> dan <strong>Bahan Baku</strong>.</li>
                        <li><strong>Input Tabel:</strong> Ketik langsung di tabel layaknya Excel di dalam aplikasi.</li>
                        <li><strong>Import CSV:</strong> Unduh template yang disediakan, isi di Excel/Spreadsheet, lalu upload kembali.</li>
                        <li>Sangat berguna saat pertama kali setup toko.</li>
                    </ul>
                `
            },
            {
                id: 'prod_conv', title: 'Konversi Satuan & Kalkulator HPP', icon: 'finance', colorClass: 'text-green-400', badge: 'Penting',
                content: `
                    <p>Fitur cerdas untuk Bahan Baku agar stok akurat:</p>
                    <ul class="list-disc pl-5 mt-2 space-y-1 text-sm">
                        <li><strong>Kalkulator HPP:</strong> Tidak perlu hitung manual harga per gram. Cukup masukkan "Harga Beli Total" (misal: 25.000) dan "Jumlah Isi/Berat" (misal: 1000 gram). Sistem otomatis menghitung modal per unit (25 rupiah/gr).</li>
                        <li><strong>Konversi Satuan Beli:</strong> Atur jika Anda belanja dalam satuan besar (Dus/Karton) tapi pakai satuan kecil (Pcs/Ml).</li>
                        <li><em>Contoh:</em> 1 Karton = 12 Pcs. Saat belanja (Restock), staff pilih input "1 Karton", sistem otomatis menambah stok "12 Pcs".</li>
                    </ul>
                `
            },
            {
                id: 'prod_3', title: 'Stock Opname (Audit)', icon: 'file-lock', colorClass: 'text-blue-400',
                content: `
                    <p>Fitur untuk mencocokkan stok di aplikasi dengan fisik di gudang.</p>
                    <ul class="list-disc pl-5 mt-1 space-y-1 text-sm">
                        <li>Klik tombol <strong>Stock Opname</strong>.</li>
                        <li>Isi kolom "Fisik (Actual)" sesuai hitungan riil.</li>
                        <li>Sistem akan menghitung selisih (Variance) dan mencatatnya di Log Audit.</li>
                        <li>Stok di aplikasi akan diperbarui mengikuti angka Fisik.</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'menu_laporan',
        label: 'Laporan',
        icon: 'file-lock',
        desc: 'Melihat riwayat transaksi dan pergerakan stok.',
        items: [
            {
                id: 'rep_sales', title: 'Tab 1: Riwayat Penjualan & Unduh Bukti', icon: 'cash', colorClass: 'text-green-400',
                content: `
                    <p>Menampilkan daftar transaksi penjualan kepada pelanggan.</p>
                    <ul class="list-disc pl-5 mt-2 space-y-2 text-sm">
                        <li>Gunakan filter waktu (Hari Ini/Minggu Ini/Bulan Ini).</li>
                        <li>Klik tombol <strong>PDF</strong> atau <strong>CSV</strong> untuk mengunduh laporan.</li>
                        <li>
                            <strong>Lihat & Unduh Bukti:</strong> Jika ada transaksi dengan ikon kamera biru, klik ikon tersebut.
                            <br/>Di jendela yang muncul, tekan tombol <strong>Unduh</strong>. File akan disimpan dengan nama yang mengandung <strong>ID Transaksi</strong> (cth: <code>Bukti_Trx_LOC-123...</code>) agar Admin Pusat mudah mencocokkannya dengan Laporan CSV/Excel.
                        </li>
                    </ul>
                `
            },
            {
                id: 'rep_stock', title: 'Tab 2: Mutasi Stok & Log', icon: 'boxes', colorClass: 'text-orange-400', badge: 'Penting',
                content: `
                    <p>Di sinilah Anda memantau semua pergerakan barang (selain penjualan).</p>
                    <ul class="list-disc pl-5 mt-2 space-y-2 text-sm">
                        <li>
                            <strong>Apa yang dicatat?</strong><br/>
                            <span class="text-green-400">MASUK</span> Barang dari supplier/stok manual.<br/>
                            <span class="text-red-400">KELUAR</span> Barang rusak, expired, atau waste.<br/>
                            <span class="text-blue-300">OPNAME</span> Hasil penyesuaian stok fisik.<br/>
                            <span class="text-purple-300">TRANSFER</span> Barang kiriman dari gudang.
                        </li>
                        <li>Cek kolom <strong>Catatan</strong> untuk melihat alasan kerusakan atau siapa staf yang melakukan input.</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'menu_keuangan',
        label: 'Keuangan',
        icon: 'finance',
        desc: 'Pusat pencatatan arus kas, utang, dan belanja.',
        items: [
             {
                id: 'fin_ocr', title: 'Scan Nota Otomatis (OCR AI)', icon: 'eye', colorClass: 'text-purple-400', badge: 'Baru',
                content: `
                    <p>Malas mengetik detail pengeluaran? Gunakan fitur Scan AI.</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1 text-sm">
                        <li>Buka menu <strong>Pengeluaran</strong> atau <strong>Pembelian</strong>.</li>
                        <li>Klik "Catat Baru" &rarr; Klik kotak kamera untuk ambil foto nota belanja.</li>
                        <li>Setelah foto muncul, klik tombol <strong>"Scan Data (AI)"</strong>.</li>
                        <li>Tunggu sebentar, sistem akan otomatis membaca <strong>Total Harga</strong> dan <strong>Tanggal</strong> dari foto tersebut dan mengisi kolom formulir untuk Anda.</li>
                    </ol>
                `
            },
            {
                id: 'fin_1', title: 'Arus Kas (Cash Flow)', icon: 'trending-up', colorClass: 'text-green-400',
                content: `
                    <p>Tab ini adalah rangkuman dari semua aktivitas uang:</p>
                    <ul class="list-disc pl-5 mt-2 space-y-1 text-sm">
                        <li><strong>Masuk:</strong> Penjualan Tunai + Pemasukan Lain + Top Up Member.</li>
                        <li><strong>Keluar:</strong> Pengeluaran Operasional + Pembelian Stok + Refund.</li>
                        <li><strong>Saldo Bersih:</strong> Uang yang seharusnya ada di tangan saat ini (diluar modal kasir).</li>
                    </ul>
                `
            },
            {
                id: 'fin_2', title: 'Pembelian & Supplier (Kulakan)', icon: 'boxes', colorClass: 'text-blue-400',
                content: `
                    <p>Gunakan fitur ini saat Anda belanja stok barang.</p>
                    <ul class="list-disc pl-5 mt-1 space-y-1 text-sm">
                        <li>Tambah Supplier dulu.</li>
                        <li>Klik "Catat Pembelian". Masukkan barang apa saja yang dibeli dan harganya.</li>
                        <li>Fitur ini mendukung <strong>Konversi Satuan</strong>. Jika bahan baku sudah disetting (misal beli per Karton), Anda bisa input pembelian dalam Karton, dan stok bertambah dalam Pcs.</li>
                        <li>Bisa catat DP (Utang ke Supplier).</li>
                        <li>Bukti nota yang diupload di sini juga bisa diunduh kembali dengan nama file sesuai ID Pembelian.</li>
                    </ul>
                `
            },
            {
                id: 'fin_3', title: 'Utang & Piutang (Kasbon)', icon: 'book', colorClass: 'text-red-400',
                content: `
                    <ul class="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Piutang (Kasbon Pelanggan):</strong> Terjadi jika saat transaksi kasir metode bayarnya "Non-Tunai" atau nominal bayar 0 (atau kurang dari total).</li>
                        <li><strong>Cara Melunasi:</strong> Masuk tab Utang &amp; Piutang &rarr; Klik "Bayar" pada transaksi tersebut.</li>
                        <li>Pelunasan akan masuk ke Arus Kas hari itu.</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'menu_pelanggan',
        label: 'Pelanggan',
        icon: 'users',
        desc: 'Kelola database member dan kartu digital.',
        items: [
            {
                id: 'cust_identity', title: 'Data Identitas Bebas (Sekolah/Kantor)', icon: 'tag', colorClass: 'text-sky-400', badge: 'Baru',
                content: `
                    <p>Kolom 'Kontak' pada data pelanggan kini bersifat fleksibel. Anda tidak harus mengisinya dengan Nomor HP.</p>
                    <ul class="list-disc pl-5 space-y-1 mt-2 text-sm">
                        <li><strong>Koperasi Sekolah/Pesantren:</strong> Isi dengan Kelas, Asrama, atau NIS.</li>
                        <li><strong>Kantor/Karyawan:</strong> Isi dengan Divisi atau NIK.</li>
                        <li>Data ini bisa digunakan untuk pencarian di kasir.</li>
                    </ul>
                `
            },
            {
                id: 'cust_card', title: 'Kartu Member Digital & QR Code', icon: 'award', colorClass: 'text-yellow-400', badge: 'Baru',
                content: `
                    <p>Berikan pengalaman profesional kepada pelanggan setia Anda tanpa biaya cetak kartu fisik.</p>
                    <ul class="list-disc pl-5 space-y-1 mt-2 text-sm">
                        <li>Masuk ke menu <strong>Keuangan &rarr; Tab Pelanggan &rarr; Ikon Kartu</strong>.</li>
                        <li>Klik ikon <strong>"Kartu"</strong> pada nama pelanggan.</li>
                        <li>Akan muncul Kartu Member Digital dengan Nama, ID Unik, dan QR Code.</li>
                        <li>Klik <strong>"Share WA"</strong> untuk mengirim gambar kartu langsung ke WhatsApp pelanggan.</li>
                        <li><strong>Fungsi QR:</strong> Saat pelanggan datang kembali, scan QR di kartu mereka menggunakan "Barcode Scanner" di menu Kasir untuk menemukan data mereka secara instan.</li>
                    </ul>
                `
            },
            {
                id: 'cust_bal', title: 'Saldo & Poin', icon: 'finance', colorClass: 'text-green-400',
                content: `
                    <ul class="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Top Up:</strong> Di tab Pelanggan, klik tombol "Isi Saldo". Uang yang diterima akan masuk ke Laporan Kas (Cash In).</li>
                        <li><strong>Simpan Kembalian (Deposit):</strong> Saat pembayaran Tunai memiliki kembalian, centang opsi <em>"Simpan kembalian ke Saldo"</em> di dialog pembayaran. Solusi praktis pengganti uang receh.</li>
                        <li><strong>Poin:</strong> Poin bertambah otomatis saat transaksi. Atur rumus poin di Pengaturan.</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'menu_setting',
        label: 'Pengaturan & Cloud',
        icon: 'settings',
        desc: 'Konfigurasi sistem, sinkronisasi, dan manajemen user.',
        items: [
            {
                id: 'install_app', title: 'Instalasi Aplikasi (Siap Offline)', icon: 'download', colorClass: 'text-green-400', badge: 'Wajib',
                content: `
                    <p>Agar aplikasi bisa berjalan tanpa internet (Offline Mode), Anda wajib menginstalnya ke perangkat:</p>
                    <ol class="list-decimal pl-5 space-y-1 mt-2 text-sm text-slate-300">
                        <li>Masuk ke menu <strong>Pengaturan</strong> &rarr; Tab <strong>Data & Cloud</strong>.</li>
                        <li>Cari kartu paling atas bernama <strong>"Status Aplikasi"</strong>.</li>
                        <li>Tunggu hingga muncul status "Siap Offline".</li>
                        <li>Klik tombol biru <strong>"Install Aplikasi"</strong> (jika tersedia) atau <strong>"Download Aset Offline"</strong>.</li>
                        <li>Aplikasi akan muncul di layar utama HP Anda dan bisa dibuka kapan saja meski kuota habis.</li>
                    </ol>
                `
            },
            {
                id: 'set_hw', title: 'Perangkat Keras (Printer & Scanner)', icon: 'bluetooth', colorClass: 'text-purple-400', badge: 'Penting',
                content: `
                    <p class="mb-2">Masuk ke tab <strong>"Perangkat Keras"</strong> untuk mengatur alat:</p>
                    <ul class="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Printer Bluetooth (Native App):</strong> Jika menggunakan aplikasi Android (APK), support printer bluetooth lebih stabil. Pastikan aktifkan Bluetooth dan pasangkan (pair) printer di pengaturan HP terlebih dahulu. Lalu di aplikasi Artea, klik "Cari Perangkat (Paired)".</li>
                        <li><strong>Printer USB/Kabel:</strong> Gunakan opsi "System Printer" untuk membuka dialog cetak bawaan Android/Windows (RawBT atau Print Service).</li>
                        <li><strong>Barcode Scanner:</strong> Mendukung scanner fisik (USB/Wireless) dan kamera HP.</li>
                    </ul>
                `
            },
            {
                id: 'set_central', title: 'Setup Perangkat Pusat (Admin)', icon: 'star', colorClass: 'text-yellow-400', badge: 'Baru',
                content: `
                    <p class="mb-2">Jika Anda adalah Owner/Admin yang ingin memantau cabang dari jauh:</p>
                    <ol class="list-decimal pl-5 space-y-1 text-sm">
                        <li>Buka <strong>Pengaturan &rarr; Toko & Struk</strong>.</li>
                        <li>Pada bagian <strong>"Identitas Perangkat Ini (Store ID)"</strong>, pilih opsi <strong>"★ PUSAT (ADMIN MONITORING)"</strong>.</li>
                        <li>Sistem akan mengenali perangkat ini sebagai Pusat Pengendali (Control Center).</li>
                        <li>Sebagai Pusat, Anda tidak perlu memilih cabang saat menekan tombol "Refresh" atau "Update".</li>
                    </ol>
                `
            },
            {
                id: 'multi_device', title: 'Sinkronisasi Admin Ganda (PC & HP)', icon: 'sync', colorClass: 'text-sky-400', badge: 'Tips Pro',
                content: `
                    <p className="mb-2">Cara mengelola toko dari dua perangkat berbeda (misal: Laptop di rumah & Ponsel saat bepergian) sebagai Admin:</p>
                    <ul class="list-disc pl-5 text-sm text-slate-300 space-y-2">
                        <li>
                            <strong>Mengubah Harga/Produk:</strong><br/>
                            - Di PC (Sumber): Setelah edit, masuk ke <em>Pengaturan &rarr; Data</em>, klik <strong>"Kirim Master" (Push)</strong>.<br/>
                            - Di HP (Penerima): Masuk menu Data, klik <strong>"Update dari Pusat" (Pull)</strong>.
                        </li>
                        <li>
                            <strong>Melihat Laporan:</strong><br/>
                            Di kedua perangkat, cukup gunakan <strong>Mode Cloud (Dropbox)</strong> di Dashboard/Laporan dan tekan tombol <strong>"Refresh"</strong>. Data akan selalu sama.
                        </li>
                        <li>
                            <strong>Menggabungkan Data (Merge):</strong><br/>
                            Jika Anda ingin data fisik (stok) di HP juga ikut berubah sesuai laporan PC, klik tombol <strong>"Simpan ke Lokal"</strong> setelah Refresh di Dashboard.
                        </li>
                    </ul>
                `
            },
            {
                id: 'cloud_strategy', title: 'Strategi Admin Ringan (Mode Intip)', icon: 'eye', colorClass: 'text-sky-400', badge: 'Recommended',
                content: `
                    <div class="bg-sky-900/20 border border-sky-700 p-3 rounded-lg mb-2">
                        <strong class="text-sky-300">Konsep Utama:</strong> Agar perangkat Admin tidak berat/lemot, Anda TIDAK PERLU menyimpan data semua cabang ke database HP Anda secara permanen.
                    </div>
                    <ul class="list-disc pl-5 text-sm text-slate-300 space-y-2">
                        <li><strong>Mode Intip (Viewer):</strong> Saat Anda menekan tombol "Refresh" di Dashboard/Laporan, data dari Cloud hanya ditampilkan sementara di layar (RAM). Ini sangat ringan.</li>
                        <li><strong>Kapan harus Simpan ke Lokal?</strong> Hanya jika Anda ingin mengedit data tersebut, melakukan refund, atau mengubah stok secara manual. Jika hanya untuk melihat omzet, biarkan dalam Mode Intip (Dropbox).</li>
                    </ul>
                `
            },
            {
                id: 'cloud_full', title: 'Siklus Bulanan (Jika Cloud Penuh)', icon: 'database', colorClass: 'text-orange-400',
                content: `
                    <p>Apa yang harus dilakukan jika penyimpanan Dropbox penuh?</p>
                    <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-slate-300">
                        <li>Buka menu <strong>Pengaturan &rarr; Data & Cloud</strong>.</li>
                        <li>Klik tombol <strong>"Download Arsip Cloud"</strong>. Pilih format (Excel/PDF) yang diinginkan. Simpan file ini di Laptop/Google Drive sebagai arsip bulanan.</li>
                        <li>Setelah file aman terunduh, klik tombol merah <strong>"Kosongkan Folder Laporan"</strong>.</li>
                        <li>Dropbox Anda kembali bersih dan siap menerima data bulan berikutnya. Perangkat Admin Anda tetap ringan karena tidak perlu menampung ribuan data lama.</li>
                    </ol>
                `
            },
            {
                id: 'archive_filter', title: 'Cara Memilah Data Arsip (Filter Cabang)', icon: 'boxes', colorClass: 'text-green-400', badge: 'Penting',
                content: `
                    <p><strong>Info Penting:</strong> Saat Anda menekan tombol "Unduh Arsip" di menu Pengaturan Data:</p>
                    <ul class="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-300">
                        <li>Sistem akan mengunduh <strong>SELURUH data gabungan</strong> dari semua cabang yang ada di Dropbox menjadi satu file Excel/CSV besar.</li>
                        <li>Anda <strong>tidak perlu</strong> memilih cabang satu per satu saat mengunduh.</li>
                        <li><strong>Cara Memilah di Excel:</strong>
                            <ol className="list-decimal pl-5 mt-1">
                                <li>Buka file Excel yang sudah diunduh.</li>
                                <li>Klik baris judul (Header), lalu pilih menu <strong>Data &rarr; Filter</strong>.</li>
                                <li>Cari kolom bernama <strong>"Cabang" (Store ID)</strong>.</li>
                                <li>Klik panah filter pada kolom tersebut dan centang cabang yang ingin Anda lihat.</li>
                            </ol>
                        </li>
                    </ul>
                `
            },
            {
                id: 'set_2', title: 'Keamanan, User & Audit (PENTING)', icon: 'lock', colorClass: 'text-red-400', badge: 'Anti-Fraud',
                content: `
                    <p>Cara mencegah Staff nakal melakukan Top Up palsu atau kecurangan:</p>
                    <ul class="list-disc pl-5 space-y-1 mt-2 text-sm">
                        <li><strong>Wajibkan Sesi (Shift):</strong> Aktifkan di Pengaturan. Saat Top Up saldo member, sistem mencatatnya sebagai "Uang Masuk". Jika staff Top Up palsu tanpa memasukkan uang, laci kasir akan minus/selisih saat tutup toko. Staff harus mengganti selisih tersebut.</li>
                        <li><strong>Audit Log:</strong> Semua aktivitas Top Up Saldo, Refund, dan Hapus Produk tercatat di menu <strong>Pengaturan &rarr; Audit Log</strong>.</li>
                        <li><strong>PIN:</strong> Setiap user wajib punya PIN untuk identifikasi.</li>
                        <li><strong>CCTV Selfie:</strong> Kamera akan memotret wajah pengguna saat login PIN untuk disimpan di Audit Log.</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'menu_share',
        label: 'Berbagi',
        icon: 'share',
        desc: 'Bantu UMKM lain naik kelas.',
        items: [
            {
                id: 'promo_wa', title: 'Template Broadcast WhatsApp', icon: 'whatsapp', colorClass: 'text-green-500', badge: 'Teks Siap Salin',
                content: '' // Placeholder, handled in ManualTab.tsx
            }
        ]
    }
];

// --- KONTEN FAQ (LENGKAP) ---
export const FAQS: FaqItem[] = [
    {
        id: 'faq_role',
        category: 'Akun & Akses',
        title: 'Apa bedanya Admin, Staff, dan Viewer?',
        content: '<ul><li><strong>Admin:</strong> Bos. Akses penuh, bisa edit/hapus data & lihat semua cabang.</li><li><strong>Staff:</strong> Kasir. Hanya bisa jualan & stok opname di toko tempatnya bekerja. Tidak bisa lihat data cloud.</li><li><strong>Viewer (Baru):</strong> Investor/Owner Pasif. Hanya bisa MELIHAT (Read-only) Laporan, Dashboard, & Audit Log. Aman untuk dipinjamkan ke partner.</li></ul>'
    },
    {
        id: 'faq_staff_cloud',
        category: 'Akun & Akses',
        title: 'Saya Staff, kenapa tombol Cloud hilang?',
        content: 'Ini fitur privasi. Staff dibatasi hanya mengelola data operasional toko tempat mereka bekerja (Lokal). Staff tidak perlu akses ke data omzet global perusahaan.'
    },
    {
        id: 'faq_profit',
        category: 'Keuangan',
        title: 'Apakah belanja stok mengurangi Net Profit?',
        content: '<strong>TIDAK SECARA LANGSUNG.</strong><br/>Belanja stok hanya mengurangi <strong>Arus Kas</strong> (Uang di Laci), tapi aset barang bertambah. Net Profit baru berkurang (HPP) saat barang tersebut laku terjual.'
    },
    {
        id: 'faq_camera',
        category: 'Keamanan',
        title: 'Kenapa kamera nyala saat login?',
        content: 'Fitur <strong>CCTV Selfie</strong>. Aplikasi memotret wajah pengguna saat menekan PIN terakhir untuk disimpan di Audit Log. Ini mencegah staff meminjam akun temannya untuk melakukan kecurangan.'
    },
    {
        id: 'faq_offline',
        category: 'Teknis',
        title: 'Apakah butuh internet terus-menerus?',
        content: '<strong>Tidak.</strong> Aplikasi ini Offline-First. Internet hanya butuh saat: 1. Awal Shift (Tarik harga terbaru), 2. Akhir Shift (Kirim laporan ke Owner), 3. Menggunakan fitur AI atau Layar Ganda.'
    },
    {
        id: 'faq_kds_undo',
        category: 'Operasional',
        title: 'Pesanan Dapur kepencet "Selesai", bisa batal?',
        content: 'Bisa. Di Layar Dapur, masuk ke tab "Riwayat Selesai", cari pesanan, lalu tekan <strong>Undo</strong>. Pesanan akan kembali ke status "Dimasak".'
    },
    {
        id: 'faq_printer',
        category: 'Hardware',
        title: 'Printer Bluetooth tidak terdeteksi?',
        content: 'Pastikan: 1. Bluetooth HP nyala. 2. Printer sudah di-pairing di menu Bluetooth HP. 3. Jika pakai aplikasi Android, klik "Cari Perangkat (Paired)". Jika di web browser, gunakan browser Chrome/Edge yang support Web Bluetooth.'
    },
    {
        id: 'faq_pay_blocked',
        category: 'Operasional',
        title: 'Kenapa muncul peringatan "Info Meja Wajib" saat mau Bayar?',
        content: 'Anda mengaktifkan opsi <strong>"Wajibkan Isi Meja & Pax"</strong> di Pengaturan. Sistem mewajibkan kasir mengisi Nomor Meja dan Jumlah Tamu sebelum transaksi bisa diproses.'
    },
    {
        id: 'faq_dropbox_full',
        category: 'Teknis',
        title: 'Dropbox Penuh, Apa yang harus dilakukan?',
        content: 'Lakukan "Siklus Bulanan". Masuk ke Pengaturan > Data, klik "Download Arsip Cloud" (simpan di Laptop), lalu klik "Hapus Laporan" untuk membersihkan penyimpanan.'
    }
];

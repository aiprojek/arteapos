
import React from 'react';

const FAQTab: React.FC = () => {
    return (
        <div className="animate-fade-in max-w-3xl mx-auto space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="font-bold text-white mb-2 text-lg">Tanya Jawab & Masalah Umum</h3>
                <div className="space-y-4">
                    
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apa bedanya setting identitas "PUSAT" dengan Cabang biasa?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>"PUSAT"</strong> ditujukan khusus untuk perangkat Admin/Owner yang hanya digunakan untuk memantau laporan dan mengelola harga/produk. 
                            <br/>Perangkat yang diset sebagai Pusat <strong>tidak memiliki stok fisik toko</strong> dan sebaiknya tidak digunakan untuk kasir harian. 
                            <br/>Sedangkan identitas cabang (misal: JKT-01) wajib dipilih oleh perangkat kasir di toko agar laporan penjualannya teridentifikasi dengan jelas.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Bagaimana cara update harga ke semua cabang sekaligus?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Di perangkat Admin (Pusat): Ubah harga di menu Produk &rarr; Buka menu <strong>Data</strong> (ikon database di atas) &rarr; Klik tombol <strong>"Kirim Master (Push)"</strong>.
                            <br/>Di perangkat Cabang: Klik tombol <strong>"Cek Menu & Harga Baru"</strong>. Harga akan otomatis terupdate.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apa bedanya "Satuan Pakai" dan "Satuan Beli"?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>Satuan Pakai</strong> adalah unit terkecil yang digunakan dalam resep (misal: Gram, Ml, Pcs). 
                            <strong>Satuan Beli</strong> adalah unit kemasan saat Anda belanja ke supplier (misal: Karton, Bal, Dus). 
                            <br/>Dengan fitur konversi, Anda bisa input beli "1 Karton", dan sistem otomatis menambah stok "24 Pcs" (jika disetting 1 Karton = 24 Pcs).
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Bagaimana cara input banyak bahan baku sekaligus?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Gunakan fitur <strong>Tambah Massal (Bulk Add)</strong>. Anda bisa mengetik langsung di tabel (seperti Excel) atau mengunggah file CSV. 
                            Jangan lupa unduh template CSV terlebih dahulu agar formatnya sesuai.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Mengapa HPP (Harga Modal) otomatis terisi?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Di formulir bahan baku, terdapat <strong>Kalkulator HPP</strong>. Jika Anda mengisi "Harga Beli Total" dan "Jumlah Isi/Berat", sistem akan membaginya secara otomatis untuk mendapatkan harga modal per unit terkecil (per gram/ml). Ini mencegah kesalahan hitung manual.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Bisakah banyak kasir/cabang input data bersamaan?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>YA, Sangat Aman!</strong> Sistem Artea POS telah diperbarui dengan teknologi <em>Smart Unique ID</em>.
                            Setiap transaksi kini memiliki sidik jari unik yang mencakup Kode Cabang, Nama Kasir, dan Waktu.
                            Jadi, meskipun ada 10 kasir menekan tombol "Bayar" di detik yang sama, semua data akan tersimpan rapi di Cloud tanpa ada yang tertimpa atau hilang.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Mengapa muncul peringatan "Memori Penuh"?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Aplikasi mendeteksi bahwa database lokal (di browser) sudah menyimpan lebih dari 5000 catatan (transaksi + log). 
                            Hal ini bisa membuat aplikasi menjadi lambat (lag). Disarankan untuk segera melakukan <strong>Pengarsipan & Pembersihan Data</strong> di menu Pengaturan.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apakah data saya hilang setelah "Hapus Data Lama"?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Data akan hilang dari <strong>tampilan aplikasi</strong>, tetapi Anda <strong>WAJIB</strong> mengunduh file backup (Excel/PDF) sebelum menghapusnya. 
                            Jadi, data historis Anda tetap aman di file yang Anda unduh tersebut.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apa itu "Scan Akses Pusat (Pairing)" dan siapa yang menggunakannya?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Fitur ini <strong>khusus untuk perangkat cabang</strong>. Fungsinya untuk menghubungkan Perangkat Cabang ke akun Dropbox Admin Pusat tanpa perlu login email. 
                            <br/>Admin Pusat cukup membuat kode lewat tombol "Bagikan Akses", lalu staf cabang memindai (scan) atau memasukkan kode tersebut.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Kamera scan barcode error / tidak muncul?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Cek hal berikut:
                            <ol className="list-decimal pl-5 mt-1">
                                <li>Lihat ikon "Gembok" di sebelah alamat website (URL bar). Pastikan izin <strong>Kamera</strong> diatur ke "Allow" atau "Izinkan".</li>
                                <li>Pastikan kamera tidak sedang dipakai aplikasi lain (Zoom/Meet/Aplikasi Lain).</li>
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
                            Hidupkan Bluetooth dan pasangkan (pair) printer di pengaturan Perangkat dulu. 
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
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apakah data saya hilang jika Perangkat rusak?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>YA</strong>, jika Anda tidak menghubungkan Dropbox. Aplikasi ini Offline-first (data di Perangkat). 
                            Solusi: Segera hubungkan Dropbox di menu Pengaturan. Data akan otomatis ter-backup ke cloud.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Sinkronisasi Cloud gagal / Penuh?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Penyimpanan gratis Dropbox mungkin penuh. 
                            Masuk ke Pengaturan &rarr; Data &rarr; Klik tombol merah <strong>"Kosongkan Folder Laporan"</strong>. 
                            Ini akan menghapus log transaksi lama di cloud (tapi data di Perangkat aman) agar sync bisa berjalan lagi.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FAQTab;

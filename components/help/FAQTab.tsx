
import React from 'react';

const FAQTab: React.FC = () => {
    return (
        <div className="animate-fade-in max-w-3xl mx-auto space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="font-bold text-white mb-2 text-lg">Tanya Jawab & Masalah Umum</h3>
                <div className="space-y-4">
                    
                    {/* --- FAQ STOK (NEW) --- */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apa bedanya "Transfer Stok" dan "Stok Manual"?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>Transfer Stok</strong> digunakan oleh Gudang Pusat untuk mengirim barang ke Cabang secara digital (membutuhkan internet). Cabang akan menerima stok saat Sync.<br/><br/>
                            <strong>Stok Manual</strong> digunakan untuk input barang yang dibeli sendiri oleh toko dari supplier lokal/pasar (bisa offline) atau untuk mencatat barang rusak/waste.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Gudang sudah kirim barang, kenapa stok di kasir belum bertambah?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Karena aplikasi ini <em>Offline-First</em>, data tidak masuk otomatis detik itu juga. <br/>
                            Kasir/Staf Toko harus menekan tombol <strong>"Cek Update" (ikon panah bawah)</strong> di bagian atas layar (Header) untuk mengunduh data kiriman dari Gudang. Pastikan ada internet saat menekan tombol tersebut.
                        </p>
                    </div>
                    {/* ------------------------------- */}

                    {/* --- NEW FAQ FOR BLUETOOTH & DEVICE --- */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Printer Bluetooth tidak terdeteksi di Android 12+?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Android 12/13/14/15 membutuhkan izin <strong>"Nearby Devices" (Perangkat Sekitar)</strong>.
                            Pastikan Anda mengklik "Izinkan" saat pertama kali membuka menu Printer. 
                            Jika terlewat, buka <em>Settings HP &rarr; Apps &rarr; Artea POS &rarr; Permissions &rarr; Nearby Devices &rarr; Allow</em>.
                        </p>
                    </div>
                    {/* ------------------------------- */}

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apakah barcode scanner bisa untuk kartu member?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>Ya!</strong> Tombol Scanner di menu Kasir sekarang sudah "Smart".
                            Jika yang discan adalah kartu member, sistem otomatis login pelanggan tersebut.
                            Jika yang discan adalah barang, sistem otomatis menambahkannya ke keranjang.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Saya koperasi sekolah/kantor, bisa pakai data Kelas/Divisi?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>Bisa.</strong> Kolom "Kontak" pada data pelanggan bersifat bebas. Anda bisa mengisinya dengan 
                            "Kelas 12A", "NIK 12345", atau "Divisi Gudang". 
                            Data ini juga bisa digunakan sebagai kata kunci pencarian di halaman kasir.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Bagaimana cara mengirim Kartu Member ke Pelanggan?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Di menu <strong>Keuangan &rarr; Tab Pelanggan &rarr; Ikon Kartu</strong>, klik tombol <strong>"Share WA"</strong>. 
                            Ini akan otomatis mengunduh gambar kartu (PNG) dan membuka WhatsApp. Anda tinggal melampirkan gambar tersebut ke chat pelanggan.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apakah uang Top Up Saldo dihitung sebagai Omzet Penjualan?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>Tidak.</strong> Dalam akuntansi, uang Top Up dianggap sebagai <strong>Utang/Deposit</strong> (Uang Titipan). 
                            Di Artea POS, saat Top Up terjadi, uang masuk ke laporan <strong>Arus Kas (Kas Masuk)</strong> agar laci kasir tetap balance, tapi TIDAK menambah angka "Total Penjualan" hari itu.
                            <br/><br/>
                            Omzet Penjualan baru akan bertambah secara sah ketika member tersebut <strong>membelanjakan</strong> saldonya untuk membeli produk.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border-l-4 border-red-500">
                        <h4 className="font-bold text-red-400 mb-1">Q: Apakah aman Staff bisa Top Up saldo member? Nanti disalahgunakan?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>Aman, asalkan Anda mengaktifkan fitur Sesi (Shift).</strong> 
                            Sistem Artea POS mencatat setiap Top Up sebagai "Uang Masuk". 
                            <br/><br/>
                            <em>Contoh Kasus:</em> Jika Staff nakal melakukan Top Up palsu ke akunnya sendiri sebesar Rp 100.000 tanpa memasukkan uang ke laci, maka saat Tutup Toko (End Session), sistem akan menagih uang tersebut. Laporan kasir akan menunjukkan <strong>Selisih (Kurang) Rp 100.000</strong> yang harus diganti oleh Staff.
                            <br/>Selain itu, semua aktivitas Top Up tercatat di menu <strong>Pengaturan &rarr; Audit Log</strong>.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apakah data cabang otomatis tersimpan di HP Admin?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>Tidak otomatis.</strong> Aplikasi ini didesain agar perangkat Admin tetap ringan ("Mode Intip"). Data cabang tersimpan di Dropbox. Saat Anda menekan tombol "Refresh" di Dashboard, aplikasi hanya mengunduh data tersebut ke memori sementara untuk ditampilkan (View Only).
                            <br/>Data tidak akan memenuhi penyimpanan lokal HP Anda kecuali Anda menekan tombol "Simpan ke Lokal".
                        </p>
                    </div>

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
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Bisakah banyak kasir/cabang input data bersamaan?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>YA, Sangat Aman!</strong> Sistem Artea POS telah diperbarui dengan teknologi <em>Smart Unique ID</em>.
                            Setiap transaksi kini memiliki sidik jari unik. Jadi meskipun banyak kasir menekan tombol "Bayar" bersamaan, semua data akan tersimpan rapi di Cloud tanpa ada yang tertimpa.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apakah aplikasi ini boleh disebarkan/dijual lagi?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>Sangat Boleh!</strong> Artea POS adalah Open Source (GPL v3.0). Anda bebas membagikannya ke teman, komunitas, atau bahkan menjadikannya paket bundling dengan hardware (Tablet/Printer) yang Anda jual, selama Anda menyertakan informasi lisensi aslinya.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FAQTab;


import React from 'react';

const FAQTab: React.FC = () => {
    return (
        <div className="animate-fade-in max-w-3xl mx-auto space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="font-bold text-white mb-2 text-lg">Tanya Jawab & Masalah Umum</h3>
                <div className="space-y-4">
                    
                    {/* --- NEW FAQ FOR MEMBER CARD --- */}
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
                    {/* ------------------------------- */}

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Apakah uang Top Up Saldo dihitung sebagai Omzet Penjualan?</h4>
                        <p className="text-slate-300 text-sm">
                            A: <strong>Tidak.</strong> Dalam akuntansi, uang Top Up dianggap sebagai <strong>Deposit (Titipan)</strong> atau Uang Muka. 
                            Di Artea POS, saat Anda melakukan Top Up member, uang tersebut masuk ke laporan <strong>Arus Kas (Kas Masuk)</strong> sehingga jumlah uang di laci kasir tetap balance saat tutup shift.
                            <br/><br/>
                            Omzet Penjualan baru akan bertambah ketika member tersebut <strong>membelanjakan</strong> saldonya untuk membeli produk.
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
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Dropbox penuh! Apa yang harus saya lakukan?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Anda tidak perlu upgrade Dropbox berbayar. Lakukan prosedur <strong>Arsip & Bersihkan</strong>:
                            <ol className="list-decimal pl-5 mt-1">
                                <li>Masuk menu <strong>Pengaturan &rarr; Data & Cloud</strong>.</li>
                                <li>Klik <strong>"Download Arsip Cloud"</strong>. Simpan file backup (Excel/JSON) ke tempat aman (Laptop/Google Drive).</li>
                                <li>Setelah file terunduh, klik tombol merah <strong>"Kosongkan Folder Laporan"</strong>.</li>
                            </ol>
                            Ini akan membersihkan Dropbox sehingga cabang bisa mengirim data baru lagi, tanpa membebani memori HP Admin.
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
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Bagaimana cara input banyak bahan baku sekaligus?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Gunakan fitur <strong>Tambah Massal (Bulk Add)</strong>. Anda bisa mengetik langsung di tabel (seperti Excel) atau mengunggah file CSV. 
                            Jangan lupa unduh template CSV terlebih dahulu agar formatnya sesuai.
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
                        <h4 className="font-bold text-[#52a37c] mb-1">Q: Mengapa data cabang tidak muncul otomatis di Admin?</h4>
                        <p className="text-slate-300 text-sm">
                            A: Sistem Dropbox berbasis file, bukan database real-time. Data cabang sudah terkirim secara otomatis, namun Admin perlu menekan tombol <strong>"Refresh Data"</strong> (ikon panah melingkar) di Dashboard untuk menarik/mengunduh update terbaru tersebut ke layar Anda (Mode Intip).
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

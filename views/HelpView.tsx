import React from 'react';
import Icon from '../components/Icon';
import Button from '../components/Button';

const HelpSection: React.FC<{ title: string; icon: 'info-circle' | 'star-fill' | 'book'; children: React.ReactNode }> = ({ title, icon, children }) => (
    <section className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/80 shadow-lg">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white mb-4 border-b border-slate-700 pb-3">
            <Icon name={icon} className="w-6 h-6 text-[#52a37c]" />
            <span>{title}</span>
        </h2>
        <div className="prose prose-slate prose-invert max-w-none space-y-4 text-slate-300">
            {children}
        </div>
    </section>
);

const FeatureListItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <li className="flex items-start gap-4">
        <Icon name="check-circle-fill" className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
        <div>
            <strong className="text-white">{title}:</strong> {children}
        </div>
    </li>
)

const HelpView: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="text-center py-4">
                <Icon name="logo" className="w-20 h-20 text-[#52a37c] mx-auto" />
                <h1 className="text-4xl font-bold text-white mt-4">Artea POS - Info & Bantuan</h1>
                <p className="text-slate-400 mt-2 text-lg">Panduan lengkap Anda untuk menggunakan aplikasi kasir.</p>
            </div>

            <HelpSection title="Tentang Aplikasi" icon="info-circle">
                <p>
                    <strong>Artea POS</strong> adalah aplikasi Point of Sale (POS) atau kasir offline-first yang dirancang untuk usaha kecil dan menengah di bidang makanan dan minuman. Aplikasi ini sepenuhnya berjalan di browser Anda tanpa memerlukan koneksi internet untuk operasional sehari-hari, memastikan bisnis Anda tetap berjalan lancar kapan saja.
                </p>
                <div className="text-sm bg-slate-900/70 p-4 rounded-lg border border-slate-700 space-y-2">
                    <p><strong>Pengembang:</strong> <a href="https://aiprojek01.my.id" target="_blank" rel="noopener noreferrer" className="text-[#52a37c] hover:underline font-semibold">AI Projek</a></p>
                    <p><strong>Lisensi:</strong> <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-[#52a37c] hover:underline font-semibold">GNU General Public License v3.0</a></p>
                </div>
                <div className="mt-4 p-4 bg-[#1a3c2d]/30 border border-[#347758]/30 rounded-lg text-[#a0d9bf] text-sm">
                    <p className="font-semibold mb-1 text-white">Catatan dari Pengembang:</p>
                    <p>Tujuan awal dibuatnya aplikasi ini adalah untuk membantu merapikan administrasi di kedai kami yang bernama <a href="https://artea.pages.dev" target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:underline">Artea</a>. Jadi, harap maklum jika fiturnya belum selengkap aplikasi kasir komersial. Dengan dipublikasikannya aplikasi ini, kami berharap bisa bermanfaat bagi yang membutuhkan dan dapat berkembang bersama melalui kolaborasi komunitas.</p>
                </div>
            </HelpSection>

            <HelpSection title="Fitur Utama" icon="star-fill">
                <ul className="space-y-3 !pl-0 !ml-0">
                    <FeatureListItem title="Point of Sale (Kasir)">Antarmuka kasir yang cepat dan intuitif untuk memproses transaksi penjualan.</FeatureListItem>
                    <FeatureListItem title="Manajemen Produk">Tambah, edit, dan hapus produk dengan mudah. Kelola kategori, harga, gambar, dan barcode.</FeatureListItem>
                    <FeatureListItem title="Manajemen Inventaris">Lacak stok produk jadi atau stok bahan baku menggunakan resep.</FeatureListItem>
                    <FeatureListItem title="Manajemen Keuangan">Catat semua pengeluaran operasional dan pembelian bahan baku dari pemasok. Lacak utang dan piutang.</FeatureListItem>
                    <FeatureListItem title="Laporan Komprehensif">Dapatkan wawasan bisnis dengan laporan penjualan, produk terlaris, dan arus kas.</FeatureListItem>
                    <FeatureListItem title="Sistem Keanggotaan">Kelola data pelanggan, berikan poin untuk setiap transaksi, dan buat reward yang dapat ditukar.</FeatureListItem>
                    <FeatureListItem title="Manajemen Pengguna & Sesi">Buat akun terpisah untuk admin dan staf dengan hak akses yang berbeda. Mulai dan akhiri sesi penjualan untuk rekap kas harian.</FeatureListItem>
                    <FeatureListItem title="Bekerja Offline">Semua data disimpan secara lokal di perangkat Anda. Aplikasi tetap berfungsi penuh tanpa koneksi internet.</FeatureListItem>
                    <FeatureListItem title="Backup & Restore Data">Amankan data Anda dengan mengekspor semuanya ke satu file, dan pulihkan kapan saja.</FeatureListItem>
                </ul>
            </HelpSection>

            <HelpSection title="Panduan Penggunaan" icon="book">
                <div className="space-y-6">
                    <div>
                        <h4 className="text-lg font-semibold text-[#7ac0a0] mb-2">1. Pengaturan Awal</h4>
                        <ol className="list-decimal list-inside space-y-2 pl-2">
                            <li>Buka halaman <strong>Pengaturan</strong>. Di sini Anda bisa mengatur nama toko, mengaktifkan fitur inventaris, dan lainnya.</li>
                            <li>Buka halaman <strong>Produk</strong>, lalu klik "Tambah Produk" untuk memasukkan semua item yang Anda jual. Lengkapi detail seperti nama, harga, dan kategori.</li>
                            <li>Jika Anda mengaktifkan pelacakan inventaris bahan baku, buka halaman <strong>Bahan Baku</strong> (di bawah menu Produk) untuk menambahkan bahan mentah Anda.</li>
                            <li>Jika Anda memiliki staf, aktifkan "Multi-Pengguna & Login PIN" di <strong>Pengaturan</strong> dan buat akun untuk mereka di bagian "Manajemen Pengguna".</li>
                        </ol>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold text-[#7ac0a0] mb-2">2. Melakukan Transaksi</h4>
                        <ol className="list-decimal list-inside space-y-2 pl-2">
                            <li>Di halaman <strong>Kasir</strong>, ketuk produk yang ingin dibeli pelanggan untuk menambahkannya ke keranjang.</li>
                            <li>Ubah jumlah item di keranjang dengan tombol <strong>+</strong> atau <strong>-</strong>.</li>
                            <li>Jika menggunakan sistem member, pilih pelanggan dari daftar dropdown di bawah keranjang.</li>
                            <li>Setelah semua item masuk, klik tombol <strong>"Bayar"</strong>.</li>
                            <li>Di modal pembayaran, masukkan jumlah uang yang dibayarkan. Anda bisa menambahkan beberapa metode pembayaran (misal: sebagian tunai, sebagian non-tunai).</li>
                            <li>Klik "Selesaikan Transaksi". Struk akan muncul dan dapat dicetak atau dibagikan sebagai gambar.</li>
                        </ol>
                    </div>

                     <div>
                        <h4 className="text-lg font-semibold text-[#7ac0a0] mb-2">3. Manajemen Keuangan</h4>
                        <ol className="list-decimal list-inside space-y-2 pl-2">
                             <li>Buka halaman <strong>Keuangan</strong>.</li>
                             <li>Pilih tab <strong>Pengeluaran</strong> untuk mencatat biaya operasional seperti listrik atau gaji.</li>
                             <li>Pilih tab <strong>Pembelian & Pemasok</strong> untuk mencatat pembelian bahan baku. Tambahkan data pemasok terlebih dahulu, lalu catat pembelian baru. Stok bahan baku akan otomatis bertambah.</li>
                             <li>Gunakan tab <strong>Utang & Piutang</strong> untuk melacak transaksi yang belum lunas.</li>
                        </ol>
                    </div>

                     <div>
                        <h4 className="text-lg font-semibold text-[#7ac0a0] mb-2">4. Melihat Laporan</h4>
                        <ol className="list-decimal list-inside space-y-2 pl-2">
                             <li>Buka halaman <strong>Laporan</strong>.</li>
                             <li>Gunakan filter di bagian atas untuk memilih periode laporan yang ingin Anda lihat (hari ini, minggu ini, dll.).</li>
                             <li>Anda dapat melihat ringkasan penjualan, grafik, produk terlaris, dan detail setiap transaksi.</li>
                        </ol>
                    </div>
                     <div>
                        <h4 className="text-lg font-semibold text-[#7ac0a0] mb-2">5. Backup Data Anda! (PENTING)</h4>
                        <p className="!mt-0 !mb-2">
                            Karena semua data disimpan di browser Anda, sangat penting untuk melakukan backup secara berkala.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 pl-2">
                            <li>Buka halaman <strong>Pengaturan</strong>.</li>
                            <li>Di bagian "Manajemen Data", klik <strong>"Backup Data (JSON)"</strong>.</li>
                            <li>Simpan file yang diunduh di tempat yang aman (Google Drive, Flashdisk, dll.).</li>
                            <li>Untuk memulihkan, gunakan tombol "Restore Data (JSON)" dan pilih file backup Anda.</li>
                        </ol>
                    </div>
                </div>
            </HelpSection>

            <footer className="text-center pt-8 border-t border-slate-700">
                <p className="text-slate-400 mb-6">
                    Aplikasi ini tersedia secara gratis dan apa adanya, bersifat open-source, dan terbuka untuk kolaborasi.
                </p>
                <div className="flex justify-center items-center gap-4 flex-wrap">
                    <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary">
                            <Icon name="donate" className="w-5 h-5 text-pink-400" />
                            <span>Donasi</span>
                        </Button>
                    </a>
                     <a href="https://github.com/aiprojek/arteapos" target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary">
                            <Icon name="github" className="w-5 h-5" />
                            <span>GitHub</span>
                        </Button>
                    </a>
                     <a href="https://t.me/aiprojek_community" target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary">
                            <Icon name="chat" className="w-5 h-5" />
                            <span>Diskusi</span>
                        </Button>
                    </a>
                </div>
            </footer>

        </div>
    );
};

export default HelpView;
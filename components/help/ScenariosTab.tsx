
import React from 'react';
import { ScenarioCard } from './SharedHelpComponents';

const ScenariosTab: React.FC = () => {
    return (
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
                        "Owner buka Artea POS di perangkat sendiri &rarr; 'Import Transaksi' &rarr; Paste Kode/Upload CSV untuk melihat data."
                    ]}
                />
                <ScenarioCard 
                    title="3. Cloud Sync (Multi-Cabang)" 
                    icon="wifi" 
                    color="sky-400"
                    desc="Sinkronisasi otomatis antar cabang menggunakan Dropbox."
                    steps={[
                        "Admin (Pusat): Hubungkan akun Dropbox (Login Email/Pass) di menu Pengaturan &rarr; Data.",
                        "Admin: Klik tombol <strong>'Bagikan Akses (Pairing)'</strong> untuk menampilkan QR atau Kode Teks.",
                        "Cabang (Staff): Buka Pengaturan &rarr; Data. Pilih <strong>'Scan Akses Pusat'</strong> atau <strong>'Input Kode'</strong>.",
                        "Cabang: Scan/Paste kode dari Admin. Selesai! Cabang terhubung tanpa login email."
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
                <ScenarioCard 
                    title="5. Bergantian Device (Shared)" 
                    icon="users" 
                    color="purple-400"
                    desc="Satu perangkat (Tablet/PC) digunakan bersama oleh Owner dan Staff secara bergantian."
                    steps={[
                        "Masuk ke Pengaturan &rarr; Keamanan.",
                        "Buat user baru (misal: 'Budi' sebagai Staff, 'Andi' sebagai Admin).",
                        "Aktifkan tombol <strong>'Multi-Pengguna & Login PIN'</strong>.",
                        "Saat pergantian shift, klik tombol 'Logout' atau ikon User. User berikutnya login dengan PIN mereka."
                    ]}
                />
                <ScenarioCard 
                    title="6. Perawatan Rutin (Maintenance)" 
                    icon="database" 
                    color="orange-400"
                    desc="Menjaga performa aplikasi tetap cepat setelah penggunaan jangka panjang."
                    steps={[
                        "Jika muncul peringatan <strong>'Memori Penuh'</strong> atau aplikasi terasa lambat.",
                        "Buka Pengaturan &rarr; Data & Cloud &rarr; Tombol <strong>'Buka Menu Pengarsipan'</strong>.",
                        "Pilih rentang data lama (misal: > 6 Bulan).",
                        "<strong>Wajib:</strong> Unduh Arsip (Excel/PDF) terlebih dahulu.",
                        "Klik 'Hapus Data Lama Permanen' untuk membersihkan database lokal."
                    ]}
                />
            </div>
        </div>
    );
};

export default ScenariosTab;

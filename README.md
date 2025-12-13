
# Artea POS - Aplikasi Kasir Offline

![Lisensi](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Status Proyek](https://img.shields.io/badge/status-aktif-brightgreen.svg)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-blue?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-blue?logo=tailwindcss)

<p align="center">
  <img src="arteapos-jsx/public/favicon.svg" alt="Artea POS Logo" width="128"/>
</p>

<h1 align="center">Artea POS</h1>

**Artea POS** adalah aplikasi Point of Sale (POS) atau kasir _offline-first_ berbasis web yang dirancang untuk usaha kecil dan menengah di bidang makanan dan minuman. Aplikasi ini sepenuhnya berjalan di browser Anda, menyimpan semua data secara lokal, sehingga dapat beroperasi dengan lancar bahkan tanpa koneksi internet.

Proyek ini bersifat _open-source_ dengan tujuan menyediakan alternatif aplikasi kasir yang gratis, mudah digunakan, dan dapat diandalkan.

> **Catatan dari Pengembang:**
> Tujuan awal dibuatnya aplikasi ini adalah untuk membantu merapikan administrasi di kedai kami yang bernama [Artea](https://artea.pages.dev). Jadi, harap maklum jika fiturnya belum selengkap aplikasi kasir komersial. Dengan dipublikasikannya aplikasi ini, kami berharap bisa bermanfaat bagi yang membutuhkan dan dapat berkembang bersama melalui kolaborasi komunitas.

---

### Kolaborasi Manusia & AI dalam Pengembangan

Proyek Artea POS adalah sebuah studi kasus tentang sinergi antara pengembang manusia dan kecerdasan buatan (AI). Pengembangan aplikasi ini dipercepat secara signifikan melalui model kolaborasi berikut:

-   **Peran Pengembang Manusia (AI Projek):**
    -   **Konseptor & Pemilik Proyek:** Memberikan ide awal, visi, dan tujuan utama dari aplikasi Artea POS.
    -   **Product Manager:** Menentukan fitur-fitur yang harus ada, alur kerja pengguna (UX flow), dan memberikan arahan spesifik melalui serangkaian _prompt_ (perintah).
    -   **Penguji & Quality Assurance:** Melakukan pengujian fungsional secara menyeluruh, menemukan bug, dan meminta perbaikan untuk memastikan kualitas dan stabilitas aplikasi.
    -   **Pengambil Keputusan Akhir:** Membuat keputusan final terkait desain, fungsionalitas, dan arah pengembangan proyek.

-   **Peran Asisten AI (Google Gemini):**
    -   **Frontend Engineer:** Menulis sebagian besar kode React, TypeScript, dan Tailwind CSS berdasarkan spesifikasi dan perintah yang diberikan.
    -   **UI/UX Implementer:** Menerjemahkan konsep desain dan fungsionalitas menjadi komponen antarmuka pengguna yang responsif dan interaktif.
    -   **Problem Solver:** Memberikan solusi teknis, memperbaiki bug, dan melakukan _refactoring_ kode sesuai arahan untuk meningkatkan efisiensi dan keterbacaan.

Model kerja ini memungkinkan siklus pengembangan yang sangat cepat, di mana ide dan arahan dari manusia dapat langsung diwujudkan menjadi kode fungsional oleh AI.

---

### ➡️ [Coba Demo Langsung](https://arteapos.pages.dev)

---

## 🚀 Deployment & Penggunaan Offline (PWA)

Aplikasi ini adalah Progressive Web App (PWA), yang artinya dapat "diinstal" di perangkat Anda (Desktop atau Ponsel) untuk pengalaman seperti aplikasi native dan bekerja 100% offline. Ini adalah cara yang direkomendasikan untuk penggunaan sehari-hari.

**Cara Instalasi:**

1.  **Build Aplikasi:** Buka terminal di direktori `arteapos-jsx` dan jalankan:
    ```bash
    # Instal dependensi terlebih dahulu jika belum
    npm install
    # Build aplikasi untuk produksi
    npm run build
    ```
    Perintah ini akan membuat folder `dist` yang berisi semua file aplikasi yang sudah jadi.

2.  **Jalankan Server Lokal (Hanya untuk Instalasi Pertama):**
    Sajikan folder `dist` menggunakan server lokal. Perintah sederhana yang bisa digunakan:
    ```bash
    # Pastikan Anda berada di direktori arteapos-jsx
    npx serve -s dist
    ```
3.  **Buka di Browser:** Buka alamat lokal yang ditampilkan (misalnya `http://localhost:3000`) di browser modern seperti Chrome atau Edge.
4.  **Instal Aplikasi:** Di bilah alamat browser, cari dan klik ikon "Instal" (biasanya ikon monitor dengan panah ke bawah).
5.  **Selesai!** Aplikasi akan terinstal dan ikonnya akan muncul di desktop atau daftar aplikasi Anda. Anda kini bisa menutup server dan menjalankan aplikasi langsung dari ikon tersebut kapan saja, bahkan tanpa koneksi internet.

Untuk panduan instalasi di perangkat Android, lihat [USAGE_GUIDE.md](./arteapos-jsx/USAGE_GUIDE.md).

---

## ✨ Fitur Utama

Artea POS dilengkapi dengan berbagai fitur untuk membantu mengelola operasional bisnis Anda secara efisien:

#### 🛒 Manajemen Penjualan (POS)
- **Antarmuka Kasir Intuitif:** Proses transaksi dengan cepat dan mudah.
- **Keranjang Dinamis:** Tambah, hapus, dan ubah kuantitas produk dengan mudah.
- **Pemindai Barcode:** Gunakan kamera perangkat untuk memindai barcode produk.
- **Manajemen Sesi (Shift):** Kelola modal awal, catat kas masuk/keluar, dan ringkasan tutup buku kasir per sesi.
- **Simpan Pesanan (Tab):** Simpan beberapa pesanan yang sedang berjalan dan beralih di antaranya (berguna untuk restoran/kafe).
- **Beragam Metode Pembayaran:** Catat pembayaran tunai dan non-tunai dalam satu transaksi.
- **Cetak & Bagikan Struk:** Cetak struk ke printer termal atau bagikan sebagai gambar ke pelanggan.

#### 📦 Manajemen Produk & Inventaris
- **Manajemen Produk:** Tambah dan kelola produk tak terbatas, lengkap dengan nama, harga, kategori, dan gambar.
- **Manajemen Kategori:** Kelola kategori produk untuk mempermudah pencarian.
- **Pelacakan Stok:**
    - **Stok Sederhana:** Lacak jumlah stok produk jadi.
    - **Stok Bahan Baku (Resep):** Definisikan resep untuk setiap produk dan lacak stok bahan baku secara otomatis saat penjualan.
- **Penyesuaian Stok & Opname:** Catat penambahan/pengurangan stok dan lakukan audit stok fisik (Stock Opname).
- **Impor/Ekspor Produk:** Kelola data produk secara massal menggunakan file CSV.

#### 💰 Manajemen Keuangan
- **Arus Kas:** Pantau semua pemasukan dari penjualan dan pengeluaran dalam satu dasbor.
- **Catat Pengeluaran:** Catat semua biaya operasional (listrik, gaji, sewa, dll.).
- **Catat Pembelian:** Catat pembelian bahan baku dari pemasok.
- **Manajemen Pemasok:** Kelola daftar pemasok Anda.
- **Manajemen Utang & Piutang:** Lacak transaksi penjualan dan pembelian yang belum lunas.

#### 📊 Laporan & Analitik
- **Dasbor Laporan:** Visualisasikan data penjualan dengan grafik interaktif.
- **Filter Fleksibel:** Lihat laporan berdasarkan periode waktu (harian, mingguan, bulanan, kustom).
- **Analisis Produk:** Temukan produk terlaris dan penjualan berdasarkan kategori.
- **Laporan Sesi:** Mulai dan akhiri sesi penjualan untuk rekap kas harian.
- **Ekspor Laporan:** Unduh semua data laporan dalam format CSV.

#### 👥 Manajemen Pelanggan (CRM)
- **Database Pelanggan:** Simpan data pelanggan setia Anda.
- **Sistem Poin & Reward:**
    - Atur aturan perolehan poin (berdasarkan total belanja, produk, atau kategori).
    - Buat reward yang dapat ditukar dengan poin (diskon atau produk gratis).

#### ⚙️ Pengaturan & Keamanan
- **Manajemen Pengguna:** Buat akun dengan peran berbeda (Admin & Staf) dengan akses terbatas melalui PIN.
- **Audit Log (Log Aktivitas):** Rekam jejak aktivitas sensitif (seperti penghapusan produk, perubahan harga, stock opname, atau refund) untuk mencegah kecurangan.
- **Reset PIN Darurat:** Fitur untuk mereset PIN admin jika terlupa.
- **Kustomisasi Struk:** Atur nama toko, alamat, dan pesan di struk.

#### 💾 Manajemen Data
- **100% Offline:** Semua data disimpan di `IndexedDB` browser. Aplikasi tetap berfungsi tanpa internet.
- **Backup & Restore Lokal:** Amankan seluruh data aplikasi ke dalam satu file JSON dan pulihkan kapan saja.
- **Cloud Sync (Opsional):** Dukungan sinkronisasi data ke Dropbox (Backup) dan Supabase (Real-time Dashboard) untuk pemantauan jarak jauh atau multi-cabang.
- **Progressive Web App (PWA):** "Instal" aplikasi ke layar utama perangkat Anda untuk akses seperti aplikasi native.

## 🛠️ Teknologi yang Digunakan

- **Frontend:** [React 18](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Bahasa:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Grafik & Laporan:** [Recharts](https://recharts.org/)
- **Penyimpanan Data:** `Dexie.js` (IndexedDB Wrapper)

## 🚀 Instalasi & Menjalankan Secara Lokal

Untuk menjalankan proyek ini di mesin lokal Anda, ikuti langkah-langkah berikut:

1.  **Clone repositori ini:**
    ```bash
    git clone https://github.com/aiprojek/arteapos.git
    ```

2.  **Masuk ke direktori proyek:**
    ```bash
    cd arteapos/arteapos-jsx
    ```

3.  **Install dependensi:**
    ```bash
    npm install
    ```

4.  **Jalankan server pengembangan:**
    ```bash
    npm run dev
    ```

5.  Buka browser Anda dan navigasikan ke alamat yang ditampilkan di terminal (biasanya `http://localhost:5173`).

## 📖 Panduan Penggunaan Dasar

1.  **Pengaturan Awal:**
    - Buka halaman **Pengaturan**. Atur nama toko Anda dan aktifkan fitur yang diperlukan seperti "Pelacakan Stok" atau "Sistem Keanggotaan".
    - Buka halaman **Produk** dan tambahkan item yang Anda jual.
    - Jika pelacakan bahan baku diaktifkan, buka halaman **Bahan Baku** untuk menambahkan stok mentah.

2.  **Melakukan Transaksi:**
    - Di halaman **Kasir**, klik produk untuk menambahkannya ke keranjang.
    - Klik tombol **Bayar**, masukkan jumlah yang dibayarkan, lalu selesaikan transaksi.
    - Struk akan muncul dan siap untuk dicetak atau dibagikan.

3.  **PENTING: Backup Data Anda!**
    - Karena semua data disimpan di browser, **sangat penting** untuk melakukan backup secara berkala.
    - Buka **Pengaturan** -> **Manajemen Data** -> klik **"Backup Data (JSON)"**.
    - Simpan file yang diunduh di tempat yang aman (Google Drive, Flashdisk, dll).
    - Jika Anda membersihkan cache browser atau berganti perangkat, Anda dapat memulihkan data menggunakan file backup ini.

## 🤝 Berkontribusi

Kontribusi dari komunitas sangat kami harapkan! Jika Anda ingin membantu mengembangkan Artea POS, silakan:

1.  **Fork** repositori ini.
2.  Buat _branch_ baru untuk fitur Anda (`git checkout -b fitur/nama-fitur-keren`).
3.  Lakukan perubahan dan **commit** (`git commit -m 'Menambahkan fitur keren'`).
4.  **Push** ke _branch_ Anda (`git push origin fitur/nama-fitur-keren`).
5.  Buat **Pull Request** baru.

Jika Anda menemukan bug atau memiliki ide fitur, silakan buat [Issues](https://github.com/aiprojek/arteapos/issues) baru.

## 📜 Lisensi

Proyek ini dilisensikan di bawah [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html).

## ❤️ Dukungan & Komunitas

Aplikasi ini tersedia secara gratis, apa adanya, open-source, dan terbuka untuk kolaborasi.

-   [Donasi](https://lynk.id/aiprojek/s/bvBJvdA)
-   Memberi bintang ⭐ pada repositori [GitHub](https://github.com/aiprojek/arteapos) ini.
-   Bergabung dengan [grup diskusi di Telegram](https://t.me/aiprojek_community).

---
Dibuat dengan ❤️ oleh [AI Projek](https://aiprojek01.my.id).

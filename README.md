
# Artea POS - Aplikasi Kasir UMKM

![Lisensi](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Status Proyek](https://img.shields.io/badge/status-production--ready-brightgreen.svg)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-blue?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-blue?logo=tailwindcss)

<p align="center">
  <img src="assets/icon.png" alt="Artea POS Logo" width="128"/>
</p>

<h1 align="center">Artea POS</h1>

**Artea POS** adalah sistem Point of Sale (POS) modern, bebas, dan *open-source* yang dirancang khusus untuk UMKM (F&B, Retail, Jasa). Aplikasi ini dibangun dengan prinsip **Offline-First**, artinya dapat beroperasi penuh tanpa internet, namun memiliki kemampuan **Cloud Sync** canggih untuk manajemen multi-cabang.

---

### ⚠️ Disclaimer & Latar Belakang

> *"Dari UMKM, Untuk UMKM"*

Aplikasi ini pada awalnya dibuat dan dikembangkan secara spesifik untuk **memenuhi kebutuhan operasional di lini usaha kami sendiri yang bernama [Artea](https://arteagrup.my.id)**.

Kami memutuskan untuk membagikan kode sumbernya (*Open Source*) dengan harapan aplikasi ini dapat bermanfaat bagi rekan-rekan UMKM lain yang membutuhkan sistem kasir handal tanpa biaya langganan.

Namun, demi **kenyamanan bersama dan manajemen ekspektasi**, mohon dipahami bahwa:
1.  Fitur-fitur di dalamnya dibangun berdasarkan alur kerja (*workflow*) dan kebutuhan spesifik usaha kami.
2.  Aplikasi ini mungkin **tidak memiliki fitur selengkap** aplikasi kasir komersial/berbayar buatan perusahaan besar.
3.  Pengembangan dan perbaikan bug dilakukan berdasarkan ketersediaan waktu kami.

Kami sangat menghargai jika Anda ingin menggunakannya, dan lebih senang lagi jika Anda mau berkontribusi (Pull Request) untuk membuatnya lebih baik!

---

### 🌟 Fitur Unggulan

#### 🚀 Performa & Stabilitas
*   **Offline-First Architecture:** Data tersimpan lokal di browser (IndexedDB). Tidak ada loading lama karena internet lambat.
*   **Lazy Loading Reports:** Mampu menangani ribuan transaksi tanpa lag. Laporan hanya memuat data yang diperlukan.
*   **Data Archiving:** Fitur manajemen memori untuk mengarsipkan data lama ke Excel/PDF dan membersihkan database agar aplikasi tetap ringan selamanya.

#### 🛒 Kasir & Operasional
*   **Smart Cart:** Dukungan varian produk, modifier (topping/level gula), dan diskon per item.
*   **Split Bill:** Fitur pisah bayar dalam satu meja/pesanan.
*   **Hold Order (Open Bill):** Simpan pesanan sementara (cocok untuk restoran/kafe).
*   **Shift Management:** Kontrol modal awal, kas masuk/keluar (petty cash), dan laporan tutup buku (z-report).

#### ☁️ Cloud & Multi-Cabang (Dropbox)
*   **Sync Otomatis:** Data transaksi terkirim otomatis ke Dropbox Admin saat kasir online.
*   **Manajemen Pusat:** Admin dapat memantau omzet semua cabang dari satu dashboard.
*   **Push Master Data:** Ubah harga/produk di Pusat, dan kirim update ke semua cabang dengan satu klik.
*   **Secure Pairing:** Hubungkan perangkat staf ke Cloud tanpa perlu memberikan email/password Dropbox (menggunakan Scan QR/Kode Enkripsi).

#### 🖨️ Dukungan Perangkat Keras
*   **Bluetooth Printer:** Cetak struk langsung dari HP Android/Laptop ke printer thermal bluetooth (58mm/80mm).
*   **Barcode Scanner:** Mendukung scanner USB fisik atau menggunakan kamera HP sebagai scanner.
*   **Responsive UI:** Tampilan optimal di HP, Tablet, maupun Laptop/PC.

#### 🛡️ Keamanan & Audit
*   **Role Management:** Akses berbeda untuk Admin, Manager, dan Staf.
*   **Audit Log:** Merekam setiap aktivitas sensitif (Hapus produk, Refund, Edit Stok, Login) untuk mencegah kecurangan.
*   **Anti-Fraud Input:** Validasi ketat untuk mencegah input minus atau manipulasi data.

---

## 🚀 Cara Instalasi & Penggunaan

### 1. Penggunaan Langsung (PWA)
Aplikasi ini adalah **Progressive Web App (PWA)**.
1.  Buka aplikasi di browser (Chrome/Edge disarankan).
2.  Klik ikon **"Install"** di bar alamat browser (biasanya ikon monitor+panah).
3.  Aplikasi akan terpasang di layar utama HP/Desktop dan bisa dibuka secara offline.

### 2. Instalasi Lokal (Untuk Pengembang)

```bash
# 1. Clone repositori
git clone https://github.com/aiprojek/arteapos.git

# 2. Masuk ke direktori
cd arteapos

# 3. Instal dependensi
npm install

# 4. Jalankan mode pengembangan
npm run dev

# 5. Build untuk produksi
npm run build
```

---

## 📖 Skenario Penggunaan

### A. Toko Tunggal (Single Store)
Cocok untuk warung, kedai kopi kecil, atau toko kelontong.
*   Gunakan mode **Lokal**.
*   Backup data secara rutin (mingguan) ke file JSON melalui menu Pengaturan > Data.

### B. Pemilik + Karyawan (Remote Monitoring)
Cocok jika pemilik tidak selalu di toko.
1.  **Pemilik (Admin):** Buka aplikasi, masuk ke Pengaturan > Data, hubungkan akun **Dropbox**.
2.  **Pemilik:** Klik "Bagikan Akses (Pairing)" untuk mendapatkan Kode Akses.
3.  **Karyawan (Toko):** Buka aplikasi, masuk ke Pengaturan > Data, pilih "Input Kode" dan masukkan kode dari Pemilik.
4.  **Hasil:** Setiap transaksi di toko akan otomatis terupload ke Dropbox Pemilik. Pemilik cukup klik tombol "Refresh" di Dashboardnya untuk melihat omzet real-time (tunda beberapa detik).

---

## 🛠️ Teknologi

Dibuat dengan ❤️ menggunakan teknologi web modern yang cepat dan efisien:
*   **React 18** (UI Library)
*   **Vite** (Build Tool super cepat)
*   **TypeScript** (Keamanan kode)
*   **Dexie.js** (IndexedDB wrapper untuk database offline)
*   **Dropbox SDK** (Penyimpanan Cloud gratis & stabil)
*   **Tailwind CSS** (Styling)

---

## 🤝 Berkontribusi

Proyek ini terbuka untuk umum (*Open Source*). Kami sangat menghargai kontribusi Anda!
1.  Fork repositori ini.
2.  Buat branch fitur baru (`git checkout -b fitur-keren`).
3.  Commit perubahan Anda.
4.  Push ke branch tersebut.
5.  Buat Pull Request.

---

## 📜 Lisensi

Didistribusikan di bawah Lisensi **GNU General Public License v3.0**.
Anda bebas menggunakan, memodifikasi, dan mendistribusikan aplikasi ini, bahkan untuk tujuan komersial, selama menyertakan kode sumber asli dan lisensi yang sama.

---

**Dikembangkan oleh [AI Projek](https://aiprojek01.my.id)**
*Kolaborasi Manusia & Kecerdasan Buatan*

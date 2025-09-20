# Panduan Instalasi & Penggunaan Offline Artea POS di Android

Dokumen ini menjelaskan cara "menginstal" dan menjalankan aplikasi Artea POS di perangkat Android secara sepenuhnya offline, mirip dengan skema penggunaan di desktop Linux.

Ada dua metode utama untuk mencapai ini:

1.  **Cara Terbaik & Paling Praktis (Direkomendasikan):** Menggunakan server HTTP sederhana untuk instalasi PWA lokal.
2.  **Cara Teknis (Untuk Developer):** Mem-build dan menjalankan server langsung dari Termux.

---

### Skema 1: Instalasi PWA Offline (Cara Paling Praktis)

Metode ini adalah yang paling direkomendasikan untuk semua pengguna. Prosesnya adalah: **Build di Komputer, Transfer ke Android, lalu Instal Secara Lokal.** Hasilnya adalah ikon aplikasi di _home screen_ yang sepenuhnya mandiri dan bekerja offline.

**Langkah-langkah:**

1.  **Build Aplikasi di Komputer Anda (Linux/Windows/Mac):**
    *   Buka terminal di direktori proyek (`arteapos-jsx`) dan jalankan:
        ```bash
        npm run build
        ```
    *   Perintah ini akan membuat folder baru bernama `dist`. Folder ini berisi semua file aplikasi yang sudah jadi.

2.  **Transfer Folder `dist` ke Ponsel Android:**
    *   Hubungkan ponsel Anda ke komputer menggunakan kabel USB.
    *   Salin **seluruh isi folder `dist`** ke sebuah folder baru di penyimpanan internal ponsel Anda (contoh: buat folder bernama `arteapos_local`).

3.  **Jalankan Server HTTP Sederhana di Android (Tanpa Termux):**
    *   Anda perlu "menyajikan" file-file tersebut agar browser bisa mengaksesnya. Cara termudah adalah menggunakan aplikasi server HTTP gratis dari Play Store.
    *   Cari dan instal aplikasi seperti **"HTTP Server"** (oleh `abhishekh`) atau **"Simple HTTP Server"**.
    *   Buka aplikasi server tersebut, arahkan ke folder tempat Anda menyimpan file tadi (`arteapos_local`), dan **mulai server**.
    *   Aplikasi akan memberi Anda alamat URL lokal, biasanya seperti `http://192.168.1.5:8080` atau `http://localhost:8080`.

4.  **Instal PWA dari Server Lokal:**
    *   Buka Google Chrome di ponsel Anda.
    *   Ketikkan alamat URL yang Anda dapatkan dari aplikasi server. Halaman Artea POS akan terbuka.
    *   Ketuk menu tiga titik (⋮) di pojok kanan atas browser dan pilih **"Instal aplikasi"** atau **"Tambahkan ke Layar Utama"**.

**Hasil Akhir:**
*   Anda akan mendapatkan ikon "Artea POS" di _home screen_.
*   Setelah instalasi selesai, Anda bisa **mematikan aplikasi server HTTP** dan bahkan menghapus folder `arteapos_local`. Aplikasi yang sudah terinstal kini sepenuhnya mandiri dan bekerja 100% offline.

---

### Skema 2: Build & Jalankan Langsung di Termux (Cara Teknis)

Metode ini juga valid tetapi lebih ditujukan untuk para developer yang ingin melakukan seluruh proses langsung di perangkat Android.

**Langkah-langkah:**

1.  **Instal Termux, `git`, dan `nodejs`:**
    *   Instal Termux (disarankan dari F-Droid atau GitHub).
    *   Jalankan perintah berikut di Termux:
        ```bash
        pkg update && pkg upgrade
        pkg install git nodejs
        ```

2.  **Clone Repositori dan Build Aplikasi:**
    ```bash
    git clone https://github.com/aiprojek/arteapos.git
    cd arteapos/arteapos-jsx
    npm install
    npm run build
    ```

3.  **Jalankan Server Preview dari Folder `dist`:**
    *   Gunakan perintah `vite preview` yang sudah disediakan:
        ```bash
        npm run preview
        ```
    *   Termux akan menampilkan URL lokal (misalnya `http://localhost:4173`).

4.  **Instal PWA:**
    *   Buka browser di Android, akses URL `localhost` tersebut.
    *   Gunakan fitur **"Instal aplikasi"** dari menu browser.

---

### Perbandingan Metode

| Kriteria | ✨ Skema 1 (Transfer & Server Sederhana) | ⚙️ Skema 2 (Termux) |
| :--- | :--- | :--- |
| **Kerumitan** | Mudah, hanya transfer file & 1 klik. | Rumit, membutuhkan banyak perintah di terminal. |
| **Kebutuhan** | Aplikasi server HTTP (ringan, dipakai sekali). | Termux, `git`, `nodejs` (berat, selalu terinstal). |
| **Proses** | Build di PC yang cepat, lalu transfer. | Semua proses (download, build, serve) di ponsel. |
| **Rekomendasi** | **Sangat direkomendasikan untuk semua pengguna.** | Hanya untuk developer atau yang familier dengan terminal. |

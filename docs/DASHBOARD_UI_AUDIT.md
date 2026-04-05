# Dashboard UI Audit

# Dashboard UI Audit

## Ringkasan

Dashboard saat ini sudah kuat dari sisi **isi data**, tetapi belum sekuat itu dari sisi **hirarki informasi**, **responsivitas**, dan **konsistensi UX**.

Secara umum:

- Desktop lebar: cukup baik, tetapi masih terasa padat dan "admin-heavy"
- Tablet: masih aman, namun banyak blok mulai saling berebut perhatian
- Mobile / layar pendek: lemah, karena kontrol atas, kartu statistik, chart, dan panel AI sama-sama besar

Skor singkat:

- Kepadatan informasi: `6/10`
- Hirarki visual: `5.5/10`
- Responsivitas layar kecil: `5/10`
- Kejelasan aksi utama: `5.5/10`
- Konsistensi dengan area POS yang sudah dipoles: `5/10`

## Temuan Utama

### 1. Header dashboard masih terlalu "alat", belum cukup hirarkis

Di [DashboardView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/DashboardView.tsx#L402), area atas menggabungkan:

- judul
- mode cloud/local
- toggle sumber data
- overflow menu
- filter cabang
- info banner

Masalahnya bukan banyaknya kontrol, tetapi semua elemen ini terasa berada pada level visual yang mirip. Akibatnya, user tidak langsung tahu mana konteks halaman, mana filter, dan mana aksi.

### 2. Kartu statistik masih terlalu "seragam penting"

Blok statistik di [DashboardView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/DashboardView.tsx#L487) menampilkan:

- penjualan hari ini
- net profit
- transaksi
- stok menipis

Semua kartu memiliki bobot visual yang hampir sama. Ini membuat fokus user tidak diarahkan dengan tegas. Dalam praktik, biasanya ada satu kartu primer, satu kartu pendukung, dan sisanya sekunder.

### 3. Chart area masih desktop-oriented

Bagian chart utama di [DashboardView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/DashboardView.tsx#L513) cukup informatif, tetapi:

- chart cabang dan tren penjualan sama-sama besar
- `Brush` pada chart penjualan menambah kompleksitas, terutama di layar kecil
- tooltip dan label sumbu berisiko padat di viewport sempit

Untuk dashboard yang juga dipakai di perangkat lebih kecil, ini terasa terlalu "analitik desktop", bukan "ringkasan operasional cepat".

### 4. Panel AI terlalu dominan untuk posisi saat ini

Panel AI di [DashboardView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/DashboardView.tsx#L550) besar dan visualnya cukup mencolok. Secara produk ini menarik, tetapi secara UX:

- ia bersaing dengan chart utama
- pertanyaan cepat, input manual, hasil AI, dan error state berkumpul dalam satu blok besar
- di mobile, area ini bisa memakan tinggi layar terlalu besar

Saat ini panel AI terasa seperti fitur showcase, bukan fitur yang sudah ditempatkan pada prioritas visual yang pas.

### 5. Right column terlalu "akhir"

Kolom kanan di [DashboardView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/DashboardView.tsx#L586) berisi:

- produk terlaris
- transaksi terakhir

Isinya penting, tetapi desainnya terlalu netral dibanding chart dan kartu atas. Akibatnya, area ini terbaca seperti sisa layout, bukan insight cepat yang layak dilihat segera.

### 6. Mode cloud/local masih kurang elegan

Toggle sumber data dan banner mode cloud di [DashboardView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/DashboardView.tsx#L424) dan [DashboardView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/DashboardView.tsx#L457) sudah fungsional, tetapi:

- style-nya masih terasa utilitarian
- mode demo/cloud/local belum cukup dibedakan sebagai "konteks halaman"
- filter cabang terasa seperti kontrol tambahan yang ditempel, bukan bagian dari shell analitik

## Risiko UX Saat Ini

### Mobile

- terlalu banyak blok tinggi yang ditumpuk
- chart cepat mendorong list penting ke bawah
- AI panel memperpanjang halaman secara signifikan
- source toggle dan branch selector makan ruang atas cukup besar

### Desktop rendah / laptop kecil

- bagian atas dashboard cepat menghabiskan tinggi viewport
- user harus scroll sebelum masuk ke kombinasi chart + daftar
- summary cepat tidak terasa "langsung terlihat"

## Rekomendasi Desain

### 1. Pecah dashboard menjadi 3 lapis yang jelas

Susunan yang lebih sehat:

1. Context bar

   - judul
   - sumber data
   - filter cabang
   - refresh / merge

2. Executive summary

   - 1 kartu utama
   - 2 kartu pendukung
   - 1 kartu alert

3. Insight blocks
   - chart utama
   - daftar transaksi
   - produk terlaris
   - AI assistant

### 2. Jadikan satu kartu statistik sebagai "hero"

Saran:

- `Penjualan Hari Ini` atau `Net Profit Hari Ini` dijadikan kartu hero
- dua metrik lain jadi kartu pendukung yang lebih kecil
- `Stok Menipis` diperlakukan sebagai alert card, bukan stat biasa

### 3. Mobile-first untuk area analitik

Untuk layar kecil:

- source toggle harus lebih ringkas
- branch filter menyatu ke context bar
- chart cabang bisa disembunyikan di balik toggle atau accordion
- AI panel dipindah ke bawah dan dipadatkan

### 4. Ubah AI panel jadi modul sekunder

Saran:

- tampilkan hanya prompt cepat + satu tombol expand
- input manual dan hasil analisis bisa dibuka dalam panel tersendiri
- jangan jadikan AI setara visualnya dengan chart utama

### 5. Tingkatkan nilai visual right column

`Produk Terlaris` dan `Transaksi Terakhir` perlu:

- item row yang lebih kuat
- badge/status yang lebih rapi
- spacing yang lebih mirip panel operasional, bukan sekadar list biasa

## Prioritas Eksekusi

### Tahap 1

- rapikan context bar dashboard
- padatkan source toggle, branch filter, dan status mode
- tentukan hero card

### Tahap 2

- redesign kartu statistik
- rapikan right column
- sederhanakan chart di viewport kecil

### Tahap 3

- refactor AI panel agar lebih ringan
- buat layout dashboard yang lebih adaptif antara desktop dan mobile

## Saran Implementasi Pertama

Kalau mulai sekarang, langkah pertama paling aman dan berdampak adalah:

1. redesign bagian atas dashboard
2. ubah grid statistik jadi hero + supporting cards
3. rapikan panel `Produk Terlaris` dan `Transaksi Terakhir`

Itu akan memberi perubahan visual besar tanpa perlu menyentuh logika data.

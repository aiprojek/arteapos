# Cloud Foundation Audit

## Ringkasan

Fondasi cloud aplikasi saat ini **berfungsi** dan sudah cukup matang untuk kebutuhan operasional UMKM:

- master data dapat push/pull
- data cabang dapat diunggah otomatis
- stok transfer tersedia
- laporan gabungan bisa dibaca dari Dropbox
- pairing dan ticket reset sudah ada

Namun dari sudut pandang arsitektur, fondasi cloud masih bersifat **client-driven, Dropbox-centric, dan duplicated across views**. Ini membuat sistem cepat bergerak, tetapi mulai menunjukkan batas skalabilitas, konsistensi, dan keamanan operasional.

## Penilaian Singkat

- Kelayakan operasional saat ini: `8/10`
- Kejelasan arsitektur: `6.5/10`
- Skalabilitas data cloud: `5.5/10`
- Ketahanan sinkronisasi: `6.5/10`
- Keamanan model cloud saat ini: `5.5/10`

## Kekuatan Saat Ini

### 1. Jalur cloud inti sudah lengkap

Di `services/dropboxService.ts` saat ini tersedia:

- kredensial & auth URL
- refresh token exchange
- upload backup
- upload data cabang
- fetch agregat semua cabang
- push/pull master data
- clear historical backups
- transfer stok
- tiket reset PIN
- backup recovery code

Artinya fondasi ini bukan proof-of-concept lagi. Ia sudah menjadi sistem kerja nyata.

### 2. Cloud sync provider sudah terpisah

`context/CloudSyncContext.tsx` sudah memisahkan:

- auto sync operasional
- master push
- background pull

Ini bagus karena alur sinkronisasi tidak tersebar total ke view.

### 3. Event-driven trigger sudah mulai dipakai

Banyak context memicu sinkronisasi melalui `requestAutoSync(...)` di `services/appEvents.ts`, bukan saling memanggil langsung. Ini arah yang sehat.

## Temuan Arsitektur

### 1. Cloud read model masih diduplikasi di banyak view

Saat ini `DashboardView`, `ReportsView`, `FinanceView`, dan `AuditTab` memuat logika cloud mereka sendiri:

- state `dataSource`
- state `cloudData`
- fungsi `loadCloudData` / `loadDropboxData`
- adaptasi local vs dropbox

Dampaknya:

- perilaku cloud tidak sepenuhnya seragam antar halaman
- error handling, loading, dan transform data mudah drift
- setiap halaman membawa biaya perawatan sendiri

Ini adalah temuan paling penting.

### 2. `fetchAllBranchData()` bersifat berat dan semakin mahal saat data tumbuh

`services/dropboxService.ts` saat ini:

- melist folder `Cabang_Data` secara recursive
- mengunduh semua file JSON cabang
- parse semua file
- baru kemudian agregasi dan deduplikasi

Ini workable untuk skala kecil, tapi akan mahal jika:

- cabang bertambah
- frekuensi sync meningkat
- folder historis makin besar

Masalah ini sudah sedikit ditutup dengan siklus arsip manual, tetapi secara fondasi tetap belum efisien.

### 3. Status sinkronisasi global masih terlalu tunggal

`CloudSyncContext` hanya punya satu:

- `syncStatus`
- `syncErrorMessage`

Padahal ada beberapa jenis operasi:

- auto sync cabang
- master push
- auto pull

Akibatnya:

- UI header hanya melihat satu status campuran
- sulit tahu error datang dari operasi mana
- concurrency antar operasi berpotensi membingungkan

### 4. Auto-sync masih best-effort, belum durable queue

Banyak context memanggil `requestAutoSync` lewat `setTimeout(...)`. Ini praktis, tapi sifatnya:

- fire-and-forget
- tidak punya retry queue persisten
- tidak ada replay durable jika koneksi gagal

Untuk UMKM ini masih cukup sering "oke", tetapi arsitekturnya belum menjamin delivery dengan kuat.

### 5. Model keamanan Dropbox punya batas alami

Kredensial Dropbox disimpan di sisi klien via local storage terenkripsi (`encryptStorage/decryptStorage`).

Secara praktik ini cukup untuk obfuscation, tetapi tidak bisa dianggap secret storage yang kuat, karena:

- secret tetap hidup di perangkat klien
- admin device yang terhubung pada dasarnya memegang akses penuh App Folder

Ini bukan bug implementasi semata, melainkan konsekuensi dari model sinkronisasi client-side.

### 6. Cloud domain boundaries belum sepenuhnya tegas

Master data dan operational data dipisah, tetapi batasnya masih longgar:

- branch payload ikut membawa `customers`
- dashboard/finance/report punya interpretasi cloud mereka sendiri
- purchase sync bahkan masih punya catatan `would go here if added`

Artinya domain cloud belum sepenuhnya finish sebagai kontrak data yang stabil.

## Risiko Praktis

### Risiko tinggi

1. Refresh cloud makin lambat saat file histori cabang bertambah besar.
2. Perbedaan perilaku cloud antar halaman karena logic loader terduplikasi.

### Risiko menengah

1. Sync status di header tidak cukup kaya untuk menjelaskan jenis kegagalan.
2. Sinkronisasi operasional belum punya queue persisten jika upload gagal.

### Risiko desain

1. Dropbox refresh token di klien tetap jadi kompromi keamanan.
2. App Folder Dropbox masih jadi single backend untuk terlalu banyak concern.

## Rekomendasi

### Langkah paling bernilai berikutnya

1. Buat satu lapisan `cloudReadModel` / `cloudDataFacade`

   - sumber tunggal untuk dashboard/reports/finance/audit
   - satukan transform dan error handling

2. Pecah status sinkronisasi menjadi operasi yang lebih eksplisit

   - `branchSync`
   - `masterSync`
   - `cloudPull`

3. Kurangi ketergantungan pada full folder scan
   - pertimbangkan index/manifest file di cloud
   - atau ringkasan per cabang yang lebih terstruktur

### Langkah kedua

1. Evaluasi queue sinkronisasi lokal yang lebih durable
2. Pisahkan kontrak payload:
   - master payload
   - branch payload
   - report summary payload

### Jika ingin naik kelas lebih jauh

1. Pertimbangkan backend perantara untuk operasi sensitif
2. Atau migrasi bertahap dari model "Dropbox sebagai backend serbaguna"

## Kesimpulan

Fondasi cloud saat ini **cukup kuat untuk operasional nyata**, tetapi mulai mencapai titik di mana pertumbuhan fitur membuat biaya arsitekturnya terasa.

Kesimpulan praktis:

- untuk sekarang: masih layak dan bisa diandalkan
- untuk jangka menengah: perlu konsolidasi read model cloud
- untuk jangka panjang: perlu keputusan arsitektural apakah Dropbox tetap menjadi backend utama, atau hanya transport/storage layer sementara

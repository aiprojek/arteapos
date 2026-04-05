# Release Notes

## Artea POS - Pembaruan Besar Arsitektur, Offline, dan UI

Rilis ini adalah salah satu pembaruan terbesar Artea POS sejauh ini. Fokusnya bukan hanya menambah fitur, tetapi merapikan fondasi aplikasi agar lebih stabil, lebih konsisten, dan lebih siap dipakai di operasional nyata.

### Sorotan Utama

#### 1. Fondasi offline jauh lebih kuat

- bootstrap aplikasi utama sudah dipindahkan dari dependency online ke aset lokal hasil build
- service worker dan cache offline diperkuat
- OCR kini memakai aset lokal
- status offline dan tombol repair cache kini lebih jujur dan lebih mudah dipahami user

Hasilnya: aplikasi jauh lebih siap dibuka dan dipakai tanpa internet untuk operasional inti.

#### 2. Refactor besar area kasir

- area POS dipecah ke struktur yang lebih modular
- banyak modal POS dipindahkan ke file terpisah
- `POSView` jadi lebih fokus sebagai shell
- beberapa sumber rerender berlebih di `usePOSLogic` dibersihkan
- session toolbar, cart, payment, member flow, dan dual screen dirapikan

Hasilnya: area kasir lebih sehat untuk dikembangkan dan lebih nyaman dipakai.

#### 3. Responsive dan mobile UX ditingkatkan besar-besaran

- fondasi modal sekarang mendukung `dialog`, `sheet`, dan `fullscreen`
- banyak modal penting kini fullscreen di mobile
- cart, product browser, payment, member flow, dan layar tambahan diperbaiki untuk viewport kecil
- desktop resolusi rendah juga ikut dipoles agar tidak terasa sesak

Hasilnya: pengalaman penggunaan lebih konsisten di HP, tablet, dan laptop.

#### 4. Dashboard baru yang lebih rapi dan lebih berguna

- struktur dashboard dirombak
- hero card, kartu ringkasan, chart, transaksi terakhir, dan insight lokal jadi lebih jelas
- mode cloud, filter cabang, dan kontrol dashboard dirapikan
- ringkasan bisnis lokal sekarang lebih jujur dan lebih stabil

#### 5. Halaman manajemen kini satu bahasa visual

Halaman-halaman ini mendapat perapihan besar:

- Produk
- Bahan Baku
- Keuangan
- Laporan
- Pengaturan
- Bantuan / Tentang

Perbaikannya meliputi:

- toolbar lebih rapi
- search bar lebih konsisten
- mobile card list di area yang sebelumnya terlalu desktop-oriented
- tombol dan modal lebih selaras

#### 6. Cloud read flow mulai dikonsolidasikan

- dashboard, finance, reports, dan audit kini mulai memakai jalur cloud yang lebih seragam
- mode `live/demo`, `lastUpdated`, dan branch filtering lebih konsisten
- duplikasi agregasi data cloud dikurangi

### Perbaikan Tambahan

- style tombol kini lebih sistematis: `utility`, `operational`, `primary`, `danger`
- dokumentasi bantuan disesuaikan dengan UI terbaru
- istilah offline/cloud diperjelas agar lebih ramah untuk user awam
- Android build workflow diperbaiki untuk mengurangi gagal build karena cache/Gradle

### Catatan

Rilis ini banyak menyentuh struktur internal dan presentasi UI. Jika Anda sudah memakai Artea POS sebelumnya, Anda akan melihat:

- tampilan lebih rapi
- alur kasir lebih konsisten
- halaman manajemen lebih enak dipakai
- dan narasi offline/cloud yang lebih jelas

### Verifikasi Internal

- `npm run typecheck` lolos
- `npm test` lolos `8/8`

Terima kasih sudah ikut memakai, menguji, dan membantu mematangkan Artea POS.

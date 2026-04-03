# Responsive UI Audit

## Purpose

Dokumen ini merangkum audit responsivitas dan kualitas UX `arteapos`, dengan fokus utama pada pengalaman layar kecil.

Tujuannya bukan sekadar menilai apakah layout "muat", tetapi apakah alur kasir benar-benar nyaman, cepat, dan jelas dipakai di perangkat kecil.

## Executive Summary

Secara teknis, banyak layar di aplikasi ini sudah responsif:

- overflow horizontal sudah cukup dikendalikan
- banyak area sudah memakai `min-w-0`
- tab, chip, dan panel besar umumnya tidak langsung pecah

Namun dari sisi UX, pengalaman mobile masih terasa seperti versi desktop yang dipadatkan.

Kesimpulan singkat:

- desktop/tablet: `7/10`
- mobile kecil: `5/10`

Masalah utamanya bukan bug CSS besar, tetapi pola interaksi:

- terlalu banyak kontrol tampil bersamaan
- modal masih desktop-first
- header terlalu ramai
- POS mobile masih memakai pola dua-panel desktop yang disembunyikan dengan tab switcher

## Scope Reviewed

Audit ini terutama meninjau:

- [App.tsx](/home/abdullah-home/Documents/GitHub/arteapos/App.tsx)
- [Header.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/Header.tsx)
- [POSView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/POSView.tsx)
- [ProductBrowser.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/ProductBrowser.tsx)
- [CartSidebar.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/CartSidebar.tsx)
- [PaymentModal.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/modals/PaymentModal.tsx)
- [Modal.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/Modal.tsx)
- [SettingsView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/SettingsView.tsx)

## Scorecard

### 1. App Shell

Score: `6.5/10`

Yang sudah baik:

- drawer sidebar mobile sudah ada
- layout shell cukup konsisten
- pembagian sidebar vs content cukup jelas

Masalah utama:

- shell mobile masih terasa seperti adaptasi desktop
- header dan konten utama saling berebut ruang vertikal
- navigasi view masih terasa administratif, belum terasa ringan untuk HP

### 2. Header

Score: `5.5/10`

Yang sudah baik:

- status penting tersedia
- ada hirarki informasi untuk sync dan warning

Masalah utama:

- terlalu banyak elemen kecil sekaligus
- ikon, badge, status, dan action bersaing di ruang yang sempit
- secara visual terasa padat dan "sibuk"

### 3. POS Flow

Score: `5/10`

Yang sudah baik:

- ada mobile tab switcher
- alur produk dan keranjang tetap bisa diakses
- fitur POS sangat lengkap

Masalah utama:

- model dua-panel desktop masih menjadi dasar
- user harus sering pindah antara produk dan keranjang
- konteks transaksi terasa terputus saat berganti tab di layar kecil

### 4. Product Browsing

Score: `6/10`

Yang sudah baik:

- kategori scrollable
- pencarian mudah terlihat
- mode grid/list tersedia

Masalah utama:

- action strip di atas cukup padat
- product card dua kolom di HP kecil terasa sempit
- target sentuh dan scanability visual masih bisa dibuat lebih lega

### 5. Cart UX

Score: `4.5/10`

Yang sudah baik:

- fitur lengkap
- status member, order type, held cart, dan pembayaran semua tersedia

Masalah utama:

- terlalu banyak fitur hadir bersamaan
- banyak kontrol dikompres menjadi pill/bar kecil
- terasa seperti panel power-user, bukan alur kasir cepat

### 6. Modal System

Score: `5/10`

Yang sudah baik:

- konsisten secara struktur
- mudah dipakai ulang

Masalah utama:

- basis modal masih desktop-first
- belum ada mobile bottom sheet atau full-screen modal pattern
- modal penting seperti pembayaran belum terasa natural di HP

### 7. Settings Mobile

Score: `5.5/10`

Yang sudah baik:

- tab sudah scrollable
- konten per section cukup jelas

Masalah utama:

- tab horizontal panjang kurang discoverable
- terasa seperti ribbon desktop yang dikecilkan
- user baru mudah tidak sadar ada tab lain di sisi kanan

## Main Findings

### 1. Mobile layout masih "desktop compressed"

Masalah terbesar bukan overflow, tetapi pola mental model.

Di banyak area, aplikasi masih berangkat dari struktur desktop:

- panel kiri/kanan
- toolbar padat
- banyak aksi dalam satu layer

Lalu di mobile, strategi utamanya adalah:

- sembunyikan sebagian panel
- jadikan tab
- kecilkan tombol

Ini membuat layout tetap muat, tetapi belum benar-benar nyaman.

### 2. Hierarki visual di layar kecil masih lemah

Beberapa layar menampilkan terlalu banyak elemen dengan bobot visual yang mirip:

- banyak chip kecil
- banyak badge kecil
- banyak ikon kecil
- banyak panel gelap dengan style serupa

Akibatnya, fokus utama user menjadi kurang jelas.

### 3. UX kasir mobile belum cukup "flow-oriented"

Untuk layar kecil, user seharusnya dibantu lewat alur:

1. pilih produk
2. cek keranjang
3. pilih pelanggan/diskon
4. bayar

Saat ini, banyak kontrol sekunder tetap tampil sejak awal:

- held carts
- type order
- table/pax
- second screen
- member tools
- berbagai action inventory

Ini kuat untuk power-user, tetapi melelahkan untuk penggunaan kasir cepat di HP.

### 4. Fondasi modal adalah bottleneck UX mobile

Karena [Modal.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/Modal.tsx) menjadi basis banyak alur penting, keputusan desain di sana berpengaruh luas.

Selama modal tetap berupa:

- dialog tengah layar
- `max-w-md`
- `max-h-[90vh]`

maka pengalaman mobile akan terus terasa seperti "desktop popup di HP".

## Screen-by-Screen Notes

### App Shell

Di [App.tsx](/home/abdullah-home/Documents/GitHub/arteapos/App.tsx), shell utama sudah aman secara teknis, tetapi belum cukup ringan di mobile.

Masalah yang terasa:

- header mengambil ruang cukup banyak
- sidebar mobile masih bergaya admin/navigation app, bukan app kasir cepat
- jarak visual antara shell dan content belum cukup membantu fokus

### Header

Di [Header.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/Header.tsx), status dan tools penting berkumpul di satu area.

Masalah yang paling terasa di layar kecil:

- user harus memproses banyak indikator sekaligus
- sinkronisasi, memori, branch, dan action user terasa setara bobotnya
- belum ada mode mobile yang lebih minimal

### POS View

Di [POSView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/POSView.tsx), struktur utamanya masih sangat kuat berakar pada desktop layout.

Masalah UX mobile:

- user berpindah konteks saat ganti dari produk ke keranjang
- keranjang belum terasa seperti panel transaksi yang selalu dekat
- session toolbar juga masih bergaya horizontal toolbar desktop

### Product Browser

Di [ProductBrowser.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/ProductBrowser.tsx), fungsi lengkap tetapi bagian atas layar terlalu cepat penuh.

Masalah yang terlihat:

- search + inventory action + scanner + channel sales + category chips + view mode
- semua muncul hampir sekaligus
- di mobile kecil, ini mengurangi ruang fokus pada daftar produk

### Cart Sidebar

Di [CartSidebar.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/CartSidebar.tsx), kekuatan fitur justru menjadi sumber kepadatan UI.

Masalah yang terasa:

- order type bar terlalu rapat
- table/pax input sangat kecil
- area member terlalu kompres
- terlalu banyak control state di bagian atas sebelum user melihat isi keranjang

### Payment Modal

Di [PaymentModal.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/modals/PaymentModal.tsx), logika cukup rapi tetapi wadah tampilannya masih terlalu dialog-like.

Masalah yang mungkin terasa:

- payment method selector padat
- split/member balance area bisa cepat menjadi tinggi dan ramai
- full mobile checkout seharusnya terasa seperti halaman penting, bukan sekadar pop-up

### Settings View

Di [SettingsView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/SettingsView.tsx), struktur saat ini masih cukup desktop-oriented.

Masalah yang paling terasa:

- tab horizontal panjang kurang jelas untuk user baru
- sticky tab strip lumayan memakan ruang vertikal
- section besar di bawahnya terasa seperti form admin desktop

## Recommended Design Direction

### Direction 1: Mobile-first POS

Ubah pengalaman POS mobile dari "dua panel yang disembunyikan" menjadi:

- layar produk sebagai canvas utama
- keranjang sebagai bottom sheet atau slide-up cart
- checkout sebagai full-screen flow

### Direction 2: Progressive Disclosure

Jangan tampilkan semua kontrol sekaligus di layar kecil.

Prioritas mobile:

- aksi utama tampil langsung
- aksi sekunder masuk ke menu lanjutan, drawer, atau expandable section

### Direction 3: Stronger Hierarchy

Perjelas urutan perhatian user:

- apa yang harus dilihat dulu
- apa yang harus ditekan dulu
- apa yang opsional

Caranya:

- lebih banyak ruang putih
- kurangi chip kecil yang setara bobotnya
- naikkan ukuran action primer
- sederhanakan area header

### Direction 4: Modal Foundation Upgrade

Naikkan kualitas `Modal` agar punya mode:

- desktop dialog
- mobile bottom sheet
- mobile full-screen

Ini akan memberi dampak besar dengan perubahan fondasi yang relatif terpusat.

## Suggested Redesign Roadmap

### Phase 1: Low-risk UX Cleanup

Target:

- sederhanakan copy
- perbesar target sentuh utama
- rapikan spacing mobile
- kurangi noise visual di header dan cart top section

Area:

- [Header.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/Header.tsx)
- [CartSidebar.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/CartSidebar.tsx)
- [ProductBrowser.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/ProductBrowser.tsx)

### Phase 2: Modal Foundation

Target:

- upgrade [Modal.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/Modal.tsx)
- buat varian mobile sheet/full-screen
- terapkan dulu ke alur yang paling penting

Area prioritas:

- [PaymentModal.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/modals/PaymentModal.tsx)
- modal start session
- customer form modal

### Phase 3: POS Mobile Recomposition

Target:

- ubah POS mobile jadi flow-oriented
- cart jadi bottom sheet
- session toolbar dan aksi sekunder dipindah ke panel lanjutan

Area:

- [POSView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/POSView.tsx)
- [CartSidebar.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/CartSidebar.tsx)
- [ProductBrowser.tsx](/home/abdullah-home/Documents/GitHub/arteapos/components/pos/ProductBrowser.tsx)

### Phase 4: Settings Mobile Navigation

Target:

- ganti tab strip horizontal dengan pola mobile yang lebih jelas
- bisa berupa segmented nav sederhana atau list section selector

Area:

- [SettingsView.tsx](/home/abdullah-home/Documents/GitHub/arteapos/views/SettingsView.tsx)

## Suggested PR Order

1. Modal foundation upgrade
2. Payment modal mobile polish
3. Cart header/top controls simplification
4. Product browser mobile cleanup
5. POS mobile shell redesign
6. Settings mobile navigation redesign

## Good Success Criteria

Desain mobile dianggap membaik jika:

- kasir bisa memilih produk dan masuk ke pembayaran dengan lebih sedikit perpindahan konteks
- modal penting terasa natural di HP
- header tidak lagi terasa ramai
- kontrol sekunder tidak mengganggu flow utama
- settings mobile lebih mudah dipahami user baru

## Final Recommendation

Jangan mulai dari redesign total seluruh aplikasi.

Langkah terbaik adalah:

1. perbaiki fondasi modal
2. rapikan flow POS mobile
3. sederhanakan cart dan header
4. baru lanjut ke layar admin seperti settings

Dengan urutan itu, dampak UX terbesar bisa didapat tanpa memicu rewrite UI besar-besaran sekaligus.

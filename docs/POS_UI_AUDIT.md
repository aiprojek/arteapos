# POS UI Audit

## Ringkasan

Halaman kasir sudah jauh lebih selaras dengan halaman lain dibanding titik awal refactor:
- tombol utama sudah mengikuti keluarga `utility / operational / primary / danger`
- modal-modal penting sudah punya fondasi mobile yang lebih konsisten
- browser produk, keranjang, pembayaran, member flow, dan dual screen sudah terasa satu sistem

Namun, POS tetap belum sepenuhnya "setenang" halaman manajemen seperti `Products`, `Finance`, atau `Settings`. Ini bukan sepenuhnya masalah, karena POS memang workspace operasional yang lebih padat dan cepat. Meski begitu, masih ada beberapa area yang membuatnya terasa berasal dari generasi visual yang sedikit berbeda.

## Penilaian Singkat

- Konsistensi visual dengan halaman lain: `7.5/10`
- Kematangan mobile POS: `8/10`
- Ketenangan visual desktop: `7/10`
- Scannability operasional: `8/10`

## Yang Sudah Selaras

- `views/POSView.tsx`
  - shell komposisi sudah bersih: product browser, cart, modal flow
  - modal penting sudah fullscreen/sheet di mobile
- `components/pos/ProductBrowser.tsx`
  - tombol aksi utama sudah memakai ritme `operational`
  - search, kategori, dan grid/list sudah lebih rapi
- `components/pos/CartSidebar.tsx`
  - compact/ultra-compact mode cukup membantu di viewport pendek
  - aksi utama lebih jelas daripada versi awal
- `components/pos/modals/*`
  - banyak modal sudah selevel dengan fondasi modal baru

## Temuan

### 1. Toolbar sesi masih terasa generasi lama

Di `views/POSView.tsx`, `SessionToolbar` masih memakai `variant="secondary"` dengan `border-none bg-slate-700`, sementara area POS lain sudah lebih disiplin memakai bahasa tombol baru. Secara visual ini masih terasa sebagai toolbar lama yang "diselamatkan", bukan bagian alami dari sistem tombol sekarang.

### 2. ProductBrowser masih lebih padat daripada halaman manajemen lain

`components/pos/ProductBrowser.tsx` sudah membaik, tetapi bagian atasnya tetap memadukan:
- search
- 4 tombol aksi
- kategori
- toggle view

Dalam satu blok yang cukup rapat. Ini bisa diterima untuk POS, tetapi jika dibandingkan dengan `ProductsView` atau `ReportsView`, POS masih terasa lebih crowded.

### 3. CartSidebar masih sangat kaya kontrol

`components/pos/CartSidebar.tsx` memuat banyak concern sekaligus:
- held carts
- order type
- meja/pax
- member
- loyalti/diskon/split
- total
- quick pay

Secara fungsional kuat, tetapi secara visual ini masih jadi area paling padat di seluruh aplikasi. Compact mode sudah membantu, tetapi kompleksitas dasarnya tetap tinggi.

### 4. Ada campuran tone panel antar-subtree

Di POS kita sekarang punya campuran:
- panel sangat operasional
- panel yang lebih "manajemen"
- modal fullscreen modern
- beberapa toolbar kecil yang masih utility-heavy

Artinya, POS sudah konsisten di level komponen, tapi belum sepenuhnya konsisten di level suasana visual.

## Kesimpulan UI

POS **sudah cukup selaras** dengan halaman lain untuk dipakai dan diparkir sementara. Ia tidak lagi tampak seperti outlier besar.

Tetapi jika targetnya adalah "satu bahasa visual penuh" di seluruh aplikasi, POS masih menyisakan satu tahap polish lagi:
- merapikan `SessionToolbar`
- menenangkan `ProductBrowser` top controls
- terus mengurangi rasa padat di `CartSidebar`

## Rekomendasi Lanjutan

### Low-risk

1. Migrasikan `SessionToolbar` ke gaya tombol yang sama dengan shell POS lain.
2. Samakan ritme spacing/padding panel atas POS dengan `Products`/`Settings`.
3. Audit badge/status kecil di cart dan payment agar tone warnanya lebih disiplin.

### Medium-risk

1. Pecah `CartSidebar` jadi blok visual yang lebih jelas:
   - konteks pesanan
   - member
   - item list
   - pembayaran
2. Pertimbangkan bottom-tray cart model penuh untuk mobile pada iterasi berikutnya.


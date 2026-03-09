# Hardening Plan ArteaPOS (Tahap 1)

Dokumen ini menjadi baseline eksekusi perbaikan keamanan, reliabilitas, dan maintainability.

## Prioritas 1 (langsung)

- Aktifkan quality gate minimal:
  - `npm run typecheck`
  - `npm run check`
- Pindahkan secret enkripsi dari hardcoded default ke mekanisme override environment dengan fallback kompatibel.

## Prioritas 2 (minggu ini)

- Auth hardening:
  - [x] Paksa ganti PIN default pada login pertama.
  - [x] Hapus reset ke PIN statis (`0000`/`1111`).
  - [x] Ganti dengan alur `force-set` PIN baru berbasis token recovery sekali pakai.
  - [x] Simpan dan validasi tiket recovery via Dropbox (dengan masa berlaku dan status consumed).
  - [x] Tambahkan Recovery Code sekali pakai untuk skenario admin tunggal lupa PIN.
- Data persistence optimization:
  - [x] Ubah model `clear + bulkAdd` penuh menjadi granular upsert agar tetap cepat saat record besar.
- [x] Tambah script `lint` + konfigurasi ESLint TypeScript.

## Prioritas 3 (setelah stabil)

- Tambah automated tests untuk:
  - Alur `saveTransaction` dan mutasi stok.
  - Refund dan reversal stok.
  - Import/export CSV dan merge cloud.
- Pisahkan modul domain finansial dan inventory agar coupling antar context berkurang.

## Catatan Implementasi

- Setiap patch harus mempertahankan kompatibilitas data lama.
- Perubahan keamanan yang bisa memutus workflow cabang harus melalui feature flag.

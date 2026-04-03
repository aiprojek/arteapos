# Responsive UI Execution Plan

## Purpose

Dokumen ini menerjemahkan audit responsif menjadi langkah eksekusi yang kecil, aman, dan realistis.

Fokus awalnya bukan redesign total, tetapi perbaikan fondasi yang memberi dampak besar di layar kecil.

## Current Direction

Prioritas tahap pertama:

1. perbaiki fondasi modal
2. haluskan flow pembayaran mobile
3. sederhanakan kontrol teratas di area POS

## Phase 1: Modal Foundation

Status: `started`

Tujuan:

- membuat modal lebih cocok untuk layar kecil
- tanpa memaksa rewrite semua modal sekaligus

Strategi:

- pertahankan API modal lama
- tambahkan opsi layout baru:
  - `dialog`
  - `sheet`
  - `fullscreen`
- terapkan dulu ke flow berisiko rendah tetapi berdampak besar

Target awal:

- payment modal
- start session modal
- customer form modal
- end session modal

Success criteria:

- modal penting terasa lebih natural di HP
- tidak ada perubahan aturan bisnis
- desktop tetap stabil

## Phase 2: POS Mobile Top Section

Status: `pending`

Tujuan:

- mengurangi rasa "cockpit" di layar kecil

Area:

- `CartSidebar` top controls
- `ProductBrowser` action strip
- `SessionToolbar`

Fokus:

- tampilkan aksi primer lebih jelas
- pindahkan aksi sekunder ke panel lanjutan bila perlu
- perbesar target sentuh utama

## Phase 3: POS Mobile Recomposition

Status: `pending`

Tujuan:

- mengubah pengalaman POS mobile dari tab-switching dua panel menjadi flow yang lebih natural

Target:

- cart sebagai bottom sheet atau tray
- produk sebagai layar utama
- checkout sebagai full-screen flow

## Phase 4: Header and Settings Cleanup

Status: `pending`

Tujuan:

- mengurangi kepadatan visual pada mobile shell

Area:

- `Header`
- `SettingsView`

Target:

- header mobile lebih minimal
- settings mobile lebih mudah dinavigasi user baru

## Recommended Working Order

1. selesaikan modal foundation
2. evaluasi PaymentModal di HP kecil
3. rapikan top controls di cart/product browser
4. lanjut ke recomposition POS mobile
5. baru sentuh header/settings

## Verification

Untuk setiap langkah, minimal cek:

- `npm run typecheck`
- `npm test`
- uji manual di layar kecil untuk:
  - buka POS
  - tambah item
  - buka pembayaran
  - mulai sesi
  - tambah/edit pelanggan
  - tutup sesi

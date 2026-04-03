# PR Follow-up Plan

## Purpose

Dokumen ini merangkum status refactor arsitektur saat ini dan memecah langkah lanjutan menjadi PR-PR kecil yang aman, terukur, dan mudah direview.

## Current Baseline

Kondisi repo saat dokumen ini dibuat:

- `npm run typecheck` pass
- `npm test` pass
- layer `Auth`, `UI`, `Data`, dan `CustomerDisplay` sudah memakai slice hook
- business logic inti sudah banyak dipindah ke `services/`
- persistence sudah dipisah ke layer domain-oriented
- POS modal layer sudah dipisah ke `components/pos/modals/`
- render profiling sudah aktif untuk:
  - `AppContent`
  - `RootNavigator`
  - `DataProvider`
  - `Header`
  - `usePOSLogic`
  - `POSView`
  - `PaymentModal`

Dokumen terkait:

- [CONTEXT_CONSOLIDATION.md](./CONTEXT_CONSOLIDATION.md)
- [RENDER_PROFILING.md](./RENDER_PROFILING.md)
- [OFFLINE_VERIFICATION_CHECKLIST.md](./OFFLINE_VERIFICATION_CHECKLIST.md)
- [CHUNK_SPLITTING_PLAN.md](./CHUNK_SPLITTING_PLAN.md)
- [RESPONSIVE_UI_AUDIT.md](./RESPONSIVE_UI_AUDIT.md)
- [RESPONSIVE_UI_EXECUTION_PLAN.md](./RESPONSIVE_UI_EXECUTION_PLAN.md)
- [ARCHITECTURE_AUDIT.md](../ARCHITECTURE_AUDIT.md)

## Priority Shift

Setelah migrasi bootstrap offline dari CDN/importmap ke asset lokal, prioritas teknis berikutnya tidak lagi murni context/UI refactor.

Prioritas baru:

1. verifikasi offline nyata dari hasil build
2. kecilkan initial bundle tanpa merusak flow kasir inti
3. lanjutkan refactor UI hanya bila tidak mengganggu dua prioritas di atas

## Suggested PR Order

### PR 1: POS View Shell Cleanup

Tujuan:

- lanjut kecilkan `POSView`
- pisahkan blok presentational yang masih tersisa
- pertahankan `POSView` sebagai composition shell

Target:

- ekstrak modal/session-start block ke komponen kecil jika masih terasa padat
- ekstrak receipt/customer-action sections bila scanability masih rendah
- jaga agar logic tetap tinggal di `usePOSLogic`

Checklist:

- tidak ada perubahan perilaku checkout
- `npm run typecheck`
- `npm test`

### PR 2: Payment Flow UI Stabilization

Tujuan:

- rapikan jalur UI pembayaran yang sekarang paling aktif saat profiling

Target:

- pecah area `PaymentModal` menjadi sub-section kecil bila perlu:
  - payment method chooser
  - non-cash proof section
  - member balance / split section
- pertahankan API `PaymentModal`
- hindari perubahan aturan bisnis pembayaran

Checklist:

- cash, non-cash, member balance, split payment tetap bekerja
- `npm run typecheck`
- `npm test`

### PR 3: Render Profiling Pass

Tujuan:

- gunakan log profiler nyata untuk memilih optimasi, bukan menebak

Target:

- jalankan flow kasir nyata
- kumpulkan log `[render-profile] ...`
- tandai rerender yang:
  - tidak relevan dengan aksi user
  - terlalu sering
  - berubah di komponen besar untuk state kecil

Output PR:

- 1-2 optimasi konkret berbasis log
- update [RENDER_PROFILING.md](./RENDER_PROFILING.md) bila ada temuan penting

Checklist:

- sertakan contoh log sebelum/sesudah di deskripsi PR
- `npm run typecheck`
- `npm test`

### PR 4: Data Provider Performance Follow-up

Tujuan:

- evaluasi apakah `DataProvider` masih terlalu lebar untuk beberapa flow

Target:

- cek apakah ada consumer yang masih membaca slice terlalu besar
- pertimbangkan pemisahan helper atau memo boundary tambahan jika log menunjukkan fan-out
- jangan rewrite store

Checklist:

- fokus hanya pada optimasi yang terbukti dari profiling
- `npm run typecheck`
- `npm test`

## Good PR Shape

Agar review tetap ringan, usahakan tiap PR:

- fokus pada satu area
- maksimal 1 concern utama
- tidak mencampur refactor struktur dengan perubahan bisnis
- menyertakan langkah verifikasi manual singkat

Contoh format deskripsi PR:

```md
## Summary

- ...

## Why

- ...

## Scope

- ...

## Verification

- npm run typecheck
- npm test
- manual flow: ...
```

## Things To Avoid

- jangan campur refactor UI dengan perubahan rule transaksi
- jangan hapus profiler dulu, masih berguna untuk fase berikutnya
- jangan rewrite `usePOSLogic` tanpa bukti profiling yang cukup
- jangan ubah banyak provider sekaligus dalam satu PR

## Recommended Next PR

Kalau ingin ambil langkah paling aman dan cepat: mulai dari `PR 3` lalu lanjut ke `PR 2`.

Alasannya:

- kita sudah punya instrumentation
- hotspot utama sudah cukup jelas di area POS
- optimasi berikutnya akan lebih akurat kalau didorong oleh log nyata

# Chunk Splitting Plan

## Purpose

Build terbaru sudah sukses, tetapi `dist/index.js` masih besar. Dokumen ini memecah langkah optimasi bundle menjadi tahapan yang aman dan tidak mencampur dengan perubahan aturan bisnis.

## Current Snapshot

Contoh hasil build terakhir:

- `index.js` sekitar `2.9 MB`
- ada warning chunk besar setelah minify
- app tetap build sukses

Kontributor besar yang paling mungkin:

- `tesseract.js`
- `peerjs`
- `barcode scanner web stack`
- `report/export stack`
- `POS shell` yang memuat banyak area sekaligus

## Optimization Principle

Tujuan kita bukan membuat bundle sekecil mungkin dengan risiko besar.

Tujuan kita:

- kecilkan initial boot bundle
- pindahkan fitur berat ke lazy load
- pertahankan flow kasir inti tetap cepat dan stabil

## Recommended Order

### Step 1: Lazy Load Feature-Heavy Views

Kandidat:

- `ReportsView`
- `HelpView`
- `SettingsView` tab tertentu yang berat

Alasan:

- bukan bagian hot path boot kasir
- aman dipisah lebih awal

Expected impact:

- `index.js` turun tanpa mengganggu POS core

### Step 2: Lazy Load OCR Flow

Kandidat:

- service OCR
- komponen/modal yang memanggil OCR

Alasan:

- OCR bukan bagian boot utama
- dependency `tesseract.js` berat

Expected impact:

- initial chunk turun cukup besar

### Step 3: Lazy Load Barcode Web Scanner Runtime

Kandidat:

- `html5-qrcode`
- modal scanner web

Alasan:

- hanya dibutuhkan saat scanner dibuka

Expected impact:

- chunk POS inti lebih ringan

### Step 4: Separate Report / Export Stack

Kandidat:

- `jspdf`
- `jspdf-autotable`
- image/export helper
- report generation helper

Alasan:

- fitur export/PDF tidak wajib ikut boot awal

Expected impact:

- potong beban area reporting

### Step 5: Evaluate PeerJS Loading Strategy

Kandidat:

- `CustomerDisplayContext`
- `PeerJS`

Alasan:

- tidak semua user langsung memakai customer display / kitchen display
- mungkin bisa lazy-init saat fitur display dibuka

Expected impact:

- shell awal lebih ringan

## What Not To Do

- jangan lazy load `usePOSLogic` atau `CartContext` hot path tanpa alasan kuat
- jangan campur chunk splitting dengan refactor domain logic besar
- jangan optimasi hanya berdasarkan ukuran file; cek juga dampak ke UX

## Suggested PR Shape

Satu PR sebaiknya hanya mengambil satu langkah besar, misalnya:

- `PR: lazy-load OCR stack`
- `PR: lazy-load reports and export stack`
- `PR: defer PeerJS initialization`

Checklist tiap PR:

- `npm run typecheck`
- `npm test`
- `npm run build`
- bandingkan ukuran output sebelum/sesudah
- uji manual flow fitur terkait

## Suggested Measurement Format

Catat hasil seperti ini:

```md
## Before
- index.js: ...

## After
- index.js: ...

## Scope
- ...

## Manual verification
- ...
```

## Recommended First Chunk PR

Kalau mau dampak terbaik dengan risiko terendah, mulai dari:

1. lazy-load OCR stack
2. lazy-load reports/export stack

Alasannya:

- dua area itu berat
- tidak termasuk alur kasir paling dasar
- paling aman dipisah dari boot bundle

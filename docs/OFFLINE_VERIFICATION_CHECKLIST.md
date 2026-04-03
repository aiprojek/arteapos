# Offline Verification Checklist

## Purpose

Dokumen ini dipakai untuk memastikan `arteapos` benar-benar bisa berjalan offline dari hasil build terbaru, termasuk app shell, asset runtime, dan fitur OCR.

## Current Offline Baseline

Saat checklist ini dibuat:

- bootstrap utama tidak lagi memakai `esm.sh` atau CDN dari `index.html`
- service worker mem-cache asset lokal build dan membaca `asset-manifest.json`
- asset OCR lokal tersedia di `dist/vendor/`
- tombol di Settings untuk offline sekarang diposisikan sebagai `repair / re-register cache`, bukan lagi bootstrap downloader utama
- build menghasilkan:
  - `index.js`
  - `style.css`
  - `asset-manifest.json`
  - `vendor/tesseract/*`
  - `vendor/tesseract-core/*`
  - `vendor/tesseract-lang/eng/eng.traineddata.gz`

## Pre-check

Sebelum uji offline:

1. jalankan:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
2. pastikan folder `dist/` berisi:
   - `index.html`
   - `index.js`
   - `style.css`
   - `asset-manifest.json`
   - `sw.js`
   - `vendor/tesseract/worker.min.js`
   - `vendor/tesseract-core/...`
   - `vendor/tesseract-lang/eng/eng.traineddata.gz`

## Recommended Test Environments

Lakukan minimal satu dari dua:

1. browser desktop dari hasil `dist/`
2. build target aktual:
   - Electron
   - Android / Capacitor

## Offline Test Flow

### A. First Online Load

1. buka app dari hasil build
2. tunggu sampai aplikasi selesai load
3. buka DevTools:
   - `Application` / `Storage`
   - cek service worker aktif
   - cek cache storage terisi
4. buka beberapa flow penting:
   - login
   - POS
   - product list
   - laporan
   - settings

Expected:

- tidak ada request ke `esm.sh`
- tidak ada request ke `jsdelivr`, `cdnjs`, `unpkg`
- tidak ada request ke asset audio remote

### B. Hard Offline Reload

1. putuskan internet
2. reload aplikasi
3. pastikan app tetap bisa masuk ke shell utama

Expected:

- `index.html`, `index.js`, `style.css`, dan chunk dynamic tetap tersedia
- tidak blank screen
- ikon tetap tampil

### C. Cashier Core Flow

1. buka POS
2. tambah item
3. buka payment modal
4. selesaikan transaksi
5. buka dan tutup receipt

Expected:

- flow kasir inti tetap bekerja offline
- tidak ada error fetch asset runtime

### D. Barcode / Scanner Flow

1. buka scanner barcode web
2. pastikan modal scanner dapat dibuka tanpa internet

Expected:

- `html5-qrcode` berjalan dari bundle lokal

### E. Receipt Image / Export Flow

1. buka fitur yang memakai `useToImage`
2. generate image / preview

Expected:

- `html2canvas` berjalan tanpa dependency global/CDN

### F. OCR Flow

1. buka flow scan struk / OCR
2. jalankan satu kali dalam kondisi online
3. reload
4. ulangi flow OCR dalam kondisi offline

Expected:

- worker OCR berjalan dari `vendor/tesseract`
- core wasm dimuat dari `vendor/tesseract-core`
- `eng.traineddata.gz` dimuat dari `vendor/tesseract-lang/eng`
- tidak ada request ke CDN tesseract

## What To Watch In DevTools

Filter request/network untuk kata-kata berikut:

- `esm.sh`
- `jsdelivr`
- `cdnjs`
- `unpkg`
- `mixkit`
- `tesseract`
- `traineddata`

Kalau ada request remote saat offline test, catat:

- action yang sedang dilakukan
- URL yang diminta
- apakah request itu terjadi saat boot, atau hanya saat fitur tertentu dipakai

## Pass Criteria

Checklist dianggap lulus jika:

- app boot dari hasil build tanpa internet
- chunk lokal termuat tanpa blank screen
- POS core flow tetap jalan
- scanner web tetap bisa dibuka
- OCR tidak mengambil asset dari internet

## Known Follow-up Areas

Kalau test gagal, kandidat akar masalah paling mungkin:

- service worker belum meng-cache chunk tertentu
- path OCR worker/core/lang belum sesuai base path target deploy
- ada asset runtime yang masih remote di komponen tertentu
- chunk splitting menghasilkan nama file baru yang belum ikut tervalidasi

## Suggested Recording Format

Kalau ingin mencatat hasil uji:

```md
## Environment
- Browser / device:
- Build source:

## Checked
- [ ] App boot offline
- [ ] POS core flow offline
- [ ] Barcode scanner offline
- [ ] OCR offline

## Findings
- ...
```

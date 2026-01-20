
const CACHE_NAME = 'artea-pos-offline-v5-full';

// DAFTAR SEMUA DEPENDENCY DARI INDEX.HTML DISINI
// Pastikan URL-nya persis sama dengan yang ada di index.html
const urlsToCache = [
  // Halaman Utama
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  
  // Hasil Build Lokal (Sesuai vite.config.ts)
  '/index.js',
  '/style.css',

  // Tailwind CSS
  'https://cdn.tailwindcss.com',

  // External Libs (CSS)
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff',

  // External Libs (JS)
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',

  // ESM Modules (React & Others)
  'https://esm.sh/react@18.3.1',
  'https://esm.sh/react@18.3.1/',
  'https://esm.sh/react-dom@18.3.1',
  'https://esm.sh/react-dom@18.3.1/',
  'https://esm.sh/dexie@^4.0.7',
  'https://esm.sh/xlsx@^0.18.5',
  'https://esm.sh/@capacitor/core@^6.0.0',
  'https://esm.sh/@capacitor/camera@^6.0.0',
  'https://esm.sh/@capacitor/share@^6.0.0',
  'https://esm.sh/@capacitor/filesystem@^6.0.0',
  'https://esm.sh/@capacitor-community/barcode-scanner@^4.0.1',
  'https://esm.sh/recharts@^2.12.7?external=react,react-dom',
  'https://esm.sh/react-window@^1.8.10?external=react,react-dom',
  'https://esm.sh/@supabase/supabase-js@^2.39.0',
  'https://esm.sh/jspdf@^2.5.1',
  'https://esm.sh/jspdf-autotable@^3.8.2',
  'https://esm.sh/crypto-js@^4.2.0',
  'https://esm.sh/dropbox@^10.34.0',
  'https://esm.sh/path-browserify@^1.0.1',
  'https://esm.sh/url',
  'https://esm.sh/@vitejs/plugin-react@^5.1.2',
  'https://esm.sh/vite@^7.3.1',
  'https://esm.sh/electron@^40.0.0'
];

// 1. INSTALL: Paksa unduh semua aset sebelum SW dianggap 'installed'
self.addEventListener('install', event => {
  console.log('[SW] Installing & Downloading Assets...');
  
  // Skip Waiting: Agar SW baru langsung aktif tanpa menunggu tab ditutup
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Gunakan Promise.allSettled agar jika satu gagal, kita tau yg mana, 
        // tapi untuk strict offline, kita pakai addAll.
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] All assets cached successfully');
      })
      .catch(err => {
        console.error('[SW] Cache Failed:', err);
      })
  );
});

// 2. ACTIVATE: Bersihkan cache lama & Klaim kontrol halaman
self.addEventListener('activate', event => {
  console.log('[SW] Activated');
  event.waitUntil(
    Promise.all([
      // Hapus cache lama
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Segera ambil alih kontrol halaman tanpa reload
      self.clients.claim()
    ])
  );
});

// 3. FETCH: Cache First Strategy (Stict Offline)
// Cek cache dulu. Jika ada, kembalikan. Jika tidak ada, baru fetch network.
self.addEventListener('fetch', event => {
  // Abaikan request selain GET (misal POST ke API)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(response => {
        // Opsional: Cache dinamis untuk request baru yg belum ada di list
        // (Bisa diaktifkan jika ingin cache gambar produk yg diupload user)
        return response;
      });
    })
  );
});

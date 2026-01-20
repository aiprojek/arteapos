
const CACHE_NAME = 'artea-pos-offline-v6-stable';

// DAFTAR FILE YANG WAJIB ADA (CRITICAL)
// Menggunakan Relative Path agar support subdirectory deployment
const CRITICAL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './index.js',
  './style.css',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@18.3.1',
  'https://esm.sh/react-dom@18.3.1',
  'https://esm.sh/dexie@^4.0.7',
  'https://esm.sh/react-window@^1.8.10?external=react,react-dom'
];

// DAFTAR FILE PENDUKUNG (OPTIONAL)
const OPTIONAL_URLS = [
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://esm.sh/xlsx@^0.18.5',
  'https://esm.sh/@capacitor/core@^6.0.0',
  'https://esm.sh/@capacitor/camera@^6.0.0',
  'https://esm.sh/@capacitor/share@^6.0.0',
  'https://esm.sh/@capacitor/filesystem@^6.0.0',
  'https://esm.sh/@capacitor-community/barcode-scanner@^4.0.1',
  'https://esm.sh/recharts@^2.12.7?external=react,react-dom',
  'https://esm.sh/@supabase/supabase-js@^2.39.0',
  'https://esm.sh/jspdf@^2.5.1',
  'https://esm.sh/jspdf-autotable@^3.8.2',
  'https://esm.sh/crypto-js@^4.2.0',
  'https://esm.sh/dropbox@^10.34.0',
  'https://esm.sh/path-browserify@^1.0.1',
  'https://esm.sh/url'
];

// 1. INSTALL: Strategi "Best Effort"
self.addEventListener('install', event => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] Start Caching...');

      // 1. Cache Critical (Harus sukses semua)
      try {
        await cache.addAll(CRITICAL_URLS);
        console.log('[SW] Critical assets cached.');
      } catch (err) {
        console.error('[SW] Critical cache failed:', err);
        // Jangan throw error di sini agar SW tetap terinstall, 
        // user nanti akan load dari network.
      }

      // 2. Cache Optional (Satu per satu, jika gagal lanjut saja)
      const promises = OPTIONAL_URLS.map(url => 
        fetch(url).then(response => {
          if (response.ok) return cache.put(url, response);
          console.warn('[SW] Failed to fetch optional:', url, response.status);
        }).catch(e => console.warn('[SW] Fetch error optional:', url, e))
      );

      await Promise.allSettled(promises);
      console.log('[SW] Install completed.');
    })
  );
});

// 2. ACTIVATE: Bersihkan cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
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
      self.clients.claim()
    ])
  );
});

// 3. FETCH: Stale-While-Revalidate untuk performa terbaik
// Cek cache dulu, tampilkan, lalu update cache di background jika ada internet
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Jika ada di cache, kembalikan segera
      if (cachedResponse) {
        return cachedResponse;
      }

      // Jika tidak ada di cache, ambil dari network
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // Simpan ke cache untuk masa depan
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Jika offline dan tidak ada di cache (misal gambar produk baru)
        // Bisa return fallback image jika mau
      });
    })
  );
});

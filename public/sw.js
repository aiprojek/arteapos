
const CACHE_NAME = 'artea-pos-offline-v7-robust';

// DAFTAR FILE KRUSIAL (Tanpa ini aplikasi blank)
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

// DAFTAR FILE PENDUKUNG (Jika gagal, aplikasi masih bisa jalan)
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
  'https://esm.sh/jspdf@^2.5.1',
  'https://esm.sh/jspdf-autotable@^3.8.2',
  'https://esm.sh/crypto-js@^4.2.0',
  'https://esm.sh/dropbox@^10.34.0',
  'https://esm.sh/path-browserify@^1.0.1',
  'https://esm.sh/url',
  'https://esm.sh/peerjs@1.5.2?bundle-deps' 
];

// Helper untuk fetch dengan timeout dan mode cors
const fetchWithRetry = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout per file

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'reload', // Pastikan tidak ambil dari cache browser yang corrupt
      mode: 'cors',    // Wajib untuk CDN agar bisa disimpan di Cache Storage
      credentials: 'omit'
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

self.addEventListener('install', event => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] Memulai instalasi aset offline...');

      // 1. Cache Critical (Satu per satu agar kita tahu mana yang gagal)
      for (const url of CRITICAL_URLS) {
        try {
          const response = await fetchWithRetry(url);
          await cache.put(url, response);
        } catch (error) {
          console.error(`[SW] Gagal cache critical: ${url}`, error);
          // Kita tidak throw error agar SW tetap terinstall sebagian
          // User akan load file ini dari network saat butuh
        }
      }

      // 2. Cache Optional (Paralel untuk kecepatan)
      const optionalPromises = OPTIONAL_URLS.map(async url => {
        try {
          const response = await fetchWithRetry(url);
          await cache.put(url, response);
        } catch (error) {
          console.warn(`[SW] Gagal cache optional: ${url}`);
        }
      });

      await Promise.allSettled(optionalPromises);
      console.log('[SW] Instalasi selesai.');
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Menghapus cache lama:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Strategi: Cache First, falling back to Network
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        // Cek validitas respon
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        // Cache file baru yang diakses user (runtime caching)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Jika offline dan fetch gagal
        // Bisa return offline.html jika ada
      });
    })
  );
});

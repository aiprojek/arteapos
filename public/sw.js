
const CACHE_NAME = 'artea-pos-offline-v8-local-bootstrap';
const ASSET_MANIFEST_URL = './asset-manifest.json';

// DAFTAR FILE KRUSIAL (Tanpa ini aplikasi blank)
const CRITICAL_URLS = [
  './',
  './index.html',
  './manifest.json',
  ASSET_MANIFEST_URL,
  './favicon.svg',
  './index.js',
  './style.css'
];

// DAFTAR FILE PENDUKUNG (Jika gagal, aplikasi masih bisa jalan)
const OPTIONAL_URLS = [
  './bootstrap-icons.woff',
  './bootstrap-icons.woff2',
  './vendor/tesseract/worker.min.js',
  './vendor/tesseract-core/tesseract-core.wasm.js',
  './vendor/tesseract-core/tesseract-core.wasm',
  './vendor/tesseract-core/tesseract-core-simd.wasm.js',
  './vendor/tesseract-core/tesseract-core-simd.wasm',
  './vendor/tesseract-core/tesseract-core-lstm.wasm.js',
  './vendor/tesseract-core/tesseract-core-lstm.wasm',
  './vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js',
  './vendor/tesseract-core/tesseract-core-simd-lstm.wasm',
  './vendor/tesseract-lang/eng/eng.traineddata.gz'
];

const normalizeLocalUrl = (url) => {
  if (!url) return null;
  return url.startsWith('./') ? url : `./${url}`;
};

const collectManifestAssets = (manifest) => {
  const assetUrls = new Set();

  Object.values(manifest).forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    if (entry.file) assetUrls.add(normalizeLocalUrl(entry.file));
    if (Array.isArray(entry.css)) {
      entry.css.forEach((file) => assetUrls.add(normalizeLocalUrl(file)));
    }
    if (Array.isArray(entry.assets)) {
      entry.assets.forEach((file) => assetUrls.add(normalizeLocalUrl(file)));
    }
  });

  return [...assetUrls].filter(Boolean);
};

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

      try {
        const manifestResponse = await fetchWithRetry(ASSET_MANIFEST_URL);
        const manifest = await manifestResponse.clone().json();
        const manifestAssets = collectManifestAssets(manifest);

        for (const url of manifestAssets) {
          try {
            const response = await fetchWithRetry(url);
            await cache.put(url, response);
          } catch (error) {
            console.warn(`[SW] Gagal cache manifest asset: ${url}`, error);
          }
        }
      } catch (error) {
        console.warn('[SW] Gagal membaca asset manifest.', error);
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

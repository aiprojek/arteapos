
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: '', // Flat structure
    sourcemap: false,
    emptyOutDir: true,
    target: 'es2020', // Sedikit modern untuk support Top Level Await di SW jika perlu
    assetsInlineLimit: 0, // Matikan inline base64 agar semua jadi file fisik (lebih mudah di-cache)
    rollupOptions: {
      external: ['peerjs'], // PeerJS diload via CDN (ImportMap), jangan di-bundle
      output: {
        // PENTING: Nama file statis agar bisa didaftarkan di sw.js
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'style.css';
          }
          return '[name][extname]';
        },
        manualChunks: undefined, 
      }
    }
  }
});

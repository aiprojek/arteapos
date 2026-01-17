
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // PENTING: base './' membuat semua link aset menjadi relatif.
  // Wajib untuk lingkungan file:// (Kodular/Android Asset/Electron)
  base: './', 
  build: {
    outDir: 'dist',
    // Kosongkan assetsDir agar file tidak masuk ke subfolder (Flat structure untuk Kodular)
    assetsDir: '',
    // Matikan sourcemap untuk produksi (menghemat ukuran)
    sourcemap: false,
    // Hapus folder dist lama
    emptyOutDir: true,
    // Target ES2015 agar kompatibel dengan Android WebView lama
    target: 'es2015',
    // Perbesar batas inline asset (100kb). 
    // Gambar < 100kb akan jadi base64 string di dalam JS/CSS.
    // Ini MENCEGAH error gambar hilang (broken image) di Kodular/Electron karena masalah path.
    assetsInlineLimit: 100000, 
    rollupOptions: {
      output: {
        // Memaksa nama file tetap (tanpa hash acak)
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // Memaksa satu file JS besar agar tidak ada masalah loading chunk di WebView lama
        manualChunks: undefined, 
      }
    }
  }
});

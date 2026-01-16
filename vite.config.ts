
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // PENTING: base './' membuat semua link aset menjadi relatif (titik slash).
  // Ini wajib agar aplikasi bisa jalan tanpa server (file:///android_asset/...)
  base: './', 
  build: {
    outDir: 'dist',
    // Kosongkan assetsDir agar file js/css tidak masuk ke subfolder 'assets/'.
    // Kodular 'meratakan' semua aset, jadi file index.html harus mencari script di folder yang sama.
    assetsDir: '', 
  }
});

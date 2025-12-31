
import type { Product } from './types';

export const CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Es Kopi Susu', price: 18000, category: ['Kopi'] },
  { id: '2', name: 'Americano', price: 15000, category: ['Kopi'] },
  { id: '3', name: 'Croissant', price: 20000, category: ['Makanan'] },
  { id: '4', name: 'Red Velvet Latte', price: 22000, category: ['Non-Kopi'] },
  { id: '5', name: 'Teh Lemon', price: 12000, category: ['Non-Kopi'] },
  { id: '6', name: 'Nasi Goreng', price: 25000, category: ['Makanan'] },
];

export const APP_LICENSE_ID = `
### GNU GENERAL PUBLIC LICENSE

#### Ringkasan Bahasa Indonesia (Panduan Tidak Resmi)
*Catatan: Ringkasan ini dibuat untuk memudahkan pemahaman. Jika terdapat perbedaan penafsiran, maka naskah asli Bahasa Inggris di bawah yang berlaku secara hukum.*

Aplikasi **Artea POS** adalah perangkat lunak bebas (*Free Software*) yang dilisensikan di bawah **GNU General Public License v3.0 (GPLv3)**. Anda memiliki hak-hak berikut:

1.  **Kebebasan Menggunakan:** Anda bebas menggunakan aplikasi ini untuk tujuan apa pun, baik pribadi, komersial (toko/usaha), maupun pendidikan, tanpa biaya lisensi/royalti.
2.  **Kebebasan Mempelajari & Mengubah:** Anda berhak mendapatkan kode sumber (*source code*) aplikasi ini, mempelajarinya, dan memodifikasinya sesuai kebutuhan bisnis Anda.
3.  **Kebebasan Mendistribusikan:** Anda boleh menyalin dan membagikan aplikasi ini kepada orang lain. 
    *   **Syarat Utama:** Jika Anda membagikan versi yang telah dimodifikasi kepada orang lain, Anda **WAJIB** menyertakan kode sumbernya dan melisensikannya di bawah lisensi yang sama (GPLv3). Anda tidak boleh menjadikan aplikasi ini tertutup (*closed source*) atau membatasi hak pengguna selanjutnya.
4.  **TANPA JAMINAN (NO WARRANTY):** Aplikasi ini didistribusikan dengan harapan dapat bermanfaat, namun **TANPA JAMINAN APAPUN**; bahkan tanpa jaminan tersirat atas **NILAI JUAL** atau **KESESUAIAN UNTUK TUJUAN TERTENTU**. Risiko penggunaan sepenuhnya ada di tangan Anda. Pengembang tidak bertanggung jawab atas kerusakan data atau kerugian finansial yang mungkin terjadi.

---

#### Naskah Asli (Bahasa Inggris)

Untuk membaca teks lengkap lisensi GNU General Public License v3.0 yang mengikat secara hukum, silakan kunjungi:

https://www.gnu.org/licenses/gpl-3.0.html
`;


import React, { useState } from 'react';
import { AccordionItem, TableOfContents } from './SharedHelpComponents';

const FAQTab: React.FC = () => {
    const [openId, setOpenId] = useState<string | null>(null);

    const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

    const faqs = [
        {
            id: 'faq_evid',
            category: 'Transaksi',
            title: 'Bagaimana cara simpan dan unduh bukti transfer?',
            content: 'Saat pembayaran Non-Tunai, klik ikon kamera di kolom <strong>"Bukti Pembayaran (Opsional)"</strong> untuk memfoto struk/HP pelanggan.<br/><br/>Foto ini tersimpan di <strong>Laporan</strong>. Admin dapat mengklik ikon kamera biru di tabel laporan, lalu menekan tombol <strong>"Unduh"</strong>. File akan otomatis diberi nama sesuai <strong>ID Transaksi</strong> (cth: <code>Bukti_Trx_LOC-123...</code>) sehingga mudah dicocokkan dengan data Excel/CSV saat audit.'
        },
        {
            id: 'faq_ocr',
            category: 'Keuangan',
            title: 'Apa fungsi tombol "Scan Data (AI)" saat catat pengeluaran?',
            content: 'Ini adalah fitur cerdas untuk mempercepat kerja Anda. Cukup foto nota belanja pasar/supplier, lalu klik tombol Scan AI. Sistem akan otomatis membaca <strong>Tanggal</strong> dan <strong>Total Harga</strong> dari foto tersebut, jadi Anda tidak perlu mengetik manual.'
        },
        {
            id: 'faq_dual',
            category: 'Layar Pelanggan',
            title: 'Apakah fitur Layar Pelanggan (Dual Screen) butuh internet?',
            content: '<strong>Ya, butuh.</strong> Fitur ini menggunakan teknologi WebRTC (PeerJS) untuk menghubungkan dua browser berbeda (Kasir & Pelanggan). Koneksi internet diperlukan untuk proses awal (handshake/pairing). Setelah terhubung, data akan mengalir lebih stabil jika kedua perangkat dalam jaringan WiFi yang sama, tapi tetap membutuhkan akses internet dasar.'
        },
        {
            id: 'faq_device',
            category: 'Layar Pelanggan',
            title: 'Perangkat apa yang bisa jadi Layar Pelanggan?',
            content: '<strong>Hampir semua perangkat.</strong> Anda bisa menggunakan Tablet Android bekas, iPad lama, atau bahkan HP Android murah. Syaratnya hanya satu: Bisa membuka browser modern (Chrome/Edge/Safari) dan terhubung ke internet.'
        },
        {
            id: 'faq_waste',
            category: 'Stok',
            title: 'Di mana saya melihat laporan barang rusak (waste) atau riwayat restock?',
            content: 'Semua aktivitas perubahan stok (selain penjualan) tercatat di menu <strong>Laporan</strong>.<br/>1. Buka menu Laporan.<br/>2. Di bagian bawah (tabel), klik tab <strong>"Mutasi Stok & Log"</strong> (disebelah tab Riwayat Penjualan).<br/>Di sana Anda akan melihat daftar lengkap: kapan barang masuk (Restock), kapan keluar (Waste/Rusak), dan hasil Stock Opname.'
        },
        {
            id: 'faq_dropbox',
            category: 'Keamanan',
            title: 'Kenapa kolom App Key & Secret Dropbox jadi kosong setelah terhubung?',
            content: 'Ini adalah fitur keamanan <strong>(Security by Obscurity)</strong>.<br/>Sistem secara otomatis menyembunyikan App Key dan App Secret dari tampilan layar agar <strong>tidak bisa dicuri atau disalin</strong> oleh staf/orang lain yang meminjam perangkat Admin. Data sebenarnya <strong>tetap tersimpan aman</strong> di dalam sistem.'
        },
        {
            id: 'faq_transfer',
            category: 'Stok',
            title: 'Apa bedanya "Transfer Stok" dan "Stok Manual"?',
            content: '<strong>Transfer Stok</strong> digunakan oleh Gudang Pusat untuk mengirim barang ke Cabang secara digital (membutuhkan internet). Cabang akan menerima stok saat Sync.<br/><strong>Stok Manual</strong> digunakan untuk input barang yang dibeli sendiri oleh toko dari supplier lokal/pasar (bisa offline) atau untuk mencatat barang rusak/waste.'
        },
        {
            id: 'faq_sync_gudang',
            category: 'Stok',
            title: 'Gudang sudah kirim barang, kenapa stok di kasir belum bertambah?',
            content: 'Karena aplikasi ini <em>Offline-First</em>, data tidak masuk otomatis detik itu juga. Kasir/Staf Toko harus menekan tombol <strong>"Cek Update" (ikon panah bawah)</strong> di bagian atas layar (Header) untuk mengunduh data kiriman dari Gudang. Pastikan ada internet saat menekan tombol tersebut.'
        },
        {
            id: 'faq_ble',
            category: 'Hardware',
            title: 'Printer Bluetooth tidak terdeteksi di Android 12+?',
            content: 'Android 12/13/14/15 membutuhkan izin <strong>"Nearby Devices" (Perangkat Sekitar)</strong>. Pastikan Anda mengklik "Izinkan" saat pertama kali membuka menu Printer. Jika terlewat, buka <em>Settings HP -> Apps -> Artea POS -> Permissions -> Nearby Devices -> Allow</em>.'
        },
        {
            id: 'faq_scanner',
            category: 'Hardware',
            title: 'Apakah barcode scanner bisa untuk kartu member?',
            content: '<strong>Ya!</strong> Tombol Scanner di menu Kasir sekarang sudah "Smart". Jika yang discan adalah kartu member, sistem otomatis login pelanggan tersebut. Jika yang discan adalah barang, sistem otomatis menambahkannya ke keranjang.'
        },
        {
            id: 'faq_identity',
            category: 'Member',
            title: 'Saya koperasi sekolah/kantor, bisa pakai data Kelas/Divisi?',
            content: '<strong>Bisa.</strong> Kolom "Kontak" pada data pelanggan bersifat bebas. Anda bisa mengisinya dengan "Kelas 12A", "NIK 12345", atau "Divisi Gudang". Data ini juga bisa digunakan sebagai kata kunci pencarian di halaman kasir.'
        },
        {
            id: 'faq_topup',
            category: 'Member',
            title: 'Apakah uang Top Up Saldo dihitung sebagai Omzet Penjualan?',
            content: '<strong>Tidak.</strong> Dalam akuntansi, uang Top Up dianggap sebagai <strong>Utang/Deposit</strong> (Uang Titipan). Di Artea POS, saat Top Up terjadi, uang masuk ke laporan <strong>Arus Kas (Kas Masuk)</strong> agar laci kasir tetap balance, tapi TIDAK menambah angka "Total Penjualan" hari itu.'
        },
        {
            id: 'faq_cloud',
            category: 'Cloud',
            title: 'Apakah data cabang otomatis tersimpan di HP Admin?',
            content: '<strong>Tidak otomatis.</strong> Aplikasi ini didesain agar perangkat Admin tetap ringan ("Mode Intip"). Data cabang tersimpan di Dropbox. Saat Anda menekan tombol "Refresh" di Dashboard, aplikasi hanya mengunduh data tersebut ke memori sementara untuk ditampilkan (View Only).'
        }
    ];

    // Grouping for TOC logic
    const categories = Array.from(new Set(faqs.map(f => f.category)));
    const tocItems = categories.map(c => ({ 
        id: `cat_${c.replace(/\s+/g, '_')}`, 
        label: c 
    }));

    return (
        <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <h3 className="font-bold text-white text-lg">Tanya Jawab & Masalah Umum</h3>
                <p className="text-xs text-slate-400">Jawaban cepat untuk pertanyaan teknis dan operasional.</p>
            </div>

            <TableOfContents items={tocItems} />

            <div className="space-y-8">
                {categories.map(cat => (
                    <div key={cat} id={`cat_${cat.replace(/\s+/g, '_')}`} className="scroll-mt-24">
                        <h4 className="text-sm font-bold text-[#52a37c] mb-3 uppercase tracking-wider border-b border-slate-700 pb-1">
                            {cat}
                        </h4>
                        <div className="space-y-2">
                            {faqs.filter(f => f.category === cat).map(f => (
                                <AccordionItem 
                                    key={f.id}
                                    title={f.title}
                                    isOpen={openId === f.id}
                                    onToggle={() => toggle(f.id)}
                                    icon="question"
                                >
                                    <div dangerouslySetInnerHTML={{ __html: f.content }} />
                                </AccordionItem>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FAQTab;

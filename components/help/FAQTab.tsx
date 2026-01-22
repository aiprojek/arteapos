
import React, { useState } from 'react';
import { AccordionItem, TableOfContents } from './SharedHelpComponents';

const FAQTab: React.FC = () => {
    const [openId, setOpenId] = useState<string | null>(null);

    const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

    const faqs = [
        {
            id: 'faq_pay_blocked',
            category: 'Transaksi',
            title: 'Kenapa muncul peringatan "Info Meja Wajib" saat mau Bayar?',
            content: 'Ini terjadi karena pengaturan keamanan aktif.<br/><br/>Anda telah mengaktifkan opsi <strong>"Wajibkan Isi Meja & Pax"</strong> di menu Pengaturan > Fitur Kasir. <br/>Untuk pesanan tipe "Makan di Tempat", sistem mewajibkan Anda mengisi <strong>Nomor Meja DAN Jumlah Tamu (Pax)</strong> sebelum bisa memproses pembayaran.'
        },
        {
            id: 'faq_cam_customer',
            category: 'Transaksi',
            title: 'Bagaimana cara minta pelanggan foto bukti transfer langsung di layar mereka?',
            content: 'Fitur ini membutuhkan <strong>Layar Pelanggan</strong> yang terhubung.<br/>1. Di kasir, tekan "Bayar" lalu pilih "Non-Tunai".<br/>2. Di bagian "Bukti Pembayaran", klik tombol ungu <strong>"Minta Pelanggan"</strong>.<br/>3. Layar di depan pelanggan akan berubah menjadi kamera. Minta pelanggan mengarahkan bukti transfer ke kamera tersebut.<br/>4. Foto akan otomatis muncul di tablet Kasir untuk disimpan.'
        },
        {
            id: 'faq_table_remove',
            category: 'Transaksi',
            title: 'Bagaimana cara menghilangkan kolom "Nomor Meja"?',
            content: 'Jika usaha Anda bukan restoran (misal Retail/Kelontong), Anda bisa mematikan fitur ini.<br/>Masuk ke menu <strong>Pengaturan</strong> > <strong>Fitur Kasir</strong> > Matikan toggle <strong>"Aktifkan Manajemen Meja & Pax"</strong>.'
        },
        {
            id: 'faq_evid',
            category: 'Transaksi',
            title: 'Bagaimana cara unduh bukti transfer yang tersimpan?',
            content: 'Semua foto tersimpan di menu <strong>Laporan -> Riwayat Penjualan</strong>.<br/>Klik ikon kamera biru pada transaksi terkait, lalu tekan tombol <strong>"Unduh"</strong>. File akan disimpan dengan nama yang mengandung ID Transaksi agar mudah dicocokkan.'
        },
        {
            id: 'faq_kds_conn',
            category: 'Layar Dapur',
            title: 'Bagaimana cara menghubungkan Layar Dapur (KDS)?',
            content: '1. Siapkan Tablet/HP untuk dapur.<br/>2. Buka Artea POS di perangkat dapur -> Layar Login -> Klik tombol "Mode Dapur" di bawah.<br/>3. Di Kasir Utama, buka menu Kasir -> Klik ikon "Layar Kedua" (Cast) -> Pilih tab <strong>"Dapur (KDS)"</strong>.<br/>4. Scan QR code yang ada di perangkat dapur.'
        },
        {
            id: 'faq_kds_func',
            category: 'Layar Dapur',
            title: 'Apa fungsi tombol "Bersihkan Selesai" di Layar Dapur?',
            content: 'Tombol ini menghapus pesanan yang statusnya sudah "SELESAI" dari layar, agar koki bisa fokus pada pesanan baru yang masuk. Pesanan tidak terhapus dari laporan penjualan, hanya hilang dari tampilan dapur.'
        },
        {
            id: 'faq_ocr',
            category: 'Keuangan',
            title: 'Apa fungsi tombol "Scan Data (AI)" saat catat pengeluaran?',
            content: 'Fitur cerdas untuk mempercepat input data. Cukup foto nota belanja, klik Scan AI, dan sistem akan otomatis membaca <strong>Tanggal</strong> serta <strong>Total Harga</strong> dari foto tersebut.'
        },
        {
            id: 'faq_dual',
            category: 'Koneksi',
            title: 'Apakah fitur Layar Pelanggan/Dapur butuh internet?',
            content: '<strong>Ya, butuh.</strong> Fitur ini menggunakan teknologi WebRTC (PeerJS) untuk menghubungkan antar browser. Koneksi internet diperlukan untuk proses awal (pairing). Setelah terhubung, data lebih stabil jika kedua perangkat dalam jaringan WiFi yang sama, tapi tetap membutuhkan akses internet dasar.'
        },
        {
            id: 'faq_ble_native',
            category: 'Hardware',
            title: 'Saya pakai Aplikasi Android, kenapa Printer tidak bisa print?',
            content: 'Jika menggunakan Aplikasi Android (APK/Play Store), pastikan Anda menggunakan tombol <strong>"Cari Perangkat (Paired)"</strong> di menu Pengaturan Hardware.<br/>Jangan lupa nyalakan Bluetooth HP dan pasangkan (pair) printer di menu Bluetooth Android terlebih dahulu sebelum membuka aplikasi.'
        },
        {
            id: 'faq_waste',
            category: 'Stok',
            title: 'Di mana melihat laporan barang rusak (waste)?',
            content: 'Buka menu <strong>Laporan</strong> -> tab <strong>"Mutasi Stok & Log"</strong>. Di sana tercatat semua barang keluar selain penjualan (label merah "KELUAR").'
        },
        {
            id: 'faq_dropbox',
            category: 'Keamanan',
            title: 'Kenapa kolom App Key Dropbox jadi kosong?',
            content: 'Fitur keamanan <strong>(Security by Obscurity)</strong>. Sistem menyembunyikan App Key/Secret dari layar agar tidak bisa disalin oleh orang lain. Data asli tetap tersimpan aman di sistem.'
        },
        {
            id: 'faq_transfer',
            category: 'Stok',
            title: 'Apa bedanya "Transfer Stok" dan "Stok Manual"?',
            content: '<strong>Transfer Stok:</strong> Gudang Pusat kirim barang ke Cabang (butuh internet).<br/><strong>Stok Manual:</strong> Toko beli barang sendiri dari pasar/supplier lokal.'
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

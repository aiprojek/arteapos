
import React, { useState } from 'react';
import { SectionHeader, AccordionItem } from './SharedHelpComponents';
import Icon from '../Icon';

const StrategyTab: React.FC = () => {
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(prev => prev === id ? null : id);
    };

    const StrategyCard: React.FC<{
        title: string;
        problem: string;
        solutionApp: string;
        sop: string;
        icon: any;
        color: string;
    }> = ({ title, problem, solutionApp, sop, icon, color }) => (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6 shadow-sm hover:border-slate-500 transition-colors">
            <div className="p-4 border-b border-slate-700 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-slate-900 ${color}`}>
                    <Icon name={icon} className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-lg">{title}</h3>
            </div>
            <div className="p-5 space-y-6">
                <div className="relative pl-6 border-l-2 border-red-500/50">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-500 border-4 border-slate-800"></div>
                    <h4 className="text-red-400 font-bold text-sm uppercase mb-1">Masalah (The Loophole)</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{problem}</p>
                </div>

                <div className="relative pl-6 border-l-2 border-blue-500/50">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-slate-800"></div>
                    <h4 className="text-blue-400 font-bold text-sm uppercase mb-1">Solusi Aplikasi (Tech)</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{solutionApp}</p>
                </div>

                <div className="relative pl-6 border-l-2 border-green-500/50">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 border-4 border-slate-800"></div>
                    <h4 className="text-green-400 font-bold text-sm uppercase mb-1">Trik Lapangan (SOP Fisik)</h4>
                    <p className="text-slate-300 text-sm leading-relaxed italic">{sop}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-10">
            <div className="bg-gradient-to-r from-yellow-900/40 to-slate-800 border border-yellow-700/50 p-6 rounded-2xl text-center mb-8 shadow-lg">
                <div className="inline-block p-3 bg-yellow-500/20 rounded-full mb-3">
                    <Icon name="lightbulb" className="w-8 h-8 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Strategi Anti-Bocor & Keamanan</h2>
                <p className="text-slate-300 text-sm max-w-xl mx-auto">
                    Aplikasi kasir hanya alat. Keamanan bisnis sesungguhnya ada pada kombinasi sistem dan SOP yang cerdas. Berikut adalah taktik yang kami gunakan di Artea Group.
                </p>
            </div>

            <div className="space-y-6">
                
                <StrategyCard 
                    title="Kasus 1: Gelas Cuci Ulang (Reusable Inventory)" 
                    icon="ingredients" 
                    color="text-pink-400"
                    problem="Jika Anda menggunakan gelas kaca/keramik, stok gelas tidak akan berkurang saat penjualan. Kasir bisa saja menyajikan minuman, menerima uang, tapi tidak menginput ke sistem karena 'stok gelas tidak hilang', sehingga tidak ketahuan saat audit."
                    solutionApp="Gunakan fitur Resep (Bahan Baku) di menu Produk."
                    sop="Strategi 'Proxy Inventory': Jangan lacak gelasnya, tapi lacak barang pendamping sekali pakainya. Masukkan Sedotan (Straw), Tisu Brand, atau Teh Celup ke dalam resep di aplikasi. Jika stok sedotan minus tapi penjualan sedikit, berarti ada kebocoran transaksi."
                />

                <StrategyCard 
                    title="Kasus 2: Diskon Siluman (Phantom Discount)" 
                    icon="tag" 
                    color="text-purple-400"
                    problem="Celah terjadi saat pembayaran. Pelanggan bayar harga normal (50rb) tunai dan pergi tanpa minta struk. SEBELUM menekan tombol 'Selesai', kasir diam-diam menambahkan diskon 50%. Kasir setor 25rb ke sistem, dan mengantongi 25rb sisanya."
                    solutionApp="Menu Pengaturan &rarr; Fitur Kasir &rarr; Daftar Diskon. Hapus opsi diskon manual, gunakan hanya diskon Preset yang disetujui."
                    sop="Wajibkan 'Bukti Fisik'. Jika ada transaksi diskon di laporan, harus ada bukti fisik (Voucher Kertas yang ditandatangani Manager) yang distaples pada struk settlement saat tutup toko. Jika ada diskon di sistem tapi tidak ada kertas vouchernya, potong gaji."
                />

                <StrategyCard 
                    title="Kasus 3: Transaksi Batal (Void after Pay)" 
                    icon="trash" 
                    color="text-red-500"
                    problem="Kasir input pesanan, pelanggan bayar tunai. Pelanggan pergi tanpa minta struk. Bukannya menekan 'Bayar', Kasir malah menekan tombol 'Hapus Item' atau membatalkan seluruh keranjang. Uang masuk kantong, stok tidak berkurang."
                    solutionApp="Buka menu Audit Log. Filter aksi 'DELETE_TRANSACTION' atau 'REFUND'."
                    sop="Jika stok fisik berlebih (surplus) saat Opname, jangan senang dulu. Itu indikasi kasir tidak menginput penjualan (barang fisik masih ada di catatan, padahal sudah laku). Cek CCTV pada jam-jam terjadinya Refund/Hapus Item di Audit Log."
                />

                <StrategyCard 
                    title="Kasus 4: Kasir Merangkap Dapur (One Man Show)" 
                    icon="users" 
                    color="text-orange-400"
                    problem="Jika kasir juga yang membuat pesanan, sangat mudah memanipulasi. Contoh: Pelanggan bayar 'Paket Jumbo' (Rp 25rb), Kasir input 'Paket Hemat' (Rp 15rb). Selisih 10rb diambil. Di dapur, porsi tidak bisa dihitung presisi."
                    solutionApp="Pantau 'Average Transaction Value' di Dashboard."
                    sop="Strategi 'Visual Distinction' (Pembeda Visual). Wajibkan penggunaan piring/gelas/nampan yang kontras warnanya. Paket Jumbo = Nampan Merah. Paket Hemat = Nampan Hitam. Owner cukup Spot Check CCTV jam 12:00. Jika di CCTV terlihat Nampan Merah, tapi di Laporan Aplikasi tercatat Paket Hemat, maka tertangkap basah."
                />

                <StrategyCard 
                    title="Kasus 5: Top Up Saldo Fiktif" 
                    icon="finance" 
                    color="text-sky-400"
                    problem="Staff melakukan Top Up saldo ke akun member miliknya sendiri atau teman, tanpa memasukkan uang fisik ke laci. Lalu saldo itu dipakai belanja barang toko."
                    solutionApp="Wajibkan fitur Sesi (Shift) & Laporan Arus Kas."
                    sop="Di Artea POS, Top Up Saldo tercatat sebagai 'Kas Masuk'. Jika Staff Top Up fiktif Rp 100rb, maka saat Tutup Toko, sistem akan menagih uang tunai Rp 100rb tersebut di laci. Jika uang fisik kurang, selisih (Variance) akan merah dan menjadi hutang staff."
                />

                <StrategyCard 
                    title="Kasus 6: Bahan Baku Bawaan (Side Hustle)" 
                    icon="warning" 
                    color="text-yellow-400"
                    problem="Barista membawa 1 kotak Susu UHT sendiri dari luar. Saat ada pesanan Kopi Susu, dia pakai Susu miliknya. Uang penjualan masuk kantong pribadi 100%. Stok toko aman, tapi omzet harian anjlok."
                    solutionApp="Analisis Grafik 'Penjualan per Jam' vs Rekaman CCTV keramaian toko."
                    sop="Lakukan 'Labeling/Segel'. Setiap pagi, Manager menempelkan stiker kecil/paraf pada semua bahan baku yang boleh dipakai. Saat sidak, jika ditemukan bahan baku tanpa stiker di meja bar, itu adalah barang selundupan. Pecat."
                />

                <StrategyCard 
                    title="Kasus 7: Pelanggan Tidak Minta Struk" 
                    icon="printer" 
                    color="text-blue-400"
                    problem="Kasir tidak menginput pesanan ke sistem karena pelanggan tidak peduli struk. Uang masuk saku pribadi."
                    solutionApp="Fitur 'Layar Kedua' (Customer Display) via P2P."
                    sop="Gunakan Tablet/HP bekas menghadap pelanggan. Sambungkan dengan fitur 'Layar Kedua' di Artea POS. Tampilkan tulisan besar 'Pesanan Anda: ...'. Jika layar kosong saat pelanggan membayar, pelanggan akan curiga. Pasang tulisan: 'Gratis Makan Jika Tidak Ada Struk'."
                />

                <StrategyCard 
                    title="Kasus 8: Stok Bahan Baku 'Ghaib'" 
                    icon="boxes" 
                    color="text-green-400"
                    problem="Stok fisik sering selisih dengan sistem, alasannya selalu 'susut' atau 'rusak', padahal dimakan sendiri atau dibawa pulang."
                    solutionApp="Fitur Stock Adjustment dengan Catatan Wajib."
                    sop="Lakukan 'Blind Count' (Opname Buta). Saat menyuruh staff menghitung stok fisik, JANGAN beri tahu angka di sistem. Biarkan mereka lapor angka riil. Jika mereka tahu angka sistem 10, mereka akan lapor 10 padahal fisik cuma 8. Selain itu, lakukan Opname dadakan di tengah hari (jam 2 siang), bukan hanya saat tutup."
                />

            </div>
        </div>
    );
};

export default StrategyTab;

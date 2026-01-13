
import React from 'react';
import Icon from '../Icon';
import Button from '../Button';
import { CURRENCY_FORMATTER } from '../../constants';

interface ServicePackage {
    id: string;
    title: string;
    priceRange: string;
    description: string;
    features: string[];
    icon: any;
    color: string;
    ctaMessage: string;
    isHardware?: boolean;
}

const PremiumTab: React.FC = () => {
    const adminEmail = "aiprojek01@gmail.com";

    const services: ServicePackage[] = [
        {
            id: 'data_entry',
            title: 'Jasa Input Menu & Data',
            priceRange: 'Mulai Rp 99.000',
            description: 'Terima beres! Kirim foto buku menu, kami inputkan ke sistem lengkap dengan HPP dan Resep.',
            features: [
                'Input hingga 50-100 Produk',
                'Setup Kategori & Varian',
                'Input Resep & Bahan Baku (Stok)',
                'Upload Foto Produk'
            ],
            icon: 'database',
            color: 'text-blue-400',
            ctaMessage: 'Tanya Jasa Input Data Menu (Artea POS)'
        },
        {
            id: 'cloud_setup',
            title: 'Setup Cloud Monitoring',
            priceRange: 'Rp 149.000 (Sekali Bayar)',
            description: 'Pantau omzet cabang dari rumah secara real-time lewat HP Anda tanpa pusing setting teknis.',
            features: [
                'Pembuatan Akun Dropbox Khusus',
                'Integrasi API Token',
                'Setting Pairing ke HP Owner',
                'Training Cara Baca Laporan'
            ],
            icon: 'wifi',
            color: 'text-purple-400',
            ctaMessage: 'Bantuan Setup Cloud Monitoring (Artea POS)'
        },
        {
            id: 'hardware',
            title: 'Paket Hardware Kasir',
            priceRange: 'Rp 2.5jt - 3.5jt',
            description: 'Paket lengkap siap pakai. Tidak perlu bingung memilih alat yang kompatibel.',
            features: [
                'Tablet Android (8-10 inch)',
                'Printer Thermal Bluetooth',
                'Stand Tablet & Laci Uang',
                'Sudah Terinstall Artea POS & Setting'
            ],
            icon: 'printer',
            color: 'text-orange-400',
            ctaMessage: 'Info Paket Hardware (Artea POS)',
            isHardware: true
        },
        {
            id: 'whitelabel',
            title: 'Custom Branding (White Label)',
            priceRange: 'Hubungi Kami',
            description: 'Gunakan Artea POS dengan Logo dan Nama Toko Anda sendiri. Terlihat lebih eksklusif.',
            features: [
                'Ganti Logo Login & Dashboard',
                'Ganti Nama Aplikasi',
                'Custom Footer Struk',
                'Deploy di Domain Sendiri'
            ],
            icon: 'star',
            color: 'text-yellow-400',
            ctaMessage: 'Layanan Custom Branding (Artea POS)'
        }
    ];

    const handleContact = (subject: string) => {
        const body = `Halo Tim Artea,\n\nSaya tertarik dengan layanan "${subject}".\nMohon informasi lebih lanjut mengenai harga dan prosedurnya.\n\nTerima kasih.`;
        const url = `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = url;
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Layanan Premium & Dukungan</h2>
                <p className="text-slate-400">
                    Software ini Gratis 100%. Namun jika Anda membutuhkan bantuan teknis, setup, atau perangkat keras, kami menyediakan layanan profesional untuk menghemat waktu Anda.
                </p>
            </div>

            {/* Disclaimer Hardware */}
            <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded-lg flex items-start gap-3 max-w-4xl mx-auto">
                <Icon name="info-circle" className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200">
                    <p className="font-bold mb-1">Catatan Penting:</p>
                    <p>
                        Harga yang tertera di bawah adalah estimasi dan <strong>dapat berubah sewaktu-waktu</strong> mengikuti harga pasar (terutama untuk Paket Hardware) serta kompleksitas data toko Anda.
                        Silakan hubungi tim Artea untuk mendapatkan penawaran terkini.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                    <div key={service.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-[#52a37c] transition-all flex flex-col h-full group relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${service.color}`}>
                            <Icon name={service.icon} className="w-32 h-32" />
                        </div>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-3 rounded-lg bg-slate-900 ${service.color}`}>
                                <Icon name={service.icon} className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-white text-lg leading-tight">{service.title}</h3>
                        </div>

                        <div className="mb-4">
                            <p className={`font-bold text-xl ${service.color}`}>{service.priceRange}</p>
                            {service.isHardware && <p className="text-[10px] text-slate-500">*Harga hardware fluktuatif</p>}
                        </div>

                        <p className="text-slate-300 text-sm mb-6 flex-grow">{service.description}</p>

                        <ul className="space-y-2 mb-6">
                            {service.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                                    <Icon name="check-circle-fill" className={`w-4 h-4 flex-shrink-0 ${service.color}`} />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <Button 
                            onClick={() => handleContact(service.ctaMessage)} 
                            variant="secondary" 
                            className="w-full justify-center border-slate-600 hover:bg-sky-600 hover:text-white hover:border-sky-600 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600"
                        >
                            <Icon name="chat" className="w-4 h-4" /> Hubungi via Email
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PremiumTab;

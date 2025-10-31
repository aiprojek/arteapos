import React from 'react';
import type { View } from '../types';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import { dataService } from '../services/dataService';
import { useUI } from '../context/UIContext';

interface HeaderProps {
    activeView: View;
    setActiveView: (view: View) => void;
    onMenuClick: () => void;
}

const viewTitles: Record<View, string> = {
    dashboard: 'Dashboard',
    pos: 'Point of Sale',
    products: 'Manajemen Produk',
    'raw-materials': 'Manajemen Bahan Baku',
    finance: 'Manajemen Keuangan',
    reports: 'Laporan Penjualan',
    settings: 'Pengaturan Aplikasi',
    help: 'Info & Bantuan'
};

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onMenuClick }) => {
    const { currentUser, logout, authSettings } = useAuth();
    const { showAlert } = useUI();
    const isAdmin = currentUser?.role === 'admin';

    const handleBackup = async () => {
        try {
            await dataService.exportData();
            showAlert({
                type: 'alert',
                title: 'Backup Berhasil',
                message: 'File backup data Anda telah berhasil diunduh. Simpan di tempat yang aman.'
            });
        } catch (error) {
            showAlert({
                type: 'alert',
                title: 'Backup Gagal',
                message: `Terjadi kesalahan saat membuat file backup: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    };

    return (
        <header className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center">
                <button onClick={onMenuClick} className="p-1 mr-3 md:hidden text-slate-300 hover:text-white" aria-label="Buka menu">
                    <Icon name="menu" className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-semibold text-white">{viewTitles[activeView]}</h1>
            </div>
            <div className="flex items-center gap-3">
                 {isAdmin && (
                    <Button
                        onClick={handleBackup}
                        variant="secondary"
                        size="sm"
                        className="p-2 aspect-square"
                        aria-label="Backup Data"
                        title="Backup Data"
                    >
                        <Icon name="download" className="w-5 h-5" />
                    </Button>
                 )}
                 {activeView !== 'help' && (
                    <Button 
                        onClick={() => setActiveView('help')} 
                        variant="secondary" 
                        size="sm" 
                        className="p-2 aspect-square"
                        aria-label="Bantuan"
                        title="Bantuan & Info"
                    >
                        <Icon name="help" className="w-5 h-5" />
                    </Button>
                )}
                {currentUser && authSettings.enabled && (
                    <>
                        <span className="text-sm text-slate-300 hidden sm:block">
                            Login sebagai: <span className="font-bold text-white">{currentUser.name}</span>
                        </span>
                        <Button onClick={logout} variant="secondary" size="sm" aria-label="Logout">
                            <Icon name="logout" className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;
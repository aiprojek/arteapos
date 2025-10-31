import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Icon from '../components/Icon';
import type { User } from '../types';

const LoginView: React.FC = () => {
    const { users, login, resetDefaultAdminPin } = useAuth();
    const { showAlert } = useUI();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    
    const logoClickCount = useRef(0);
    const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleKeyPress = (key: string) => {
        setError('');
        if (pin.length < 4) {
            setPin(pin + key);
        }
    };
    
    const handleLogin = async (user: User, currentPin: string) => {
        if (!user) return;
        const success = await login(user, currentPin);
        if (!success) {
            setError('PIN salah. Silakan coba lagi.');
            setTimeout(() => setPin(''), 500);
        }
    };

    useEffect(() => {
        if (pin.length === 4 && selectedUser) {
            handleLogin(selectedUser, pin);
        }
    }, [pin, selectedUser]);


    const handleBackspace = () => {
        setError('');
        setPin(pin.slice(0, -1));
    };

    
    const handleLogoClick = () => {
        logoClickCount.current += 1;
        if (logoClickTimer.current) {
            clearTimeout(logoClickTimer.current);
        }

        logoClickTimer.current = setTimeout(() => {
            logoClickCount.current = 0;
        }, 2000);

        if (logoClickCount.current === 5) {
            logoClickCount.current = 0;
            if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
            
            showAlert({
                type: 'confirm',
                title: 'Reset PIN Admin?',
                message: "Ini akan mereset PIN akun admin pertama ke '1111'. Gunakan ini hanya jika Anda lupa PIN Anda. Tidak ada data lain yang akan terpengaruh.",
                confirmText: 'Ya, Reset PIN',
                confirmVariant: 'danger',
                onConfirm: async () => {
                    const adminName = await resetDefaultAdminPin();
                    if(adminName) {
                        showAlert({
                            type: 'alert',
                            title: 'Reset Berhasil',
                            message: `PIN untuk pengguna '${adminName}' telah direset ke '1111'. Silakan login.`
                        });
                    } else {
                         showAlert({
                            type: 'alert',
                            title: 'Gagal Reset',
                            message: 'Tidak dapat menemukan akun admin untuk direset.'
                        });
                    }
                }
            });
        }
    }

    const KeypadButton: React.FC<{ value: string, onClick: () => void, children?: React.ReactNode }> = ({ value, onClick, children }) => (
        <button
            onClick={onClick}
            className="w-20 h-20 bg-slate-700 rounded-full text-2xl font-semibold text-white flex items-center justify-center transition-colors hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-[#347758]"
        >
            {children || value}
        </button>
    );

    const ProfileSelectionScreen = () => (
        <div className="w-full max-w-md text-center">
            <div onClick={handleLogoClick} className="inline-block cursor-pointer p-2" title="Ketuk 5x untuk reset PIN darurat">
                <Icon name="logo" className="w-16 h-16 text-[#52a37c] mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 mt-4">Pilih Profil Anda</h1>
            <p className="text-slate-400 mb-8">Siapa yang akan menggunakan kasir?</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                {users.map(user => (
                    <button key={user.id} onClick={() => setSelectedUser(user)} className="bg-slate-800 rounded-lg p-4 flex flex-col items-center justify-center gap-2 group hover:bg-[#347758] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-[#347758]">
                        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center group-hover:bg-[#52a37c]">
                            <Icon name="users" className="w-8 h-8 text-slate-400 group-hover:text-white" />
                        </div>
                        <p className="font-bold text-white truncate w-full">{user.name}</p>
                        <p className="text-xs text-slate-400 capitalize group-hover:text-green-100">{user.role}</p>
                    </button>
                ))}
            </div>
        </div>
    );
    
    const PinEntryScreen = () => (
         <div className="w-full max-w-xs text-center">
            <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                 Ganti Pengguna
            </button>
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto">
                <Icon name="users" className="w-8 h-8 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 mt-4">Halo, {selectedUser?.name}</h1>
            <p className="text-slate-400 mb-6">Masukkan PIN Anda untuk melanjutkan</p>

            <div className="flex justify-center items-center gap-3 h-12 mb-4">
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-colors ${i < pin.length ? 'bg-[#52a37c]' : 'bg-slate-700'} ${error ? 'animate-shake' : ''}`}></div>
                ))}
            </div>
            
            {error && <p className="text-red-400 text-sm mb-4 h-5">{error}</p>}
            {!error && <div className="h-5 mb-4"></div>}

            <div className="grid grid-cols-3 gap-4">
                {'123456789'.split('').map(num => (
                    <KeypadButton key={num} value={num} onClick={() => handleKeyPress(num)} />
                ))}
                <div className="w-20 h-20"></div> {/* Placeholder for alignment */}
                <KeypadButton value="0" onClick={() => handleKeyPress('0')} />
                <KeypadButton value="⌫" onClick={handleBackspace}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="w-7 h-7" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                    </svg>
                </KeypadButton>
            </div>
        </div>
    );
    
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900 p-4">
            {selectedUser ? <PinEntryScreen /> : <ProfileSelectionScreen />}
        </div>
    );
};

export default LoginView;
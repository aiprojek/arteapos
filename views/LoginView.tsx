
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { dataService } from '../services/dataService';
import { db } from '../services/db';
import { useAudit } from '../context/AuditContext'; // IMPORT AUDIT
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Button from '../components/Button';
import ShowcaseModal from '../components/ShowcaseModal'; 
import type { User } from '../types';

const LoginView: React.FC = () => {
    const { users, login, authSettings, overrideAdminPin } = useAuth(); 
    const { restoreData } = useData();
    const { showAlert, hideAlert } = useUI();
    const { receiptSettings } = useSettings();
    const { logAudit } = useAudit(); 

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    
    // Security: Randomized Keypad State
    const [keypadLayout, setKeypadLayout] = useState<string[]>(['1','2','3','4','5','6','7','8','9','0']);

    // Emergency & Security Challenge State
    const [isEmergencyModalOpen, setEmergencyModalOpen] = useState(false);
    const [isChallengeModalOpen, setChallengeModalOpen] = useState(false); 
    const [challengeAnswer, setChallengeAnswer] = useState(''); 
    const [challengeError, setChallengeError] = useState(''); 
    const [resetConfirmation, setResetConfirmation] = useState('');
    
    // Reset PIN State
    const [newAdminPin, setNewAdminPin] = useState('');
    const [isResetSuccess, setIsResetSuccess] = useState(false);
    
    // Showcase State
    const [isShowcaseOpen, setShowcaseOpen] = useState(false);

    // CCTV / Camera State
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState(false); // Track if camera failed

    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoClickCount = useRef(0);
    const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- RANDOMIZER LOGIC ---
    const shuffleKeypad = () => {
        const keys = ['1','2','3','4','5','6','7','8','9','0'];
        for (let i = keys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [keys[i], keys[j]] = [keys[j], keys[i]];
        }
        setKeypadLayout(keys);
    };

    // --- CAMERA INIT ---
    const startCamera = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError(true);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 300, height: 300, facingMode: 'user' }, 
                audio: false 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
                setCameraError(false);
            }
        } catch (e) {
            console.warn("Camera failed/denied in LoginView", e);
            setCameraError(true);
            setIsCameraActive(false);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setIsCameraActive(false);
        }
    }, []);

    // Start camera AND shuffle keys when entering PIN screen
    useEffect(() => {
        if (selectedUser) {
            startCamera();
            shuffleKeypad(); // SHUFFLE KEYS EVERY TIME USER IS SELECTED
        } else {
            stopCamera();
            setPin('');
            setError('');
        }
        return () => stopCamera();
    }, [selectedUser, startCamera, stopCamera]);

    const captureEvidence = (): string | undefined => {
        if (videoRef.current && canvasRef.current && isCameraActive) {
            try {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (context) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    return canvas.toDataURL('image/jpeg', 0.5); 
                }
            } catch (e) {
                console.error("Failed to capture login evidence", e);
            }
        }
        return undefined;
    };

    const handleKeyPress = (key: string) => {
        setError('');
        if (pin.length < 4) {
            setPin(pin + key);
        }
    };
    
    const handleLogin = async (user: User, currentPin: string) => {
        if (!user) return;

        // --- SECURITY CHECK: BRANCH VALIDATION ---
        const currentStoreId = receiptSettings.storeId || '';
        if (user.role !== 'admin' && user.assignedBranch && user.assignedBranch !== 'all') {
            const assigned = user.assignedBranch.trim().toUpperCase();
            const current = currentStoreId.trim().toUpperCase();
            
            if (assigned !== current) {
                setError(`Akses Ditolak. Akun ini hanya untuk cabang ${user.assignedBranch}.`);
                setTimeout(() => setPin(''), 500);
                return;
            }
        }
        
        const success = await login(user, currentPin);
        if (success) {
            // --- SECURITY CHECK: CAPTURE PHOTO OR METADATA ---
            const evidence = captureEvidence();
            
            let auditDetail = 'Login sukses ke sistem';
            if (evidence) {
                auditDetail += ' (Disertai Foto)';
            } else {
                // If no camera, record Device Info instead
                const ua = navigator.userAgent;
                const platform = navigator.platform;
                auditDetail += ` (No Camera - Device: ${platform})`;
            }

            // Log ke Audit
            logAudit(user, 'LOGIN', auditDetail, undefined, evidence);

            showAlert({
                type: 'alert',
                title: 'Login Berhasil',
                message: (
                    <div className="text-left space-y-2">
                        <p>Selamat datang, <strong>{user.name}</strong>.</p>
                        {evidence ? (
                            <div className="bg-green-900/20 border-l-4 border-green-500 p-2 rounded text-xs text-green-200">
                                <strong>📷 CCTV Aktif:</strong><br/>
                                Wajah Anda telah direkam untuk keamanan akun ini. Selamat bekerja!
                            </div>
                        ) : (
                             <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-2 rounded text-xs text-yellow-200">
                                <strong>🛡️ Mode Keamanan Perangkat:</strong><br/>
                                Kamera tidak terdeteksi. Sistem menggunakan Keypad Acak & Identifikasi Perangkat untuk mencegah akses ilegal.
                            </div>
                        )}
                    </div>
                )
            });
            stopCamera();
        } else {
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
            setChallengeError('');
            setChallengeAnswer('');
            setNewAdminPin('');
            setIsResetSuccess(false);
            setChallengeModalOpen(true);
        }
    }

    const verifySecurityChallenge = () => {
        const expectedAnswer = authSettings.securityAnswer || 'artea'; 
        
        if (challengeAnswer.trim().toLowerCase() === expectedAnswer.toLowerCase()) {
            setChallengeModalOpen(false);
            setEmergencyModalOpen(true); 
        } else {
            setChallengeError('Jawaban salah. Akses ditolak.');
        }
    };

    const handleForgotPin = () => {
        const wa = receiptSettings?.adminWhatsapp;
        const tg = receiptSettings?.adminTelegram;
        
        if (!wa && !tg) {
            showAlert({
                type: 'alert',
                title: 'Hubungi Admin',
                message: (
                    <div className="text-left space-y-2">
                        <p>Silakan hubungi pemilik toko secara langsung untuk reset PIN.</p>
                        <p className="text-xs text-slate-400">Jika Anda adalah Admin/Pemilik dan lupa PIN, ketuk logo aplikasi di atas sebanyak 5 kali untuk menu pemulihan.</p>
                    </div>
                )
            });
            return;
        }

        const userName = selectedUser?.name || 'Staf';
        const messageText = `Halo Admin, saya *${userName}* lupa PIN akses kasir di Artea POS. Mohon bantuannya untuk reset PIN saya. Terima kasih.`;
        const encodedMsg = encodeURIComponent(messageText);

        const formatWA = (num: string) => {
            const clean = num.replace(/\D/g, '');
            if (clean.startsWith('0')) return `62${clean.slice(1)}`;
            if (clean.startsWith('62')) return clean;
            return `62${clean}`; 
        };

        const handleContactClick = (url: string) => {
            window.open(url, '_blank');
            hideAlert();
        };

        showAlert({
            type: 'alert',
            title: 'Hubungi Admin',
            message: (
                <div className="text-left space-y-4">
                    <p className="text-slate-300 text-sm">Klik tombol di bawah untuk mengirim pesan permintaan reset PIN ke Admin:</p>
                    <div className="grid gap-3">
                        {wa && (
                            <button onClick={() => handleContactClick(`https://wa.me/${formatWA(wa)}?text=${encodedMsg}`)} className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white py-3 rounded-lg font-bold transition-colors w-full">
                                <Icon name="whatsapp" className="w-5 h-5" /> Chat via WhatsApp
                            </button>
                        )}
                        {tg && (
                            <button onClick={() => handleContactClick(`https://t.me/${tg.replace('@', '')}?text=${encodedMsg}`)} className="flex items-center justify-center gap-2 bg-[#0088cc] hover:bg-[#0077b5] text-white py-3 rounded-lg font-bold transition-colors w-full">
                                <Icon name="telegram" className="w-5 h-5" /> Chat via Telegram
                            </button>
                        )}
                    </div>
                </div>
            ),
            confirmText: 'Tutup'
        });
    };

    const handleSaveNewPin = async () => {
        if (newAdminPin.length !== 4) {
            alert("PIN harus 4 digit angka.");
            return;
        }
        
        const success = await overrideAdminPin(newAdminPin);
        if (success) {
            setIsResetSuccess(true);
            setTimeout(() => {
                setEmergencyModalOpen(false);
                setPin('');
                setSelectedUser(null);
            }, 2000);
        } else {
            alert("Gagal mengubah PIN. Pastikan ada user Admin.");
        }
    };

    const handleFactoryReset = async () => {
        if (resetConfirmation !== 'RESET') return;
        
        try {
            await (db as any).delete(); 
            window.location.reload(); 
        } catch (e) {
            console.error("Factory Reset Failed", e);
            alert("Gagal melakukan reset. Coba hapus cache browser secara manual.");
        }
    };

    const handleEmergencyRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        try {
            const backupData = await dataService.importData(file);
            await restoreData(backupData);
            setEmergencyModalOpen(false);
            showAlert({ type: 'alert', title: 'Berhasil', message: 'Database berhasil dipulihkan dari backup. Silakan login menggunakan PIN yang ada pada file backup tersebut.' });
        } catch (e: any) {
            alert(`Gagal restore: ${e.message}`);
        }
    };

    const handleEnterDisplayMode = () => {
        window.location.search = '?view=customer-display';
    };

    const handleEnterKitchenMode = () => {
        window.location.search = '?view=kitchen-display';
    };

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
            <div onClick={handleLogoClick} className="inline-block p-2 cursor-pointer transition-transform active:scale-95" title="Ketuk 5x untuk menu darurat">
                <Icon name="logo" className="w-16 h-16 text-[#52a37c] mx-auto" />
            </div>
            
            <button 
                onClick={() => setShowcaseOpen(true)}
                className="mx-auto mt-2 mb-6 text-xs text-[#52a37c] bg-[#52a37c]/10 px-3 py-1.5 rounded-full hover:bg-[#52a37c]/20 transition-colors flex items-center gap-1"
            >
                <Icon name="star" className="w-3 h-3"/> Lihat Fitur Unggulan
            </button>

            <h1 className="text-2xl font-bold text-white mb-2">Pilih Profil Anda</h1>
            <p className="text-slate-400 mb-8">Siapa yang akan menggunakan kasir?</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto mb-8">
                {users.map(user => (
                    <button key={user.id} onClick={() => setSelectedUser(user)} className="bg-slate-800 rounded-lg p-4 flex flex-col items-center justify-center gap-2 group hover:bg-[#347758] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-[#347758]">
                        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center group-hover:bg-[#52a37c]">
                            <Icon name="users" className="w-8 h-8 text-slate-400 group-hover:text-white" />
                        </div>
                        <p className="font-bold text-white truncate w-full">{user.name}</p>
                        <p className="text-xs text-slate-400 capitalize group-hover:text-green-100">{user.role}</p>
                        {user.assignedBranch && user.assignedBranch !== 'all' && (
                             <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded text-slate-300">{user.assignedBranch}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="border-t border-slate-800 pt-6 flex gap-4 justify-center">
                <button 
                    onClick={handleEnterDisplayMode}
                    className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition-colors text-sm"
                >
                    <Icon name="shop" className="w-4 h-4"/> Mode Pelanggan
                </button>
                <div className="w-px h-5 bg-slate-700"></div>
                <button 
                    onClick={handleEnterKitchenMode}
                    className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition-colors text-sm"
                >
                    <Icon name="tools" className="w-4 h-4"/> Mode Dapur
                </button>
            </div>
        </div>
    );
    
    const PinEntryScreen = () => (
         <div className="w-full max-w-xs text-center">
            <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                 Ganti Pengguna
            </button>
            
            {/* CAMERA / SECURITY PREVIEW */}
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-700 overflow-hidden relative">
                {isCameraActive ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                ) : (
                    <Icon name="lock" className="w-10 h-10 text-slate-500" />
                )}
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Status Indicator */}
                {isCameraActive && (
                    <div className="absolute bottom-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-white" title="Merekam"></div>
                )}
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">Halo, {selectedUser?.name}</h1>
            
            {/* Security Notice */}
            <p className={`text-xs mb-4 uppercase tracking-widest font-bold ${cameraError ? 'text-yellow-500 animate-pulse' : 'text-slate-500'}`}>
                {isCameraActive ? 'KAMERA PENGAWAS AKTIF' : '⚠️ Anti-Spy Keypad Aktif'}
            </p>

            <div className="flex justify-center items-center gap-3 h-12 mb-2">
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-colors ${i < pin.length ? 'bg-[#52a37c]' : 'bg-slate-700'} ${error ? 'animate-shake' : ''}`}></div>
                ))}
            </div>
            
            <div className="h-8 mb-4 flex items-center justify-center">
                {error ? (
                    <p className="text-red-400 text-sm">{error}</p>
                ) : (
                    <button 
                        onClick={handleForgotPin}
                        className="text-xs text-slate-500 hover:text-slate-300 underline decoration-slate-600 underline-offset-2 transition-colors"
                    >
                        Lupa PIN?
                    </button>
                )}
            </div>

            {/* RANDOMIZED KEYPAD GRID */}
            <div className="grid grid-cols-3 gap-4">
                {/* Render digits 0-8 from shuffled array */}
                {keypadLayout.slice(0, 9).map(num => (
                    <KeypadButton key={num} value={num} onClick={() => handleKeyPress(num)} />
                ))}
                
                {/* Empty slot */}
                <div className="w-20 h-20"></div> 
                
                {/* Last digit (index 9) */}
                <KeypadButton value={keypadLayout[9]} onClick={() => handleKeyPress(keypadLayout[9])} />
                
                <KeypadButton value="⌫" onClick={handleBackspace}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="w-7 h-7" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                    </svg>
                </KeypadButton>
            </div>
            
            {cameraError && (
                 <p className="text-[10px] text-slate-500 mt-4 max-w-[200px] mx-auto italic">
                    Posisi angka diacak untuk mencegah intip PIN. Harap perhatikan layar.
                </p>
            )}
        </div>
    );
    
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900 p-4">
            {selectedUser ? <PinEntryScreen /> : <ProfileSelectionScreen />}
            
            <ShowcaseModal isOpen={isShowcaseOpen} onClose={() => setShowcaseOpen(false)} />

            <Modal isOpen={isChallengeModalOpen} onClose={() => setChallengeModalOpen(false)} title="Tantangan Keamanan">
                <div className="space-y-4">
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400 mb-1">Pertanyaan Keamanan:</p>
                        <p className="text-white font-bold text-lg">{authSettings.securityQuestion || 'Apa nama aplikasi ini?'}</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Jawaban Anda</label>
                        <input 
                            type="text"
                            value={challengeAnswer}
                            onChange={e => setChallengeAnswer(e.target.value)}
                            onKeyDown={e => { if(e.key === 'Enter') verifySecurityChallenge() }}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-[#347758] outline-none"
                            placeholder="Ketik jawaban..."
                            autoFocus
                        />
                        {challengeError && <p className="text-red-400 text-sm mt-2">{challengeError}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setChallengeModalOpen(false)} className="flex-1">Batal</Button>
                        <Button onClick={verifySecurityChallenge} className="flex-1">Verifikasi</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isEmergencyModalOpen} onClose={() => { setEmergencyModalOpen(false); setResetConfirmation(''); }} title="Pemulihan Akun & Data">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg">
                        <h4 className="font-bold text-green-400 text-sm flex items-center gap-2 mb-2">
                            <Icon name="lock" className="w-5 h-5"/> Atur PIN Admin Baru
                        </h4>
                        <p className="text-xs text-slate-300 mb-3">
                            Ubah PIN Admin saat ini tanpa menghapus data penjualan atau produk.
                        </p>
                        
                        {isResetSuccess ? (
                            <div className="text-center p-2 bg-green-600 text-white rounded font-bold animate-pulse">
                                PIN Berhasil Diubah!
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    maxLength={4}
                                    placeholder="4 Digit PIN Baru" 
                                    value={newAdminPin}
                                    onChange={e => setNewAdminPin(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-center tracking-widest"
                                />
                                <Button onClick={handleSaveNewPin} disabled={newAdminPin.length !== 4}>Simpan</Button>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-700 my-2"></div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Opsi Lanjutan (Hati-hati)</p>

                    <div className="space-y-3">
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <h5 className="font-bold text-white text-sm mb-1">Restore Backup</h5>
                            <p className="text-xs text-slate-400 mb-3">
                                Timpa data saat ini dengan file backup <code>.json</code>.
                            </p>
                            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full" size="sm">
                                <Icon name="upload" className="w-4 h-4"/> Pilih File Backup
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleEmergencyRestore} className="hidden" accept=".json" />
                        </div>

                        <div className="bg-slate-800 p-3 rounded-lg border border-red-900/50">
                            <h5 className="font-bold text-white text-sm mb-1">Factory Reset (Hapus Data)</h5>
                            <p className="text-xs text-slate-400 mb-3">
                                Menghapus SEMUA data dan reset ke pengaturan awal.
                            </p>
                            
                            <label className="block text-xs font-bold text-slate-300 mb-1">Ketik "RESET" untuk konfirmasi:</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={resetConfirmation}
                                    onChange={e => setResetConfirmation(e.target.value.toUpperCase())}
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                    placeholder="RESET"
                                />
                                <Button 
                                    onClick={handleFactoryReset} 
                                    variant="danger" 
                                    disabled={resetConfirmation !== 'RESET'} 
                                    size="sm"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center pt-2">
                        <button onClick={() => setEmergencyModalOpen(false)} className="text-slate-500 text-sm hover:text-white">Tutup</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LoginView;

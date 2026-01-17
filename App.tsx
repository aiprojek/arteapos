
import React, { useState, useEffect } from 'react';
import AppProviders from './context/AppProviders';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { useUI } from './context/UIContext';
import { useProduct } from './context/ProductContext';
import { useCart } from './context/CartContext';
import type { View } from './types';
import POSView from './views/POSView';
import ProductsView from './views/ProductsView';
import RawMaterialsView from './views/RawMaterialsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import LoginView from './views/LoginView';
import FinanceView from './views/FinanceView';
import HelpView from './views/HelpView';
import Header from './components/Header';
import Icon from './components/Icon';
import AlertModal from './components/AlertModal';
import DashboardView from './views/DashboardView';
import OnboardingModals from './components/OnboardingModals'; 

const AppContent = () => {
  const { currentUser } = useAuth();
  const { findProductByBarcode, inventorySettings } = useProduct();
  const { addToCart } = useCart();
  const { showAlert } = useUI();
  
  // ROLE CHECK
  const isViewer = currentUser?.role === 'viewer';
  const isStaff = currentUser?.role === 'staff';
  const isManagement = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  // Initialize view based on role
  const [activeView, setActiveView] = useState<View>(() => {
      if (isStaff) return 'pos';
      return 'dashboard'; // Admin, Manager, and Viewer default to dashboard
  });
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // --- KODULAR / NATIVE BRIDGE LISTENER (PENTING UNTUK ANDROID) ---
  // Kode ini menangkap hasil scan yang dikirim dari Kodular via EvaluateJS
  useEffect(() => {
      const handleNativeScan = (e: any) => {
          // Event ini dipicu oleh blok Kodular: 
          // call CustomWebView.EvaluateJS("window.dispatchEvent(new CustomEvent('native-scan-result', { detail: 'HASIL_SCAN' }));")
          const barcode = e.detail;
          if (!barcode) return;

          console.log("Menerima Scan dari Native:", barcode);

          const product = findProductByBarcode(barcode);
          if (product) {
              addToCart(product);
              // Opsional: Bunyi beep atau feedback visual
          } else {
              showAlert({ 
                  type: 'alert', 
                  title: 'Produk Tidak Dikenal', 
                  message: `Barcode "${barcode}" tidak ditemukan di database.` 
              });
          }
      };

      window.addEventListener('native-scan-result', handleNativeScan);
      
      // Cleanup listener saat komponen di-unmount
      return () => window.removeEventListener('native-scan-result', handleNativeScan);
  }, [findProductByBarcode, addToCart, showAlert]);
  
  // --- HARDWARE BARCODE SCANNER LOGIC (KEYBOARD EMULATION) ---
  useEffect(() => {
    // Disable scanner for Viewers (they don't do POS)
    if (isViewer) return;

    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
        // SAFETY CHECK: Jangan jalankan logic scanner jika user sedang mengetik di Input/Textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const currentTime = Date.now();
        
        // Barcode scanner hardware biasanya mengetik sangat cepat (< 50ms antar tombol)
        if (currentTime - lastKeyTime > 100) {
            buffer = ""; // Reset jika user mengetik manual lambat (bukan scanner)
        }

        if (e.key === 'Enter') {
            // Scanner biasanya mengirim Enter di akhir string
            if (buffer.length > 2) {
                // Cek apakah buffer berisi barcode produk valid
                const product = findProductByBarcode(buffer);
                if (product) {
                    addToCart(product);
                    // Feedback visual kecil (opsional) atau suara bisa ditambahkan di sini
                } else if (activeView === 'pos') {
                    // Jika di halaman POS tapi produk tidak ketemu, beri peringatan
                    showAlert({ 
                        type: 'alert', 
                        title: 'Produk Tidak Dikenal', 
                        message: `Barcode "${buffer}" tidak ditemukan di database.` 
                    });
                }
                buffer = "";
            }
        } else if (e.key.length === 1) {
            // Hanya tangkap karakter yang bisa dicetak
            buffer += e.key;
        }
        
        lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [findProductByBarcode, addToCart, activeView, showAlert, isViewer]);

  const renderView = () => {
    // Security check: If viewer tries to access restricted pages manually or via state persistence
    if (isViewer && ['pos', 'products', 'raw-materials', 'finance', 'settings'].includes(activeView)) {
        return <DashboardView />;
    }

    const views = {
      dashboard: <DashboardView />, 
      pos: <POSView />, 
      products: <ProductsView />,
      'raw-materials': <RawMaterialsView />, 
      finance: <FinanceView />, 
      reports: <ReportsView />, 
      settings: <SettingsView />, 
      help: <HelpView />
    };
    return views[activeView] || <POSView />;
  };

  const NavButton = ({ view, icon, label }: { view: View, icon: any, label: string }) => (
      <button 
        onClick={() => {setActiveView(view); setSidebarOpen(false)}} 
        className={`w-full flex gap-3 p-3 rounded-lg mb-2 transition-colors ${activeView === view ? 'bg-[#347758] text-white font-medium' : 'hover:bg-slate-700 text-slate-300 hover:text-white'}`}
      >
        <Icon name={icon} /> {label}
      </button>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-900 text-slate-100">
      <OnboardingModals setActiveView={setActiveView} />
      {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-[90] md:hidden" />}
      
      {/* FIXED: Z-INDEX 100 to ensure it is always on top of sticky headers (z-20) */}
      <nav className={`fixed md:relative h-full w-64 bg-slate-800 p-4 z-[100] transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 border-r border-slate-700 overflow-y-auto`}>
         <div className="flex items-center gap-2 mb-8 mt-2 px-2">
            <Icon name="logo" className="w-8 h-8 text-[#52a37c]" />
            <h1 className="text-xl font-bold tracking-tight">Artea POS</h1>
         </div>
         
         <div className="space-y-1">
             {/* POS: Hidden for Viewer */}
             {!isViewer && <NavButton view="pos" icon="cash" label="Kasir (POS)" />}
             
             {/* Management Section: Visible for Admin, Manager, and Viewer */}
             {(isManagement || isViewer) && (
                <>
                    <div className="my-4 border-t border-slate-700/50 mx-2"></div>
                    <p className="px-3 text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Manajemen</p>
                    
                    <NavButton view="dashboard" icon="trending-up" label="Dashboard" />
                    
                    {/* Operational Menus: Hidden for Viewer */}
                    {!isViewer && <NavButton view="products" icon="products" label="Produk" />}
                    
                    {!isViewer && inventorySettings.enabled && inventorySettings.trackIngredients && (
                        <NavButton view="raw-materials" icon="boxes" label="Bahan Baku" />
                    )}
                    
                    <NavButton view="reports" icon="reports" label="Laporan" />
                </>
             )}

             <div className="my-4 border-t border-slate-700/50 mx-2"></div>
             <p className="px-3 text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Sistem</p>
             
             {/* Finance: Hidden for Viewer */}
             {!isViewer && <NavButton view="finance" icon="finance" label="Keuangan" />}
             
             {/* Settings: Hidden for Viewer */}
             {isManagement && <NavButton view="settings" icon="settings" label="Pengaturan" />}
             
             <NavButton view="help" icon="help" label="Bantuan" />
         </div>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden relative z-0">
        <div className="flex-1 flex flex-col min-h-0">
            <Header activeView={activeView} setActiveView={setActiveView} onMenuClick={() => setSidebarOpen(true)} />
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900">
                {renderView()}
            </div>
        </div>
      </main>
    </div>
  );
};

const RootNavigator = () => {
  const { currentUser, authSettings } = useAuth();
  const { alertState, hideAlert } = useUI();

  return (
    <>
      {authSettings.enabled && !currentUser ? <LoginView /> : <AppContent />}
      <AlertModal isOpen={alertState.isOpen} onClose={hideAlert} {...alertState} />
    </>
  );
};

const App = () => (
  <AppProviders>
    <RootNavigator />
  </AppProviders>
);

export default App;

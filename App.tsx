
import React, { useState, useEffect } from 'react';
import AppProviders from './context/AppProviders';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { useUI } from './context/UIContext';
import { useProduct } from './context/ProductContext';
import { useIdleTimer } from './hooks/useIdleTimer'; // Import Auto Lock
import type { View } from './types';
import POSView from './views/POSView';
import ProductsView from './views/ProductsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import RawMaterialsView from './views/RawMaterialsView';
import LoginView from './views/LoginView';
import FinanceView from './views/FinanceView';
import HelpView from './views/HelpView';
import Header from './components/Header';
import Icon from './components/Icon';
import AlertModal from './components/AlertModal';
import DashboardView from './views/DashboardView';
import OnboardingModals from './components/OnboardingModals'; 
import { App as CapacitorApp } from '@capacitor/app';

// --- Hook untuk Mencegah Back Button / Refresh ---
const usePreventNavigation = (shouldPrevent: boolean, setActiveView: (v: View) => void, activeView: View, currentUser: any) => {
  useEffect(() => {
    if (!shouldPrevent) return;

    // Browser/Desktop Handling
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; 
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.pathname);
    };

    // Android Hardware Back Button Handling
    const handleAndroidBack = async () => {
        // Jika sedang di sub-menu (bukan dashboard/kasir), kembali ke menu utama
        if (activeView !== 'pos' && activeView !== 'dashboard') {
            if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
                setActiveView('dashboard');
            } else {
                setActiveView('pos');
            }
        } else {
            // Jika di root menu, konfirmasi keluar
            const confirm = window.confirm("Keluar dari aplikasi?");
            if (confirm) {
                CapacitorApp.exitApp();
            }
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    
    // Capacitor Listener
    const backListener = CapacitorApp.addListener('backButton', handleAndroidBack);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      backListener.then(h => h.remove());
    };
  }, [shouldPrevent, activeView, setActiveView, currentUser]);
};

const Nav = ({ activeView, setActiveView, onNavigate }: { 
  activeView: View, 
  setActiveView: (view: View) => void,
  onNavigate: () => void 
}) => {
  const { currentUser } = useAuth();
  const { inventorySettings } = useProduct();
  const isManagement = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const handleNavigation = (view: View) => {
    setActiveView(view);
    onNavigate(); 
  };

  const NavItem = ({ view, label, icon }: { view: View; label: string; icon: 'cash' | 'products' | 'reports' | 'settings' | 'ingredients' | 'finance' | 'book' | 'award' }) => (
    <button
      onClick={() => handleNavigation(view)}
      className={`flex flex-row items-center justify-start gap-2 p-3 w-full text-sm rounded-lg transition-colors ${
        activeView === view
          ? 'bg-[#347758] text-white'
          : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
      }`}
    >
      <Icon name={icon} className="w-6 h-6" />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <div className="flex items-center gap-2 px-2 pb-4">
        <Icon name="logo" className="w-8 h-8 text-[#52a37c]" />
        <h1 className="text-xl font-bold text-white">Artea POS</h1>
      </div>
      
      {isManagement && <NavItem view="dashboard" label="Dashboard" icon="reports" />}
      <NavItem view="pos" label="Kasir" icon="cash" />
      <NavItem view="finance" label="Keuangan" icon="finance" />
      
      {isManagement && (
        <>
          <NavItem view="products" label="Produk" icon="products" />
          {inventorySettings.enabled && <NavItem view="raw-materials" label="Bahan Baku" icon="ingredients" />}
          <NavItem view="reports" label="Laporan" icon="reports" />
          <NavItem view="settings" label="Pengaturan" icon="settings" />
        </>
      )}
    </>
  );
}


const AppContent = () => {
  const { currentUser } = useAuth();
  const isManagement = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const [activeView, setActiveView] = useState<View>(isManagement ? 'dashboard' : 'pos');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // ACTIVATE AUTO LOCK (10 Minutes)
  useIdleTimer(10 * 60 * 1000); 
  
  // PREVENT ACCIDENTAL EXIT & HANDLE ANDROID BACK
  usePreventNavigation(true, setActiveView, activeView, currentUser);
  
  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const renderView = () => {
    if (isManagement) {
      switch (activeView) {
        case 'dashboard': return <DashboardView />;
        case 'pos': return <POSView />;
        case 'products': return <ProductsView />;
        case 'raw-materials': return <RawMaterialsView />;
        case 'finance': return <FinanceView />;
        case 'reports': return <ReportsView />;
        case 'settings': return <SettingsView />;
        case 'help': return <HelpView />;
        default: return <DashboardView />;
      }
    }
    // For staff
    switch (activeView) {
        case 'pos': return <POSView />;
        case 'finance': return <FinanceView />;
        case 'help': return <HelpView />;
        default: return <POSView />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans bg-slate-900 text-slate-100">
      <OnboardingModals setActiveView={setActiveView} />

      {isSidebarOpen && (
        <div 
          onClick={closeSidebar} 
          className="fixed inset-0 bg-black bg-opacity-60 z-20 md:hidden" 
          aria-hidden="true"
        />
      )}

      <nav className={`
        flex flex-col w-64 bg-slate-800 p-4 space-y-2 border-r border-slate-700
        fixed md:relative h-full z-30 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <Nav activeView={activeView} setActiveView={setActiveView} onNavigate={closeSidebar} />
      </nav>
      
      <main className="flex-1 flex flex-col overflow-hidden order-first md:order-last">
        <Header activeView={activeView} setActiveView={setActiveView} onMenuClick={toggleSidebar} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-6">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

const AuthGate = () => {
  const { currentUser, authSettings } = useAuth();
  
  return (authSettings.enabled && !currentUser) ? <LoginView /> : <AppContent />;
}

const AppInitializer: React.FC = () => {
  const { isDataLoading } = useData();
  const { alertState, hideAlert } = useUI();
  
  if (isDataLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
            <Icon name="logo" className="w-16 h-16 text-[#52a37c] animate-pulse" />
            <p className="text-lg text-slate-400">Memuat basis data...</p>
            <p className="text-sm text-slate-500 max-w-xs">Harap tunggu sebentar. Jika ini pertama kalinya, proses mungkin sedikit lebih lama.</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <AuthGate />
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        onConfirm={alertState.onConfirm}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        confirmVariant={alertState.confirmVariant}
      />
    </>
  );
}

const App: React.FC = () => (
  <AppProviders>
    <AppInitializer />
  </AppProviders>
);


export default App;

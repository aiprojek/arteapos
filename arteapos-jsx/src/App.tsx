import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
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

const Nav: React.FC<{ 
  activeView: View, 
  setActiveView: (view: View) => void,
  onNavigate: () => void 
}> = ({ activeView, setActiveView, onNavigate }) => {
  const { inventorySettings, currentUser } = useAppContext();
  const isAdmin = currentUser?.role === 'admin';

  const handleNavigation = (view: View) => {
    setActiveView(view);
    onNavigate(); // This will close the sidebar on mobile
  };

  const NavItem: React.FC<{ view: View; label: string; icon: 'cash' | 'products' | 'reports' | 'settings' | 'ingredients' | 'finance' }> = ({ view, label, icon }) => (
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
      <NavItem view="pos" label="Kasir" icon="cash" />
      {isAdmin && (
        <>
          <NavItem view="products" label="Produk" icon="products" />
          {inventorySettings.enabled && <NavItem view="raw-materials" label="Bahan Baku" icon="ingredients" />}
          <NavItem view="finance" label="Keuangan" icon="finance" />
          <NavItem view="reports" label="Laporan" icon="reports" />
          <NavItem view="settings" label="Pengaturan" icon="settings" />
        </>
      )}
    </>
  );
}


const AppContent: React.FC = () => {
  const { currentUser } = useAppContext();
  const [activeView, setActiveView] = useState<View>('pos');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  useState(() => {
    if (currentUser?.role === 'staff') {
      setActiveView('pos');
    }
  });

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const renderView = () => {
    if (currentUser?.role === 'admin') {
      switch (activeView) {
        case 'pos': return <POSView />;
        case 'products': return <ProductsView />;
        case 'raw-materials': return <RawMaterialsView />;
        case 'finance': return <FinanceView />;
        case 'reports': return <ReportsView />;
        case 'settings': return <SettingsView />;
        case 'help': return <HelpView />;
        default: return <POSView />;
      }
    }
    switch (activeView) {
        case 'pos': return <POSView />;
        case 'help': return <HelpView />;
        default: return <POSView />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans bg-slate-900">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          onClick={closeSidebar} 
          className="fixed inset-0 bg-black bg-opacity-60 z-20 md:hidden" 
          aria-hidden="true"
        />
      )}

      {/* Unified Sidebar */}
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

const AuthGate: React.FC = () => {
  const { currentUser, authSettings, alertState, hideAlert } = useAppContext();
  
  return (
    <>
      {authSettings.enabled && !currentUser ? <LoginView /> : <AppContent />}
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
  <AppProvider>
    <AuthGate />
  </AppProvider>
);


export default App;

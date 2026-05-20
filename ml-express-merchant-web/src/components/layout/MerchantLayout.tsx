import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MerchantOrderShell from './MerchantOrderShell';
import '../../styles/merchantShell.css';

interface MerchantLayoutProps {
  children: React.ReactNode;
  currentUser: any;
  onLogout: () => void;
}

const MerchantLayout: React.FC<MerchantLayoutProps> = ({ children, currentUser, onLogout }) => {
  const storeId = currentUser?.store_id || currentUser?.id || '';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <MerchantOrderShell storeId={storeId}>
      <div className="merchant-shell">
        <button
          type="button"
          className="merchant-shell__menu-btn"
          aria-label="Menu"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          ☰
        </button>
        <div
          className={`merchant-shell__backdrop${sidebarOpen ? ' merchant-shell__backdrop--open' : ''}`}
          aria-hidden={!sidebarOpen}
          onClick={() => setSidebarOpen(false)}
        />
        <div className={`merchant-shell__sidebar${sidebarOpen ? ' merchant-shell__sidebar--open' : ''}`}>
          <Sidebar
            currentUser={currentUser}
            onLogout={onLogout}
            onNavigate={() => setSidebarOpen(false)}
          />
        </div>
        <main className="merchant-shell__main">
          <div className="merchant-shell__inner">{children}</div>
        </main>
      </div>
    </MerchantOrderShell>
  );
};

export default MerchantLayout;

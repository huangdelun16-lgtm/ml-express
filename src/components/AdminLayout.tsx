import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useResponsive } from '../hooks/useResponsive';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isMobile } = useResponsive();

  const sidebarWidth = isMobile ? '0' : (isCollapsed ? '80px' : '260px');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: sidebarWidth,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          width: `calc(100% - ${sidebarWidth})`
        }}
      >
        <main style={{ flex: 1, position: 'relative' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;


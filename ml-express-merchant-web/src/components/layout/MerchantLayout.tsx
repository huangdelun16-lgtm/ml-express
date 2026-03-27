import React from 'react';
import Sidebar from './Sidebar';

interface MerchantLayoutProps {
  children: React.ReactNode;
  currentUser: any;
  onLogout: () => void;
}

const MerchantLayout: React.FC<MerchantLayoutProps> = ({ children, currentUser, onLogout }) => {
  return (
    <div style={layoutStyle}>
      <Sidebar currentUser={currentUser} onLogout={onLogout} />
      <main style={mainContentStyle}>
        <div style={innerContainerStyle}>
          {children}
        </div>
      </main>
    </div>
  );
};

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: '#0a0f1e', // 极致深蓝黑，更具高级感
  color: 'white',
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  marginLeft: '260px', // 避开固定的侧边栏
  padding: '3.5rem 3rem', // 增加顶部间距，彻底拉开与侧边栏品牌名的距离
  minHeight: '100vh',
  background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.05) 0%, transparent 40%)',
};

const innerContainerStyle: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  animation: 'fadeIn 0.5s ease-out',
};

export default MerchantLayout;

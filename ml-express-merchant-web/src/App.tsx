import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import StoreProductsPage from './pages/StoreProductsPage';
import TrackingPage from './pages/TrackingPage';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';

// 认证检查组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = localStorage.getItem('currentUser');
  const userType = localStorage.getItem('userType');
  
  if (!user || userType !== 'merchant') {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App" style={{ minHeight: '100vh', background: '#0f172a' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* 商家管理核心路由 */}
            <Route path="/" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            
            <Route path="/products" element={
              <ProtectedRoute>
                <StoreProductsPage />
              </ProtectedRoute>
            } />

            <Route path="/orders" element={
              <ProtectedRoute>
                <TrackingPage />
              </ProtectedRoute>
            } />

            {/* 默认跳转到首页 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;

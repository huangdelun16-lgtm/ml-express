import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import StoreProductsPage from './pages/StoreProductsPage';
import TrackingPage from './pages/TrackingPage';
import MerchantLayout from './components/layout/MerchantLayout';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';

// 认证检查组件
const ProtectedRoute = ({ children, currentUser, onLogout }: { children: React.ReactNode, currentUser: any, onLogout: () => void }) => {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <MerchantLayout currentUser={currentUser} onLogout={onLogout}>
      {children}
    </MerchantLayout>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('ml-express-customer');
    const userType = localStorage.getItem('userType');
    if (user && userType === 'merchant') {
      setCurrentUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    localStorage.removeItem('userType');
    setCurrentUser(null);
  };

  const handleLogin = (user: any) => {
    setCurrentUser(user);
  };

  if (loading) return null;

  return (
    <LanguageProvider>
      <Router>
        <div className="App" style={{ minHeight: '100vh', background: '#0a0f1e' }}>
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            
            {/* 商家管理核心路由 - 统一包装在 MerchantLayout 中 */}
            <Route path="/" element={
              <ProtectedRoute currentUser={currentUser} onLogout={handleLogout}>
                <ProfilePage />
              </ProtectedRoute>
            } />
            
            <Route path="/products" element={
              <ProtectedRoute currentUser={currentUser} onLogout={handleLogout}>
                <StoreProductsPage />
              </ProtectedRoute>
            } />

            <Route path="/orders" element={
              <ProtectedRoute currentUser={currentUser} onLogout={handleLogout}>
                <TrackingPage />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;

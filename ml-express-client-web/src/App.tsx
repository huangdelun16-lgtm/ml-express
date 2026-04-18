import React, { Suspense, lazy, useEffect } from 'react';
import LoggerService from './services/LoggerService';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { LanguageProvider } from './contexts/LanguageContext';
import { CartProvider } from './contexts/CartContext';
import './App.css';

const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DeleteAccountPage = lazy(() => import('./pages/DeleteAccountPage'));
const CityMallPage = lazy(() => import('./pages/CityMallPage'));
const StoreProductsPage = lazy(() => import('./pages/StoreProductsPage'));
const CartPage = lazy(() => import('./pages/CartPage'));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontSize: '1rem',
        fontWeight: 600
      }}
    >
      Loading…
    </div>
  );
}

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    LoggerService.error('应用错误:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
          color: 'white',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ marginBottom: '1rem' }}>页面加载出错</h1>
          <p style={{ marginBottom: '2rem', opacity: 0.9 }}>
            抱歉，页面遇到了问题。请刷新页面重试。
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              padding: '1rem 2rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              backdropFilter: 'blur(10px)'
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
/** 客户端 Web 仅服务会员；若本地误存商家会话则清除并刷新，避免与商家端混淆 */
function ClientWebMerchantSessionGuard() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ml-express-customer');
      if (!raw) return;
      const u = JSON.parse(raw) as { user_type?: string };
      if (u?.user_type === 'merchant') {
        localStorage.removeItem('ml-express-customer');
        window.location.reload();
      }
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <CartProvider>
          <Router>
            <div className="App" style={{ minHeight: '100vh' }}>
              <ClientWebMerchantSessionGuard />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* 首页保持同步加载，避免 LCP 变差；其余路由懒加载 */}
                  <Route path="/" element={<HomePage />} />
                  {/* 商家端曾误部署到本域名时常见 /login；认证回调或书签也可能指向此处 */}
                  <Route path="/login" element={<Navigate to="/" replace />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/tracking" element={<TrackingPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/delete-account" element={<DeleteAccountPage />} />
                  <Route path="/mall" element={<CityMallPage />} />
                  <Route path="/mall/:storeId" element={<StoreProductsPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
          </Router>
        </CartProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
export default App;

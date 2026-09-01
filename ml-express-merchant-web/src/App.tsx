import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MerchantLayout from './components/layout/MerchantLayout';
import { LanguageProvider } from './contexts/LanguageContext';
import { supabase } from './services/supabase';
import { isTransitStationStore } from './services/_shared/merchantLoginGuard';
import { STORE_AVATAR_UPDATED_EVENT } from './utils/storeAvatar';
import './App.css';
import { GlobalToast } from './components/GlobalToast';

const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const StoreProductsPage = lazy(() => import('./pages/StoreProductsPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));

function RouteFallback() {
  return (
    <div
      className="merchant-route-fallback"
      style={{
        minHeight: '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(203, 213, 225, 0.85)',
        fontSize: '1rem',
        fontWeight: 600,
      }}
    >
      Loading…
    </div>
  );
}

const ProtectedRoute = ({
  children,
  currentUser,
  onLogout,
}: {
  children: React.ReactNode;
  currentUser: any;
  onLogout: () => void;
}) => {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MerchantLayout currentUser={currentUser} onLogout={onLogout}>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </MerchantLayout>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const userRaw = localStorage.getItem('ml-express-customer');
      const userType = localStorage.getItem('userType');
      if (!userRaw || userType !== 'merchant') {
        setLoading(false);
        return;
      }

      try {
        const user = JSON.parse(userRaw);
        const storeCode = String(user.store_code ?? '').trim().toUpperCase();
        const storeId = user.store_id || user.id;

        let query = supabase.from('delivery_stores').select('id, store_type, status');
        if (storeCode) {
          query = query.eq('store_code', storeCode);
        } else if (storeId) {
          query = query.eq('id', storeId);
        } else {
          localStorage.removeItem('ml-express-customer');
          localStorage.removeItem('userType');
          setLoading(false);
          return;
        }

        const { data: store, error } = await query.maybeSingle();
        if (error || !store || isTransitStationStore(store)) {
          localStorage.removeItem('ml-express-customer');
          localStorage.removeItem('userType');
          setLoading(false);
          return;
        }

        setCurrentUser(user);
      } catch {
        localStorage.removeItem('ml-express-customer');
        localStorage.removeItem('userType');
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const url = (event as CustomEvent<{ url?: string }>).detail?.url || '';
      setCurrentUser((prev: any) => (prev ? { ...prev, avatar_url: url } : prev));
    };
    window.addEventListener(STORE_AVATAR_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(STORE_AVATAR_UPDATED_EVENT, onUpdated);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    localStorage.removeItem('userType');
    setCurrentUser(null);
  };

  const handleLogin = (user: any) => {
    setCurrentUser(user);
  };

  return (
    <LanguageProvider>
      <GlobalToast />
      {loading ? (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0f1e',
          color: 'rgba(203, 213, 225, 0.85)',
        }}
      >
        Loading…
      </div>
      ) : (
      <Router>
        <div className="App" style={{ minHeight: '100vh', background: '#0a0f1e' }}>
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />

            <Route
              path="/"
              element={
                <ProtectedRoute currentUser={currentUser} onLogout={handleLogout}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/products"
              element={
                <ProtectedRoute currentUser={currentUser} onLogout={handleLogout}>
                  <StoreProductsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedRoute currentUser={currentUser} onLogout={handleLogout}>
                  <TrackingPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
      )}
    </LanguageProvider>
  );
}

export default App;

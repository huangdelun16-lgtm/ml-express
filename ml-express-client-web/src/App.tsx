import React from 'react';
import LoggerService from '../services/LoggerService';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import TrackingPage from './pages/TrackingPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ProfilePage from './pages/ProfilePage';
import DeleteAccountPage from './pages/DeleteAccountPage';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';

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
function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <Router>
          <div className="App" style={{ minHeight: '100vh' }}>
            <Routes>
              {/* 客户端路由 - 不包含任何后台管理功能 */}
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/delete-account" element={<DeleteAccountPage />} />
            </Routes>
          </div>
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
export default App;

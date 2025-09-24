import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import TrackingPage from './pages/TrackingPage';
import ServicesPage from './pages/ServicesPage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminFinance from './pages/AdminFinance';
import AdminInventory from './pages/AdminInventory';
import AdminPackages from './pages/AdminPackages';
import AdminTransport from './pages/AdminTransport';
import DataMerger from './pages/DataMerger';
import CityTransport from './pages/CityTransport';
import AdminScan from './pages/AdminScan';
import AdminMobile from './pages/AdminMobile';
import SuccessPage from './pages/SuccessPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DbDebug from './pages/DbDebug';
import OrderPage from './pages/OrderPage';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          
          {/* 管理后台路由 */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/finance" element={<AdminFinance />} />
          <Route path="/admin/inventory" element={<AdminPackages />} />
          <Route path="/admin/inventory-items" element={<AdminInventory />} />
          <Route path="/admin/transport" element={<AdminTransport />} />
          <Route path="/admin/city/transport" element={<CityTransport />} />
          <Route path="/admin/scan" element={<AdminScan />} />
          <Route path="/admin/mobile" element={<AdminMobile />} />
          <Route path="/admin/db-debug" element={<DbDebug />} />
          <Route path="/admin/data-merger" element={<DataMerger />} />
        </Routes>
      </Box>
      <Footer />
      </Box>
    </LanguageProvider>
  );
}

export default App;

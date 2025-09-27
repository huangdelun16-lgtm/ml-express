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
import AdminDashboardTest from './pages/AdminDashboardTest';
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
import CourierAdminSystem from './pages/CourierAdminSystem';
import AdminCourierDashboard from './pages/AdminCourierDashboard';
import AdminCourierUsers from './pages/AdminCourierUsers';
import AdminCityPackages from './pages/AdminCityPackages';
import AdminCourierManagement from './pages/AdminCourierManagement';
import AdminCourierFinance from './pages/AdminCourierFinance';
import AdminCourierSettings from './pages/AdminCourierSettings';
import AdminControlPanel from './pages/AdminControlPanel';
import AdminRealtimeTracking from './pages/AdminRealtimeTracking';
import DataMigrationTool from './pages/DataMigrationTool';
import UpdateNotification from './components/UpdateNotification';
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
          <Route path="/admin/dashboard" element={<AdminDashboardTest />} />
          <Route path="/admin/finance" element={<AdminFinance />} />
          <Route path="/admin/inventory" element={<AdminPackages />} />
          <Route path="/admin/inventory-items" element={<AdminInventory />} />
          <Route path="/admin/transport" element={<AdminTransport />} />
          <Route path="/admin/city/transport" element={<CityTransport />} />
          <Route path="/admin/scan" element={<AdminScan />} />
          <Route path="/admin/mobile" element={<AdminMobile />} />
          <Route path="/admin/db-debug" element={<DbDebug />} />
          <Route path="/admin/data-merger" element={<DataMerger />} />
          <Route path="/courier-admin" element={<CourierAdminSystem />} />
          <Route path="/admin/courier-dashboard" element={<AdminCourierDashboard />} />
          <Route path="/admin/users" element={<AdminCourierUsers />} />
          <Route path="/admin/city-packages" element={<AdminCityPackages />} />
          <Route path="/admin/couriers" element={<AdminCourierManagement />} />
          <Route path="/admin/courier-finance" element={<AdminCourierFinance />} />
          <Route path="/admin/courier-settings" element={<AdminCourierSettings />} />
            <Route path="/admin/control-panel" element={<AdminControlPanel />} />
            <Route path="/admin/realtime-tracking" element={<AdminRealtimeTracking />} />
            <Route path="/admin/cloud-upgrade" element={<DataMigrationTool />} />
        </Routes>
      </Box>
      <Footer />
      
      {/* Update Notification */}
      <UpdateNotification />
      </Box>
    </LanguageProvider>
  );
}

export default App;

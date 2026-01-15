import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import TrackingPage from './pages/TrackingPage';
import ContactPage from './pages/ContactPage';
import AdminLogin from './pages/AdminLogin';
import DeliveryAlerts from './pages/DeliveryAlerts';
import AdminDashboard from './pages/AdminDashboard';
import CityPackages from './pages/CityPackages';
import UserManagement from './pages/UserManagement';
import FinanceManagement from './pages/FinanceManagement';
import SystemSettings from './pages/SystemSettings';
import AccountManagement from './pages/AccountManagement';
import BannerManagement from './pages/BannerManagement';
import DeliveryStoreManagement from './pages/DeliveryStoreManagement';
import EmployeeSupervision from './pages/EmployeeSupervision';
import RealTimeTracking from './pages/RealTimeTracking';
import RechargeManagement from './pages/RechargeManagement';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import AbnormalAlertManager from './components/AbnormalAlertManager';

function App() {
  return (
    <LanguageProvider>
      <AbnormalAlertManager />
      <Router>
        <div className="App">
          <Routes>
            {/* 后台管理登录页（公开） */}
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* 后台管理路由（受保护） */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager', 'operator', 'finance']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/city-packages" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager', 'operator', 'finance']} permissionId="city_packages">
                  <CityPackages />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="users">
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/finance" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager', 'finance']} permissionId="finance">
                  <FinanceManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/tracking" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']} permissionId="tracking">
                  <RealTimeTracking />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/realtime-tracking" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']} permissionId="tracking">
                  <RealTimeTracking />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute requiredRoles={['admin']} permissionId="settings">
                  <SystemSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/system-settings" 
              element={
                <ProtectedRoute requiredRoles={['admin']} permissionId="settings">
                  <SystemSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/accounts" 
              element={
                <ProtectedRoute requiredRoles={['admin']} permissionId="settings">
                  <AccountManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/banners" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="banners">
                  <BannerManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/delivery-stores" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="partner_stores">
                  <DeliveryStoreManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/supervision" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager']}>
                  <EmployeeSupervision />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/delivery-alerts" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="delivery_alerts">
                  <DeliveryAlerts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/recharges" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'finance']} permissionId="recharges">
                  <RechargeManagement />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;

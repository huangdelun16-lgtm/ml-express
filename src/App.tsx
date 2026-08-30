import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import DeliveryAlerts from './pages/DeliveryAlerts';
import AdminDashboardHome from './pages/AdminDashboardHome';
import CityPackages from './pages/CityPackages';
import UserManagement from './pages/UserManagement';
import SystemSettings from './pages/SystemSettings';
import AccountManagement from './pages/AccountManagement';
import BannerManagement from './pages/BannerManagement';
import DeliveryStoreManagement from './pages/DeliveryStoreManagement';
import MerchantApplicationsPage from './pages/MerchantApplicationsPage';
import ProductReviewQueuePage from './pages/ProductReviewQueuePage';
import MerchantOpsWatchPage from './pages/MerchantOpsWatchPage';
import AfterSalesDeskPage from './pages/AfterSalesDeskPage';
import EmployeeSupervision from './pages/EmployeeSupervision';
import RealTimeTracking from './pages/RealTimeTracking';
import RechargeManagement from './pages/RechargeManagement';
import AdminReportsPage from './pages/AdminReportsPage';
import CourierPerformancePage from './pages/CourierPerformancePage';
import MerchantReconciliationExportPage from './pages/MerchantReconciliationExportPage';
import ImportMetricDraftsPage from './pages/ImportMetricDraftsPage';
import ProxyPurchasePage from './pages/ProxyPurchasePage';
import ProxyQuotePage from './pages/ProxyQuotePage';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import AbnormalAlertManager from './components/AbnormalAlertManager';
import { AdminTodoProvider } from './contexts/AdminTodoContext';
import AdminTodoBar, { AdminBottomSpacer } from './components/AdminTodoBar';
import AdminGlobalSearch from './components/AdminGlobalSearch';
import AdminShellLayout, { STANDALONE_IMPORT_ADMIN_PATHS } from './layouts/AdminShellLayout';
import { GlobalToast } from './components/GlobalToast';

const FinanceManagement = lazy(() => import('./pages/FinanceManagement'));
const CrossBorderLogisticsPage = lazy(() => import('./pages/CrossBorderLogisticsPage'));

const standaloneImportPaths = STANDALONE_IMPORT_ADMIN_PATHS as readonly string[];

/** 全屏独立模块（指标管理、跨境物流）：不叠放全局搜索与底部待办条 */
const AdminFloatingChrome: React.FC = () => {
  const { pathname } = useLocation();
  if (standaloneImportPaths.includes(pathname)) return null;
  return (
    <>
      <AdminGlobalSearch />
      <AdminBottomSpacer />
      <AdminTodoBar />
    </>
  );
};

function App() {
  return (
    <LanguageProvider>
      <GlobalToast />
      <Router>
        <AdminTodoProvider>
          <AbnormalAlertManager />
          <div className="App">
            <Routes>
              <Route path="/" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'manager', 'operator', 'finance']}>
                    <AdminShellLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardHome />} />
                <Route
                  path="city-packages"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager', 'operator', 'finance']} permissionId="city_packages">
                      <CityPackages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="users">
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="finance"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager', 'finance']} permissionId="finance">
                      <Suspense fallback={<div className="admin-loading">加载中...</div>}>
                        <FinanceManagement />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="tracking"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']} permissionId="tracking">
                      <RealTimeTracking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="realtime-tracking"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']} permissionId="tracking">
                      <RealTimeTracking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute requiredRoles={['admin']} permissionId="settings">
                      <SystemSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="system-settings"
                  element={
                    <ProtectedRoute requiredRoles={['admin']} permissionId="settings">
                      <SystemSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="accounts"
                  element={
                    <ProtectedRoute requiredRoles={['admin']} permissionId="settings">
                      <AccountManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="banners"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="banners">
                      <BannerManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="delivery-stores"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="merchant_stores">
                      <DeliveryStoreManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="merchant-applications"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="merchant_stores">
                      <MerchantApplicationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="product-reviews"
                  element={
                    <ProtectedRoute
                      requiredRoles={['admin', 'manager']}
                      permissionId={['merchant_stores', 'product_reviews']}
                    >
                      <ProductReviewQueuePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="merchant-ops"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="merchant_stores">
                      <MerchantOpsWatchPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="after-sales"
                  element={
                    <ProtectedRoute
                      requiredRoles={['admin', 'manager', 'finance']}
                      permissionId={['after_sales', 'merchant_stores', 'finance']}
                    >
                      <AfterSalesDeskPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="supervision"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager', 'finance']}>
                      <EmployeeSupervision />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager', 'finance']}>
                      <EmployeeSupervision />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="delivery-alerts"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager']} permissionId="delivery_alerts">
                      <DeliveryAlerts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="recharges"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'finance']} permissionId="recharges">
                      <RechargeManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager', 'finance']} permissionId="reports">
                      <AdminReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="courier-performance"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager', 'operator', 'finance']} permissionId="courier_performance">
                      <CourierPerformancePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="merchant-reconciliation"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'manager', 'finance']} permissionId="merchant_reconciliation">
                      <MerchantReconciliationExportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="metric-management"
                  element={
                    <ProtectedRoute
                      requiredRoles={['admin', 'manager', 'finance']}
                      permissionId={['metric_management', 'product_price', 'personal_expenses']}
                    >
                      <ImportMetricDraftsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="proxy-purchase"
                  element={
                    <ProtectedRoute
                      requiredRoles={['admin', 'manager', 'finance']}
                      permissionId={['metric_management', 'product_price', 'personal_expenses']}
                    >
                      <ProxyPurchasePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="proxy-quote"
                  element={
                    <ProtectedRoute
                      requiredRoles={['admin', 'manager', 'finance']}
                      permissionId={['metric_management', 'product_price', 'personal_expenses']}
                    >
                      <ProxyQuotePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="product-price"
                  element={
                    <ProtectedRoute
                      requiredRoles={['admin', 'manager', 'finance']}
                      permissionId={['product_price', 'metric_management']}
                    >
                      <Navigate to="/admin/metric-management?openPrice=1" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="personal-expenses"
                  element={
                    <ProtectedRoute
                      requiredRoles={['admin', 'manager', 'finance']}
                      permissionId={['personal_expenses', 'metric_management']}
                    >
                      <Navigate to="/admin/metric-management?openPersonal=1" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="daigou"
                  element={
                    <ProtectedRoute
                      requiredRoles={['admin', 'manager', 'finance']}
                      permissionId={['metric_management', 'product_price', 'personal_expenses']}
                    >
                      <Navigate to="/admin/proxy-purchase" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="cross-border-logistics"
                  element={
                    <ProtectedRoute
                      requiredRoles={['admin', 'manager', 'operator', 'finance']}
                      permissionId="cross_border_logistics"
                    >
                      <Suspense fallback={<div style={{ color: 'white', padding: 40, textAlign: 'center' }}>加载中...</div>}>
                        <CrossBorderLogisticsPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
            <AdminFloatingChrome />
          </div>
        </AdminTodoProvider>
      </Router>
    </LanguageProvider>
  );
}

export default App;

import React from 'react';

/** 非登录首屏按需加载，减轻首包解析量 */
export const LazyDashboardScreen = React.lazy(() => import('../screens/DashboardScreen'));
export const LazyCourierHomeScreen = React.lazy(() => import('../screens/CourierHomeScreen'));
export const LazyMapScreen = React.lazy(() => import('../screens/MapScreen'));
export const LazyScanScreen = React.lazy(() => import('../screens/ScanScreen'));
export const LazyProfileScreen = React.lazy(() => import('../screens/ProfileScreen'));
export const LazyPackageDetailScreen = React.lazy(() => import('../screens/PackageDetailScreen'));
export const LazyDeliveryHistoryScreen = React.lazy(() => import('../screens/DeliveryHistoryScreen'));
export const LazyPackageManagementScreen = React.lazy(() => import('../screens/PackageManagementScreen'));
export const LazyCourierManagementScreen = React.lazy(() => import('../screens/CourierManagementScreen'));
export const LazyFinanceManagementScreen = React.lazy(() => import('../screens/FinanceManagementScreen'));
export const LazySettingsScreen = React.lazy(() => import('../screens/SettingsScreen'));
export const LazyMyStatisticsScreen = React.lazy(() => import('../screens/MyStatisticsScreen'));
export const LazyPerformanceAnalyticsScreen = React.lazy(() => import('../screens/PerformanceAnalyticsScreen'));

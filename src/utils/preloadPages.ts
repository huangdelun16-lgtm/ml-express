// 预加载页面映射
const pageLoaders: Record<string, () => Promise<any>> = {
  '/admin/dashboard': () => import('../pages/AdminDashboard'),
  '/admin/finance': () => import('../pages/AdminFinance'),
  '/admin/inventory': () => import('../pages/AdminInventory'),
  '/admin/transport': () => import('../pages/AdminTransport'),
  '/admin/city/transport': () => import('../pages/CityTransport'),
  '/admin/scan': () => import('../pages/AdminScan'),
  '/admin/mobile': () => import('../pages/AdminMobile'),
};

// 预加载页面
export const preloadPage = (path: string) => {
  const loader = pageLoaders[path];
  if (loader) {
    loader().catch(() => {
      // 忽略预加载错误
    });
  }
};

// 预加载所有管理页面（可选）
export const preloadAllAdminPages = () => {
  Object.values(pageLoaders).forEach(loader => {
    loader().catch(() => {});
  });
};

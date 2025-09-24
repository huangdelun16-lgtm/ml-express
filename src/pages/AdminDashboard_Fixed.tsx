import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import {
  Assessment,
  LocalShipping,
  People,
  Settings,
  MyLocation,
  ExitToApp,
  Refresh,
  Dashboard,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

// 类型定义
interface User {
  username: string;
  role: string;
  loginTime?: string;
}

interface Package {
  id: string;
  trackingNumber: string;
  status: string;
  sender: string;
  receiver: string;
  amount: number;
  createdAt: string;
}

interface FinanceRecord {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  activeEmployees: number;
  totalEmployees: number;
}

interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

const AdminDashboard: React.FC = () => {
  // 基础状态
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [finance, setFinance] = useState<FinanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // UI状态
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Hooks
  const navigate = useNavigate();
  const { t } = useLanguage();
  const mountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 计算仪表板统计数据
  const dashboardStats = useMemo<DashboardStats>(() => {
    const totalOrders = packages.length;
    const pendingOrders = packages.filter(pkg => 
      ['已下单', '待确认', '运输中'].includes(pkg.status)
    ).length;
    const completedOrders = packages.filter(pkg => 
      pkg.status === '已送达'
    ).length;
    const totalRevenue = finance
      .filter(record => record.type === 'income' && record.status === 'completed')
      .reduce((sum, record) => sum + record.amount, 0);
    const activeEmployees = employees.filter(emp => emp.status === 'active').length;
    const totalEmployees = employees.length;

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      activeEmployees,
      totalEmployees,
    };
  }, [packages, finance, employees]);

  // 显示通知
  const showNotification = useCallback((message: string, severity: NotificationState['severity'] = 'info') => {
    if (!mountedRef.current) return;
    
    setNotification({
      open: true,
      message,
      severity,
    });
  }, []);

  // 关闭通知
  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  // 安全的localStorage操作
  const safeLocalStorageGet = useCallback((key: string, defaultValue: any = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`读取localStorage失败 [${key}]:`, error);
      return defaultValue;
    }
  }, []);

  const safeLocalStorageSet = useCallback((key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`保存localStorage失败 [${key}]:`, error);
      showNotification(`数据保存失败: ${key}`, 'error');
      return false;
    }
  }, [showNotification]);

  // 加载用户数据
  const loadUserData = useCallback(async () => {
    try {
      const userData = safeLocalStorageGet('adminUser');
      if (!userData) {
        navigate('/admin/login');
        return false;
      }
      
      if (mountedRef.current) {
        setUser(userData);
      }
      return true;
    } catch (error) {
      console.error('加载用户数据失败:', error);
      navigate('/admin/login');
      return false;
    }
  }, [navigate, safeLocalStorageGet]);

  // 加载包裹数据
  const loadPackagesData = useCallback(async () => {
    try {
      const packagesData = safeLocalStorageGet('packages', []);
      
      if (mountedRef.current) {
        setPackages(Array.isArray(packagesData) ? packagesData : []);
      }
    } catch (error) {
      console.error('加载包裹数据失败:', error);
      showNotification('加载包裹数据失败', 'error');
    }
  }, [safeLocalStorageGet, showNotification]);

  // 加载财务数据
  const loadFinanceData = useCallback(async () => {
    try {
      const financeData = safeLocalStorageGet('finance_records', []);
      
      if (mountedRef.current) {
        setFinance(Array.isArray(financeData) ? financeData : []);
      }
    } catch (error) {
      console.error('加载财务数据失败:', error);
      showNotification('加载财务数据失败', 'error');
    }
  }, [safeLocalStorageGet, showNotification]);

  // 加载员工数据
  const loadEmployeesData = useCallback(async () => {
    try {
      const employeesData = safeLocalStorageGet('company_employees', []);
      
      if (mountedRef.current) {
        setEmployees(Array.isArray(employeesData) ? employeesData : []);
      }
    } catch (error) {
      console.error('加载员工数据失败:', error);
      showNotification('加载员工数据失败', 'error');
    }
  }, [safeLocalStorageGet, showNotification]);

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    
    try {
      // 检查用户登录状态
      const userLoaded = await loadUserData();
      if (!userLoaded) return;
      
      // 并行加载所有数据
      await Promise.allSettled([
        loadPackagesData(),
        loadFinanceData(),
        loadEmployeesData(),
      ]);
      
      if (mountedRef.current) {
        showNotification('数据加载完成', 'success');
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      if (mountedRef.current) {
        showNotification('数据加载失败，请重试', 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadUserData, loadPackagesData, loadFinanceData, loadEmployeesData, showNotification]);

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    
    try {
      await loadAllData();
      showNotification('数据刷新完成', 'success');
    } catch (error) {
      console.error('刷新数据失败:', error);
      showNotification('刷新失败，请重试', 'error');
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshing, loadAllData, showNotification]);

  // 安全的导航函数
  const safeNavigate = useCallback((path: string) => {
    try {
      navigate(path);
    } catch (error) {
      console.error('导航失败:', error);
      showNotification('页面跳转失败', 'error');
    }
  }, [navigate, showNotification]);

  // 登出处理
  const handleLogout = useCallback(() => {
    try {
      // 清理定时器
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // 清理用户数据
      localStorage.removeItem('adminUser');
      
      // 导航到登录页
      navigate('/admin/login');
    } catch (error) {
      console.error('登出失败:', error);
      showNotification('登出失败', 'error');
    }
  }, [navigate, showNotification]);

  // 组件挂载时加载数据
  useEffect(() => {
    mountedRef.current = true;
    loadAllData();
    
    // 设置自动刷新（每5分钟）
    refreshIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        loadAllData();
      }
    }, 5 * 60 * 1000);
    
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadAllData]);

  // 权限检查
  const hasPermission = useCallback((requiredRole: string): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      'admin': 4,
      'manager': 3,
      'accountant': 2,
      'employee': 1,
    };
    
    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userLevel >= requiredLevel;
  }, [user]);

  // 获取卡片数据
  const getCardData = useMemo(() => [
    {
      title: '仪表板',
      description: '实时数据统计和系统监控',
      icon: <Assessment sx={{ fontSize: 48, color: '#42a5f5' }} />,
      path: '/admin/courier-dashboard',
      permission: 'employee',
      stats: `${dashboardStats.totalOrders} 个订单`,
    },
    {
      title: '订单管理',
      description: '订单处理和状态跟踪',
      icon: <LocalShipping sx={{ fontSize: 48, color: '#52c41a' }} />,
      path: '/admin/courier-orders',
      permission: 'employee',
      stats: `${dashboardStats.pendingOrders} 待处理`,
    },
    {
      title: '用户管理',
      description: '客户信息和行为分析',
      icon: <People sx={{ fontSize: 48, color: '#faad14' }} />,
      path: '/admin/courier-users',
      permission: 'accountant',
      stats: `${employees.length} 个用户`,
    },
    {
      title: '快递员管理',
      description: '快递员信息和业绩管理',
      icon: <LocalShipping sx={{ fontSize: 48, color: '#722ed1' }} />,
      path: '/admin/courier-management',
      permission: 'employee',
      stats: `${dashboardStats.activeEmployees} 在线`,
    },
    {
      title: '财务管理',
      description: '收入统计和佣金管理',
      icon: <Assessment sx={{ fontSize: 48, color: '#f5222d' }} />,
      path: '/admin/courier-finance',
      permission: 'accountant',
      stats: `${dashboardStats.totalRevenue.toLocaleString()} MMK`,
    },
    {
      title: '实时跟踪',
      description: 'GPS位置监控和路线跟踪',
      icon: <MyLocation sx={{ fontSize: 48, color: '#722ed1' }} />,
      path: '/admin/realtime-tracking',
      permission: 'manager',
      stats: '位置监控',
    },
    {
      title: '系统设置',
      description: '价格规则和系统配置',
      icon: <Settings sx={{ fontSize: 48, color: '#13c2c2' }} />,
      path: '/admin/courier-settings',
      permission: 'admin',
      stats: '系统配置',
    },
  ], [dashboardStats, employees.length]);

  // 处理卡片点击
  const handleCardClick = useCallback((path: string, permission: string) => {
    try {
      if (!hasPermission(permission)) {
        showNotification('您没有访问此功能的权限', 'warning');
        return;
      }
      
      safeNavigate(path);
    } catch (error) {
      console.error('卡片点击失败:', error);
      showNotification('操作失败，请重试', 'error');
    }
  }, [hasPermission, showNotification, safeNavigate]);

  // 渲染加载状态
  if (loading) {
    return (
      <PremiumBackground variant="admin" minHeight="100vh">
        <Backdrop open={loading} sx={{ color: '#fff', zIndex: 9999 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress color="inherit" size={60} />
            <Typography variant="h6" sx={{ color: 'white' }}>
              正在加载管理中心...
            </Typography>
          </Box>
        </Backdrop>
      </PremiumBackground>
    );
  }

  // 渲染未登录状态
  if (!user) {
    return (
      <PremiumBackground variant="admin" minHeight="100vh">
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            用户未登录，正在跳转到登录页面...
          </Alert>
        </Container>
      </PremiumBackground>
    );
  }

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* 页面头部 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}>
          <Box>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
              管理中心
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              欢迎回来，{user.username}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              {refreshing ? '刷新中...' : '刷新数据'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Dashboard />}
              onClick={() => safeNavigate('/admin/control-panel')}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              控制台
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ExitToApp />}
              onClick={handleLogout}
              sx={{
                color: '#f5222d',
                borderColor: '#f5222d',
                '&:hover': {
                  borderColor: '#ff4d4f',
                  backgroundColor: 'rgba(245, 34, 45, 0.1)',
                },
              }}
            >
              退出登录
            </Button>
          </Box>
        </Box>

        {/* 统计卡片 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                color: 'white',
                height: 120,
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardStats.totalOrders}
                  </Typography>
                  <Typography variant="body2">
                    总订单数
                  </Typography>
                </Box>
                <LocalShipping sx={{ fontSize: 40, opacity: 0.8 }} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                color: 'white',
                height: 120,
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardStats.completedOrders}
                  </Typography>
                  <Typography variant="body2">
                    已完成
                  </Typography>
                </Box>
                <Assessment sx={{ fontSize: 40, opacity: 0.8 }} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #faad14 0%, #fa8c16 100%)',
                color: 'white',
                height: 120,
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardStats.pendingOrders}
                  </Typography>
                  <Typography variant="body2">
                    待处理
                  </Typography>
                </Box>
                <People sx={{ fontSize: 40, opacity: 0.8 }} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                color: 'white',
                height: 120,
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {(dashboardStats.totalRevenue / 1000).toFixed(1)}K
                  </Typography>
                  <Typography variant="body2">
                    总收入 (MMK)
                  </Typography>
                </Box>
                <Assessment sx={{ fontSize: 40, opacity: 0.8 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 功能模块卡片 */}
        <Grid container spacing={3}>
          {getCardData.map((card) => {
            const hasAccess = hasPermission(card.permission);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={card.title}>
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    cursor: hasAccess ? 'pointer' : 'not-allowed',
                    opacity: hasAccess ? 1 : 0.6,
                    transition: 'all 0.3s ease',
                    '&:hover': hasAccess ? {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                    } : {},
                  }}
                  onClick={() => hasAccess && handleCardClick(card.path, card.permission)}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 3, 
                    minHeight: 180, 
                    height: 180,
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                      {card.icon}
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1, mt: 2 }}>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                        {card.description}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {card.stats}
                      </Typography>
                      {!hasAccess && (
                        <Chip 
                          label="权限不足" 
                          size="small" 
                          sx={{ 
                            backgroundColor: 'rgba(245, 34, 45, 0.2)', 
                            color: '#f5222d',
                            fontSize: '10px',
                          }} 
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* 通知组件 */}
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </PremiumBackground>
  );
};

export default AdminDashboard;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  IconButton,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Assessment,
  LocalShipping,
  Settings,
  MyLocation,
  Person,
  Logout,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

interface User {
  username: string;
  role: string;
  loginTime: string;
}

interface FinanceTxn {
  id: string;
  type: '收入' | '支出';
  amount: number;
  note: string;
  date: string;
  category?: string;
}

const AdminDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [finance, setFinance] = useState<FinanceTxn[]>([]);
  const [toast, setToast] = useState<{ open: boolean; text: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ 
    open: false, 
    text: '', 
    severity: 'success' 
  });
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    // 检查登录状态
    const userData = localStorage.getItem('adminUser');
    if (!userData) {
      navigate('/admin/login');
      return;
    }

    try {
      const userInfo = JSON.parse(userData);
      setUser(userInfo);
      
      // 读取财务数据
      try {
        const rawFinance = localStorage.getItem('finance');
        setFinance(rawFinance ? JSON.parse(rawFinance) : []);
      } catch { 
        setFinance([]); 
      }
    } catch (error) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  if (!user) {
    return null;
  }

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      {/* 顶部导航栏 */}
      <AppBar position="static" sx={{ 
        background: 'rgba(255, 255, 255, 0.1)', 
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <Toolbar>
          <Box
            sx={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              boxShadow: '0 4px 20px rgba(44, 62, 80, 0.3)',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                right: 6,
                width: 8,
                height: 6,
                background: 'white',
                clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                transform: 'translateY(-50%)',
              }
            }}
          >
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-1px',
                fontFamily: '"Arial Black", sans-serif',
              }}
            >
              ML
            </Typography>
          </Box>
          <Typography variant="h6" component="div" sx={{ 
            flexGrow: 1, 
            color: 'white', 
            fontWeight: 700,
            letterSpacing: '1px',
          }}>
            MARKET LINK EXPRESS {t('adminPanel')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* 控制台按钮 */}
            <Button
              variant="outlined"
              onClick={() => navigate('/admin/control-panel')}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: '20px',
                px: 2,
                py: 0.5,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { 
                  borderColor: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              控制台
            </Button>
            
            {/* 云升级按钮 */}
            <Button
              variant="contained"
              onClick={() => navigate('/admin/cloud-upgrade')}
              sx={{
                background: 'linear-gradient(135deg, #722ed1 0%, #9c27b0 100%)',
                color: 'white',
                borderRadius: '20px',
                px: 2,
                py: 0.5,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 20px rgba(156, 39, 176, 0.3)',
                '&:hover': { 
                  background: 'linear-gradient(135deg, #6a1b9a 0%, #8e24aa 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 25px rgba(156, 39, 176, 0.4)',
                },
              }}
            >
              ☁️ 云升级
            </Button>
            
            <Typography variant="body2" sx={{ color: 'white' }}>
              {t('welcome')}，{user.username} ({user.role})
            </Typography>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <Person />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 用户菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem>
          <Person sx={{ mr: 1 }} />
          个人信息
        </MenuItem>
        <MenuItem>
          <Settings sx={{ mr: 1 }} />
          设置
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          {t('logout')}
        </MenuItem>
      </Menu>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* 管理模块导航 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: 'white' }}>
            管理中心 (v2.2.0 - 已彻底移除订单管理)
          </Typography>
          <Grid container spacing={3}>
            {/* 仪表盘 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/courier-dashboard')}
              >
                <CardContent sx={{ 
                  textAlign: 'center', 
                  py: 3, 
                  minHeight: 180, 
                  height: 180,
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Assessment sx={{ fontSize: 48, color: '#42a5f5', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    仪表板
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    实时数据统计和系统监控
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 同城包裹 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/city-packages')}
              >
                <CardContent sx={{ 
                  textAlign: 'center', 
                  py: 3, 
                  minHeight: 180, 
                  height: 180,
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <LocalShipping sx={{ fontSize: 48, color: '#faad14', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    同城包裹
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    直接下单包裹管理和跟踪
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 快递员管理 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/couriers')}
              >
                <CardContent sx={{ 
                  textAlign: 'center', 
                  py: 3, 
                  minHeight: 180, 
                  height: 180,
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <LocalShipping sx={{ fontSize: 48, color: '#722ed1', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    快递员管理
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    快递员信息和业绩管理
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 财务管理 */}
            {(user.role !== 'employee') && (
              <Grid item xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                    },
                  }}
                  onClick={() => navigate('/admin/courier-finance')}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 3, 
                    minHeight: 180, 
                    height: 180,
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Assessment sx={{ fontSize: 48, color: '#f5222d', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                      财务管理
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      收入统计和佣金管理
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* 实时跟踪 - 只有管理员和经理可以访问 */}
            {(user.role === 'admin' || user.role === 'manager') && (
              <Grid item xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                    },
                  }}
                  onClick={() => navigate('/admin/realtime-tracking')}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 3, 
                    minHeight: 180, 
                    height: 180,
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <MyLocation sx={{ fontSize: 48, color: '#722ed1', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                      实时跟踪
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      GPS位置监控和路线跟踪
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* 系统设置 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/courier-settings')}
              >
                <CardContent sx={{ 
                  textAlign: 'center', 
                  py: 3, 
                  minHeight: 180, 
                  height: 180,
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Settings sx={{ fontSize: 48, color: '#13c2c2', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    系统设置
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    价格规则和系统配置
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
      
      {/* 全局提示 */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.text}
        </Alert>
      </Snackbar>
    </PremiumBackground>
  );
};

export default AdminDashboard;
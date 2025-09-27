import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, Card, CardContent, Typography, Box, Button, Alert } from '@mui/material';
import { Assessment, LocalShipping, People, Settings, MyLocation, Refresh, Warning } from '@mui/icons-material';
import PremiumBackground from '../components/PremiumBackground';

const AdminDashboardUltimate: React.FC = () => {
  const navigate = useNavigate();
  
  // 终极修复版本 - 最简单的卡片
  const cardData = [
    {
      title: '同城包裹',
      description: '同城快递包裹管理',
      icon: <Assessment sx={{ fontSize: 48, color: '#42a5f5' }} />,
      path: '/admin/city-packages',
    },
    {
      title: '用户管理',
      description: '客户信息和行为分析',
      icon: <People sx={{ fontSize: 48, color: '#faad14' }} />,
      path: '/admin/users',
    },
    {
      title: '快递员管理',
      description: '快递员信息和业绩管理',
      icon: <LocalShipping sx={{ fontSize: 48, color: '#722ed1' }} />,
      path: '/admin/couriers',
    },
    {
      title: '财务管理',
      description: '收入统计和佣金管理',
      icon: <Assessment sx={{ fontSize: 48, color: '#f5222d' }} />,
      path: '/admin/courier-finance',
    },
    {
      title: '实时跟踪',
      description: 'GPS位置监控和路线跟踪',
      icon: <MyLocation sx={{ fontSize: 48, color: '#722ed1' }} />,
      path: '/admin/realtime-tracking',
    },
    {
      title: '系统设置',
      description: '价格规则和系统配置',
      icon: <Settings sx={{ fontSize: 48, color: '#13c2c2' }} />,
      path: '/admin/courier-settings',
    },
  ];

  // 终极点击处理 - 使用所有可能的导航方法
  const handleCardClick = (path: string, title: string) => {
    console.log('🚨 终极版本 - 卡片被点击:', { title, path });
    
    // 方法1: React Router
    try {
      navigate(path);
      console.log('✅ React Router 导航成功');
      return;
    } catch (error) {
      console.error('❌ React Router 失败:', error);
    }
    
    // 方法2: 原生导航
    try {
      window.location.href = path;
      console.log('✅ 原生导航成功');
      return;
    } catch (error) {
      console.error('❌ 原生导航失败:', error);
    }
    
    // 方法3: 新窗口打开
    try {
      window.open(path, '_blank');
      console.log('✅ 新窗口打开成功');
      return;
    } catch (error) {
      console.error('❌ 新窗口打开失败:', error);
    }
    
    // 方法4: 替换当前页面
    try {
      window.location.replace(path);
      console.log('✅ 页面替换成功');
    } catch (error) {
      console.error('❌ 所有导航方法都失败:', error);
      alert('导航失败，请手动访问: ' + path);
    }
  };

  // 强制刷新
  const forceRefresh = () => {
    console.log('🔄 强制刷新页面');
    window.location.href = window.location.href.split('?')[0] + '?v=2.5.6&force=' + Date.now();
  };

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            🚨 终极修复版本 v2.5.6 - 如果卡片还是不能点击，请点击右上角"强制刷新"
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
            🚨 终极修复版本 v2.5.6
          </Typography>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={forceRefresh}
            sx={{
              backgroundColor: '#f5222d',
              '&:hover': {
                backgroundColor: '#ff4d4f',
              },
            }}
          >
            强制刷新
          </Button>
        </Box>

        <Grid container spacing={3}>
          {cardData.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.title}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(20px)',
                  border: '3px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-10px)',
                    boxShadow: '0 25px 80px rgba(255, 255, 255, 0.3)',
                    border: '3px solid rgba(255, 255, 255, 0.8)',
                  },
                }}
                onClick={() => handleCardClick(card.path, card.title)}
              >
                <CardContent sx={{ 
                  textAlign: 'center', 
                  py: 5, 
                  minHeight: 220, 
                  height: 220,
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                    {card.icon}
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 2, mt: 2 }}>
                      {card.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
                      {card.description}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    🖱️ 点击测试导航
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </PremiumBackground>
  );
};

export default AdminDashboardUltimate;

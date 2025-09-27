import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, Card, CardContent, Typography, Box, Button } from '@mui/material';
import { Assessment, LocalShipping, People, Settings, MyLocation, Refresh } from '@mui/icons-material';
import PremiumBackground from '../components/PremiumBackground';

const AdminDashboardEmergency: React.FC = () => {
  const navigate = useNavigate();
  
  // 紧急修复版本 - 最简单的卡片
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

  // 最简单的点击处理 - 直接使用window.location
  const handleCardClick = (path: string, title: string) => {
    console.log('🚨 紧急版本 - 卡片被点击:', { title, path });
    
    // 方法1: 使用React Router
    try {
      navigate(path);
      console.log('✅ React Router 导航成功');
    } catch (error) {
      console.error('❌ React Router 导航失败:', error);
      
      // 方法2: 使用原生window.location
      try {
        window.location.href = path;
        console.log('✅ 原生导航成功');
      } catch (error2) {
        console.error('❌ 原生导航也失败:', error2);
        
        // 方法3: 使用window.open
        window.open(path, '_self');
      }
    }
  };

  // 强制刷新页面
  const forceRefresh = () => {
    console.log('🔄 强制刷新页面');
    window.location.reload();
  };

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
            🚨 紧急修复版本 v2.5.5
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={forceRefresh}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.3)',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            强制刷新
          </Button>
        </Box>

        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4 }}>
          如果卡片无法点击，请点击右上角的"强制刷新"按钮
        </Typography>

        <Grid container spacing={3}>
          {cardData.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.title}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 60px rgba(255, 255, 255, 0.2)',
                    border: '2px solid rgba(255, 255, 255, 0.6)',
                  },
                }}
                onClick={() => handleCardClick(card.path, card.title)}
              >
                <CardContent sx={{ 
                  textAlign: 'center', 
                  py: 4, 
                  minHeight: 200, 
                  height: 200,
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
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                      {card.description}
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
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

export default AdminDashboardEmergency;

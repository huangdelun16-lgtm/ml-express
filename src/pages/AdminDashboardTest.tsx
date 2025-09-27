import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { Assessment, LocalShipping, People, Settings, MyLocation } from '@mui/icons-material';
import PremiumBackground from '../components/PremiumBackground';

const AdminDashboardTest: React.FC = () => {
  const navigate = useNavigate();
  
  // 简化的卡片数据
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

  // 简化的点击处理
  const handleCardClick = (path: string, title: string) => {
    console.log('🎯 卡片被点击:', { title, path });
    try {
      navigate(path);
      console.log('✅ 导航成功');
    } catch (error) {
      console.error('❌ 导航失败:', error);
    }
  };

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, mb: 4 }}>
          管理中心测试版 (v2.5.4) - 简化版本
        </Typography>

        <Grid container spacing={3}>
          {cardData.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.title}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => handleCardClick(card.path, card.title)}
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
                  
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    点击测试导航
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

export default AdminDashboardTest;

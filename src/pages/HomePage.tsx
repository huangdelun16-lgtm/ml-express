import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  LocalShipping,
  Speed,
  Security,
  Support,
  TrendingUp,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const features = [
    {
      icon: <Speed sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: '快速配送',
      description: '专业的物流网络确保您的包裹快速送达目的地',
    },
    {
      icon: <Security sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: '安全保障',
      description: '全程保险覆盖，货物安全有保障，让您放心托付',
    },
    {
      icon: <Support sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: '24/7客服',
      description: '专业客服团队，随时为您解答问题和提供帮助',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: '实时跟踪',
      description: '全程物流信息实时更新，让您随时掌握货物状态',
    },
  ];


  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant={isMobile ? 'h3' : 'h1'}
            component="h1"
            sx={{ fontWeight: 800, mb: 2, letterSpacing: 1 }}
          >
            MARKET LINK
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
            缅甸领先的快递服务
          </Typography>
          <Typography variant="h5" sx={{ opacity: 0.9, mb: 4, maxWidth: 600, mx: 'auto' }}>
            快速、安全、便捷的快递物流服务，让您的包裹安全送达
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/tracking')}
              sx={{
                backgroundColor: 'white',
                color: 'primary.main',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: 'grey.100',
                },
              }}
            >
              查询快递
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/services')}
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              了解服务
            </Button>
          </Box>
        </Container>
      </Box>

      {/* 服务特色 */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          align="center"
          sx={{ mb: 6, fontWeight: 600 }}
        >
          为什么选择我们
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  p: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <Box sx={{ mb: 3 }}>{feature.icon}</Box>
                <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>


      {/* 服务流程 */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          align="center"
          sx={{ mb: 6, fontWeight: 600 }}
        >
          服务流程
        </Typography>
        
        <Grid container spacing={4}>
          {[
            { step: '1', title: '下单', description: '客户通过网站或电话下单' },
            { step: '2', title: '揽收', description: '快递员上门揽收包裹' },
            { step: '3', title: '运输', description: '包裹进入物流网络运输' },
            { step: '4', title: '派送', description: '快递员派送包裹到收件人' },
            { step: '5', title: '签收', description: '收件人确认签收包裹' },
          ].map((item, index) => (
            <Grid item xs={12} sm={6} md={2.4} key={index}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {item.step}
                </Box>
                <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 600 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* 快速查询和价格咨询 */}
      <Box sx={{ backgroundColor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
                  快速查询您的包裹
                </Typography>
                <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                  输入快递单号，实时跟踪包裹状态
                </Typography>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/tracking')}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                  endIcon={<ArrowForward />}
                >
                  立即查询
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
                  获取最优价格
                </Typography>
                <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                  在线询价，专业客服为您提供个性化报价
                </Typography>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/pricing')}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                  endIcon={<ArrowForward />}
                >
                  立即询价
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;

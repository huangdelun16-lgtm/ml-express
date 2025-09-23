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
      icon: (
        <Box sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
        }}>
          <Speed sx={{ fontSize: 40, color: 'white' }} />
        </Box>
      ),
      title: '快速配送',
      description: '专业的物流网络确保您的包裹快速送达目的地',
    },
    {
      icon: (
        <Box sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          boxShadow: '0 8px 32px rgba(46, 125, 50, 0.3)',
        }}>
          <Security sx={{ fontSize: 40, color: 'white' }} />
        </Box>
      ),
      title: '安全保障',
      description: '全程保险覆盖，货物安全有保障，让您放心托付',
    },
    {
      icon: (
        <Box sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          boxShadow: '0 8px 32px rgba(245, 124, 0, 0.3)',
        }}>
          <Support sx={{ fontSize: 40, color: 'white' }} />
        </Box>
      ),
      title: '24/7客服',
      description: '专业客服团队，随时为您解答问题和提供帮助',
    },
    {
      icon: (
        <Box sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          boxShadow: '0 8px 32px rgba(123, 31, 162, 0.3)',
        }}>
          <TrendingUp sx={{ fontSize: 40, color: 'white' }} />
        </Box>
      ),
      title: '实时跟踪',
      description: '全程物流信息实时更新，让您随时掌握货物状态',
    },
  ];


  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `
            linear-gradient(135deg, rgba(15, 32, 39, 0.9) 0%, rgba(32, 58, 67, 0.9) 50%, rgba(44, 83, 100, 0.9) 100%),
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)
          `,
          color: 'white',
          py: { xs: 10, md: 16 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.1,
          }
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            component="h1"
            sx={{ 
              fontWeight: 700, 
              mb: 2, 
              letterSpacing: '2px',
              fontFamily: '"Roboto", "Arial", sans-serif',
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            MARKET LINK{' '}
            <Box component="span" sx={{ fontWeight: 300, opacity: 0.9 }}>
              EXPRESS
            </Box>
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
            缅甸领先的快递服务
          </Typography>
          <Typography variant="h5" sx={{ opacity: 0.9, mb: 4, maxWidth: 600, mx: 'auto' }}>
            快速、安全、便捷的快递物流服务，让您的包裹安全送达
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            justifyContent: 'center', 
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1,
          }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/tracking')}
              sx={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                color: '#2c3e50',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: '50px',
                textTransform: 'none',
                boxShadow: '0 8px 32px rgba(255,255,255,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 40px rgba(255,255,255,0.4)',
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
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
                borderColor: 'rgba(255,255,255,0.5)',
                color: 'white',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: '50px',
                textTransform: 'none',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: 'white',
                  background: 'rgba(255,255,255,0.2)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 32px rgba(255,255,255,0.2)',
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
                  p: 4,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  border: '1px solid rgba(25, 118, 210, 0.1)',
                  borderRadius: '20px',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    transition: 'transform 0.3s ease',
                  },
                  '&:hover': {
                    transform: 'translateY(-12px)',
                    boxShadow: '0 20px 60px rgba(25, 118, 210, 0.15)',
                    '&::before': {
                      transform: 'scaleX(1)',
                    },
                  },
                }}
              >
                <Box sx={{ mb: 4 }}>{feature.icon}</Box>
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

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  LocalShipping,
  Flight,
  DirectionsCar,
  Speed,
  Security,
  Support,
  AccessTime,
} from '@mui/icons-material';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

const ServicesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useLanguage();

  const services = [
    {
      icon: <LocalShipping sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: t('domesticExpress'),
      description: t('domesticExpressDesc'),
      features: ['全国覆盖', '快速配送', '实时跟踪', '安全保障'],
      price: '起价 2,000 缅币',
      deliveryTime: '24-48小时',
    },
    {
      icon: <Flight sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: t('internationalExpress'),
      description: t('internationalExpressDesc'),
      features: ['全球覆盖', '专业报关', '全程保险', '快速通关'],
      price: '起价 15,000 缅币',
      deliveryTime: '3-7天',
    },
    {
      icon: <DirectionsCar sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: t('sameDay'),
      description: t('sameDayDesc'),
      features: ['同城配送', '即时响应', '专业配送', '准时送达'],
      price: '起价 1,500 缅币',
      deliveryTime: '2-4小时',
    },
  ];

  const features = [
    {
      icon: <Speed sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: '快速配送',
      description: '专业的物流网络确保您的包裹快速送达目的地',
    },
    {
      icon: <Security sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: '安全保障',
      description: '全程保险覆盖，货物安全有保障，让您放心托付',
    },
    {
      icon: <Support sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: '专业客服',
      description: '24/7专业客服团队，随时为您解答问题和提供帮助',
    },
    {
      icon: <AccessTime sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: '准时送达',
      description: '承诺送达时间，超时赔付，让您的时间更有保障',
    },
  ];

  const processSteps = [
    {
      step: '1',
      title: '下单',
      description: '通过网站、电话或到店下单，填写详细的收寄信息',
    },
    {
      step: '2',
      title: '揽收',
      description: '专业快递员上门揽收包裹，当场验货并包装',
    },
    {
      step: '3',
      title: '运输',
      description: '包裹进入我们的物流网络，全程监控运输状态',
    },
    {
      step: '4',
      title: '派送',
      description: '到达目的地后，快递员及时派送包裹',
    },
    {
      step: '5',
      title: '签收',
      description: '收件人确认签收，完成整个配送流程',
    },
  ];

  return (
    <PremiumBackground variant="page">
      {/* Hero Section */}
      <Box
        sx={{
          background: `
            linear-gradient(135deg, rgba(15, 32, 39, 0.9) 0%, rgba(32, 58, 67, 0.9) 50%, rgba(44, 83, 100, 0.9) 100%),
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)
          `,
          color: 'white',
          py: { xs: 6, md: 8 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            component="h1"
            sx={{ fontWeight: 700, mb: 3 }}
          >
            {t('servicesTitle')}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 600, mx: 'auto' }}>
            {t('servicesSubtitle')}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* 服务类型 */}
        <Typography
          variant="h3"
          component="h2"
          align="center"
          sx={{ mb: 6, fontWeight: 600 }}
        >
          服务类型
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {services.map((service, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ mb: 3 }}>{service.icon}</Box>
                  <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                    {service.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {service.description}
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    {service.features.map((feature, idx) => (
                      <Typography
                        key={idx}
                        variant="body2"
                        sx={{
                          mb: 1,
                          color: 'primary.main',
                          fontWeight: 500,
                        }}
                      >
                        ✓ {feature}
                      </Typography>
                    ))}
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                      {service.price}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      预计送达：{service.deliveryTime}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button variant="outlined" color="primary">
                    了解更多
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 服务特色 */}
        <Box sx={{ mt: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            align="center"
            sx={{ mb: 6, fontWeight: 600 }}
          >
            服务特色
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ mb: 3 }}>{feature.icon}</Box>
                  <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* 服务流程 */}
        <Box sx={{ mt: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            align="center"
            sx={{ mb: 6, fontWeight: 600 }}
          >
            服务流程
          </Typography>
          
          <Grid container spacing={4}>
            {processSteps.map((step, index) => (
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
                    {step.step}
                  </Box>
                  <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 600 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* 联系我们 */}
        <Box
          sx={{
            mt: 8,
            p: 6,
            backgroundColor: 'primary.main',
            color: 'white',
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h3" sx={{ mb: 3, fontWeight: 600 }}>
            需要定制化服务？
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            我们提供个性化的物流解决方案，满足您的特殊需求
          </Typography>
          <Button
            variant="outlined"
            size="large"
            href="/contact"
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
          >
            联系我们
          </Button>
        </Box>
      </Container>
    </PremiumBackground>
  );
};

export default ServicesPage;

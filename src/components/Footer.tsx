import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
  LocalShipping,
  Phone,
  Email,
  LocationOn,
} from '@mui/icons-material';

const Footer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const quickLinks = [
    { name: '首页', href: '/' },
    { name: '服务介绍', href: '/services' },
    { name: '价格咨询', href: '/pricing' },
    { name: '查询快递', href: '/tracking' },
    { name: '联系我们', href: '/contact' },
  ];

  const services = [
    { name: '国内快递', href: '/services' },
    { name: '国际快递', href: '/services' },
    { name: '同城配送', href: '/services' },
  ];

  const contactInfo = [
    { icon: <Phone sx={{ fontSize: 20 }} />, text: '09-259369349 / 09-678363134' },
    { icon: <Email sx={{ fontSize: 20 }} />, text: 'marketlink982@gmail.com' },
    { icon: <LocationOn sx={{ fontSize: 20 }} />, text: 'Chan Mya Tha Zi ，Mandalay' },
  ];

  const socialLinks = [
    { icon: <Facebook />, href: '#', label: 'Facebook' },
    { icon: <Twitter />, href: '#', label: 'Twitter' },
    { icon: <Instagram />, href: '#', label: 'Instagram' },
    { icon: <LinkedIn />, href: '#', label: 'LinkedIn' },
  ];

  return (
    <Box
      sx={{
        backgroundColor: 'grey.900',
        color: 'white',
        pt: 6,
        pb: 3,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* 公司信息 */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <LocalShipping sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
              <Typography variant="h5" component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
                MARKETLINK EXPRESS
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6, opacity: 0.8 }}>
              缅甸领先的快递物流服务提供商，致力于为客户提供快速、安全、便捷的快递服务。
              我们拥有覆盖全国的物流网络，24小时专业客服团队，让您的包裹安全送达。
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {socialLinks.map((social, index) => (
                <IconButton
                  key={index}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                    },
                  }}
                  aria-label={social.label}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Grid>

          {/* 快速链接 */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" component="h3" sx={{ mb: 3, fontWeight: 600 }}>
              快速链接
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {quickLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  sx={{
                    color: 'white',
                    textDecoration: 'none',
                    opacity: 0.8,
                    '&:hover': {
                      opacity: 1,
                      color: 'primary.main',
                    },
                  }}
                >
                  {link.name}
                </Link>
              ))}
            </Box>
          </Grid>

          {/* 服务 */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" component="h3" sx={{ mb: 3, fontWeight: 600 }}>
              我们的服务
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {services.map((service, index) => (
                <Link
                  key={index}
                  href={service.href}
                  sx={{
                    color: 'white',
                    textDecoration: 'none',
                    opacity: 0.8,
                    '&:hover': {
                      opacity: 1,
                      color: 'primary.main',
                    },
                  }}
                >
                  {service.name}
                </Link>
              ))}
            </Box>
          </Grid>

          {/* 联系信息 */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" component="h3" sx={{ mb: 3, fontWeight: 600 }}>
              联系我们
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {contactInfo.map((contact, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'primary.main' }}>
                    {contact.icon}
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {contact.text}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                营业时间：24小时营业
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                全年无休，随时为您服务
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.2)' }} />

        {/* 底部版权信息 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'center' : 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" sx={{ opacity: 0.7, textAlign: 'center' }}>
            © 2024 MARKETLINK EXPRESS. 保留所有权利。
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Link
              href="#"
              sx={{
                color: 'white',
                textDecoration: 'none',
                opacity: 0.7,
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                  color: 'primary.main',
                },
              }}
            >
              隐私政策
            </Link>
            <Link
              href="#"
              sx={{
                color: 'white',
                textDecoration: 'none',
                opacity: 0.7,
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                  color: 'primary.main',
                },
              }}
            >
              服务条款
            </Link>
            <Link
              href="#"
              sx={{
                color: 'white',
                textDecoration: 'none',
                opacity: 0.7,
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                  color: 'primary.main',
                },
              }}
            >
              网站地图
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

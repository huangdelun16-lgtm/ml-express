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
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useLanguage();

  const quickLinks = [
    { name: t('home'), href: '/' },
    { name: t('services'), href: '/services' },
    { name: t('pricing'), href: '/pricing' },
    { name: t('tracking'), href: '/tracking' },
    { name: t('contact'), href: '/contact' },
  ];

  const services = [
    { name: t('domesticExpress'), href: '/services' },
    { name: t('internationalExpress'), href: '/services' },
    { name: t('sameDay'), href: '/services' },
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
        background: `
          linear-gradient(135deg, rgba(15, 32, 39, 0.95) 0%, rgba(32, 58, 67, 0.95) 50%, rgba(44, 83, 100, 0.95) 100%),
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)
        `,
        color: 'white',
        pt: 6,
        pb: 3,
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
          pointerEvents: 'none',
        }
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
              {t('quickLinks')}
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
              {t('servicesTitle')}
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
              {t('contactTitle')}
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

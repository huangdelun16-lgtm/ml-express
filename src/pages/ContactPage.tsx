import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Phone,
  Email,
  LocationOn,
  AccessTime,
  Send,
  WhatsApp,
  Facebook,
  Instagram,
} from '@mui/icons-material';
import PremiumBackground from '../components/PremiumBackground';

const ContactPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const contactInfo = [
    {
      icon: <Phone sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: '客服热线',
      content: '09-259369349 / 09-678363134',
      subtitle: '24小时服务',
      action: 'tel:09259369349',
      actionText: '立即拨打',
    },
    {
      icon: <WhatsApp sx={{ fontSize: 40, color: 'success.main' }} />,
      title: 'WhatsApp',
      content: '09-259369349 / 09-678363134',
      subtitle: '在线咨询',
      action: 'https://wa.me/959259369349',
      actionText: '发送消息',
    },
    {
      icon: <Email sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: '邮箱地址',
      content: 'marketlink982@gmail.com',
      subtitle: '商务合作',
      action: 'mailto:marketlink982@gmail.com',
      actionText: '发送邮件',
    },
    {
      icon: <LocationOn sx={{ fontSize: 40, color: 'warning.main' }} />,
      title: '总部地址',
      content: 'Chan Mya Tha Zi ，Mandalay',
      subtitle: '缅甸 曼德勒',
      action: '#',
      actionText: '查看地图',
    },
  ];

  const businessHours = [
    { day: '周一至周五', time: '08:00 - 20:00' },
    { day: '周六', time: '09:00 - 18:00' },
    { day: '周日', time: '10:00 - 16:00' },
    { day: '节假日', time: '10:00 - 16:00' },
  ];

  const socialMedia = [
    { name: 'Facebook', icon: <Facebook />, color: '#1877f2', url: 'https://facebook.com/' },
    { name: 'Instagram', icon: <Instagram />, color: '#e4405f', url: 'https://instagram.com/' },
    { name: 'WhatsApp', icon: <WhatsApp />, color: '#25d366', url: 'https://wa.me/959259369349' },
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
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            component="h1"
            sx={{ fontWeight: 700, mb: 3 }}
          >
            联系我们
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 600, mx: 'auto' }}>
            我们随时为您提供专业的快递服务咨询和支持
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* 联系信息卡片 */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 4, fontWeight: 600, textAlign: 'center' }}>
            联系方式
          </Typography>
          <Grid container spacing={4}>
            {contactInfo.map((info, index) => (
              <Grid item xs={12} sm={6} lg={3} key={index}>
                <Card sx={{ height: '100%', textAlign: 'center' }}>
                  <CardContent sx={{ py: 4 }}>
                    <Box sx={{ mb: 2 }}>
                      {info.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {info.title}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                      {info.content}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {info.subtitle}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      href={info.action}
                      target={info.action.startsWith('http') ? '_blank' : undefined}
                      sx={{ textTransform: 'none' }}
                    >
                      {info.actionText}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Grid container spacing={6}>
          {/* 营业时间 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <AccessTime sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    营业时间
                  </Typography>
                </Box>
                <Box>
                  {businessHours.map((schedule, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 1,
                        borderBottom: index < businessHours.length - 1 ? '1px solid #f0f0f0' : 'none',
                      }}
                    >
                      <Typography variant="body1">{schedule.day}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {schedule.time}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 社交媒体 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                  关注我们
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  关注我们的社交媒体，获取最新服务信息和优惠活动
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {socialMedia.map((social, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      startIcon={social.icon}
                      href={social.url}
                      target="_blank"
                      sx={{
                        borderColor: social.color,
                        color: social.color,
                        '&:hover': {
                          borderColor: social.color,
                          backgroundColor: `${social.color}10`,
                        },
                        textTransform: 'none',
                      }}
                    >
                      {social.name}
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 在线留言表单 */}
        <Box sx={{ mt: 6 }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
              在线留言
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
              有任何问题或建议，请填写以下表单，我们会尽快回复您
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="姓名"
                  placeholder="请输入您的姓名"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="电话"
                  placeholder="请输入您的联系电话"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="邮箱"
                  type="email"
                  placeholder="请输入您的邮箱地址"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="留言内容"
                  multiline
                  rows={4}
                  placeholder="请详细描述您的问题或建议"
                  required
                />
              </Grid>
              <Grid item xs={12} sx={{ textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Send />}
                  sx={{ py: 1.5, px: 4, fontSize: '1.1rem' }}
                >
                  提交留言
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* 服务承诺 */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 4, fontWeight: 600, textAlign: 'center' }}>
            服务承诺
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', height: '100%' }}>
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                      24h
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    24小时响应
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    客服团队24小时在线，随时为您解答问题
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', height: '100%' }}>
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                      2h
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    2小时上门
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    同城快递2小时内上门取件，快速响应
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', height: '100%' }}>
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                      100%
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    100%安全保障
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    全程保险保障，货物安全无忧
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </PremiumBackground>
  );
};

export default ContactPage;

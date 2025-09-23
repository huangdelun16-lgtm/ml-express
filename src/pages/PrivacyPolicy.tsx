import React from 'react';
import { Box, Container, Typography } from '@mui/material';

const PrivacyPolicy: React.FC = () => {
  return (
    <Box sx={{ py: { xs: 6, md: 8 } }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>隐私政策</Typography>
        <Typography variant="body1" sx={{ lineHeight: 1.9 }}>
          我们仅为提供快递服务与客服沟通之目的收集必要信息（如姓名、电话、邮箱、地址等）。信息仅限内部使用，不会出售给第三方。我们采用 HTTPS 传输与必要的访问控制保护您的数据。您可随时通过联系我们页面申请查看、纠正或删除您的个人数据。
        </Typography>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;



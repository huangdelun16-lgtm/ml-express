import React from 'react';
import { Box, Container, Typography } from '@mui/material';

const TermsOfService: React.FC = () => {
  return (
    <Box sx={{ py: { xs: 6, md: 8 } }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>服务条款</Typography>
        <Typography variant="body1" sx={{ lineHeight: 1.9 }}>
          使用本网站即表示您同意遵守平台的服务条款：请提供真实准确的信息，不得利用平台从事违法活动。价格与时效以客服确认为准。对于不可抗力造成的延误，我们将积极协助但不承担由此产生的间接损失。
        </Typography>
      </Container>
    </Box>
  );
};

export default TermsOfService;



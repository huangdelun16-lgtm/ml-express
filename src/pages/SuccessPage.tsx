import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const SuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const type = params.get('type');

  const title = type === 'pricing' ? '询价提交成功' : '留言提交成功';
  const desc =
    type === 'pricing'
      ? '我们已收到您的价格询问，客服将在24小时内通过电话或邮箱与您联系。'
      : '我们已收到您的留言，客服将尽快回复您。';

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        color: 'white',
        py: { xs: 8, md: 10 },
        textAlign: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          {title}
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
          {desc}
        </Typography>
        <Button variant="contained" color="secondary" onClick={() => navigate('/')}>返回首页</Button>
      </Container>
    </Box>
  );
};

export default SuccessPage;



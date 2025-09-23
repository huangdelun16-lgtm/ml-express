import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const PageLoader: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 2
      }}
    >
      <CircularProgress size={40} thickness={4} />
      <Typography variant="body2" color="text.secondary">
        正在加载...
      </Typography>
    </Box>
  );
};

export default PageLoader;

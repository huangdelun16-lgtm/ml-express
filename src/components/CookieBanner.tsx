import React, { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';

const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const accepted = localStorage.getItem('__ML_COOKIE_ACCEPTED__');
    if (!accepted) setVisible(true);
  }, []);
  if (!visible) return null;
  return (
    <Box sx={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 1400, bgcolor: 'grey.900', color: 'white', p: 2, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Box sx={{ fontSize: 14 }}>
        我们使用必要的 Cookie 以保障网站正常运行，并用于改善体验。继续使用即表示同意我们的
        <a href="/privacy" style={{ color: '#90caf9', marginLeft: 4 }}>隐私政策</a>。
      </Box>
      <Button variant="contained" color="primary" onClick={() => { localStorage.setItem('__ML_COOKIE_ACCEPTED__', '1'); setVisible(false); }}>同意</Button>
    </Box>
  );
};

export default CookieBanner;



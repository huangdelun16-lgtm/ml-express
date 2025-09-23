import React from 'react';
import { Drawer, Box, Typography, Divider, Button } from '@mui/material';

interface FilterDrawerProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onReset?: () => void;
  onDone?: () => void;
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  children?: React.ReactNode;
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({ open, title = '筛选', onClose, onReset, onDone, anchor = 'bottom', children }) => {
  return (
    <Drawer anchor={anchor} open={open} onClose={onClose} sx={{ display: { xs: 'block', md: 'none' } }}>
      <Box sx={{ p: 2, minWidth: 300 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {children}
          <Box sx={{ display: 'flex', gap: 1, mt: .5 }}>
            {onReset && <Button fullWidth variant="text" onClick={onReset}>重置</Button>}
            <Button fullWidth variant="contained" onClick={onDone || onClose}>完成</Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default FilterDrawer;



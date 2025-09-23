import React from 'react';
import { Box, Chip, Button } from '@mui/material';

export type ActiveChipItem = {
  key: string;
  label: string;
  onDelete: () => void;
};

interface ActiveFilterChipsProps {
  items: ActiveChipItem[];
  onClearAll?: () => void;
  sx?: any;
}

const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({ items, onClearAll, sx }) => {
  if (!items || items.length === 0) return null;
  return (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, ...(sx || {}) }}>
      {items.map((item) => (
        <Chip key={item.key} label={item.label} onDelete={item.onDelete} />
      ))}
      {onClearAll && (
        <Button size="small" onClick={onClearAll}>清空筛选</Button>
      )}
    </Box>
  );
};

export default ActiveFilterChips;



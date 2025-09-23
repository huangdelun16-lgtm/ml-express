import React from 'react';
import { Button, ButtonProps } from '@mui/material';

const GlassButton: React.FC<ButtonProps> = ({ sx, children, ...rest }) => {
  return (
    <Button
      {...rest}
      sx={{
        position: 'relative',
        color: 'white',
        borderColor: 'rgba(255,255,255,0.65)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
        backdropFilter: 'blur(10px) saturate(120%)',
        WebkitBackdropFilter: 'blur(10px) saturate(120%)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderStyle: 'solid',
        px: 4,
        py: 1.5,
        fontWeight: 700,
        textShadow: '0 1px 2px rgba(0,0,0,0.35)',
        '&:hover': {
          background: 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.1))',
          borderColor: 'rgba(255,255,255,0.85)',
        },
        ...sx,
      }}
    >
      {children}
    </Button>
  );
};

export default GlassButton;



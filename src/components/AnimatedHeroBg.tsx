import React from 'react';
import { Box } from '@mui/material';

const AnimatedHeroBg: React.FC<{ children: React.ReactNode } & { intensity?: number }> = ({ children, intensity = 1 }) => {
  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Gradient layer */}
      <Box
        sx={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(900px 500px at 10% -10%, rgba(66,165,245,${0.35*intensity}) 0%, transparent 55%),
                       radial-gradient(900px 500px at 90% 0%, rgba(156,39,176,${0.28*intensity}) 0%, transparent 60%),
                       linear-gradient(135deg, #0d47a1 0%, #1976d2 40%, #42a5f5 100%)`,
        }}
      />
      {/* Floating blobs */}
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Box sx={{
          position: 'absolute', width: 260, height: 260, left: -60, top: -40,
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.45), rgba(255,255,255,0))',
          filter: 'blur(10px)', borderRadius: '50%',
          animation: 'blob1 12s ease-in-out infinite',
          '@keyframes blob1': {
            '0%, 100%': { transform: 'translate(0,0) scale(1)' },
            '50%': { transform: 'translate(50px,30px) scale(1.08)' },
          },
        }} />
        <Box sx={{
          position: 'absolute', width: 220, height: 220, right: -40, top: 0,
          background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0))',
          filter: 'blur(12px)', borderRadius: '50%',
          animation: 'blob2 14s ease-in-out infinite',
          '@keyframes blob2': {
            '0%, 100%': { transform: 'translate(0,0) scale(1)' },
            '50%': { transform: 'translate(-40px,20px) scale(1.06)' },
          },
        }} />
        <Box sx={{
          position: 'absolute', width: 180, height: 180, left: '45%', bottom: -60,
          background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.28), rgba(255,255,255,0))',
          filter: 'blur(14px)', borderRadius: '50%',
          animation: 'blob3 16s ease-in-out infinite',
          '@keyframes blob3': {
            '0%, 100%': { transform: 'translate(-20px,0) scale(1)' },
            '50%': { transform: 'translate(10px,-20px) scale(1.1)' },
          },
        }} />
      </Box>
      {/* Shine grid */}
      <Box sx={{
        position: 'absolute', inset: 0, opacity: 0.12,
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)`,
        backgroundSize: '22px 22px',
        maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
      }} />
      {/* Content */}
      <Box sx={{ position: 'relative' }}>{children}</Box>
    </Box>
  );
};

export default AnimatedHeroBg;

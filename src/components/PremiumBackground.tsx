import React from 'react';
import { Box } from '@mui/material';

interface PremiumBackgroundProps {
  children: React.ReactNode;
  variant?: 'hero' | 'page' | 'admin';
  minHeight?: string;
}

const PremiumBackground: React.FC<PremiumBackgroundProps> = ({ 
  children, 
  variant = 'page',
  minHeight = '100vh'
}) => {
  const getBackgroundStyle = () => {
    switch (variant) {
      case 'hero':
        return {
          background: `
            linear-gradient(135deg, rgba(15, 32, 39, 0.9) 0%, rgba(32, 58, 67, 0.9) 50%, rgba(44, 83, 100, 0.9) 100%),
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)
          `,
          color: 'white',
        };
      case 'admin':
        return {
          background: `
            linear-gradient(135deg, rgba(15, 32, 39, 0.95) 0%, rgba(32, 58, 67, 0.95) 100%),
            radial-gradient(circle at 30% 70%, rgba(25, 118, 210, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 70% 30%, rgba(66, 165, 245, 0.1) 0%, transparent 50%)
          `,
          color: 'white',
        };
      default:
        return {
          background: `
            linear-gradient(135deg, rgba(248, 249, 250, 1) 0%, rgba(233, 236, 239, 1) 100%),
            radial-gradient(circle at 20% 80%, rgba(25, 118, 210, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(66, 165, 245, 0.05) 0%, transparent 50%)
          `,
        };
    }
  };

  return (
    <Box
      sx={{
        ...getBackgroundStyle(),
        minHeight,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: variant === 'hero' || variant === 'admin' 
            ? 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            : 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%231976d2" fill-opacity="0.02"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.1,
          pointerEvents: 'none',
        }
      }}
    >
      {children}
    </Box>
  );
};

export default PremiumBackground;

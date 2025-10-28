import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  message?: string;
}

/**
 * 加载动画组件
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'rgba(255, 255, 255, 0.8)',
  message
}) => {
  const sizes = {
    small: '24px',
    medium: '40px',
    large: '64px'
  };

  const borderWidths = {
    small: '3px',
    medium: '4px',
    large: '6px'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px'
    }}>
      <div
        style={{
          width: sizes[size],
          height: sizes[size],
          border: `${borderWidths[size]} solid ${color}20`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      {message && (
        <p style={{
          color: color,
          fontSize: size === 'small' ? '0.875rem' : '1rem',
          margin: 0
        }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;


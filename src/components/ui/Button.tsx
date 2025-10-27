import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  type = 'button',
  loading = false,
  className = ''
}) => {
  const isDisabled = disabled || loading;

  // 颜色方案
  const colorSchemes = {
    primary: {
      background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
      hoverBackground: 'linear-gradient(135deg, #2a5180 0%, #2f80cc 100%)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(44, 82, 130, 0.3)',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.1)',
      hoverBackground: 'rgba(255, 255, 255, 0.15)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: 'none',
    },
    success: {
      background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
      hoverBackground: 'linear-gradient(135deg, #36a067 0%, #46b976 100%)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(56, 161, 105, 0.3)',
    },
    danger: {
      background: 'linear-gradient(135deg, #e53e3e 0%, #fc8181 100%)',
      hoverBackground: 'linear-gradient(135deg, #e33c3c 0%, #fa7f7f 100%)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(229, 62, 62, 0.3)',
    },
    outline: {
      background: 'transparent',
      hoverBackground: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      boxShadow: 'none',
    },
    ghost: {
      background: 'rgba(255, 255, 255, 0.05)',
      hoverBackground: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.9)',
      boxShadow: 'none',
    },
  };

  // 尺寸
  const sizes = {
    small: { padding: '8px 16px', fontSize: '0.875rem', minHeight: '36px' },
    medium: { padding: '12px 24px', fontSize: '1rem', minHeight: '44px' },
    large: { padding: '16px 32px', fontSize: '1.125rem', minHeight: '52px' },
  };

  const scheme = colorSchemes[variant];
  const sizeStyle = sizes[size];

  const buttonStyle: React.CSSProperties = {
    padding: sizeStyle.padding,
    minHeight: sizeStyle.minHeight,
    fontSize: sizeStyle.fontSize,
    fontWeight: 600,
    borderRadius: '8px',
    border: scheme.border || 'none',
    background: scheme.background,
    color: scheme.color,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: scheme.boxShadow,
    width: fullWidth ? '100%' : 'auto',
    opacity: isDisabled ? 0.6 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled && !loading) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = scheme.boxShadow
        ? scheme.boxShadow.replace('0 4px', '0 6px').replace('0.3)', '0.4)')
        : '0 6px 20px rgba(0, 0, 0, 0.1)';
    }
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled && !loading) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = scheme.boxShadow || 'none';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      style={buttonStyle}
      className={className}
    >
      {loading && <span style={{ marginRight: '8px' }}>⏳</span>}
      {children}
    </button>
  );
};

export default Button;

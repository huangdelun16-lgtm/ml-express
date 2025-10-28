import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  size?: 'small' | 'medium' | 'large';
}

/**
 * 空状态组件
 * 用于显示无数据时的友好提示
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📦',
  title = '暂无数据',
  message = '这里什么都没有',
  actionLabel,
  onAction,
  size = 'medium'
}) => {
  const sizeStyles = {
    small: { fontSize: '2rem', padding: '24px' },
    medium: { fontSize: '3rem', padding: '48px' },
    large: { fontSize: '4rem', padding: '64px' }
  };

  const currentSize = sizeStyles[size];

  return (
    <div style={{
      textAlign: 'center',
      padding: currentSize.padding,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px'
    }}>
      <div style={{
        fontSize: currentSize.fontSize,
        marginBottom: '16px',
        animation: 'pulse 2s ease-in-out infinite'
      }}>
        {icon}
      </div>
      <h3 style={{
        color: '#718096',
        fontSize: size === 'small' ? '1rem' : '1.25rem',
        fontWeight: 600,
        marginBottom: '8px',
        margin: 0
      }}>
        {title}
      </h3>
      {message && (
        <p style={{
          color: '#A0AEC0',
          fontSize: size === 'small' ? '0.875rem' : '1rem',
          marginBottom: actionLabel ? '20px' : 0,
          maxWidth: '400px'
        }}>
          {message}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;


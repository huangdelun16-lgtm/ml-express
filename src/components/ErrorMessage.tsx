import React from 'react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  severity?: 'error' | 'warning';
}

/**
 * 错误消息组件
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  onRetry,
  severity = 'error'
}) => {
  const styles = {
    error: {
      background: 'rgba(245, 101, 101, 0.15)',
      border: '1px solid rgba(245, 101, 101, 0.3)',
      icon: '❌',
      iconColor: '#f56565'
    },
    warning: {
      background: 'rgba(237, 137, 54, 0.15)',
      border: '1px solid rgba(237, 137, 54, 0.3)',
      icon: '⚠️',
      iconColor: '#ed8936'
    }
  };

  const currentStyle = styles[severity];

  return (
    <div
      style={{
        padding: '20px 24px',
        borderRadius: '12px',
        background: currentStyle.background,
        border: currentStyle.border,
        color: 'white'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '1.5rem' }}>{currentStyle.icon}</span>
        <div style={{ flex: 1 }}>
          {title && (
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '1.125rem',
              fontWeight: 600
            }}>
              {title}
            </h4>
          )}
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            lineHeight: '1.5',
            opacity: 0.9
          }}>
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              🔄 重试
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;


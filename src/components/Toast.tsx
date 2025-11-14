import React, { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

/**
 * Toast 通知组件
 */
export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration = 3000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // 等待动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const typeStyles = {
    success: {
      background: 'rgba(72, 187, 120, 0.2)',
      border: '1px solid rgba(72, 187, 120, 0.4)',
      icon: '✅'
    },
    error: {
      background: 'rgba(245, 101, 101, 0.2)',
      border: '1px solid rgba(245, 101, 101, 0.4)',
      icon: '❌'
    },
    warning: {
      background: 'rgba(237, 137, 54, 0.2)',
      border: '1px solid rgba(237, 137, 54, 0.4)',
      icon: '⚠️'
    },
    info: {
      background: 'rgba(66, 153, 225, 0.2)',
      border: '1px solid rgba(66, 153, 225, 0.4)',
      icon: 'ℹ️'
    }
  };

  const style = typeStyles[type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        background: style.background,
        border: style.border,
        color: 'white',
        minWidth: '300px',
        maxWidth: '500px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onClick={() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300);
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{style.icon}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>
        {message}
      </span>
    </div>
  );
};

/**
 * Toast 容器组件
 */
export const ToastContainer: React.FC<{ toasts: Array<{ id: string; message: string; type: ToastType }> }> = ({ toasts }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}
    >
      {/* Toasts 将通过上下文或 state 管理 */}
    </div>
  );
};

export default Toast;


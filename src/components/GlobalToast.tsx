import React, { useEffect, useState } from 'react';
import { toastService, ToastMessage, ToastType } from '../services/ToastService';

const COLORS: Record<ToastType, string> = {
  success: '#059669',
  error: '#dc2626',
  warning: '#d97706',
  info: '#0f172a',
};

export const GlobalToast: React.FC = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleShow = (message: ToastMessage) => {
      setToast(message);
      setVisible(true);
    };
    const handleHide = () => setVisible(false);

    toastService.on('show', handleShow);
    toastService.on('hide', handleHide);
    return () => {
      toastService.off('show', handleShow);
      toastService.off('hide', handleHide);
    };
  }, []);

  useEffect(() => {
    if (!visible || !toast) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      toastService.dismiss();
    }, toast.duration ?? 3000);
    return () => window.clearTimeout(timer);
  }, [visible, toast]);

  if (!toast || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: COLORS[toast.type],
        color: '#fff',
        padding: '12px 20px',
        borderRadius: 14,
        fontWeight: 700,
        fontSize: 14,
        lineHeight: 1.45,
        boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
        maxWidth: 'min(92vw, 440px)',
        whiteSpace: 'pre-wrap',
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      {toast.message}
    </div>
  );
};

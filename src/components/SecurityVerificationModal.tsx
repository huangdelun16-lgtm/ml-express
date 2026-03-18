import React, { useState, useEffect, useRef } from 'react';
import { verifyCurrentUserPassword } from '../services/authService';

interface SecurityVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
  title?: string;
  description?: string;
}

const SecurityVerificationModal: React.FC<SecurityVerificationModalProps> = ({
  visible,
  onClose,
  onVerifySuccess,
  title = '安全验证',
  description = '此操作涉及高危系统配置或大量数据修改，请验证管理员密码以继续。'
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setError(null);
      // 自动聚焦
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  if (!visible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const result = await verifyCurrentUserPassword(password);
      if (result.success) {
        onVerifySuccess();
        onClose();
      } else {
        setError(result.error || '密码验证失败，请重试');
      }
    } catch (err) {
      setError('服务器连接失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '20px',
        padding: '2rem',
        width: '90%',
        maxWidth: '400px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            width: '80px',
            height: '80px',
            borderRadius: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>🔐</div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 800 }}>{title}</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.5 }}>
            {description}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              ref={inputRef}
              type="password"
              placeholder="请输入管理员密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px', textAlign: 'center', fontWeight: 600 }}>
                ❌ {error}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                fontWeight: 800,
                cursor: (loading || !password) ? 'not-allowed' : 'pointer',
                opacity: (loading || !password) ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
              }}
            >
              {loading ? '验证中...' : '确认授权'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecurityVerificationModal;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAccountService, auditLogService } from '../services/supabase';
import { saveToken } from '../services/authService';
import { feedbackService } from '../services/FeedbackService';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { account, authToken } = await adminAccountService.login(username, password);

      if (account) {
        await saveToken(account.username, account.role, account.employee_name, account.region, account.permissions as string[] | undefined, authToken);

        void auditLogService.log({
          user_id: account.username,
          user_name: account.employee_name,
          action_type: 'login',
          module: 'system',
          action_description: `用户登录系统，角色：${account.role === 'admin' ? '管理员' : account.role === 'manager' ? '经理' : account.role === 'finance' ? '财务' : '操作员'}`
        });

        navigate('/admin/dashboard');
      } else {
        feedbackService.notify('用户名或密码错误，或账号已被停用');
      }
    } catch (error) {
      console.error('登录异常:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      feedbackService.notify('登录失败，请检查网络连接。错误：' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // LOGO组件
  const Logo = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
    const logoSize = size === 'small' ? '80px' : size === 'large' ? '160px' : '120px';
    const textSize = size === 'small' ? '1rem' : size === 'large' ? '1.8rem' : '1.4rem';
    
    return (
      <div 
        style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'opacity 0.3s ease'
        }}
        onClick={() => window.location.href = '/'}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
      >
        <img 
          src="/logo.png" 
          alt="ML Express Logo"
          style={{
            width: logoSize,
            height: logoSize,
            objectFit: 'contain'
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: 'max-content' }}>
          <div className="admin-shell__brand-name" style={{ fontSize: textSize, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'visible' }}>
            MARKET LINK EXPRESS
          </div>
          <div className="admin-shell__brand-sub" style={{ textAlign: 'center', marginTop: 4 }}>
            Delivery Services
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <div className="admin-login__logo" onClick={() => { window.location.href = '/'; }}>
          <Logo size="medium" />
        </div>
        <h2 style={{ margin: '0 0 24px', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center' }}>
          后台管理系统
        </h2>
        <form onSubmit={handleLogin}>
          <div className="admin-login__field">
            <label htmlFor="admin-login-user">用户名</label>
            <input
              id="admin-login-user"
              type="text"
              autoComplete="username"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="admin-login__field">
            <label htmlFor="admin-login-pass">密码</label>
            <input
              id="admin-login-pass"
              type="password"
              autoComplete="current-password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="admin-login__submit" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;


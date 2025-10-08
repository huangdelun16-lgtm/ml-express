import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAccountService, auditLogService } from '../services/supabase';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 尝试数据库登录
      const account = await adminAccountService.login(username, password);
      
      if (account) {
        // 登录成功，保存用户信息到 localStorage
        localStorage.setItem('currentUser', account.username);
        localStorage.setItem('currentUserName', account.employee_name);
        localStorage.setItem('currentUserRole', account.role);
        
        // 记录登录日志
        await auditLogService.log({
          user_id: account.username,
          user_name: account.employee_name,
          action_type: 'login',
          module: 'system',
          action_description: `用户登录系统，角色：${account.role === 'admin' ? '管理员' : account.role === 'manager' ? '经理' : account.role === 'finance' ? '财务' : '操作员'}`
        });
        
        navigate('/admin/dashboard');
      } else {
        // 如果数据库登录失败，回退到硬编码验证（兼容模式）
        if (username === 'admin' && password === 'admin') {
          localStorage.setItem('currentUser', 'admin');
          localStorage.setItem('currentUserName', '管理员');
          localStorage.setItem('currentUserRole', 'admin');
          
          // 记录登录日志
          await auditLogService.log({
            user_id: 'admin',
            user_name: '管理员',
            action_type: 'login',
            module: 'system',
            action_description: '管理员登录系统（默认账号）'
          });
          
          navigate('/admin/dashboard');
        } else {
          alert('用户名或密码错误，或账号已被停用');
        }
      }
    } catch (error) {
      console.error('登录异常:', error);
      alert('登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // LOGO组件
  const Logo = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
    const logoSize = size === 'small' ? '40px' : size === 'large' ? '80px' : '60px';
    const textSize = size === 'small' ? '0.8rem' : size === 'large' ? '1.2rem' : '1rem';
    
    return (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          cursor: 'pointer',
          transition: 'opacity 0.3s ease'
        }}
        onClick={() => window.location.href = '/'}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
      >
        {/* LOGO图片 */}
        <img 
          src="/logo.png" 
          alt="ML Express Logo"
          style={{
            width: logoSize,
            height: logoSize,
            objectFit: 'contain'
          }}
        />
        
        {/* 公司名称 */}
        <div style={{
          color: 'white',
          fontSize: textSize,
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          MARKET LINK EXPRESS
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '10%',
        width: '300px',
        height: '300px',
        background: 'rgba(192, 192, 192, 0.1)',
        borderRadius: '50%',
        filter: 'blur(60px)'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '10%',
        width: '200px',
        height: '200px',
        background: 'rgba(192, 192, 192, 0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }}></div>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 20px 60px rgba(26, 54, 93, 0.3)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Logo size="large" />
        </div>
        
        <h2 style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginBottom: '30px',
          fontSize: '2rem',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          管理后台登录
        </h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                fontSize: '1rem',
                background: 'rgba(255, 255, 255, 0.9)',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
              required
            />
          </div>
          <div style={{ marginBottom: '30px' }}>
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '10px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                fontSize: '1rem',
                background: 'rgba(255, 255, 255, 0.9)',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: loading ? 'rgba(192, 192, 192, 0.5)' : 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%)',
              color: '#2C3E50',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(192, 192, 192, 0.3)',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              opacity: loading ? 0.7 : 1
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(192, 192, 192, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(192, 192, 192, 0.3)';
              }
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        
        {/* 退出按钮 */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              backdropFilter: 'blur(10px)',
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
            ← 返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

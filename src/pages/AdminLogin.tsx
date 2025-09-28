import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 简单的登录验证
    if (username === 'admin' && password === 'admin') {
      navigate('/admin/dashboard');
    } else {
      alert('用户名或密码错误');
    }
  };

  // LOGO组件
  const Logo = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
    const logoSize = size === 'small' ? '40px' : size === 'large' ? '80px' : '60px';
    const textSize = size === 'small' ? '0.8rem' : size === 'large' ? '1.2rem' : '1rem';
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* LOGO图标 */}
        <div style={{
          width: logoSize,
          height: logoSize,
          background: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 50%, #A8A8A8 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {/* ML字母 */}
          <div style={{
            color: '#2C3E50',
            fontWeight: 'bold',
            fontSize: size === 'small' ? '16px' : size === 'large' ? '28px' : '20px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            letterSpacing: '-1px'
          }}>
            ML
          </div>
          {/* 卡车图标 */}
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: size === 'small' ? '8px' : size === 'large' ? '16px' : '12px',
            height: size === 'small' ? '6px' : size === 'large' ? '12px' : '8px',
            background: '#2C3E50',
            borderRadius: '1px',
            opacity: 0.8
          }}></div>
        </div>
        
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
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%)',
              color: '#2C3E50',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(192, 192, 192, 0.3)',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(192, 192, 192, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(192, 192, 192, 0.3)';
            }}
          >
            登录
          </button>
        </form>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          textAlign: 'center', 
          marginTop: '20px',
          fontSize: '0.9rem',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          默认账号: admin / admin
        </p>
        
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

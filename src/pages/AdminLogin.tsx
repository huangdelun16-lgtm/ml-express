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

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h2 style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginBottom: '30px',
          fontSize: '2rem'
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
                border: 'none',
                fontSize: '1rem',
                background: 'rgba(255, 255, 255, 0.9)'
              }}
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
                border: 'none',
                fontSize: '1rem',
                background: 'rgba(255, 255, 255, 0.9)'
              }}
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
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            登录
          </button>
        </form>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          textAlign: 'center', 
          marginTop: '20px',
          fontSize: '0.9rem'
        }}>
          默认账号: admin / admin
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;

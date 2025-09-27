import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '800px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px', fontWeight: 'bold' }}>
          MARKET LINK EXPRESS
        </h1>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '40px', opacity: 0.9 }}>
          缅甸专业快递服务
        </h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '40px', lineHeight: '1.6' }}>
          快速、安全、可靠的快递服务，连接缅甸各地
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a 
            href="/admin/login" 
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '25px',
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            管理后台
          </a>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

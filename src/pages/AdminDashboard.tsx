import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/admin/login');
  };

  const cardData = [
    {
      title: '同城包裹',
      description: '同城快递包裹管理',
      color: '#42a5f5'
    },
    {
      title: '用户管理',
      description: '客户信息和行为分析',
      color: '#faad14'
    },
    {
      title: '快递员管理',
      description: '快递员信息和业绩管理',
      color: '#722ed1'
    },
    {
      title: '财务管理',
      description: '收入统计和佣金管理',
      color: '#f5222d'
    },
    {
      title: '实时跟踪',
      description: 'GPS位置监控和路线跟踪',
      color: '#722ed1'
    },
    {
      title: '系统设置',
      description: '价格规则和系统配置',
      color: '#13c2c2'
    },
  ];

  const handleCardClick = (title: string) => {
    alert(`点击了: ${title}`);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      {/* 头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>
          MARKET LINK EXPRESS
        </h1>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          退出登录
        </button>
      </div>

      {/* 版本信息 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        padding: '20px',
        marginBottom: '30px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
          🎯 全新版本 v1.0.0 - 简洁稳定
        </h2>
        <p style={{ margin: '10px 0 0 0', opacity: 0.8 }}>
          所有功能正常运行，卡片可以正常点击
        </p>
      </div>

      {/* 卡片网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {cardData.map((card, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(card.title)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '30px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              color: 'white',
              textAlign: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: card.color,
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              📦
            </div>
            <h3 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '10px',
              fontWeight: 'bold'
            }}>
              {card.title}
            </h3>
            <p style={{ 
              opacity: 0.8, 
              lineHeight: '1.5',
              margin: 0
            }}>
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;

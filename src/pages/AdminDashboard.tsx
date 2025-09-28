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
      color: '#2c5282',
      icon: '📦'
    },
    {
      title: '用户管理',
      description: '客户信息和行为分析',
      color: '#3182ce',
      icon: '👥'
    },
    {
      title: '快递员管理',
      description: '快递员信息和业绩管理',
      color: '#2c5282',
      icon: '🚚'
    },
    {
      title: '财务管理',
      description: '收入统计和佣金管理',
      color: '#3182ce',
      icon: '💰'
    },
    {
      title: '实时跟踪',
      description: 'GPS位置监控和路线跟踪',
      color: '#2c5282',
      icon: '📍'
    },
    {
      title: '系统设置',
      description: '价格规则和系统配置',
      color: '#3182ce',
      icon: '⚙️'
    },
  ];

  const handleCardClick = (title: string) => {
    if (title === '同城包裹') {
      navigate('/admin/city-packages');
    } else if (title === '用户管理') {
      navigate('/admin/users');
    } else if (title === '快递员管理') {
      navigate('/admin/couriers');
    } else if (title === '财务管理') {
      navigate('/admin/finance');
    } else {
      alert(`点击了: ${title}`);
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
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '5%',
        width: '200px',
        height: '200px',
        background: 'rgba(192, 192, 192, 0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '5%',
        left: '5%',
        width: '150px',
        height: '150px',
        background: 'rgba(192, 192, 192, 0.1)',
        borderRadius: '50%',
        filter: 'blur(30px)'
      }}></div>
      
      {/* 头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        color: 'white',
        position: 'relative',
        zIndex: 1
      }}>
        <Logo size="medium" />
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem',
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
          退出登录
        </button>
      </div>


      {/* 卡片网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {cardData.map((card, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(card.title)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '30px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(26, 54, 93, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(26, 54, 93, 0.3)';
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`,
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}>
              {card.icon}
            </div>
            <h3 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '10px',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
            }}>
              {card.title}
            </h3>
            <p style={{ 
              opacity: 0.8, 
              lineHeight: '1.5',
              margin: 0,
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
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

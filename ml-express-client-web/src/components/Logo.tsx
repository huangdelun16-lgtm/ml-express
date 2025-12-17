import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  paddingRight?: string;
}

const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  paddingRight = '0px'
}) => {
  const navigate = useNavigate();
  const logoSize = size === 'small' ? '80px' : size === 'large' ? '160px' : '120px';
  
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        cursor: 'pointer',
        transition: 'opacity 0.3s ease',
        paddingRight
      }}
      onClick={() => navigate('/')}
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
      
      {/* 公司名称 - 双色标题 + 副标题 */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          color: 'white',
          fontSize: size === 'small' ? '1.6rem' : size === 'large' ? '4rem' : '2.2rem',
          fontWeight: '900',
          textShadow: '0 4px 8px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.2)',
          background: 'linear-gradient(135deg, #ffffff 0%, #e6f2ff 50%, #b3d9ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '1px',
          whiteSpace: 'nowrap',
          fontFamily: "'Montserrat', 'Roboto', sans-serif",
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
        }}>
          MARKET LINK <span style={{ 
            fontSize: '1em', 
            fontStyle: 'italic', 
            fontWeight: '900',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginLeft: '4px'
          }}>EXPRESS</span>
        </span>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          fontStyle: 'italic',
          fontSize: size === 'small' ? '0.5rem' : size === 'large' ? '0.9rem' : '0.7rem',
          fontWeight: '600',
          letterSpacing: size === 'small' ? '2px' : '4px',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.9)',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          fontFamily: "'Roboto', sans-serif",
          marginTop: '4px',
          marginLeft: size === 'small' ? '0' : size === 'large' ? '0' : '0'
        }}>
          <span style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end',
            marginRight: '6px',
            gap: '2px',
            justifyContent: 'center'
          }}>
            <span style={{ 
              width: size === 'small' ? '16px' : size === 'large' ? '40px' : '24px',
              height: '1.5px',
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'block'
            }}></span>
            <span style={{ 
              width: size === 'small' ? '24px' : size === 'large' ? '60px' : '36px',
              height: '1.5px',
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'block'
            }}></span>
            <span style={{ 
              width: size === 'small' ? '32px' : size === 'large' ? '80px' : '48px',
              height: '1.5px',
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'block'
            }}></span>
          </span>
          DELIVERY SERVICES
          <span style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start',
            marginLeft: '6px',
            gap: '2px',
            justifyContent: 'center'
          }}>
            <span style={{ 
              width: size === 'small' ? '16px' : size === 'large' ? '40px' : '24px',
              height: '1.5px',
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'block'
            }}></span>
            <span style={{ 
              width: size === 'small' ? '24px' : size === 'large' ? '60px' : '36px',
              height: '1.5px',
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'block'
            }}></span>
            <span style={{ 
              width: size === 'small' ? '32px' : size === 'large' ? '80px' : '48px',
              height: '1.5px',
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'block'
            }}></span>
          </span>
        </span>
      </div>
    </div>
  );
};

export default Logo;


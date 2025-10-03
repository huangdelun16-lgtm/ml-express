import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { adminAccountService } from '../services/supabase';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  
  // 获取当前用户角色
  const currentUserRole = localStorage.getItem('currentUserRole') || 'operator';
  const currentUserName = localStorage.getItem('currentUserName') || '用户';
  const currentUser = localStorage.getItem('currentUser') || '';

  // 用户编辑模态框状态
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [userEditFormData, setUserEditFormData] = useState({
    username: '',
    password: '',
    employee_name: ''
  });

  const handleLogout = () => {
    navigate('/admin/login');
  };

  // 处理用户信息点击
  const handleUserInfoClick = () => {
    setUserEditFormData({
      username: currentUser,
      password: '',
      employee_name: currentUserName
    });
    setShowUserEditModal(true);
  };

  // 处理用户信息更新
  const handleUpdateUserInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 获取当前用户的完整信息
      const accounts = await adminAccountService.getAllAccounts();
      const currentAccount = accounts.find(account => account.username === currentUser);
      
      if (!currentAccount) {
        alert('未找到当前用户信息');
        return;
      }

      const updateData: any = {
        employee_name: userEditFormData.employee_name
      };

      // 只有在输入了新密码时才更新密码
      if (userEditFormData.password.trim()) {
        updateData.password = userEditFormData.password;
      }

      // 如果用户名发生变化，也需要更新
      if (userEditFormData.username !== currentUser) {
        updateData.username = userEditFormData.username;
      }

      const success = await adminAccountService.updateAccount(currentAccount.id!, updateData);
      
      if (success) {
        // 更新本地存储
        localStorage.setItem('currentUser', userEditFormData.username);
        localStorage.setItem('currentUserName', userEditFormData.employee_name);
        
        alert('个人信息更新成功！');
        setShowUserEditModal(false);
        
        // 刷新页面以显示更新后的信息
        window.location.reload();
      } else {
        alert('更新失败，请重试');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      alert('更新失败，请重试');
    }
  };

  // 所有卡片数据及其权限配置
  const allCardData = [
    {
      title: language === 'zh' ? '同城包裹' : 'City Packages',
      description: language === 'zh' ? '同城快递包裹管理' : 'Local express package management',
      color: '#2c5282',
      icon: '📦',
      roles: ['admin', 'manager', 'operator', 'finance'] // 所有角色都可访问
    },
    {
      title: language === 'zh' ? '用户管理' : 'User Management',
      description: language === 'zh' ? '客户信息和行为分析' : 'Customer info and behavior analysis',
      color: '#3182ce',
      icon: '👥',
      roles: ['admin', 'manager'] // 仅管理员和经理可访问
    },
    {
      title: language === 'zh' ? '快递员管理' : 'Courier Management',
      description: language === 'zh' ? '快递员信息和业绩管理' : 'Courier info and performance management',
      color: '#2c5282',
      icon: '🚚',
      roles: ['admin', 'manager'] // 仅管理员和经理可访问
    },
    {
      title: language === 'zh' ? '财务管理' : 'Finance Management',
      description: language === 'zh' ? '收入统计和佣金管理' : 'Income statistics and commission management',
      color: '#3182ce',
      icon: '💰',
      roles: ['admin', 'manager', 'finance'] // 管理员、经理和财务可访问
    },
    {
      title: language === 'zh' ? '实时跟踪' : 'Real-time Tracking',
      description: language === 'zh' ? 'GPS位置监控和路线跟踪' : 'GPS location monitoring and route tracking',
      color: '#2c5282',
      icon: '📍',
      roles: ['admin', 'manager', 'operator'] // 管理员、经理和操作员可访问
    },
    {
      title: language === 'zh' ? '系统设置' : 'System Settings',
      description: language === 'zh' ? '价格规则和系统配置' : 'Price rules and system configuration',
      color: '#3182ce',
      icon: '⚙️',
      roles: ['admin'] // 仅管理员可访问
    },
  ];

  // 根据当前用户角色筛选可访问的卡片
  const cardData = allCardData.filter(card => card.roles.includes(currentUserRole));

  const handleCardClick = (title: string) => {
    // 根据卡片标题（支持中英文）导航到对应页面
    if (title === '同城包裹' || title === 'City Packages') {
      navigate('/admin/city-packages');
    } else if (title === '用户管理' || title === 'User Management') {
      navigate('/admin/users');
    } else if (title === '快递员管理' || title === 'Courier Management') {
      navigate('/admin/couriers');
    } else if (title === '财务管理' || title === 'Finance Management') {
      navigate('/admin/finance');
    } else if (title === '实时跟踪' || title === 'Real-time Tracking') {
      navigate('/admin/tracking');
    } else if (title === '系统设置' || title === 'System Settings') {
      navigate('/admin/settings');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 语言切换器 */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
            }}
          >
            <option value="zh" style={{ color: '#000' }}>中文</option>
            <option value="en" style={{ color: '#000' }}>English</option>
          </select>

          {/* 用户信息 */}
          <div 
            onClick={handleUserInfoClick}
            style={{ 
              textAlign: 'right',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{currentUserName}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '3px' }}>
              {currentUserRole === 'admin' && (language === 'zh' ? '系统管理员' : 'System Admin')}
              {currentUserRole === 'manager' && (language === 'zh' ? '经理' : 'Manager')}
              {currentUserRole === 'operator' && (language === 'zh' ? '操作员' : 'Operator')}
              {currentUserRole === 'finance' && (language === 'zh' ? '财务' : 'Finance')}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px' }}>
              点击编辑个人信息
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}
          >
            {language === 'zh' ? '退出登录' : 'Logout'}
          </button>
        </div>
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
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                padding: '32px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                color: 'white',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(26, 54, 93, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(26, 54, 93, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(26, 54, 93, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
            >
              {/* 装饰性背景元素 */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '100px',
                height: '100px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-30%',
                left: '-10%',
                width: '60px',
                height: '60px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 50%, ${card.color}dd 100%)`,
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              boxShadow: `0 8px 25px ${card.color}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '20px',
                height: '20px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />
              {card.icon}
            </div>
            <h3 style={{ 
              fontSize: '1.6rem', 
              marginBottom: '12px',
              fontWeight: 700,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              letterSpacing: '0.5px',
              position: 'relative',
              zIndex: 2
            }}>
              {card.title}
            </h3>
            <p style={{ 
              opacity: 0.9, 
              lineHeight: '1.6',
              margin: 0,
              textShadow: '0 1px 4px rgba(0,0,0,0.2)',
              fontSize: '0.95rem',
              position: 'relative',
              zIndex: 2
            }}>
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {/* 用户编辑模态框 */}
      {showUserEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ 
              color: 'white', 
              marginBottom: '25px', 
              textAlign: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>
              编辑个人信息
            </h2>
            
            <form onSubmit={handleUpdateUserInfo}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'white', 
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  用户名
                </label>
                <input
                  type="text"
                  value={userEditFormData.username}
                  onChange={(e) => setUserEditFormData({
                    ...userEditFormData,
                    username: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'white', 
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  员工姓名
                </label>
                <input
                  type="text"
                  value={userEditFormData.employee_name}
                  onChange={(e) => setUserEditFormData({
                    ...userEditFormData,
                    employee_name: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'white', 
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  新密码 (留空则不修改)
                </label>
                <input
                  type="password"
                  value={userEditFormData.password}
                  onChange={(e) => setUserEditFormData({
                    ...userEditFormData,
                    password: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                  placeholder="输入新密码"
                />
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                justifyContent: 'flex-end' 
              }}>
                <button
                  type="button"
                  onClick={() => setShowUserEditModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  保存更改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { adminAccountService } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  
  // 获取当前用户角色
  const currentUserRole = localStorage.getItem('currentUserRole') || 'operator';
  const currentUserName = localStorage.getItem('currentUserName') || '用户';
  const currentUser = localStorage.getItem('currentUser') || '';

  // 用户编辑模态框状态
const [showUserEditModal, setShowUserEditModal] = useState<Package[]>([]);
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
(false);
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
      title: language === 'zh' ? '同城包裹' : language === 'en' ? 'City Packages' : 'မြို့တွင်းပက်ကေ့ဂျ်များ',
      description: language === 'zh' ? '同城快递包裹管理' : language === 'en' ? 'Local express package management' : 'မြို့တွင်းပက်ကေ့ဂျ်စီမံခန့်ခွဲမှု',
      color: '#2c5282',
      icon: '📦',
      roles: ['admin', 'manager', 'operator', 'finance'] // 所有角色都可访问
    },
    {
      title: language === 'zh' ? '用户管理' : language === 'en' ? 'User Management' : 'အသုံးပြုသူစီမံခန့်ခွဲမှု',
      description: language === 'zh' ? '客户信息和行为分析' : language === 'en' ? 'Customer info and behavior analysis' : 'ဖောက်သည်အချက်အလက်နှင့်အပြုအမူခွဲခြမ်းစိတ်ဖြာမှု',
      color: '#3182ce',
      icon: '👥',
      roles: ['admin', 'manager'] // 仅管理员和经理可访问
    },
    {
      title: language === 'zh' ? '快递员管理' : language === 'en' ? 'Courier Management' : 'ကောင်ရီယာစီမံခန့်ခွဲမှု',
      description: language === 'zh' ? '快递员信息和业绩管理' : language === 'en' ? 'Courier info and performance management' : 'ကောင်ရီယာအချက်အလက်နှင့်စွမ်းဆောင်ရည်စီမံခန့်ခွဲမှု',
      color: '#2c5282',
      icon: '🚚',
      roles: ['admin', 'manager'] // 仅管理员和经理可访问
    },
    {
      title: language === 'zh' ? '快递店管理' : language === 'en' ? 'Delivery Store Management' : 'ပို့ဆောင်ရေးစတိုးစီမံခန့်ခွဲမှု',
      description: language === 'zh' ? '配送网点、自提点和分拣中心' : language === 'en' ? 'Distribution points, pickup points and sorting centers' : 'ဖြန့်ဖြူးရေးအမှတ်များ၊ ကောက်ယူရေးအမှတ်များနှင့်ခွဲခြားစိစစ်ရေးဌာန',
      color: '#38a169',
      icon: '🏪',
      roles: ['admin', 'manager'] // 管理员和经理可访问
    },
    {
      title: language === 'zh' ? '财务管理' : language === 'en' ? 'Finance Management' : 'ဘဏ္ဍာရေးစီမံခန့်ခွဲမှု',
      description: language === 'zh' ? '收入统计和佣金管理' : language === 'en' ? 'Income statistics and commission management' : 'ဝင်ငွေစာရင်းအင်းနှင့်ကော်မရှင်စီမံခန့်ခွဲမှု',
      color: '#3182ce',
      icon: '💰',
      roles: ['admin', 'manager', 'finance'] // 管理员、经理和财务可访问
    },
    {
      title: language === 'zh' ? '实时跟踪' : language === 'en' ? 'Real-time Tracking' : 'အချိန်နှင့်တစ်ပြေးညီခြေရာခံမှု',
      description: language === 'zh' ? 'GPS位置监控和路线跟踪' : language === 'en' ? 'GPS location monitoring and route tracking' : 'GPS တည်နေရာစောင့်ကြည့်ခြင်းနှင့်လမ်းကြောင်းခြေရာခံခြင်း',
      color: '#2c5282',
      icon: '📍',
      roles: ['admin', 'manager', 'operator'] // 管理员、经理和操作员可访问
    },
    {
      title: language === 'zh' ? '系统设置' : language === 'en' ? 'System Settings' : 'စနစ်ချိန်ညှိမှု',
      description: language === 'zh' ? '价格规则和系统配置' : language === 'en' ? 'Price rules and system configuration' : 'စျေးနှုန်းစည်းမျဉ်းများနှင့်စနစ်စီမံဖွဲ့စည်းမှု',
      color: '#3182ce',
      icon: '⚙️',
      roles: ['admin'] // 仅管理员可访问
    },
    {
      title: language === 'zh' ? '配送警报' : language === 'en' ? 'Delivery Alerts' : 'ပို့ဆောင်ရေးသတိပေးချက်များ',
      description: language === 'zh' ? '骑手异常操作监控和警报管理' : language === 'en' ? 'Courier anomaly monitoring and alert management' : 'ကောင်ရီယာကိစ္စပုံမှန်မဟုတ်သောစောင့်ကြည့်မှုနှင့်သတိပေးချက်စီမံခန့်ခွဲမှု',
      color: '#dc2626',
      icon: '🚨',
      roles: ['admin', 'manager'] // 管理员和经理可访问
    },
  ];

  // 根据当前用户角色筛选可访问的卡片
  const cardData = allCardData.filter(card => card.roles.includes(currentUserRole));

  const handleCardClick = (title: string) => {
    // 根据卡片标题（支持中英缅文）导航到对应页面
    if (title === '同城包裹' || title === 'City Packages' || title === 'မြို့တွင်းပက်ကေ့ဂျ်များ') {
      navigate('/admin/city-packages');
    } else if (title === '用户管理' || title === 'User Management' || title === 'အသုံးပြုသူစီမံခန့်ခွဲမှု') {
      navigate('/admin/users');
    } else if (title === '快递员管理' || title === 'Courier Management' || title === 'ကောင်ရီယာစီမံခန့်ခွဲမှု') {
      navigate('/admin/couriers');
    } else if (title === '快递店管理' || title === 'Delivery Store Management' || title === 'ပို့ဆောင်ရေးစတိုးစီမံခန့်ခွဲမှု') {
      navigate('/admin/delivery-stores');
    } else if (title === '财务管理' || title === 'Finance Management' || title === 'ဘဏ္ဍာရေးစီမံခန့်ခွဲမှု') {
      navigate('/admin/finance');
    } else if (title === '实时跟踪' || title === 'Real-time Tracking' || title === 'အချိန်နှင့်တစ်ပြေးညီခြေရာခံမှု') {
      navigate('/admin/tracking');
    } else if (title === '系统设置' || title === 'System Settings' || title === 'စနစ်ချိန်ညှိမှု') {
      navigate('/admin/settings');
    } else if (title === '配送警报' || title === 'Delivery Alerts' || title === 'ပို့ဆောင်ရေးသတိပေးချက်များ') {
      navigate('/admin/delivery-alerts');
    }
  };

  // LOGO组件
  const Logo = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
    const logoSize = size === 'small' ? '80px' : size === 'large' ? '160px' : '120px';
    const textSize = size === 'small' ? '1rem' : size === 'large' ? '1.8rem' : '1.4rem';
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: isMobile ? '12px' : '20px',
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
            <option value="my" style={{ color: '#000' }}>မြန်မာ</option>
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
              {currentUserRole === 'admin' && (language === 'zh' ? '系统管理员' : language === 'en' ? 'System Admin' : 'စနစ်စီမံခန့်ခွဲသူ')}
              {currentUserRole === 'manager' && (language === 'zh' ? '经理' : language === 'en' ? 'Manager' : 'မန်နေဂျာ')}
              {currentUserRole === 'operator' && (language === 'zh' ? '操作员' : language === 'en' ? 'Operator' : 'အော်ပရေတာ')}
              {currentUserRole === 'finance' && (language === 'zh' ? '财务' : language === 'en' ? 'Finance' : 'ဘဏ္ဍာရေး')}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px' }}>
              {language === 'zh' ? '点击编辑个人信息' : language === 'en' ? 'Click to edit profile' : 'ပရိုဖိုင်တည်းဖြတ်ရန်နှိပ်ပါ'}
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
            {language === 'zh' ? '退出登录' : language === 'en' ? 'Logout' : 'ထွက်ရန်'}
          </button>
        </div>
      </div>


      {/* 卡片网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: isMobile ? '12px' : '20px',
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
              {language === 'zh' ? '编辑个人信息' : language === 'en' ? 'Edit Profile' : 'ပရိုဖိုင်တည်းဖြတ်ရန်'}
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
                  {language === 'zh' ? '用户名' : language === 'en' ? 'Username' : 'အသုံးပြုသူအမည်'}
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
                  {language === 'zh' ? '员工姓名' : language === 'en' ? 'Employee Name' : 'ဝန်ထမ်းအမည်'}
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
                  {language === 'zh' ? '新密码 (留空则不修改)' : language === 'en' ? 'New Password (Leave blank to keep current)' : 'စကားဝှက်အသစ် (မပြောင်းလိုပါက ဗလာထားပါ)'}
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
                  placeholder={language === 'zh' ? '输入新密码' : language === 'en' ? 'Enter new password' : 'စကားဝှက်အသစ်ထည့်ပါ'}
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
                  {language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ရန်'}
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
                  {language === 'zh' ? '保存更改' : language === 'en' ? 'Save Changes' : 'ပြောင်းလဲမှုများသိမ်းဆည်းရန်'}
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

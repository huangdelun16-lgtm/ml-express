import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { adminAccountService, supabase, Package } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  // 🚀 新增：注入动画样式
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse-alert {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
        70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
  
  // 🚀 新增：通知和警报逻辑
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevRechargeCountRef = useRef<number>(0);
  const lastVoiceBroadcastRef = useRef<number>(0);
  const [pendingRechargeCount, setPendingRechargeCount] = useState(0);
  const [pendingAssignmentCount, setPendingAssignmentCount] = useState(0);
  const prevPendingAssignmentCountRef = useRef<number>(0); // 🚀 新增：记录上次待分配数量

  // 🚀 新增：语音播报函数
  const speakNotification = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
      lastVoiceBroadcastRef.current = Date.now();
    }
  };

  // 🚀 新增：轮询逻辑 (充值申请 + 待分配包裹)
  useEffect(() => {
    const pollData = async () => {
      try {
        // 1. 获取待审核充值申请
        const { data: rechargeData, error: rechargeError } = await supabase
          .from('recharge_requests')
          .select('id')
          .eq('status', 'pending');
        
        let hasRechargeNotification = false;
        if (!rechargeError && rechargeData) {
          const currentCount = rechargeData.length;
          setPendingRechargeCount(currentCount);

          // 触发语音播报
          if (currentCount > prevRechargeCountRef.current) {
            alertAudioRef.current?.play().catch(() => {});
            speakNotification('你有新的充值 请审核');
            hasRechargeNotification = true;
          } else if (currentCount > 0) {
            // 每 30 秒周期性提醒
            const now = Date.now();
            if (now - lastVoiceBroadcastRef.current >= 30000) {
              speakNotification('你有新的充值 请审核');
              hasRechargeNotification = true;
            }
          }
          prevRechargeCountRef.current = currentCount;
        }

        // 2. 获取待分配包裹数量
        const { count: assignmentCount, error: pkgError } = await supabase
          .from('packages')
          .select('*', { count: 'exact', head: true })
          .eq('courier', '待分配')
          .in('status', ['待取件', '待收款']);
        
        if (!pkgError) {
          const currentAssignCount = assignmentCount || 0;
          setPendingAssignmentCount(currentAssignCount);

          // 🚀 逻辑优化：如果有待分配订单且没有正在进行的充值提醒，播报待分配提醒
          if (currentAssignCount > prevPendingAssignmentCountRef.current && !hasRechargeNotification) {
            console.log('🚨 检测到新待分配订单:', currentAssignCount);
            // 这里也可以加一个独立的音频或者使用语音
            speakNotification(`你有 ${currentAssignCount} 件新订单等待分配`);
          } else if (currentAssignCount > 0 && !hasRechargeNotification) {
            const now = Date.now();
            // 如果只有待分配订单，也进行周期性提醒（每 60 秒一次，优先级低于充值）
            if (now - lastVoiceBroadcastRef.current >= 60000) {
              speakNotification(`你有 ${currentAssignCount} 件订单等待分配`);
            }
          }
          prevPendingAssignmentCountRef.current = currentAssignCount;
        }
      } catch (err) {
        console.error('📊 Dashboard 轮询失败:', err);
      }
    };

    // 初始执行
    pollData();
    // 每 15 秒轮询一次
    const timer = setInterval(pollData, 15000);
    return () => clearInterval(timer);
  }, [language]);

  // 获取当前用户角色（从 sessionStorage 读取，因为 saveToken 保存到 sessionStorage）
  const currentUserRole = sessionStorage.getItem('currentUserRole') || localStorage.getItem('currentUserRole') || 'operator';
  const currentUserName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName') || '用户';
  const currentUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '';
  const currentUserRegion = sessionStorage.getItem('currentUserRegion') || localStorage.getItem('currentUserRegion') || '';
  const storedPermissionsStr = sessionStorage.getItem('currentUserPermissions') || localStorage.getItem('currentUserPermissions');
  const hasPermissionOverride = storedPermissionsStr !== null;
  const currentUserPermissions = storedPermissionsStr ? JSON.parse(storedPermissionsStr) : [];

  // 获取工作区域
  const getWorkRegion = () => {
    if (currentUserRole === 'admin') {
      return language === 'zh' ? '万能' : language === 'en' ? 'Universal' : 'အားလုံး';
    }
    if (currentUserRegion === 'yangon' || currentUser.startsWith('YGN')) return 'YGN';
    if (currentUserRegion === 'mandalay' || currentUser.startsWith('MDY')) return 'MDY';
    if (currentUserRegion === 'maymyo' || currentUser.startsWith('POL')) return 'POL';
    return '';
  };
  const workRegion = getWorkRegion();

  // 用户编辑模态框状态
const [showUserEditModal, setShowUserEditModal] = useState(false);
  const { isMobile } = useResponsive();
  // const { isTablet, isDesktop, width } = useResponsive(); // 暂时未使用
  const [userEditFormData, setUserEditFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
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
      confirmPassword: '',
      employee_name: currentUserName
    });
    setShowUserEditModal(true);
  };

  // 处理用户信息更新
  const handleUpdateUserInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 验证密码一致性
      if (userEditFormData.password && userEditFormData.password !== userEditFormData.confirmPassword) {
        alert('两次输入的密码不一致');
        return;
      }

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
        // 更新本地存储（同时更新 sessionStorage 和 localStorage 以保持兼容）
        sessionStorage.setItem('currentUser', userEditFormData.username);
        sessionStorage.setItem('currentUserName', userEditFormData.employee_name);
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
      id: 'city_packages',
      title: language === 'zh' ? '同城订单' : language === 'en' ? 'City Orders' : 'မြို့တွင်းအော်ဒါများ',
      description: language === 'zh' ? '同城快递包裹管理' : language === 'en' ? 'Local express package management' : 'မြို့တွင်းပက်ကေ့ဂျ်စီမံခန့်ခွဲမှု',
      color: '#2c5282',
      icon: '📦',
      roles: ['admin', 'manager', 'operator', 'finance'] // 所有角色都可访问
    },
    {
      id: 'users',
      title: language === 'zh' ? '用户管理' : language === 'en' ? 'User Management' : 'အသုံးပြုသူစီမံခန့်ခွဲမှု',
      description: language === 'zh' ? '客户信息和行为分析' : language === 'en' ? 'Customer info and behavior analysis' : 'ဖောက်သည်အချက်အလက်และအပြုအမူခွဲခြမ်းစိတ်ဖြาမှု',
      color: '#3182ce',
      icon: '👥',
      roles: ['admin', 'manager'] // 仅管理员和经理可访问
    },
    {
      id: 'merchant_stores',
      title: language === 'zh' ? '商家管理' : language === 'en' ? 'MERCHANTS' : 'ကုန်သည်စီမံခန့်ခွဲမှု',
      description: language === 'zh' ? '管理商家店铺位置和信息' : language === 'en' ? 'Manage merchant store locations and information' : 'ကုန်သည်ဆိုင်တည်နေရာနှင့်အချက်အလက်များစီမံခန့်ခွဲမှု',
      color: '#38a169',
      icon: '🏪',
      roles: ['admin', 'manager'] // 管理员和经理可访问
    },
    {
      id: 'finance',
      title: language === 'zh' ? '财务管理' : language === 'en' ? 'Finance Management' : 'ဘဏ္ဍာရေးစီမံခန့်ခွဲမှု',
      description: language === 'zh' ? '收入统计和佣金管理' : language === 'en' ? 'Income statistics and commission management' : 'ဝင်ငွေစာရင်းအင်းနှင့်ကော်မရှင်စီမံခန့်ခွဲမှု',
      color: '#3182ce',
      icon: '💰',
      roles: ['admin', 'manager', 'finance'] // 管理员、经理和财务可访问
    },
    {
      id: 'tracking',
      title: language === 'zh' ? '实时跟踪' : language === 'en' ? 'Real-time Tracking' : 'အချိန်နှင့်တစ်ပြေးညီခြေရာခံမှု',
      description: language === 'zh' ? 'GPS位置监控和路线跟踪' : language === 'en' ? 'GPS location monitoring and route tracking' : 'GPS တည်နေရာစောင့်ကြည့်ခြင်းနှင့်လမ်းကြောင်းခြေရာခံခြင်း',
      color: '#2c5282',
      icon: '📍',
      roles: ['admin', 'manager', 'operator', 'finance'] // 管理员、经理、操作员和财务可访问
    },
    {
      id: 'settings',
      title: language === 'zh' ? '系统设置' : language === 'en' ? 'System Settings' : 'စနစ်ချိန်ညှိမှု',
      description: language === 'zh' ? '价格规则和系统配置' : language === 'en' ? 'Price rules and system configuration' : 'စျေးနှုန်းစည်းမျဉ်းများနှင့်စနစ်စီမံဖွဲ့စည်းမှု',
      color: '#3182ce',
      icon: '⚙️',
      roles: ['admin'] // 仅管理员可访问
    },
    {
      id: 'delivery_alerts',
      title: language === 'zh' ? '配送警报' : language === 'en' ? 'Delivery Alerts' : 'ပို့ဆောင်ရေးသတိပေးချက်များ',
      description: language === 'zh' ? '骑手异常操作监控和警报管理' : language === 'en' ? 'Courier anomaly monitoring and alert management' : 'ကောင်ရီယာကိစ္စပုံမှန်မဟုတ်သောစောင့်ကြည့်မှုနှင့်သတိပေးချက်စီမံခန့်ခွဲမှု',
      color: '#dc2626',
      icon: '🚨',
      roles: ['admin', 'manager', 'finance'] // 管理员、经理和财务可访问
    },
    {
      id: 'banners',
      title: language === 'zh' ? '广告管理' : language === 'en' ? 'Ad Management' : 'ကြော်ငြာစီမံခန့်ခွဲမှု',
      description: language === 'zh' ? '管理移动端首页轮播广告内容' : language === 'en' ? 'Manage mobile app home carousel content' : 'မိုဘိုင်းအက်ပ်ပင်မစာမျက်နှาကြော်ငြာများစီမံခန့်ခွဲမှု',
      color: '#805ad5',
      icon: '🖼️',
      roles: ['admin', 'manager'] // 管理员和经理可访问
    },
    {
      id: 'recharges',
      title: language === 'zh' ? '充值管理' : language === 'en' ? 'Recharge Management' : 'ငွေဖြည့်သွင်းမှုစီမံခန့်ခွဲမှု',
      description: language === 'zh' ? '客户账户充值记录和余额管理' : language === 'en' ? 'Customer account recharge records and balance management' : 'ဖောက်သည်အကောင့်ငွေဖြည့်သွင်းမှုမှတ်တမ်းနှင့်လက်ကျန်ငွေစီမံခန့်ခွဲမှု',
      color: '#d53f8c',
      icon: '💳',
      roles: ['admin', 'finance'] // 管理员和财务可访问
    },
  ];

  // 根据当前用户角色或特有权限筛选可访问的卡片
  const cardData = allCardData.filter(card => {
    // 如果用户拥有特有权限列表，且包含该卡片的 ID
    if (hasPermissionOverride && Array.isArray(currentUserPermissions)) {
      // 万能账号始终显示全部卡片
      if (currentUserRole === 'admin') return true;
      // 区域账号有明确权限列表时按列表显示
      return currentUserPermissions.includes(card.id);
    }
    // 否则回退到角色基础权限
    return card.roles.includes(currentUserRole);
  });

  const handleCardClick = (title: string) => {
    // 根据卡片标题（支持中英缅文）导航到对应页面
    if (title === '同城订单' || title === 'City Orders' || title === 'မြို့တွင်းအော်ဒါများ') {
      navigate('/admin/city-packages');
    } else if (title === '用户管理' || title === 'User Management' || title === 'အသုံးပြုသူစီမံခန့်ခွဲမှု') {
      navigate('/admin/users');
    } else if (title === '商家管理' || title === 'MERCHANTS' || title === 'ကုန်သည်စီမံခန့်ခွဲမှု') {
      navigate('/admin/delivery-stores');
    } else if (title === '财务管理' || title === 'Finance Management' || title === 'ဘဏ္ဍာရေးစီမံခန့်ခွဲမှု') {
      navigate('/admin/finance');
    } else if (title === '实时跟踪' || title === 'Real-time Tracking' || title === 'အချိန်နှင့်တစ်ပြေးညီခြေရာခံမှု') {
      navigate('/admin/tracking');
    } else if (title === '系统设置' || title === 'System Settings' || title === 'စနစ်ချိန်ညှိမှု') {
      navigate('/admin/settings');
    } else if (title === '配送警报' || title === 'Delivery Alerts' || title === 'ပို့ဆောင်ရေးသတိပေးချက်များ') {
      navigate('/admin/delivery-alerts');
    } else if (title === '广告管理' || title === 'Ad Management' || title === 'ကြော်ငြာစီမံခန့်ခွဲမှု') {
      navigate('/admin/banners');
    } else if (title === '充值管理' || title === 'Recharge Management' || title === 'ငွေဖြည့်သွင်းမှုစီမံခန့်ခွဲမှု') {
      navigate('/admin/recharges');
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            color: 'white',
            fontSize: textSize,
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            MARKET LINK EXPRESS
          </div>
          <div style={{
            color: 'white',
            fontSize: typeof textSize === 'string' && textSize.includes('rem') 
              ? `calc(${textSize} - 0.8rem)` 
              : typeof textSize === 'number' ? textSize - 8 : '0.7rem',
            fontWeight: '400',
            fontStyle: 'italic',
            letterSpacing: '1px',
            opacity: 0.9,
            textAlign: 'right',
            marginTop: '-2px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
          }}>
            Delivery Services
          </div>
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
          {/* 🚀 新增：解锁语音引擎按钮 */}
          <button 
            onClick={() => {
              speakNotification('语音提醒功能已开启');
              alert('✅ 语音播报已激活！\n\n系统现在将自动在后台为您监控新充值申请和待分配包裹。');
            }}
            style={{
              background: 'rgba(46, 204, 113, 0.2)',
              color: '#2ecc71',
              border: '1px solid rgba(46, 204, 113, 0.4)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔔 开启播报
          </button>

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
            <div style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              {workRegion && (
                <span style={{ 
                  background: '#48bb78', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '6px',
                  fontWeight: '900',
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {workRegion}
                </span>
              )}
              <span>{currentUserName}</span>
            </div>
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
      
      {/* 🚀 新增：核心指标警报栏 */}
      {(pendingRechargeCount > 0 || pendingAssignmentCount > 0) && (
        <div style={{
          display: 'flex',
          gap: '15px',
          maxWidth: '1200px',
          margin: '0 auto 30px',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 2
        }}>
          {pendingRechargeCount > 0 && (
            <div 
              onClick={() => navigate('/admin/users')}
              style={{
                flex: 1,
                minWidth: '280px',
                background: 'rgba(231, 76, 60, 0.15)',
                backdropFilter: 'blur(15px)',
                borderRadius: '20px',
                padding: '15px 25px',
                border: '2px solid #e74c3c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                animation: 'pulse-alert 2s infinite',
                boxShadow: '0 8px 25px rgba(231, 76, 60, 0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '2rem' }}>💰</span>
                <div>
                  <div style={{ color: '#e74c3c', fontWeight: '900', fontSize: '1.1rem' }}>
                    {language === 'zh' ? '待审核充值' : 'Pending Recharges'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.85rem', opacity: 0.8 }}>
                    {language === 'zh' ? '有客户提交了充值凭证' : 'Customers submitted proof'}
                  </div>
                </div>
              </div>
              <div style={{ background: '#e74c3c', color: 'white', padding: '5px 15px', borderRadius: '15px', fontWeight: '900', fontSize: '1.4rem' }}>
                {pendingRechargeCount}
              </div>
            </div>
          )}

          {pendingAssignmentCount > 0 && (
            <div 
              onClick={() => navigate('/admin/tracking')}
              style={{
                flex: 1,
                minWidth: '280px',
                background: 'rgba(52, 152, 219, 0.15)',
                backdropFilter: 'blur(15px)',
                borderRadius: '20px',
                padding: '15px 25px',
                border: '2px solid #3498db',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(52, 152, 219, 0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '2rem' }}>📦</span>
                <div>
                  <div style={{ color: '#3498db', fontWeight: '900', fontSize: '1.1rem' }}>
                    {language === 'zh' ? '待分配包裹' : 'Pending Assignment'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.85rem', opacity: 0.8 }}>
                    {language === 'zh' ? '有新订单等待分配骑手' : 'New orders waiting for riders'}
                  </div>
                </div>
              </div>
              <div style={{ background: '#3498db', color: 'white', padding: '5px 15px', borderRadius: '15px', fontWeight: '900', fontSize: '1.4rem' }}>
                {pendingAssignmentCount}
              </div>
            </div>
          )}
        </div>
      )}

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
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '40px',
            width: '90%',
            maxWidth: '480px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ 
              color: 'white', 
              marginBottom: '30px', 
              textAlign: 'center',
              fontSize: '1.8rem',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              {language === 'zh' ? '编辑个人信息' : language === 'en' ? 'Edit Profile' : 'ပရိုဖိုင်တည်းဖြတ်ရန်'}
            </h2>
            
            <form onSubmit={handleUpdateUserInfo}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  marginBottom: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  {language === 'zh' ? '账号 (不可修改)' : language === 'en' ? 'Username (Read-only)' : 'အသုံးပြုသူအမည်'}
                </label>
                <div style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '1rem',
                }}>
                  {currentUser}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  marginBottom: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
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
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4299e1';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  marginBottom: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  {language === 'zh' ? '新密码' : language === 'en' ? 'New Password' : 'စကားဝှက်အသစ်'}
                  <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 'normal', marginLeft: '8px' }}>
                    {language === 'zh' ? '(留空则不修改)' : language === 'en' ? '(Leave blank to keep current)' : '(မပြောင်းလိုပါက ဗလာထားပါ)'}
                  </span>
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
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4299e1';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  placeholder={language === 'zh' ? '输入新密码' : language === 'en' ? 'Enter new password' : 'စကားဝှက်အသစ်ထည့်ပါ'}
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  marginBottom: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  {language === 'zh' ? '确认新密码' : language === 'en' ? 'Confirm New Password' : 'စကားဝှက်အသစ်အတည်ပြုပါ'}
                </label>
                <input
                  type="password"
                  value={userEditFormData.confirmPassword}
                  onChange={(e) => setUserEditFormData({
                    ...userEditFormData,
                    confirmPassword: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4299e1';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  placeholder={language === 'zh' ? '再次输入新密码' : language === 'en' ? 'Confirm new password' : 'စကားဝှက်အသစ်ထပ်ရိုက်ပါ'}
                />
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                justifyContent: 'flex-end' 
              }}>
                <button
                  type="button"
                  onClick={() => setShowUserEditModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '12px 28px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
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
                  {language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ရန်'}
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(66, 153, 225, 0.4)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(66, 153, 225, 0.5)';
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(66, 153, 225, 0.4)';
                    e.currentTarget.style.filter = 'brightness(1)';
                  }}
                >
                  {language === 'zh' ? '保存更改' : language === 'en' ? 'Save Changes' : 'ပြောင်းလဲမှုများသိမ်းဆည်းရန်'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 警报提示音 */}
      <audio 
        ref={alertAudioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
        preload="auto"
      />
    </div>
  );
};

export default AdminDashboard;

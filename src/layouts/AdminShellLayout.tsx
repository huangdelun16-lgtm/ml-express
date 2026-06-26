import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { adminAccountService } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import { useAdminTodo } from '../contexts/AdminTodoContext';

/** 全屏独立模块：不使用通用后台侧栏/顶栏，由页面自带布局 */
export const STANDALONE_ADMIN_MODULE_PATHS = [
  '/admin/metric-management',
  '/admin/cross-border-logistics',
] as const;

/** @deprecated 使用 STANDALONE_ADMIN_MODULE_PATHS */
export const STANDALONE_IMPORT_ADMIN_PATHS = STANDALONE_ADMIN_MODULE_PATHS;

const MODULE_ICONS: Record<string, string> = {
  city_packages: '📦',
  users: '👥',
  merchant_stores: '🏪',
  finance: '💰',
  tracking: '📍',
  delivery_alerts: '🚨',
  banners: '🖼️',
  recharges: '💳',
  supervision: '📋',
  reports: '📊',
  courier_performance: '🛵',
  merchant_reconciliation: '🧾',
  settings: '⚙️',
  metric_management: '📑',
  cross_border_logistics: '🚚',
};

const MODULE_ROUTES: Record<string, string> = {
  city_packages: '/admin/city-packages',
  users: '/admin/users',
  merchant_stores: '/admin/delivery-stores',
  finance: '/admin/finance',
  tracking: '/admin/tracking',
  settings: '/admin/settings',
  delivery_alerts: '/admin/delivery-alerts',
  banners: '/admin/banners',
  recharges: '/admin/recharges',
  supervision: '/admin/supervision',
  reports: '/admin/reports',
  courier_performance: '/admin/courier-performance',
  merchant_reconciliation: '/admin/merchant-reconciliation',
  metric_management: '/admin/metric-management',
  cross_border_logistics: '/admin/cross-border-logistics',
};

function isModulePathActive(pathname: string, moduleId: string): boolean {
  const base = MODULE_ROUTES[moduleId];
  if (!base) return false;
  if (moduleId === 'tracking' && pathname === '/admin/realtime-tracking') return true;
  return pathname === base || pathname.startsWith(`${base}/`);
}

const AdminShellLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const { counts } = useAdminTodo();
  const pendingRechargeCount = counts.pendingRecharge;
  const pendingAssignmentCount = counts.pendingAssignment;
  const pendingProductReviewCount = counts.pendingProductReview;
  const pendingDeliveryAlertsCount = counts.pendingDeliveryAlerts;

  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevRechargeCountRef = useRef<number>(0);
  const lastVoiceBroadcastRef = useRef<number>(0);
  const prevPendingAssignmentCountRef = useRef<number>(0);
  const prevPendingDeliveryAlertsCountRef = useRef<number>(0);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse-alert {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
        70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
      }
      .admin-shell-nav::-webkit-scrollbar { width: 5px; }
      .admin-shell-nav::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.22);
        border-radius: 999px;
      }
      .admin-shell-nav::-webkit-scrollbar-track { background: transparent; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const speakNotification = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang =
        language === 'en' ? 'en-US' : language === 'my' ? 'my-MM' : 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
      lastVoiceBroadcastRef.current = Date.now();
    }
  };

  useEffect(() => {
    const pollVoice = () => {
      try {
        let hasRechargeNotification = false;

        const rechargeCount = counts.pendingRecharge;
        if (rechargeCount > prevRechargeCountRef.current) {
          alertAudioRef.current?.play().catch(() => {});
          speakNotification('你有新的充值 请审核');
          hasRechargeNotification = true;
        } else if (rechargeCount > 0) {
          const now = Date.now();
          if (now - lastVoiceBroadcastRef.current >= 30000) {
            speakNotification('你有新的充值 请审核');
            hasRechargeNotification = true;
          }
        }
        prevRechargeCountRef.current = rechargeCount;

        let hasDeliveryAlertNotification = false;
        const deliveryAlertsPending = counts.pendingDeliveryAlerts;
        if (deliveryAlertsPending > prevPendingDeliveryAlertsCountRef.current && !hasRechargeNotification) {
          alertAudioRef.current?.play().catch(() => {});
          const alertMsg =
            language === 'zh'
              ? '有新的配送警报，请及时处理'
              : 'New delivery alert. Please review.';
          speakNotification(alertMsg);
          hasDeliveryAlertNotification = true;
        }
        prevPendingDeliveryAlertsCountRef.current = deliveryAlertsPending;

        const currentAssignCount = counts.pendingAssignment;
        const skipAssignmentVoice = hasRechargeNotification || hasDeliveryAlertNotification;

        if (currentAssignCount > prevPendingAssignmentCountRef.current && !skipAssignmentVoice) {
          alertAudioRef.current?.play().catch(() => {});
          const assignMsg =
            language === 'zh'
              ? `你有 ${currentAssignCount} 件新订单等待分配，请打开实时跟踪`
              : `${currentAssignCount} new orders pending assignment. Open real-time tracking.`;
          speakNotification(assignMsg);
        } else if (currentAssignCount > 0 && !skipAssignmentVoice) {
          const now = Date.now();
          if (now - lastVoiceBroadcastRef.current >= 60000) {
            const periodic =
              language === 'zh'
                ? `你有 ${currentAssignCount} 件订单等待分配`
                : `${currentAssignCount} orders pending assignment`;
            speakNotification(periodic);
          }
        }
        prevPendingAssignmentCountRef.current = currentAssignCount;
      } catch (err) {
        console.error('📊 Shell 语音提醒失败:', err);
      }
    };

    pollVoice();
  }, [
    language,
    counts.pendingRecharge,
    counts.pendingDeliveryAlerts,
    counts.pendingAssignment,
  ]);

  const currentUserRole =
    sessionStorage.getItem('currentUserRole') || localStorage.getItem('currentUserRole') || 'operator';
  const currentUserName =
    sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName') || '用户';
  const currentUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '';
  const currentUserRegion = sessionStorage.getItem('currentUserRegion') || localStorage.getItem('currentUserRegion') || '';
  const storedPermissionsStr =
    sessionStorage.getItem('currentUserPermissions') || localStorage.getItem('currentUserPermissions');
  const hasPermissionOverride = storedPermissionsStr !== null;
  const currentUserPermissions = storedPermissionsStr ? JSON.parse(storedPermissionsStr) : [];

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

  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);
  const { isMobile } = useResponsive();
  const [userEditFormData, setUserEditFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    employee_name: '',
  });

  const handleLogout = () => {
    navigate('/admin/login');
  };

  const handleUserInfoClick = () => {
    setUserEditFormData({
      username: currentUser,
      password: '',
      confirmPassword: '',
      employee_name: currentUserName,
    });
    setShowUserEditModal(true);
  };

  const handleUpdateUserInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (userEditFormData.password && userEditFormData.password !== userEditFormData.confirmPassword) {
        alert('两次输入的密码不一致');
        return;
      }

      const accounts = await adminAccountService.getAllAccounts();
      const currentAccount = accounts.find((account) => account.username === currentUser);

      if (!currentAccount) {
        alert('未找到当前用户信息');
        return;
      }

      const updateData: Record<string, string> = {
        employee_name: userEditFormData.employee_name,
      };

      if (userEditFormData.password.trim()) {
        updateData.password = userEditFormData.password;
      }

      if (userEditFormData.username !== currentUser) {
        updateData.username = userEditFormData.username;
      }

      const success = await adminAccountService.updateAccount(currentAccount.id!, updateData);

      if (success) {
        sessionStorage.setItem('currentUser', userEditFormData.username);
        sessionStorage.setItem('currentUserName', userEditFormData.employee_name);
        localStorage.setItem('currentUser', userEditFormData.username);
        localStorage.setItem('currentUserName', userEditFormData.employee_name);

        alert('个人信息更新成功！');
        setShowUserEditModal(false);

        window.location.reload();
      } else {
        alert('更新失败，请重试');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      alert('更新失败，请重试');
    }
  };

  type NavCard = {
    id: string;
    title: string;
    roles: ('admin' | 'manager' | 'operator' | 'finance')[];
  };

  const allCardData: NavCard[] = useMemo(
    () => [
      {
        id: 'city_packages',
        title: language === 'zh' ? '同城订单' : language === 'en' ? 'City Orders' : 'မြို့တွင်းအော်ဒါများ',
        roles: ['admin', 'manager', 'operator', 'finance'],
      },
      {
        id: 'users',
        title: language === 'zh' ? '用户管理' : language === 'en' ? 'User Management' : 'အသုံးပြုသူစီမံခန့်ခွဲမှု',
        roles: ['admin', 'manager'],
      },
      {
        id: 'merchant_stores',
        title: language === 'zh' ? '商家管理' : language === 'en' ? 'MERCHANTS' : 'ကုန်သည်စီမံခန့်ခွဲမှု',
        roles: ['admin', 'manager'],
      },
      {
        id: 'finance',
        title: language === 'zh' ? '财务管理' : language === 'en' ? 'Finance Management' : 'ဘဏ္ဍာရေးစီမံခန့်ခွဲမှု',
        roles: ['admin', 'manager', 'finance'],
      },
      {
        id: 'tracking',
        title:
          language === 'zh' ? '实时跟踪' : language === 'en' ? 'Real-time Tracking' : 'အချိန်နှင့်တစ်ပြေးညီခြေရာခံမှု',
        roles: ['admin', 'manager', 'operator', 'finance'],
      },
      {
        id: 'delivery_alerts',
        title:
          language === 'zh' ? '配送警报' : language === 'en' ? 'Delivery Alerts' : 'ပို့ဆောင်ရေးသတိပေးချက်များ',
        roles: ['admin', 'manager', 'finance'],
      },
      {
        id: 'banners',
        title: language === 'zh' ? '页面管理' : language === 'en' ? 'Page Management' : 'စာမျက်နှာစီမံခန့်ခွဲမှု',
        roles: ['admin', 'manager'],
      },
      {
        id: 'recharges',
        title:
          language === 'zh' ? '充值管理' : language === 'en' ? 'Recharge Management' : 'ငွေဖြည့်သွင်းမှုစီမံခန့်ခွဲမှု',
        roles: ['admin', 'finance'],
      },
      {
        id: 'supervision',
        title: language === 'zh' ? '操作审计' : language === 'en' ? 'Audit log' : 'စစ်ဆေးမှုတဏ္ဍာ',
        roles: ['admin', 'manager', 'finance'],
      },
      {
        id: 'reports',
        title: language === 'zh' ? '报表导出' : language === 'en' ? 'Reports' : 'အစီရင်ခံစာ',
        roles: ['admin', 'manager', 'finance'],
      },
      {
        id: 'courier_performance',
        title: language === 'zh' ? '骑手绩效' : language === 'en' ? 'Rider KPI' : 'ကောင်ရီယာစွမ်းဆောင်',
        roles: ['admin', 'manager', 'operator', 'finance'],
      },
      {
        id: 'merchant_reconciliation',
        title:
          language === 'zh'
            ? '商家对账'
            : language === 'en'
              ? 'Merchant reconciliation'
              : 'ကုန်သည်စာရင်း',
        roles: ['admin', 'manager', 'finance'],
      },
      {
        id: 'settings',
        title: language === 'zh' ? '系统设置' : language === 'en' ? 'System Settings' : 'စနစ်ချိန်ညှိမှု',
        roles: ['admin'],
      },
      {
        id: 'metric_management',
        title:
          language === 'zh'
            ? '指标管理'
            : language === 'en'
              ? 'Metric management'
              : 'မီတྲိစီမံခန့်ခွဲမှု',
        roles: ['admin', 'manager', 'finance'],
      },
      {
        id: 'cross_border_logistics',
        title:
          language === 'zh'
            ? '跨境物流'
            : language === 'en'
              ? 'Cross-border logistics'
              : 'နိုင်ငံရပ်ခြားပို့ဆောင်ရေး',
        roles: ['admin', 'manager', 'operator', 'finance'],
      },
    ],
    [language],
  );

  const cardData = useMemo(() => {
    return allCardData.filter((card) => {
      if (hasPermissionOverride && Array.isArray(currentUserPermissions)) {
        if (currentUserRole === 'admin') return true;
        return currentUserPermissions.includes(card.id);
      }
      return card.roles.includes(currentUserRole as 'admin' | 'manager' | 'operator' | 'finance');
    });
  }, [allCardData, hasPermissionOverride, currentUserPermissions, currentUserRole]);

  const LogoHeader = () => {
    const logoSize = isMobile ? '44px' : '52px';
    const textSize = isMobile ? '0.92rem' : '1.05rem';
    const subSize = isMobile ? '0.62rem' : '0.68rem';

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate('/admin/dashboard')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate('/admin/dashboard');
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: 0,
          cursor: 'pointer',
        }}
        title={language === 'zh' ? '返回首页' : language === 'en' ? 'Home' : 'ပင်မစာမျက်နှာ'}
      >
        <img
          src="/logo.png"
          alt="ML Express Logo"
          style={{
            width: logoSize,
            height: logoSize,
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            style={{
              color: 'white',
              fontSize: textSize,
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            MARKET LINK EXPRESS
          </div>
          <div
            style={{
              color: 'white',
              fontSize: subSize,
              fontWeight: 400,
              fontStyle: 'italic',
              letterSpacing: '0.5px',
              opacity: 0.88,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              lineHeight: 1.2,
            }}
          >
            Delivery Services
          </div>
        </div>
      </div>
    );
  };

  const pathname = location.pathname;
  const isStandaloneImportModule = (STANDALONE_ADMIN_MODULE_PATHS as readonly string[]).includes(
    pathname,
  );

  if (isStandaloneImportModule) {
    return <Outlet />;
  }

  return (
    <div
      style={{
        height: '100vh',
        minHeight: '100vh',
        maxHeight: '100vh',
        background:
          'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '5%',
          right: '5%',
          width: '200px',
          height: '200px',
          background: 'rgba(192, 192, 192, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          left: '5%',
          width: '150px',
          height: '150px',
          background: 'rgba(192, 192, 192, 0.1)',
          borderRadius: '50%',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {isMobile && mobileNavOpen && (
        <div
          role="presentation"
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 150,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <aside
        style={{
          width: isMobile ? 'min(280px, 86vw)' : 118,
          flexShrink: 0,
          background:
            'linear-gradient(180deg, rgba(8, 28, 52, 0.78) 0%, rgba(12, 38, 68, 0.62) 48%, rgba(10, 32, 58, 0.72) 100%)',
          backdropFilter: 'blur(28px) saturate(1.15)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.15)',
          borderRight: '1px solid rgba(255, 255, 255, 0.14)',
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '12px 10px' : '12px 9px',
          paddingBottom: 14,
          zIndex: isMobile ? 160 : 1,
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? 0 : undefined,
          top: isMobile ? 0 : undefined,
          bottom: isMobile ? 0 : undefined,
          height: isMobile ? '100vh' : '100%',
          alignSelf: isMobile ? undefined : 'stretch',
          transform: isMobile ? (mobileNavOpen ? 'translateX(0)' : 'translateX(-105%)') : undefined,
          transition: isMobile ? 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
          boxShadow: isMobile && mobileNavOpen
            ? '8px 0 40px rgba(0, 0, 0, 0.28), inset -1px 0 0 rgba(255,255,255,0.08)'
            : 'inset -1px 0 0 rgba(255, 255, 255, 0.06), 4px 0 24px rgba(0, 20, 40, 0.12)',
          maxHeight: isMobile ? '100vh' : undefined,
        }}
      >
        <div
          style={{
            marginBottom: 10,
            padding: isMobile ? '4px 6px 8px' : '2px 4px 8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.35), rgba(59, 130, 246, 0.35))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                flexShrink: 0,
              }}
              aria-hidden
            >
              ☰
            </span>
            <span
              style={{
                fontSize: isMobile ? '0.72rem' : '0.62rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.88)',
              }}
            >
              {language === 'zh' ? '功能菜单' : language === 'en' ? 'Modules' : 'မီနူး'}
            </span>
          </div>
          <div
            style={{
              fontSize: '0.58rem',
              color: 'rgba(255, 255, 255, 0.45)',
              paddingLeft: 2,
              lineHeight: 1.35,
            }}
          >
            {language === 'zh'
              ? `${cardData.length} 个模块`
              : language === 'en'
                ? `${cardData.length} modules`
                : `${cardData.length} ခု`}
          </div>
        </div>
        <nav
          className="admin-shell-nav"
          style={{
            flex: 1,
            overflowY: 'auto',
            marginRight: -2,
            paddingRight: 2,
            paddingBottom: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          {cardData.map((card) => {
            const pulseNav =
              (card.id === 'tracking' && pendingAssignmentCount > 0) ||
              (card.id === 'delivery_alerts' && pendingDeliveryAlertsCount > 0);
            const showProductBadge = card.id === 'merchant_stores' && pendingProductReviewCount > 0;
            const showRechargeBadge = card.id === 'recharges' && pendingRechargeCount > 0;
            const showAssignBadge = card.id === 'tracking' && pendingAssignmentCount > 0;
            const showAlertBadge = card.id === 'delivery_alerts' && pendingDeliveryAlertsCount > 0;
            const active = isModulePathActive(pathname, card.id);
            const targetPath = MODULE_ROUTES[card.id];
            const outlineMenuCard = card.id === 'metric_management';
            const hovered = hoveredNavId === card.id;
            const navBorder = active
              ? outlineMenuCard
                ? '1px solid rgba(125, 211, 252, 0.65)'
                : '1px solid rgba(255, 255, 255, 0.38)'
              : pulseNav
                ? `1px solid ${card.id === 'delivery_alerts' ? 'rgba(248, 113, 113, 0.55)' : 'rgba(96, 165, 250, 0.5)'}`
                : outlineMenuCard
                  ? '1px solid rgba(56, 189, 248, 0.55)'
                  : hovered
                    ? '1px solid rgba(255, 255, 255, 0.22)'
                    : '1px solid rgba(255, 255, 255, 0.09)';
            const navBg = active
              ? 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)'
              : pulseNav
                ? 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)'
                : hovered
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)';
            const moduleIcon = MODULE_ICONS[card.id] ?? '•';
            const hasBadge =
              showProductBadge || showRechargeBadge || showAssignBadge || showAlertBadge;

            return (
              <button
                key={card.id}
                type="button"
                aria-label={card.title}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => setHoveredNavId(card.id)}
                onMouseLeave={() => setHoveredNavId(null)}
                onClick={() => {
                  if (targetPath) navigate(targetPath);
                  if (isMobile) setMobileNavOpen(false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'row' : 'column',
                  alignItems: isMobile ? 'center' : 'center',
                  justifyContent: isMobile ? 'flex-start' : 'center',
                  gap: isMobile ? 10 : 4,
                  width: isMobile ? '100%' : '100%',
                  minHeight: isMobile ? 52 : 54,
                  textAlign: isMobile ? 'left' : 'center',
                  padding: isMobile ? '10px 12px' : '8px 6px 7px',
                  marginLeft: isMobile ? 0 : 0,
                  marginRight: isMobile ? 0 : 0,
                  borderRadius: 11,
                  border: navBorder,
                  background: navBg,
                  color: 'white',
                  cursor: 'pointer',
                  transition:
                    'background 0.2s ease, border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
                  animation: pulseNav && !active ? 'pulse-alert 2.2s infinite' : undefined,
                  boxSizing: 'border-box',
                  boxShadow: active
                    ? '0 4px 14px rgba(0, 30, 60, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)'
                    : hovered
                      ? '0 3px 10px rgba(0, 24, 48, 0.15)'
                      : '0 1px 2px rgba(0, 20, 40, 0.08)',
                  position: 'relative',
                  transform: hovered && !active ? 'translateY(-1px)' : undefined,
                  overflow: 'hidden',
                }}
              >
                {active && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 6,
                      bottom: 6,
                      width: 3,
                      borderRadius: '0 4px 4px 0',
                      background: 'linear-gradient(180deg, #fbbf24, #3b82f6)',
                      boxShadow: '0 0 8px rgba(251, 191, 36, 0.45)',
                    }}
                  />
                )}
                <span
                  aria-hidden
                  style={{
                    fontSize: isMobile ? '1.15rem' : '1.05rem',
                    lineHeight: 1,
                    flexShrink: 0,
                    filter: active ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' : undefined,
                  }}
                >
                  {moduleIcon}
                </span>
                <div
                  style={
                    isMobile
                      ? { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }
                      : { width: '100%', minWidth: 0 }
                  }
                >
                  <div
                    style={{
                      fontWeight: active ? 800 : 700,
                      fontSize: isMobile ? '0.9rem' : '0.7rem',
                      lineHeight: isMobile ? 1.3 : 1.25,
                      whiteSpace: isMobile ? 'nowrap' : 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: isMobile ? 'block' : '-webkit-box',
                      WebkitLineClamp: isMobile ? 1 : 2,
                      WebkitBoxOrient: 'vertical',
                      textAlign: isMobile ? 'left' : 'center',
                      color: active ? '#fff' : 'rgba(255, 255, 255, 0.92)',
                    }}
                  >
                    {card.title}
                  </div>
                </div>
                <div
                  style={{
                    position: isMobile ? 'static' : 'absolute',
                    top: isMobile ? undefined : 5,
                    right: isMobile ? undefined : 5,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: isMobile ? 'flex-end' : 'flex-end',
                    gap: 3,
                    maxWidth: isMobile ? undefined : 52,
                    minHeight: hasBadge ? (isMobile ? 18 : 14) : 0,
                  }}
                >
                  {showRechargeBadge && (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white',
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 999,
                        lineHeight: 1.2,
                        boxShadow: '0 1px 4px rgba(220, 38, 38, 0.45)',
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    >
                      {pendingRechargeCount}
                    </span>
                  )}
                  {showAssignBadge && (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
                        color: 'white',
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 999,
                        lineHeight: 1.2,
                        boxShadow: '0 1px 4px rgba(37, 99, 235, 0.4)',
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    >
                      {pendingAssignmentCount}
                    </span>
                  )}
                  {showAlertBadge && (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #f87171, #b91c1c)',
                        color: 'white',
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 999,
                        lineHeight: 1.2,
                        boxShadow: '0 1px 4px rgba(185, 28, 28, 0.45)',
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    >
                      {pendingDeliveryAlertsCount}
                    </span>
                  )}
                  {showProductBadge && (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                        color: 'white',
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 999,
                        lineHeight: 1.2,
                        boxShadow: '0 1px 4px rgba(217, 119, 6, 0.4)',
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    >
                      {pendingProductReviewCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          height: isMobile ? '100vh' : '100%',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: isMobile ? '10px 12px' : '12px 22px',
            flexShrink: 0,
            color: 'white',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            {isMobile && (
              <button
                type="button"
                aria-label={language === 'zh' ? '打开菜单' : 'Open menu'}
                onClick={() => setMobileNavOpen(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  color: 'white',
                  borderRadius: 10,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ☰
              </button>
            )}
            <LogoHeader />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={() => {
                speakNotification('语音提醒功能已开启');
                alert(
                  '✅ 语音播报已激活！\n\n系统现在将自动在后台为您监控新充值申请、待分配订单（实时跟踪）与配送警报。',
                );
              }}
              style={{
                background: 'rgba(46, 204, 113, 0.2)',
                color: '#2ecc71',
                border: '1px solid rgba(46, 204, 113, 0.4)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🔔 {language === 'zh' ? '开启播报' : language === 'en' ? 'Voice' : 'အသံ'}
            </button>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
              }}
            >
              <option value="zh" style={{ color: '#000' }}>
                中文
              </option>
              <option value="en" style={{ color: '#000' }}>
                English
              </option>
              <option value="my" style={{ color: '#000' }}>
                မြန်မာ
              </option>
            </select>

            <div
              role="button"
              tabIndex={0}
              title={
                language === 'zh'
                  ? '点击编辑个人信息'
                  : language === 'en'
                    ? 'Click to edit profile'
                    : 'ပရိုဖိုင်တည်းဖြတ်ရန်'
              }
              onClick={handleUserInfoClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleUserInfoClick();
                }
              }}
              style={{
                textAlign: 'right',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '8px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px',
                }}
              >
                {workRegion && (
                  <span
                    style={{
                      background: '#48bb78',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: '900',
                      fontSize: '0.72rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    {workRegion}
                  </span>
                )}
                <span>{currentUserName}</span>
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '2px' }}>
                {currentUserRole === 'admin' &&
                  (language === 'zh' ? '系统管理员' : language === 'en' ? 'System Admin' : 'စနစ်စီမံခန့်ခွဲသူ')}
                {currentUserRole === 'manager' &&
                  (language === 'zh' ? '经理' : language === 'en' ? 'Manager' : 'မန်နေဂျာ')}
                {currentUserRole === 'operator' &&
                  (language === 'zh' ? '操作员' : language === 'en' ? 'Operator' : 'အော်ပရေတာ')}
                {currentUserRole === 'finance' &&
                  (language === 'zh' ? '财务' : language === 'en' ? 'Finance' : 'ဘဏ္ဍာရေး')}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '10px 18px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              }}
            >
              {language === 'zh' ? (isMobile ? '退出' : '退出登录') : language === 'en' ? 'Logout' : 'ထွက်ရန်'}
            </button>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            padding: isMobile ? '14px 14px 100px' : '22px 28px 100px',
          }}
        >
          <Outlet />
        </main>
      </div>

      {showUserEditModal && (
        <div
          style={{
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
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '40px',
              width: '90%',
              maxWidth: '480px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h2
              style={{
                color: 'white',
                marginBottom: '30px',
                textAlign: 'center',
                fontSize: '1.8rem',
                fontWeight: 'bold',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {language === 'zh' ? '编辑个人信息' : language === 'en' ? 'Edit Profile' : 'ပရိုဖိုင်တည်းဖြတ်ရန်'}
            </h2>

            <form onSubmit={handleUpdateUserInfo}>
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  {language === 'zh' ? '账号 (不可修改)' : language === 'en' ? 'Username (Read-only)' : 'အသုံးပြုသူအမည်'}
                </label>
                <div
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '1rem',
                  }}
                >
                  {currentUser}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  {language === 'zh' ? '员工姓名' : language === 'en' ? 'Employee Name' : 'ဝန်ထမ်းအမည်'}
                </label>
                <input
                  type="text"
                  value={userEditFormData.employee_name}
                  onChange={(e) =>
                    setUserEditFormData({
                      ...userEditFormData,
                      employee_name: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
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
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  {language === 'zh' ? '新密码' : language === 'en' ? 'New Password' : 'စကားဝှက်အသစ်'}
                  <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 'normal', marginLeft: '8px' }}>
                    {language === 'zh'
                      ? '(留空则不修改)'
                      : language === 'en'
                        ? '(Leave blank to keep current)'
                        : '(မပြောင်းလိုပါက ဗလာထားပါ)'}
                  </span>
                </label>
                <input
                  type="password"
                  value={userEditFormData.password}
                  onChange={(e) =>
                    setUserEditFormData({
                      ...userEditFormData,
                      password: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4299e1';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  {language === 'zh' ? '确认新密码' : language === 'en' ? 'Confirm Password' : 'စကားဝှက်အတည်ပြုရန်'}
                </label>
                <input
                  type="password"
                  value={userEditFormData.confirmPassword}
                  onChange={(e) =>
                    setUserEditFormData({
                      ...userEditFormData,
                      confirmPassword: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4299e1';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  placeholder={
                    language === 'zh'
                      ? '再次输入新密码'
                      : language === 'en'
                        ? 'Confirm new password'
                        : 'စကားဝှက်အသစ်ထပ်ရိုက်ပါ'
                  }
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  justifyContent: 'flex-end',
                }}
              >
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
                    backdropFilter: 'blur(10px)',
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
                    boxShadow: '0 4px 15px rgba(66, 153, 225, 0.4)',
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

      <audio
        ref={alertAudioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        preload="auto"
      />
    </div>
  );
};

export default AdminShellLayout;

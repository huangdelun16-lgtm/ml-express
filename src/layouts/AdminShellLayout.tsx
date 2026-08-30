import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { adminAccountService } from '../services/supabase';
import { clearToken } from '../services/authService';
import { useResponsive } from '../hooks/useResponsive';
import { useAdminTodo } from '../contexts/AdminTodoContext';
import { feedbackService } from '../services/FeedbackService';
import AdminFunctionMenu, { type AdminNavCard } from '../components/AdminFunctionMenu';
import { openAdminGlobalSearch } from '../components/AdminGlobalSearch';
import { useAdminIdleLock } from '../hooks/useAdminIdleLock';

/** 全屏独立模块：不使用通用后台侧栏/顶栏，由页面自带布局 */
export const STANDALONE_ADMIN_MODULE_PATHS = [
  '/admin/metric-management',
  '/admin/proxy-purchase',
  '/admin/proxy-quote',
  '/admin/cross-border-logistics',
] as const;

/** @deprecated 使用 STANDALONE_ADMIN_MODULE_PATHS */
export const STANDALONE_IMPORT_ADMIN_PATHS = STANDALONE_ADMIN_MODULE_PATHS;

const AdminShellLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const { counts } = useAdminTodo();
  const pendingRechargeCount = counts.pendingRecharge;
  const pendingAssignmentCount = counts.pendingAssignment;
  const pendingProductReviewCount = counts.pendingProductReview;
  const pendingDeliveryAlertsCount = counts.pendingDeliveryAlerts;
  const pendingMerchantApplicationsCount = counts.pendingMerchantApplications;
  const overdueMerchantAcceptCount = counts.overdueMerchantAccept;
  const watchReviewsCount = counts.watchReviews;
  const waitingChatsCount = counts.waitingChats;
  const pendingRefundsCount = counts.pendingRefunds;

  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevRechargeCountRef = useRef<number>(0);
  const lastVoiceBroadcastRef = useRef<number>(0);
  const prevPendingAssignmentCountRef = useRef<number>(0);
  const prevPendingDeliveryAlertsCountRef = useRef<number>(0);

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
    if (currentUserRegion === 'ruili' || currentUser.startsWith('RUILI')) return 'RUILI';
    return '';
  };
  const workRegion = getWorkRegion();

  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isMobile } = useResponsive();
  const [userEditFormData, setUserEditFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    employee_name: '',
  });

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await clearToken();
    navigate('/admin/login');
  };

  const { warning: idleWarning, staySignedIn } = useAdminIdleLock(true, () => {
    void handleLogout();
  });

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
        feedbackService.notify('两次输入的密码不一致');
        return;
      }

      const accounts = await adminAccountService.getAllAccounts();
      const currentAccount = accounts.find((account) => account.username === currentUser);

      if (!currentAccount) {
        feedbackService.notify('未找到当前用户信息');
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

        feedbackService.notify('个人信息更新成功！');
        setShowUserEditModal(false);

        window.location.reload();
      } else {
        feedbackService.notify('更新失败，请重试');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      feedbackService.notify('更新失败，请重试');
    }
  };

  type NavCard = AdminNavCard;

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
        id: 'product_reviews',
        title: language === 'zh' ? '商品审核' : language === 'en' ? 'Product review' : 'ကုန်ပစ္စည်းစစ်ဆေး',
        roles: ['admin', 'manager'],
      },
      {
        id: 'merchant_ops',
        title: language === 'zh' ? '商家监管' : language === 'en' ? 'Merchant ops' : 'ဆိုင်စောင့်ကြည့်',
        roles: ['admin', 'manager'],
      },
      {
        id: 'after_sales',
        title: language === 'zh' ? '售后跟单' : language === 'en' ? 'After-sales' : 'ရောင်းချပြီး',
        roles: ['admin', 'manager', 'finance'],
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
      if (card.id === 'product_reviews') {
        if (currentUserRole === 'admin') return true;
        if (hasPermissionOverride && Array.isArray(currentUserPermissions)) {
          return (
            currentUserPermissions.includes('product_reviews') ||
            currentUserPermissions.includes('merchant_stores')
          );
        }
        return card.roles.includes(currentUserRole as 'admin' | 'manager' | 'operator' | 'finance');
      }
      if (card.id === 'merchant_ops') {
        if (currentUserRole === 'admin') return true;
        if (hasPermissionOverride && Array.isArray(currentUserPermissions)) {
          return currentUserPermissions.includes('merchant_stores');
        }
        return card.roles.includes(currentUserRole as 'admin' | 'manager' | 'operator' | 'finance');
      }
      if (card.id === 'after_sales') {
        if (currentUserRole === 'admin') return true;
        if (hasPermissionOverride && Array.isArray(currentUserPermissions)) {
          return (
            currentUserPermissions.includes('after_sales') ||
            currentUserPermissions.includes('merchant_stores') ||
            currentUserPermissions.includes('finance')
          );
        }
        return card.roles.includes(currentUserRole as 'admin' | 'manager' | 'operator' | 'finance');
      }
      if (hasPermissionOverride && Array.isArray(currentUserPermissions)) {
        if (currentUserRole === 'admin') return true;
        return currentUserPermissions.includes(card.id);
      }
      return card.roles.includes(currentUserRole as 'admin' | 'manager' | 'operator' | 'finance');
    });
  }, [allCardData, hasPermissionOverride, currentUserPermissions, currentUserRole]);

  const LogoHeader = () => {
    const logoSize = isMobile ? '36px' : '40px';
    const textSize = isMobile ? '0.88rem' : '0.95rem';

    return (
      <div
        className="admin-shell__logo"
        role="button"
        tabIndex={0}
        onClick={() => navigate('/admin/dashboard')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate('/admin/dashboard');
          }
        }}
        title={language === 'zh' ? '返回首页' : language === 'en' ? 'Home' : 'ပင်မစာမျက်နှာ'}
      >
        <img src="/logo.png" alt="ML Express Logo" style={{ width: logoSize, height: logoSize }} />
        <div className="admin-shell__brand">
          <div className="admin-shell__brand-name" style={{ fontSize: textSize }}>
            MARKET LINK EXPRESS
          </div>
          <div className="admin-shell__brand-sub">Admin Console</div>
        </div>
      </div>
    );
  };

  const pathname = location.pathname;
  const isStandaloneImportModule = (STANDALONE_ADMIN_MODULE_PATHS as readonly string[]).includes(
    pathname,
  );

  const roleLabel =
    currentUserRole === 'admin'
      ? language === 'zh'
        ? '系统管理员'
        : language === 'en'
          ? 'System Admin'
          : 'စနစ်စီမံခန့်ခွဲသူ'
      : currentUserRole === 'manager'
        ? language === 'zh'
          ? '经理'
          : language === 'en'
            ? 'Manager'
            : 'မန်နေဂျာ'
        : currentUserRole === 'operator'
          ? language === 'zh'
            ? '操作员'
            : language === 'en'
              ? 'Operator'
              : 'အော်ပရေတာ'
          : language === 'zh'
            ? '财务'
            : language === 'en'
              ? 'Finance'
              : 'ဘဏ္ဍာရေး';

  if (isStandaloneImportModule) {
    return (
      <>
        <Outlet />
        {idleWarning && (
          <div className="admin-modal-scrim">
            <div className="admin-modal">
              <h2>{language === 'zh' ? '会话即将锁定' : 'Session idle'}</h2>
              <p className="admin-modal__warn">
                {language === 'zh'
                  ? '已闲置超过 20 分钟。再过约 5 分钟将自动退出，避免他人误用账号。'
                  : 'You have been idle for 20 minutes. You will be signed out in about 5 minutes.'}
              </p>
              <div className="admin-modal__actions">
                <button type="button" className="admin-shell__btn admin-shell__btn--primary" onClick={staySignedIn}>
                  {language === 'zh' ? '继续工作' : 'Stay signed in'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`admin-shell${isMobile ? ' admin-shell--mobile' : ''}`}>
      {isMobile && mobileNavOpen && (
        <div className="admin-shell__scrim" role="presentation" onClick={() => setMobileNavOpen(false)} />
      )}

      <AdminFunctionMenu
        cards={cardData}
        pathname={pathname}
        language={language}
        isMobile={isMobile}
        mobileNavOpen={mobileNavOpen}
        badges={{
          pendingRecharge: pendingRechargeCount,
          pendingAssignment: pendingAssignmentCount,
          pendingProductReview: pendingProductReviewCount,
          pendingDeliveryAlerts: pendingDeliveryAlertsCount,
          pendingMerchantApplications: pendingMerchantApplicationsCount,
          overdueMerchantAccept: overdueMerchantAcceptCount,
          watchReviews: watchReviewsCount,
          waitingChats: waitingChatsCount,
          pendingRefunds: pendingRefundsCount,
        }}
        onNavigate={(path) => navigate(path)}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className={`admin-shell__col${isMobile ? ' admin-shell__col--mobile' : ''}`}>
        <header className="admin-shell__header">
          <div className="admin-shell__header-left">
            {isMobile && (
              <button
                type="button"
                className="admin-shell__menu-btn"
                aria-label={language === 'zh' ? '打开菜单' : 'Open menu'}
                onClick={() => setMobileNavOpen(true)}
              >
                ☰
              </button>
            )}
            <LogoHeader />
          </div>
          <div className="admin-shell__header-right">
            <button
              type="button"
              className="admin-shell__btn admin-shell__btn--ghost"
              onClick={() => openAdminGlobalSearch()}
              title="Ctrl / ⌘ + K"
            >
              {language === 'zh' ? '搜索' : 'Search'}
              {!isMobile && <kbd className="admin-shell__kbd">⌘K</kbd>}
            </button>
            <button
              type="button"
              className="admin-shell__btn"
              onClick={() => {
                speakNotification('语音提醒功能已开启');
                feedbackService.notify(
                  '语音播报已激活。系统将监控新充值、待分配订单与配送警报。',
                );
              }}
            >
              {language === 'zh' ? '播报' : language === 'en' ? 'Voice' : 'အသံ'}
            </button>
            <select
              className="admin-shell__lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="my">မြန်မာ</option>
            </select>
            <div
              className="admin-shell__user"
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
            >
              <div className="admin-shell__user-row">
                {workRegion && <span className="admin-shell__region">{workRegion}</span>}
                <span>{currentUserName}</span>
              </div>
              <div className="admin-shell__role">{roleLabel}</div>
            </div>
            <button
              type="button"
              className="admin-shell__btn admin-shell__btn--danger"
              onClick={() => setShowLogoutConfirm(true)}
            >
              {language === 'zh' ? (isMobile ? '退出' : '退出登录') : language === 'en' ? 'Logout' : 'ထွက်ရန်'}
            </button>
          </div>
        </header>

        <main className={`admin-shell__main${isMobile ? ' admin-shell__main--mobile' : ''}`}>
          <Outlet />
        </main>
      </div>
      {showUserEditModal && (
        <div className="admin-modal-scrim">
          <div className="admin-modal">
            <h2>
              {language === 'zh' ? '编辑个人信息' : language === 'en' ? 'Edit Profile' : 'ပရိုဖိုင်တည်းဖြတ်ရန်'}
            </h2>
            <form onSubmit={handleUpdateUserInfo}>
              <div className="admin-modal__field">
                <label>
                  {language === 'zh' ? '账号 (不可修改)' : language === 'en' ? 'Username (Read-only)' : 'အသုံးပြုသူအမည်'}
                </label>
                <div className="admin-modal__readonly">{currentUser}</div>
              </div>
              <div className="admin-modal__field">
                <label>{language === 'zh' ? '员工姓名' : language === 'en' ? 'Employee Name' : 'ဝန်ထမ်းအမည်'}</label>
                <input
                  type="text"
                  value={userEditFormData.employee_name}
                  onChange={(e) =>
                    setUserEditFormData({
                      ...userEditFormData,
                      employee_name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="admin-modal__field">
                <label>
                  {language === 'zh' ? '新密码' : language === 'en' ? 'New Password' : 'စကားဝှက်အသစ်'}
                  <span style={{ fontWeight: 400, marginLeft: 8 }}>
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
                />
              </div>
              <div className="admin-modal__field">
                <label>
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
                  placeholder={
                    language === 'zh'
                      ? '再次输入新密码'
                      : language === 'en'
                        ? 'Confirm new password'
                        : 'စကားဝှက်အသစ်ထပ်ရိုက်ပါ'
                  }
                />
              </div>
              <div className="admin-modal__actions">
                <button
                  type="button"
                  className="admin-shell__btn"
                  onClick={() => setShowUserEditModal(false)}
                >
                  {language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ရန်'}
                </button>
                <button type="submit" className="admin-shell__btn admin-shell__btn--primary">
                  {language === 'zh' ? '保存更改' : language === 'en' ? 'Save Changes' : 'ပြောင်းလဲမှုများသိမ်းဆည်းရန်'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="admin-modal-scrim">
          <div className="admin-modal">
            <h2>{language === 'zh' ? '确认退出' : 'Sign out?'}</h2>
            <p className="admin-modal__warn">
              {language === 'zh'
                ? '退出后需要重新登录。未保存的表单内容可能丢失。'
                : 'You will need to sign in again. Unsaved form data may be lost.'}
            </p>
            <div className="admin-modal__actions">
              <button type="button" className="admin-shell__btn" onClick={() => setShowLogoutConfirm(false)}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button type="button" className="admin-shell__btn admin-shell__btn--danger" onClick={() => void handleLogout()}>
                {language === 'zh' ? '退出登录' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {idleWarning && (
        <div className="admin-modal-scrim">
          <div className="admin-modal">
            <h2>{language === 'zh' ? '会话即将锁定' : 'Session idle'}</h2>
            <p className="admin-modal__warn">
              {language === 'zh'
                ? '已闲置超过 20 分钟。再过约 5 分钟将自动退出，避免他人误用账号。'
                : 'You have been idle for 20 minutes. You will be signed out in about 5 minutes.'}
            </p>
            <div className="admin-modal__actions">
              <button type="button" className="admin-shell__btn admin-shell__btn--primary" onClick={staySignedIn}>
                {language === 'zh' ? '继续工作' : 'Stay signed in'}
              </button>
            </div>
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


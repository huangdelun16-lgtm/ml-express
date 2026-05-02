import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import { useAdminTodo } from '../contexts/AdminTodoContext';

/**
 * 后台「首页」主区：仅显示在有布局的 /admin/dashboard 路由下
 */
const AdminDashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const { counts } = useAdminTodo();
  const pendingRechargeCount = counts.pendingRecharge;
  const pendingAssignmentCount = counts.pendingAssignment;
  const pendingProductReviewCount = counts.pendingProductReview;
  const pendingDeliveryAlertsCount = counts.pendingDeliveryAlerts;

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
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      {(pendingRechargeCount > 0 ||
        pendingAssignmentCount > 0 ||
        pendingProductReviewCount > 0 ||
        pendingDeliveryAlertsCount > 0) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
            maxWidth: 720,
            margin: '0 auto 22px',
          }}
        >
          {pendingRechargeCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/admin/recharges')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/recharges');
              }}
              style={{
                background: 'rgba(231, 76, 60, 0.14)',
                backdropFilter: 'blur(14px)',
                borderRadius: 14,
                padding: '12px 18px',
                border: '2px solid #e74c3c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                animation: 'pulse-alert 2s infinite',
                boxShadow: '0 6px 22px rgba(231, 76, 60, 0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>💰</span>
                <div>
                  <div style={{ color: '#e74c3c', fontWeight: 900, fontSize: '0.98rem' }}>
                    {language === 'zh' ? '待审核充值' : 'Pending Recharges'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.8rem', opacity: 0.82 }}>
                    {language === 'zh' ? '有客户提交了充值凭证' : 'Customers submitted proof'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#e74c3c',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {pendingRechargeCount}
              </div>
            </div>
          )}

          {pendingAssignmentCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/admin/tracking')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/tracking');
              }}
              style={{
                background: 'rgba(52, 152, 219, 0.14)',
                backdropFilter: 'blur(14px)',
                borderRadius: 14,
                padding: '12px 18px',
                border: '2px solid #3498db',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                animation: 'pulse-alert 2s infinite',
                boxShadow: '0 6px 22px rgba(52, 152, 219, 0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>📦</span>
                <div>
                  <div style={{ color: '#3498db', fontWeight: 900, fontSize: '0.98rem' }}>
                    {language === 'zh' ? '待分配包裹' : 'Pending Assignment'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.8rem', opacity: 0.82 }}>
                    {language === 'zh' ? '有新订单等待分配骑手' : 'New orders waiting for riders'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#3498db',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {pendingAssignmentCount}
              </div>
            </div>
          )}

          {pendingDeliveryAlertsCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/admin/delivery-alerts')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/delivery-alerts');
              }}
              style={{
                background: 'rgba(220, 38, 38, 0.14)',
                backdropFilter: 'blur(14px)',
                borderRadius: 14,
                padding: '12px 18px',
                border: '2px solid #dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                animation: 'pulse-alert 2s infinite',
                boxShadow: '0 6px 22px rgba(220, 38, 38, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🚨</span>
                <div>
                  <div style={{ color: '#fecaca', fontWeight: 900, fontSize: '0.98rem' }}>
                    {language === 'zh'
                      ? '待处理配送警报'
                      : language === 'en'
                        ? 'Pending delivery alerts'
                        : 'Pending alerts'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.8rem', opacity: 0.85 }}>
                    {language === 'zh'
                      ? '有新的骑手异常警报需处理'
                      : language === 'en'
                        ? 'Courier alerts need attention'
                        : 'Tap to review'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#dc2626',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {pendingDeliveryAlertsCount}
              </div>
            </div>
          )}

          {pendingProductReviewCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/admin/delivery-stores')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/delivery-stores');
              }}
              style={{
                background: 'rgba(245, 158, 11, 0.14)',
                backdropFilter: 'blur(14px)',
                borderRadius: 14,
                padding: '12px 18px',
                border: '2px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                animation: 'pulse-alert 2s infinite',
                boxShadow: '0 6px 22px rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🛍️</span>
                <div>
                  <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '0.98rem' }}>
                    {language === 'zh'
                      ? '待审核商品'
                      : language === 'en'
                        ? 'Products to review'
                        : 'စစ်ဆေးရန် ကုန်ပစ္စည်းများ'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.8rem', opacity: 0.85 }}>
                    {language === 'zh'
                      ? '商家提交了新品，请在合伙店铺中处理'
                      : language === 'en'
                        ? 'Open Merchants → store product list'
                        : 'ကုန်သည်မှ ကုန်ပစ္စည်းအသစ်'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {pendingProductReviewCount}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(18px)',
          borderRadius: 18,
          padding: isMobile ? '18px 18px' : '22px 24px',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          color: 'white',
        }}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>
          {language === 'zh' ? '欢迎回来' : language === 'en' ? 'Welcome back' : 'ပြန်လည်ကြိုဆိုပါသည်'}
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, opacity: 0.88 }}>
          {language === 'zh'
            ? '请从左侧菜单进入各功能模块，内容将显示在本区域。底部状态栏会同步待处理数量。'
            : language === 'en'
              ? 'Pick a module in the sidebar; its content opens in this area. Pending counts stay in the footer bar.'
              : 'ဘေးဘားမှ မော်ဒျူးများကိုဖွင့်ပါ။'}
        </p>
      </div>
    </>
  );
};

export default AdminDashboardHome;

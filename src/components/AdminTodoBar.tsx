import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAdminTodo } from '../contexts/AdminTodoContext';
import { useResponsive } from '../hooks/useResponsive';

/** 与路由权限对齐：无权限则不展示对应待办胶囊 */
function readTodoAccess(): {
  recharge: boolean;
  assign: boolean;
  alerts: boolean;
  products: boolean;
  audit: boolean;
} {
  const role =
    sessionStorage.getItem('currentUserRole') || localStorage.getItem('currentUserRole') || 'operator';
  const raw =
    sessionStorage.getItem('currentUserPermissions') || localStorage.getItem('currentUserPermissions');
  let perms: string[] | null = null;
  if (raw !== null) {
    try {
      const p = JSON.parse(raw);
      perms = Array.isArray(p) ? p : null;
    } catch {
      perms = null;
    }
  }
  const hasPerm = (id: string) => role === 'admin' || (perms !== null && perms.includes(id));
  const baseOps = ['admin', 'manager', 'operator', 'finance'].includes(role);
  return {
    recharge: role === 'admin' || role === 'finance' || hasPerm('recharges'),
    assign: baseOps && (role === 'admin' || hasPerm('tracking') || perms === null),
    alerts:
      role === 'admin' || role === 'manager' || role === 'finance' || hasPerm('delivery_alerts'),
    products: role === 'admin' || role === 'manager' || hasPerm('merchant_stores'),
    audit: role === 'admin' || role === 'manager' || role === 'finance',
  };
}

/** 为固定底栏留出滚动空间，避免最后一行按钮被遮挡 */
export function AdminBottomSpacer() {
  const location = useLocation();
  if (!location.pathname.startsWith('/admin') || location.pathname === '/admin/login') return null;
  return <div style={{ height: 76, width: '100%', pointerEvents: 'none' }} aria-hidden />;
}

/**
 * 全后台统一的「待办」条：充值 / 待分配 / 配送警报 / 待审商品 + 审计日志入口
 */
const AdminTodoBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { counts } = useAdminTodo();
  const { isMobile } = useResponsive();

  const access = useMemo(() => readTodoAccess(), [location.pathname]);

  if (!location.pathname.startsWith('/admin') || location.pathname === '/admin/login') {
    return null;
  }

  const t = {
    title:
      language === 'zh'
        ? '待办'
        : language === 'en'
          ? 'Todos'
          : 'လုပ်ရန်',
    recharge:
      language === 'zh'
        ? '充值待审'
        : language === 'en'
          ? 'Recharges'
          : 'ဖြည့်သွင်း',
    assign:
      language === 'zh'
        ? '待分配'
        : language === 'en'
          ? 'Assign'
          : 'ခန့်အပ်',
    alerts:
      language === 'zh'
        ? '配送警报'
        : language === 'en'
          ? 'Alerts'
          : 'သတိပေး',
    products:
      language === 'zh'
        ? '待审商品'
        : language === 'en'
          ? 'Products'
          : 'ကုန်ပစ္စည်း',
    audit:
      language === 'zh'
        ? '操作审计'
        : language === 'en'
          ? 'Audit log'
          : 'စစ်ဆေးမှု',
  };

  const total =
    (access.recharge ? counts.pendingRecharge : 0) +
    (access.assign ? counts.pendingAssignment : 0) +
    (access.alerts ? counts.pendingDeliveryAlerts : 0) +
    (access.products ? counts.pendingProductReview : 0);

  const pill = (
    label: string,
    n: number,
    onClick: () => void,
    color: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isMobile ? '6px 10px' : '8px 14px',
        borderRadius: '999px',
        border: n > 0 ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.25)',
        background: n > 0 ? `${color}22` : 'rgba(255,255,255,0.08)',
        color: '#fff',
        fontSize: isMobile ? '0.75rem' : '0.82rem',
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          minWidth: '22px',
          textAlign: 'center',
          background: n > 0 ? color : 'rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '2px 6px',
          fontSize: '0.8rem',
        }}
      >
        {n}
      </span>
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
        padding: isMobile ? '8px 10px' : '10px 20px',
        background: 'linear-gradient(180deg, rgba(15, 32, 60, 0.65) 0%, rgba(15, 32, 60, 0.92) 100%)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: isMobile ? '8px' : '10px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 800, fontSize: '0.85rem' }}>
            📋 {t.title}
            {total > 0 ? (
              <span style={{ marginLeft: '6px', color: '#fbbf24' }}>({total})</span>
            ) : null}
          </span>
          {access.recharge &&
            pill(t.recharge, counts.pendingRecharge, () => navigate('/admin/recharges'), '#e74c3c')}
          {access.assign &&
            pill(t.assign, counts.pendingAssignment, () => navigate('/admin/tracking'), '#3498db')}
          {access.alerts &&
            pill(t.alerts, counts.pendingDeliveryAlerts, () => navigate('/admin/delivery-alerts'), '#dc2626')}
          {access.products &&
            pill(t.products, counts.pendingProductReview, () => navigate('/admin/delivery-stores'), '#f59e0b')}
        </div>
        {access.audit && (
        <button
          type="button"
          onClick={() => navigate('/admin/supervision')}
          style={{
            padding: isMobile ? '6px 12px' : '8px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(167, 139, 250, 0.5)',
            background: 'rgba(139, 92, 246, 0.25)',
            color: '#fff',
            fontWeight: 700,
            fontSize: isMobile ? '0.75rem' : '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          📜 {t.audit}
        </button>
        )}
      </div>
    </div>
  );
};

export default AdminTodoBar;

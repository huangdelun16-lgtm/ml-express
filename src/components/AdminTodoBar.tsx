import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAdminTodo } from '../contexts/AdminTodoContext';

/** 与路由权限对齐：无权限则不展示对应待办胶囊 */
function readTodoAccess(): {
  recharge: boolean;
  assign: boolean;
  alerts: boolean;
  products: boolean;
  merchantApps: boolean;
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
    merchantApps: role === 'admin' || role === 'manager' || hasPerm('merchant_stores'),
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
    merchantApps:
      language === 'zh'
        ? '入驻申请'
        : language === 'en'
          ? 'Onboarding'
          : 'လျှောက်လွှာ',
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
    (access.products ? counts.pendingProductReview : 0) +
    (access.merchantApps ? counts.pendingMerchantApplications : 0);

  const pill = (
    label: string,
    n: number,
    onClick: () => void,
    color: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`admin-todo__pill${n > 0 ? ' is-hot' : ''}`}
      style={n > 0 ? { color } : undefined}
    >
      <span>{label}</span>
      <span className="admin-todo__count" style={n > 0 ? { background: color, color: '#fff' } : undefined}>
        {n}
      </span>
    </button>
  );

  return (
    <div className="admin-todo">
      <div className="admin-todo__inner">
        <div className="admin-todo__left">
          <span className="admin-todo__title">
            {t.title}
            {total > 0 ? <span className="admin-todo__total">({total})</span> : null}
          </span>
          {access.recharge &&
            pill(t.recharge, counts.pendingRecharge, () => navigate('/admin/recharges'), '#cf1322')}
          {access.assign &&
            pill(t.assign, counts.pendingAssignment, () => navigate('/admin/tracking'), '#1677ff')}
          {access.alerts &&
            pill(t.alerts, counts.pendingDeliveryAlerts, () => navigate('/admin/delivery-alerts'), '#cf1322')}
          {access.products &&
            pill(t.products, counts.pendingProductReview, () => navigate('/admin/delivery-stores'), '#d48806')}
          {access.merchantApps &&
            pill(
              t.merchantApps,
              counts.pendingMerchantApplications,
              () => navigate('/admin/merchant-applications'),
              '#1677ff',
            )}
        </div>
        {access.audit && (
        <button
          type="button"
          className="admin-todo__audit"
          onClick={() => navigate('/admin/supervision')}
        >
          {t.audit}
        </button>
        )}
      </div>
    </div>
  );
};

export default AdminTodoBar;


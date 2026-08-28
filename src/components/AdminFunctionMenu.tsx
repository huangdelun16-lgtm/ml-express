import React, { useEffect, useMemo, useRef, useState } from 'react';

export const MODULE_ICONS: Record<string, string> = {
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

export const MODULE_ROUTES: Record<string, string> = {
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

const SEARCH_ALIASES: Record<string, string[]> = {
  city_packages: ['订单', '包裹', 'city', '同城', 'order', 'package'],
  users: ['会员', '用户', 'user', 'customer'],
  merchant_stores: ['店铺', '商家', '入驻', '商品审核', 'store', 'merchant'],
  finance: ['财务', '收款', '工资', 'finance', 'cod'],
  tracking: ['跟踪', '分配', '地图', '骑手位置', 'tracking'],
  delivery_alerts: ['警报', '异常', 'alert'],
  banners: ['广告', '页面', 'banner'],
  recharges: ['充值', '审核', 'recharge'],
  supervision: ['审计', '日志', 'audit'],
  reports: ['报表', '导出', 'report'],
  courier_performance: ['骑手', '绩效', 'kpi', 'courier'],
  merchant_reconciliation: ['对账', 'reconciliation'],
  settings: ['设置', '账号', '权限', 'settings'],
  metric_management: ['指标', '代购', '开销', '价格', 'metric'],
  cross_border_logistics: ['跨境', '中转', 'inventory', '物流'],
};

const GROUPS: Array<{
  id: string;
  zh: string;
  en: string;
  my: string;
  ids: string[];
}> = [
  {
    id: 'ops',
    zh: '日常运营',
    en: 'Operations',
    my: 'နေ့စဉ်',
    ids: ['city_packages', 'tracking', 'delivery_alerts', 'courier_performance'],
  },
  {
    id: 'commerce',
    zh: '商家与用户',
    en: 'Merchants',
    my: 'ဆိုင်နှင့်အသုံးပြုသူ',
    ids: ['merchant_stores', 'users', 'banners'],
  },
  {
    id: 'money',
    zh: '财务结算',
    en: 'Finance',
    my: 'ဘဏ္ဍာရေး',
    ids: ['finance', 'recharges', 'merchant_reconciliation', 'reports'],
  },
  {
    id: 'system',
    zh: '系统',
    en: 'System',
    my: 'စနစ်',
    ids: ['supervision', 'settings', 'metric_management', 'cross_border_logistics'],
  },
];

const PIN_KEY = 'admin-nav-pins';
const COLLAPSE_KEY = 'admin-nav-collapsed';
const GROUP_FOLD_KEY = 'admin-nav-folded-groups';

export type AdminNavCard = {
  id: string;
  title: string;
  roles: ('admin' | 'manager' | 'operator' | 'finance')[];
};

export type AdminMenuBadges = {
  pendingRecharge: number;
  pendingAssignment: number;
  pendingProductReview: number;
  pendingDeliveryAlerts: number;
  pendingMerchantApplications: number;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function isModulePathActive(pathname: string, moduleId: string): boolean {
  const base = MODULE_ROUTES[moduleId];
  if (!base) return false;
  if (moduleId === 'tracking' && pathname === '/admin/realtime-tracking') return true;
  return pathname === base || pathname.startsWith(`${base}/`);
}

function matchesQuery(card: AdminNavCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [card.title, card.id, ...(SEARCH_ALIASES[card.id] || [])].join(' ').toLowerCase();
  return hay.includes(q);
}

type Props = {
  cards: AdminNavCard[];
  pathname: string;
  language: string;
  isMobile: boolean;
  mobileNavOpen: boolean;
  badges: AdminMenuBadges;
  onNavigate: (path: string) => void;
  onCloseMobile: () => void;
};

const AdminFunctionMenu: React.FC<Props> = ({
  cards,
  pathname,
  language,
  isMobile,
  mobileNavOpen,
  badges,
  onNavigate,
  onCloseMobile,
}) => {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(() =>
    !isMobile && readJson<boolean>(COLLAPSE_KEY, false),
  );
  const [pins, setPins] = useState<string[]>(() => readJson<string[]>(PIN_KEY, []));
  const [foldedGroups, setFoldedGroups] = useState<string[]>(() =>
    readJson<string[]>(GROUP_FOLD_KEY, []),
  );

  const compact = !isMobile && collapsed;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (compact) {
          setCollapsed(false);
          writeJson(COLLAPSE_KEY, false);
          window.setTimeout(() => searchRef.current?.focus(), 40);
        } else {
          searchRef.current?.focus();
        }
      }
      if (e.key === 'Escape' && query) {
        setQuery('');
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [compact, query]);

  const cardMap = useMemo(() => {
    const map = new Map<string, AdminNavCard>();
    cards.forEach((c) => map.set(c.id, c));
    return map;
  }, [cards]);

  const filtered = useMemo(
    () => cards.filter((c) => matchesQuery(c, query)),
    [cards, query],
  );

  const searching = query.trim().length > 0;

  const visiblePins = pins.map((id) => cardMap.get(id)).filter(Boolean) as AdminNavCard[];

  const go = (id: string) => {
    const path = MODULE_ROUTES[id];
    if (!path) return;
    onNavigate(path);
    if (isMobile) onCloseMobile();
  };

  const togglePin = (id: string) => {
    const next = pins.includes(id) ? pins.filter((x) => x !== id) : [id, ...pins].slice(0, 8);
    setPins(next);
    writeJson(PIN_KEY, next);
  };

  const toggleGroup = (id: string) => {
    const next = foldedGroups.includes(id)
      ? foldedGroups.filter((x) => x !== id)
      : [...foldedGroups, id];
    setFoldedGroups(next);
    writeJson(GROUP_FOLD_KEY, next);
  };

  const t = (zh: string, en: string, my: string) =>
    language === 'zh' ? zh : language === 'en' ? en : my;

  const renderItem = (card: AdminNavCard) => {
    const pulseNav =
      (card.id === 'tracking' && badges.pendingAssignment > 0) ||
      (card.id === 'delivery_alerts' && badges.pendingDeliveryAlerts > 0);
    const showProductBadge = card.id === 'merchant_stores' && badges.pendingProductReview > 0;
    const showMerchantAppBadge =
      card.id === 'merchant_stores' && badges.pendingMerchantApplications > 0;
    const showRechargeBadge = card.id === 'recharges' && badges.pendingRecharge > 0;
    const showAssignBadge = card.id === 'tracking' && badges.pendingAssignment > 0;
    const showAlertBadge = card.id === 'delivery_alerts' && badges.pendingDeliveryAlerts > 0;
    const active = isModulePathActive(pathname, card.id);
    const pinned = pins.includes(card.id);
    const outline = card.id === 'metric_management' || card.id === 'cross_border_logistics';
    const itemClass = [
      'admin-fn__item',
      active ? 'is-active' : '',
      pulseNav ? 'is-pulse' : '',
      outline ? 'is-outline' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div key={card.id} className="admin-fn__item-wrap">
        <button
          type="button"
          className={itemClass}
          title={compact ? card.title : undefined}
          aria-label={card.title}
          aria-current={active ? 'page' : undefined}
          onClick={() => go(card.id)}
        >
          {active && <span aria-hidden className="admin-fn__mark" />}
          <span aria-hidden style={{ fontSize: compact ? '1.12rem' : '1.05rem', lineHeight: 1, flexShrink: 0 }}>
            {MODULE_ICONS[card.id] ?? '•'}
          </span>
          {!compact && <span className="admin-fn__label">{card.title}</span>}
          {!compact && (
            <span className="admin-fn__meta">
              {showRechargeBadge && <CountBadge n={badges.pendingRecharge} tone="red" />}
              {showAssignBadge && <CountBadge n={badges.pendingAssignment} tone="blue" />}
              {showAlertBadge && <CountBadge n={badges.pendingDeliveryAlerts} tone="red" />}
              {showProductBadge && <CountBadge n={badges.pendingProductReview} tone="amber" />}
              {showMerchantAppBadge && <CountBadge n={badges.pendingMerchantApplications} tone="blue" />}
              <span
                role="button"
                tabIndex={0}
                className={`admin-fn__pin${pinned ? ' is-on' : ''}`}
                title={pinned ? t('取消置顶', 'Unpin', 'ဖြုတ်ရန်') : t('置顶', 'Pin', 'ပင်ထိုးရန်')}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(card.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePin(card.id);
                  }
                }}
              >
                ★
              </span>
            </span>
          )}
          {compact &&
            (showRechargeBadge ||
              showAssignBadge ||
              showAlertBadge ||
              showProductBadge ||
              showMerchantAppBadge) && <span className="admin-fn__dot" />}
        </button>
      </div>
    );
  };

  const sectionLabel = (zh: string, en: string, my: string) => (
    <div className="admin-fn__section">{t(zh, en, my)}</div>
  );

  const asideClass = [
    'admin-fn',
    compact ? 'admin-fn--compact' : '',
    isMobile ? 'admin-fn--mobile' : '',
    isMobile && mobileNavOpen ? 'is-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={asideClass}>
      <div className="admin-fn__head">
        {!compact && (
          <div style={{ minWidth: 0 }}>
            <div className="admin-fn__eyebrow">{t('功能菜单', 'Modules', 'မီနူး')}</div>
            <div className="admin-fn__hint">
              {t(`${cards.length} 个模块 · / 搜索`, `${cards.length} modules · /`, `${cards.length} ခု`)}
            </div>
          </div>
        )}
        {!isMobile && (
          <button
            type="button"
            className="admin-fn__collapse"
            title={compact ? t('展开菜单', 'Expand', 'ချဲ့ရန်') : t('收起为图标', 'Collapse', 'ခေါက်ရန်')}
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              writeJson(COLLAPSE_KEY, next);
              if (next) setQuery('');
            }}
          >
            {compact ? '»' : '«'}
          </button>
        )}
      </div>

      {!compact && (
        <input
          ref={searchRef}
          className="admin-fn-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filtered[0]) {
              e.preventDefault();
              go(filtered[0].id);
            }
          }}
          placeholder={t('搜索模块…', 'Search modules…', 'ရှာဖွေရန်…')}
        />
      )}

      <nav className="admin-shell-nav admin-fn__nav">
        {searching ? (
          <>
            {sectionLabel('搜索结果', 'Results', 'ရလဒ်')}
            {filtered.length === 0 ? (
              <div className="admin-fn__empty">
                {t('没有匹配的模块', 'No matching module', 'မတွေ့ပါ')}
              </div>
            ) : (
              filtered.map(renderItem)
            )}
          </>
        ) : (
          <>
            {visiblePins.length > 0 && (
              <>
                {!compact && sectionLabel('置顶', 'Pinned', 'ပင်ထိုး')}
                {visiblePins.map(renderItem)}
              </>
            )}
            {GROUPS.map((group) => {
              const items = group.ids
                .map((id) => cardMap.get(id))
                .filter((c): c is AdminNavCard => Boolean(c))
                .filter((c) => !pins.includes(c.id));
              if (items.length === 0) return null;
              const folded = !compact && foldedGroups.includes(group.id);
              return (
                <div key={group.id}>
                  {!compact && (
                    <button type="button" className="admin-fn__group-btn" onClick={() => toggleGroup(group.id)}>
                      <span>{t(group.zh, group.en, group.my)}</span>
                      <span style={{ opacity: 0.7 }}>{folded ? '+' : '–'}</span>
                    </button>
                  )}
                  {(compact || !folded) && items.map(renderItem)}
                </div>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
};

function CountBadge({ n, tone }: { n: number; tone: 'red' | 'blue' | 'amber' }) {
  return <span className={`admin-fn__badge admin-fn__badge--${tone}`}>{n}</span>;
}

export default AdminFunctionMenu;


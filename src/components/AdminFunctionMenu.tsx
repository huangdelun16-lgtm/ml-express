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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() =>
    !isMobile && readJson<boolean>(COLLAPSE_KEY, false),
  );
  const [pins, setPins] = useState<string[]>(() => readJson<string[]>(PIN_KEY, []));
  const [foldedGroups, setFoldedGroups] = useState<string[]>(() =>
    readJson<string[]>(GROUP_FOLD_KEY, []),
  );

  const compact = !isMobile && collapsed;

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .admin-fn-search::placeholder { color: rgba(255,255,255,0.38); }
      .admin-fn-search:focus { outline: none; border-color: rgba(147, 197, 253, 0.65) !important; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
    const hovered = hoveredId === card.id;
    const pinned = pins.includes(card.id);
    const outline = card.id === 'metric_management' || card.id === 'cross_border_logistics';
    const navBorder = active
      ? outline
        ? '1px solid rgba(125, 211, 252, 0.7)'
        : '1px solid rgba(255, 255, 255, 0.4)'
      : pulseNav
        ? `1px solid ${card.id === 'delivery_alerts' ? 'rgba(248, 113, 113, 0.55)' : 'rgba(96, 165, 250, 0.5)'}`
        : outline
          ? '1px solid rgba(56, 189, 248, 0.42)'
          : hovered
            ? '1px solid rgba(255, 255, 255, 0.22)'
            : '1px solid rgba(255, 255, 255, 0.08)';
    const navBg = active
      ? 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)'
      : pulseNav
        ? 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)'
        : hovered
          ? 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)'
          : 'transparent';

    return (
      <div
        key={card.id}
        onMouseEnter={() => setHoveredId(card.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ position: 'relative' }}
      >
        <button
          type="button"
          title={compact ? card.title : undefined}
          aria-label={card.title}
          aria-current={active ? 'page' : undefined}
          onClick={() => go(card.id)}
          style={{
            display: 'flex',
            flexDirection: compact ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: compact ? 'center' : 'flex-start',
            gap: compact ? 4 : 10,
            width: '100%',
            minHeight: compact ? 52 : isMobile ? 46 : 40,
            textAlign: compact ? 'center' : 'left',
            padding: compact ? '8px 4px' : isMobile ? '9px 10px' : '7px 10px',
            borderRadius: 11,
            border: navBorder,
            background: navBg,
            color: 'white',
            cursor: 'pointer',
            transition: 'background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
            animation: pulseNav && !active ? 'pulse-alert 2.2s infinite' : undefined,
            boxSizing: 'border-box',
            boxShadow: active
              ? '0 4px 14px rgba(0, 30, 60, 0.2), inset 0 1px 0 rgba(255,255,255,0.14)'
              : 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {active && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                top: 7,
                bottom: 7,
                width: 3,
                borderRadius: '0 4px 4px 0',
                background: 'linear-gradient(180deg, #fbbf24, #3b82f6)',
              }}
            />
          )}
          <span aria-hidden style={{ fontSize: compact ? '1.12rem' : '1.05rem', lineHeight: 1, flexShrink: 0 }}>
            {MODULE_ICONS[card.id] ?? '•'}
          </span>
          {!compact && (
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontWeight: active ? 800 : 650,
                fontSize: isMobile ? '0.9rem' : '0.82rem',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'left',
              }}
            >
              {card.title}
            </span>
          )}
          {!compact && (
            <span style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
              {showRechargeBadge && <CountBadge n={badges.pendingRecharge} tone="red" />}
              {showAssignBadge && <CountBadge n={badges.pendingAssignment} tone="blue" />}
              {showAlertBadge && <CountBadge n={badges.pendingDeliveryAlerts} tone="red" />}
              {showProductBadge && <CountBadge n={badges.pendingProductReview} tone="amber" />}
              {showMerchantAppBadge && <CountBadge n={badges.pendingMerchantApplications} tone="blue" />}
              {(hovered || pinned) && (
                <span
                  role="button"
                  tabIndex={0}
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
                  style={{
                    color: pinned ? '#fbbf24' : 'rgba(255,255,255,0.35)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                >
                  ★
                </span>
              )}
            </span>
          )}
          {compact && (showRechargeBadge || showAssignBadge || showAlertBadge || showProductBadge || showMerchantAppBadge) && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: 99,
                background: '#f87171',
                boxShadow: '0 0 0 2px rgba(8,28,52,0.8)',
              }}
            />
          )}
        </button>
      </div>
    );
  };

  const sectionLabel = (zh: string, en: string, my: string) => (
    <div
      style={{
        fontSize: '0.62rem',
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.42)',
        padding: '10px 8px 4px',
      }}
    >
      {t(zh, en, my)}
    </div>
  );

  return (
    <aside
      style={{
        width: isMobile ? 'min(300px, 88vw)' : compact ? 76 : 232,
        flexShrink: 0,
        background:
          'linear-gradient(180deg, rgba(8, 28, 52, 0.82) 0%, rgba(12, 38, 68, 0.66) 48%, rgba(10, 32, 58, 0.76) 100%)',
        backdropFilter: 'blur(28px) saturate(1.15)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.15)',
        borderRight: '1px solid rgba(255, 255, 255, 0.14)',
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '12px 10px' : compact ? '12px 8px' : '12px 10px',
        zIndex: isMobile ? 160 : 1,
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? 0 : undefined,
        top: isMobile ? 0 : undefined,
        bottom: isMobile ? 0 : undefined,
        height: isMobile ? '100vh' : '100%',
        alignSelf: isMobile ? undefined : 'stretch',
        transform: isMobile ? (mobileNavOpen ? 'translateX(0)' : 'translateX(-105%)') : undefined,
        transition: isMobile
          ? 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)'
          : 'width 0.22s ease',
        boxShadow:
          isMobile && mobileNavOpen
            ? '8px 0 40px rgba(0, 0, 0, 0.28)'
            : 'inset -1px 0 0 rgba(255, 255, 255, 0.06)',
        maxHeight: isMobile ? '100vh' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'space-between',
          gap: 8,
          marginBottom: 10,
          padding: compact ? '2px 0 8px' : '2px 4px 8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {!compact && (
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: isMobile ? '0.72rem' : '0.64rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.88)',
              }}
            >
              {t('功能菜单', 'Modules', 'မီနူး')}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.42)', marginTop: 3 }}>
              {t(`${cards.length} 个模块 · / 搜索`, `${cards.length} modules · /`, `${cards.length} ခု`)}
            </div>
          </div>
        )}
        {!isMobile && (
          <button
            type="button"
            title={compact ? t('展开菜单', 'Expand', 'ချဲ့ရန်') : t('收起为图标', 'Collapse', 'ခေါက်ရန်')}
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              writeJson(COLLAPSE_KEY, next);
              if (next) setQuery('');
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.78rem',
              flexShrink: 0,
            }}
          >
            {compact ? '»' : '«'}
          </button>
        )}
      </div>

      {!compact && (
        <div style={{ marginBottom: 8 }}>
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
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(0, 0, 0, 0.18)',
              color: 'white',
              fontSize: '0.82rem',
            }}
          />
        </div>
      )}

      <nav
        className="admin-shell-nav"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? 5 : 3,
        }}
      >
        {searching ? (
          <>
            {sectionLabel('搜索结果', 'Results', 'ရလဒ်')}
            {filtered.length === 0 ? (
              <div style={{ padding: '16px 8px', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
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
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '10px 8px 4px',
                        color: 'rgba(255,255,255,0.42)',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
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
  const bg =
    tone === 'red'
      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
      : tone === 'amber'
        ? 'linear-gradient(135deg, #fbbf24, #d97706)'
        : 'linear-gradient(135deg, #38bdf8, #2563eb)';
  return (
    <span
      style={{
        background: bg,
        color: 'white',
        fontSize: '0.58rem',
        fontWeight: 800,
        padding: '2px 6px',
        borderRadius: 999,
        lineHeight: 1.2,
        border: '1px solid rgba(255,255,255,0.25)',
      }}
    >
      {n}
    </span>
  );
}

export default AdminFunctionMenu;

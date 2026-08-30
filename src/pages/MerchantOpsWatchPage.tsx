import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { REGIONS, STORE_TYPE_LABELS } from './deliveryStore/deliveryStoreShared';
import { fetchMerchantOpsWatch } from '../services/merchantOpsWatchService';
import {
  PENDING_ACCEPT_TIMEOUT_MINUTES,
  filterWatchRows,
  formatAgeLabel,
  summarizeWatchRows,
  type MerchantOpsWatchRow,
  type MerchantOpsWatchTab,
} from '../utils/merchantOpsWatch';
import { feedbackService } from '../services/FeedbackService';
import '../styles/merchantApplications.css';
import '../styles/adminMerchantOpsWatch.css';

function regionLabel(region: string): string {
  return REGIONS.find((item) => item.id === region)?.name || region || '—';
}

function storeTypeLabel(type: string): string {
  return STORE_TYPE_LABELS[type] || type || '—';
}

function detectRegionFilter(): string {
  const role =
    sessionStorage.getItem('currentUserRole') || localStorage.getItem('currentUserRole') || '';
  if (role === 'admin') return '';
  const region =
    sessionStorage.getItem('currentUserRegion') || localStorage.getItem('currentUserRegion') || '';
  const user = (
    sessionStorage.getItem('currentUser') ||
    localStorage.getItem('currentUser') ||
    ''
  ).toUpperCase();
  if (region === 'yangon' || user.startsWith('YGN')) return 'yangon';
  if (region === 'maymyo' || user.startsWith('POL')) return 'maymyo';
  if (region === 'mandalay' || user.startsWith('MDY')) return 'mandalay';
  return '';
}

function closeReason(row: MerchantOpsWatchRow): string {
  if (row.hours.closedToday && row.hours.inHours) return '营业时段打烊';
  if (row.hours.closedToday) return '今日打烊';
  if (row.hours.onVacation) return '今日休假';
  return '';
}

const MerchantOpsWatchPage: React.FC = () => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') || 'all') as MerchantOpsWatchTab;
  const activeTab: MerchantOpsWatchTab = ['all', 'closed', 'stock', 'overdue'].includes(tab)
    ? tab
    : 'all';

  const lockedRegion = detectRegionFilter();
  const [rows, setRows] = useState<MerchantOpsWatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState(lockedRegion);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const next = await fetchMerchantOpsWatch();
      setRows(next);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Failed to load' : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load({ silent: true }), 20000);
    return () => window.clearInterval(t);
  }, [load]);

  const regionRows = useMemo(
    () => rows.filter((row) => !region || row.region === region),
    [rows, region],
  );
  const visible = useMemo(
    () => filterWatchRows(rows, query, activeTab, region || undefined),
    [rows, query, activeTab, region],
  );
  const summary = useMemo(() => summarizeWatchRows(regionRows), [regionRows]);

  const setTab = (next: MerchantOpsWatchTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const callStore = (row: MerchantOpsWatchRow) => {
    const phone = row.managerPhone || row.phone;
    if (!phone) {
      feedbackService.notify(isEn ? 'No phone on file' : '这家店没有电话');
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="merchant-apps-page">
      <div className="merchant-apps-header">
        <div>
          <h1>{isEn ? 'Merchant ops watch' : '今日商家监管'}</h1>
          <p>
            {isEn
              ? `Same rules as merchant web: closed today / vacation, stock 0 or ≤3, and 待确认 older than ${PENDING_ACCEPT_TIMEOUT_MINUTES} minutes.`
              : `与商家端对齐：今日打烊/休假、缺货或库存≤3、待确认超过 ${PENDING_ACCEPT_TIMEOUT_MINUTES} 分钟未接。`}
          </p>
          <p style={{ marginTop: '0.35rem' }}>
            <Link to="/admin/delivery-stores" style={{ color: '#2563eb' }}>
              {isEn ? '← Merchant stores' : '← 返回商家管理'}
            </Link>
          </p>
        </div>
        <div className="merchant-apps-toolbar">
          <input
            className="merchant-apps-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? 'Store / code / phone' : '店铺、店码、电话'}
          />
          {!lockedRegion && (
            <select
              className="merchant-apps-filter"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">{isEn ? 'All regions' : '全部区域'}</option>
              {REGIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="merchant-apps-btn merchant-apps-btn--ghost"
            onClick={() => void load({ silent: rows.length > 0 })}
          >
            {isEn ? 'Refresh' : '刷新'}
          </button>
          <span className="merchant-apps-poll-hint">
            {isEn ? 'Auto-refresh every 20s' : '每 20 秒自动刷新'}
            {lastUpdatedAt
              ? ` · ${isEn ? 'Updated' : '已更新'} ${new Date(lastUpdatedAt).toLocaleTimeString()}`
              : ''}
          </span>
        </div>
      </div>

      <div className="mow-summary">
        <button type="button" className={`mow-chip${activeTab === 'all' ? ' is-active' : ''}`} onClick={() => setTab('all')}>
          <strong>{regionRows.length}</strong>
          <span>{isEn ? 'Issues' : '需关注店铺'}</span>
        </button>
        <button type="button" className={`mow-chip mow-chip--closed${activeTab === 'closed' ? ' is-active' : ''}`} onClick={() => setTab('closed')}>
          <strong>{summary.closed}</strong>
          <span>{isEn ? 'Closed today' : '今日打烊 / 休假'}</span>
        </button>
        <button type="button" className={`mow-chip mow-chip--stock${activeTab === 'stock' ? ' is-active' : ''}`} onClick={() => setTab('stock')}>
          <strong>{summary.outOfStockItems}</strong>
          <span>{isEn ? 'Out of stock items' : '缺货商品数'}</span>
        </button>
        <button type="button" className={`mow-chip mow-chip--overdue${activeTab === 'overdue' ? ' is-active' : ''}`} onClick={() => setTab('overdue')}>
          <strong>{summary.overdueOrders}</strong>
          <span>{isEn ? 'Overdue accepts' : '超时待接单'}</span>
        </button>
      </div>

      {error && (
        <div className="merchant-apply-alert merchant-apply-alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="merchant-apps-table-wrap">
        {loading && rows.length === 0 ? (
          <div className="merchant-apps-empty">{isEn ? 'Loading…' : '加载中…'}</div>
        ) : visible.length === 0 ? (
          <div className="merchant-apps-empty">
            {isEn ? 'No stores need attention in this filter.' : '这个筛选下没有需要跟进的店铺。'}
          </div>
        ) : (
          <table className="merchant-apps-table">
            <thead>
              <tr>
                <th>{isEn ? 'Store' : '店铺'}</th>
                <th>{isEn ? 'Hours' : '营业'}</th>
                <th>{isEn ? 'Flags' : '状态'}</th>
                <th>{isEn ? 'Pending' : '待接单'}</th>
                <th>{isEn ? 'Stock' : '库存'}</th>
                <th>{isEn ? 'Actions' : '操作'}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const open = openId === row.storeId;
                return (
                  <React.Fragment key={row.storeId}>
                    <tr
                      className={`prd-review-row${row.overdueCount > 0 ? ' mow-row--hot' : ''}`}
                      onClick={() => setOpenId(open ? null : row.storeId)}
                    >
                      <td>
                        <div className="prd-review-name">{row.storeName}</div>
                        <div className="prd-review-sub">
                          {row.storeCode || '—'} · {regionLabel(row.region)} · {storeTypeLabel(row.storeType)}
                        </div>
                      </td>
                      <td>
                        <div>{row.hours.hoursLabel}</div>
                        <div className="prd-review-sub">
                          {row.hours.shouldBeOpen
                            ? isEn
                              ? 'Should be open'
                              : '当前应营业'
                            : row.hours.inHours
                              ? closeReason(row) || (isEn ? 'Closed' : '未营业')
                              : isEn
                                ? 'Outside hours'
                                : '非营业时段'}
                        </div>
                      </td>
                      <td>
                        <div className="mow-flags">
                          {row.hours.closedToday && (
                            <span className="mow-flag mow-flag--closed">{closeReason(row) || '今日打烊'}</span>
                          )}
                          {row.hours.onVacation && !row.hours.closedToday && (
                            <span className="mow-flag mow-flag--vacation">{isEn ? 'Vacation' : '今日休假'}</span>
                          )}
                          {row.overdueCount > 0 && (
                            <span className="mow-flag mow-flag--overdue">
                              {isEn ? `${row.overdueCount} overdue` : `超时 ${row.overdueCount}`}
                            </span>
                          )}
                          {row.outOfStockCount > 0 && (
                            <span className="mow-flag mow-flag--out">
                              {isEn ? `${row.outOfStockCount} out` : `缺货 ${row.outOfStockCount}`}
                            </span>
                          )}
                          {row.lowStockCount > 0 && (
                            <span className="mow-flag mow-flag--low">
                              {isEn ? `${row.lowStockCount} low` : `偏低 ${row.lowStockCount}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {row.pending.length === 0
                          ? '—'
                          : `${row.pending.length} 单${
                              row.oldestOverdueMs != null ? ` · 最久 ${formatAgeLabel(row.oldestOverdueMs)}` : ''
                            }`}
                      </td>
                      <td>
                        {row.outOfStockCount + row.lowStockCount === 0
                          ? '—'
                          : `缺货 ${row.outOfStockCount} · 偏低 ${row.lowStockCount}`}
                      </td>
                      <td>
                        <div className="mow-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="merchant-apps-btn merchant-apps-btn--ghost"
                            onClick={() => callStore(row)}
                          >
                            {isEn ? 'Call' : '打电话'}
                          </button>
                          <Link
                            className="merchant-apps-btn merchant-apps-btn--primary"
                            to={`/admin/delivery-stores?q=${encodeURIComponent(row.storeCode || row.storeName)}`}
                          >
                            {isEn ? 'Store' : '进店铺'}
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6}>
                          <div className="mow-detail">
                            {row.pending.length > 0 && (
                              <p>
                                <strong>{isEn ? 'Pending accept' : '待接单'}：</strong>
                                {row.pending
                                  .slice(0, 8)
                                  .map(
                                    (order) =>
                                      `${order.id}（${formatAgeLabel(order.ageMs)}${
                                        order.overdue ? ' · 超时' : ''
                                      }）`,
                                  )
                                  .join('、')}
                                {row.pending.length > 8 ? ` 等 ${row.pending.length} 单` : ''}
                              </p>
                            )}
                            {row.stockAlerts.length > 0 && (
                              <p>
                                <strong>{isEn ? 'Stock' : '库存'}：</strong>
                                {row.stockAlerts
                                  .slice(0, 8)
                                  .map(
                                    (item) =>
                                      `${item.productName}${item.variantName ? ` / ${item.variantName}` : ''}（${
                                        item.level === 'out' ? '缺货' : `剩 ${item.stock}`
                                      }）`,
                                  )
                                  .join('、')}
                                {row.stockAlerts.length > 8 ? ` 等 ${row.stockAlerts.length} 项` : ''}
                              </p>
                            )}
                            {(row.managerPhone || row.phone) && (
                              <p>
                                {isEn ? 'Phone' : '电话'}：{row.managerPhone || row.phone}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MerchantOpsWatchPage;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { REGIONS, STORE_TYPE_LABELS } from './deliveryStore/deliveryStoreShared';
import { detectFinanceRegionPrefix } from './FinanceManagement.helpers';
import { fetchMerchantOpsWatch } from '../services/merchantOpsWatchService';
import {
  currentOpsActorName,
  loadMerchantOpsDesk,
  logMerchantOpsFollowup,
  nudgeMerchantAccept,
  persistMerchantOpsDesk,
} from '../services/merchantOpsDeskService';
import { downloadAdminExcel } from '../utils/adminExcelExport';
import {
  PENDING_ACCEPT_TIMEOUT_MINUTES,
  filterWatchRows,
  formatAgeLabel,
  formatRemainLabel,
  isClosedDuringHours,
  isClosedWatch,
  isInactiveStoreStatus,
  localDateKey,
  stockOnlyIssue,
  summarizeWatchRows,
  type MerchantOpsWatchRow,
  type MerchantOpsWatchTab,
} from '../utils/merchantOpsWatch';
import {
  buildNudgeMessage,
  buildOpsWatchTable,
  buildWhatsAppUrl,
  emptyDeskState,
  isStoreIgnoredToday,
  markStoreContacted,
  setStoreIgnoredToday,
  shouldHideStockOnlyIgnored,
  storePhone,
  type MerchantOpsDeskState,
} from '../utils/merchantOpsDesk';
import { feedbackService } from '../services/FeedbackService';
import '../styles/merchantApplications.css';
import '../styles/adminMerchantOpsWatch.css';

const TABS: MerchantOpsWatchTab[] = ['all', 'closed', 'stock', 'overdue', 'pending'];

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
  const user =
    sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '';
  const prefix = detectFinanceRegionPrefix(user, region);
  return REGIONS.find((item) => item.prefix === prefix)?.id || '';
}

function closeReason(row: MerchantOpsWatchRow, t: (zh: string, en: string, my: string) => string): string {
  if (isClosedDuringHours(row)) return t('营业时段打烊', 'Closed during hours', 'ဖွင့်ချိန်အတွင်းပိတ်');
  if (row.hours.closedToday) return t('今日打烊', 'Closed today', 'ယနေ့ပိတ်');
  if (row.hours.onVacation) return t('今日休假', 'On vacation', 'ယနေ့အားလပ်ရက်');
  return '';
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

const MerchantOpsWatchPage: React.FC = () => {
  const { language } = useLanguage();
  const t = useCallback(
    (zh: string, en: string, my: string) => {
      if (language === 'en') return en;
      if (language === 'my') return my;
      return zh;
    },
    [language],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') || 'all') as MerchantOpsWatchTab;
  const activeTab: MerchantOpsWatchTab = TABS.includes(tab) ? tab : 'all';

  const lockedRegion = detectRegionFilter();
  const [rows, setRows] = useState<MerchantOpsWatchRow[]>([]);
  const [watchedStoreCount, setWatchedStoreCount] = useState(0);
  const [healthyStoreCount, setHealthyStoreCount] = useState(0);
  const [inactiveStoreCount, setInactiveStoreCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState(lockedRegion);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [desk, setDesk] = useState<MerchantOpsDeskState>(emptyDeskState);
  const [contactNote, setContactNote] = useState('');
  const [busyStoreId, setBusyStoreId] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const next = await fetchMerchantOpsWatch();
        setRows(next.rows);
        setWatchedStoreCount(next.watchedStoreCount);
        setHealthyStoreCount(next.healthyStoreCount);
        setInactiveStoreCount(next.inactiveStoreCount);
        setLastUpdatedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : t('加载失败', 'Failed to load', 'မရနိုင်ပါ'));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadMerchantOpsDesk(localDateKey()).then(setDesk);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load({ silent: true }), 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  const regionRows = useMemo(
    () => rows.filter((row) => !region || row.region === region),
    [rows, region],
  );
  const dayKey = localDateKey();
  const ignoredStockRows = useMemo(
    () => regionRows.filter((row) => shouldHideStockOnlyIgnored(row, desk, dayKey)),
    [regionRows, desk, dayKey],
  );
  const attentionRows = useMemo(
    () => regionRows.filter((row) => !shouldHideStockOnlyIgnored(row, desk, dayKey)),
    [regionRows, desk, dayKey],
  );
  const listSource = activeTab === 'stock' ? regionRows : attentionRows;
  const visible = useMemo(
    () => filterWatchRows(listSource, query, activeTab),
    [listSource, query, activeTab],
  );
  const summary = useMemo(() => summarizeWatchRows(attentionRows), [attentionRows]);

  const saveDesk = async (next: MerchantOpsDeskState) => {
    setDesk(next);
    await persistMerchantOpsDesk(next);
  };

  const setTab = (next: MerchantOpsWatchTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const callStore = (row: MerchantOpsWatchRow) => {
    const phone = storePhone(row);
    if (!phone) {
      feedbackService.notify(t('这家店没有电话', 'No phone on file', 'ဖုန်းမရှိပါ'));
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const copyPhone = async (row: MerchantOpsWatchRow) => {
    const phone = storePhone(row);
    if (!phone) {
      feedbackService.notify(t('这家店没有电话', 'No phone on file', 'ဖုန်းမရှိပါ'));
      return;
    }
    const ok = await copyText(phone);
    feedbackService.notify(
      ok
        ? t('已复制电话', 'Phone copied', 'ဖုန်းကူးပြီး')
        : t('复制失败', 'Copy failed', 'ကူးမရပါ'),
    );
  };

  const openWhatsApp = (row: MerchantOpsWatchRow, body: string) => {
    const phone = storePhone(row);
    if (!phone) {
      feedbackService.notify(t('这家店没有电话', 'No phone on file', 'ဖုန်းမရှိပါ'));
      return;
    }
    window.open(buildWhatsAppUrl(phone, body), '_blank', 'noopener,noreferrer');
  };

  const markContacted = async (row: MerchantOpsWatchRow) => {
    const next = markStoreContacted(desk, row.storeId, currentOpsActorName(), contactNote);
    await saveDesk(next);
    await logMerchantOpsFollowup({
      storeId: row.storeId,
      storeName: row.storeName,
      action: `商家监管已联系 ${row.storeCode || row.storeName}`,
      detail: contactNote,
    });
    feedbackService.notify(t('已记下联系', 'Marked as contacted', 'ဆက်သွယ်ပြီးဟုမှတ်သား'));
  };

  const toggleIgnore = async (row: MerchantOpsWatchRow) => {
    if (!stockOnlyIssue(row)) {
      feedbackService.notify(
        t(
          '今日忽略只用于仅库存问题的店',
          'Ignore today is only for stock-only stores',
          'ယနေ့လျစ်လျူရှုမှုသည် စတော့ပြဿနာသာရှိသောဆိုင်များအတွက်',
        ),
      );
      return;
    }
    const day = localDateKey();
    const ignored = isStoreIgnoredToday(desk, row.storeId, day);
    const next = setStoreIgnoredToday(desk, row.storeId, !ignored, day);
    await saveDesk(next);
    await logMerchantOpsFollowup({
      storeId: row.storeId,
      storeName: row.storeName,
      action: ignored
        ? `取消今日忽略 ${row.storeCode || row.storeName}`
        : `今日忽略库存跟进 ${row.storeCode || row.storeName}`,
    });
  };

  const nudgeStore = async (row: MerchantOpsWatchRow) => {
    if (row.pending.length === 0) return;
    setBusyStoreId(row.storeId);
    try {
      const nudged = await nudgeMerchantAccept(row.storeId);
      await logMerchantOpsFollowup({
        storeId: row.storeId,
        storeName: row.storeName,
        action: `催接单 ${row.storeCode || row.storeName}（${row.pending.length} 单）`,
      });
      openWhatsApp(row, buildNudgeMessage(row, language));
      feedbackService.notify(
        nudged
          ? t('已催接单，商家端会响铃', 'Nudged — merchant app/web will chime', 'တိုက်တွန်းပြီး — ဆိုင်ဘက်မြည်မည်')
          : t(
              '已打开 WhatsApp；商家端响铃字段未写入（可能尚未迁移）',
              'WhatsApp opened; in-app chime column was not updated yet',
              'WhatsApp ဖွင့်ပြီး၊ အက်ပ်မြည်သံကော်လံမရေးရသေး',
            ),
      );
    } finally {
      setBusyStoreId(null);
    }
  };

  const exportExcel = () => {
    const table = buildOpsWatchTable(attentionRows, desk);
    void downloadAdminExcel(`merchant-ops-${localDateKey()}.xlsx`, [
      {
        name: '商家监管',
        title: 'MARKET LINK · 今日商家监管',
        subtitle: `Asia/Yangon · ${localDateKey()} · ${attentionRows.length} 家`,
        columns: table.headers.map((header) => ({ header, width: 14 })),
        rows: table.rows,
      },
    ]);
    void logMerchantOpsFollowup({
      storeId: 'merchant-ops',
      storeName: '今日商家监管',
      action: `导出当日监管 Excel（${attentionRows.length} 家）`,
    });
  };

  return (
    <div className="merchant-apps-page">
      <div className="merchant-apps-header">
        <div>
          <h1>{t('今日商家监管', 'Merchant ops watch', 'ယနေ့ဆိုင်ကြီးကြပ်မှု')}</h1>
          <p>
            {t(
              `与商家端对齐：今日打烊/休假、缺货或库存≤3、待确认超过 ${PENDING_ACCEPT_TIMEOUT_MINUTES} 分钟未接。未超时待接单单独成列。`,
              `Same rules as merchant web: closed today / vacation, stock 0 or ≤3, and 待确认 older than ${PENDING_ACCEPT_TIMEOUT_MINUTES} minutes. Fresh pending accepts have their own tab.`,
              `ဆိုင်ဝက်ဘ်နှင့်အညီ - ယနေ့ပိတ်/အားလပ်၊ ကုန်ပြတ် သို့မဟုတ် ≤3၊ အတည်ပြုရန် ${PENDING_ACCEPT_TIMEOUT_MINUTES} မိနစ်ကျော်။ မကျော်သေးသောအော်ဒါများကို သီးသန့်စစ်သည်။`,
            )}
          </p>
          <p className="merchant-apps-archive-hint">
            {t(
              `已连接数据库 · 监管 ${watchedStoreCount} 家合伙店 · 正常 ${healthyStoreCount} · 停用/维护 ${inactiveStoreCount}（不含中转仓）。`,
              `Connected · watching ${watchedStoreCount} partner store(s) · healthy ${healthyStoreCount} · inactive/maintenance ${inactiveStoreCount}. Transit stations excluded.`,
              `ဒေတာဘေ့စ်ချိတ်ပြီး · ဆိုင် ${watchedStoreCount} · ပုံမှန် ${healthyStoreCount} · ပိတ်/ပြုပြင် ${inactiveStoreCount}။`,
            )}
          </p>
          <p style={{ marginTop: '0.35rem' }}>
            <Link to="/admin/delivery-stores" style={{ color: '#2563eb' }}>
              {t('← 返回商家管理', '← Merchant stores', '← ဆိုင်စီမံခန့်ခွဲမှု')}
            </Link>
          </p>
        </div>
        <div className="merchant-apps-toolbar">
          <input
            className="merchant-apps-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('店铺、店码、电话', 'Store / code / phone', 'ဆိုင် / ကုဒ် / ဖုန်း')}
          />
          {!lockedRegion && (
            <select
              className="merchant-apps-filter"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">{t('全部区域', 'All regions', 'ဒေသအားလုံး')}</option>
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
            {t('刷新', 'Refresh', 'ပြန်တင်')}
          </button>
          <button
            type="button"
            className="merchant-apps-btn merchant-apps-btn--ghost"
            onClick={exportExcel}
            disabled={attentionRows.length === 0}
          >
            {t('导出 Excel', 'Export Excel', 'Excel ထုတ်')}
          </button>
          <span className="merchant-apps-poll-hint">
            {t('每 20 秒自动刷新', 'Auto-refresh every 20s', '၂၀ စက္ကန့်တစ်ကြိမ်')}
            {lastUpdatedAt
              ? ` · ${t('已更新', 'Updated', 'အပ်ဒိတ်')} ${new Date(lastUpdatedAt).toLocaleTimeString()}`
              : ''}
          </span>
        </div>
      </div>

      <div className="mow-summary">
        <button type="button" className={`mow-chip${activeTab === 'all' ? ' is-active' : ''}`} onClick={() => setTab('all')}>
          <strong>{attentionRows.length}</strong>
          <span>{t('需关注店铺', 'Issues', 'အာရုံစိုက်ရမည့်ဆိုင်')}</span>
          <em className="mow-chip-sub">
            {t(
              `打烊 ${summary.closed} · 库存 ${summary.stock} · 超时 ${summary.overdue} · 待接 ${summary.pendingFresh}${
                summary.inactive ? ` · 停用 ${summary.inactive}` : ''
              }`,
              `Closed ${summary.closed} · stock ${summary.stock} · overdue ${summary.overdue} · pending ${summary.pendingFresh}${
                summary.inactive ? ` · inactive ${summary.inactive}` : ''
              }`,
              `ပိတ် ${summary.closed} · စတော့ ${summary.stock} · ကျော် ${summary.overdue} · စောင့် ${summary.pendingFresh}${
                summary.inactive ? ` · ပိတ်ထား ${summary.inactive}` : ''
              }`,
            )}
          </em>
        </button>
        <button
          type="button"
          className={`mow-chip mow-chip--closed${activeTab === 'closed' ? ' is-active' : ''}`}
          onClick={() => setTab('closed')}
        >
          <strong>{summary.closed}</strong>
          <span>{t('今日打烊 / 休假', 'Closed today', 'ယနေ့ပိတ် / အားလပ်')}</span>
          {summary.closedDuringHours > 0 && (
            <em className="mow-chip-sub">
              {t(
                `其中营业中打烊 ${summary.closedDuringHours}`,
                `${summary.closedDuringHours} closed during hours`,
                `ဖွင့်ချိန်ပိတ် ${summary.closedDuringHours}`,
              )}
            </em>
          )}
        </button>
        <button
          type="button"
          className={`mow-chip mow-chip--stock${activeTab === 'stock' ? ' is-active' : ''}`}
          onClick={() => setTab('stock')}
        >
          <strong>
            {t(
              `缺货 ${summary.outOfStockItems} · 偏低 ${summary.lowStockItems}`,
              `Out ${summary.outOfStockItems} · Low ${summary.lowStockItems}`,
              `ကုန်ပြတ် ${summary.outOfStockItems} · နည်း ${summary.lowStockItems}`,
            )}
          </strong>
          <span>{t('库存预警商品', 'Stock alerts', 'စတော့သတိပေး')}</span>
          <em className="mow-chip-sub">
            {t(
              `${summary.stock} 家店`,
              `${summary.stock} store(s)`,
              `ဆိုင် ${summary.stock}`,
            )}
            {ignoredStockRows.length > 0
              ? t(
                  ` · 今日忽略 ${ignoredStockRows.length}`,
                  ` · ignored today ${ignoredStockRows.length}`,
                  ` · ယနေ့လျစ်လျူရှု ${ignoredStockRows.length}`,
                )
              : ''}
          </em>
        </button>
        <button
          type="button"
          className={`mow-chip mow-chip--overdue${activeTab === 'overdue' ? ' is-active' : ''}`}
          onClick={() => setTab('overdue')}
        >
          <strong>{summary.overdueOrders}</strong>
          <span>{t('超时待接单', 'Overdue accepts', 'လက်ခံချိန်ကျော်')}</span>
        </button>
        <button
          type="button"
          className={`mow-chip mow-chip--pending${activeTab === 'pending' ? ' is-active' : ''}`}
          onClick={() => setTab('pending')}
        >
          <strong>{summary.pendingFreshOrders}</strong>
          <span>{t('待接单（未超时）', 'Pending (on time)', 'လက်ခံရန် (မကျော်သေး)')}</span>
        </button>
      </div>

      {error && (
        <div className="merchant-apply-alert merchant-apply-alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="merchant-apps-table-wrap">
        {loading && rows.length === 0 ? (
          <div className="merchant-apps-empty">{t('加载中…', 'Loading…', 'ဖွင့်နေသည်…')}</div>
        ) : visible.length === 0 ? (
          <div className="merchant-apps-empty">
            {rows.length === 0
              ? t(
                  `已连接数据库 · 监管 ${watchedStoreCount} 家合伙店 · 当前没有打烊/缺货/待接或超时`,
                  `Connected · watching ${watchedStoreCount} partner store(s) · none closed, low-stock, pending, or overdue.`,
                  `ဆိုင် ${watchedStoreCount} · ပိတ်/ကုန်ပြတ်/စောင့်/ကျော် မရှိ`,
                )
              : t('这个筛选下没有需要跟进的店铺。', 'No stores need attention in this filter.', 'ဤစစ်ထုတ်မှုတွင် ဆိုင်မရှိ')}
          </div>
        ) : (
          <table className="merchant-apps-table">
            <thead>
              <tr>
                <th>{t('店铺', 'Store', 'ဆိုင်')}</th>
                <th>{t('营业', 'Hours', 'ဖွင့်ချိန်')}</th>
                <th>{t('状态', 'Flags', 'အခြေအနေ')}</th>
                <th>{t('待接单', 'Pending', 'လက်ခံရန်')}</th>
                <th>{t('库存', 'Stock', 'စတော့')}</th>
                <th>{t('操作', 'Actions', 'လုပ်ဆောင်ချက်')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const open = openId === row.storeId;
                const contact = desk.contacted[row.storeId];
                const phone = storePhone(row);
                return (
                  <React.Fragment key={row.storeId}>
                    <tr
                      className={`prd-review-row${row.overdueCount > 0 ? ' mow-row--hot' : ''}`}
                      onClick={() => {
                        setOpenId(open ? null : row.storeId);
                        setContactNote(contact?.note || '');
                      }}
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
                            ? t('当前应营业', 'Should be open', 'ဖွင့်ထားသင့်')
                            : row.hours.inHours
                              ? closeReason(row, t) || t('未营业', 'Closed', 'မဖွင့်')
                              : t('非营业时段', 'Outside hours', 'ဖွင့်ချိန်ပြင်ပ')}
                        </div>
                      </td>
                      <td>
                        <div className="mow-flags">
                          {isInactiveStoreStatus(row.status) && (
                            <span className="mow-flag mow-flag--inactive">
                              {row.status === 'maintenance'
                                ? t('维护', 'Maintenance', 'ပြုပြင်နေ')
                                : t('停用', 'Inactive', 'ပိတ်ထား')}
                            </span>
                          )}
                          {isClosedDuringHours(row) && (
                            <span className="mow-flag mow-flag--closed">{closeReason(row, t)}</span>
                          )}
                          {row.hours.closedToday && !isClosedDuringHours(row) && isClosedWatch(row) && (
                            <span className="mow-flag mow-flag--closed">{closeReason(row, t)}</span>
                          )}
                          {row.hours.onVacation && !row.hours.closedToday && isClosedWatch(row) && (
                            <span className="mow-flag mow-flag--vacation">
                              {t('今日休假', 'Vacation', 'အားလပ်ရက်')}
                            </span>
                          )}
                          {row.overdueCount > 0 && (
                            <span className="mow-flag mow-flag--overdue">
                              {t(`超时 ${row.overdueCount}`, `${row.overdueCount} overdue`, `ကျော် ${row.overdueCount}`)}
                            </span>
                          )}
                          {row.pending.some((order) => !order.overdue) && row.overdueCount === 0 && (
                            <span className="mow-flag mow-flag--pending">
                              {t('待接未超时', 'Pending', 'မကျော်သေး')}
                            </span>
                          )}
                          {row.outOfStockCount > 0 && (
                            <span className="mow-flag mow-flag--out">
                              {t(`缺货 ${row.outOfStockCount}`, `${row.outOfStockCount} out`, `ကုန်ပြတ် ${row.outOfStockCount}`)}
                            </span>
                          )}
                          {row.lowStockCount > 0 && (
                            <span className="mow-flag mow-flag--low">
                              {t(`偏低 ${row.lowStockCount}`, `${row.lowStockCount} low`, `နည်း ${row.lowStockCount}`)}
                            </span>
                          )}
                          {contact && (
                            <span className="mow-flag mow-flag--hours">
                              {t('已联系', 'Contacted', 'ဆက်သွယ်ပြီး')}
                            </span>
                          )}
                          {isStoreIgnoredToday(desk, row.storeId, dayKey) && (
                            <span className="mow-flag mow-flag--hours">
                              {t('今日忽略', 'Ignored today', 'ယနေ့လျစ်လျူရှု')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {row.pending.length === 0
                          ? '—'
                          : `${row.pending.length} ${t('单', 'orders', 'ခု')}${
                              row.oldestOverdueMs != null
                                ? ` · ${t('最久', 'oldest', 'အကြာဆုံး')} ${formatAgeLabel(row.oldestOverdueMs, language)}`
                                : ` · ${formatRemainLabel(Math.min(...row.pending.map((o) => o.remainMs)), language)}`
                            }`}
                      </td>
                      <td>
                        {row.outOfStockCount + row.lowStockCount === 0
                          ? '—'
                          : t(
                              `缺货 ${row.outOfStockCount} · 偏低 ${row.lowStockCount}`,
                              `Out ${row.outOfStockCount} · Low ${row.lowStockCount}`,
                              `ကုန်ပြတ် ${row.outOfStockCount} · နည်း ${row.lowStockCount}`,
                            )}
                      </td>
                      <td>
                        <div className="mow-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="merchant-apps-btn merchant-apps-btn--ghost"
                            onClick={() => callStore(row)}
                          >
                            {t('打电话', 'Call', 'ခေါ်')}
                          </button>
                          <button
                            type="button"
                            className="merchant-apps-btn merchant-apps-btn--ghost"
                            onClick={() => void copyPhone(row)}
                          >
                            {t('复制电话', 'Copy phone', 'ဖုန်းကူး')}
                          </button>
                          <button
                            type="button"
                            className="merchant-apps-btn merchant-apps-btn--ghost"
                            disabled={!phone}
                            onClick={() =>
                              openWhatsApp(
                                row,
                                t(
                                  `您好，我是 ML Express 调度，想联系 ${row.storeName}。`,
                                  `Hello, this is ML Express ops regarding ${row.storeName}.`,
                                  `မင်္ဂလာပါ၊ ML Express မှ ${row.storeName} အတွက် ဆက်သွယ်ပါသည်။`,
                                ),
                              )
                            }
                          >
                            WhatsApp
                          </button>
                          {row.pending.length > 0 && (
                            <button
                              type="button"
                              className="merchant-apps-btn merchant-apps-btn--primary"
                              disabled={busyStoreId === row.storeId}
                              onClick={() => void nudgeStore(row)}
                            >
                              {t('催接单', 'Nudge accept', 'လက်ခံရန်တိုက်တွန်း')}
                            </button>
                          )}
                          <Link
                            className="merchant-apps-btn merchant-apps-btn--primary"
                            to={`/admin/delivery-stores?q=${encodeURIComponent(row.storeCode || row.storeName)}&products=1`}
                          >
                            {t('进店铺商品', 'Store products', 'ဆိုင်ပစ္စည်း')}
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6}>
                          <div className="mow-detail">
                            {row.pending.length > 0 && (
                              <div className="mow-detail-block">
                                <strong>{t('待接单', 'Pending accept', 'လက်ခံရန်')}：</strong>
                                <ul className="mow-link-list">
                                  {row.pending.map((order) => (
                                    <li key={order.id}>
                                      <Link to={`/admin/city-packages?q=${encodeURIComponent(order.id)}`}>
                                        {order.id}
                                      </Link>
                                      <span>
                                        {formatAgeLabel(order.ageMs, language)}
                                        {order.overdue
                                          ? ` · ${t('超时', 'overdue', 'ကျော်')}`
                                          : ` · ${formatRemainLabel(order.remainMs, language)}`}
                                      </span>
                                      <button
                                        type="button"
                                        className="mow-mini"
                                        onClick={() => void copyText(order.id).then((ok) => {
                                          if (ok) feedbackService.notify(t('已复制单号', 'Copied', 'ကူးပြီး'));
                                        })}
                                      >
                                        {t('复制', 'Copy', 'ကူး')}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {row.stockAlerts.length > 0 && (
                              <div className="mow-detail-block">
                                <strong>{t('库存', 'Stock', 'စတော့')}：</strong>
                                <ul className="mow-link-list">
                                  {row.stockAlerts.map((item) => (
                                    <li key={`${item.productId}-${item.variantName || ''}`}>
                                      <Link
                                        to={`/admin/delivery-stores?q=${encodeURIComponent(
                                          row.storeCode || row.storeName,
                                        )}&products=1`}
                                      >
                                        {item.productName}
                                        {item.variantName ? ` / ${item.variantName}` : ''}
                                      </Link>
                                      <span>
                                        {item.level === 'out'
                                          ? t('缺货', 'out', 'ကုန်ပြတ်')
                                          : t(`剩 ${item.stock}`, `${item.stock} left`, `${item.stock} ကျန်`)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {phone && (
                              <p>
                                {t('电话', 'Phone', 'ဖုန်း')}：{phone}
                                {row.managerPhone && row.phone && row.managerPhone !== row.phone
                                  ? ` · ${t('店电', 'Store', 'ဆိုင်')} ${row.phone}`
                                  : ''}
                              </p>
                            )}
                            {contact && (
                              <p>
                                {t('已联系', 'Contacted', 'ဆက်သွယ်ပြီး')}：
                                {contact.by} · {new Date(contact.at).toLocaleString()}
                                {contact.note ? ` · ${contact.note}` : ''}
                              </p>
                            )}
                            <div className="mow-followup" onClick={(e) => e.stopPropagation()}>
                              <input
                                className="merchant-apps-filter"
                                value={contactNote}
                                onChange={(e) => setContactNote(e.target.value)}
                                placeholder={t('联系备注（选填）', 'Contact note (optional)', 'မှတ်ချက်')}
                              />
                              <button
                                type="button"
                                className="merchant-apps-btn merchant-apps-btn--primary"
                                onClick={() => void markContacted(row)}
                              >
                                {t('已联系', 'Mark contacted', 'ဆက်သွယ်ပြီး')}
                              </button>
                              {stockOnlyIssue(row) && (
                                <button
                                  type="button"
                                  className="merchant-apps-btn merchant-apps-btn--ghost"
                                  onClick={() => void toggleIgnore(row)}
                                >
                                  {isStoreIgnoredToday(desk, row.storeId, dayKey)
                                    ? t('取消忽略', 'Unignore', 'ပြန်ပြ')
                                    : t('今日忽略', 'Ignore today', 'ယနေ့လျစ်လျူရှု')}
                                </button>
                              )}
                            </div>
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

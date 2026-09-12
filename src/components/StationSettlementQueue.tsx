import React, { useEffect, useMemo, useState } from 'react';
import {
  confirmStationSettlement,
  fetchAnnualFinanceRollup,
  fetchSettlementCompare,
  fetchStationSettlements,
  rejectStationSettlement,
  type AnnualFinanceRollup,
  type StationSettlementRow,
} from '../services/inventoryConsoleService';
import type { InventoryTransitStore } from '../services/inventoryConsoleService';
import type { SettlementSnapshot } from '../utils/yangonFinancePeriod';
import { yangonYmdFromUtc } from '../utils/yangonFinancePeriod';
import { settlementMonthTone, type SettlementMonthTone } from '../utils/settlementMonthStatus';

type Props = {
  isEn: boolean;
  stores: InventoryTransitStore[];
  year: number;
  storeCode: string;
  onChanged: () => void;
};

type CompareState = {
  id: string;
  loading: boolean;
  hasDiff: boolean;
  error: string;
  rows: Array<{ key: string; snapshot: number; live: number; delta: number }>;
};

const SNAPSHOT_FIELDS: Array<{ key: keyof SettlementSnapshot; zh: string; en: string }> = [
  { key: 'collectedTotal', zh: '已收', en: 'Collected' },
  { key: 'transportPaidTotal', zh: '已付车费', en: 'Paid truck' },
  { key: 'agencyRemittedTotal', zh: '已汇发站', en: 'Remitted' },
  { key: 'netBalance', zh: '结余', en: 'Net' },
  { key: 'pendingInflowTotal', zh: '待入账', en: 'Pending in' },
  { key: 'transportUnpaidTotal', zh: '未付车费', en: 'Unpaid truck' },
  { key: 'manualIncomeTotal', zh: '手工收入', en: 'Manual in' },
  { key: 'manualExpenseTotal', zh: '手工支出', en: 'Manual out' },
  { key: 'agencyPayableTotal', zh: '应付发站', en: 'Agency payable' },
];

const MONTH_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMmK(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

function snapshotLabel(key: string, isEn: boolean): string {
  const field = SNAPSHOT_FIELDS.find((item) => item.key === key);
  if (!field) return key;
  return isEn ? field.en : field.zh;
}

function monthTitle(month: number, isEn: boolean): string {
  return (isEn ? MONTH_EN : MONTH_ZH)[month - 1] || String(month);
}

function toneLabel(tone: SettlementMonthTone, isEn: boolean): string {
  if (tone === 'confirmed') return isEn ? 'Confirmed' : '已确认';
  if (tone === 'missing') return isEn ? 'Missing' : '缺月';
  if (tone === 'current') return isEn ? 'This month' : '本月';
  return isEn ? 'Upcoming' : '未到';
}

const StationSettlementQueue: React.FC<Props> = ({ isEn, stores, year, storeCode, onChanged }) => {
  const [rows, setRows] = useState<StationSettlementRow[]>([]);
  const [annual, setAnnual] = useState<AnnualFinanceRollup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [busyId, setBusyId] = useState('');
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [openMonth, setOpenMonth] = useState<number | null>(null);

  const storeName = useMemo(() => {
    const map = new Map(stores.map((s) => [s.store_code, s.store_name]));
    return (code: string) => map.get(code) || code;
  }, [stores]);

  const today = useMemo(() => yangonYmdFromUtc(), []);
  const annualScope = storeCode
    ? `${storeName(storeCode)} · ${storeCode}`
    : isEn
      ? 'All stations'
      : '全部站点';

  const monthCards = useMemo(() => {
    if (!annual) return [];
    return annual.months.map((month) => ({
      ...month,
      tone: settlementMonthTone(month.month, annual.year, month.missing, today),
    }));
  }, [annual, today]);

  const overdueCount = monthCards.filter((item) => item.tone === 'missing').length;
  const upcomingCount = monthCards.filter((item) => item.tone === 'upcoming').length;
  const confirmedCount = monthCards.filter((item) => item.tone === 'confirmed').length;
  const openMonthCard = monthCards.find((item) => item.month === openMonth) ?? null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, rollup] = await Promise.all([
        fetchStationSettlements({ status: 'submitted' }),
        fetchAnnualFinanceRollup(year, storeCode || undefined),
      ]);
      setRows(pending);
      setAnnual(rollup);
    } catch (e) {
      setError(e instanceof Error ? e.message : isEn ? 'Load failed' : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, storeCode]);

  const onConfirm = async (id: string) => {
    setBusyId(id);
    try {
      await confirmStationSettlement(id);
      setCompare((prev) => (prev?.id === id ? null : prev));
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : isEn ? 'Confirm failed' : '确认失败');
    } finally {
      setBusyId('');
    }
  };

  const onReject = async (id: string) => {
    const reason = rejectReason.trim();
    if (!reason) {
      setError(isEn ? 'Reject reason is required.' : '请填写驳回原因。');
      return;
    }
    setBusyId(id);
    try {
      await rejectStationSettlement(id, reason);
      setRejectId('');
      setRejectReason('');
      setCompare((prev) => (prev?.id === id ? null : prev));
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : isEn ? 'Reject failed' : '驳回失败');
    } finally {
      setBusyId('');
    }
  };

  const onCompare = async (id: string) => {
    setCompare({ id, loading: true, hasDiff: false, error: '', rows: [] });
    try {
      const result = await fetchSettlementCompare(id);
      setCompare({
        id,
        loading: false,
        hasDiff: result.diff.hasDiff,
        error: '',
        rows: Object.entries(result.diff.diffs).map(([key, val]) => ({
          key,
          snapshot: val.snapshot,
          live: val.live,
          delta: val.delta,
        })),
      });
    } catch (e) {
      setCompare({
        id,
        loading: false,
        hasDiff: false,
        error: e instanceof Error ? e.message : isEn ? 'Compare failed' : '对比失败',
        rows: [],
      });
    }
  };

  return (
    <section className="cbl-card cbl-settlement-card">
      <div className="cbl-card__head">
        <div className="cbl-card__head-copy">
          <h2 className="cbl-card__title">{isEn ? 'Station close & annual' : '待签认 / 年报'}</h2>
          <p className="cbl-card-hint cbl-card-hint--in-head">
            {isEn
              ? `Pending queue is all stations. Annual ${year} follows the finance station filter (${annualScope}). HQ confirms only — it does not close a station’s books.`
              : `待签认看全部站点；${year} 年报跟随财务站点（${annualScope}）。总部只签认，不代站结账。`}
          </p>
        </div>
        <div className="cbl-card__head-actions">
          {rows.length > 0 ? (
            <span className="cbl-badge cbl-badge--amber">
              {isEn ? `${rows.length} pending` : `${rows.length} 笔待签`}
            </span>
          ) : (
            <span className="cbl-badge cbl-badge--gray">{isEn ? 'Queue clear' : '暂无待签'}</span>
          )}
          <button
            type="button"
            className="cbl-btn cbl-btn--light cbl-btn--sm"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? (isEn ? 'Refreshing…' : '刷新中…') : isEn ? 'Refresh' : '刷新'}
          </button>
        </div>
      </div>

      <div className="cbl-card__body">
        {error ? (
          <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{error}</div>
        ) : null}

        <div className="cbl-settle-grid">
          <article className={`cbl-settle-panel${rows.length ? ' is-attention' : ''}`}>
            <header className="cbl-settle-panel__head">
              <h3 className="cbl-settle-panel__title">{isEn ? 'Pending review' : '待签认'}</h3>
              <p className="cbl-settle-panel__sub">
                {isEn
                  ? 'Day/month closes submitted from Inventory App.'
                  : '站点在库存端提交的日结 / 月结。'}
              </p>
            </header>

            {rows.length === 0 ? (
              <div className="cbl-settle-empty">
                <strong>{isEn ? 'Nothing waiting' : '目前没有待签认'}</strong>
                <span>
                  {isEn
                    ? 'Submitted day and month closes will land here for HQ to compare and confirm.'
                    : '站点提交后会出现在这里，总部可先对比再确认或驳回。'}
                </span>
              </div>
            ) : (
              <ul className="cbl-settle-queue">
                {rows.map((row) => {
                  const busy = busyId === row.id;
                  const comparing = compare?.id === row.id;
                  return (
                    <li key={row.id} className="cbl-settle-item">
                      <div className="cbl-settle-item__top">
                        <div className="cbl-settle-item__who">
                          <span className="cbl-code">{row.store_code}</span>
                          <strong>{storeName(row.store_code)}</strong>
                        </div>
                        <span
                          className={`cbl-badge ${
                            row.period_type === 'month' ? 'cbl-badge--blue' : 'cbl-badge--gray'
                          }`}
                        >
                          {row.period_type === 'day' ? (isEn ? 'Day' : '日结') : isEn ? 'Month' : '月结'}
                        </span>
                      </div>
                      <div className="cbl-settle-item__meta">
                        <span>{String(row.period_start).slice(0, 10)}</span>
                        <span>
                          {isEn ? 'Net' : '结余'} {formatMmK(row.snapshot?.netBalance)}
                        </span>
                        <span>{row.submitted_by || '—'}</span>
                      </div>
                      {rejectId === row.id ? (
                        <div className="cbl-settle-reject">
                          <input
                            className="cbl-settle-reject__input"
                            value={rejectReason}
                            maxLength={200}
                            placeholder={isEn ? 'Reject reason (required)' : '驳回原因（必填）'}
                            onChange={(event) => setRejectReason(event.target.value)}
                          />
                          <button
                            type="button"
                            className="cbl-btn cbl-btn--danger-solid cbl-btn--sm"
                            disabled={busy}
                            onClick={() => void onReject(row.id)}
                          >
                            {isEn ? 'Confirm reject' : '确认驳回'}
                          </button>
                          <button
                            type="button"
                            className="cbl-btn cbl-btn--light cbl-btn--sm"
                            disabled={busy}
                            onClick={() => {
                              setRejectId('');
                              setRejectReason('');
                            }}
                          >
                            {isEn ? 'Cancel' : '取消'}
                          </button>
                        </div>
                      ) : (
                        <div className="cbl-settlement-actions">
                          <button
                            type="button"
                            className="cbl-btn cbl-btn--light cbl-btn--sm"
                            aria-expanded={comparing}
                            onClick={() =>
                              comparing ? setCompare(null) : void onCompare(row.id)
                            }
                          >
                            {comparing
                              ? isEn
                                ? 'Hide compare'
                                : '收起对比'
                              : isEn
                                ? 'Compare'
                                : '对比'}
                          </button>
                          <button
                            type="button"
                            className="cbl-btn cbl-btn--primary cbl-btn--sm"
                            disabled={busy}
                            onClick={() => void onConfirm(row.id)}
                          >
                            {busy ? (isEn ? 'Working…' : '处理中…') : isEn ? 'Confirm' : '确认'}
                          </button>
                          <button
                            type="button"
                            className="cbl-btn cbl-btn--light cbl-btn--sm"
                            disabled={busy}
                            onClick={() => {
                              setRejectId(row.id);
                              setRejectReason('');
                            }}
                          >
                            {isEn ? 'Reject' : '驳回'}
                          </button>
                        </div>
                      )}
                      {comparing ? (
                        <div className="cbl-settle-compare">
                          {compare.loading ? (
                            <p className="cbl-settle-compare__status">
                              {isEn ? 'Comparing with HQ recompute…' : '正在与总部同期重算对比…'}
                            </p>
                          ) : compare.error ? (
                            <p className="cbl-settle-compare__status is-error">{compare.error}</p>
                          ) : (
                            <>
                              <p
                                className={`cbl-settle-compare__status${
                                  compare.hasDiff ? ' is-diff' : ' is-ok'
                                }`}
                              >
                                {compare.hasDiff
                                  ? isEn
                                    ? 'Snapshot differs from live recompute.'
                                    : '快照与总部同期重算不一致。'
                                  : isEn
                                    ? 'Snapshot matches live recompute.'
                                    : '快照与总部同期重算一致。'}
                              </p>
                              <table className="cbl-settle-compare__table">
                                <thead>
                                  <tr>
                                    <th>{isEn ? 'Item' : '项目'}</th>
                                    <th>{isEn ? 'Snapshot' : '快照'}</th>
                                    <th>{isEn ? 'Live' : '重算'}</th>
                                    <th>{isEn ? 'Delta' : '差额'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {compare.rows.map((item) => (
                                    <tr
                                      key={item.key}
                                      className={item.delta !== 0 ? 'is-diff' : undefined}
                                    >
                                      <td>{snapshotLabel(item.key, isEn)}</td>
                                      <td>{formatMmK(item.snapshot)}</td>
                                      <td>{formatMmK(item.live)}</td>
                                      <td>
                                        {item.delta === 0
                                          ? '—'
                                          : `${item.delta > 0 ? '+' : ''}${formatMmK(item.delta)}`}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <article className="cbl-settle-panel cbl-settle-panel--annual">
            <header className="cbl-settle-panel__head">
              <h3 className="cbl-settle-panel__title">
                {isEn ? `Annual ${year}` : `${year} 年报`}
              </h3>
              <p className="cbl-settle-panel__sub">
                {isEn
                  ? 'Sums confirmed monthly closes only. Live ledger is not used to fill gaps.'
                  : '只加总已确认月结，不用活账凑全年。'}
              </p>
            </header>

            {annual ? (
              <>
                <div className="cbl-settle-kpis">
                  <div className="cbl-settle-kpi">
                    <span>{isEn ? 'Collected' : '已收'}</span>
                    <strong>{formatMmK(annual.totals.collectedTotal)}</strong>
                  </div>
                  <div className="cbl-settle-kpi">
                    <span>{isEn ? 'Paid truck' : '已付车费'}</span>
                    <strong>{formatMmK(annual.totals.transportPaidTotal)}</strong>
                  </div>
                  <div className="cbl-settle-kpi">
                    <span>{isEn ? 'Remitted' : '已汇发站'}</span>
                    <strong>{formatMmK(annual.totals.agencyRemittedTotal)}</strong>
                  </div>
                  <div className="cbl-settle-kpi">
                    <span>{isEn ? 'Net' : '结余'}</span>
                    <strong>{formatMmK(annual.totals.netBalance)}</strong>
                  </div>
                  <div className={`cbl-settle-kpi${overdueCount ? ' is-warn' : ''}`}>
                    <span>{isEn ? 'Overdue months' : '过期缺月'}</span>
                    <strong>{overdueCount}</strong>
                    <em>
                      {isEn
                        ? `${confirmedCount} confirmed · ${upcomingCount} not due`
                        : `已确认 ${confirmedCount} · 未到 ${upcomingCount}`}
                    </em>
                  </div>
                </div>

                <div className="cbl-settle-months">
                  {monthCards.map((month) => (
                    <button
                      key={month.month}
                      type="button"
                      className={`cbl-settle-month is-${month.tone}${
                        openMonth === month.month ? ' is-open' : ''
                      }`}
                      onClick={() =>
                        setOpenMonth((prev) => (prev === month.month ? null : month.month))
                      }
                    >
                      <b>{monthTitle(month.month, isEn)}</b>
                      <small>{toneLabel(month.tone, isEn)}</small>
                    </button>
                  ))}
                </div>

                {openMonthCard ? (
                  <div className="cbl-settle-month-detail">
                    <div className="cbl-settle-month-detail__head">
                      <strong>
                        {year}
                        {isEn ? ' ' : '年'}
                        {monthTitle(openMonthCard.month, isEn)}
                      </strong>
                      <span className={`cbl-badge ${
                        openMonthCard.tone === 'confirmed'
                          ? 'cbl-badge--green'
                          : openMonthCard.tone === 'missing'
                            ? 'cbl-badge--red'
                            : openMonthCard.tone === 'current'
                              ? 'cbl-badge--amber'
                              : 'cbl-badge--gray'
                      }`}>
                        {toneLabel(openMonthCard.tone, isEn)}
                      </span>
                    </div>
                    {openMonthCard.tone === 'confirmed' && openMonthCard.snapshot ? (
                      <dl className="cbl-settle-month-detail__grid">
                        {SNAPSHOT_FIELDS.slice(0, 4).map((field) => (
                          <div key={field.key}>
                            <dt>{isEn ? field.en : field.zh}</dt>
                            <dd>{formatMmK(openMonthCard.snapshot?.[field.key] as number)}</dd>
                          </div>
                        ))}
                        <div>
                          <dt>{isEn ? 'Stations' : '站点数'}</dt>
                          <dd>{openMonthCard.storeCount || 0}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p>
                        {openMonthCard.tone === 'upcoming'
                          ? isEn
                            ? 'This month is not due yet, so it is not counted as missing.'
                            : '这个月还没到，不计入过期缺月。'
                          : openMonthCard.tone === 'current'
                            ? isEn
                              ? 'This month has no confirmed close yet.'
                              : '本月还没有已确认的月结。'
                            : isEn
                              ? 'No confirmed monthly close for this month.'
                              : '该月尚无已确认月结。'}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="cbl-settle-panel__hint">
                    {isEn
                      ? 'Tap a month for its confirmed snapshot. Red = overdue, amber = this month, muted = not due.'
                      : '点月份看已确认快照。红=过期未结，黄=本月，灰=未到。'}
                  </p>
                )}
              </>
            ) : (
              <div className="cbl-settle-empty">
                <strong>{isEn ? 'Annual report unavailable' : '年报暂不可用'}</strong>
                <span>{isEn ? 'Refresh after finance data loads.' : '财务数据加载后再点刷新。'}</span>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
};

export default StationSettlementQueue;

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

type Props = {
  isEn: boolean;
  stores: InventoryTransitStore[];
  year: number;
  storeCode: string;
  onChanged: () => void;
};

function formatMmK(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

const StationSettlementQueue: React.FC<Props> = ({ isEn, stores, year, storeCode, onChanged }) => {
  const [rows, setRows] = useState<StationSettlementRow[]>([]);
  const [annual, setAnnual] = useState<AnnualFinanceRollup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [compareText, setCompareText] = useState<string>('');
  const [busyId, setBusyId] = useState('');

  const storeName = useMemo(() => {
    const map = new Map(stores.map((s) => [s.store_code, s.store_name]));
    return (code: string) => map.get(code) || code;
  }, [stores]);

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
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : isEn ? 'Confirm failed' : '确认失败');
    } finally {
      setBusyId('');
    }
  };

  const onReject = async (id: string) => {
    const reason = window.prompt(isEn ? 'Reject reason (required)' : '驳回原因（必填）') || '';
    if (!reason.trim()) return;
    setBusyId(id);
    try {
      await rejectStationSettlement(id, reason.trim());
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : isEn ? 'Reject failed' : '驳回失败');
    } finally {
      setBusyId('');
    }
  };

  const onCompare = async (id: string) => {
    setCompareId(id);
    setCompareText(isEn ? 'Comparing…' : '对比中…');
    try {
      const result = await fetchSettlementCompare(id);
      const lines = Object.entries(result.diff.diffs).map(([key, val]) => {
        const mark = val.delta === 0 ? '' : ` (${val.delta > 0 ? '+' : ''}${val.delta})`;
        return `${key}: ${val.snapshot} → ${val.live}${mark}`;
      });
      setCompareText(
        (result.diff.hasDiff
          ? isEn
            ? 'Snapshot differs from live recompute:\n'
            : '快照与总部同期重算不一致：\n'
          : isEn
            ? 'Snapshot matches live recompute.\n'
            : '快照与总部同期重算一致。\n') + lines.join('\n'),
      );
    } catch (e) {
      setCompareText(e instanceof Error ? e.message : isEn ? 'Compare failed' : '对比失败');
    }
  };

  return (
    <section className="cbl-card cbl-settlement-card">
      <div className="cbl-card__head">
        <h2 className="cbl-card__title">{isEn ? 'Station close & annual' : '待签认 / 年报'}</h2>
        {loading ? (
          <span className="cbl-card__status">{isEn ? 'Loading…' : '加载中…'}</span>
        ) : null}
      </div>
      <div className="cbl-card__body">
        {error ? <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{error}</div> : null}
        <h3 className="cbl-customer-section-title">{isEn ? 'Pending review' : '待签认'}</h3>
        {rows.length === 0 ? (
          <p className="cbl-card-hint">{isEn ? 'No submitted day/month closes.' : '暂无站点提交的日结/月结。'}</p>
        ) : (
          <div className="cbl-table-wrap">
            <table className="cbl-table">
              <thead>
                <tr>
                  <th>{isEn ? 'Station' : '站点'}</th>
                  <th>{isEn ? 'Period' : '期间'}</th>
                  <th>{isEn ? 'Net' : '结余'}</th>
                  <th>{isEn ? 'By' : '提交人'}</th>
                  <th>{isEn ? 'Action' : '操作'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="cbl-code">{row.store_code}</span>
                      <span className="cbl-dim"> · {storeName(row.store_code)}</span>
                    </td>
                    <td>
                      {row.period_type === 'day' ? (isEn ? 'Day' : '日结') : isEn ? 'Month' : '月结'}{' '}
                      {String(row.period_start).slice(0, 10)}
                    </td>
                    <td>{formatMmK(row.snapshot?.netBalance)}</td>
                    <td className="cbl-dim">{row.submitted_by}</td>
                    <td className="cbl-settlement-actions">
                      <button
                        type="button"
                        className="cbl-btn cbl-btn--light cbl-btn--sm"
                        onClick={() => void onCompare(row.id)}
                      >
                        {isEn ? 'Compare' : '对比'}
                      </button>
                      <button
                        type="button"
                        className="cbl-btn cbl-btn--primary cbl-btn--sm"
                        disabled={busyId === row.id}
                        onClick={() => void onConfirm(row.id)}
                      >
                        {isEn ? 'Confirm' : '确认'}
                      </button>
                      <button
                        type="button"
                        className="cbl-btn cbl-btn--light cbl-btn--sm"
                        disabled={busyId === row.id}
                        onClick={() => void onReject(row.id)}
                      >
                        {isEn ? 'Reject' : '驳回'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {compareId && compareText ? (
          <pre className="cbl-settlement-compare">{compareText}</pre>
        ) : null}

        <h3 className="cbl-customer-section-title">
          {isEn ? `Annual ${year} (confirmed months only)` : `${year} 年报（仅已确认月结）`}
        </h3>
        {annual ? (
          <>
            <div className="cbl-expense-summary">
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">{isEn ? 'Collected' : '已收'}</span>
                <strong>{formatMmK(annual.totals.collectedTotal)}</strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">{isEn ? 'Paid truck' : '已付车费'}</span>
                <strong>{formatMmK(annual.totals.transportPaidTotal)}</strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">{isEn ? 'Remitted' : '已汇发站'}</span>
                <strong>{formatMmK(annual.totals.agencyRemittedTotal)}</strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">{isEn ? 'Net' : '结余'}</span>
                <strong>{formatMmK(annual.totals.netBalance)}</strong>
              </div>
              <div className="cbl-expense-summary__item cbl-expense-summary__item--muted">
                <span className="cbl-expense-summary__label">{isEn ? 'Missing months' : '缺月'}</span>
                <strong>{annual.missingCount}</strong>
              </div>
            </div>
            <div className="cbl-year-months">
              {annual.months.map((month) => (
                <span
                  key={month.month}
                  className={`cbl-year-month${month.missing ? ' cbl-year-month--missing' : ''}`}
                >
                  {month.month}
                  {month.missing ? (isEn ? ' missing' : ' 缺') : ''}
                </span>
              ))}
            </div>
            <p className="cbl-card-hint">
              {isEn
                ? 'Annual report sums confirmed monthly closes only. Live ledger is not used to fill missing months.'
                : '年报只加总已确认月结。缺月标红，不拿活账凑全年。'}
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default StationSettlementQueue;

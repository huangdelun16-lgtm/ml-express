import { FC, Fragment, useEffect, useMemo, useState } from 'react';
import DualMoney, { formatMmK } from './DualMoney';
import { formatCnyAmount } from '../utils/crossBorderFx';
import {
  fetchExportCostRecords,
  saveAdminExportCost,
  type ExportCostRecord,
  type FinancePeriodParams,
  type InventoryTransitStore,
  type PendingExportBoard,
  type PendingExportLine,
} from '../services/inventoryConsoleService';

type Props = {
  isEn: boolean;
  period: FinancePeriodParams;
  stores: InventoryTransitStore[];
  rate: number | null;
  onTotal?: (totalCny: number | null) => void;
};

function exportCostMoney(row: ExportCostRecord) {
  const mmkSettle = String(row.pay_currency || '').toUpperCase() === 'MMK';
  const cny = mmkSettle ? 0 : Number(row.total_cny) || 0;
  const mmk = mmkSettle ? Math.round(Number(row.total_mmk) || 0) : 0;
  return <DualMoney cny={cny} mmk={mmk} rate={null} prefix={cny > 0 || mmk > 0 ? '−' : ''} />;
}

function exportCostBarAmount(value: number, kind: 'cny' | 'mmk'): string {
  const text = kind === 'cny' ? formatCnyAmount(value) : formatMmK(value);
  return value > 0 ? `−${text}` : text;
}

function money(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function legLabel(code: string): string {
  const dest = String(code || '').trim().toUpperCase();
  if (dest === 'RUI' || dest === 'RUILI') return '瑞丽';
  if (dest === 'MSE' || dest === 'MUSE') return '木姐';
  if (dest === 'LSO') return '腊戌';
  return dest || '—';
}

function kindLabel(kind: string, isEn: boolean): string {
  if (kind === 'package') return isEn ? 'Multiple inbound' : '多个入库';
  if (kind === 'single') return isEn ? 'Single inbound' : '单个入库';
  return kind || '—';
}

function friendlyExportCostError(message: string, isEn: boolean): string {
  if (message === 'MISSING_EXPORT_COST_API') {
    return isEn
      ? 'Export cost records are not published yet. They will show here after the admin site is deployed.'
      : '出口成本记录还没发布到线上。部署后台之后，库存 App 里添加过的订单会显示在这里。';
  }
  if (/socket|tls|econn|timeout|fetch failed|disconnected|网络/i.test(message)) {
    return isEn ? 'Could not reach the server. Try again.' : '暂时连不上，请再试一次。';
  }
  return message || (isEn ? 'Could not load export costs' : '出口成本加载失败');
}

function whenLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', { hour12: false });
}

const ExportCostRecordsCard: FC<Props> = ({ isEn, period, stores, rate, onTotal }) => {
  const [rows, setRows] = useState<ExportCostRecord[]>([]);
  const [pending, setPending] = useState<PendingExportBoard | null>(null);
  const [pendingNote, setPendingNote] = useState('');
  const [totalCny, setTotalCny] = useState(0);
  const [totalMmk, setTotalMmk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const [openKey, setOpenKey] = useState('');
  const [leg, setLeg] = useState<'MSE' | 'LSO' | ''>('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'CNY' | 'MMK' | ''>('');
  const [fx, setFx] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [formError, setFormError] = useState('');
  const storeName = useMemo(() => {
    const map = new Map(
      stores.map((store) => [store.store_code.trim().toUpperCase(), store.store_name]),
    );
    return (code: string) => map.get(code.trim().toUpperCase()) || '';
  }, [stores]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedQuery) {
      setLoading(true);
      setError('');
    } else {
      setSearching(true);
    }
    void fetchExportCostRecords(period, debouncedQuery)
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setPending(result.pending);
        setPendingNote(result.pendingNote);
        setTotalCny(result.totalCny);
        setTotalMmk(result.totalMmk);
        onTotal?.(result.totalCny);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        setRows([]);
        setPending(null);
        setPendingNote('');
        setTotalCny(0);
        setTotalMmk(0);
        onTotal?.(null);
        setError(friendlyExportCostError(message, isEn));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setSearching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period, isEn, onTotal, retryTick, debouncedQuery]);

  const paidWeightKg = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.weight_kg) || 0), 0),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.display_barcode,
        row.customer_name,
        row.final_destination,
        row.leg_destination,
        row.trip_number,
        row.store_code,
        kindLabel(row.subject_kind, false),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [query, rows]);

  const pendingRows = useMemo(() => {
    if (!pending) return [];
    const q = query.trim().toLowerCase();
    const lines: Array<PendingExportLine & { kind: 'single' | 'package'; key: string }> = [
      ...pending.singles.map((row) => ({ ...row, kind: 'single' as const, key: `s:${row.id || row.barcode}` })),
      ...pending.packages.map((row) => ({ ...row, kind: 'package' as const, key: `p:${row.base}` })),
    ];
    if (!q) return lines;
    return lines.filter((row) =>
      [row.barcode, row.base, row.customer, row.destination, row.tripNumber]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [pending, query]);

  return (
    <section className="cbl-card cbl-export-cost">
      <div className="cbl-card__head">
        <div className="cbl-export-cost__heading">
          <h2 className="cbl-card__title">{isEn ? 'Export cost' : '出口成本'}</h2>
          <p className="cbl-card-hint cbl-card-hint--in-head">
            {isEn
              ? 'Fill missing costs in the Inventory App. Saved rows stay here and cannot be edited.'
              : '还没填的单在上面。库存 App 填好之后，会出现在下面已保存的记录里，添加之后不能改。'}
          </p>
        </div>
        <input
          className="cbl-export-cost__search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isEn ? 'Search barcode, customer, trip' : '搜单号、客户、车次'}
          aria-label={isEn ? 'Search export costs' : '搜索出口成本'}
        />
      </div>
      <div className="cbl-card__body">
        <div className="cbl-export-pending">
          <div className="cbl-export-pending__head">
            <h3 className="cbl-export-pending__title">{isEn ? 'Still to fill' : '待填出口成本'}</h3>
            <span className="cbl-dim">
              {pending
                ? isEn
                  ? `${pending.singleCount} orders · ${pending.packageCount} packs`
                  : `单个 ${pending.singleCount} · 包裹 ${pending.packageCount}`
                : pendingNote
                  ? pendingNote
                  : isEn
                    ? 'The unfilled list did not load.'
                    : '待填清单没有加载出来。'}
            </span>
          </div>
          {pending && pendingRows.length > 0 ? (
            <div className="cbl-table-wrap">
              <table className="cbl-table cbl-table--expense">
                <thead>
                  <tr>
                    <th>{isEn ? 'Type' : '类型'}</th>
                    <th>{isEn ? 'Order' : '单号'}</th>
                    <th>{isEn ? 'Customer' : '客户'}</th>
                    <th>{isEn ? 'Destination' : '目的地'}</th>
                    <th>{isEn ? 'Weight' : '重量'}</th>
                    <th>{isEn ? 'Trip' : '车次'}</th>
                    <th>{isEn ? 'Fill' : '填写'}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((row) => {
                    const missingWeight = !(Number(row.weightKg) > 0);
                    const subjectKey = row.kind === 'package' ? row.base || '' : row.id || '';
                    const open = openKey === row.key;
                    return (
                      <Fragment key={row.key}>
                        <tr>
                          <td>{kindLabel(row.kind, isEn)}</td>
                          <td className="cbl-code">{row.kind === 'package' ? row.base : row.barcode || '—'}</td>
                          <td>{row.customer || '—'}</td>
                          <td>{row.destination || '—'}</td>
                          <td>
                            {money(row.weightKg)} Kg
                            {row.kind === 'package' && row.pieceCount ? (
                              <span className="cbl-dim"> · {row.pieceCount}</span>
                            ) : null}
                          </td>
                          <td>{row.tripNumber?.trim() || '—'}</td>
                          <td>
                            {missingWeight ? (
                              <span className="cbl-dim">{isEn ? 'No weight' : '缺重量'}</span>
                            ) : (
                              <button
                                type="button"
                                className="cbl-btn cbl-btn--primary cbl-btn--sm"
                                onClick={() => {
                                  setFormError('');
                                  if (open) {
                                    setOpenKey('');
                                    return;
                                  }
                                  setOpenKey(row.key);
                                  setLeg('');
                                  setPrice('');
                                  setCurrency('');
                                  setFx(rate && rate > 0 ? String(rate) : '');
                                }}
                              >
                                {open ? (isEn ? 'Close' : '收起') : (isEn ? 'Fill' : '填写')}
                              </button>
                            )}
                          </td>
                        </tr>
                        {open ? (
                          <tr>
                            <td colSpan={7}>
                              <div className="cbl-export-fill">
                                <label>
                                  {isEn ? 'Leg' : '运达'}
                                  <select value={leg} onChange={(event) => setLeg(event.target.value as 'MSE' | 'LSO' | '')}>
                                    <option value="">{isEn ? 'Choose' : '请选择'}</option>
                                    <option value="MSE">{isEn ? 'Muse' : '木姐'}</option>
                                    <option value="LSO">{isEn ? 'Lashio' : '腊戌'}</option>
                                  </select>
                                </label>
                                <label>
                                  {isEn ? 'CNY / Kg' : '¥/Kg'}
                                  <input value={price} inputMode="decimal" onChange={(event) => setPrice(event.target.value)} />
                                </label>
                                <label>
                                  {isEn ? 'Pay in' : '实付'}
                                  <select value={currency} onChange={(event) => setCurrency(event.target.value as 'CNY' | 'MMK' | '')}>
                                    <option value="">{isEn ? 'Choose' : '请选择'}</option>
                                    <option value="CNY">{isEn ? 'CNY' : '人民币'}</option>
                                    <option value="MMK">{isEn ? 'MMK' : '缅币'}</option>
                                  </select>
                                </label>
                                {currency === 'MMK' ? (
                                  <label>
                                    {isEn ? 'MMK per CNY' : '汇率'}
                                    <input value={fx} inputMode="decimal" onChange={(event) => setFx(event.target.value)} />
                                  </label>
                                ) : null}
                                <button
                                  type="button"
                                  className="cbl-btn cbl-btn--primary cbl-btn--sm"
                                  disabled={savingKey === row.key}
                                  onClick={() => {
                                    if (!leg || !currency || savingKey) return;
                                    setSavingKey(row.key);
                                    setFormError('');
                                    void saveAdminExportCost({
                                      subjectKind: row.kind,
                                      subjectKey,
                                      displayBarcode: row.kind === 'package' ? row.base || '' : row.barcode || '',
                                      customerName: row.customer,
                                      finalDestination: row.destination,
                                      legDestination: leg,
                                      weightKg: Number(row.weightKg),
                                      unitPriceCny: Number(price),
                                      payCurrency: currency,
                                      mmkPerCny: currency === 'MMK' ? Number(fx) : null,
                                      tripNumber: row.tripNumber,
                                      storeCode: row.ownerStoreCode,
                                    })
                                      .then(() => {
                                        setOpenKey('');
                                        setRetryTick((n) => n + 1);
                                      })
                                      .catch((err: unknown) => {
                                        setFormError(err instanceof Error ? err.message : (isEn ? 'Save failed' : '保存失败'));
                                      })
                                      .finally(() => setSavingKey(''));
                                  }}
                                >
                                  {savingKey === row.key ? (isEn ? 'Saving…' : '保存中…') : (isEn ? 'Save' : '保存')}
                                </button>
                                {formError && open ? <span className="cbl-export-fill__error">{formError}</span> : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : pending ? (
            <p className="cbl-export-cost__empty">
              {query.trim() && (searching || query.trim() !== debouncedQuery)
                ? isEn
                  ? 'Searching stocked orders…'
                  : '正在已入库的订单里查找…'
                : query.trim()
                  ? isEn
                    ? 'No matching orders still need a cost.'
                    : '没有符合搜索的待填订单。'
                  : isEn
                    ? 'Every stocked order already has an export cost.'
                    : '已入库的订单和包裹都填过出口成本了。'}
            </p>
          ) : null}
          {pending?.truncated ? (
            <p className="cbl-dim">
              {isEn
                ? 'Only the first 400 of each list are shown.'
                : '单个和包裹各自只列出前 400 条。'}
            </p>
          ) : null}
        </div>
        <div className="cbl-export-cost__stats">
          <div className="cbl-export-cost__stat">
            <span className="cbl-export-cost__label">{isEn ? 'Orders' : '单数'}</span>
            <strong className="cbl-export-cost__figure">{loading ? '—' : rows.length}</strong>
          </div>
          <div className="cbl-export-cost__stat">
            <span className="cbl-export-cost__label">
              {isEn ? 'Weight' : '重量'}
              <span className="cbl-export-cost__ccy">Kg</span>
            </span>
            <strong className="cbl-export-cost__figure">{loading ? '—' : money(paidWeightKg)}</strong>
          </div>
          <div className="cbl-export-cost__stat">
            <span className="cbl-export-cost__label">
              {isEn ? 'CNY' : '人民币'}
              {isEn ? null : <span className="cbl-export-cost__ccy">CNY</span>}
            </span>
            <strong className="cbl-export-cost__figure">{loading ? '—' : exportCostBarAmount(totalCny, 'cny')}</strong>
          </div>
          <div className="cbl-export-cost__stat">
            <span className="cbl-export-cost__label">
              {isEn ? 'MMK' : '缅币'}
              {isEn ? null : <span className="cbl-export-cost__ccy">MMK</span>}
            </span>
            <strong className="cbl-export-cost__figure">{loading ? '—' : exportCostBarAmount(totalMmk, 'mmk')}</strong>
          </div>
        </div>
        {loading ? (
          <div className="cbl-export-cost__empty">{isEn ? 'Loading…' : '加载中…'}</div>
        ) : error ? (
          <div className="cbl-export-cost__empty">
            <p>{error}</p>
            <button type="button" className="cbl-btn cbl-btn--ghost cbl-btn--sm" onClick={() => setRetryTick((n) => n + 1)}>
              {isEn ? 'Try again' : '再试一次'}
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="cbl-export-cost__empty">
            {isEn ? 'No export cost has been added in this period.' : '这个时段还没有添加过出口成本。'}
          </div>
        ) : (
          <div className="cbl-table-wrap">
            <table className="cbl-table cbl-table--expense">
              <thead>
                <tr>
                  <th>{isEn ? 'Time' : '时间'}</th>
                  <th>{isEn ? 'Type' : '类型'}</th>
                  <th>{isEn ? 'Order' : '单号'}</th>
                  <th>{isEn ? 'Customer' : '客户'}</th>
                  <th>{isEn ? 'Route' : '路线'}</th>
                  <th>{isEn ? 'Weight' : '重量'}</th>
                  <th>{isEn ? 'Price / Kg' : '单价'}</th>
                  <th>{isEn ? 'Total' : '合计'}</th>
                  <th>{isEn ? 'Trip' : '车次'}</th>
                  <th>{isEn ? 'Station' : '站点'}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const station = storeName(row.store_code);
                  return (
                    <tr key={row.id}>
                      <td className="cbl-dim">{whenLabel(row.created_at)}</td>
                      <td>{kindLabel(row.subject_kind, isEn)}</td>
                      <td className="cbl-code">{row.display_barcode || '—'}</td>
                      <td>{row.customer_name || '—'}</td>
                      <td>
                        {legLabel(row.leg_origin || 'RUI')} → {legLabel(row.leg_destination)}
                        {row.final_destination ? (
                          <span className="cbl-dim"> · {row.final_destination}</span>
                        ) : null}
                      </td>
                      <td>{money(row.weight_kg)} Kg</td>
                      <td>¥{money(row.unit_price_cny)}</td>
                      <td className="cbl-finance-cell cbl-finance-cell--out">
                        {exportCostMoney(row)}
                      </td>
                      <td>{row.trip_number?.trim() || '—'}</td>
                      <td>
                        <span className="cbl-code">{row.store_code || '—'}</span>
                        {station ? <span className="cbl-dim"> · {station}</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default ExportCostRecordsCard;

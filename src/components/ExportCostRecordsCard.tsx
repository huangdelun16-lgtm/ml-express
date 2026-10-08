import { FC, useEffect, useMemo, useState } from 'react';
import {
  fetchExportCostRecords,
  type ExportCostRecord,
  type FinancePeriodParams,
  type InventoryTransitStore,
} from '../services/inventoryConsoleService';

type Props = {
  isEn: boolean;
  period: FinancePeriodParams;
  stores: InventoryTransitStore[];
  onTotal?: (totalCny: number | null) => void;
};

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

const ExportCostRecordsCard: FC<Props> = ({ isEn, period, stores, onTotal }) => {
  const [rows, setRows] = useState<ExportCostRecord[]>([]);
  const [totalCny, setTotalCny] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const storeName = useMemo(() => {
    const map = new Map(
      stores.map((store) => [store.store_code.trim().toUpperCase(), store.store_name]),
    );
    return (code: string) => map.get(code.trim().toUpperCase()) || '';
  }, [stores]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void fetchExportCostRecords(period)
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setTotalCny(result.totalCny);
        onTotal?.(result.totalCny);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        setRows([]);
        setTotalCny(0);
        onTotal?.(null);
        setError(friendlyExportCostError(message, isEn));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, isEn, onTotal, retryTick]);

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

  return (
    <section className="cbl-card cbl-export-cost">
      <div className="cbl-card__head">
        <div className="cbl-export-cost__heading">
          <h2 className="cbl-card__title">{isEn ? 'Export cost' : '出口成本'}</h2>
          <p className="cbl-card-hint cbl-card-hint--in-head">
            {isEn
              ? 'Orders added in Inventory App. Yuan per kilogram. A row cannot be changed after it is added.'
              : '库存 App 里添加过的订单。单价是每公斤人民币，添加之后不能改。'}
          </p>
        </div>
      </div>
      <div className="cbl-card__body">
        <div className="cbl-export-cost__bar">
          <div className="cbl-export-cost__stat">
            <span>{isEn ? 'Orders' : '单数'}</span>
            <strong>{loading ? '—' : rows.length}</strong>
          </div>
          <div className="cbl-export-cost__stat cbl-export-cost__stat--total">
            <span>{isEn ? 'Total' : '合计'}</span>
            <strong>¥{loading ? '—' : money(totalCny)}</strong>
          </div>
          <input
            className="cbl-export-cost__search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isEn ? 'Search barcode, customer, trip' : '搜单号、客户、车次'}
            aria-label={isEn ? 'Search export costs' : '搜索出口成本'}
          />
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
                      <td className="cbl-finance-cell cbl-finance-cell--out">¥{money(row.total_cny)}</td>
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

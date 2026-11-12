import React, { useEffect, useState } from 'react';
import CblTablePagination from './CblTablePagination';
import { volumetricWeightFromSpec } from '../utils/volumetricWeight';
import {
  fetchExpressDetail,
  fetchExpressDetails,
  type ExpressDetailRow,
} from '../services/inventoryConsoleService';

type Props = { isEn: boolean };

const STATUS_LABEL: Record<string, [string, string]> = {
  signed: ['已签收', 'Signed'],
  transferred: ['已中转', 'Transferred'],
  arrived: ['已到站', 'Arrived'],
  packed: ['已打包', 'Packed'],
  inbound: ['已入库', 'Inbound'],
  pending: ['未入库', 'Not inbound'],
};

function statusLabel(status: string, isEn: boolean): string {
  const pair = STATUS_LABEL[status];
  if (!pair) return status || '—';
  return isEn ? pair[1] : pair[0];
}

function statusClass(status: string): string {
  if (status === 'signed' || status === 'inbound') return 'cbl-badge cbl-badge--green';
  if (status === 'arrived' || status === 'transferred') return 'cbl-badge cbl-badge--blue';
  if (status === 'packed') return 'cbl-badge cbl-badge--amber';
  return 'cbl-badge cbl-badge--gray';
}

function exceptionLabel(status: string, isEn: boolean): string {
  if (status === 'open') return isEn ? 'Open exception' : '异常';
  if (status === 'resolved') return isEn ? 'Exception closed' : '异常已处理';
  return '';
}

function formatWhen(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function textLines(value?: string): string[] {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function tidyNotePart(part: string): string {
  const dated = part.match(/[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4}[^·]*/);
  if (!dated) return part;
  const parsed = new Date(dated[0]);
  if (Number.isNaN(parsed.getTime())) return part;
  return part.replace(dated[0], formatWhen(parsed.toISOString())).replace(/\s+/g, ' ').trim();
}

function noteParts(value?: string): string[] {
  return String(value || '')
    .split(/\s*·\s*/)
    .map((part) => tidyNotePart(part.trim()))
    .filter(Boolean);
}

function DetailGrid({ row, isEn }: { row: ExpressDetailRow; isEn: boolean }) {
  const volumetric = volumetricWeightFromSpec(row.spec);
  const expressLines = textLines(row.expressBarcode);
  const inboundLines = textLines(row.inboundBarcode);
  const lineCount = Math.max(expressLines.length, inboundLines.length, 1);
  const productLines = textLines(row.productName);
  const productIsExpress =
    productLines.length > 0 && productLines.every((name) => expressLines.includes(name));
  const unit = String(row.unit || '').trim();
  const unitIsPieceCount = /^\d+(\.\d+)?\s*pcs$/i.test(unit);
  const facts: Array<[string, string]> = [
    [isEn ? 'Address' : '地址', row.address || ''],
    [isEn ? 'Goods' : '品名', productIsExpress ? '' : row.productName || ''],
    [isEn ? 'Pack' : '包装号', row.packBarcode || ''],
    [isEn ? 'Spec' : '规格', row.spec || ''],
    [isEn ? 'Unit' : '单位', unitIsPieceCount ? '' : unit],
    [isEn ? 'Actual weight' : '重量', row.weight || ''],
    [isEn ? 'Volumetric weight' : '体积重量', volumetric ? `${volumetric.kg} Kg · ${volumetric.formula}` : ''],
    [isEn ? 'Packaging' : '包装', row.packaging || ''],
    [isEn ? 'Station' : '入库站', row.inboundStore || row.ownerStoreCode || ''],
    [isEn ? 'Inbound time' : '入库时间', row.inboundAt ? formatWhen(row.inboundAt) : ''],
    [isEn ? 'Arrived' : '到站时间', row.arrivedAt ? formatWhen(row.arrivedAt) : ''],
    [isEn ? 'Signed' : '签收时间', row.signedAt ? formatWhen(row.signedAt) : ''],
    [isEn ? 'Exception' : '异常', exceptionLabel(row.exceptionStatus, isEn)],
  ].filter((entry): entry is [string, string] => Boolean(entry[1] && entry[1] !== '—'));
  const notes = noteParts(row.inboundNote || row.note);

  return (
    <div className="cbl-express-sheet">
      <div className="cbl-express-sheet__who">
        <div>
          <div className="cbl-express-sheet__name">{row.customerName || '—'}</div>
          <div className="cbl-express-sheet__meta">
            {[row.phone, row.destination].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
        <div className="cbl-express-sheet__badges">
          <span className={statusClass(row.status)}>{statusLabel(row.status, isEn)}</span>
          <span className="cbl-badge cbl-badge--gray">
            {row.packed ? (isEn ? 'Packed' : '已打包') : isEn ? 'Not packed' : '未打包'}
          </span>
          {row.qty > 0 ? (
            <span className="cbl-badge cbl-badge--gray">{isEn ? `${row.qty} pcs` : `${row.qty} 件`}</span>
          ) : null}
        </div>
      </div>

      <table className="cbl-express-lines">
        <thead>
          <tr>
            <th>{isEn ? 'Express no.' : '快递单'}</th>
            <th>{isEn ? 'Inbound barcode' : '入库条码'}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: lineCount }, (_, index) => (
            <tr key={`${expressLines[index] || ''}-${inboundLines[index] || index}`}>
              <td>{expressLines[index] || '—'}</td>
              <td>{inboundLines[index] || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {facts.length ? (
        <dl className="cbl-express-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {notes.length ? (
        <div className="cbl-express-note">
          <div className="cbl-express-note__label">{isEn ? 'Note' : '备注'}</div>
          <ul>
            {notes.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {row.exceptions && row.exceptions.length > 0 ? (
        <div className="cbl-express-exceptions">
          <h3>{isEn ? 'Exceptions' : '异常记录'}</h3>
          <ul>
            {row.exceptions.map((item) => (
              <li key={item.id}>
                <strong>{item.status === 'open' ? (isEn ? 'Open' : '未处理') : isEn ? 'Closed' : '已处理'}</strong>
                {' · '}
                {item.type || '—'}
                {item.note ? ` · ${item.note}` : ''}
                {' · '}
                {formatWhen(item.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function ExpressDetailsPanel({ isEn }: Props) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<ExpressDetailRow[]>([]);
  const [total, setTotal] = useState(-1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<ExpressDetailRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void fetchExpressDetails({ page, pageSize, q: query })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setItems([]);
        setTotal(-1);
        setHasMore(false);
        setError(err instanceof Error ? err.message : isEn ? 'Failed to load' : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, query, isEn]);

  const openDetail = (id: string) => {
    setDetailLoading(true);
    setDetailError('');
    setDetail(null);
    void fetchExpressDetail(id)
      .then(setDetail)
      .catch((err: unknown) => {
        setDetailError(err instanceof Error ? err.message : isEn ? 'Failed to load' : '加载失败');
      })
      .finally(() => setDetailLoading(false));
  };

  return (
    <section className="cbl-card">
      <div className="cbl-card__head">
        <h2 className="cbl-card__title">{isEn ? 'Express details' : '快递明细'}</h2>
      </div>
      <div className="cbl-card__body">
        <p className="cbl-card-hint">
          {isEn
            ? 'All inbound orders, same list as Inventory App. Open a row for the full detail. Packing stays in the app.'
            : '这里是全部入库订单，和 Inventory App 的快递明细一样。点「查看」看这一单的详细内容。打包仍在 App 里做。'}
        </p>
        <div className="cbl-express-search">
          <input
            className="cbl-search__input cbl-search__input--light"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={isEn ? 'Search customer, express no., barcode, destination or pack' : '搜索客户、快递单、入库条码、目的地或包装号'}
          />
        </div>
        {error ? <div className="cbl-alert cbl-alert--error">{error}</div> : null}
        {loading && !items.length ? (
          <div className="cbl-empty">{isEn ? 'Loading…' : '正在加载快递明细…'}</div>
        ) : items.length ? (
          <>
            <div className={`cbl-table-wrap${loading ? ' is-loading' : ''}`}>
              <table className="cbl-table cbl-table--express">
                <thead>
                  <tr>
                    <th>{isEn ? 'Customer' : '客户'}</th>
                    <th>{isEn ? 'Destination' : '目的地'}</th>
                    <th>{isEn ? 'Express no.' : '快递单'}</th>
                    <th>{isEn ? 'Inbound barcode' : '入库条码'}</th>
                    <th>{isEn ? 'Weight' : '重量'}</th>
                    <th>{isEn ? 'Pieces' : '件数'}</th>
                    <th>{isEn ? 'Status' : '状态'}</th>
                    <th>{isEn ? 'Pack' : '包装号'}</th>
                    <th>{isEn ? 'Exception' : '异常'}</th>
                    <th>{isEn ? 'Detail' : '详情'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className={row.exceptionStatus === 'open' ? 'is-exception' : undefined}>
                      <td>{row.customerName || '—'}</td>
                      <td>{row.destination || '—'}</td>
                      <td className="cbl-order-id cbl-cell-lines">{row.expressBarcode || '—'}</td>
                      <td className="cbl-order-id cbl-cell-lines">{row.inboundBarcode || '—'}</td>
                      <td>{row.weight || '—'}</td>
                      <td>{row.qty > 0 ? row.qty : '—'}</td>
                      <td>
                        <span className={statusClass(row.status)}>{statusLabel(row.status, isEn)}</span>
                        {row.status === 'packed' ? null : (
                          <div className="cbl-order-sub">{row.packed ? (isEn ? 'Packed' : '已打包') : isEn ? 'Not packed' : '未打包'}</div>
                        )}
                      </td>
                      <td>{row.packBarcode || '—'}</td>
                      <td>
                        {row.exceptionStatus ? (
                          <span className={row.exceptionStatus === 'open' ? 'cbl-badge cbl-badge--amber' : 'cbl-badge cbl-badge--gray'}>
                            {exceptionLabel(row.exceptionStatus, isEn)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <button type="button" className="cbl-btn cbl-btn--light cbl-btn--sm" onClick={() => openDetail(row.id)}>
                          {isEn ? 'View' : '查看'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CblTablePagination
              page={page}
              pageSize={pageSize}
              totalItems={total}
              hasMore={hasMore}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              isEn={isEn}
            />
          </>
        ) : (
          <div className="cbl-empty">{isEn ? 'No orders.' : '没有订单。'}</div>
        )}
      </div>

      {detail || detailLoading || detailError ? (
        <div className="store-form-overlay cbl-create-overlay" role="presentation" onClick={() => setDetail(null)}>
          <div
            className="cbl-pricing-modal cbl-express-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cbl-pricing-modal__head">
              <div>
                <h2 className="cbl-pricing-modal__title">{isEn ? 'Order detail' : '订单详情'}</h2>
                <p className="cbl-pricing-modal__sub cbl-cell-lines">{detail?.packBarcode || detail?.inboundBarcode || detail?.expressBarcode || ''}</p>
              </div>
              <button type="button" className="cbl-pricing-modal__close" onClick={() => setDetail(null)} aria-label={isEn ? 'Close' : '关闭'}>
                ✕
              </button>
            </header>
            <div className="cbl-pack-orders-modal__body">
              {detailLoading ? <div className="cbl-empty">{isEn ? 'Loading…' : '正在加载…'}</div> : null}
              {detailError ? <div className="cbl-alert cbl-alert--error">{detailError}</div> : null}
              {detail ? <DetailGrid row={detail} isEn={isEn} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

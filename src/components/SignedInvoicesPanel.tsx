import { FC, useEffect, useRef, useState } from 'react';
import CblTablePagination from './CblTablePagination';
import {
  fetchSignedInvoices,
  type SignedInvoiceListRow,
  type SignedInvoiceYearCount,
} from '../services/inventoryConsoleService';
import { saveElementAsPng } from '../utils/saveElementAsPng';
import { yangonYmdFromUtc } from '../utils/yangonFinancePeriod';

type Props = {
  isEn: boolean;
};

function amountLabel(row: SignedInvoiceListRow): string {
  const cny = Number(row.total_fee_cny);
  if (Number.isFinite(cny) && cny > 0) {
    return `¥${cny.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  const mmk = Number(row.total_fee_mmk);
  if (Number.isFinite(mmk) && mmk > 0) return `${Math.round(mmk).toLocaleString('en-US')} MMK`;
  return '—';
}

const SignedInvoicesPanel: FC<Props> = ({ isEn }) => {
  const [rows, setRows] = useState<SignedInvoiceListRow[]>([]);
  const [years, setYears] = useState<SignedInvoiceYearCount[]>([]);
  const [year, setYear] = useState(() => yangonYmdFromUtc().y);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState<SignedInvoiceListRow | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim();
      setDebouncedQuery((current) => (current === next ? current : next));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void fetchSignedInvoices({
      year,
      q: debouncedQuery,
      page,
      pageSize,
    })
      .then((result) => {
        if (cancelled) return;
        setRows(result.invoices);
        setTotal(result.total);
        setYears(result.years);
        setSearching(result.searching);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        setError(
          message === 'MISSING_INVOICE_API'
            ? isEn
              ? 'The invoice list is not published yet. It will show here after the admin site is deployed.'
              : '发票列表还没发布到线上。部署后台之后，签收定档的发票会显示在这里。'
            : message || (isEn ? 'Could not load invoices' : '发票列表加载失败'),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isEn, page, pageSize, year]);

  return (
    <section className="cbl-card">
      <div className="cbl-card__head">
        <h2 className="cbl-card__title">{isEn ? 'Signed invoices' : '已签收发票'}</h2>
      </div>
      <div className="cbl-card__body">
        <p className="cbl-card-hint">
          {isEn
            ? 'Each row is the invoice frozen when Inventory App finished signing. Invoices are kept by Yangon year. Search looks through every year.'
            : '每一行是 Inventory App 签收成功时定死的那张发票。按仰光年收藏，这一年的发票可以翻页看完。搜索会找全部年份。'}
        </p>
        <div className="cbl-chip-row cbl-invoice-years" role="tablist" aria-label={isEn ? 'Invoice years' : '发票年份'}>
          {(years.length ? years : [{ year, count: 0 }]).map((item) => (
            <button
              key={item.year}
              type="button"
              role="tab"
              className={`cbl-chip${!searching && item.year === year ? ' is-active' : ''}`}
              aria-selected={!searching && item.year === year}
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
                setYear(item.year);
                setPage(1);
              }}
            >
              {item.year}
              <span className="cbl-chip__count">{item.count}</span>
            </button>
          ))}
        </div>
        <input
          className="cbl-invoice-archive-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isEn ? 'Search all years: invoice, customer, phone, trip' : '搜索全部年份：发票号、客户、电话或车次'}
          aria-label={isEn ? 'Find an invoice' : '找发票'}
        />
        {searching ? (
          <p className="cbl-card-hint">
            {isEn ? 'Searching every year.' : '正在全部年份里搜索。'}
          </p>
        ) : null}
        {loading ? <p className="cbl-card-hint">{isEn ? 'Loading…' : '加载中…'}</p> : null}
        {error ? <p className="cbl-card-hint">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="cbl-card-hint">
            {searching
              ? isEn
                ? 'No invoice matches.'
                : '没有符合的发票。'
              : isEn
                ? `No signed invoice in ${year}.`
                : `${year} 年还没有签收发票。`}
          </p>
        ) : null}
        {rows.length > 0 ? (
          <div className="cbl-table-wrap">
            <table className="cbl-table">
              <thead>
                <tr>
                  <th>{isEn ? 'Invoice no.' : '发票号'}</th>
                  <th>{isEn ? 'Customer' : '客户'}</th>
                  <th>{isEn ? 'Trip' : '车次'}</th>
                  <th>{isEn ? 'Date' : '日期'}</th>
                  <th>{isEn ? 'Amount' : '金额'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="cbl-btn cbl-btn--ghost cbl-btn--small" data-cbl-tip={isEn ? 'Open this invoice' : '查看这张发票'} onClick={() => setOpen(row)}>
                        {row.invoice_no}
                      </button>
                    </td>
                    <td>{row.customer_name || '—'}</td>
                    <td>{row.trip_label || '—'}</td>
                    <td>{row.issued_on || '—'}</td>
                    <td>{amountLabel(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!error && total > 0 ? (
          <CblTablePagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            isEn={isEn}
          />
        ) : null}
      </div>
      {open ? <FrozenInvoiceSheet row={open} isEn={isEn} onClose={() => setOpen(null)} /> : null}
    </section>
  );
};

const FROZEN_TOTAL_LABELS: Array<{ kind: 'weight' | 'quote' | 'rate' | 'extra' | 'fee'; labels: string[] }> = [
  { kind: 'weight', labels: ['总重量', 'Total weight', 'စုစုပေါင်းအလေးချိန်'] },
  { kind: 'quote', labels: ['入库报价', 'Inbound quote', 'စာရင်းသွင်း ဈေး'] },
  { kind: 'rate', labels: ['汇率', 'Rate', 'ငွေလဲ'] },
  { kind: 'extra', labels: ['附加费', 'Extra fee', 'ထပ်ဆောင်းခ'] },
  { kind: 'fee', labels: ['总费用', 'Total fee', 'စုစုပေါင်းခ'] },
];

function splitFrozenTotal(line: string): { kind: 'weight' | 'quote' | 'rate' | 'extra' | 'fee' | 'skip'; label: string; value: string } {
  const text = line.trim();
  if (!text || /KG\s*=/i.test(text)) return { kind: 'skip', label: '', value: '' };
  const labels = FROZEN_TOTAL_LABELS.flatMap((group) =>
    group.labels.map((label) => ({ kind: group.kind, label })),
  ).sort((a, b) => b.label.length - a.label.length);
  const matched = labels.find((item) => text === item.label || text.startsWith(item.label));
  if (!matched) return { kind: 'skip', label: '', value: text };
  return {
    kind: matched.kind,
    label: matched.label,
    value: text.slice(matched.label.length).trim(),
  };
}

function FrozenInvoiceSheet({
  row,
  isEn,
  onClose,
}: {
  row: SignedInvoiceListRow;
  isEn: boolean;
  onClose: () => void;
}) {
  const doc = row.document || {};
  const meta = Array.isArray(doc.meta) ? doc.meta : [];
  const lines = Array.isArray(doc.lines) ? doc.lines : [];
  const totals = Array.isArray(doc.totals) ? doc.totals : [];
  const watermarkTops = [48, 228, 408, 588, 768];
  const paperRef = useRef<HTMLElement>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const savePhoto = () => {
    const node = paperRef.current;
    if (!node || savingPhoto) return;
    setSavingPhoto(true);
    setSaveError(null);
    const safeName = (row.customer_name || 'invoice')
      .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const invoiceNo = String(doc.invoiceNo || row.invoice_no || 'invoice').replace(/[^\w-]+/g, '');
    void saveElementAsPng(node, `MARKET-LINK-${safeName || 'invoice'}-${invoiceNo}.png`)
      .catch(() => {
        setSaveError(isEn ? 'Could not save the photo. Try again.' : '照片没存下来，请再试一次。');
      })
      .finally(() => setSavingPhoto(false));
  };

  return (
    <div className="cbl-unsigned-invoice-overlay" role="presentation" onClick={onClose}>
      <div
        className="cbl-unsigned-invoice-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={row.invoice_no}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cbl-unsigned-invoice-scroll">
          <article ref={paperRef} className="cbl-invoice-paper">
            <div className="cbl-invoice-watermark" aria-hidden="true">
              {watermarkTops.map((top) => (
                <span key={top} style={{ top }}>
                  MARKET LINK
                </span>
              ))}
            </div>
            <div className="cbl-invoice-body">
              <div className="cbl-invoice-brand">
                <div className="cbl-invoice-wordmark">
                  <strong>MARKET LINK</strong>
                  <span>EXPRESS</span>
                </div>
                <div className="cbl-invoice-doc">
                  <span className="cbl-invoice-doc__word">invoice no</span>
                  <strong className="cbl-invoice-doc__no">{doc.invoiceNo || row.invoice_no}</strong>
                </div>
              </div>
              <div className="cbl-invoice-rule" />
              <div className="cbl-invoice-rule cbl-invoice-rule--thin" />
              <dl className="cbl-invoice-meta">
                {meta.map((item) => (
                  <div key={`${item.label}-${item.value}`}>
                    <dt>{item.label}</dt>
                    <dd>{item.value || '—'}</dd>
                  </div>
                ))}
              </dl>
              {lines.map((line, index) => (
                <section key={`${line.title}-${index}`} className="cbl-invoice-orders">
                  <h3>{line.title}</h3>
                  {(line.expressNos.length ? line.expressNos : ['—']).map((no, noIndex) => (
                    <div key={`${no}-${noIndex}`} className="cbl-invoice-order">
                      <span>{String(noIndex + 1).padStart(2, '0')}</span>
                      <div className="cbl-invoice-order__main">
                        <strong>{no || '—'}</strong>
                      </div>
                    </div>
                  ))}
                  {line.measure ? <p className="cbl-invoice-pack-measure">{line.measure}</p> : null}
                </section>
              ))}
              <div className="cbl-invoice-totals">
                {totals.map(splitFrozenTotal).filter((row) => row.kind !== 'skip').map((row, index) => (
                  <div key={`${row.kind}-${index}`} className={row.kind === 'fee' ? 'cbl-invoice-fee' : undefined}>
                    <span>{row.label}</span>
                    <strong>{row.value || '—'}</strong>
                  </div>
                ))}
              </div>
              {doc.payNote ? (
                <div className="cbl-invoice-closeout">
                  <p className="cbl-invoice-note">{doc.payNote}</p>
                  <div className="cbl-invoice-contact">
                    {doc.contactLabel ? <span>{doc.contactLabel}</span> : null}
                    {doc.contactPhones ? (
                      <p>
                        <em>{doc.contactPhoneLabel}</em>
                        <strong>{doc.contactPhones}</strong>
                      </p>
                    ) : null}
                    {doc.contactKpay ? (
                      <p>
                        <em>Kpay：</em>
                        <strong>{doc.contactKpay}</strong>
                      </p>
                    ) : null}
                    {doc.contactSite ? <em className="cbl-invoice-site">{doc.contactSite}</em> : null}
                  </div>
                  <p className="cbl-invoice-footer">MARKET LINK EXPRESS</p>
                </div>
              ) : null}
            </div>
          </article>
        </div>
        <div className="cbl-unsigned-invoice-actions">
          {saveError ? <p className="cbl-invoice-save-error">{saveError}</p> : null}
          <button
            type="button"
            className="cbl-invoice-save"
            onClick={savePhoto}
            disabled={savingPhoto}
          >
            {savingPhoto ? (isEn ? 'Saving…' : '保存中…') : isEn ? 'Save' : '保存'}
          </button>
          <button type="button" className="cbl-invoice-close" onClick={onClose}>
            {isEn ? 'Close' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignedInvoicesPanel;

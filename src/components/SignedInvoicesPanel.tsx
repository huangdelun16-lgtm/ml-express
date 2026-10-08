import { FC, useEffect, useMemo, useState } from 'react';
import {
  fetchSignedInvoices,
  type SignedInvoiceListRow,
} from '../services/inventoryConsoleService';

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

function matches(row: SignedInvoiceListRow, query: string): boolean {
  if (!query) return true;
  const haystack = [row.invoice_no, row.customer_name, row.phone, row.trip_label, row.issued_on]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

const SignedInvoicesPanel: FC<Props> = ({ isEn }) => {
  const [rows, setRows] = useState<SignedInvoiceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<SignedInvoiceListRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void fetchSignedInvoices()
      .then((list) => {
        if (!cancelled) setRows(list);
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
  }, [isEn]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => matches(row, q));
  }, [query, rows]);

  return (
    <section className="cbl-card">
      <div className="cbl-card__head">
        <h2 className="cbl-card__title">{isEn ? 'Signed invoices' : '已签收发票'}</h2>
      </div>
      <div className="cbl-card__body">
        <p className="cbl-card-hint">
          {isEn
            ? 'Each row is the invoice frozen when Inventory App finished signing. The number is the Yangon date plus that day’s sequence.'
            : '每一行是 Inventory App 签收成功时定死的那张发票。发票号是仰光日期加上当天的顺序，例如 20261008-01。'}
        </p>
        <input
          className="cbl-invoice-archive-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isEn ? 'Invoice no., customer, or trip' : '发票号、客户或车次'}
          aria-label={isEn ? 'Find an invoice' : '找发票'}
        />
        {loading ? <p className="cbl-card-hint">{isEn ? 'Loading…' : '加载中…'}</p> : null}
        {error ? <p className="cbl-card-hint">{error}</p> : null}
        {!loading && !error && visible.length === 0 ? (
          <p className="cbl-card-hint">
            {isEn
              ? 'No signed invoice is archived yet.'
              : '还没有签收后定档的发票。'}
          </p>
        ) : null}
        {visible.length > 0 ? (
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
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="cbl-btn cbl-btn--ghost cbl-btn--small" onClick={() => setOpen(row)}>
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
      </div>
      {open ? <FrozenInvoiceSheet row={open} isEn={isEn} onClose={() => setOpen(null)} /> : null}
    </section>
  );
};

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
          <article className="cbl-invoice-paper">
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
                  <span className="cbl-invoice-doc__word">INVOICE</span>
                  <span className="cbl-invoice-doc__label">{isEn ? 'Invoice no.' : '发票号'}</span>
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
                {totals.map((line) => (
                  <div key={line}>
                    <strong>{line}</strong>
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
          <button type="button" className="cbl-btn" onClick={onClose}>
            {isEn ? 'Close' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignedInvoicesPanel;

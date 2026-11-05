import { useEffect, useState, type ReactNode } from 'react';
import type { GoodsCurrency, GoodsParty, GoodsProduct } from '../../services/goodsTradeService';
import { fine, muted } from './styles';

export function useDialogKeys(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

export function Field({ label, extra, children }: { label: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 5, fontSize: 12, color: 'rgba(203,213,225,0.78)', fontWeight: 550 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>{label}{extra}</span>
      {children}
    </label>
  );
}

export function MoneyField({
  label,
  currency,
  amount,
  onCurrency,
  onAmount,
}: {
  label: string;
  currency: GoodsCurrency;
  amount: string;
  onCurrency: (value: GoodsCurrency) => void;
  onAmount: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="gd-money">
        <select className="gd-field" aria-label={`${label} 货币`} value={currency} onChange={(e) => onCurrency(e.target.value === 'RMB' ? 'RMB' : 'MMK')}>
          <option value="MMK">MMK</option>
          <option value="RMB">RMB</option>
        </select>
        <input className="gd-field gd-num" inputMode="numeric" aria-label={`${label} 金额`} value={amount} onChange={(e) => onAmount(e.target.value)} autoComplete="off" />
      </div>
    </Field>
  );
}

export function Dialog({
  title,
  eyebrow,
  wide,
  onClose,
  children,
  footer,
}: {
  title: string;
  eyebrow?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="gd-mask" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={wide ? 'gd-dialog gd-dialog-wide' : 'gd-dialog'} onClick={(e) => e.stopPropagation()}>
        <div className="gd-dialog-head">
          <div>
            {eyebrow ? <div className="gd-kicker">{eyebrow}</div> : null}
            <h3>{title}</h3>
          </div>
          <button type="button" className="gd-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="gd-dialog-body">{children}</div>
        {footer ? <div className="gd-dialog-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function EmptyBlock({ title, body, action, onClick }: { title: string; body: string; action: string; onClick: () => void }) {
  return (
    <div className="gd-empty">
      <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{title}</h3>
      <p style={{ ...muted, margin: '0 auto 16px', maxWidth: 420 }}>{body}</p>
      <button type="button" className="gd-primary" onClick={onClick}>{action}</button>
    </div>
  );
}

export function Metric({ label, value, hint, onClick, tone }: { label: string; value: string; hint: string; onClick: () => void; tone?: 'good' | 'bad' }) {
  return (
    <button type="button" className="gd-metric" onClick={onClick}>
      <span className="gd-metric-label">{label}</span>
      <strong className="gd-num" style={{ fontSize: 22, letterSpacing: '-0.02em', color: tone === 'bad' ? '#fecaca' : tone === 'good' ? '#bbf7d0' : '#f8fafc' }}>{value}</strong>
      <span style={fine}>{hint}</span>
    </button>
  );
}

export function Attention({
  title,
  rows,
  empty,
  action,
  onOpen,
  onRow,
  rowAction,
}: {
  title: string;
  rows: GoodsProduct[];
  empty: string;
  action: string;
  onOpen: () => void;
  onRow: (id: string) => void;
  rowAction: string;
}) {
  return (
    <div className="gd-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
        {rows.length > 0 ? <button type="button" className="gd-link" onClick={onOpen}>{action} · {rows.length}</button> : null}
      </div>
      {rows.length === 0 ? (
        <p style={{ ...muted, marginBottom: 0 }}>{empty}</p>
      ) : (
        <div className="gd-table-wrap" style={{ marginTop: 10 }}>
          {rows.slice(0, 6).map((row) => (
            <div key={row.id} className="gd-line" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 13 }}>{row.name}</strong>
                <div style={fine}>{[row.brand, row.spec].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              <button type="button" className="gd-link" onClick={() => onRow(row.id)}>{rowAction}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PartyCard({
  title,
  hint,
  addLabel,
  editLabel,
  deleteLabel,
  searchLabel,
  rows,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  hint: string;
  addLabel: string;
  editLabel: string;
  deleteLabel: string;
  searchLabel: string;
  rows: GoodsParty[];
  onAdd: () => void;
  onEdit: (party: GoodsParty) => void;
  onDelete: (party: GoodsParty) => void;
}) {
  const [q, setQ] = useState('');
  const shown = rows.filter((row) => `${row.name} ${row.phone} ${row.note}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="gd-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
          <div style={{ ...fine, marginTop: 2 }}>{rows.length}</div>
        </div>
        <button type="button" className="gd-primary" onClick={onAdd}>{addLabel}</button>
      </div>
      <p style={{ ...muted, margin: '10px 0 12px' }}>{hint}</p>
      <input className="gd-field" placeholder={searchLabel} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" aria-label={title} />
      {shown.length === 0 ? (
        <p style={{ ...muted, marginTop: 14, marginBottom: 0 }}>—</p>
      ) : (
        <div className="gd-table-wrap" style={{ marginTop: 12 }}>
          {shown.map((row) => (
            <div key={row.id} className="gd-line" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 13 }}>{row.name}</strong>
                <div style={fine}>{[row.phone, row.note].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                <button type="button" className="gd-link" onClick={() => onEdit(row)}>{editLabel}</button>
                <button type="button" className="gd-link gd-link-danger" onClick={() => onDelete(row)}>{deleteLabel}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

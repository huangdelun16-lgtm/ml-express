import type { GoodsMovement, GoodsSnapshot } from '../../services/goodsTradeService';
import { formatGoodsMoney } from '../../services/goodsTradeService';
import type { Copy } from './helpers';
import { mmk } from './helpers';
import { fine, muted, sectionTitle } from './styles';

export function Ledger({
  t,
  title,
  hint,
  rows,
  data,
  nameOf,
  compact = false,
}: {
  t: Copy;
  title: string;
  hint: string;
  rows: GoodsMovement[];
  data: GoodsSnapshot;
  nameOf: (id: string | null, list: { id: string; name: string }[]) => string;
  compact?: boolean;
}) {
  const label = (row: GoodsMovement) => {
    if (row.kind === 'purchase') return t('进货', 'Purchase', 'ဝယ်');
    if (row.kind === 'consign') return t('代卖', 'Sent', 'ပို့');
    if (row.kind === 'recall') return t('收回', 'Back', 'ပြန်');
    return row.supplier_id ? t('代卖售出', 'Supplier sale', 'ပေးသွင်းသူရောင်း') : t('销售', 'Sale', 'ရောင်း');
  };
  const party = (row: GoodsMovement) => {
    if (row.customer_id) return nameOf(row.customer_id, data.customers);
    if (row.supplier_id) return nameOf(row.supplier_id, data.suppliers);
    return '—';
  };
  const shortHint = hint.includes('。') ? `${hint.split('。')[0]}。` : hint;
  return (
    <div className={compact ? 'gd-ledger-compact' : undefined} style={{ marginTop: compact ? 0 : 24 }}>
      <h3 style={{ ...sectionTitle, marginBottom: compact ? 2 : 4 }}>{title}</h3>
      {compact ? (
        <p style={{ ...fine, marginTop: 0, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortHint}</p>
      ) : (
        <p style={{ ...muted, marginTop: 0, marginBottom: 12 }}>{hint}</p>
      )}
      {rows.length === 0 ? (
        <div className="gd-card-soft"><p style={{ ...muted, margin: 0 }}>{t('还没有记录。', 'Nothing yet.', 'မှတ်တမ်းမရှိသေး။')}</p></div>
      ) : (
        <div className="gd-table-wrap">
          <div className="gd-table-scroll">
            <div className="gd-led gd-head">
              <span>{t('日期', 'Date', 'နေ့')}</span>
              <span>{t('类型', 'Type', 'အမျိုး')}</span>
              <span>{t('商品', 'Product', 'ကုန်')}</span>
              <span>{t('对象', 'Who', 'ဘယ်သူ')}</span>
              <span className="gd-r">{t('数量', 'Qty', 'အရေ')}</span>
              <span className="gd-r">{t('金额', 'Amount', 'ငွေ')}</span>
            </div>
            {rows.map((row) => {
              const inbound = row.kind === 'purchase' || row.kind === 'recall';
              return (
                <div key={row.id} className="gd-led gd-line">
                  <span>{row.occurred_on}</span>
                  <span>
                    <span className={inbound ? 'gd-tag gd-tag-ok' : row.kind === 'sale' ? 'gd-tag gd-tag-warn' : 'gd-tag'} style={!inbound && row.kind !== 'sale' ? { color: '#cbd5e1', background: 'rgba(51,65,85,0.55)', border: '1px solid rgba(148,163,184,0.2)' } : undefined}>
                      {label(row)}
                    </span>
                  </span>
                  <span>{nameOf(row.product_id, data.products)}{row.note ? <span style={fine}> {row.note}</span> : null}</span>
                  <span>{party(row)}</span>
                  <span className="gd-num" style={{ color: inbound ? '#86efac' : '#fca5a5', textAlign: 'right' }}>{inbound ? '+' : '−'}{row.qty}</span>
                  <span className="gd-num" style={{ textAlign: 'right' }}>
                    {row.kind === 'consign' || row.kind === 'recall' ? '—' : formatGoodsMoney(row.total_mmk, row.unit_currency || 'MMK')}
                    {row.kind === 'sale' && row.unit_currency !== 'RMB' ? <span style={fine}> {t('毛利', 'profit', 'အမြတ်')} {mmk(row.total_mmk - row.cost_mmk)}</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import type { GoodsHolding, GoodsParty, GoodsProduct } from '../../services/goodsTradeService';
import { formatGoodsMoney } from '../../services/goodsTradeService';
import type { Copy, StockFilter } from './helpers';
import { stockState } from './helpers';
import { fine, muted, stickyTools, toolRow } from './styles';
import { EmptyBlock } from './ui';

export function ProductsView({
  t,
  query,
  onQuery,
  filter,
  onFilter,
  rows,
  holdings,
  suppliers,
  onAdd,
  exporting,
  onExport,
  onEdit,
  onBuy,
  onSend,
  onSell,
}: {
  t: Copy;
  query: string;
  onQuery: (value: string) => void;
  filter: StockFilter;
  onFilter: (value: StockFilter) => void;
  rows: GoodsProduct[];
  holdings: GoodsHolding[];
  suppliers: GoodsParty[];
  onAdd: () => void;
  exporting: boolean;
  onExport: () => void;
  onEdit: (product: GoodsProduct) => void;
  onBuy: (id: string) => void;
  onSend: (id: string) => void;
  onSell: (id: string) => void;
}) {
  const filters: Array<[StockFilter, string]> = [
    ['all', t('全部', 'All', 'အားလုံး')],
    ['empty', t('缺货', 'Out', 'ကုန်')],
    ['supplier', t('只在供应商处', 'At supplier', 'ပေးသွင်းသူထံ')],
  ];
  return (
    <section>
      <div style={stickyTools}>
        <div style={toolRow}>
          <input className="gd-field" style={{ flex: '1 1 240px' }} placeholder={t('搜索名称或规格', 'Search name or spec', 'ရှာမည်')} value={query} onChange={(e) => onQuery(e.target.value)} autoComplete="off" />
          <button type="button" className="gd-ghost" onClick={onExport} disabled={exporting}>
            {exporting ? t('正在导出…', 'Exporting…', 'ထုတ်နေသည်…') : t('导出价格表', 'Export price list', 'ဈေးနှုန်းထုတ်')}
          </button>
          <button type="button" className="gd-primary" onClick={onAdd}>{t('添加商品', 'Add product', 'ကုန်ပစ္စည်းထည့်')}</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
          {filters.map(([id, label]) => (
            <button key={id} type="button" className={filter === id ? 'gd-chip gd-chip-on' : 'gd-chip'} onClick={() => onFilter(id)}>
              {label}
            </button>
          ))}
          <span style={{ ...muted, marginLeft: 4 }}>{t(`共 ${rows.length} 个`, `${rows.length} items`, `${rows.length}`)}</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyBlock
          title={query.trim() || filter !== 'all' ? t('没有符合的商品', 'No matching products', 'မတွေ့ပါ') : t('还没有商品', 'No products yet', 'ကုန်ပစ္စည်းမရှိ')}
          body={query.trim() || filter !== 'all' ? t('换个搜索，或看全部。', 'Try another search, or show all.', 'ရှာစကားပြောင်းပါ။') : t('先把要卖的货建档。数量以后从进货和销售里变动。', 'Add the goods you sell. Quantity changes when you buy or sell.', 'အရင်စာရင်းသွင်းပါ။')}
          action={t('添加商品', 'Add product', 'ထည့်')}
          onClick={onAdd}
        />
      ) : (
        <div className="gd-table-wrap">
          <div className="gd-table-scroll">
            <div className="gd-prod gd-head">
              <span>{t('商品', 'Product', 'ကုန်')}</span>
              <span className="gd-r">{t('在手', 'On hand', 'လက်ထဲ')}</span>
              <span className="gd-r">{t('供应商处', 'At supplier', 'ပေးသွင်းသူ')}</span>
              <span className="gd-r">{t('进价', 'Cost', 'ဝယ်ဈေး')}</span>
              <span className="gd-r">{t('售价', 'Price', 'ရောင်းဈေး')}</span>
              <span>{t('操作', 'Actions', 'လုပ်')}</span>
            </div>
            {rows.map((row) => {
              const state = stockState(row);
              const holders = holdings.filter((item) => item.product_id === row.id && item.qty > 0);
              return (
                <div key={row.id} className="gd-prod gd-line">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                    {row.image_url ? <img className="gd-thumb" src={row.image_url} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : <span className="gd-thumb gd-thumb-empty" />}
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 13 }}>{row.name}</strong>
                      {state === 'empty' ? <span className="gd-tag gd-tag-bad">{t('缺货', 'Out', 'ကုန်')}</span> : null}
                      {state === 'supplier' ? <span className="gd-tag gd-tag-warn">{t('只在供应商处', 'At supplier', 'ပေးသွင်းသူထံ')}</span> : null}
                      {state === 'ok' ? <span className="gd-tag gd-tag-ok">{t('有货', 'In stock', 'ရှိ')}</span> : null}
                      <div style={fine}>
                        {[row.brand, row.spec, row.unit].filter(Boolean).join(' · ')}
                        {holders.length > 0 ? ` · ${holders.map((item) => `${suppliers.find((s) => s.id === item.supplier_id)?.name || '—'} ${item.qty}`).join(' · ')}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="gd-num">{row.qty_on_hand}</span>
                  <span className="gd-num">{row.qty_with_supplier}</span>
                  <span className="gd-num">{formatGoodsMoney(row.cost_mmk, row.cost_currency)}</span>
                  <span className="gd-num">
                    {formatGoodsMoney(row.price_mmk, row.price_currency)}
                    {row.pieces_per_pack > 0 ? <div style={fine}>1件={row.pieces_per_pack}个 · {formatGoodsMoney(row.wholesale_mmk, row.wholesale_currency)}</div> : null}
                  </span>
                  <div className="gd-actions">
                    <button type="button" className="gd-link" onClick={() => onEdit(row)}>{t('修改', 'Edit', 'ပြင်')}</button>
                    <button type="button" className="gd-link" onClick={() => onBuy(row.id)}>{t('进货', 'Buy', 'ဝယ်')}</button>
                    <button type="button" className="gd-link" onClick={() => onSend(row.id)}>{t('代卖', 'Send', 'ပို့')}</button>
                    <button type="button" className="gd-link" onClick={() => onSell(row.id)}>{t('销售', 'Sell', 'ရောင်း')}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

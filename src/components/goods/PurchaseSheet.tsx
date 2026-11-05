import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatGoodsMoney,
  nextPurchaseCost,
  type GoodsCurrency,
  type GoodsParty,
  type GoodsProduct,
} from '../../services/goodsTradeService';
import type { Copy } from './helpers';
import { readMoney, readQty, today } from './helpers';
import { fine, formFoot, muted, stickySubmit } from './styles';
import { EmptyBlock, Field } from './ui';

type Line = {
  key: string;
  productId: string;
  qty: string;
  unit: string;
  currency: GoodsCurrency;
  query: string;
  picking: boolean;
};

const SHOW_LIMIT = 8;

function productLabel(row: GoodsProduct) {
  return `${row.name} ${row.brand} ${row.spec}`.toLowerCase();
}

function blankLine(product?: GoodsProduct): Line {
  return {
    key: crypto.randomUUID(),
    productId: product?.id || '',
    qty: '1',
    unit: product ? String(product.cost_mmk ?? 0) : '',
    currency: product?.cost_currency || 'MMK',
    query: '',
    picking: !product,
  };
}

export function PurchaseSheet({
  t,
  busy,
  products,
  suppliers,
  initialProductId,
  pinSupplierId,
  savedTick,
  onNeedProducts,
  onCreateSupplier,
  onSave,
}: {
  t: Copy;
  busy: boolean;
  products: GoodsProduct[];
  suppliers: GoodsParty[];
  initialProductId: string;
  pinSupplierId: string;
  savedTick: number;
  onNeedProducts: () => void;
  onCreateSupplier: () => void;
  onSave: (input: {
    supplierId: string;
    note: string;
    occurredOn: string;
    lines: Array<{ productId: string; qty: number; unitMmk: number; unitCurrency: GoodsCurrency }>;
  }) => void;
}) {
  const starter = products.find((row) => row.id === initialProductId);
  const [supplierId, setSupplierId] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [occurredOn, setOccurredOn] = useState(today);
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>(() => [blankLine(starter)]);
  const [localError, setLocalError] = useState('');
  const [flashOk, setFlashOk] = useState(false);
  const seenTick = useRef(0);
  const appliedSupplier = useRef('');
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!pinSupplierId || pinSupplierId === appliedSupplier.current) return;
    if (!suppliers.some((row) => row.id === pinSupplierId)) return;
    appliedSupplier.current = pinSupplierId;
    setSupplierId(pinSupplierId);
  }, [pinSupplierId, suppliers]);

  useEffect(() => {
    if (savedTick === seenTick.current) return;
    seenTick.current = savedTick;
    if (!savedTick) return;
    setLines([blankLine()]);
    setNote('');
    setLocalError('');
    setFlashOk(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashOk(false), 1600);
  }, [savedTick]);

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((row) => `${row.name} ${row.phone} ${row.note}`.toLowerCase().includes(q));
  }, [suppliers, supplierQuery]);

  const patch = (key: string, next: Partial<Line>) => {
    setLines((rows) => rows.map((row) => (row.key === key ? { ...row, ...next } : row)));
    setLocalError('');
  };

  const previews = useMemo(() => {
    const shadow = new Map<string, GoodsProduct>();
    return lines.map((line) => {
      const source = products.find((row) => row.id === line.productId);
      const qty = readQty(line.qty);
      const money = readMoney(line.unit);
      if (!source || qty == null || money == null) return null;
      const current = shadow.get(source.id) || source;
      const preview = nextPurchaseCost(current, qty, money, line.currency);
      if (!preview.mixed) {
        shadow.set(source.id, {
          ...current,
          qty_on_hand: preview.nextOnHand,
          cost_mmk: preview.nextCost,
          cost_currency: line.currency,
        });
      }
      return {
        product: source,
        preview,
        qty,
        money,
        lineTotal: qty * money,
        beforeCost: current.cost_mmk,
        beforeCurrency: current.cost_currency,
        beforeOnHand: current.qty_on_hand,
      };
    });
  }, [lines, products]);

  if (products.length === 0) {
    return (
      <EmptyBlock
        title={t('还没有商品', 'No products yet', 'ကုန်ပစ္စည်းမရှိ')}
        body={t('先去添加商品，再回来记这一笔。', 'Add a product, then come back.', 'အရင်ထည့်ပါ။')}
        action={t('添加商品', 'Add product', 'ထည့်')}
        onClick={onNeedProducts}
      />
    );
  }

  const readyLines = previews.flatMap((row, index) => {
    if (!row || row.preview.mixed) return [];
    const line = lines[index];
    return [{
      productId: line.productId,
      qty: row.qty,
      unitMmk: row.money,
      unitCurrency: line.currency,
    }];
  });
  const blocked = previews.some((row) => row?.preview.mixed);
  const incomplete = readyLines.length !== lines.length;
  const totals = readyLines.reduce(
    (sum, line) => {
      sum[line.unitCurrency] += line.qty * line.unitMmk;
      return sum;
    },
    { MMK: 0, RMB: 0 } as Record<GoodsCurrency, number>,
  );

  const submit = () => {
    if (busy) return;
    if (!supplierId) {
      setLocalError(t('请选择供应商', 'Choose a supplier', 'ပေးသွင်းသူရွေးပါ'));
      return;
    }
    if (incomplete || blocked) {
      setLocalError(t('每一行都要选商品、数量和进价', 'Each line needs a product, quantity, and cost', 'အတန်းတိုင်း ပြည့်စုံရမည်'));
      return;
    }
    setLocalError('');
    onSave({
      supplierId,
      note,
      occurredOn,
      lines: readyLines,
    });
  };

  return (
    <div className="gd-card" style={{ paddingBottom: 8 }}>
      <div className="gd-kind-bar gd-kind-bar-purchase">
        <div className="gd-kind-badge">{t('进货', 'Purchase', 'ဝယ်')}</div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t('记一张进货单', 'Record a purchase', 'ဝယ်ယူမှတ်')}</h3>
        <p style={{ ...muted, margin: '6px 0 0' }}>
          {t('一次选一个供应商，下面可以连续加多件货。进价按行顺序加权。', 'One supplier, then as many products as you need. Cost is weighted in line order.', 'ပေးသွင်းသူတစ်ဦး၊ ကုန်များများ။')}
        </p>
      </div>

      <div className="gd-form">
        <Field label={t('供应商', 'Supplier', 'ပေးသွင်းသူ')} extra={<button type="button" className="gd-link" onClick={onCreateSupplier}>{t('新建', 'New', 'အသစ်')}</button>}>
          <input
            className="gd-field gd-pick-search"
            value={supplierQuery}
            onChange={(e) => setSupplierQuery(e.target.value)}
            placeholder={t('搜索供应商', 'Search supplier', 'ပေးသွင်းသူရှာ')}
            autoComplete="off"
          />
          <select className="gd-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">{t('请选择', 'Choose', 'ရွေး')}</option>
            {filteredSuppliers.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('日期', 'Date', 'နေ့')}>
          <input className="gd-field" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
        </Field>
        <Field label={t('备注', 'Note', 'မှတ်ချက်')}>
          <input className="gd-field" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" placeholder={t('整张单共用，可空', 'Shared by every line, optional', 'ဗလာထားနိုင်')} />
        </Field>
      </div>

      {lines.map((line, index) => {
        const info = previews[index];
        const product = products.find((row) => row.id === line.productId);
        const q = line.query.trim().toLowerCase();
        const matches = products.filter((row) => !q || productLabel(row).includes(q));
        const shown = matches.slice(0, SHOW_LIMIT);
        return (
          <div key={line.key} className="gd-po-line">
            <div className="gd-po-line-h">
              <strong>{t(`第 ${index + 1} 件`, `Item ${index + 1}`, `အမှတ် ${index + 1}`)}</strong>
              {lines.length > 1 ? (
                <button type="button" className="gd-link" onClick={() => setLines((rows) => rows.filter((row) => row.key !== line.key))}>
                  {t('移除', 'Remove', 'ဖယ်')}
                </button>
              ) : null}
            </div>
            <input
              className="gd-field gd-pick-search"
              value={line.query}
              onChange={(e) => patch(line.key, { query: e.target.value, picking: true })}
              onFocus={() => patch(line.key, { picking: true })}
              placeholder={t('搜索商品名 / 品牌 / 规格', 'Search name / brand / spec', 'အမည် / ဘရန်း')}
              autoComplete="off"
            />
            {line.picking ? (
              <div className="gd-pick-list" role="listbox">
                {shown.length === 0 ? (
                  <p className="gd-pick-empty">{t('没有匹配的商品', 'No matching products', 'မတွေ့')}</p>
                ) : shown.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={row.id === line.productId ? 'gd-pick-row is-on' : 'gd-pick-row'}
                    onClick={() => patch(line.key, {
                      productId: row.id,
                      currency: row.cost_currency || 'MMK',
                      unit: String(row.cost_mmk ?? 0),
                      query: '',
                      picking: false,
                    })}
                  >
                    {row.image_url
                      ? <img className="gd-thumb" src={row.image_url} alt="" />
                      : <span className="gd-thumb gd-thumb-empty" aria-hidden />}
                    <span className="gd-pick-copy">
                      <strong>{row.name}</strong>
                      <span>{[row.brand, row.spec].filter(Boolean).join(' · ') || t('无规格', 'No spec', 'သတ်မှတ်ချက်မရှိ')}</span>
                    </span>
                    <span className="gd-pick-stock">{t('在手', 'on hand', 'လက်ထဲ')} {row.qty_on_hand}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {product && !line.picking ? (
              <div className="gd-selected-product">
                {product.image_url
                  ? <img className="gd-thumb" src={product.image_url} alt="" />
                  : <span className="gd-thumb gd-thumb-empty" aria-hidden />}
                <div className="gd-selected-meta">
                  <div className="gd-selected-title">
                    <strong>{product.name}</strong>
                    <button type="button" className="gd-link" onClick={() => patch(line.key, { picking: true, query: '' })}>
                      {t('更换', 'Change', 'ပြောင်း')}
                    </button>
                  </div>
                  <div className="gd-selected-chips">
                    <span className="gd-stock-chip">{t('在手', 'on hand', 'လက်ထဲ')} {product.qty_on_hand}</span>
                    {product.brand || product.spec ? <span className="gd-stock-chip">{[product.brand, product.spec].filter(Boolean).join(' · ')}</span> : null}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="gd-form">
              <Field label={t('数量', 'Quantity', 'အရေအတွက်')}>
                <div className="gd-qty-row">
                  <button type="button" className="gd-step-btn" aria-label="−" onClick={() => patch(line.key, { qty: String(Math.max(1, (readQty(line.qty) || 1) - 1)) })}>−</button>
                  <input className="gd-field gd-num" inputMode="numeric" value={line.qty} onChange={(e) => patch(line.key, { qty: e.target.value.replace(/[^\d]/g, '') })} autoComplete="off" />
                  <button type="button" className="gd-step-btn" aria-label="+" onClick={() => patch(line.key, { qty: String((readQty(line.qty) || 0) + 1) })}>+</button>
                </div>
              </Field>
              <Field label={t(`进价 · ${line.currency}`, `Cost · ${line.currency}`, `ဝယ်ဈေး · ${line.currency}`)}>
                <div className="gd-money">
                  <select className="gd-field" value={line.currency} onChange={(e) => patch(line.key, { currency: e.target.value === 'RMB' ? 'RMB' : 'MMK' })}>
                    <option value="MMK">MMK</option>
                    <option value="RMB">RMB</option>
                  </select>
                  <input className="gd-field gd-num" inputMode="numeric" value={line.unit} onChange={(e) => patch(line.key, { unit: e.target.value })} autoComplete="off" />
                </div>
              </Field>
            </div>
            {info?.preview.mixed ? (
              <div className="gd-hint-warn">{t('进价货币和原来的成本不一样，不能混在一起算', 'Cost currency has to match the stock on hand', 'ငွေကြေးမတူ၍ ပေါင်းမရ')}</div>
            ) : null}
            {info && !info.preview.mixed ? (
              <div className="gd-cost-preview">
                <div>
                  <span>{t('现在成本', 'Cost now', 'ယခုကုန်ကျ')}</span>
                  <strong>{info.preview.basis > 0 ? formatGoodsMoney(info.beforeCost, info.beforeCurrency) : t('还没有库存', 'No stock yet', 'လက်ကျန်မရှိ')}</strong>
                </div>
                <div>
                  <span>{t('记下后成本', 'Cost after', 'မှတ်ပြီးကုန်ကျ')}</span>
                  <strong>{formatGoodsMoney(info.preview.nextCost, line.currency)}</strong>
                </div>
                <div>
                  <span>{t('在手', 'On hand', 'လက်ထဲ')}</span>
                  <strong className="gd-num">{info.beforeOnHand} → {info.preview.nextOnHand}</strong>
                </div>
              </div>
            ) : null}
            {info ? (
              <div style={{ ...fine, textAlign: 'right' }}>{t('这行', 'Line', 'ဤကြောင်း')} {formatGoodsMoney(info.lineTotal, line.currency)}</div>
            ) : null}
          </div>
        );
      })}

      <button type="button" className="gd-po-add" onClick={() => setLines((rows) => [...rows, blankLine()])}>
        {t('再加一件', 'Add another item', 'နောက်တစ်ခု')}
      </button>

      <div className="gd-total-strip">
        <span>{t(`共 ${readyLines.length} 件`, `${readyLines.length} lines`, `${readyLines.length}`)}</span>
        <strong className="gd-num">
          {[totals.MMK > 0 ? formatGoodsMoney(totals.MMK, 'MMK') : '', totals.RMB > 0 ? formatGoodsMoney(totals.RMB, 'RMB') : '']
            .filter(Boolean)
            .join(' · ') || '—'}
        </strong>
      </div>
      {localError ? <div role="alert" className="gd-hint-err">{localError}</div> : null}
      {flashOk ? <div className="gd-flash-ok" role="status">{t('已记下', 'Saved', 'မှတ်ပြီး')}</div> : null}

      <div style={stickySubmit}>
        <div style={formFoot}>
          <div className="gd-disabled-reason">{'\u00a0'}</div>
          <button type="button" className="gd-primary" disabled={busy || !supplierId || incomplete || blocked} onClick={submit}>
            {busy ? t('保存中…', 'Saving…', 'သိမ်းနေသည်…') : t(`记下 ${lines.length} 件`, `Save ${lines.length}`, `မှတ် ${lines.length}`)}
          </button>
        </div>
      </div>
    </div>
  );
}

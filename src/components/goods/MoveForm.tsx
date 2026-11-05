import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  customerPriceCurrency,
  customerUnitPrice,
  formatGoodsMoney,
  nextPurchaseCost,
  type GoodsCurrency,
  type GoodsHolding,
  type GoodsMovementKind,
  type GoodsParty,
  type GoodsProduct,
} from '../../services/goodsTradeService';
import type { Copy } from './helpers';
import { holdingQty, readMoney, readQty, today } from './helpers';
import { fine, formFoot, muted } from './styles';
import { EmptyBlock, Field } from './ui';

function partyLabel(row: GoodsParty) {
  return `${row.name} ${row.phone || ''} ${row.note || ''}`.toLowerCase();
}

function productLabel(row: GoodsProduct) {
  return `${row.name} ${row.brand} ${row.spec}`.toLowerCase();
}

export function MoveForm({
  t,
  busy,
  kind,
  products,
  suppliers,
  customers,
  holdings,
  initialProductId,
  pinSupplierId,
  pinCustomerId,
  savedTick,
  onNeedProducts,
  onCreateSupplier,
  onCreateCustomer,
  onSave,
}: {
  t: Copy;
  busy: boolean;
  kind: GoodsMovementKind;
  products: GoodsProduct[];
  suppliers: GoodsParty[];
  customers: GoodsParty[];
  holdings: GoodsHolding[];
  initialProductId: string;
  pinSupplierId: string;
  pinCustomerId: string;
  savedTick: number;
  onNeedProducts: () => void;
  onCreateSupplier: () => void;
  onCreateCustomer: () => void;
  onSave: (input: {
    kind: GoodsMovementKind;
    productId: string;
    supplierId?: string;
    customerId?: string;
    qty: number;
    unitMmk: number;
    unitCurrency?: GoodsCurrency;
    note: string;
    occurredOn: string;
  }) => void;
}) {
  const firstId = products.some((row) => row.id === initialProductId) ? initialProductId : products[0]?.id || '';
  const [productId, setProductId] = useState(firstId);
  const [supplierId, setSupplierId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const [saleCurrency, setSaleCurrency] = useState<GoodsCurrency>('MMK');
  const [purchaseCurrency, setPurchaseCurrency] = useState<GoodsCurrency>('MMK');
  const [note, setNote] = useState('');
  const [occurredOn, setOccurredOn] = useState(today);
  const [localError, setLocalError] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [picking, setPicking] = useState(false);
  const [partyQuery, setPartyQuery] = useState('');
  const [flashOk, setFlashOk] = useState(false);
  const appliedSupplier = useRef('');
  const appliedCustomer = useRef('');
  const pricedFor = useRef('');
  const seenTick = useRef(0);
  const priceTouched = useRef(false);
  const saleProductRef = useRef(productId);
  const flashTimer = useRef<number | null>(null);
  const product = products.find((row) => row.id === productId);
  const needsSupplier = kind === 'purchase' || kind === 'consign' || kind === 'recall';
  const supplierChoices = suppliers.filter((row) => (kind === 'sale' || kind === 'recall' ? holdingQty(holdings, productId, row.id) > 0 : true));

  useEffect(() => {
    if (!product) return;
    const mark = `${kind}:${productId}`;
    if (pricedFor.current === mark) return;
    pricedFor.current = mark;
    if (kind === 'purchase') {
      setUnit(String(product.cost_mmk ?? 0));
      setPurchaseCurrency(product.cost_currency || 'MMK');
    }
  }, [productId, kind, product]);

  useEffect(() => {
    if (kind !== 'recall' && !(kind === 'sale' && supplierId)) return;
    if (!supplierId) return;
    if (holdingQty(holdings, productId, supplierId) <= 0) setSupplierId('');
  }, [kind, productId, supplierId, holdings]);

  useEffect(() => {
    if (!pinSupplierId || pinSupplierId === appliedSupplier.current) return;
    if (!suppliers.some((row) => row.id === pinSupplierId)) return;
    appliedSupplier.current = pinSupplierId;
    setSupplierId(pinSupplierId);
  }, [pinSupplierId, suppliers]);

  useEffect(() => {
    if (!pinCustomerId || pinCustomerId === appliedCustomer.current) return;
    if (!customers.some((row) => row.id === pinCustomerId)) return;
    appliedCustomer.current = pinCustomerId;
    setCustomerId(pinCustomerId);
  }, [pinCustomerId, customers]);

  useEffect(() => {
    if (savedTick === seenTick.current) return;
    seenTick.current = savedTick;
    if (!savedTick) return;
    pricedFor.current = `${kind}:${productId}`;
    priceTouched.current = false;
    if (product && kind === 'purchase') {
      setUnit(String(product.cost_mmk ?? 0));
      setPurchaseCurrency(product.cost_currency || 'MMK');
    }
    setQty('1');
    setNote('');
    setLocalError('');
    setFlashOk(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashOk(false), 1600);
  }, [savedTick, kind, productId, product]);

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  useEffect(() => {
    if (kind !== 'sale' || !product) return;
    if (saleProductRef.current !== productId) {
      saleProductRef.current = productId;
      priceTouched.current = false;
    }
    if (priceTouched.current) return;
    setUnit(String(customerUnitPrice(product)));
    setSaleCurrency(customerPriceCurrency(product));
  }, [productId, kind, product, savedTick]);

  useEffect(() => {
    setProductQuery('');
    setPartyQuery('');
    setPicking(false);
  }, [kind]);

  const chooseProduct = (id: string) => {
    setProductId(id);
    setSupplierId('');
    setLocalError('');
    setProductQuery('');
    setPicking(false);
  };

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((row) => productLabel(row).includes(q));
  }, [products, productQuery]);
  const shownProducts = filteredProducts.slice(0, 8);

  const filteredSuppliers = useMemo(() => {
    const list = kind === 'recall' ? supplierChoices : kind === 'sale' ? supplierChoices : suppliers;
    const q = partyQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => partyLabel(row).includes(q));
  }, [kind, supplierChoices, suppliers, partyQuery]);

  const filteredCustomers = useMemo(() => {
    const q = partyQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((row) => partyLabel(row).includes(q));
  }, [customers, partyQuery]);

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

  const onHand = product?.qty_on_hand ?? 0;
  const available = kind === 'recall' || (kind === 'sale' && supplierId)
    ? holdingQty(holdings, productId, supplierId)
    : kind === 'consign' || (kind === 'sale' && !supplierId)
      ? onHand
      : null;
  const money = readMoney(unit);
  const quoted = product && kind === 'sale' ? customerUnitPrice(product) : 0;
  const qtyNum = readQty(qty) || 0;
  const lineTotal = qtyNum * (money ?? (kind === 'sale' ? quoted : 0));
  const purchasePreview = kind === 'purchase' && product && money != null && qtyNum > 0
    ? nextPurchaseCost(product, qtyNum, money, purchaseCurrency)
    : null;
  const supplierHeld = product && supplierId ? holdingQty(holdings, productId, supplierId) : 0;
  const moveQty = qtyNum > 0 ? qtyNum : 0;
  const consignPreview = (kind === 'consign' || kind === 'recall') && product && moveQty > 0
    ? {
      supplierName: suppliers.find((row) => row.id === supplierId)?.name || '',
      onHandNow: onHand,
      onHandNext: kind === 'consign' ? onHand - moveQty : onHand + moveQty,
      heldNow: supplierHeld,
      heldNext: kind === 'consign' ? supplierHeld + moveQty : supplierHeld - moveQty,
    }
    : null;

  const clampQty = (next: number) => {
    let value = Math.max(1, Math.floor(next));
    if (available != null) value = Math.min(value, Math.max(0, available));
    if (available != null && available <= 0) value = 0;
    return String(value || (available != null && available <= 0 ? '0' : '1'));
  };

  const setQtyClamped = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, '');
    if (cleaned === '') {
      setQty('');
      return;
    }
    const num = Number(cleaned);
    if (!Number.isFinite(num)) {
      setQty(cleaned);
      return;
    }
    if (available != null && num > available) {
      setQty(String(Math.max(0, available)));
      return;
    }
    setQty(cleaned);
  };

  const bumpQty = (delta: number) => {
    const current = readQty(qty) ?? 0;
    setQty(clampQty(current + delta));
    setLocalError('');
  };

  const submit = () => {
    if (busy) return;
    const qtyNum = readQty(qty);
    if (!productId) {
      setLocalError(t('请选择商品', 'Choose a product', 'ကုန်ရွေးပါ'));
      return;
    }
    if (needsSupplier && !supplierId) {
      setLocalError(t('请选择供应商', 'Choose a supplier', 'ပေးသွင်းသူရွေးပါ'));
      return;
    }
    if (kind === 'sale' && !customerId) {
      setLocalError(t('请选择客户', 'Choose a customer', 'ဖောက်သည်ရွေးပါ'));
      return;
    }
    if (qtyNum == null) {
      setLocalError(t('数量要是大于 0 的整数', 'Quantity must be a whole number above 0', 'အရေအတွက် ဂဏန်းပြည့်ဖြစ်ရမည်'));
      return;
    }
    if ((kind === 'purchase' || kind === 'sale') && unit.trim() !== '' && money == null) {
      setLocalError(t('金额要是整数缅币', 'Amount must be a whole number of MMK', 'ကျပ်ငွေ ဂဏန်းပြည့်'));
      return;
    }
    if (kind === 'purchase' && unit.trim() === '') {
      setLocalError(t('请填写进价', 'Enter the cost', 'ဝယ်ဈေးထည့်ပါ'));
      return;
    }
    if (kind === 'purchase' && product && money != null && qtyNum != null) {
      const preview = nextPurchaseCost(product, qtyNum, money, purchaseCurrency);
      if (preview.mixed) {
        setLocalError(t('进价货币和原来的成本不一样，不能混在一起算', 'Cost currency has to match the stock on hand', 'ငွေကြေးမတူ၍ ပေါင်းမရ'));
        return;
      }
    }
    if (available != null && qtyNum > available) {
      setLocalError(t('数量超过了可动的货', 'That is more than the available stock', 'ရနိုင်သည်ထက် များနေသည်'));
      return;
    }
    setLocalError('');
    onSave({
      kind,
      productId,
      supplierId: supplierId || undefined,
      customerId: kind === 'sale' ? customerId : undefined,
      qty: qtyNum,
      unitMmk: money ?? (kind === 'sale' ? quoted : 0),
      unitCurrency: kind === 'sale' ? saleCurrency : kind === 'purchase' ? purchaseCurrency : 'MMK',
      note,
      occurredOn,
    });
  };

  const onFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setLocalError('');
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!saveDisabled) submit();
    }
  };

  const stockBlocked = available != null && available <= 0;
  const noRecallSupplier = kind === 'recall' && supplierChoices.length === 0;
  const noSaleCustomer = kind === 'sale' && customers.length === 0;
  const saveDisabled = busy || stockBlocked || noRecallSupplier || noSaleCustomer;
  const disabledReason = stockBlocked
    ? t('现在没有可动的货。', 'No stock available to move.', 'ရနိုင်သော ပစ္စည်းမရှိ။')
    : noRecallSupplier
      ? t('这个商品不在任何供应商手里。', 'No supplier is holding this product.', 'ပေးသွင်းသူထံ မရှိပါ။')
      : noSaleCustomer
        ? t('还没有客户，请先新建。', 'Add a customer first.', 'ဖောက်သည်အရင်ထည့်ပါ။')
        : '';

  const title = kind === 'purchase'
    ? t('记一笔进货', 'Record a purchase', 'ဝယ်ယူမှတ်')
    : kind === 'sale'
      ? t('记一笔销售', 'Record a sale', 'ရောင်းချမှတ်')
      : kind === 'consign'
        ? t('交给供应商代卖', 'Send to a supplier', 'ပေးသွင်းသူထံပို့')
        : t('从供应商收回', 'Take stock back', 'ပြန်သိမ်း');
  const blurb = kind === 'purchase'
    ? t('货进到自己手上。进价会按剩余数量加权，变成新的成本。', 'Stock comes onto your shelf. Cost becomes a weighted average.', 'လက်ထဲသို့ဝင်သည်။')
    : kind === 'sale'
      ? t('单位是「件数」用批发价，其它用单价。售价空着就按商品单位自动填。', 'Pack unit uses the wholesale price; otherwise the unit price. Leave price blank to auto-fill from the product.', 'အထုပ်ယူနစ်ဆို လက်ကားဈေး။')
      : kind === 'consign'
        ? t('从自己手上拨到这个供应商名下，还没卖出去。', 'Move stock from your shelf onto this supplier. It is not a sale yet.', 'လက်ထဲမှ ပေးသွင်းသူထံ။')
        : t('供应商没卖掉的货，收回自己手上。', 'Bring unsold goods back onto your shelf.', 'မရောင်းရသေးသော ပစ္စည်း ပြန်သိမ်း။');
  const kindBadge = kind === 'purchase'
    ? t('进货', 'Purchase', 'ဝယ်')
    : kind === 'sale'
      ? t('销售', 'Sale', 'ရောင်း')
      : kind === 'consign'
        ? t('代卖', 'Consign', 'ပို့')
        : t('收回', 'Recall', 'ပြန်');
  const kindBarClass = `gd-kind-bar gd-kind-bar-${kind}`;
  const qtyChips = [1, 5, 10].concat(available != null && available > 0 && ![1, 5, 10].includes(available) ? [available] : []);

  return (
    <div className="gd-card" style={{ paddingBottom: 8 }}>
      <div className={kindBarClass}>
        <div className="gd-kind-badge">{kindBadge}</div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
        <p style={{ ...muted, margin: '6px 0 0' }}>{blurb}</p>
      </div>

      <div className="gd-form-sections">
        <div className="gd-section">
          <div className="gd-section-h">
            <strong>1 · {t('商品', 'Product', 'ကုန်')}</strong>
            <span>{product ? `${t('在手', 'on hand', 'လက်ထဲ')} ${product.qty_on_hand} · ${t('供应商处', 'at supplier', 'ပေးသွင်းသူ')} ${product.qty_with_supplier}` : '—'}</span>
          </div>
          <input
            className="gd-field gd-pick-search"
            value={productQuery}
            onChange={(e) => { setProductQuery(e.target.value); setPicking(true); }}
            onFocus={() => setPicking(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && picking && filteredProducts[0]) {
                event.preventDefault();
                chooseProduct(filteredProducts[0].id);
              }
            }}
            placeholder={t('搜索商品名 / 品牌 / 规格', 'Search name / brand / spec', 'အမည် / ဘရန်း / သတ်မှတ်ချက်')}
            autoComplete="off"
          />
          {picking ? (
            <div className="gd-pick-list" role="listbox" aria-label={t('商品', 'Product', 'ကုန်')}>
              {shownProducts.length === 0 ? (
                <p className="gd-pick-empty">{t('没有匹配的商品', 'No matching products', 'မတွေ့')}</p>
              ) : shownProducts.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  role="option"
                  aria-selected={row.id === productId}
                  className={row.id === productId ? 'gd-pick-row is-on' : 'gd-pick-row'}
                  onClick={() => chooseProduct(row.id)}
                >
                  {row.image_url
                    ? <img className="gd-thumb" src={row.image_url} alt="" />
                    : <span className="gd-thumb gd-thumb-empty" aria-hidden />}
                  <span className="gd-pick-copy">
                    <strong>{row.name}</strong>
                    <span>{[row.brand, row.spec].filter(Boolean).join(' · ') || t('无规格', 'No spec', 'သတ်မှတ်ချက်မရှိ')}</span>
                  </span>
                  <span className="gd-pick-stock">
                    {kind === 'recall'
                      ? `${t('供应商处', 'at supplier', 'ပေးသွင်းသူ')} ${row.qty_with_supplier}`
                      : `${t('在手', 'on hand', 'လက်ထဲ')} ${row.qty_on_hand}`}
                  </span>
                </button>
              ))}
              {filteredProducts.length > shownProducts.length ? (
                <p className="gd-pick-more">
                  {t(`还有 ${filteredProducts.length - shownProducts.length} 个，继续输入缩小范围`, `${filteredProducts.length - shownProducts.length} more, keep typing`, `နောက်ထပ် ${filteredProducts.length - shownProducts.length}`)}
                </p>
              ) : null}
            </div>
          ) : null}
          {product && !picking ? (
            <div className="gd-selected-product">
              {product.image_url
                ? <img className="gd-thumb" src={product.image_url} alt="" />
                : <span className="gd-thumb gd-thumb-empty" aria-hidden />}
              <div className="gd-selected-meta">
                <div className="gd-selected-title">
                  <strong>{product.name}</strong>
                  <button type="button" className="gd-link" onClick={() => { setPicking(true); setProductQuery(''); }}>
                    {t('更换', 'Change', 'ပြောင်း')}
                  </button>
                </div>
                <div className="gd-selected-chips">
                  <span className="gd-stock-chip">{t('在手', 'on hand', 'လက်ထဲ')} {product.qty_on_hand}</span>
                  <span className="gd-stock-chip">{t('供应商处', 'at supplier', 'ပေးသွင်းသူ')} {product.qty_with_supplier}</span>
                  {product.brand || product.spec ? (
                    <span className="gd-stock-chip">{[product.brand, product.spec].filter(Boolean).join(' · ')}</span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          {consignPreview && !consignPreview.supplierName ? (
            <p className="gd-stock-note is-warn" role="status">
              {kind === 'consign'
                ? t(`在手还有 ${onHand}。请选择供应商，才能把货拨出去。`, `You have ${onHand} on hand. Choose a supplier to send the goods.`, `လက်ထဲ ${onHand}။ ပေးသွင်းသူရွေးပါ။`)
                : t('请选择供应商，才能收回手里的货。', 'Choose a supplier to take the goods back.', 'ပေးသွင်းသူရွေးပါ။')}
            </p>
          ) : null}
          {consignPreview && consignPreview.supplierName ? (
            <div className="gd-cost-preview">
              <div>
                <span>{t('在手', 'On hand', 'လက်ထဲ')}</span>
                <strong className="gd-num">{consignPreview.onHandNow} → {consignPreview.onHandNext}</strong>
              </div>
              <div>
                <span>{consignPreview.supplierName}</span>
                <strong className="gd-num">{consignPreview.heldNow} → {consignPreview.heldNext}</strong>
              </div>
              <div>
                <span>{t('这一笔', 'This move', 'ဤကြောင်း')}</span>
                <strong>{kind === 'consign' ? t(`拨出 ${moveQty}`, `Send ${moveQty}`, `ပို့ ${moveQty}`) : t(`收回 ${moveQty}`, `Take back ${moveQty}`, `ပြန် ${moveQty}`)}</strong>
              </div>
            </div>
          ) : null}
        </div>

        <div className="gd-section">
          <div className="gd-section-h">
            <strong>2 · {t('对象', 'Party', 'ပါတီ')}</strong>
            <span>{kind === 'sale' ? t('客户与出货来源', 'Customer & source', 'ဖောက်သည်နှင့် ရင်းမြစ်') : t('供应商', 'Supplier', 'ပေးသွင်းသူ')}</span>
          </div>
          <input
            className="gd-field gd-pick-search"
            value={partyQuery}
            onChange={(e) => setPartyQuery(e.target.value)}
            placeholder={kind === 'sale'
              ? t('搜索客户或供应商', 'Search customer or supplier', 'ဖောက်သည် / ပေးသွင်းသူ')
              : t('搜索供应商', 'Search supplier', 'ပေးသွင်းသူရှာ')}
            autoComplete="off"
          />
          <div className="gd-form">
            {kind === 'sale' ? (
              <Field label={t('从哪里卖', 'Sell from', 'ဘယ်ကရောင်း')}>
                <select className="gd-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">{t('从我手上卖', 'From my stock', 'လက်ထဲမှ')} · {onHand}</option>
                  {filteredSuppliers.map((row) => (
                    <option key={row.id} value={row.id}>{row.name} · {holdingQty(holdings, productId, row.id)}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label={t('供应商', 'Supplier', 'ပေးသွင်းသူ')} extra={<button type="button" className="gd-link" onClick={onCreateSupplier}>{t('新建', 'New', 'အသစ်')}</button>}>
                <select className="gd-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">{t('请选择', 'Choose', 'ရွေး')}</option>
                  {filteredSuppliers.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}{kind === 'recall' ? ` · ${holdingQty(holdings, productId, row.id)}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {kind === 'sale' ? (
              <Field label={t('客户', 'Customer', 'ဖောက်သည်')} extra={<button type="button" className="gd-link" onClick={onCreateCustomer}>{t('新建', 'New', 'အသစ်')}</button>}>
                <select className="gd-field" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">{t('请选择', 'Choose', 'ရွေး')}</option>
                  {filteredCustomers.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>
        </div>

        <div className="gd-section">
          <div className="gd-section-h">
            <strong>3 · {t('数量与金额', 'Qty & money', 'အရေနှင့်ငွေ')}</strong>
            {available != null ? <span style={{ color: available <= 0 ? '#fecaca' : undefined }}>{t('可动', 'Available', 'ရနိုင်')} {available} {product?.unit || ''}</span> : <span>{t('日期与备注可选', 'Date & note optional', 'နေ့နှင့်မှတ်ချက်')}</span>}
          </div>
          <div className="gd-form">
            <Field label={t('数量', 'Quantity', 'အရေအတွက်')}>
              <div className="gd-qty-row">
                <button type="button" className="gd-step-btn" aria-label="−" disabled={busy || (readQty(qty) ?? 0) <= 1} onClick={() => bumpQty(-1)}>−</button>
                <input
                  className="gd-field gd-num"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQtyClamped(e.target.value)}
                  onKeyDown={onFieldKeyDown}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="gd-step-btn"
                  aria-label="+"
                  disabled={busy || (available != null && (readQty(qty) ?? 0) >= available)}
                  onClick={() => bumpQty(1)}
                >
                  +
                </button>
              </div>
              <div className="gd-chip-row">
                {qtyChips.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={(readQty(qty) === n ? 'gd-chip gd-chip-on' : 'gd-chip')}
                    disabled={busy || (available != null && n > available)}
                    onClick={() => { setQty(String(n)); setLocalError(''); }}
                  >
                    {available != null && n === available ? t(`最大 ${n}`, `Max ${n}`, `အများဆုံး ${n}`) : n}
                  </button>
                ))}
              </div>
            </Field>
            {kind === 'purchase' || kind === 'sale' ? (
              <Field label={kind === 'purchase'
                ? t(`进价 · ${purchaseCurrency}`, `Cost · ${purchaseCurrency}`, `ဝယ်ဈေး · ${purchaseCurrency}`)
                : t(`售价 · ${saleCurrency}`, `Price · ${saleCurrency}`, `ရောင်းဈေး · ${saleCurrency}`)}>
                <div className="gd-money">
                  <select
                    className="gd-field"
                    aria-label={kind === 'purchase' ? t('进价货币', 'Cost currency', 'ဝယ်ငွေကြေး') : t('售价货币', 'Sale currency', 'ရောင်းငွေကြေး')}
                    value={kind === 'purchase' ? purchaseCurrency : saleCurrency}
                    onChange={(e) => {
                      const next = e.target.value === 'RMB' ? 'RMB' : 'MMK';
                      if (kind === 'purchase') setPurchaseCurrency(next);
                      else {
                        priceTouched.current = true;
                        setSaleCurrency(next);
                      }
                    }}
                  >
                    <option value="MMK">MMK</option>
                    <option value="RMB">RMB</option>
                  </select>
                  <input
                    className="gd-field gd-num"
                    inputMode="numeric"
                    value={unit}
                    onChange={(e) => { if (kind === 'sale') priceTouched.current = true; setUnit(e.target.value); }}
                    onKeyDown={onFieldKeyDown}
                    autoComplete="off"
                    placeholder={kind === 'sale' ? t('空着按商品单位取单价或批发价', 'Blank follows product unit price', 'ဗလာဆို ဈေးနှုန်း') : ''}
                  />
                </div>
              </Field>
            ) : null}
            <Field label={t('日期', 'Date', 'နေ့')}>
              <input className="gd-field" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
            </Field>
            <Field label={t('备注', 'Note', 'မှတ်ချက်')}>
              <input className="gd-field" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={onFieldKeyDown} autoComplete="off" />
            </Field>
          </div>
          {kind === 'sale' && product ? (
            <div style={{ ...fine, marginTop: 10 }}>
              {product.unit === '件数'
                ? t(`按件数卖，用批发价 ${formatGoodsMoney(product.wholesale_mmk, product.wholesale_currency)}`, `Sold by pack at ${formatGoodsMoney(product.wholesale_mmk, product.wholesale_currency)}`, `အထုပ်ဖြင့် ${formatGoodsMoney(product.wholesale_mmk, product.wholesale_currency)}`)
                : t(`按个数卖，用单价 ${formatGoodsMoney(product.price_mmk, product.price_currency)}`, `Sold by piece at ${formatGoodsMoney(product.price_mmk, product.price_currency)}`, `တစ်လုံး ${formatGoodsMoney(product.price_mmk, product.price_currency)}`)}
              {product.pieces_per_pack > 0 ? ` · 1${t('件', 'pack', 'ခု')}=${product.pieces_per_pack}${t('个', 'pcs', 'လုံး')}` : ''}
            </div>
          ) : null}
          {purchasePreview?.mixed ? (
            <div className="gd-hint-warn">{t('进价货币和原来的成本不一样，不能混在一起算', 'Cost currency has to match the stock on hand', 'ငွေကြေးမတူ၍ ပေါင်းမရ')}</div>
          ) : null}
          {purchasePreview && !purchasePreview.mixed ? (
            <div className="gd-cost-preview">
              <div>
                <span>{t('现在成本', 'Cost now', 'ယခုကုန်ကျ')}</span>
                <strong>{purchasePreview.basis > 0 ? formatGoodsMoney(product?.cost_mmk || 0, product?.cost_currency || 'MMK') : t('还没有库存', 'No stock yet', 'လက်ကျန်မရှိ')}</strong>
              </div>
              <div>
                <span>{t('记下后成本', 'Cost after', 'မှတ်ပြီးကုန်ကျ')}</span>
                <strong>{formatGoodsMoney(purchasePreview.nextCost, purchaseCurrency)}</strong>
              </div>
              <div>
                <span>{t('在手', 'On hand', 'လက်ထဲ')}</span>
                <strong className="gd-num">{product?.qty_on_hand ?? 0} → {purchasePreview.nextOnHand}</strong>
              </div>
            </div>
          ) : null}
          {kind === 'purchase' || kind === 'sale' ? (
            <div className="gd-total-strip">
              <span>{t('这笔', 'This line', 'ဤကြောင်း')}</span>
              <strong className="gd-num">
                {kind === 'sale' ? formatGoodsMoney(lineTotal, saleCurrency) : formatGoodsMoney(lineTotal, purchaseCurrency)}
              </strong>
            </div>
          ) : null}
          {stockBlocked ? <div className="gd-hint-warn">{t('现在没有可动的货。', 'No stock available to move.', 'ရနိုင်သော ပစ္စည်းမရှိ။')}</div> : null}
          {noRecallSupplier ? <div className="gd-hint-warn">{t('这个商品不在任何供应商手里。', 'No supplier is holding this product.', 'ပေးသွင်းသူထံ မရှိပါ။')}</div> : null}
          {noSaleCustomer ? <div className="gd-hint-warn">{t('还没有客户，请先新建。', 'Add a customer first.', 'ဖောက်သည်အရင်ထည့်ပါ။')}</div> : null}
          {localError ? <div role="alert" className="gd-hint-err">{localError}</div> : null}
          {flashOk ? <div className="gd-flash-ok" role="status">{t('已记下', 'Saved', 'မှတ်ပြီး')}</div> : null}
        </div>
      </div>

      <div style={{ ...formFoot, marginTop: 16 }}>
          <div className="gd-disabled-reason">{saveDisabled && !busy ? disabledReason : '\u00a0'}</div>
          <button type="button" className="gd-primary" disabled={saveDisabled} onClick={submit}>
            {busy ? t('保存中…', 'Saving…', 'သိမ်းနေသည်…') : t('记下', 'Save', 'မှတ်')}
          </button>
      </div>
    </div>
  );
}

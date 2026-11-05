import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  applyGoodsMovement,
  applyGoodsPurchases,
  emptyGoodsSnapshot,
  loadGoodsTrade,
  saveGoodsParty,
  deleteGoodsParty,
  saveGoodsProduct,
  uploadGoodsImage,
  type GoodsSnapshot,
} from '../services/goodsTradeService';
import { exportGoodsPriceList } from '../utils/goodsPriceListExcel';
import type { ConsignMode, Copy, Editor, StockFilter, Tab } from './goods/helpers';
import { explain, stockState } from './goods/helpers';
import { HomeView } from './goods/HomeView';
import { Ledger } from './goods/Ledger';
import { MoveForm } from './goods/MoveForm';
import { PurchaseSheet } from './goods/PurchaseSheet';
import { PartiesView } from './goods/PartiesView';
import { PartyDialog } from './goods/PartyDialog';
import { ProductDialog } from './goods/ProductDialog';
import { ProductsView } from './goods/ProductsView';
import {
  alertStyle,
  bodyPad,
  deskCss,
  eyebrow,
  headRow,
  lede,
  muted,
  okStyle,
  sectionTitle,
  shell,
  stickyTop,
  tabBar,
  title,
} from './goods/styles';

export default function InventoryHubPanel({ onClose }: { onClose: () => void }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const my = language === 'my';
  const t: Copy = (zh, enText, myText = zh) => (en ? enText : my ? myText : zh);
  const [tab, setTab] = useState<Tab>('home');
  const [data, setData] = useState<GoodsSnapshot>(emptyGoodsSnapshot);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [focusProductId, setFocusProductId] = useState('');
  const [consignMode, setConsignMode] = useState<ConsignMode>('send');
  const [pinSupplier, setPinSupplier] = useState('');
  const [pinCustomer, setPinCustomer] = useState('');
  const [savedTick, setSavedTick] = useState(0);
  const [exporting, setExporting] = useState(false);
  const noticeTimer = useRef<number | null>(null);

  const missingText = t('商品表还没有建到数据库里，保存暂时用不了。', 'The goods tables are not on the database yet.', 'ကုန်ပစ္စည်းဇယား မရှိသေးပါ။');
  const failText = t('没有保存', 'Save failed', 'မသိမ်းနိုင်');

  const flash = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2800);
  };

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  const reload = async () => {
    const next = await loadGoodsTrade();
    setData(next);
    setReady(true);
    setSchemaMissing(false);
  };

  useEffect(() => {
    let cancelled = false;
    void loadGoodsTrade()
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setReady(true);
        const message = explain(err, missingText, t('没有载入', 'Could not load', 'မဖွင့်နိုင်'));
        setSchemaMissing(message === missingText);
        setError(message);
      });
    return () => {
      cancelled = true;
    };
    // 打开时拉一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = async (work: () => Promise<void>, message: string, after?: () => void) => {
    setBusy(true);
    setError('');
    try {
      await work();
      await reload();
      after?.();
      flash(message);
      return true;
    } catch (err: unknown) {
      const messageText = explain(err, missingText, failText);
      setSchemaMissing(messageText === missingText);
      setError(messageText);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const refresh = () => {
    void commit(async () => {}, t('已更新', 'Updated', 'ပြင်ပြီး'));
  };

  const openTab = (next: Tab, productId = '') => {
    setError('');
    setTab(next);
    if (next !== 'products') setStockFilter('all');
    if (productId) setFocusProductId(productId);
    setEditor(null);
  };

  const books = useMemo(() => {
    const products = data.products;
    const onHand = products.reduce((sum, row) => sum + row.qty_on_hand, 0);
    const withSupplier = products.reduce((sum, row) => sum + row.qty_with_supplier, 0);
    // cost_mmk holds the numeric amount; cost_currency says MMK vs RMB.
    let stockValueMmk = 0;
    let stockValueRmb = 0;
    for (const row of products) {
      const qty = row.qty_on_hand + row.qty_with_supplier;
      if (qty <= 0) continue;
      if (row.cost_currency === 'RMB') stockValueRmb += qty * row.cost_mmk;
      else stockValueMmk += qty * row.cost_mmk;
    }
    const empty = products.filter((row) => stockState(row) === 'empty');
    const onlySupplier = products.filter((row) => stockState(row) === 'supplier');
    return {
      onHand,
      withSupplier,
      stockValueMmk,
      stockValueRmb,
      boughtMmk: data.totals.purchase_mmk,
      boughtRmb: data.totals.purchase_rmb || 0,
      sold: data.totals.sale_mmk,
      profit: data.totals.sale_mmk - data.totals.sale_cost_mmk,
      empty,
      onlySupplier,
    };
  }, [data]);

  const nameOf = (id: string | null, list: { id: string; name: string }[]) => list.find((row) => row.id === id)?.name || '—';

  const filteredProducts = data.products.filter((row) => {
    const q = query.trim().toLowerCase();
    if (q && !`${row.name} ${row.brand} ${row.spec}`.toLowerCase().includes(q)) return false;
    if (stockFilter === 'empty') return stockState(row) === 'empty';
    if (stockFilter === 'supplier') return stockState(row) === 'supplier';
    return true;
  });

  const tabs: Array<[Tab, string]> = [
    ['home', t('总览', 'Overview', 'ခြုံငုံ')],
    ['products', t('商品', 'Products', 'ကုန်ပစ္စည်း')],
    ['purchase', t('进货', 'Purchases', 'ဝယ်ယူ')],
    ['consign', t('交给供应商', 'To supplier', 'ပေးသွင်းသူထံ')],
    ['sale', t('销售', 'Sales', 'ရောင်းချ')],
    ['parties', t('供应商和客户', 'People', 'လူစာရင်း')],
  ];

  const primaryCta = (() => {
    if (tab === 'products') return { label: t('添加商品', 'Add product', 'ကုန်ပစ္စည်းထည့်'), onClick: () => setEditor({ kind: 'product' }) };
    if (tab === 'purchase') return { label: t('记进货', 'Record purchase', 'ဝယ်ယူမှတ်'), onClick: () => openTab('purchase') };
    if (tab === 'sale') return { label: t('记销售', 'Record sale', 'ရောင်းချမှတ်'), onClick: () => openTab('sale') };
    if (tab === 'consign') return { label: consignMode === 'send' ? t('送去代卖', 'Send', 'ပို့မည်') : t('从供应商收回', 'Take back', 'ပြန်သိမ်း'), onClick: () => openTab('consign') };
    if (tab === 'parties') return { label: t('添加供应商', 'Add supplier', 'ထည့်'), onClick: () => setEditor({ kind: 'supplier' }) };
    return { label: t('添加商品', 'Add product', 'ကုန်ပစ္စည်းထည့်'), onClick: () => { setTab('products'); setEditor({ kind: 'product' }); } };
  })();

  const showPageError = Boolean(error) && !editor;

  return (
    <div style={shell}>
      <style>{deskCss}</style>
      <div style={stickyTop}>
        <header style={headRow}>
          <div>
            <div style={eyebrow}>{t('货物管理', 'GOODS ADMIN', 'ကုန် စီမံ')}</div>
            <h2 style={title}>{t('货物管理系统', 'Goods desk', 'ကုန်စနစ်')}</h2>
            <p style={lede}>
              {t(
                '销售记缅币。自己成本与库存成本按 CNY / MMK 分开显示（不换算汇率）。自己手上的货，和交给供应商代卖的货，分开记。',
                'Sales in MMK. Your spend and stock cost show CNY and MMK separately (no FX). Stock on hand and with suppliers stay apart.',
                'ကျပ်ငွေသာ။ လက်ထဲနှင့် ပေးသွင်းသူထံ ခွဲမှတ်သည်။',
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" className="gd-ghost" onClick={refresh} disabled={busy}>
              {t('刷新', 'Refresh', 'ပြန်ဖွင့်')}
            </button>
            {tab === 'home' || tab === 'products' || tab === 'parties' ? (
              <button type="button" className="gd-primary" onClick={primaryCta.onClick}>{primaryCta.label}</button>
            ) : null}
            <button type="button" className="gd-ghost" onClick={onClose}>
              {t('返回仪表盘', 'Back to dashboard', 'ဒက်ရှ်ဘုတ်')}
            </button>
          </div>
        </header>

        <nav style={tabBar} aria-label={t('货物管理系统', 'Goods desk', 'ကုန်စနစ်')}>
          {tabs.map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'gd-tab gd-tab-on' : 'gd-tab'} onClick={() => openTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div style={bodyPad}>
        {schemaMissing ? <p role="alert" style={alertStyle}>{missingText}</p> : null}
        {notice ? <p role="status" style={okStyle}>{notice}</p> : null}
        {showPageError && !schemaMissing ? <p role="alert" style={alertStyle}>{error}</p> : null}
        {!ready ? <p style={muted}>{t('正在读取…', 'Loading…', 'ဖွင့်နေသည်…')}</p> : null}

        {tab === 'home' ? (
          <HomeView
            t={t}
            books={books}
            onOpen={(next, productId) => openTab(next, productId)}
            onAdd={() => {
              setTab('products');
              setEditor({ kind: 'product' });
            }}
            onEmpty={() => {
              setStockFilter('empty');
              setTab('products');
            }}
            onSupplierOnly={() => {
              setStockFilter('supplier');
              setTab('products');
            }}
          />
        ) : null}

        {tab === 'products' ? (
          <ProductsView
            t={t}
            query={query}
            onQuery={setQuery}
            filter={stockFilter}
            onFilter={setStockFilter}
            rows={filteredProducts}
            holdings={data.holdings}
            suppliers={data.suppliers}
            onAdd={() => setEditor({ kind: 'product' })}
            exporting={exporting}
            onExport={() => {
              if (filteredProducts.length === 0) {
                setError(t('还没有可导出的商品', 'Nothing to export', 'ထုတ်ရန်မရှိ'));
                return;
              }
              setExporting(true);
              setError('');
              void exportGoodsPriceList(filteredProducts)
                .then(() => flash(t('价格表已导出', 'Price list exported', 'ထုတ်ပြီး')))
                .catch((err: unknown) => setError(err instanceof Error ? err.message : t('没有导出', 'Export failed', 'မထုတ်နိုင်')))
                .finally(() => setExporting(false));
            }}
            onEdit={(product) => setEditor({ kind: 'product', product })}
            onBuy={(id) => openTab('purchase', id)}
            onSend={(id) => {
              setConsignMode('send');
              openTab('consign', id);
            }}
            onSell={(id) => openTab('sale', id)}
          />
        ) : null}

        {tab === 'purchase' || tab === 'sale' || tab === 'consign' ? (
          <section>
            <div className="gd-flow-layout">
              <div className="gd-flow-main">
                {tab === 'consign' ? (
                  <div className="gd-consign-seg-row">
                    <span className="gd-seg-label">{t('代卖操作', 'Consign action', 'ပို့/ပြန်')}</span>
                    <div className="gd-seg">
                      <button type="button" className={consignMode === 'send' ? 'gd-seg-on' : 'gd-seg-off'} onClick={() => setConsignMode('send')}>
                        {t('送去代卖', 'Send', 'ပို့မည်')}
                      </button>
                      <button type="button" className={consignMode === 'recall' ? 'gd-seg-on' : 'gd-seg-off'} onClick={() => setConsignMode('recall')}>
                        {t('从供应商收回', 'Take back', 'ပြန်သိမ်း')}
                      </button>
                    </div>
                  </div>
                ) : null}
                {tab === 'purchase' ? (
                  <PurchaseSheet
                    key={`purchase-${focusProductId}`}
                    t={t}
                    busy={busy}
                    products={data.products}
                    suppliers={data.suppliers}
                    initialProductId={focusProductId}
                    pinSupplierId={pinSupplier}
                    savedTick={savedTick}
                    onNeedProducts={() => {
                      setTab('products');
                      setEditor({ kind: 'product' });
                    }}
                    onCreateSupplier={() => setEditor({ kind: 'supplier' })}
                    onSave={(input) => {
                      void commit(
                        () => applyGoodsPurchases(input),
                        t('已记下', 'Saved', 'မှတ်ပြီး'),
                        () => setSavedTick((n) => n + 1),
                      );
                    }}
                  />
                ) : (
                <MoveForm
                  key={`${tab}-${tab === 'consign' ? consignMode : 'x'}-${focusProductId}`}
                  t={t}
                  busy={busy}
                  kind={tab === 'sale' ? 'sale' : consignMode === 'send' ? 'consign' : 'recall'}
                  products={data.products}
                  suppliers={data.suppliers}
                  customers={data.customers}
                  holdings={data.holdings}
                  initialProductId={focusProductId}
                  pinSupplierId={pinSupplier}
                  pinCustomerId={pinCustomer}
                  savedTick={savedTick}
                  onNeedProducts={() => {
                    setTab('products');
                    setEditor({ kind: 'product' });
                  }}
                  onCreateSupplier={() => setEditor({ kind: 'supplier' })}
                  onCreateCustomer={() => setEditor({ kind: 'customer' })}
                  onSave={(input) => {
                    void commit(() => applyGoodsMovement(input), t('已记下', 'Saved', 'မှတ်ပြီး'), () => setSavedTick((n) => n + 1));
                  }}
                />
                )}
              </div>
              <div className="gd-flow-side">
                {tab === 'consign' && data.holdings.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={sectionTitle}>{t('供应商手里的货', 'Held by suppliers', 'ပေးသွင်းသူလက်ထဲ')}</h3>
                    <div className="gd-table-wrap" style={{ marginTop: 10 }}>
                      <div className="gd-table-scroll">
                        <div className="gd-hold gd-head">
                          <span>{t('商品', 'Product', 'ကုန်')}</span>
                          <span>{t('供应商', 'Supplier', 'ပေးသွင်းသူ')}</span>
                          <span style={{ textAlign: 'right' }}>{t('数量', 'Qty', 'အရေအတွက်')}</span>
                        </div>
                        {data.holdings.map((row) => (
                          <div key={`${row.product_id}-${row.supplier_id}`} className="gd-hold gd-line">
                            <span>{nameOf(row.product_id, data.products)}</span>
                            <span>{nameOf(row.supplier_id, data.suppliers)}</span>
                            <span className="gd-num" style={{ textAlign: 'right' }}>{row.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
                <Ledger
                  t={t}
                  compact
                  title={t('最近记录', 'Recent', 'မှတ်တမ်း')}
                  hint={tab === 'consign'
                    ? t('这里只看交给供应商和收回来的记录。', 'Only goods sent to suppliers and taken back.', 'ပို့ပြီး ပြန်သိမ်းထားသော မှတ်တမ်း။')
                    : t('下面是最近 80 笔里的记录。上面的累计数字是全部。', 'The list is the latest 80. The totals above are everything.', 'အောက်က ၈၀ ခု။ အပေါ်က စုစုပေါင်း။')}
                  rows={data.movements.filter((row) => {
                    if (tab === 'purchase') return row.kind === 'purchase';
                    if (tab === 'sale') return row.kind === 'sale';
                    return row.kind === 'consign' || row.kind === 'recall';
                  })}
                  data={data}
                  nameOf={nameOf}
                />
              </div>
            </div>
          </section>
        ) : null}

        {tab === 'parties' ? (
          <PartiesView
            t={t}
            suppliers={data.suppliers}
            customers={data.customers}
            onAdd={(kind) => setEditor({ kind })}
            onEdit={(kind, party) => setEditor({ kind, party })}
            onDelete={(kind, party) => {
              const label = kind === 'supplier' ? '供应商' : '客户';
              if (!window.confirm(`删除${label}「${party.name}」？`)) return;
              void commit(
                () => deleteGoodsParty(kind, party.id),
                kind === 'supplier' ? t('供应商已删除', 'Supplier removed', 'ဖျက်ပြီး') : t('客户已删除', 'Customer removed', 'ဖျက်ပြီး'),
                () => {
                  if (kind === 'supplier' && pinSupplier === party.id) setPinSupplier('');
                  if (kind === 'customer' && pinCustomer === party.id) setPinCustomer('');
                },
              );
            }}
          />
        ) : null}

        {tab === 'home' ? (
          <Ledger
            t={t}
            title={t('最近记录', 'Recent', 'မှတ်တမ်း')}
            hint={t('最近 80 笔里的前 8 笔。', 'Eight of the latest 80.', 'နောက်ဆုံး ၈၀ ထဲက ၈ ခု။')}
            rows={data.movements.slice(0, 8)}
            data={data}
            nameOf={nameOf}
          />
        ) : null}

        {editor?.kind === 'product' ? (
          <ProductDialog
            t={t}
            busy={busy}
            product={editor.product}
            suppliers={data.suppliers}
            error={editor ? error : ''}
            onClose={() => {
              setEditor(null);
              setError('');
            }}
            onSave={async (input) => {
              const ok = await commit(
                async () => {
                  const imageUrl = input.file ? await uploadGoodsImage(input.file) : input.image_url;
                  let supplierId = input.supplierId;
                  if (input.newSupplierName) {
                    supplierId = await saveGoodsParty('supplier', { name: input.newSupplierName, phone: '', note: '' });
                  }
                  const added = input.onHand - input.previousOnHand;
                  await saveGoodsProduct({
                    ...input,
                    image_url: imageUrl,
                    opening: added > 0 ? { supplierId: supplierId || '', qty: added, unit: input.cost_mmk, currency: input.cost_currency } : undefined,
                  });
                },
                input.id ? t('商品已修改', 'Product updated', 'ပြင်ပြီး') : t('商品已添加', 'Product added', 'ထည့်ပြီး'),
                () => setEditor(null),
              );
              return ok;
            }}
          />
        ) : null}
        {editor?.kind === 'supplier' || editor?.kind === 'customer' ? (
          <PartyDialog
            t={t}
            busy={busy}
            kind={editor.kind}
            party={editor.party}
            error={error}
            onClose={() => {
              setEditor(null);
              setError('');
            }}
            onSave={async (input) => {
              const kind = editor.kind === 'customer' ? 'customer' : 'supplier';
              let id = input.id || '';
              const ok = await commit(
                async () => {
                  id = await saveGoodsParty(kind, input);
                },
                kind === 'supplier' ? t('供应商已保存', 'Supplier saved', 'သိမ်းပြီး') : t('客户已保存', 'Customer saved', 'သိမ်းပြီး'),
                () => setEditor(null),
              );
              if (ok && kind === 'supplier') setPinSupplier(id);
              if (ok && kind === 'customer') setPinCustomer(id);
              return ok;
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

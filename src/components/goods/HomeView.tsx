import { formatGoodsMoney, type GoodsProduct } from '../../services/goodsTradeService';
import type { Copy, Tab } from './helpers';
import { mmk } from './helpers';
import { Attention, EmptyBlock, Metric } from './ui';

export function HomeView({
  t,
  books,
  onOpen,
  onAdd,
  onEmpty,
  onSupplierOnly,
}: {
  t: Copy;
  books: {
    onHand: number;
    withSupplier: number;
    stockValueMmk: number;
    stockValueRmb: number;
    boughtMmk: number;
    boughtRmb: number;
    sold: number;
    profit: number;
    empty: GoodsProduct[];
    onlySupplier: GoodsProduct[];
  };
  onOpen: (tab: Tab, productId?: string) => void;
  onAdd: () => void;
  onEmpty: () => void;
  onSupplierOnly: () => void;
}) {
  // Always show CNY + MMK on cost cards so CNY spend is never hidden behind a lone "0 MMK".
  const moneyLine = (mmkAmt: number, rmbAmt: number) => {
    const cny = formatGoodsMoney(rmbAmt, 'RMB'); // labels RMB as CNY
    const mmkPart = mmk(mmkAmt);
    if (mmkAmt <= 0 && rmbAmt <= 0) return `0 CNY / 0 MMK`;
    return `${cny} / ${mmkPart}`;
  };
  return (
    <div>
      <div className="gd-metrics">
        <Metric label={t('在手上', 'On hand', 'လက်ထဲ')} value={String(books.onHand)} hint={t('自己手里的件数', 'Units you hold', 'လက်ထဲ အရေအတွက်')} onClick={() => onOpen('products')} />
        <Metric label={t('在供应商处', 'With suppliers', 'ပေးသွင်းသူထံ')} value={String(books.withSupplier)} hint={t('代卖中的件数', 'Units on consignment', 'အပ်ထားသော')} onClick={() => onOpen('consign')} />
        <Metric label={t('库存成本', 'Stock value', 'လက်ကျန်တန်ဖိုး')} value={moneyLine(books.stockValueMmk, books.stockValueRmb)} hint={t('按进价估算（CNY / MMK）', 'At cost (CNY / MMK)', 'ဝယ်စျေးဖြင့်')} onClick={() => onOpen('products')} />
        <Metric label={t('毛利', 'Gross profit', 'အမြတ်')} value={mmk(books.profit)} hint={t('累计销售减去成本', 'Sales minus cost', 'ရောင်း − ဝယ်')} onClick={() => onOpen('sale')} tone={books.profit < 0 ? 'bad' : 'good'} />
        <Metric label={t('自己成本', 'My spend', 'ကိုယ်ကုန်ကျ')} value={moneyLine(books.boughtMmk, books.boughtRmb)} hint={t('已花出去的进货（CNY / MMK）', 'Money spent on purchases (CNY / MMK)', 'သုံးပြီးသော ဝယ်ယူငွေ')} onClick={() => onOpen('purchase')} />
        <Metric label={t('销售', 'Sales', 'ရောင်းချ')} value={mmk(books.sold)} hint={t('全部累计', 'All time', 'စုစုပေါင်း')} onClick={() => onOpen('sale')} />
      </div>

      <div className="gd-quick">
        <button type="button" className="gd-primary" onClick={onAdd}>{t('添加商品', 'Add product', 'ကုန်ပစ္စည်းထည့်')}</button>
        <button type="button" className="gd-ghost" onClick={() => onOpen('purchase')}>{t('记进货', 'Record purchase', 'ဝယ်ယူမှတ်')}</button>
        <button type="button" className="gd-ghost" onClick={() => onOpen('sale')}>{t('记销售', 'Record sale', 'ရောင်းချမှတ်')}</button>
        <button type="button" className="gd-ghost" onClick={() => onOpen('consign')}>{t('交给供应商', 'Send to supplier', 'ပေးသွင်းသူထံ')}</button>
        <button type="button" className="gd-ghost" onClick={() => onOpen('parties')}>{t('供应商和客户', 'People', 'လူစာရင်း')}</button>
      </div>

      {books.empty.length === 0 && books.onlySupplier.length === 0 && books.onHand + books.withSupplier === 0 ? (
        <EmptyBlock
          title={t('先把商品建档', 'Add a product first', 'ကုန်ပစ္စည်းအရင်ထည့်')}
          body={t('建好之后再记进货。需要代卖时，再交给供应商。', 'Then record a purchase. Send goods to a supplier only when they will sell for you.', 'ပြီးမှ ဝယ်ယူမှတ်ပါ။')}
          action={t('添加商品', 'Add product', 'ကုန်ပစ္စည်းထည့်')}
          onClick={onAdd}
        />
      ) : (
        <div className="gd-split">
          <Attention
            title={t('还没有货', 'No stock', 'ပစ္စည်းမရှိ')}
            rows={books.empty}
            empty={t('没有缺货的商品。', 'Nothing is out of stock.', 'ကုန်မရှိသော ပစ္စည်းမရှိ။')}
            action={t('查看', 'View', 'ကြည့်')}
            onOpen={onEmpty}
            onRow={(id) => onOpen('purchase', id)}
            rowAction={t('去进货', 'Buy', 'ဝယ်')}
          />
          <Attention
            title={t('货都在供应商处', 'Only with a supplier', 'ပေးသွင်းသူထံသာ')}
            rows={books.onlySupplier}
            empty={t('没有这种商品。', 'None.', 'မရှိ။')}
            action={t('查看', 'View', 'ကြည့်')}
            onOpen={onSupplierOnly}
            onRow={(id) => onOpen('sale', id)}
            rowAction={t('去销售', 'Sell', 'ရောင်း')}
          />
        </div>
      )}
    </div>
  );
}

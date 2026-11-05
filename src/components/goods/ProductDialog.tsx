import { useEffect, useRef, useState } from 'react';
import {
  formatGoodsMoney,
  type GoodsCurrency,
  type GoodsParty,
  type GoodsProduct,
} from '../../services/goodsTradeService';
import type { Copy } from './helpers';
import { GOODS_UNITS, readMoney, readQty } from './helpers';
import { dialogFoot, fine } from './styles';
import { Dialog, Field, MoneyField, useDialogKeys } from './ui';

export function ProductDialog({
  t,
  busy,
  product,
  suppliers,
  error,
  onClose,
  onSave,
}: {
  t: Copy;
  busy: boolean;
  product?: GoodsProduct;
  suppliers: GoodsParty[];
  error: string;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    name: string;
    brand: string;
    spec: string;
    unit: string;
    cost_mmk: number;
    cost_currency: GoodsCurrency;
    price_mmk: number;
    price_currency: GoodsCurrency;
    wholesale_mmk: number;
    wholesale_currency: GoodsCurrency;
    pieces_per_pack: number;
    image_url: string;
    file?: File | null;
    supplierId: string;
    newSupplierName: string;
    onHand: number;
    previousOnHand: number;
  }) => Promise<boolean>;
}) {
  const [name, setName] = useState(product?.name || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [spec, setSpec] = useState(product?.spec || '');
  const [unit, setUnit] = useState(product?.unit && (GOODS_UNITS as readonly string[]).includes(product.unit) ? product.unit : '个数');
  const [costCurrency, setCostCurrency] = useState<GoodsCurrency>(product?.cost_currency || 'MMK');
  const [priceCurrency, setPriceCurrency] = useState<GoodsCurrency>(product?.price_currency || 'MMK');
  const [wholesaleCurrency, setWholesaleCurrency] = useState<GoodsCurrency>(product?.wholesale_currency || 'MMK');
  const [cost, setCost] = useState(product ? String(product.cost_mmk) : '');
  const [price, setPrice] = useState(product ? String(product.price_mmk) : '');
  const [wholesale, setWholesale] = useState(product && product.pieces_per_pack > 0 ? String(product.wholesale_mmk) : '');
  const [piecesPerPack, setPiecesPerPack] = useState(product && product.pieces_per_pack > 0 ? String(product.pieces_per_pack) : '');
  const [supplierId, setSupplierId] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [onHand, setOnHand] = useState(product ? String(product.qty_on_hand) : '');
  const [imageUrl, setImageUrl] = useState(product?.image_url || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(product?.image_url || '');
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  useDialogKeys(onClose);
  useEffect(() => { nameRef.current?.focus(); }, []);
  useEffect(() => () => {
    if (previewRef.current.startsWith('blob:')) URL.revokeObjectURL(previewRef.current);
  }, []);

  const takeFile = (next: File | null) => {
    if (!next) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setLocalError(t('图片请用 JPG、PNG 或 WEBP', 'Use JPG, PNG, or WEBP', 'JPG PNG WEBP သုံးပါ'));
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setLocalError(t('图片不能超过 5MB', 'Image must be under 5MB', '5MB အောက်'));
      return;
    }
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setLocalError('');
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const clearImage = () => {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setFile(null);
    setImageUrl('');
    setPreview('');
  };

  const submit = () => {
    if (!name.trim()) {
      setLocalError(t('请填写商品名称', 'Enter a name', 'အမည်ထည့်ပါ'));
      return;
    }
    const costNum = cost.trim() === '' ? 0 : readMoney(cost);
    const priceNum = price.trim() === '' ? 0 : readMoney(price);
    const packNum = piecesPerPack.trim() === '' ? null : readQty(piecesPerPack);
    const wholesaleNum = wholesale.trim() === '' ? null : readMoney(wholesale);
    if (costNum == null || priceNum == null) {
      setLocalError(t('进价和单价要是整数，可以是 0', 'Cost and unit price must be whole amounts, or 0', 'ဈေးနှုန်း ဂဏန်းပြည့်'));
      return;
    }
    if (wholesale.trim() !== '' && wholesaleNum == null) {
      setLocalError(t('批发价要是整数', 'Wholesale price must be a whole amount', 'လက်ကားဈေး ဂဏန်းပြည့်'));
      return;
    }
    if (wholesaleNum != null && packNum == null) {
      setLocalError(t('请填写 1 件里面有几个', 'Enter how many pieces are in one pack', '၁ ခုတွင် ဘယ်နှစ်လုံး'));
      return;
    }
    if (packNum != null && wholesaleNum == null) {
      setLocalError(t('请填写每件的批发价', 'Enter the price of one pack', 'တစ်ခုဈေးထည့်ပါ'));
      return;
    }
    const previousOnHand = product?.qty_on_hand ?? 0;
    const onHandNum = onHand.trim() === '' ? 0 : readQty(onHand);
    if (onHand.trim() !== '' && onHandNum == null && onHand.trim() !== '0') {
      setLocalError(t('在手要是大于或等于 0 的整数', 'On-hand quantity must be a whole number', 'လက်ထဲ အရေအတွက်'));
      return;
    }
    const nextOnHand = onHand.trim() === '' || onHand.trim() === '0' ? 0 : onHandNum || 0;
    if (nextOnHand < previousOnHand) {
      setLocalError(t('在手不能在这里减少，请用销售或交给供应商', 'On-hand stock cannot be reduced here', 'လက်ထဲ လျှော့မရ'));
      return;
    }
    const creatingSupplier = supplierId === '__new__';
    if (nextOnHand > previousOnHand && !supplierId) {
      setLocalError(t('有在手数量时，请选择供应商', 'Choose a supplier when you have stock on hand', 'ပေးသွင်းသူရွေးပါ'));
      return;
    }
    if (creatingSupplier && !newSupplierName.trim()) {
      setLocalError(t('请填写新供应商的名称', 'Enter the new supplier', 'ပေးသွင်းသူအမည်'));
      return;
    }
    setLocalError('');
    setSubmitted(true);
    void onSave({
      id: product?.id,
      name,
      brand,
      spec,
      unit,
      cost_mmk: costNum,
      cost_currency: costCurrency,
      price_mmk: priceNum,
      price_currency: priceCurrency,
      wholesale_mmk: wholesaleNum ?? 0,
      wholesale_currency: wholesaleCurrency,
      pieces_per_pack: packNum ?? 0,
      image_url: file ? '' : imageUrl,
      file,
      supplierId: creatingSupplier ? '' : supplierId,
      newSupplierName: creatingSupplier ? newSupplierName.trim() : '',
      onHand: nextOnHand,
      previousOnHand,
    });
  };

  const shownPrice = readMoney(price);
  const shownWholesale = readMoney(wholesale);
  const shownPack = readQty(piecesPerPack);
  const previousOnHand = product?.qty_on_hand ?? 0;
  const typedOnHand = onHand.trim() === '' ? 0 : readQty(onHand);
  const onHandInvalid = onHand.trim() !== '' && onHand.trim() !== '0' && typedOnHand == null;
  const nextOnHand = onHandInvalid ? null : (onHand.trim() === '' || onHand.trim() === '0' ? 0 : typedOnHand || 0);
  const supplierName = supplierId === '__new__'
    ? newSupplierName.trim()
    : suppliers.find((row) => row.id === supplierId)?.name || '';
  const stockIncrease = nextOnHand != null && nextOnHand > previousOnHand;
  const stockDecrease = nextOnHand != null && nextOnHand < previousOnHand;
  const stockNeedsSupplier = stockIncrease && !supplierName;

  return (
    <Dialog
      wide
      eyebrow="PRODUCT"
      title={product ? t('修改商品', 'Edit product', 'ပြင်') : t('添加商品', 'Add product', 'ထည့်')}
      onClose={onClose}
      footer={(
        <div style={{ ...dialogFoot, marginTop: 0, borderTop: 0, paddingTop: 0 }}>
          <button type="button" className="gd-ghost" onClick={onClose}>{t('取消', 'Cancel', 'ပယ်')}</button>
          <button type="button" className="gd-primary" disabled={busy || !name.trim()} onClick={submit}>
            {busy ? t('保存中…', 'Saving…', 'သိမ်းနေသည်…') : t('保存商品', 'Save product', 'သိမ်း')}
          </button>
        </div>
      )}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="gd-product-layout">
          <div>
            <label
              className={dragOver ? 'gd-drop is-over' : 'gd-drop'}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                takeFile(e.dataTransfer.files?.[0] || null);
              }}
            >
              {preview ? <img src={preview} alt="" /> : (
                <span>
                  {t('上传图片', 'Add a photo', 'ပုံထည့်')}
                  <br />
                  <span style={{ opacity: 0.7 }}>{t('点击或拖进来', 'Click or drop', 'နှိပ် သို့မဟုတ် ဆွဲထည့်')}</span>
                </span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  takeFile(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={fine}>{preview ? '' : '5MB'}</span>
              {preview ? <button type="button" className="gd-link" onClick={clearImage}>{t('移除', 'Remove', 'ဖယ်')}</button> : <span style={fine}>JPG / PNG / WEBP</span>}
            </div>
          </div>
          <div className="gd-form-tight">
            <div className="gd-price-pair">
              <Field label={t('商品名称', 'Name', 'အမည်')}><input ref={nameRef} className="gd-field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></Field>
              <Field label={t('品牌', 'Brand', 'အမှတ်တံဆိပ်')}><input className="gd-field" value={brand} onChange={(e) => setBrand(e.target.value)} autoComplete="off" /></Field>
            </div>
            <div className="gd-price-pair">
              <Field label={t('规格', 'Spec', 'အမျိုးအစား')}><input className="gd-field" value={spec} onChange={(e) => setSpec(e.target.value)} autoComplete="off" /></Field>
              <Field label={t('单位', 'Unit', 'ယူနစ်')}>
                <select className="gd-field" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {GOODS_UNITS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </div>
            <MoneyField label={t('进价 · 仅自己看', 'Cost · private', 'ဝယ်ဈေး')} currency={costCurrency} amount={cost} onCurrency={setCostCurrency} onAmount={setCost} />
            <div className="gd-price-pair">
              <Field label={t('供应商', 'Supplier', 'ပေးသွင်းသူ')}>
                <select className="gd-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">{t('先不选', 'None yet', 'မရွေးသေး')}</option>
                  {suppliers.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                  <option value="__new__">{t('新建供应商', 'New supplier', 'အသစ်')}</option>
                </select>
              </Field>
              <Field label={t('在手', 'On hand', 'လက်ထဲ')}>
                <input className="gd-field gd-num" inputMode="numeric" value={onHand} onChange={(e) => setOnHand(e.target.value)} autoComplete="off" placeholder="0" />
              </Field>
            </div>
            {supplierId === '__new__' ? (
              <Field label={t('新供应商名称', 'New supplier name', 'အမည်')}>
                <input className="gd-field" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} autoComplete="off" />
              </Field>
            ) : null}
            {stockIncrease ? (
              <p className={stockNeedsSupplier ? 'gd-stock-note is-warn' : 'gd-stock-note'} role="status">
                {stockNeedsSupplier
                  ? t(
                    `在手 ${previousOnHand} → ${nextOnHand}，按进价记一笔进货。请先选择供应商。`,
                    `On hand ${previousOnHand} → ${nextOnHand}. This records a purchase. Choose a supplier.`,
                    `လက်ထဲ ${previousOnHand} → ${nextOnHand}။ ပေးသွင်းသူရွေးပါ။`,
                  )
                  : t(
                    `在手 ${previousOnHand} → ${nextOnHand}，按进价记一笔进货给${supplierName}。`,
                    `On hand ${previousOnHand} → ${nextOnHand}. Records a purchase from ${supplierName}.`,
                    `လက်ထဲ ${previousOnHand} → ${nextOnHand}။ ${supplierName} ထံ ဝယ်ယူမှတ်မည်။`,
                  )}
              </p>
            ) : null}
            {stockDecrease ? (
              <p className="gd-stock-note is-warn" role="status">
                {t('在手不能在这里减少，请用销售或交给供应商。', 'On-hand stock cannot be reduced here. Sell or send it to a supplier.', 'လက်ထဲ လျှော့မရ။ ရောင်း သို့မဟုတ် ပို့ပါ။')}
              </p>
            ) : null}
            {onHandInvalid ? (
              <p className="gd-stock-note is-warn" role="status">
                {t('在手要是大于或等于 0 的整数', 'On-hand quantity must be a whole number', 'လက်ထဲ အရေအတွက်')}
              </p>
            ) : null}
            <div className="gd-customer-prices">
              <div className="gd-kicker">{t('给客户的价格', 'Customer prices', 'ဖောက်သည်ဈေး')}</div>
              <div className="gd-price-trio">
                <MoneyField label={t('单价 · 每个', 'Each piece', 'တစ်လုံး')} currency={priceCurrency} amount={price} onCurrency={setPriceCurrency} onAmount={setPrice} />
                <MoneyField label={t('批发价 · 每件', 'Each pack', 'တစ်ခု')} currency={wholesaleCurrency} amount={wholesale} onCurrency={setWholesaleCurrency} onAmount={setWholesale} />
                <Field label={t('1件有几个', 'Pieces in a pack', '၁ခုတွင်')}>
                  <input className="gd-field gd-num" inputMode="numeric" value={piecesPerPack} onChange={(e) => setPiecesPerPack(e.target.value)} autoComplete="off" placeholder="50" />
                </Field>
              </div>
            </div>
          </div>
        </div>
        <div className="gd-price-preview">
          <span>{t('客户看到', 'Customer sees', 'ဖောက်သည်မြင်')}</span>
          <strong className="gd-num">
            {shownPrice == null ? t('填写单价', 'Enter the unit price', 'ဈေးထည့်') : formatGoodsMoney(shownPrice, priceCurrency)}
            {shownWholesale != null && shownPack != null ? ` · ${t('每件', 'per pack', 'တစ်ခု')} ${formatGoodsMoney(shownWholesale, wholesaleCurrency)} · 1${t('件', 'pack', 'ခု')}=${shownPack}${t('个', 'pcs', 'လုံး')}` : ''}
          </strong>
        </div>
        {localError || (submitted && error) ? <p role="alert" className="gd-form-error">{localError || error}</p> : null}
      </form>
    </Dialog>
  );
}

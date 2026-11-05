import { supabase } from './supabase';
import { rewritePublicStorageUrl, SUPABASE_UPSTREAM_HOST } from '../utils/supabaseBrowserUrl';

export type GoodsCurrency = 'MMK' | 'RMB';

export type GoodsProduct = {
  id: string;
  name: string;
  brand: string;
  spec: string;
  unit: string;
  cost_currency: GoodsCurrency;
  cost_mmk: number;
  price_currency: GoodsCurrency;
  price_mmk: number;
  wholesale_currency: GoodsCurrency;
  wholesale_mmk: number;
  pieces_per_pack: number;
  qty_on_hand: number;
  qty_with_supplier: number;
  image_url: string;
};

export type GoodsParty = {
  id: string;
  name: string;
  phone: string;
  note: string;
};

export type GoodsHolding = {
  product_id: string;
  supplier_id: string;
  qty: number;
};

export type GoodsMovementKind = 'purchase' | 'consign' | 'recall' | 'sale';

export type GoodsMovement = {
  id: string;
  kind: GoodsMovementKind;
  product_id: string;
  supplier_id: string | null;
  customer_id: string | null;
  qty: number;
  unit_mmk: number;
  unit_currency: GoodsCurrency;
  total_mmk: number;
  cost_mmk: number;
  note: string;
  occurred_on: string;
};

export type GoodsTotals = {
  purchase_mmk: number;
  purchase_rmb: number;
  sale_mmk: number;
  sale_cost_mmk: number;
};

export type GoodsSnapshot = {
  products: GoodsProduct[];
  suppliers: GoodsParty[];
  customers: GoodsParty[];
  holdings: GoodsHolding[];
  movements: GoodsMovement[];
  totals: GoodsTotals;
};


/** Store upstream Storage URLs only — never localhost /__sb proxy forms (CSP blocks http). */
export function toCanonicalGoodsImageUrl(url: string): string {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^(blob:|data:|file:|content:)/i.test(raw)) return raw;
  const publicMatch = raw.match(/\/storage\/v1\/object\/public\/([^?#]+)/i);
  if (publicMatch) {
    return `https://${SUPABASE_UPSTREAM_HOST}/storage/v1/object/public/${publicMatch[1]}`;
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  const pathOnly = raw.replace(/^\/+/, '').replace(/^product_images\//, '');
  return `https://${SUPABASE_UPSTREAM_HOST}/storage/v1/object/public/product_images/${pathOnly}`;
}

export function displayGoodsImageUrl(url: string): string {
  return rewritePublicStorageUrl(toCanonicalGoodsImageUrl(url));
}

export const emptyGoodsSnapshot = (): GoodsSnapshot => ({
  products: [],
  suppliers: [],
  customers: [],
  holdings: [],
  movements: [],
  totals: { purchase_mmk: 0, purchase_rmb: 0, sale_mmk: 0, sale_cost_mmk: 0 },
});

function asCurrency(value: unknown): GoodsCurrency {
  const raw = String(value || '').trim().toUpperCase();
  // Stored "CNY" is the same bucket as internal RMB (display as CNY on overview).
  if (raw === 'RMB' || raw === 'CNY') return 'RMB';
  return 'MMK';
}

function asProduct(row: GoodsProduct): GoodsProduct {
  return {
    ...row,
    name: row.name || '',
    brand: row.brand || '',
    spec: row.spec || '',
    unit: row.unit || '个数',
    cost_currency: asCurrency(row.cost_currency),
    cost_mmk: Number(row.cost_mmk) || 0,
    price_currency: asCurrency(row.price_currency),
    price_mmk: Number(row.price_mmk) || 0,
    wholesale_currency: asCurrency(row.wholesale_currency),
    wholesale_mmk: Number(row.wholesale_mmk) || 0,
    pieces_per_pack: Number(row.pieces_per_pack) || 0,
    qty_on_hand: Number(row.qty_on_hand) || 0,
    qty_with_supplier: Number(row.qty_with_supplier) || 0,
    image_url: displayGoodsImageUrl(row.image_url || ''),
  };
}

export function formatGoodsMoney(amount: number, currency: GoodsCurrency = 'MMK'): string {
  const label = currency === 'RMB' ? 'CNY' : currency;
  return `${Math.round(amount).toLocaleString('en-US')} ${label}`;
}

const GOODS_SETTINGS_KEY = 'goods.trade';

type GoodsDoc = {
  products: GoodsProduct[];
  suppliers: GoodsParty[];
  customers: GoodsParty[];
  holdings: GoodsHolding[];
  movements: GoodsMovement[];
};

function asParty(row: GoodsParty): GoodsParty {
  return { id: row.id, name: row.name || '', phone: row.phone || '', note: row.note || '' };
}

function asDoc(value: unknown): GoodsDoc {
  const raw = value && typeof value === 'object' ? (value as Partial<GoodsDoc>) : {};
  return {
    products: Array.isArray(raw.products) ? raw.products.map(asProduct) : [],
    suppliers: Array.isArray(raw.suppliers) ? raw.suppliers.map(asParty) : [],
    customers: Array.isArray(raw.customers) ? raw.customers.map(asParty) : [],
    holdings: Array.isArray(raw.holdings)
      ? raw.holdings
          .map((row) => ({ ...row, qty: Number(row.qty) || 0 }))
          .filter((row) => row.qty > 0)
      : [],
    movements: Array.isArray(raw.movements)
      ? raw.movements.map((row) => ({
          ...row,
          qty: Number(row.qty) || 0,
          unit_mmk: Number(row.unit_mmk) || 0,
          unit_currency: asCurrency(row.unit_currency),
          total_mmk: Number(row.total_mmk) || 0,
          cost_mmk: Number(row.cost_mmk) || 0,
        }))
      : [],
  };
}

async function readDoc(): Promise<GoodsDoc> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_value')
    .eq('settings_key', GOODS_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return asDoc((data as { settings_value?: unknown } | null)?.settings_value);
}

async function writeDoc(doc: GoodsDoc): Promise<void> {
  // Always persist canonical Storage URLs — read path may rewrite for display (/__sb).
  const payload: GoodsDoc = {
    ...doc,
    products: doc.products.map((row) => ({
      ...row,
      image_url: toCanonicalGoodsImageUrl(row.image_url || ''),
    })),
  };
  const { error } = await supabase.from('system_settings').upsert(
    {
      category: 'goods',
      settings_key: GOODS_SETTINGS_KEY,
      settings_value: payload,
      description: '缅甸货物管理',
      updated_by: 'goods-desk',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'settings_key' },
  );
  if (error) throw new Error(error.message);
}

function snapshotOf(doc: GoodsDoc): GoodsSnapshot {
  const movements = doc.movements
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.occurred_on === b.row.occurred_on ? b.index - a.index : a.row.occurred_on < b.row.occurred_on ? 1 : -1))
    .map((item) => item.row);
  const totals = movements.reduce(
    (acc, row) => {
      if (row.kind === 'purchase') {
        if (row.unit_currency === 'RMB') acc.purchase_rmb += row.total_mmk;
        else acc.purchase_mmk += row.total_mmk;
      }
      if (row.kind === 'sale' && row.unit_currency !== 'RMB') {
        acc.sale_mmk += row.total_mmk;
        acc.sale_cost_mmk += row.cost_mmk;
      }
      return acc;
    },
    { purchase_mmk: 0, purchase_rmb: 0, sale_mmk: 0, sale_cost_mmk: 0 },
  );
  return {
    products: [...doc.products].sort((a, b) => a.name.localeCompare(b.name, 'zh')),
    suppliers: [...doc.suppliers].sort((a, b) => a.name.localeCompare(b.name, 'zh')),
    customers: [...doc.customers].sort((a, b) => a.name.localeCompare(b.name, 'zh')),
    holdings: doc.holdings,
    movements: movements.slice(0, 80),
    totals,
  };
}

function heldQty(doc: GoodsDoc, productId: string, supplierId: string): number {
  return doc.holdings.find((row) => row.product_id === productId && row.supplier_id === supplierId)?.qty ?? 0;
}

function setHeld(doc: GoodsDoc, productId: string, supplierId: string, qty: number) {
  const index = doc.holdings.findIndex((row) => row.product_id === productId && row.supplier_id === supplierId);
  if (qty <= 0) {
    if (index >= 0) doc.holdings.splice(index, 1);
    return;
  }
  if (index >= 0) doc.holdings[index] = { product_id: productId, supplier_id: supplierId, qty };
  else doc.holdings.push({ product_id: productId, supplier_id: supplierId, qty });
}

export async function uploadGoodsImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('图片请用 JPG、PNG 或 WEBP');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('图片不能超过 5MB');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `goods/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('product_images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  // Persist upstream URL; display path rewrites to /__sb (or Admin proxy on local).
  return toCanonicalGoodsImageUrl(
    `https://${SUPABASE_UPSTREAM_HOST}/storage/v1/object/public/product_images/${path}`,
  );
}

/** 单位是「件数」且有批发价时用批发价，否则用单价（按个）。与数量无关。 */
export function customerUnitPrice(product: Pick<GoodsProduct, 'unit' | 'price_mmk' | 'wholesale_mmk'>): number {
  if (product.unit === '件数' && product.wholesale_mmk > 0) return product.wholesale_mmk;
  return product.price_mmk;
}

/** 进货后的加权成本。有库存时货币必须和原来的成本相同。 */
export function nextPurchaseCost(
  product: Pick<GoodsProduct, 'qty_on_hand' | 'qty_with_supplier' | 'cost_mmk' | 'cost_currency'>,
  qty: number,
  unit: number,
  currency: GoodsCurrency,
): { mixed: true } | { mixed: false; basis: number; nextCost: number; nextOnHand: number } {
  const basis = product.qty_on_hand + product.qty_with_supplier;
  const rounded = Math.round(unit);
  if (basis > 0 && product.cost_currency !== currency) return { mixed: true };
  const total = qty * rounded;
  const nextCost = basis > 0 ? Math.floor((basis * product.cost_mmk + total) / (basis + qty)) : rounded;
  return { mixed: false, basis, nextCost, nextOnHand: product.qty_on_hand + qty };
}

export function customerPriceCurrency(product: Pick<GoodsProduct, 'unit' | 'price_currency' | 'wholesale_currency' | 'wholesale_mmk'>): GoodsCurrency {
  if (product.unit === '件数' && product.wholesale_mmk > 0) return product.wholesale_currency;
  return product.price_currency;
}

export async function loadGoodsTrade(): Promise<GoodsSnapshot> {
  return snapshotOf(await readDoc());
}

export async function saveGoodsProduct(input: {
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
  image_url?: string;
  opening?: { supplierId: string; qty: number; unit: number; currency: GoodsCurrency };
}): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('请填写商品名称');
  const doc = await readDoc();
  const next = {
    name,
    brand: input.brand.trim(),
    spec: input.spec.trim(),
    unit: input.unit.trim() || '个数',
    cost_currency: input.cost_currency,
    cost_mmk: Math.max(0, Math.round(input.cost_mmk)),
    price_currency: input.price_currency,
    price_mmk: Math.max(0, Math.round(input.price_mmk)),
    wholesale_currency: input.wholesale_currency,
    wholesale_mmk: Math.max(0, Math.round(input.wholesale_mmk)),
    pieces_per_pack: Math.max(0, Math.round(input.pieces_per_pack)),
    image_url: toCanonicalGoodsImageUrl(input.image_url || ''),
  };
  let product: GoodsProduct;
  let previousCost = next.cost_mmk;
  let previousCurrency = next.cost_currency;
  let previousBasis = 0;
  if (input.id) {
    const current = doc.products.find((row) => row.id === input.id);
    if (!current) throw new Error('没有这个商品');
    previousCost = current.cost_mmk;
    previousCurrency = current.cost_currency;
    previousBasis = current.qty_on_hand + current.qty_with_supplier;
    Object.assign(current, next);
    product = current;
  } else {
    product = {
      id: crypto.randomUUID(),
      qty_on_hand: 0,
      qty_with_supplier: 0,
      ...next,
    };
    doc.products.push(product);
  }
  const opening = input.opening;
  if (opening && opening.qty > 0) {
    if (!opening.supplierId || !doc.suppliers.some((row) => row.id === opening.supplierId)) {
      throw new Error('请选择供应商');
    }
    if (previousBasis > 0 && previousCurrency !== opening.currency) {
      throw new Error('进价货币和原来的成本不一样，不能混在一起算');
    }
    const total = opening.qty * opening.unit;
    product.cost_mmk = previousBasis > 0 ? Math.floor((previousBasis * previousCost + total) / (previousBasis + opening.qty)) : opening.unit;
    product.cost_currency = opening.currency;
    product.qty_on_hand += opening.qty;
    doc.movements.push({
      id: crypto.randomUUID(),
      kind: 'purchase',
      product_id: product.id,
      supplier_id: opening.supplierId,
      customer_id: null,
      qty: opening.qty,
      unit_mmk: opening.unit,
      unit_currency: opening.currency,
      total_mmk: total,
      cost_mmk: total,
      note: '',
      occurred_on: new Date().toISOString().slice(0, 10),
    });
  }
  await writeDoc(doc);
  return product.id;
}

export async function saveGoodsParty(
  kind: 'supplier' | 'customer',
  input: { id?: string; name: string; phone: string; note: string },
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error(kind === 'supplier' ? '请填写供应商' : '请填写客户');
  const doc = await readDoc();
  const list = kind === 'supplier' ? doc.suppliers : doc.customers;
  if (input.id) {
    const current = list.find((row) => row.id === input.id);
    if (!current) throw new Error(kind === 'supplier' ? '没有这个供应商' : '没有这个客户');
    current.name = name;
    current.phone = input.phone.trim();
    current.note = input.note.trim();
    await writeDoc(doc);
    return input.id;
  }
  const id = crypto.randomUUID();
  list.push({ id, name, phone: input.phone.trim(), note: input.note.trim() });
  await writeDoc(doc);
  return id;
}

export async function deleteGoodsParty(kind: 'supplier' | 'customer', id: string): Promise<void> {
  const doc = await readDoc();
  if (kind === 'supplier' && doc.holdings.some((row) => row.supplier_id === id && row.qty > 0)) {
    throw new Error('这个供应商手里还有货，先收回再删除');
  }
  const list = kind === 'supplier' ? doc.suppliers : doc.customers;
  const next = list.filter((row) => row.id !== id);
  if (next.length === list.length) throw new Error(kind === 'supplier' ? '没有这个供应商' : '没有这个客户');
  if (kind === 'supplier') doc.suppliers = next;
  else doc.customers = next;
  await writeDoc(doc);
}

export async function applyGoodsMovement(input: {
  kind: GoodsMovementKind;
  productId: string;
  supplierId?: string;
  customerId?: string;
  qty: number;
  unitMmk: number;
  unitCurrency?: GoodsCurrency;
  note: string;
  occurredOn: string;
}): Promise<void> {
  if (!input.productId) throw new Error('请选择商品');
  if (!Number.isInteger(input.qty) || input.qty <= 0) throw new Error('数量要是大于 0 的整数');
  if (!Number.isFinite(input.unitMmk) || input.unitMmk < 0) throw new Error('金额不能小于 0');
  const doc = await readDoc();
  const product = doc.products.find((row) => row.id === input.productId);
  if (!product) throw new Error('没有这个商品');
  const supplierId = input.supplierId || null;
  const customerId = input.customerId || null;
  const qty = input.qty;
  const unit = Math.round(input.unitMmk);
  const today = new Date().toISOString().slice(0, 10);
  const movement: GoodsMovement = {
    id: crypto.randomUUID(),
    kind: input.kind,
    product_id: product.id,
    supplier_id: supplierId,
    customer_id: input.kind === 'sale' ? customerId : null,
    qty,
    unit_mmk: input.kind === 'purchase' || input.kind === 'sale' ? unit : 0,
    unit_currency: (input.kind === 'sale' || input.kind === 'purchase') ? asCurrency(input.unitCurrency) : 'MMK',
    total_mmk: 0,
    cost_mmk: 0,
    note: input.note.trim(),
    occurred_on: input.occurredOn || today,
  };

  if (input.kind === 'purchase') {
    if (!supplierId || !doc.suppliers.some((row) => row.id === supplierId)) throw new Error('请选择供应商');
    const total = qty * unit;
    const currency = asCurrency(input.unitCurrency);
    const priced = nextPurchaseCost(product, qty, unit, currency);
    if (priced.mixed) throw new Error('进价货币和原来的成本不一样，不能混在一起算');
    product.cost_mmk = priced.nextCost;
    product.cost_currency = currency;
    product.qty_on_hand += qty;
    movement.total_mmk = total;
    movement.cost_mmk = total;
  } else if (input.kind === 'consign') {
    if (!supplierId || !doc.suppliers.some((row) => row.id === supplierId)) throw new Error('请选择供应商');
    if (product.qty_on_hand < qty) throw new Error('手上的货不够');
    product.qty_on_hand -= qty;
    product.qty_with_supplier += qty;
    setHeld(doc, product.id, supplierId, heldQty(doc, product.id, supplierId) + qty);
  } else if (input.kind === 'recall') {
    if (!supplierId) throw new Error('请选择供应商');
    const held = heldQty(doc, product.id, supplierId);
    if (held < qty) throw new Error('这个供应商手里的货不够');
    setHeld(doc, product.id, supplierId, held - qty);
    product.qty_on_hand += qty;
    product.qty_with_supplier = Math.max(0, product.qty_with_supplier - qty);
  } else if (input.kind === 'sale') {
    if (!customerId || !doc.customers.some((row) => row.id === customerId)) throw new Error('请选择客户');
    movement.total_mmk = qty * unit;
    movement.cost_mmk = qty * product.cost_mmk;
    if (supplierId) {
      const held = heldQty(doc, product.id, supplierId);
      if (held < qty) throw new Error('这个供应商手里的货不够');
      setHeld(doc, product.id, supplierId, held - qty);
      product.qty_with_supplier = Math.max(0, product.qty_with_supplier - qty);
    } else {
      if (product.qty_on_hand < qty) throw new Error('手上的货不够');
      product.qty_on_hand -= qty;
    }
  } else {
    throw new Error('未知类型');
  }

  doc.movements.push(movement);
  await writeDoc(doc);
}

export type GoodsPurchaseLine = {
  productId: string;
  qty: number;
  unitMmk: number;
  unitCurrency?: GoodsCurrency;
};

/** 一张进货单一次写入。同一件货出现多行时，按顺序接着加权。 */
export async function applyGoodsPurchases(input: {
  supplierId: string;
  note: string;
  occurredOn: string;
  lines: GoodsPurchaseLine[];
}): Promise<void> {
  if (!input.supplierId) throw new Error('请选择供应商');
  if (!input.lines.length) throw new Error('请至少加一件商品');
  const doc = await readDoc();
  if (!doc.suppliers.some((row) => row.id === input.supplierId)) throw new Error('请选择供应商');
  const today = new Date().toISOString().slice(0, 10);
  const note = input.note.trim();
  const occurred = input.occurredOn || today;

  for (const line of input.lines) {
    if (!line.productId) throw new Error('请选择商品');
    if (!Number.isInteger(line.qty) || line.qty <= 0) throw new Error('数量要是大于 0 的整数');
    if (!Number.isFinite(line.unitMmk) || line.unitMmk < 0) throw new Error('金额不能小于 0');
    const product = doc.products.find((row) => row.id === line.productId);
    if (!product) throw new Error('没有这个商品');
    const currency = asCurrency(line.unitCurrency);
    const priced = nextPurchaseCost(product, line.qty, line.unitMmk, currency);
    if (priced.mixed) throw new Error(`${product.name} 的进价货币和原来的成本不一样，不能混在一起算`);
  }

  for (const line of input.lines) {
    const product = doc.products.find((row) => row.id === line.productId);
    if (!product) throw new Error('没有这个商品');
    const unit = Math.round(line.unitMmk);
    const currency = asCurrency(line.unitCurrency);
    const priced = nextPurchaseCost(product, line.qty, unit, currency);
    if (priced.mixed) throw new Error(`${product.name} 的进价货币和原来的成本不一样，不能混在一起算`);
    const total = line.qty * unit;
    product.cost_mmk = priced.nextCost;
    product.cost_currency = currency;
    product.qty_on_hand += line.qty;
    doc.movements.push({
      id: crypto.randomUUID(),
      kind: 'purchase',
      product_id: product.id,
      supplier_id: input.supplierId,
      customer_id: null,
      qty: line.qty,
      unit_mmk: unit,
      unit_currency: currency,
      total_mmk: total,
      cost_mmk: total,
      note,
      occurred_on: occurred,
    });
  }

  await writeDoc(doc);
}

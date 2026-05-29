export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  stock: number;
  is_available?: boolean;
  sort_order?: number;
};

export type ProductWithVariants = {
  price: number;
  original_price?: number | null;
  stock: number;
  variants?: unknown;
};

function newVariantId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeProductVariants(raw: unknown): ProductVariant[] {
  if (!Array.isArray(raw)) return [];
  const parsed: ProductVariant[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    const price = Number(o.price);
    if (!name || !Number.isFinite(price) || price <= 0) return;
    const stockRaw = Number(o.stock);
    parsed.push({
      id: String(o.id || newVariantId()),
      name,
      price,
      original_price:
        o.original_price != null && o.original_price !== ''
          ? Number(o.original_price)
          : undefined,
      stock: Number.isFinite(stockRaw) ? stockRaw : -1,
      is_available: o.is_available !== false,
      sort_order: Number.isFinite(Number(o.sort_order)) ? Number(o.sort_order) : index,
    });
  });
  return parsed.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function productHasVariants(product: { variants?: unknown }): boolean {
  return normalizeProductVariants(product.variants).length > 0;
}

export function getAvailableVariants(product: { variants?: unknown }): ProductVariant[] {
  return normalizeProductVariants(product.variants).filter((v) => v.is_available !== false);
}

export function resolveProductVariant(
  product: { variants?: unknown },
  variantId?: string | null,
): ProductVariant | null {
  const variants = getAvailableVariants(product);
  if (!variants.length || !variantId) return null;
  return variants.find((v) => v.id === variantId) ?? null;
}

export function getProductDisplayPrice(product: ProductWithVariants): number {
  const variants = getAvailableVariants(product);
  if (!variants.length) return product.price;
  return Math.min(...variants.map((v) => v.price));
}

export function formatProductPriceLabel(
  product: ProductWithVariants,
  lang: 'zh' | 'en' | 'my' = 'zh',
): string {
  const price = getProductDisplayPrice(product);
  const suffix = productHasVariants(product)
    ? lang === 'zh'
      ? ' 起'
      : lang === 'my'
        ? ' မှ'
        : ' from'
    : '';
  return `${price.toLocaleString()} MMK${suffix}`;
}

export function syncProductAggregateFromVariants(variants: ProductVariant[]): {
  price: number;
  original_price?: number;
  stock: number;
} {
  const active = variants.filter((v) => v.is_available !== false);
  const pool = active.length ? active : variants;
  if (!pool.length) {
    return { price: 0, stock: 0 };
  }
  const price = Math.min(...pool.map((v) => v.price));
  const origCandidates = pool.filter((v) => v.original_price && v.original_price > v.price);
  const original_price = origCandidates.length
    ? Math.min(...origCandidates.map((v) => v.original_price!))
    : undefined;
  const hasUnlimited = pool.some((v) => v.stock === -1);
  const stock = hasUnlimited ? -1 : pool.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
  return { price, original_price, stock };
}

export function createEmptyVariant(sortOrder = 0): ProductVariant {
  return {
    id: newVariantId(),
    name: '',
    price: 0,
    stock: -1,
    is_available: true,
    sort_order: sortOrder,
  };
}

/** 编辑器专用：保留未填完的草稿行 */
export function coerceEditorVariants(raw: unknown): ProductVariant[] {
  if (!Array.isArray(raw)) return [];
  const parsed: ProductVariant[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const o = item as Record<string, unknown>;
    const stockRaw = Number(o.stock);
    parsed.push({
      id: String(o.id || newVariantId()),
      name: typeof o.name === 'string' ? o.name : String(o.name ?? ''),
      price: Number.isFinite(Number(o.price)) ? Number(o.price) : 0,
      original_price:
        o.original_price != null && o.original_price !== ''
          ? Number(o.original_price)
          : undefined,
      stock: Number.isFinite(stockRaw) ? stockRaw : -1,
      is_available: o.is_available !== false,
      sort_order: Number.isFinite(Number(o.sort_order)) ? Number(o.sort_order) : index,
    });
  });
  return parsed.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function formatVariantsForDisplay(variants: unknown): string {
  const list = normalizeProductVariants(variants);
  if (!list.length) return '—';
  return list
    .map((v) => {
      const stockText = v.stock === -1 ? '' : ` · 库存${v.stock}`;
      return `${v.name} ${v.price.toLocaleString()} MMK${stockText}`;
    })
    .join('；');
}

export function validateVariants(variants: ProductVariant[]): string | null {
  if (!variants.length) return '请至少添加一条规格';
  for (const v of variants) {
    if (!v.name.trim()) return '规格名称不能为空';
    if (!Number.isFinite(v.price) || v.price <= 0) {
      return v.name.trim() ? `规格「${v.name.trim()}」价格无效` : '规格价格无效';
    }
  }
  return null;
}

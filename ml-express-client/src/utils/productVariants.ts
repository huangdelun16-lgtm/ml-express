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
  stock?: number;
  variants?: unknown;
};

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
      id: String(o.id || `v-${index}`),
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

export function getProductDisplayOriginalPrice(product: ProductWithVariants): number | undefined {
  const variants = getAvailableVariants(product);
  if (!variants.length) {
    return product.original_price ?? undefined;
  }
  const withOrig = variants.filter((v) => v.original_price && v.original_price > v.price);
  if (!withOrig.length) return undefined;
  return Math.min(...withOrig.map((v) => v.original_price!));
}

/** Best off % from the product price or any available variant. 30 means 30% off. */
export function getProductDiscountPercent(product: ProductWithVariants): number {
  const variants = getAvailableVariants(product);
  const rows = variants.length
    ? variants.map((v) => ({ price: v.price, original: v.original_price }))
    : [{ price: product.price, original: product.original_price }];

  let best = 0;
  for (const row of rows) {
    const original = Number(row.original);
    const price = Number(row.price);
    if (!Number.isFinite(original) || !Number.isFinite(price) || original <= 0 || original <= price) {
      continue;
    }
    const pct = ((original - price) / original) * 100;
    if (pct > best) best = pct;
  }
  return best;
}

export function productMeetsDiscountPercent(product: ProductWithVariants, minPercent: number): boolean {
  return getProductDiscountPercent(product) >= minPercent;
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

export function cartLineKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

export function maxSelectableStockForProduct(
  product: ProductWithVariants,
  variantId?: string | null,
): number {
  if (productHasVariants(product)) {
    const v =
      resolveProductVariant(product, variantId) ??
      getAvailableVariants(product)[0] ??
      null;
    if (!v) return 0;
    if (v.stock === -1) return 99999;
    return Math.max(0, v.stock ?? 0);
  }
  if (product.stock === -1) return 99999;
  return Math.max(0, product.stock ?? 0);
}

export function buildProductForCart<T extends ProductWithVariants>(
  product: T,
  variantId?: string | null,
): T {
  const variant = resolveProductVariant(product, variantId);
  if (!variant) return { ...product };
  return {
    ...product,
    price: variant.price,
    original_price: variant.original_price ?? undefined,
    stock: variant.stock,
  };
}

export function isProductPurchasable(product: ProductWithVariants & { is_available?: boolean }): boolean {
  if (product.is_available === false) return false;
  if (productHasVariants(product)) {
    return getAvailableVariants(product).some(
      (v) => maxSelectableStockForProduct(product, v.id) > 0,
    );
  }
  return maxSelectableStockForProduct(product) > 0;
}

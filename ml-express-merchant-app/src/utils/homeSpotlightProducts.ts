export type SpotlightVariant = {
  price?: number | null;
  original_price?: number | null;
  is_available?: boolean | null;
};

export type SpotlightProduct = {
  id: string;
  price?: number | null;
  original_price?: number | null;
  variants?: SpotlightVariant[] | null;
};

export type SpotlightOffer = {
  percent: number;
  price: number;
  original: number | null;
};

export function discountPercent(price: number, original?: number | null): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (original == null || !Number.isFinite(original) || original <= price) return 0;
  return (1 - price / original) * 100;
}

function priceRows(product: SpotlightProduct): Array<{ price: number; original: number | null }> {
  const variants = Array.isArray(product.variants)
    ? product.variants.filter((row) => row && row.is_available !== false && Number(row.price) > 0)
    : [];
  if (variants.length) {
    return variants.map((row) => ({
      price: Number(row.price),
      original: row.original_price == null ? null : Number(row.original_price),
    }));
  }
  return [
    {
      price: Number(product.price) || 0,
      original: product.original_price == null ? null : Number(product.original_price),
    },
  ];
}

/** 多规格取折扣百分比最高的那一档，用来排序和展示。 */
export function spotlightOffer(product: SpotlightProduct): SpotlightOffer {
  const rows = priceRows(product);
  let best: SpotlightOffer = {
    percent: 0,
    price: rows[0]?.price || 0,
    original: null,
  };
  for (const row of rows) {
    const percent = discountPercent(row.price, row.original);
    if (percent > best.percent) {
      best = { percent, price: row.price, original: row.original };
    } else if (best.percent === 0 && percent === 0 && row.price > 0 && (best.price <= 0 || row.price < best.price)) {
      best = { percent: 0, price: row.price, original: null };
    }
  }
  return best;
}

export function pickHomeSpotlightProducts<T extends SpotlightProduct>(
  products: readonly T[],
  limit = 3,
): T[] {
  return products
    .map((product, index) => ({
      product,
      index,
      percent: spotlightOffer(product).percent,
    }))
    .sort((a, b) => b.percent - a.percent || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map((row) => row.product);
}

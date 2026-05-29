import React from 'react';
import {
  getAvailableVariants,
  maxSelectableStockForProduct,
  productHasVariants,
  type ProductWithVariants,
} from '../utils/productVariants';

type Lang = 'zh' | 'en' | 'my';

type Props = {
  product: ProductWithVariants;
  language?: Lang;
};

const soldOutLabel: Record<Lang, string> = {
  zh: '售罄',
  en: 'Sold out',
  my: 'ကုန်သွားပြီ',
};

/** 商品卡片：仅用小标签展示规格名，不展示价格 */
export function ProductVariantPriceList({ product, language = 'zh' }: Props) {
  if (!productHasVariants(product)) return null;

  const variants = getAvailableVariants(product);
  if (!variants.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {variants.map((variant) => {
        const outOfStock = maxSelectableStockForProduct(product, variant.id) === 0;
        return (
          <span
            key={variant.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: 8,
              fontSize: '0.72rem',
              fontWeight: 600,
              lineHeight: 1.3,
              background: outOfStock ? '#f8fafc' : '#f1f5f9',
              color: outOfStock ? '#94a3b8' : '#475569',
              border: `1px solid ${outOfStock ? '#e2e8f0' : '#cbd5e1'}`,
              opacity: outOfStock ? 0.75 : 1,
              textDecoration: outOfStock ? 'line-through' : 'none',
            }}
          >
            {variant.name}
            {outOfStock ? (
              <span style={{ marginLeft: 4, fontSize: '0.65rem', fontWeight: 500 }}>
                {soldOutLabel[language]}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export default ProductVariantPriceList;

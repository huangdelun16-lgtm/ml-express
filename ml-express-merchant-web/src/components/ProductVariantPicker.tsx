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
  selectedVariantId?: string | null;
  onSelect: (variantId: string) => void;
  language?: Lang;
};

const soldOutLabel: Record<Lang, string> = {
  zh: '售罄',
  en: 'Sold out',
  my: 'ကုန်သွားပြီ',
};

export default function ProductVariantPicker({
  product,
  selectedVariantId,
  onSelect,
  language = 'zh',
}: Props) {
  if (!productHasVariants(product)) return null;

  const variants = getAvailableVariants(product);
  if (!variants.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 4 }}>
      {variants.map((variant) => {
        const selected = selectedVariantId === variant.id;
        const outOfStock = maxSelectableStockForProduct(product, variant.id) === 0;
        return (
          <button
            key={variant.id}
            type="button"
            disabled={outOfStock}
            onClick={() => onSelect(variant.id)}
            style={{
              padding: '4px 9px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              cursor: outOfStock ? 'not-allowed' : 'pointer',
              background: selected ? '#eff6ff' : outOfStock ? '#f8fafc' : '#f1f5f9',
              border: `1px solid ${selected ? '#3b82f6' : outOfStock ? '#e2e8f0' : '#cbd5e1'}`,
              color: selected ? '#2563eb' : outOfStock ? '#94a3b8' : '#475569',
              opacity: outOfStock ? 0.75 : 1,
              textDecoration: outOfStock ? 'line-through' : 'none',
            }}
          >
            {variant.name}
            {outOfStock ? ` (${soldOutLabel[language]})` : ''}
            {!outOfStock ? ` · ${variant.price.toLocaleString()} MMK` : ''}
          </button>
        );
      })}
    </div>
  );
}

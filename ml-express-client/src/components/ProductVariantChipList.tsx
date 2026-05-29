import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

export default function ProductVariantChipList({ product, language = 'zh' }: Props) {
  if (!productHasVariants(product)) return null;

  const variants = getAvailableVariants(product);
  if (!variants.length) return null;

  return (
    <View style={styles.row}>
      {variants.map((variant) => {
        const outOfStock = maxSelectableStockForProduct(product, variant.id) === 0;
        return (
          <View
            key={variant.id}
            style={[styles.chip, outOfStock && styles.chipOut]}
          >
            <Text style={[styles.chipText, outOfStock && styles.chipTextOut]}>
              {variant.name}
              {outOfStock ? ` ${soldOutLabel[language]}` : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipOut: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.75,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextOut: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
});

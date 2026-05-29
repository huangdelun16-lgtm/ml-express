import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
    <View style={styles.row}>
      {variants.map((variant) => {
        const selected = selectedVariantId === variant.id;
        const outOfStock = maxSelectableStockForProduct(product, variant.id) === 0;
        return (
          <TouchableOpacity
            key={variant.id}
            disabled={outOfStock}
            onPress={() => onSelect(variant.id)}
            style={[
              styles.chip,
              selected && styles.chipSelected,
              outOfStock && styles.chipOut,
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                selected && styles.chipTextSelected,
                outOfStock && styles.chipTextOut,
              ]}
            >
              {variant.name}
              {outOfStock ? ` (${soldOutLabel[language]})` : ''}
            </Text>
          </TouchableOpacity>
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
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
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
  chipTextSelected: {
    color: '#2563eb',
  },
  chipTextOut: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
});

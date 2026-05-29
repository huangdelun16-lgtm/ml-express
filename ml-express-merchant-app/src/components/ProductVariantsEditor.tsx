import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import {
  ProductVariant,
  createEmptyVariant,
  coerceEditorVariants,
} from '../utils/productVariants';

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  language?: 'zh' | 'en';
};

const LABELS = {
  zh: {
    title: '商品规格',
    toggle: '启用多规格',
    hint: '例如：7mm / 10mm / 12mm。顾客下单时需选择规格。',
    name: '规格名称',
    price: '价格 (MMK)',
    stock: '库存 (-1=无限)',
    add: '+ 添加规格',
    remove: '删除',
    row: '规格',
  },
  en: {
    title: 'Variants',
    toggle: 'Enable variants',
    hint: 'e.g. S / M / L. Customers must pick a variant.',
    name: 'Spec name',
    price: 'Price (MMK)',
    stock: 'Stock (-1=∞)',
    add: '+ Add variant',
    remove: 'Remove',
    row: 'Variant',
  },
};

export default function ProductVariantsEditor({
  enabled,
  onEnabledChange,
  variants,
  onChange,
  language = 'zh',
}: Props) {
  const t = LABELS[language === 'en' ? 'en' : 'zh'];
  const rows = coerceEditorVariants(variants);

  const updateRow = (index: number, patch: Partial<ProductVariant>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...rows, createEmptyVariant(rows.length)]);
  };

  const handleToggle = (val: boolean) => {
    onEnabledChange(val);
    if (val && rows.length === 0) {
      onChange([createEmptyVariant(0)]);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.sub}>{t.hint}</Text>
        </View>
        <Switch value={enabled} onValueChange={handleToggle} trackColor={{ true: '#10b981' }} />
      </View>

      {enabled ? (
        <View style={styles.body}>
          {rows.map((row, index) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.rowBadge}>
                  {t.row} {index + 1}
                </Text>
                <TouchableOpacity
                  onPress={() => removeRow(index)}
                  disabled={rows.length <= 1}
                >
                  <Text style={[styles.remove, rows.length <= 1 && styles.removeDisabled]}>
                    {t.remove}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={row.name}
                onChangeText={(text) => updateRow(index, { name: text })}
                placeholder={t.name}
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.rowMain}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={row.price > 0 ? String(row.price) : ''}
                  onChangeText={(text) => updateRow(index, { price: parseFloat(text) || 0 })}
                  placeholder={t.price}
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  value={String(row.stock)}
                  onChangeText={(text) => updateRow(index, { stock: parseInt(text, 10) || 0 })}
                  placeholder={t.stock}
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addBtn} onPress={addRow}>
            <Text style={styles.addText}>{t.add}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  body: { marginTop: 12 },
  row: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowBadge: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  remove: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  removeDisabled: { color: '#cbd5e1' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 8,
  },
  rowMain: { flexDirection: 'row', gap: 8 },
  inputHalf: { flex: 1, marginBottom: 0 },
  addBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  addText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
});

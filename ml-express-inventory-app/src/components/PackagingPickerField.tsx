import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PACKAGING_OPTIONS } from '../constants/packagingOptions';

type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
};

export default function PackagingPickerField({
  label = '商品包装',
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.trigger} onPress={() => setOpen((v) => !v)}>
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value || '点击选择包装类型'}
        </Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.panel}>
          {PACKAGING_OPTIONS.map((opt) => {
            const active = value === opt;
            return (
              <Pressable
                key={opt}
                style={[styles.option, active && styles.optionOn]}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, active && styles.optionTextOn]}>{opt}</Text>
                {active ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 0 },
  label: { color: '#e2e8f0', fontWeight: '700', marginBottom: 6, fontSize: 13 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  triggerText: { color: '#0f172a', fontSize: 16, fontWeight: '600', flex: 1 },
  placeholder: { color: '#94a3b8', fontWeight: '500' },
  chevron: { color: '#64748b', fontSize: 12, marginLeft: 8 },
  panel: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  optionOn: { backgroundColor: 'rgba(5,150,105,0.15)' },
  optionText: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  optionTextOn: { color: '#6ee7b7', fontWeight: '800' },
  check: { color: '#6ee7b7', fontWeight: '900', fontSize: 16 },
});

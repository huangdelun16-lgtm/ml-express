import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PACK_DESTINATION_OPTIONS, regionDisplayLabel } from '../constants/destinationOptions';
import { useTranslation } from '../i18n';

type Props = {
  value: string;
  onChange: (code: string) => void;
};

export default function RegionFilterBar({ value, onChange }: Props) {
  const { t } = useTranslation();
  const options: { code: string; label: string }[] = [
    { code: '', label: t.common.all },
    ...PACK_DESTINATION_OPTIONS.map((code) => ({ code, label: regionDisplayLabel(code) })),
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t.forms.filterRegion}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {options.map((opt) => {
          const active = value === opt.code;
          return (
            <Pressable
              key={opt.code || 'all'}
              style={[styles.chip, active && styles.chipOn]}
              onPress={() => onChange(opt.code)}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { color: '#64748b', fontSize: 12, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipOn: {
    backgroundColor: 'rgba(14,165,233,0.18)',
    borderColor: '#0ea5e9',
  },
  chipText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: '#38bdf8', fontWeight: '900' },
});

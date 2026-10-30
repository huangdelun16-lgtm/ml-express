import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { PACK_DESTINATION_OPTIONS, regionDisplayLabel } from '../constants/destinationOptions';
import { useTranslation } from '../i18n';
import { colors } from '../theme';

type Props = {
  value: string;
  onChange: (code: string) => void;
  status: '' | 'unpacked' | 'signed';
  onStatusChange: (status: '' | 'unpacked' | 'signed') => void;
  unpackedLabel: string;
  signedLabel: string;
  resultCount?: number;
};

export default function RegionFilterBar({
  value,
  onChange,
  status,
  onStatusChange,
  unpackedLabel,
  signedLabel,
  resultCount,
}: Props) {
  const { t, fmt } = useTranslation();
  const options: { code: string; label: string }[] = [
    { code: '', label: t.common.all },
    ...PACK_DESTINATION_OPTIONS.map((code) => ({ code, label: regionDisplayLabel(code) })),
  ];
  const statusOptions: { id: '' | 'unpacked' | 'signed'; label: string }[] = [
    { id: '', label: t.common.all },
    { id: 'unpacked', label: unpackedLabel },
    { id: 'signed', label: signedLabel },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} myanmarWeight="bold">
        {t.forms.filterRegion}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.regionRow}
      >
        {options.map((opt) => {
          const active = value === opt.code;
          return (
            <Pressable
              key={opt.code || 'all'}
              style={[styles.chip, active && styles.chipOn]}
              onPress={() => onChange(opt.code)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]} myanmarWeight="bold">
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.statusHead}>
        <Text style={styles.title} myanmarWeight="bold">
          {t.forms.filterStatus}
        </Text>
        {typeof resultCount === 'number' ? (
          <Text style={styles.count} myanmarWeight="bold">
            {fmt(t.forms.matchCount, { count: resultCount })}
          </Text>
        ) : null}
      </View>
      <View style={styles.statusRow}>
        {statusOptions.map((opt) => {
          const active = status === opt.id;
          return (
            <Pressable
              key={opt.id || 'all-status'}
              style={[styles.statusChip, active && styles.statusChipOn]}
              onPress={() => onStatusChange(active && opt.id !== '' ? '' : opt.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[styles.statusText, active && styles.statusTextOn]}
                myanmarWeight="bold"
                numberOfLines={2}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 8 },
  title: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  regionRow: { flexDirection: 'row', gap: 8, paddingRight: 4, paddingTop: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  chipOn: {
    backgroundColor: 'rgba(14,165,233,0.24)',
    borderColor: colors.accentSky,
  },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: colors.accentSkyBright, fontWeight: '900' },
  statusHead: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: { color: colors.accentSkyBright, fontSize: 12, fontWeight: '800' },
  statusRow: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  statusChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipOn: {
    backgroundColor: 'rgba(251,191,36,0.16)',
    borderColor: colors.warning,
  },
  statusText: { color: colors.textSecondary, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  statusTextOn: { color: colors.warning, fontWeight: '900' },
});

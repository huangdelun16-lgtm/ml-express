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
};

export default function RegionFilterBar({
  value,
  onChange,
  status,
  onStatusChange,
  unpackedLabel,
  signedLabel,
}: Props) {
  const { t } = useTranslation();
  const options: { code: string; label: string }[] = [
    { code: '', label: t.common.all },
    ...PACK_DESTINATION_OPTIONS.map((code) => ({ code, label: regionDisplayLabel(code) })),
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} myanmarWeight="bold">
        {t.forms.filterRegion}
      </Text>
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
              <Text style={[styles.chipText, active && styles.chipTextOn]} myanmarWeight="bold">
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
        <View style={styles.divider} />
        {([
          { id: 'unpacked' as const, label: unpackedLabel },
          { id: 'signed' as const, label: signedLabel },
        ]).map((opt) => {
          const active = status === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.chip, active && styles.chipStatusOn]}
              onPress={() => onStatusChange(active ? '' : opt.id)}
            >
              <Text style={[styles.chipText, active && styles.chipStatusTextOn]} myanmarWeight="bold">
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 10 },
  title: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
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
  chipStatusOn: {
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderColor: colors.warning,
  },
  chipStatusTextOn: { color: colors.warning, fontWeight: '900' },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
    backgroundColor: colors.borderMuted,
  },
});

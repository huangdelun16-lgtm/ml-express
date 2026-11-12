import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../AppText';
import { useTranslation } from '../../i18n';
import { colors, space } from '../../theme';
import { formatWeight } from '../../utils/itemFieldFormat';
import type { ChargeBasis } from '../../utils/inboundMovementNote';
import { volumetricFormula, volumetricWeightKg } from '../../utils/volumetricWeight';

export function VolumetricWeightLine({ l, w, h }: { l: string; w: string; h: string }) {
  const { t } = useTranslation();
  const kg = volumetricWeightKg(l, w, h);
  const formula = volumetricFormula(l, w, h);
  return (
    <View style={styles.volumeBox}>
      <Text style={styles.volumeLabel}>{t.stockIn.volumetricWeight}</Text>
      <Text style={styles.volumeValue}>
        {kg != null ? formatWeight({ n: String(kg) }) : '—'}
      </Text>
      <Text style={styles.volumeFormula}>
        {formula || t.stockIn.volumetricPending}
      </Text>
    </View>
  );
}

export function ChargeBasisField({
  basis,
  hint,
  onChange,
}: {
  basis: ChargeBasis;
  hint?: string;
  onChange: (basis: ChargeBasis) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.payRow}>
      <Text style={styles.payLabel}>{t.stockIn.chargeBasis}</Text>
      <View style={styles.payChecks}>
        <Pressable
          style={[styles.payCheck, basis === 'volume' && styles.payCheckOn]}
          onPress={() => onChange('volume')}
        >
          <Text style={[styles.payCheckText, basis === 'volume' && styles.payCheckTextOn]}>
            {t.stockIn.chargeByVolume}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.payCheck, basis === 'weight' && styles.payCheckOn]}
          onPress={() => onChange('weight')}
        >
          <Text style={[styles.payCheckText, basis === 'weight' && styles.payCheckTextOn]}>
            {t.stockIn.chargeByWeight}
          </Text>
        </Pressable>
      </View>
      {hint ? <Text style={styles.chargeHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  volumeBox: {
    marginTop: -4,
    marginBottom: space.md,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  volumeLabel: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  volumeValue: { color: colors.text, fontWeight: '900', fontSize: 20, marginTop: 2 },
  volumeFormula: { color: colors.muted, fontSize: 12, marginTop: 2 },
  payRow: { marginBottom: space.md },
  payLabel: { color: colors.textSecondary, fontWeight: '700', marginBottom: 8, fontSize: 13 },
  payChecks: { flexDirection: 'row', gap: 10 },
  payCheck: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.bg,
  },
  payCheckOn: {
    borderColor: colors.success,
    backgroundColor: 'rgba(5,150,105,0.15)',
  },
  payCheckText: { color: colors.muted, fontWeight: '800', fontSize: 14 },
  payCheckTextOn: { color: colors.successText },
  chargeHint: { color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 16 },
});

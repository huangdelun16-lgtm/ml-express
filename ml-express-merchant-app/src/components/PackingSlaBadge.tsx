import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  computePackingCountdown,
  withStorePackingSla,
  type PackingCountdownPackageInput,
  type PackingCountdownUrgency,
} from '../services/_shared/packingCountdown';

type Lang = 'zh' | 'en' | 'my';

const TONES: Record<
  PackingCountdownUrgency,
  { bg: string; border: string; text: string; bar: string }
> = {
  ok: { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857', bar: '#10b981' },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', bar: '#f59e0b' },
  critical: { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', bar: '#f97316' },
  overdue: { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', bar: '#ef4444' },
  none: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', bar: '#94a3b8' },
};

export function PackingSlaBadge({
  order,
  language,
  now,
  slaMinutes,
}: {
  order: PackingCountdownPackageInput;
  language: Lang;
  now?: Date;
  slaMinutes?: number | null;
}) {
  const [tick, setTick] = useState(() => new Date());
  useEffect(() => {
    if (now) return;
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, [now]);

  const cd = useMemo(
    () => computePackingCountdown(withStorePackingSla(order, slaMinutes), now || tick),
    [order, slaMinutes, now, tick],
  );
  if (!cd.visible) return null;

  const palette = TONES[cd.urgency];
  const label =
    language === 'en' ? cd.labelEn : language === 'my' ? cd.labelMy : cd.labelZh;
  const progressPct =
    cd.phase === 'remaining' && cd.totalMs && cd.remainingMs != null
      ? Math.max(0, Math.min(100, (cd.remainingMs / cd.totalMs) * 100))
      : 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: cd.phase === 'overdue' ? 2 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.label, { color: palette.text }]}>⏱ {label}</Text>
        <Text style={[styles.time, { color: palette.text }]}>{cd.displayTime}</Text>
      </View>
      {cd.phase === 'remaining' ? (
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${progressPct}%`, backgroundColor: palette.bar },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
  },
  time: {
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    marginTop: 6,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
});

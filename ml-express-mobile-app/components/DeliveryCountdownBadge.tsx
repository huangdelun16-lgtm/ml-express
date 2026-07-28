import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Package } from '../services/supabase';
import {
  computeDeliveryCountdown,
  type DeliveryCountdownResult,
  type DeliveryCountdownUrgency,
} from '../services/_shared/deliveryCountdown';

type Lang = 'zh' | 'en' | 'my';

function countdownFromPackage(pkg: Package, now: Date): DeliveryCountdownResult {
  return computeDeliveryCountdown(
    {
      delivery_speed: pkg.delivery_speed,
      created_at: pkg.created_at,
      create_time: pkg.create_time,
      scheduled_delivery_time: pkg.scheduled_delivery_time,
      status: pkg.status,
    },
    now,
  );
}

const URGENCY_COLORS: Record<
  DeliveryCountdownUrgency,
  { bg: string; border: string; text: string; bar: string }
> = {
  ok: { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857', bar: '#10b981' },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', bar: '#f59e0b' },
  critical: { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', bar: '#f97316' },
  overdue: { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', bar: '#ef4444' },
  none: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', bar: '#94a3b8' },
};

const DARK_URGENCY_COLORS: Record<
  DeliveryCountdownUrgency,
  { bg: string; border: string; text: string; bar: string }
> = {
  ok: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#6ee7b7', bar: '#10b981' },
  warning: { bg: 'rgba(245, 158, 11, 0.18)', border: '#f59e0b', text: '#fcd34d', bar: '#f59e0b' },
  critical: { bg: 'rgba(249, 115, 22, 0.2)', border: '#f97316', text: '#fdba74', bar: '#f97316' },
  overdue: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#fca5a5', bar: '#ef4444' },
  none: { bg: 'rgba(148, 163, 184, 0.12)', border: '#64748b', text: '#94a3b8', bar: '#64748b' },
};

export interface DeliveryCountdownBadgeProps {
  pkg: Package;
  language?: Lang;
  variant?: 'compact' | 'full';
  theme?: 'light' | 'dark';
}

export const DeliveryCountdownBadge: React.FC<DeliveryCountdownBadgeProps> = ({
  pkg,
  language = 'zh',
  variant = 'full',
  theme = 'light',
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const cd = useMemo(() => countdownFromPackage(pkg, now), [pkg, now]);

  if (!cd.visible) return null;

  const palette =
    theme === 'dark' ? DARK_URGENCY_COLORS[cd.urgency] : URGENCY_COLORS[cd.urgency];
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
        variant === 'compact' && styles.wrapCompact,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        cd.phase === 'overdue' && styles.wrapOverdue,
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.icon, { color: palette.text }]}>⏱</Text>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.time, { color: palette.text }]}>{cd.displayTime}</Text>
      </View>
      {variant === 'full' && cd.phase === 'remaining' && (
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${progressPct}%`, backgroundColor: palette.bar },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  wrapCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  wrapOverdue: {
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 13,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
  },
  time: {
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
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

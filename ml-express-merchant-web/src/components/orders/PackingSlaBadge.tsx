import React, { useEffect, useMemo, useState } from 'react';
import {
  computePackingCountdown,
  withStorePackingSla,
  type PackingCountdownPackageInput,
  type PackingCountdownUrgency,
} from '../../services/_shared/packingCountdown';

type Lang = 'zh' | 'en' | 'my';

const LIGHT: Record<
  PackingCountdownUrgency,
  { bg: string; border: string; text: string; bar: string }
> = {
  ok: { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857', bar: '#10b981' },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', bar: '#f59e0b' },
  critical: { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', bar: '#f97316' },
  overdue: { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', bar: '#ef4444' },
  none: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', bar: '#94a3b8' },
};

const DARK: Record<
  PackingCountdownUrgency,
  { bg: string; border: string; text: string; bar: string }
> = {
  ok: { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', text: '#6ee7b7', bar: '#10b981' },
  warning: { bg: 'rgba(245, 158, 11, 0.22)', border: '#f59e0b', text: '#fcd34d', bar: '#f59e0b' },
  critical: { bg: 'rgba(249, 115, 22, 0.24)', border: '#f97316', text: '#fdba74', bar: '#f97316' },
  overdue: { bg: 'rgba(239, 68, 68, 0.28)', border: '#ef4444', text: '#fecaca', bar: '#ef4444' },
  none: { bg: 'rgba(148, 163, 184, 0.16)', border: '#64748b', text: '#94a3b8', bar: '#64748b' },
};

export function PackingSlaBadge({
  order,
  language,
  variant = 'light',
  now,
  slaMinutes,
}: {
  order: PackingCountdownPackageInput;
  language: Lang;
  variant?: 'light' | 'dark';
  now?: Date;
  slaMinutes?: number | null;
}) {
  const [tick, setTick] = useState(() => new Date());
  useEffect(() => {
    if (now) return;
    const id = window.setInterval(() => setTick(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [now]);

  const cd = useMemo(
    () => computePackingCountdown(withStorePackingSla(order, slaMinutes), now || tick),
    [order, slaMinutes, now, tick],
  );
  if (!cd.visible) return null;

  const palette = (variant === 'dark' ? DARK : LIGHT)[cd.urgency];
  const label =
    language === 'en' ? cd.labelEn : language === 'my' ? cd.labelMy : cd.labelZh;
  const progressPct =
    cd.phase === 'remaining' && cd.totalMs && cd.remainingMs != null
      ? Math.max(0, Math.min(100, (cd.remainingMs / cd.totalMs) * 100))
      : 0;

  return (
    <div
      style={{
        marginTop: 8,
        alignSelf: 'flex-start',
        background: palette.bg,
        border: `${cd.phase === 'overdue' ? 2 : 1}px solid ${palette.border}`,
        borderRadius: 10,
        padding: '6px 10px',
        minWidth: 148,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: palette.text,
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        <span aria-hidden>⏱</span>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 900 }}>
          {cd.displayTime}
        </span>
      </div>
      {cd.phase === 'remaining' ? (
        <div
          style={{
            marginTop: 6,
            height: 4,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: '100%',
              borderRadius: 999,
              background: palette.bar,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

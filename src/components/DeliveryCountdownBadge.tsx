import React, { useEffect, useMemo, useState } from 'react';
import type { Package } from '../services/supabase';
import {
  computeDeliveryCountdown,
  type DeliveryCountdownResult,
} from '../services/_shared/deliveryCountdown';

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

export interface DeliveryCountdownBadgeProps {
  pkg: Package;
  /** compact：仅一行；full：带进度条 */
  variant?: 'compact' | 'full';
}

export const DeliveryCountdownBadge: React.FC<DeliveryCountdownBadgeProps> = ({
  pkg,
  variant = 'full',
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const cd = useMemo(() => countdownFromPackage(pkg, now), [pkg, now]);

  if (!cd.visible) return null;

  const progressPct =
    cd.phase === 'remaining' && cd.totalMs && cd.remainingMs != null
      ? Math.max(0, Math.min(100, (cd.remainingMs / cd.totalMs) * 100))
      : 0;

  return (
    <div
      className={`rt-tracking__countdown rt-tracking__countdown--${cd.urgency}${
        cd.phase === 'overdue' ? ' rt-tracking__countdown--overdue' : ''
      }`}
      title={
        cd.deadline
          ? `截止 ${cd.deadline.toLocaleString('zh-CN', { hour12: false })}`
          : undefined
      }
    >
      <div className="rt-tracking__countdown-row">
        <span className="rt-tracking__countdown-icon" aria-hidden>
          ⏱
        </span>
        <span className="rt-tracking__countdown-label">{cd.labelZh}</span>
        <span className="rt-tracking__countdown-time">{cd.displayTime}</span>
      </div>
      {variant === 'full' && cd.phase === 'remaining' && (
        <div className="rt-tracking__countdown-bar" aria-hidden>
          <div
            className="rt-tracking__countdown-bar-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
};

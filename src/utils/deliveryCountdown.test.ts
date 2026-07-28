import {
  computeDeliveryCountdown,
  formatCountdownDuration,
  parseScheduledDeliveryTime,
  resolveDeliveryDeadline,
} from '../services/_shared/deliveryCountdown';

describe('deliveryCountdown', () => {
  const created = new Date('2026-07-28T10:00:00+06:30');

  it('准时达：60 分钟 SLA', () => {
    const now = new Date('2026-07-28T10:30:00+06:30');
    const result = computeDeliveryCountdown(
      {
        delivery_speed: '准时达',
        created_at: created.toISOString(),
        status: '待取件',
      },
      now,
    );
    expect(result.visible).toBe(true);
    expect(result.phase).toBe('remaining');
    expect(result.displayTime).toBe('30:00');
    expect(result.urgency).toBe('warning');
  });

  it('急送达：30 分钟 SLA', () => {
    const deadline = resolveDeliveryDeadline({
      delivery_speed: '急送达',
      created_at: created.toISOString(),
    });
    expect(deadline?.getTime()).toBe(created.getTime() + 30 * 60 * 1000);
  });

  it('Eco Way：24 小时 SLA', () => {
    const deadline = resolveDeliveryDeadline({
      delivery_speed: 'Eco Way',
      created_at: created.toISOString(),
    });
    expect(deadline?.getTime()).toBe(created.getTime() + 24 * 60 * 60 * 1000);
  });

  it('超时显示', () => {
    const now = new Date('2026-07-28T11:05:00+06:30');
    const result = computeDeliveryCountdown(
      {
        delivery_speed: '准时达',
        created_at: created.toISOString(),
        status: '配送中',
      },
      now,
    );
    expect(result.phase).toBe('overdue');
    expect(result.displayTime).toBe('05:00');
    expect(result.urgency).toBe('overdue');
  });

  it('已送达不显示', () => {
    const result = computeDeliveryCountdown(
      {
        delivery_speed: '准时达',
        created_at: created.toISOString(),
        status: '已送达',
      },
      new Date(),
    );
    expect(result.visible).toBe(false);
  });

  it('解析「今天 18:00」', () => {
    const parsed = parseScheduledDeliveryTime('今天 18:00', created, created);
    expect(parsed?.getHours()).toBe(18);
    expect(parsed?.getMinutes()).toBe(0);
  });

  it('formatCountdownDuration', () => {
    expect(formatCountdownDuration(90_000)).toBe('01:30');
    expect(formatCountdownDuration(3_661_000)).toBe('1:01:01');
  });
});

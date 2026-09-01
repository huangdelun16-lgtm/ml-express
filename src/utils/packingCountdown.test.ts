import {
  PACKING_SLA_MINUTES,
  computePackingCountdown,
  getPackingSlaMinutes,
  packingSlaSortKey,
  sortByPackingSla,
} from '../services/_shared/packingCountdown';

describe('packingCountdown', () => {
  const started = new Date('2026-09-01T10:00:00+06:30');

  it('急送达：8 分钟 SLA', () => {
    expect(getPackingSlaMinutes('急送达')).toBe(PACKING_SLA_MINUTES.express);
    const now = new Date(started.getTime() + 5 * 60 * 1000);
    const result = computePackingCountdown(
      {
        status: '打包中',
        delivery_speed: '急送达',
        packing_started_at: started.toISOString(),
      },
      now,
    );
    expect(result.visible).toBe(true);
    expect(result.phase).toBe('remaining');
    expect(result.displayTime).toBe('03:00');
    expect(result.urgency).toBe('warning');
  });

  it('准时达：12 分钟 SLA', () => {
    expect(getPackingSlaMinutes('准时达')).toBe(PACKING_SLA_MINUTES.onTime);
    const deadline = started.getTime() + 12 * 60 * 1000;
    const now = new Date(started.getTime() + 2 * 60 * 1000);
    const result = computePackingCountdown(
      {
        status: '打包中',
        delivery_speed: '准时达',
        packing_started_at: started.toISOString(),
      },
      now,
    );
    expect(result.phase).toBe('remaining');
    expect(result.deadline?.getTime()).toBe(deadline);
    expect(result.urgency).toBe('ok');
  });

  it('超时变红', () => {
    const now = new Date(started.getTime() + 13 * 60 * 1000);
    const result = computePackingCountdown(
      {
        status: '打包中',
        delivery_speed: '准时达',
        packing_started_at: started.toISOString(),
      },
      now,
    );
    expect(result.phase).toBe('overdue');
    expect(result.urgency).toBe('overdue');
    expect(result.displayTime).toBe('01:00');
  });

  it('非打包中不显示', () => {
    const result = computePackingCountdown(
      {
        status: '待取件',
        delivery_speed: '急送达',
        packing_started_at: started.toISOString(),
      },
      new Date(),
    );
    expect(result.visible).toBe(false);
  });

  it('无 packing_started_at 时回退 updated_at', () => {
    const result = computePackingCountdown(
      {
        status: '打包中',
        delivery_speed: '急送达',
        updated_at: started.toISOString(),
      },
      new Date(started.getTime() + 60 * 1000),
    );
    expect(result.visible).toBe(true);
    expect(result.displayTime).toBe('07:00');
  });

  it('超时订单排在最前', () => {
    const now = new Date(started.getTime() + 10 * 60 * 1000);
    const sorted = sortByPackingSla(
      [
        { id: 'pending', status: '待确认', created_at: started.toISOString() },
        {
          id: 'ok',
          status: '打包中',
          delivery_speed: '准时达',
          packing_started_at: new Date(started.getTime() + 4 * 60 * 1000).toISOString(),
        },
        {
          id: 'late',
          status: '打包中',
          delivery_speed: '急送达',
          packing_started_at: started.toISOString(),
        },
      ],
      now,
    );
    expect(sorted.map((row) => row.id)).toEqual(['late', 'ok', 'pending']);
    expect(packingSlaSortKey(sorted[0], now)).toBeLessThan(0);
  });

  it('店铺打包时限覆盖配送速度默认值', () => {
    const now = new Date(started.getTime() + 10 * 60 * 1000);
    const result = computePackingCountdown(
      {
        status: '打包中',
        delivery_speed: '急送达',
        packing_started_at: started.toISOString(),
        packing_sla_minutes: 20,
      },
      now,
    );
    expect(result.phase).toBe('remaining');
    expect(result.slaMinutes).toBe(20);
    expect(result.displayTime).toBe('10:00');
  });
});

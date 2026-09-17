import type { CrossBorderTrackingResult } from '../services/crossBorderTrackingService';
import {
  buildCrossBorderTimeline,
  resolveCrossBorderDisplayKey,
} from './crossBorderTimeline';

function sample(partial: Partial<CrossBorderTrackingResult> = {}): CrossBorderTrackingResult {
  return {
    kind: 'cross_border',
    query: 'SF1234',
    match_type: 'express',
    order_barcode: 'MDY1850002170926',
    express_barcode: 'SF1234',
    recipient_name: 'AMT',
    final_destination: 'MDY',
    final_destination_label: { zh: '曼德勒', en: 'Mandalay' },
    origin_label: { zh: '瑞丽', en: 'Ruili' },
    weight: '2 Kg',
    product_name: 'SF1234',
    current_status_key: 'origin_arrived',
    current_status: { zh: '已到达瑞丽仓库', en: 'Arrived at Ruili warehouse', my: 'Ruili warehouse reached' },
    events: [
      {
        status_key: 'origin_arrived',
        labels: { zh: '已到达瑞丽仓库', en: 'Arrived at Ruili warehouse', my: 'Ruili warehouse reached' },
        event_time: '2026-09-16T08:00:00.000Z',
        note: '瑞丽 入库登记',
      },
    ],
    ...partial,
  };
}

describe('resolveCrossBorderDisplayKey', () => {
  it('treats origin warehouse arrival as awaiting truck load', () => {
    expect(resolveCrossBorderDisplayKey(sample())).toBe('pending_load');
  });

  it('keeps destination arrival when the item has reached the hub', () => {
    expect(
      resolveCrossBorderDisplayKey(
        sample({
          current_status_key: 'destination_arrived',
          events: [
            { status_key: 'origin_arrived', labels: { zh: 'a', en: 'a', my: 'a' }, event_time: '2026-09-16T08:00:00.000Z' },
            { status_key: 'loaded', labels: { zh: 'b', en: 'b', my: 'b' }, event_time: '2026-09-16T12:00:00.000Z' },
            { status_key: 'destination_arrived', labels: { zh: 'c', en: 'c', my: 'c' }, event_time: '2026-09-17T09:00:00.000Z' },
          ],
        }),
      ),
    ).toBe('destination_arrived');
  });
});

describe('buildCrossBorderTimeline', () => {
  it('always lists inbound / pending load / loaded / arrived / signed', () => {
    const steps = buildCrossBorderTimeline(sample());
    expect(steps.map((s) => s.key)).toEqual([
      'inbound',
      'pending_load',
      'loaded',
      'destination_arrived',
      'signed',
    ]);
    expect(steps[0].state).toBe('done');
    expect(steps[1].state).toBe('current');
    expect(steps[2].state).toBe('pending');
    expect(steps[0].detail.zh).toContain('瑞丽');
    expect(steps[1].detail.zh).toContain('曼德勒');
  });

  it('marks loaded as current after truck departure', () => {
    const steps = buildCrossBorderTimeline(
      sample({
        current_status_key: 'loaded',
        events: [
          { status_key: 'origin_arrived', labels: { zh: 'a', en: 'a', my: 'a' }, event_time: '2026-09-16T08:00:00.000Z' },
          { status_key: 'loaded', labels: { zh: '已装车', en: 'Loaded', my: 'Loaded' }, event_time: '2026-09-16T12:00:00.000Z' },
        ],
      }),
    );
    expect(steps.find((s) => s.key === 'pending_load')?.state).toBe('done');
    expect(steps.find((s) => s.key === 'loaded')?.state).toBe('current');
    expect(steps.find((s) => s.key === 'destination_arrived')?.state).toBe('pending');
  });
});

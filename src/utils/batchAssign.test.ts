import {
  calculateDistanceKm,
  centroidOfPackages,
  filterAssignableByIds,
  formatBatchAssignMessage,
  isAssignablePackage,
  isUnassignedCourier,
  pickLeastLoadedCourier,
  pruneSelectedIds,
  rankCouriersForAssign,
  summarizeBatchAssign,
  toggleSelectAllIds,
  toggleSelectedId,
} from './batchAssign';

describe('batchAssign', () => {
  it('treats empty / 待分配 / 未分配 as unassigned', () => {
    expect(isUnassignedCourier('')).toBe(true);
    expect(isUnassignedCourier('待分配')).toBe(true);
    expect(isUnassignedCourier('未分配')).toBe(true);
    expect(isUnassignedCourier(' 待分配 ')).toBe(true);
    expect(isUnassignedCourier('Aung')).toBe(false);
  });

  it('only allows 待取件 / 待收款 that still have no rider', () => {
    expect(isAssignablePackage({ status: '待取件', courier: '待分配' })).toBe(true);
    expect(isAssignablePackage({ status: '待收款', courier: '' })).toBe(true);
    expect(isAssignablePackage({ status: '待确认', courier: '待分配' })).toBe(false);
    expect(isAssignablePackage({ status: '待取件', courier: 'Aung' })).toBe(false);
    expect(isAssignablePackage({ status: '配送中', courier: '未分配' })).toBe(false);
  });

  it('ranks nearer and lighter riders first, and keeps riders without GPS', () => {
    const origin = { latitude: 21.96, longitude: 96.09 };
    const ranked = rankCouriersForAssign(
      [
        {
          id: 'far',
          name: '远',
          status: 'online',
          latitude: 16.8,
          longitude: 96.1,
          currentPackages: 0,
        },
        {
          id: 'near-busy',
          name: '近忙',
          status: 'busy',
          latitude: 21.97,
          longitude: 96.1,
          currentPackages: 4,
        },
        {
          id: 'near-idle',
          name: '近闲',
          status: 'online',
          latitude: 21.961,
          longitude: 96.091,
          currentPackages: 0,
        },
        { id: 'offline', name: '离线', status: 'offline', latitude: 21.96, longitude: 96.09 },
        { id: 'nogps', name: '无定位', status: 'active', currentPackages: 1 },
      ],
      origin,
    );

    expect(ranked.map((c) => c.id)).toEqual(['near-idle', 'near-busy', 'far', 'nogps']);
    expect(ranked[0].distance).not.toBeNull();
    expect(ranked[0].distance as number).toBeLessThan(ranked[1].distance as number);
    expect(ranked[ranked.length - 1].distance).toBeNull();
  });

  it('without origin, prefers fewer current packages', () => {
    const ranked = rankCouriersForAssign([
      { id: 'b', name: 'B', status: 'online', currentPackages: 3 },
      { id: 'a', name: 'A', status: 'busy', currentPackages: 1 },
    ]);
    expect(ranked[0].id).toBe('a');
  });

  it('picks the least-loaded online rider for auto assign', () => {
    expect(
      pickLeastLoadedCourier([
        { id: 'off', name: 'Off', status: 'offline', currentPackages: 0 },
        { id: 'busy', name: 'Busy', status: 'busy', currentPackages: 2 },
        { id: 'idle', name: 'Idle', status: 'online', currentPackages: 0 },
      ])?.id,
    ).toBe('idle');
    expect(pickLeastLoadedCourier([{ id: 'x', name: 'X', status: 'offline' }])).toBeNull();
  });

  it('computes a centroid from pickup coordinates', () => {
    expect(
      centroidOfPackages([
        { sender_latitude: 21, sender_longitude: 96 },
        { sender_latitude: 23, sender_longitude: 98 },
        { sender_latitude: null, sender_longitude: null },
      ]),
    ).toEqual({ latitude: 22, longitude: 97 });
    expect(centroidOfPackages([{ sender_latitude: null }])).toBeNull();
  });

  it('measures a short Yangon-Mandalay-scale distance as hundreds of km', () => {
    const km = calculateDistanceKm(16.8661, 96.1951, 21.9588, 96.0891);
    expect(km).toBeGreaterThan(500);
    expect(km).toBeLessThan(700);
  });

  it('filters selected ids to assignable packages only', () => {
    const rows = [
      { id: 'a', status: '待取件', courier: '待分配' },
      { id: 'b', status: '待取件', courier: 'Aung' },
      { id: 'c', status: '待收款', courier: '未分配' },
    ];
    expect(filterAssignableByIds(rows, ['a', 'b', 'c']).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('toggles and prunes selection sets', () => {
    const one = toggleSelectedId(new Set(), 'a');
    expect(Array.from(one)).toEqual(['a']);
    expect(Array.from(toggleSelectedId(one, 'a'))).toEqual([]);
    expect(Array.from(toggleSelectAllIds(new Set(), ['a', 'b']))).toEqual(['a', 'b']);
    expect(Array.from(toggleSelectAllIds(new Set(['a', 'b']), ['a', 'b']))).toEqual([]);
    expect(Array.from(pruneSelectedIds(new Set(['a', 'gone']), ['a', 'c']))).toEqual(['a']);
  });

  it('summarizes batch results and formats operator copy', () => {
    const summary = summarizeBatchAssign([
      { packageId: 'YGN1', ok: true, notified: true },
      { packageId: 'YGN2', ok: true, notified: false },
      { packageId: 'YGN3', ok: false, notified: false, error: '状态更新失败' },
    ]);
    expect(summary).toEqual({
      success: 2,
      failed: 1,
      notified: 1,
      successIds: ['YGN1', 'YGN2'],
      errors: ['YGN3：状态更新失败'],
    });
    expect(formatBatchAssignMessage(summary, 'Aung')).toContain('已派 2 件');
    expect(formatBatchAssignMessage(summary, 'Aung')).toContain('失败 1 件');
    expect(
      formatBatchAssignMessage(
        { success: 1, failed: 0, notified: 1, successIds: ['YGN1'], errors: [] },
        'Aung',
      ),
    ).toContain('YGN1');
    expect(
      formatBatchAssignMessage(
        { success: 0, failed: 1, notified: 0, successIds: [], errors: ['YGN1：失败'] },
        'Aung',
      ),
    ).toContain('派单失败');
  });
});

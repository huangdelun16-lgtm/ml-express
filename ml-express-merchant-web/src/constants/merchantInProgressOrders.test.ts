import {
  fingerprintMerchantInProgressOrders,
  isMerchantInProgressStatus,
  merchantInProgressSnapshotChanged,
} from '../services/_shared/merchantInProgressOrders';

describe('merchantInProgressOrders', () => {
  it('fingerprint ignores row order', () => {
    const a = fingerprintMerchantInProgressOrders([
      { id: '2', status: '配送中', courier: 'A' },
      { id: '1', status: '待取件', courier: 'B' },
    ]);
    const b = fingerprintMerchantInProgressOrders([
      { id: '1', status: '待取件', courier: 'B' },
      { id: '2', status: '配送中', courier: 'A' },
    ]);
    expect(a).toBe(b);
  });

  it('detects status and courier changes, including leaving in-progress', () => {
    const previous = fingerprintMerchantInProgressOrders([
      { id: '1', status: '待取件', courier: 'B' },
    ]);
    expect(
      merchantInProgressSnapshotChanged(previous, [
        { id: '1', status: '配送中', courier: 'B' },
      ]),
    ).toBe(true);
    expect(
      merchantInProgressSnapshotChanged(previous, [
        { id: '1', status: '待取件', courier: 'C' },
      ]),
    ).toBe(true);
    expect(merchantInProgressSnapshotChanged(previous, [])).toBe(true);
    expect(
      merchantInProgressSnapshotChanged(previous, [
        { id: '1', status: '待取件', courier: 'B' },
      ]),
    ).toBe(false);
  });

  it('treats packing/pickup/transit as in-progress, not pending or delivered', () => {
    expect(isMerchantInProgressStatus('待取件')).toBe(true);
    expect(isMerchantInProgressStatus('配送中')).toBe(true);
    expect(isMerchantInProgressStatus('待确认')).toBe(false);
    expect(isMerchantInProgressStatus('已送达')).toBe(false);
  });
});

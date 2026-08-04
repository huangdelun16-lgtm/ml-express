import { describe, expect, it } from 'vitest';
import {
  canReleaseTransitManually,
  inventoryOperationId,
  isInventoryOperationLogDuplicateError,
} from './inventoryReliability';

describe('inventory reliability', () => {
  it('同一业务键生成稳定 operation_id', () => {
    const first = inventoryOperationId('pack', 'pkg26ygn0001');
    expect(inventoryOperationId('pack', ' PKG26YGN0001 ')).toBe(first);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(inventoryOperationId('load', 'PKG26YGN0001')).not.toBe(first);
  });

  it('识别 operation_log 主键冲突', () => {
    expect(
      isInventoryOperationLogDuplicateError(
        new Error('duplicate key value violates unique constraint "inventory_operation_log_pkey"'),
      ),
    ).toBe(true);
    expect(isInventoryOperationLogDuplicateError(new Error('network timeout'))).toBe(false);
  });

  it('仅允许已到站且仍有未释放中转单时手动释放', () => {
    expect(canReleaseTransitManually({
      packageStatus: 'hub_received',
      hasTransitOrders: true,
      hasUnreleasedTransitOrders: true,
    })).toBe(true);
    expect(canReleaseTransitManually({
      packageStatus: 'in_transit',
      hasTransitOrders: true,
      hasUnreleasedTransitOrders: true,
    })).toBe(false);
    expect(canReleaseTransitManually({
      packageStatus: 'completed',
      hasTransitOrders: true,
      hasUnreleasedTransitOrders: false,
    })).toBe(false);
  });
});

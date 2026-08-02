import { describe, expect, it } from 'vitest';
import { resolveItemCardQty } from './itemFieldFormat';

describe('resolveItemCardQty', () => {
  it('已打入新快递包时展示 0，即使 qty_on_hand 被同步错误写回', () => {
    expect(
      resolveItemCardQty({
        qty_on_hand: 1,
        unit: '1 Pcs',
        packed: true,
        packed_at: '2026-06-19T09:28:00.000Z',
      }),
    ).toBe(0);
  });

  it('中转释放待转出时仍展示可打包库存', () => {
    expect(
      resolveItemCardQty({
        qty_on_hand: 1,
        unit: '1 Pcs',
        hub_transit_released: true,
        hub_transit_released_at: '2026-06-18T17:20:00.000Z',
      }),
    ).toBe(1);
  });

  it('经本站中转入库后展示库存（即使尚未释放待转出）', () => {
    expect(
      resolveItemCardQty({
        qty_on_hand: 1,
        unit: '1 Pcs',
        packed: true,
        packed_at: '2026-06-18T17:20:00.000Z',
        hub_transit_hub_inbound: true,
      }),
    ).toBe(1);
  });

  it('多个入库已打包订单库存为 0', () => {
    expect(
      resolveItemCardQty({
        qty_on_hand: 0,
        unit: '2 Pcs',
        stocked_in: true,
        packed: true,
        packed_at: '2026-08-02T10:00:00.000Z',
      }),
    ).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildSettlementSnapshot,
  diffSettlementSnapshot,
  filterEntriesForFinancePeriod,
  occurredAtInRange,
  parseFinancePeriodQuery,
  resolveFinancePeriod,
  rollupConfirmedMonths,
  yangonMidnightUtcMs,
} from './yangonFinancePeriod';

describe('yangonFinancePeriod', () => {
  it('slices a Yangon day as [00:00, next 00:00)', () => {
    const range = resolveFinancePeriod('day', '2026-08-31');
    expect(range.fromIso).toBe('2026-08-30T17:30:00.000Z');
    expect(range.toExclusiveIso).toBe('2026-08-31T17:30:00.000Z');
    expect(occurredAtInRange('2026-08-31T00:00:00+06:30', range.fromIso, range.toExclusiveIso)).toBe(
      true,
    );
  });

  it('uses Yangon midnight as the day boundary', () => {
    expect(new Date(yangonMidnightUtcMs(2026, 8, 31)).toISOString()).toBe(
      '2026-08-30T17:30:00.000Z',
    );
  });

  it('carries outstanding COD into a later day', () => {
    const range = resolveFinancePeriod('day', '2026-08-31');
    const filtered = filterEntriesForFinancePeriod(
      [
        { id: 'old', category: 'order_income_cod', occurredAt: '2026-08-01T04:00:00.000Z' },
        { id: 'today', category: 'order_collected', occurredAt: '2026-08-31T01:00:00+06:30' },
      ],
      range,
    );
    expect(filtered.map((e) => e.id)).toEqual(['old', 'today']);
  });

  it('computes net balance on settlement snapshot', () => {
    const snap = buildSettlementSnapshot(
      { collectedTotal: 100, transportPaidTotal: 25, manualExpenseTotal: 5 },
      [{ id: 'x' }],
    );
    expect(snap.netBalance).toBe(70);
    expect(snap.entryIds).toEqual(['x']);
  });

  it('parses period query params', () => {
    const parsed = parseFinancePeriodQuery({
      period: 'month',
      date: '2026-08-01',
      storeCode: 'mdy001',
      financeExport: '1',
    });
    expect(parsed.storeCode).toBe('MDY001');
    expect(parsed.exportAll).toBe(true);
    expect(parsed.range?.label).toBe('2026-08');
  });

  it('diffs snapshots and rolls up confirmed months', () => {
    const snap = buildSettlementSnapshot({ collectedTotal: 100, transportPaidTotal: 40 }, []);
    const diff = diffSettlementSnapshot(snap, { ...snap, collectedTotal: 120 });
    expect(diff.hasDiff).toBe(true);
    expect(diff.diffs.collectedTotal.delta).toBe(20);

    const result = rollupConfirmedMonths(
      [
        {
          status: 'confirmed',
          period_type: 'month',
          period_start: '2026-01-01',
          store_code: 'MDY001',
          snapshot: { ...snap, collectedTotal: 10, netBalance: 10 },
        },
      ],
      2026,
      'MDY001',
    );
    expect(result.missingCount).toBe(11);
    expect(result.months[0].missing).toBe(false);
    expect(result.totals.collectedTotal).toBe(10);
  });
});

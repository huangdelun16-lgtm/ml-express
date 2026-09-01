import {
  buildSettlementSnapshot,
  diffSettlementSnapshot,
  filterEntriesForFinancePeriod,
  occurredAtInRange,
  parseFinancePeriodQuery,
  resolveFinancePeriod,
  rollupConfirmedMonths,
  yangonMidnightUtcMs,
  yangonNoonIsoFromYmd,
  yangonYmdFromUtc,
} from './yangonFinancePeriod';

describe('yangonFinancePeriod', () => {
  it('maps UTC instants to Yangon calendar dates', () => {
    expect(yangonYmdFromUtc(new Date('2026-08-30T17:30:00.000Z'))).toEqual({
      y: 2026,
      m: 8,
      d: 31,
    });
    expect(yangonYmdFromUtc(new Date('2026-08-30T17:29:59.000Z'))).toEqual({
      y: 2026,
      m: 8,
      d: 30,
    });
  });

  it('uses Yangon midnight as the day boundary', () => {
    expect(new Date(yangonMidnightUtcMs(2026, 8, 31)).toISOString()).toBe(
      '2026-08-30T17:30:00.000Z',
    );
    expect(new Date(yangonMidnightUtcMs(2026, 9, 1)).toISOString()).toBe(
      '2026-08-31T17:30:00.000Z',
    );
  });

  it('slices a Yangon day as [00:00, next 00:00)', () => {
    const range = resolveFinancePeriod('day', '2026-08-31');
    expect(range.fromIso).toBe('2026-08-30T17:30:00.000Z');
    expect(range.toExclusiveIso).toBe('2026-08-31T17:30:00.000Z');
    expect(range.periodStart).toBe('2026-08-31');
    expect(occurredAtInRange('2026-08-31T00:00:00+06:30', range.fromIso, range.toExclusiveIso)).toBe(
      true,
    );
    expect(occurredAtInRange('2026-08-30T17:29:59.000Z', range.fromIso, range.toExclusiveIso)).toBe(
      false,
    );
    expect(occurredAtInRange('2026-08-31T17:30:00.000Z', range.fromIso, range.toExclusiveIso)).toBe(
      false,
    );
  });

  it('slices a calendar month in Yangon', () => {
    const range = resolveFinancePeriod('month', '2026-08-15');
    expect(range.periodStart).toBe('2026-08-01');
    expect(range.periodEnd).toBe('2026-08-31');
    expect(range.fromIso).toBe('2026-07-31T17:30:00.000Z');
    expect(range.toExclusiveIso).toBe('2026-08-31T17:30:00.000Z');
    expect(range.label).toBe('2026-08');
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

  it('keeps currently outstanding COD/truck fees in later periods', () => {
    const range = resolveFinancePeriod('day', '2026-08-31');
    const filtered = filterEntriesForFinancePeriod(
      [
        {
          id: 'old-cod',
          category: 'order_income_cod',
          occurredAt: '2026-08-01T04:00:00.000Z',
        },
        {
          id: 'paid-old',
          category: 'order_collected',
          occurredAt: '2026-08-01T04:00:00.000Z',
        },
        {
          id: 'today',
          category: 'order_collected',
          occurredAt: '2026-08-31T01:00:00+06:30',
        },
        {
          id: 'unpaid-truck',
          category: 'transport_cost',
          paid: false,
          occurredAt: '2026-07-15T10:00:00.000Z',
        },
      ],
      range,
    );
    expect(filtered.map((e) => e.id).sort()).toEqual(['old-cod', 'today', 'unpaid-truck']);
  });

  it('builds and diffs settlement snapshots', () => {
    const snap = buildSettlementSnapshot(
      { collectedTotal: 100, transportPaidTotal: 40, manualIncomeTotal: 10 },
      [{ id: 'a' }, { id: 'b' }],
    );
    expect(snap.netBalance).toBe(70);
    expect(snap.entryIds).toEqual(['a', 'b']);
    const diff = diffSettlementSnapshot(snap, { ...snap, collectedTotal: 120 });
    expect(diff.hasDiff).toBe(true);
    expect(diff.diffs.collectedTotal.delta).toBe(20);
  });

  it('rolls up confirmed months and flags missing months', () => {
    const result = rollupConfirmedMonths(
      [
        {
          status: 'confirmed',
          period_type: 'month',
          period_start: '2026-01-01',
          store_code: 'MDY001',
          snapshot: {
            collectedTotal: 10,
            pendingInflowTotal: 0,
            transportUnpaidTotal: 0,
            transportPaidTotal: 0,
            manualIncomeTotal: 0,
            manualExpenseTotal: 0,
            agencyPayableTotal: 0,
            agencyRemittedTotal: 0,
            netBalance: 10,
            entryIds: [],
          },
        },
      ],
      2026,
      'MDY001',
    );
    expect(result.missingCount).toBe(11);
    expect(result.months[0].missing).toBe(false);
    expect(result.months[1].missing).toBe(true);
    expect(result.totals.collectedTotal).toBe(10);
  });

  it('puts Yangon noon of entry_date inside that calendar day', () => {
    const iso = yangonNoonIsoFromYmd('2026-08-31');
    const range = resolveFinancePeriod('day', '2026-08-31');
    expect(occurredAtInRange(iso, range.fromIso, range.toExclusiveIso)).toBe(true);
  });
});

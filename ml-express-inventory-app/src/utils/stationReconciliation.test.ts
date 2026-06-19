import { describe, expect, it } from 'vitest';
import type { FinanceLedgerEntry } from '../types/financeLedger';
import {
  buildCrossBorderFinanceSummary,
  buildStationReconciliationSummary,
} from './stationReconciliation';

function entry(
  overrides: Partial<FinanceLedgerEntry> & Pick<FinanceLedgerEntry, 'id' | 'category'>,
): FinanceLedgerEntry {
  return {
    title: 't',
    subtitle: 's',
    amount: 0,
    amountDisplay: '0',
    occurredAt: '2026-06-18T10:00:00Z',
    barcode: 'X',
    itemName: 'item',
    ...overrides,
  };
}

describe('buildStationReconciliationSummary', () => {
  it('待入账仅含本站目的待收，不含发站在途到付', () => {
    const entries: FinanceLedgerEntry[] = [
      entry({
        id: '1',
        category: 'order_income_cod',
        amount: 50000,
        destination: 'YGN',
        originKey: 'MUSE',
        originLabel: 'MUSE',
      }),
      entry({
        id: '2',
        category: 'order_income_cod',
        amount: 30000,
        destination: 'MDY',
        originKey: 'MUSE',
        originLabel: 'MUSE',
      }),
      entry({
        id: '3',
        category: 'order_income_cod',
        amount: 20000,
        destination: 'YGN',
        originKey: 'MUSE',
        originLabel: 'MUSE',
      }),
    ];

    const muse = buildStationReconciliationSummary(entries, 'MUSE001', 'MUSE');
    expect(muse.pendingInflowTotal).toBe(0);
    expect(muse.collectedTotal).toBe(0);

    const mdy = buildStationReconciliationSummary(entries, 'MDY001', 'MDY');
    expect(mdy.pendingInflowTotal).toBe(30000);
  });

  it('拆分待支付与已支付车费', () => {
    const entries: FinanceLedgerEntry[] = [
      entry({
        id: 't1',
        category: 'transport_cost',
        amount: 15000,
        transportFee: 15000,
        paid: false,
        destination: 'MDY',
        originKey: 'MUSE',
        transportDirection: 'inbound',
      }),
      entry({
        id: 't2',
        category: 'transport_cost',
        amount: 0,
        transportFee: 8000,
        paid: true,
        destination: 'MDY',
        originKey: 'MUSE',
        transportDirection: 'inbound',
      }),
    ];

    const mdy = buildStationReconciliationSummary(entries, 'MDY001', 'MDY');
    expect(mdy.transportUnpaidTotal).toBe(15000);
    expect(mdy.transportPaidTotal).toBe(8000);
  });

  it('跨境财务：已收含预付与已签收（含代收）', () => {
    const entries: FinanceLedgerEntry[] = [
      entry({
        id: 'p1',
        category: 'order_prepaid',
        amount: 10000,
        originKey: 'MUSE',
      }),
      entry({
        id: 'c1',
        category: 'order_collected',
        amount: 20000,
        destination: 'MDY',
        originKey: 'MDY',
      }),
      entry({
        id: 'c2',
        category: 'order_collected',
        amount: 30000,
        destination: 'MDY',
        originKey: 'MUSE',
        originLabel: 'MUSE',
      }),
    ];

    const muse = buildCrossBorderFinanceSummary(entries, 'MUSE001', 'MUSE');
    expect(muse.collectedTotal).toBe(10000);

    const mdy = buildCrossBorderFinanceSummary(entries, 'MDY001', 'MDY');
    expect(mdy.collectedTotal).toBe(50000);
    expect(mdy.agencyPayableTotal).toBe(30000);
  });

  it('跨境财务：车费仅运达站待付/已付，不含发站 outbound', () => {
    const entries: FinanceLedgerEntry[] = [
      entry({
        id: 'out',
        category: 'transport_cost',
        amount: 12000,
        transportFee: 12000,
        paid: false,
        destination: 'MDY',
        originKey: 'MUSE',
        transportDirection: 'outbound',
      }),
      entry({
        id: 'in-unpaid',
        category: 'transport_cost',
        amount: 15000,
        transportFee: 15000,
        paid: false,
        destination: 'MDY',
        originKey: 'MUSE',
        transportDirection: 'inbound',
      }),
      entry({
        id: 'in-paid',
        category: 'transport_cost',
        amount: 0,
        transportFee: 8000,
        paid: true,
        destination: 'MDY',
        originKey: 'MUSE',
        transportDirection: 'inbound',
      }),
    ];

    const muse = buildCrossBorderFinanceSummary(entries, 'MUSE001', 'MUSE');
    expect(muse.transportUnpaidTotal).toBe(0);
    expect(muse.transportPaidTotal).toBe(0);

    const mdy = buildCrossBorderFinanceSummary(entries, 'MDY001', 'MDY');
    expect(mdy.transportUnpaidTotal).toBe(15000);
    expect(mdy.transportPaidTotal).toBe(8000);
  });

  it('跨境财务：待入账仅其它地区发往本站的到付', () => {
    const entries: FinanceLedgerEntry[] = [
      entry({
        id: 'agency',
        category: 'order_income_cod',
        amount: 40000,
        destination: 'MDY',
        originKey: 'MUSE',
        originLabel: 'MUSE',
      }),
      entry({
        id: 'local',
        category: 'order_income_cod',
        amount: 25000,
        destination: 'MDY',
        originKey: 'MDY',
      }),
    ];

    const muse = buildCrossBorderFinanceSummary(entries, 'MUSE001', 'MUSE');
    expect(muse.pendingInflowTotal).toBe(0);

    const mdy = buildCrossBorderFinanceSummary(entries, 'MDY001', 'MDY');
    expect(mdy.pendingInflowTotal).toBe(40000);
  });
});

import { describe, expect, it } from 'vitest';
import type { FinanceLedgerEntry } from '../types/financeLedger';
import {
  filterByTab,
  formatMmk,
  formatMmkWithUnit,
  isAgencyEntry,
  isCrossStationCodPending,
} from './crossBorderFinanceTabs';

function entry(
  partial: Partial<FinanceLedgerEntry> & Pick<FinanceLedgerEntry, 'id' | 'category'>,
): FinanceLedgerEntry {
  return {
    title: '',
    subtitle: '',
    amount: null,
    amountDisplay: '',
    occurredAt: '',
    barcode: '',
    itemName: '',
    ...partial,
  };
}

const CURRENT = 'MDY001';

describe('formatMmk', () => {
  it('零与负数显示 0', () => {
    expect(formatMmk(0)).toBe('0');
    expect(formatMmk(-12)).toBe('0');
  });

  it('整数不带小数，非整保留两位', () => {
    expect(formatMmk(1200)).toBe('1200');
    expect(formatMmk(12.5)).toBe('12.50');
  });

  it('带单位', () => {
    expect(formatMmkWithUnit(100)).toBe('100 MMK');
  });
});

describe('filterByTab', () => {
  const inboundFee = entry({
    id: 't-in',
    category: 'transport_cost',
    transportDirection: 'inbound',
  });
  const outboundFee = entry({
    id: 't-out',
    category: 'transport_cost',
    transportDirection: 'outbound',
  });
  const agencyCollected = entry({
    id: 'ag',
    category: 'order_collected',
    originKey: 'YGN001',
  });
  const localCollected = entry({
    id: 'local',
    category: 'order_collected',
    originKey: CURRENT,
  });
  const pendingCod = entry({
    id: 'pend',
    category: 'order_income_cod',
    originKey: 'YGN001',
  });
  const localCod = entry({
    id: 'local-cod',
    category: 'order_income_cod',
    originKey: CURRENT,
  });
  const prepaidAgency = entry({
    id: 'pre',
    category: 'order_prepaid',
    originKey: 'YGN001',
  });
  const manualIn = entry({ id: 'mi', category: 'manual_income' });
  const manualOut = entry({ id: 'me', category: 'manual_expense' });

  const all = [
    inboundFee,
    outboundFee,
    agencyCollected,
    localCollected,
    pendingCod,
    localCod,
    prepaidAgency,
    manualIn,
    manualOut,
  ];

  it('all 原样返回', () => {
    expect(filterByTab(all, 'all', CURRENT)).toEqual(all);
  });

  it('transport 只含非 outbound 车费', () => {
    expect(filterByTab(all, 'transport', CURRENT).map((e) => e.id)).toEqual(['t-in']);
  });

  it('agency 为他站已收/预付', () => {
    expect(filterByTab(all, 'agency', CURRENT).map((e) => e.id)).toEqual(['ag', 'pre']);
  });

  it('pending 为他站到付待收', () => {
    expect(filterByTab(all, 'pending', CURRENT).map((e) => e.id)).toEqual(['pend']);
  });

  it('manual 为手工收支', () => {
    expect(filterByTab(all, 'manual', CURRENT).map((e) => e.id)).toEqual(['mi', 'me']);
  });
});

describe('isAgencyEntry / isCrossStationCodPending', () => {
  it('本站来源不算代收', () => {
    expect(
      isAgencyEntry(entry({ id: '1', category: 'order_collected', originKey: CURRENT }), CURRENT),
    ).toBe(false);
  });

  it('缺 originKey 不算代收', () => {
    expect(isAgencyEntry(entry({ id: '1', category: 'order_collected' }), CURRENT)).toBe(false);
  });

  it('本站到付不算跨站待收', () => {
    expect(
      isCrossStationCodPending(
        entry({ id: '1', category: 'order_income_cod', originKey: CURRENT }),
        CURRENT,
      ),
    ).toBe(false);
  });
});

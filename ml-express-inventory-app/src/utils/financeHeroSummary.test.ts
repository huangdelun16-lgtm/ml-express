import { describe, expect, it } from 'vitest';
import { buildFinanceCapsuleLine, buildFinanceHeroView } from './financeHeroSummary';

const emptySummary = {
  collectedTotal: 0,
  transportUnpaidTotal: 0,
  transportPaidTotal: 0,
  pendingInflowTotal: 0,
  manualIncomeTotal: 0,
  manualExpenseTotal: 0,
};

describe('buildFinanceHeroView', () => {
  it('uses settled CNY plus floating pending/manual when rate is ready', () => {
    const view = buildFinanceHeroView(
      {
        ...emptySummary,
        collectedTotal: 10000,
        pendingInflowTotal: 500,
        manualIncomeTotal: 250,
        transportPaidTotal: 3000,
      },
      20,
      500,
    );
    expect(view.customerLedgerMmk).toBe(10750);
    expect(view.myanmarLedgerMmk).toBe(3000);
    expect(view.customerCny).toBeCloseTo(21.5);
    expect(view.collected.value).toBe('¥20');
    expect(view.collected.subValue).toBe('10,000 MMK');
  });

  it('hides split CNY when collected exists but settled CNY is missing', () => {
    const view = buildFinanceHeroView(
      { ...emptySummary, collectedTotal: 8000 },
      null,
      500,
    );
    expect(view.customerCny).toBeNull();
    expect(buildFinanceCapsuleLine(view, 8000)).toEqual({ kind: 'net', netBalance: 8000 });
  });

  it('shows split capsule when only floating amounts need a live rate', () => {
    const view = buildFinanceHeroView(
      { ...emptySummary, pendingInflowTotal: 1000, transportUnpaidTotal: 200 },
      0,
      500,
    );
    expect(view.customerCny).toBeCloseTo(2);
    expect(buildFinanceCapsuleLine(view, 0)).toEqual({
      kind: 'split',
      customerCny: 2,
      myanmarLedgerMmk: 200,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { exportCostLedgerEntry, sumExportCostTotals } from './exportCostLedger';

describe('exportCostLedgerEntry', () => {
  it('keeps a CNY export cost in yuan', () => {
    const entry = exportCostLedgerEntry({
      id: '1',
      displayBarcode: 'RUI26MDY40002',
      customerName: 'AMT',
      legDestination: 'MSE',
      weightKg: 10,
      unitPriceCny: 2,
      totalCny: 20,
      totalMmk: 0,
      payCurrency: 'CNY',
      tripNumber: 'MSE0007',
      createdAt: '2026-10-30T10:00:00.000Z',
    });
    expect(entry.category).toBe('export_cost');
    expect(entry.amountDisplay).toBe('¥20');
    expect(entry.paidCny).toBe(20);
    expect(entry.subtitle).toContain('瑞丽 → 木姐');
  });

  it('keeps an MMK export cost in kyat', () => {
    const entry = exportCostLedgerEntry({
      id: '2',
      displayBarcode: 'RUI26LSO1',
      customerName: '',
      legDestination: 'LSO',
      weightKg: 1,
      unitPriceCny: 4,
      totalCny: 0,
      totalMmk: 2800,
      payCurrency: 'MMK',
      tripNumber: '',
      createdAt: '2026-10-30T10:00:00.000Z',
    });
    expect(entry.amount).toBe(2800);
    expect(entry.paidCny).toBe(0);
    expect(sumExportCostTotals([entry, exportCostLedgerEntry({
      id: '1',
      displayBarcode: 'A',
      customerName: '',
      legDestination: 'MSE',
      weightKg: 1,
      unitPriceCny: 20,
      totalCny: 20,
      totalMmk: 0,
      payCurrency: 'CNY',
      tripNumber: '',
      createdAt: '',
    })])).toEqual({ cny: 20, mmk: 2800 });
  });
});

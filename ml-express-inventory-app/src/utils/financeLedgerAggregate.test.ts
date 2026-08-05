import { describe, expect, it } from 'vitest';
import type { FinanceLedgerEntry } from '../types/financeLedger';
import {
  buildFinanceLedgerEntries,
  buildFinanceLedgerSummary,
  filterCrossBorderFinanceEntries,
  type FinanceDataset,
} from './financeLedgerAggregate';

function dataset(overrides: Partial<FinanceDataset> = {}): FinanceDataset {
  return {
    items: [],
    movements: [],
    packages: [],
    orders: [],
    paidTransportBarcodes: new Set(),
    manualEntries: [],
    ...overrides,
  };
}

describe('buildFinanceLedgerEntries', () => {
  it('聚合本站目的订单、签收收款、入站车费和本站手工收支', () => {
    const entries = buildFinanceLedgerEntries(
      'MDY001',
      'MDY',
      dataset({
        items: [
          {
            id: 'item-1',
            barcode: 'ORDER-1',
            final_destination: 'MDY',
            recipient_name: '客户',
            customer_signed_at: '2026-07-15T10:00:00Z',
          },
        ],
        movements: [
          {
            id: 'movement-1',
            item_id: 'item-1',
            barcode: 'ORDER-1',
            item_name: '订单一',
            type: 'in',
            qty: 1,
            note: '总费用 50000 MMK · 到付',
            destination: 'MDY',
            origin_store_code: 'MUSE001',
            origin_store_name: '木姐',
            created_at: '2026-07-15T10:00:00Z',
          },
        ],
        packages: [
          {
            pack_barcode: 'PKG-1',
            pack_name: '包一',
            origin_store_code: 'MUSE001',
            origin_store_name: '木姐',
            destination_code: 'MDY',
            leg_destination_code: 'MDY',
            transport_fee: '12000 MMK',
            truck_loaded_at: '2026-07-15T09:00:00Z',
          },
          {
            pack_barcode: 'PKG-OTHER',
            origin_store_code: 'MUSE001',
            destination_code: 'YGN',
            leg_destination_code: 'YGN',
            transport_fee: '99999',
          },
        ],
        paidTransportBarcodes: new Set(['PKG-1']),
        manualEntries: [
          {
            id: 'manual-1',
            entry_date: '2026-07-15',
            kind: 'expense',
            amount: 3000,
            category: '燃油',
            created_at: '2026-07-15T08:00:00Z',
          },
        ],
      }),
    );
    const finance = filterCrossBorderFinanceEntries(entries);

    expect(finance.map((entry) => entry.category)).toEqual([
      'order_collected',
      'transport_cost',
      'manual_expense',
    ]);
    expect(finance.find((entry) => entry.category === 'transport_cost')).toMatchObject({
      barcode: 'PKG-1',
      paid: true,
      transportFee: 12000,
      amount: 0,
    });
    expect(finance.find((entry) => entry.category === 'manual_expense')).toMatchObject({
      manualEntryId: 'manual-1',
      deletable: true,
    });

    const summary = buildFinanceLedgerSummary(finance, 'MDY001', 'MDY', true);
    expect(summary).toMatchObject({
      collectedTotal: 50000,
      agencyPayableTotal: 50000,
      transportPaidTotal: 12000,
      transportUnpaidTotal: 0,
      manualExpenseTotal: 3000,
    });
  });

  it('同一订单优先使用本站流水并去重云端订单追踪', () => {
    const entries = buildFinanceLedgerEntries(
      'MDY001',
      'MDY',
      dataset({
        items: [{ id: 'i1', barcode: 'O1', final_destination: 'MDY' }],
        movements: [
          {
            id: 'm1',
            item_id: 'i1',
            barcode: 'O1',
            type: 'in',
            note: '总费用 100 MMK · 到付',
            destination: 'MDY',
            origin_store_code: 'MUSE001',
          },
        ],
        packages: [
          {
            pack_barcode: 'P1',
            origin_store_code: 'MUSE001',
            leg_destination_code: 'MDY',
          },
        ],
        orders: [
          {
            pack_barcode: 'P1',
            order_barcode: 'O1',
            destination_code: 'MDY',
            inbound_note: '总费用 100 MMK · 到付',
          },
        ],
      }),
    );
    expect(
      filterCrossBorderFinanceEntries(entries).filter(
        (entry) => entry.category === 'order_income_cod',
      ),
    ).toHaveLength(1);
  });
});

describe('packaging stock-in finance', () => {
  it('解析英文 Total fee / COD，并从包 note 补总费用（同包只计一次）', () => {
    const entries = buildFinanceLedgerEntries(
      'MUSE001',
      'MSE',
      dataset({
        items: [
          {
            id: 'i1',
            barcode: 'MDY131412040826(3-1)',
            final_destination: 'MDY',
            packed_bundle_barcode: 'RUI26MDY30006',
          },
          {
            id: 'i2',
            barcode: 'MDY131412040826(3-2)',
            final_destination: 'MDY',
            packed_bundle_barcode: 'RUI26MDY30006',
          },
          {
            id: 'i3',
            barcode: 'MDY131412040826(3-3)',
            final_destination: 'MDY',
            packed_bundle_barcode: 'RUI26MDY30006',
          },
        ],
        movements: [
          {
            id: 'm1',
            item_id: 'i1',
            barcode: 'MDY131412040826(3-1)',
            type: 'in',
            note: 'Prepaid · 打包入 RUI26MDY30006',
            destination: 'MDY',
            origin_store_code: 'MUSE001',
          },
          {
            id: 'm2',
            item_id: 'i2',
            barcode: 'MDY131412040826(3-2)',
            type: 'in',
            note: 'Prepaid · 打包入 RUI26MDY30006',
            destination: 'MDY',
            origin_store_code: 'MUSE001',
          },
          {
            id: 'm3',
            item_id: 'i3',
            barcode: 'MDY131412040826(3-3)',
            type: 'in',
            note: 'Prepaid · 打包入 RUI26MDY30006',
            destination: 'MDY',
            origin_store_code: 'MUSE001',
          },
        ],
        packNotesByBarcode: {
          RUI26MDY30006: '多个入库 · 总费用 50000 MMK · 09',
        },
      }),
    );
    const finance = filterCrossBorderFinanceEntries(entries);
    const prepaid = finance.filter((entry) => entry.category === 'order_prepaid');
    expect(prepaid).toHaveLength(1);
    expect(prepaid[0].amount).toBe(50000);

    const summary = buildFinanceLedgerSummary(finance, 'MUSE001', 'MSE', true);
    expect(summary.collectedTotal).toBe(50000);
  });

  it('新多个入库行 note 含总费用时按 (3-n) 去重', () => {
    const entries = buildFinanceLedgerEntries(
      'MUSE001',
      'MSE',
      dataset({
        items: [
          { id: 'i1', barcode: 'MDY1(3-1)', final_destination: 'MDY' },
          { id: 'i2', barcode: 'MDY1(3-2)', final_destination: 'MDY' },
          { id: 'i3', barcode: 'MDY1(3-3)', final_destination: 'MDY' },
        ],
        movements: [
          {
            id: 'm1',
            item_id: 'i1',
            barcode: 'MDY1(3-1)',
            type: 'in',
            note: '总费用 90000 MMK · 预付',
            destination: 'MDY',
            origin_store_code: 'MUSE001',
          },
          {
            id: 'm2',
            item_id: 'i2',
            barcode: 'MDY1(3-2)',
            type: 'in',
            note: '总费用 90000 MMK · 预付',
            destination: 'MDY',
            origin_store_code: 'MUSE001',
          },
          {
            id: 'm3',
            item_id: 'i3',
            barcode: 'MDY1(3-3)',
            type: 'in',
            note: '总费用 90000 MMK · 预付',
            destination: 'MDY',
            origin_store_code: 'MUSE001',
          },
        ],
      }),
    );
    const summary = buildFinanceLedgerSummary(
      filterCrossBorderFinanceEntries(entries),
      'MUSE001',
      'MSE',
      true,
    );
    expect(summary.collectedTotal).toBe(90000);
  });
});

describe('filterCrossBorderFinanceEntries', () => {
  it('排除库存操作和发站 outbound 车费', () => {
    const base: Omit<FinanceLedgerEntry, 'id' | 'category'> = {
      title: 't',
      subtitle: '',
      amount: 1,
      amountDisplay: '1',
      occurredAt: '',
      barcode: '',
      itemName: '',
    };
    const rows: FinanceLedgerEntry[] = [
      { ...base, id: 'stock', category: 'stock_op' },
      {
        ...base,
        id: 'out',
        category: 'transport_cost',
        transportDirection: 'outbound',
      },
      {
        ...base,
        id: 'in',
        category: 'transport_cost',
        transportDirection: 'inbound',
      },
    ];
    expect(filterCrossBorderFinanceEntries(rows).map((row) => row.id)).toEqual(['in']);
  });
});

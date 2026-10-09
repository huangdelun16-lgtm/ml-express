import { describe, expect, it } from 'vitest';
import {
  buildExportCostBoard,
  exportCostLineTotal,
  exportCostOptionsFromPacks,
  matchesExportCostQuery,
  withoutSavedExportCosts,
} from './exportCostBoard';
import type { InventoryItemListRow } from '../types/inventory';

function row(partial: Partial<InventoryItemListRow> & Pick<InventoryItemListRow, 'id' | 'barcode'>): InventoryItemListRow {
  return {
    name: partial.barcode,
    spec: '',
    unit: '件',
    weight: '',
    qty_on_hand: 1,
    min_qty: 0,
    note: '',
    input_barcode: '',
    created_at: '',
    updated_at: '',
    stocked_in: true,
    packed: false,
    hub_arrived: false,
    hub_transit_released: false,
    hub_transit_shipped: false,
    customer_signed: false,
    ...partial,
  };
}

describe('buildExportCostBoard', () => {
  it('lists single inbound orders and collapses a multiple inbound batch', () => {
    const board = buildExportCostBoard([
      row({
        id: 's1',
        barcode: 'MDY001',
        input_barcode: 'EXP-1',
        customer_name: 'A',
        final_destination: 'MDY',
        weight: '8 Kg',
      }),
      row({
        id: 'p1',
        barcode: 'RUI26MDY50002(5-1)',
        customer_name: 'Ei',
        final_destination: 'MDY',
        weight: '3 Kg',
      }),
      row({
        id: 'p2',
        barcode: 'RUI26MDY50002(5-2)',
        customer_name: 'Ei',
        weight: '5 Kg',
      }),
      row({ id: 'shell', barcode: 'RUI26MDY50002', weight: '75 Kg' }),
      row({ id: 'gone', barcode: 'MDY009', hub_transit_shipped: true, input_barcode: 'SHIPPED' }),
    ]);

    expect(board.singles).toEqual([
      { id: 's1', barcode: 'EXP-1', customer: 'A', destination: 'MDY', weightKg: 8, tripNumber: '' },
      { id: 'gone', barcode: 'SHIPPED', customer: '', destination: '', weightKg: 0, tripNumber: '' },
    ]);
    expect(board.packages).toEqual([
      {
        base: 'RUI26MDY50002',
        customer: 'Ei',
        destination: 'MDY',
        pieceCount: 2,
        declaredTotal: 5,
        weightKg: 8,
        tripNumber: '',
      },
    ]);
  });

  it('keeps a loaded order, shows its trip, and uses the package total weight', () => {
    const options = exportCostOptionsFromPacks(
      [
        {
          loaded: true,
          bundle_barcode: 'RUI26MDY10001',
          trip_number: 'RUI0009',
          weight: '4 Kg',
          items: [{ item_id: 'left', item_barcode: 'MDY011' }],
        },
        {
          loaded: false,
          bundle_barcode: 'RUI26MDY50003',
          weight: '75 Kg',
          items: [],
        },
      ],
      [{ barcode: 'RUI26MDY50003', trip: 'RUI0008', weightKg: 12 }],
    );
    const board = buildExportCostBoard(
      [
        row({ id: 'stay', barcode: 'MDY010', input_barcode: 'STAY' }),
        row({
          id: 'left',
          barcode: 'MDY011',
          input_barcode: 'LEFT',
          packed_bundle_barcode: 'RUI26MDY10001',
        }),
        row({ id: 'p1', barcode: 'RUI26MDY50003(2-1)', customer_name: 'B', weight: '1 Kg' }),
        row({ id: 'p2', barcode: 'RUI26MDY50003(2-2)', customer_name: 'B', weight: '1 Kg' }),
        row({ id: 'signed', barcode: 'MDY099', customer_signed: true, input_barcode: 'DONE' }),
      ],
      options,
    );

    expect(board.singles.map((item) => [item.barcode, item.tripNumber])).toEqual([
      ['LEFT', 'RUI0009'],
      ['STAY', ''],
    ]);
    expect(board.packages).toEqual([
      {
        base: 'RUI26MDY50003',
        customer: 'B',
        destination: '',
        pieceCount: 2,
        declaredTotal: 2,
        weightKg: 75,
        tripNumber: 'RUI0008',
      },
    ]);
    expect(exportCostLineTotal(2.5, 75)).toBe(187.5);
    expect(exportCostLineTotal(0, 75)).toBe(0);
  });

  it('uses the bundle weight when multiple inbound pieces do not carry weight', () => {
    const options = exportCostOptionsFromPacks([
      {
        loaded: false,
        bundle_barcode: 'RUI26MDY40026',
        weight: '18 Kg',
        items: [
          { item_barcode: 'MDY420311071026(4-1)' },
          { item_barcode: 'MDY420311071026(4-2)' },
        ],
      },
    ]);
    const board = buildExportCostBoard(
      [
        row({
          id: 'a',
          barcode: 'MDY420311071026(4-1)',
          customer_name: 'Ei',
          final_destination: 'MDY',
          packed_bundle_barcode: 'RUI26MDY40026',
        }),
        row({
          id: 'b',
          barcode: 'MDY420311071026(4-2)',
          packed_bundle_barcode: 'RUI26MDY40026',
        }),
      ],
      options,
    );

    expect(board.packages).toEqual([
      {
        base: 'MDY420311071026',
        customer: 'Ei',
        destination: 'MDY',
        pieceCount: 2,
        declaredTotal: 4,
        weightKg: 18,
        tripNumber: '',
      },
    ]);
  });

  it('removes only the orders and packages that already have an export cost', () => {
    const board = buildExportCostBoard([
      row({ id: 's1', barcode: 'MDY001', input_barcode: 'KEEP' }),
      row({ id: 's2', barcode: 'MDY002', input_barcode: 'ADDED' }),
      row({ id: 'p1', barcode: 'RUI26MDY50002(2-1)' }),
      row({ id: 'p2', barcode: 'RUI26MDY50002(2-2)' }),
      row({ id: 'q1', barcode: 'RUI26MDY50009(2-1)' }),
    ]);
    const next = withoutSavedExportCosts(board, [
      { subjectKind: 'single', subjectKey: 's2' },
      { subjectKind: 'package', subjectKey: 'rui26mdy50002' },
    ]);

    expect(next.singles.map((item) => item.barcode)).toEqual(['KEEP']);
    expect(next.packages.map((item) => item.base)).toEqual(['RUI26MDY50009']);
  });

  it('matches an export cost row by barcode, customer, or trip', () => {
    expect(matchesExportCostQuery('khaing', ['DPK1', 'Ei Ei Khaing', 'MDY', 'RUI0026'])).toBe(true);
    expect(matchesExportCostQuery('rui0026', ['DPK1', 'Ei', 'MDY', 'RUI0026'])).toBe(true);
    expect(matchesExportCostQuery('missing', ['DPK1', 'Ei', 'MDY', ''])).toBe(false);
    expect(matchesExportCostQuery('  ', ['DPK1'])).toBe(true);
  });
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { appendExportCosts } = require('./exportCostFinance');

test('adds the export cost into the finance list in CNY and skips other stations', () => {
  const finance = {
    entries: [
      {
        id: 'fee-1',
        category: 'transport_unpaid',
        occurredAt: '2026-10-08T02:00:00.000Z',
        amount: 1000,
      },
    ],
    summary: { entryCount: 1, manualExpenseTotal: 0 },
  };
  const next = appendExportCosts(
    finance,
    [
      {
        id: 'c1',
        display_barcode: 'SF1',
        customer_name: 'Ei',
        leg_destination: 'MSE',
        weight_kg: 8,
        unit_price_cny: 2.5,
        total_cny: 20,
        trip_number: 'RUI0008',
        store_code: 'RUILI001',
        created_at: '2026-10-08T03:00:00.000Z',
      },
      {
        id: 'c2',
        display_barcode: 'SF2',
        leg_destination: 'LSO',
        weight_kg: 1,
        unit_price_cny: 3,
        total_cny: 3,
        store_code: 'MDY001',
        created_at: '2026-10-08T04:00:00.000Z',
      },
    ],
    [{ store_code: 'RUILI001', store_name: '瑞丽仓' }],
    { storeCode: 'RUILI001' },
  );

  assert.equal(next.summary.exportCostCnyTotal, 20);
  assert.equal(next.summary.entryCount, 2);
  assert.equal(next.entries[0].category, 'export_cost');
  assert.equal(next.entries[0].title, 'SF1');
  assert.equal(next.entries[0].amount, 20);
  assert.equal(next.entries[0].paidCurrency, 'CNY');
  assert.equal(next.entries[0].stationName, '瑞丽仓');
  assert.equal(next.entries[0].statusLabel, '已添加');
  assert.match(next.entries[0].subtitle, /瑞丽 → 木姐/);
  assert.match(next.entries[0].subtitle, /车次 RUI0008/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { BUSINESS_WIPE_TABLES, BUSINESS_WIPE_KEEP_TABLES } = require('./clearCrossBorderBusiness');

test('full cross-border wipe includes invoices and export costs', () => {
  const tables = BUSINESS_WIPE_TABLES.map((spec) => spec.table);
  assert.equal(tables.includes('inventory_signed_invoices'), true);
  assert.equal(tables.includes('inventory_export_costs'), true);
  assert.equal(tables.includes('inventory_hub_transport_fee_payments'), true);
  assert.equal(tables.includes('cross_border_manual_entries'), true);
  assert.equal(tables.includes('inventory_store_items'), true);
  assert.equal(tables.includes('inventory_stock_movements'), true);
  assert.equal(tables.includes('inventory_agency_remittances'), true);
  assert.equal(tables.includes('inventory_station_settlements'), true);
  for (const kept of BUSINESS_WIPE_KEEP_TABLES) {
    assert.equal(tables.includes(kept), false);
  }
});

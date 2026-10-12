/**
 * 清空全部跨境业务数据时整表删除的范围。
 * 不包含中转站账号、推销员、登记客户、计费、车次号/发票号计数器、个人账和同城财务。
 */
const BUSINESS_WIPE_TABLES = [
  { key: 'orderTracking', table: 'inventory_order_tracking' },
  { key: 'transportFeePayments', table: 'inventory_hub_transport_fee_payments', idColumn: 'pack_barcode' },
  { key: 'pkgTracking', table: 'inventory_pkg_tracking' },
  { key: 'packedShipmentItems', table: 'inventory_packed_shipment_items' },
  { key: 'packedShipments', table: 'inventory_packed_shipments' },
  { key: 'stockMovements', table: 'inventory_stock_movements' },
  { key: 'storeItems', table: 'inventory_store_items' },
  { key: 'crossBorderManualEntries', table: 'cross_border_manual_entries' },
  { key: 'stationSettlements', table: 'inventory_station_settlements' },
  { key: 'agencyRemittances', table: 'inventory_agency_remittances' },
  { key: 'exceptionPhotos', table: 'inventory_exception_photos' },
  { key: 'exceptions', table: 'inventory_exceptions' },
  { key: 'exportCosts', table: 'inventory_export_costs' },
  { key: 'signedInvoices', table: 'inventory_signed_invoices' },
];

const BUSINESS_WIPE_KEEP_TABLES = [
  'delivery_stores',
  'cross_border_customers',
  'cross_border_salespersons',
  'inventory_trip_sequences',
  'inventory_invoice_day_sequences',
  'system_settings',
  'personal_ledger_entries',
  'finances',
];

module.exports = {
  BUSINESS_WIPE_TABLES,
  BUSINESS_WIPE_KEEP_TABLES,
};

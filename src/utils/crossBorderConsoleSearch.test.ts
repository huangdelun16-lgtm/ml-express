import {
  compactSearch,
  digitsOnly,
  filterCustomerSummaries,
  filterOrders,
  filterPacks,
  filterRegisteredCustomers,
  matchesConsoleQuery,
  normalizeSearch,
} from './crossBorderConsoleSearch';

describe('crossBorderConsoleSearch', () => {
  it('normalizes and compact-matches barcodes and phones', () => {
    expect(normalizeSearch('  PKG-01  ')).toBe('pkg-01');
    expect(compactSearch('PKG-01')).toBe('pkg01');
    expect(digitsOnly('09-123-45678')).toBe('0912345678');
    expect(matchesConsoleQuery('pkg01', 'PKG-01')).toBe(true);
    expect(matchesConsoleQuery('09123', '09-123-45678')).toBe(true);
    expect(matchesConsoleQuery('12', '0912')).toBe(false);
  });

  it('filters registered customers and express summaries together', () => {
    const registered = [
      {
        customer_name: '张三',
        phone: '09123456789',
        customer_code: 'MDY-001',
        notify_account: 'zhang',
      },
      {
        customer_name: '李四',
        phone: '09987654321',
        customer_code: 'YGN-002',
      },
    ];
    expect(filterRegisteredCustomers(registered, 'mdy001').map((row) => row.customer_code)).toEqual([
      'MDY-001',
    ]);
    expect(filterRegisteredCustomers(registered, '李').map((row) => row.customer_name)).toEqual([
      '李四',
    ]);

    const summaries = [
      { customerKey: 'a', customerCode: 'MDY-001', customerName: '张三', customerPhone: '0912' },
      { customerKey: 'b', customerCode: 'YGN-002', customerName: '李四', customerPhone: '0998' },
    ];
    expect(filterCustomerSummaries(summaries, 'YGN').map((row) => row.customerCode)).toEqual([
      'YGN-002',
    ]);
  });

  it('filters packs by barcode, trip and route', () => {
    const packs = [
      {
        pack_barcode: 'PKG-88',
        trip_number: 'T-12',
        origin_store_code: 'YGN',
        leg_destination_code: 'MDY',
      },
      {
        pack_barcode: 'PKG-99',
        trip_number: 'T-13',
        origin_store_code: 'MDY',
        destination_code: 'NPT',
      },
    ];
    expect(filterPacks(packs, 'pkg88').map((row) => row.pack_barcode)).toEqual(['PKG-88']);
    expect(filterPacks(packs, 'ygn → mdy').map((row) => row.pack_barcode)).toEqual(['PKG-88']);
    expect(filterPacks(packs, 'T13').map((row) => row.pack_barcode)).toEqual(['PKG-99']);
  });

  it('filters orders by barcode, pack, name and phone', () => {
    const orders = [
      {
        order_barcode: 'IN-100',
        express_barcode: 'SF123',
        pack_barcode: 'PKG-88',
        recipient_name: '张三',
        recipient_phone: '09123456789',
        destination_code: 'MDY',
      },
      {
        order_barcode: 'IN-200',
        express_barcode: 'YT999',
        pack_barcode: 'PKG-99',
        order_name: '衣服',
        recipient_phone: '0998',
      },
    ];
    expect(filterOrders(orders, 'sf123').map((row) => row.order_barcode)).toEqual(['IN-100']);
    expect(filterOrders(orders, 'pkg-88').map((row) => row.order_barcode)).toEqual(['IN-100']);
    expect(filterOrders(orders, '衣服').map((row) => row.order_barcode)).toEqual(['IN-200']);
  });
});

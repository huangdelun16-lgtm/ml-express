import { describe, expect, it } from 'vitest';
import { buildOrderDataIssues, detectOrderDataIssueCodes } from './orderDataQuality';

describe('detectOrderDataIssueCodes', () => {
  it('flags missing customer, phone, and destination', () => {
    expect(
      detectOrderDataIssueCodes({
        stocked_in: true,
        customer_name: '',
        recipient_phone: '',
        destination: '',
      }),
    ).toEqual(['missing_customer', 'missing_phone', 'missing_destination']);
  });

  it('skips signed orders', () => {
    expect(
      detectOrderDataIssueCodes({
        customer_signed_at: '2026-06-01',
        customer_name: '',
      }),
    ).toEqual([]);
  });
});

describe('buildOrderDataIssues', () => {
  it('only includes stocked-in rows with issues', () => {
    const issues = buildOrderDataIssues([
      {
        id: '1',
        barcode: 'MDY001',
        name: 'A',
        stocked_in: true,
        customer_name: 'U Aung',
        recipient_phone: '09',
        destination: 'YGN',
      },
      {
        id: '2',
        barcode: 'MDY002',
        name: 'B',
        stocked_in: false,
        customer_name: '',
      },
    ]);
    expect(issues).toHaveLength(0);
  });
});

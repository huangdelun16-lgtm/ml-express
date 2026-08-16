import { describe, expect, it } from 'vitest';
import { resolveItemOrderNumber, resolveItemProductSubtitle } from './itemOrderNumber';

describe('resolveItemOrderNumber', () => {
  it('prefers the express slip the operator typed', () => {
    expect(
      resolveItemOrderNumber({
        input_barcode: '77',
        name: '77',
        barcode: 'MDY404106030826(3-1)',
      }),
    ).toBe('77');
  });

  it('falls back to name then inbound barcode', () => {
    expect(resolveItemOrderNumber({ name: 'Phone case', barcode: 'MDY001' })).toBe('Phone case');
    expect(resolveItemOrderNumber({ barcode: 'MDY001' })).toBe('MDY001');
  });
});

describe('resolveItemProductSubtitle', () => {
  it('hides product name when it is just a copy of the order or customer', () => {
    expect(
      resolveItemProductSubtitle({
        name: '77',
        input_barcode: '77',
        customer_name: 'Ko Mg',
      }),
    ).toBeUndefined();
    expect(
      resolveItemProductSubtitle({
        name: 'Ko Mg',
        input_barcode: '77',
        customer_name: 'Ko Mg',
      }),
    ).toBeUndefined();
  });

  it('keeps a real product name', () => {
    expect(
      resolveItemProductSubtitle({
        name: 'Phone case',
        input_barcode: '77',
        customer_name: 'Ko Mg',
      }),
    ).toBe('Phone case');
  });
});

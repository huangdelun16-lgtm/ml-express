import { describe, expect, it } from 'vitest';
import {
  assessPackagingArrival,
  decidePaidSignAdd,
  isAlreadyInPaidSignBasket,
  isSameSignCustomer,
} from './scanPaidSign';

const base = 'MDY010203040506';

describe('assessPackagingArrival', () => {
  it('leaves ordinary barcodes and single-piece lines alone', () => {
    expect(assessPackagingArrival('S35424815138', [])).toEqual({ kind: 'not_batch' });
    expect(
      assessPackagingArrival(`${base}(1-1)`, [
        { barcode: `${base}(1-1)`, hub_arrived_at: '2026-10-01' },
      ]),
    ).toEqual({ kind: 'not_batch' });
  });

  it('is complete only when every declared piece has arrived', () => {
    const pieces = [1, 2, 3].map((index) => ({
      barcode: `${base}(3-${index})`,
      hub_arrived_at: '2026-10-01',
    }));
    expect(assessPackagingArrival(`${base}(3-2)`, pieces)).toEqual({
      kind: 'complete',
      expected: 3,
      arrived: 3,
    });
  });

  it('counts a missing piece once even if another index is duplicated', () => {
    const pieces = [
      { barcode: `${base}(3-1)`, hub_arrived_at: '2026-10-01' },
      { barcode: `${base}(3-1)`, hub_arrived_at: '2026-10-02' },
      { barcode: `${base}(3-2)`, hub_arrived_at: '' },
      { barcode: 'OTHER(3-3)', hub_arrived_at: '2026-10-01' },
    ];
    expect(assessPackagingArrival(`${base}(3-1)`, pieces)).toEqual({
      kind: 'incomplete',
      expected: 3,
      arrived: 1,
      missing: 2,
    });
  });
});

describe('paid sign basket', () => {
  const anchor = { id: 'a', barcode: `${base}(3-1)`, customer_name: 'Ei Ei' };

  it('matches the customer by name and treats a blank name as unknown', () => {
    expect(isSameSignCustomer(anchor, { recipient_name: 'ei ei' })).toBe(true);
    expect(isSameSignCustomer(anchor, { customer_name: 'Ko Ko' })).toBe(false);
    expect(isSameSignCustomer({ customer_name: '  ' }, { customer_name: '  ' })).toBe(false);
  });

  it('treats another piece of the same batch as already selected', () => {
    expect(isAlreadyInPaidSignBasket([anchor], { id: 'b', barcode: `${base}(3-3)` })).toBe(true);
    expect(isAlreadyInPaidSignBasket([anchor], { id: 'a', barcode: `${base}(3-1)` })).toBe(true);
    expect(isAlreadyInPaidSignBasket([anchor], { id: 'c', barcode: 'S1' })).toBe(false);
  });

  it('rejects in a stable order and accepts a paid same-customer order', () => {
    expect(
      decidePaidSignAdd({
        signable: false,
        sameCustomer: false,
        alreadyIncluded: true,
        feePaid: false,
        arrival: { kind: 'incomplete', expected: 3, arrived: 1, missing: 2 },
      }),
    ).toEqual({ ok: false, reason: 'not_signable' });

    expect(
      decidePaidSignAdd({
        signable: true,
        sameCustomer: true,
        alreadyIncluded: false,
        feePaid: false,
        arrival: { kind: 'not_batch' },
      }),
    ).toEqual({ ok: false, reason: 'fee_unpaid' });

    expect(
      decidePaidSignAdd({
        signable: true,
        sameCustomer: true,
        alreadyIncluded: false,
        feePaid: true,
        arrival: { kind: 'incomplete', expected: 3, arrived: 1, missing: 2 },
      }),
    ).toEqual({ ok: false, reason: 'incomplete_batch' });

    expect(
      decidePaidSignAdd({
        signable: true,
        sameCustomer: true,
        alreadyIncluded: false,
        feePaid: true,
        arrival: { kind: 'complete', expected: 3, arrived: 3 },
      }),
    ).toEqual({ ok: true });
  });
});

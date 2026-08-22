import { describe, expect, it } from 'vitest';
import {
  countSignaturePoints,
  parseSignatureStrokes,
  pickupTypeLabel,
  serializeSignatureStrokes,
  validateCustomerSignReceipt,
} from './customerSignReceipt';

describe('customerSignReceipt', () => {
  it('validates required fields', () => {
    expect(
      validateCustomerSignReceipt({
        signPhone: '',
        pickupType: 'self',
        signatureStrokes: [[
          { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 },
          { x: 5, y: 5 }, { x: 6, y: 6 }, { x: 7, y: 7 }, { x: 8, y: 8 },
        ]],
      }),
    ).toBeNull();

    expect(
      validateCustomerSignReceipt({
        signPhone: '',
        pickupType: 'self',
        signatureStrokes: [],
      }),
    ).toBe('signNeedSignature');
  });

  it('requires proxy phone and name for proxy pickup', () => {
    expect(
      validateCustomerSignReceipt({
        signPhone: '',
        pickupType: 'proxy',
        proxyName: 'Ko Mg',
        signatureStrokes: [[
          { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 },
          { x: 5, y: 5 }, { x: 6, y: 6 }, { x: 7, y: 7 }, { x: 8, y: 8 },
        ]],
      }),
    ).toBe('signNeedProxyPhone');
  });

  it('serializes and parses signature strokes', () => {
    const strokes = [[{ x: 10, y: 20 }, { x: 30, y: 40 }]];
    const raw = serializeSignatureStrokes(strokes);
    expect(parseSignatureStrokes(raw)).toEqual(strokes);
    expect(countSignaturePoints(strokes)).toBe(2);
  });

  it('labels pickup type', () => {
    expect(pickupTypeLabel('self', { self: '本人签收', proxy: '代收' })).toBe('本人签收');
    expect(pickupTypeLabel('proxy', { self: '本人签收', proxy: '代收' })).toBe('代收');
  });
});

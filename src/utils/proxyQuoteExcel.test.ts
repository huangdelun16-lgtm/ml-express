import { describe, expect, it } from 'vitest';
import { rowHasQuoteContent } from '../utils/proxyQuoteExcel';

describe('rowHasQuoteContent', () => {
  it('detects meaningful quote rows', () => {
    expect(
      rowHasQuoteContent({
        id: '1',
        quoteDate: '2026-07-17',
        productName: 'Shoes',
        productImageDataUrl: '',
        productImageName: '',
        quantity: '',
        unitPrice: '',
      }),
    ).toBe(true);
    expect(
      rowHasQuoteContent({
        id: '2',
        quoteDate: '2026-07-17',
        productName: '',
        productImageDataUrl: '',
        productImageName: '',
        quantity: '',
        unitPrice: '',
      }),
    ).toBe(false);
  });
});

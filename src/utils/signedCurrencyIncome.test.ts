import { mergeSignedIncomeItems, sumSignedCurrencyIncome } from './signedCurrencyIncome';

describe('signed currency income', () => {
  test('legacy and explicit MMK stay in MMK; explicit CNY uses paid or quote; unsigned is left out; a package is one fee', () => {
    const result = sumSignedCurrencyIncome([
      { customerSigned: true, inboundBarcode: 'OLD1', fee: 1000, quoteCny: 80 },
      {
        customerSigned: true,
        inboundBarcode: 'LOCKMMK',
        fee: 5000,
        quoteCny: 10,
        paidCurrency: 'MMK',
        paidCny: 10,
      },
      {
        customerSigned: true,
        inboundBarcode: 'CNYPAID',
        fee: 67000,
        quoteCny: 12,
        paidCurrency: 'CNY',
        paidCny: 12.5,
      },
      {
        customerSigned: true,
        inboundBarcode: 'CNYQUOTE',
        fee: 9000,
        quoteCny: 20,
        paidCurrency: 'CNY',
      },
      {
        customerSigned: false,
        inboundBarcode: 'OPEN',
        fee: 99999,
        paidCurrency: 'CNY',
        paidCny: 50,
      },
      { customerSigned: true, inboundBarcode: 'PK(3-1)', fee: 3000, paidCurrency: 'MMK' },
      { customerSigned: true, inboundBarcode: 'PK(3-2)', fee: 3000, paidCurrency: 'MMK' },
      { customerSigned: true, inboundBarcode: 'PK(3-3)', fee: 3000, paidCurrency: 'MMK' },
      { customerSigned: true, inboundBarcode: 'CY(2-1)', fee: 1000, paidCurrency: 'CNY', paidCny: 8, quoteCny: 8 },
      { customerSigned: true, inboundBarcode: 'CY(2-2)', fee: 1000, paidCurrency: 'CNY', paidCny: 8, quoteCny: 8 },
      {
        customerSigned: true,
        inboundBarcode: 'RUI26MDY30006',
        packedBundleBarcode: '',
        fee: 3000,
        paidCurrency: 'MMK',
      },
    ]);

    expect(result.mmk).toBe(1000 + 5000 + 3000);
    expect(result.cny).toBe(40.5);
  });

  test('the same piece returned for two customers is counted once', () => {
    const piece = {
      id: 'same',
      customerSigned: true,
      inboundBarcode: 'SOLO',
      fee: 4200,
    };
    expect(mergeSignedIncomeItems([[piece], [piece]])).toEqual({ mmk: 4200, cny: 0 });
  });
});

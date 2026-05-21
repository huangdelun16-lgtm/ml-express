import { getProductItemFeeMmkForPackage } from './parseMerchantProductFee';

describe('parseMerchantProductFee', () => {
  it('prefers explicit item cost line over cod', () => {
    const fee = getProductItemFeeMmkForPackage({
      description:
        '[商品费用 (仅余额支付): 3,500 MMK][付给商家: 0 MMK]',
      cod_amount: 9999,
    });
    expect(fee).toBe(3500);
  });

  it('uses cod when no explicit goods line', () => {
    const fee = getProductItemFeeMmkForPackage({
      description: '普通备注',
      cod_amount: 4200,
    });
    expect(fee).toBe(4200);
  });

  it('subtracts delivery tag from platform balance blob', () => {
    const fee = getProductItemFeeMmkForPackage({
      description:
        '[平台支付: 8,000 MMK][跑腿费(仅现金): 2,000 MMK]',
      cod_amount: 0,
    });
    expect(fee).toBe(6000);
  });
});

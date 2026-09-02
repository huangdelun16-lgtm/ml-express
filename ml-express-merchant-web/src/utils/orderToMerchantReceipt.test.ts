import { orderToMerchantReceipt } from './orderToMerchantReceipt';

const BASE = {
  id: 'pkg-1234567890abcdef',
  created_at: '2026-09-01T12:00:00.000Z',
  sender_name: 'Test Store',
  sender_phone: '09-111',
  receiver_name: 'Buyer',
  receiver_phone: '09-222',
  receiver_address: 'Yangon',
  price: '2300',
  payment_method: 'balance' as const,
};

describe('orderToMerchantReceipt packing list', () => {
  it('keeps named packing rows even when unit prices are missing', () => {
    const receipt = orderToMerchantReceipt(
      {
        ...BASE,
        description: '[已选商品: 苹果 x2, 香蕉 x1][余额支付: 9,000 MMK] 少辣',
      },
      {},
    );
    expect(receipt.items.map((item) => `${item.label} x${item.qty}`)).toEqual([
      '苹果 x2',
      '香蕉 x1',
    ]);
    expect(receipt.itemTotal).toBe(9000);
    expect(receipt.notes).toBe('少辣');
  });

  it('parses variant packing lines into the printed list', () => {
    const receipt = orderToMerchantReceipt(
      {
        ...BASE,
        description: '[已选商品: X Banner Stand x1 (180x80cm) x1][余额支付: 8,000 MMK]',
      },
      { 'X Banner Stand (180x80cm)': 8000 },
    );
    expect(receipt.items[0].label).toContain('X Banner Stand');
    expect(receipt.items[0].qty).toBe(1);
    expect(receipt.items[0].price).toBe(8000);
  });

  it('keeps product names on COD tickets instead of collapsing to one line', () => {
    const receipt = orderToMerchantReceipt(
      {
        ...BASE,
        payment_method: 'cash',
        cod_amount: 15000,
        description: '[已选商品: 可乐 x2, 水 x1]',
      },
      { 可乐: 2000, 水: 500 },
    );
    expect(receipt.items[0].label).toBe('可乐');
    expect(receipt.items[0].qty).toBe(2);
    expect(receipt.items[receipt.items.length - 1].label).toBe('COD Collect');
    expect(receipt.itemTotal).toBe(15000);
  });
});

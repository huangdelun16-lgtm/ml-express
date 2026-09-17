import { describe, expect, it } from 'vitest';
import { getProductDiscountPercent, productMeetsDiscountPercent } from './productVariants';

describe('getProductDiscountPercent', () => {
  it('uses original_price vs price', () => {
    expect(getProductDiscountPercent({ price: 700, original_price: 1000, stock: 1 })).toBe(30);
    expect(productMeetsDiscountPercent({ price: 700, original_price: 1000, stock: 1 }, 30)).toBe(true);
    expect(productMeetsDiscountPercent({ price: 710, original_price: 1000, stock: 1 }, 30)).toBe(false);
  });

  it('takes the best available variant', () => {
    const pct = getProductDiscountPercent({
      price: 1000,
      stock: 1,
      variants: [
        { id: 'a', name: 'S', price: 900, original_price: 1000, stock: 1, is_available: true, sort_order: 0 },
        { id: 'b', name: 'L', price: 500, original_price: 1000, stock: 1, is_available: true, sort_order: 1 },
      ],
    });
    expect(pct).toBe(50);
  });
});

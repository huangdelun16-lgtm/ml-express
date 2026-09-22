import { describe, expect, it } from 'vitest';
import { pickHomeSpotlightProducts, spotlightOffer } from './homeSpotlightProducts';

describe('pickHomeSpotlightProducts', () => {
  it('ranks by discount percent and pads with full-price products', () => {
    const picked = pickHomeSpotlightProducts(
      [
        { id: 'full', price: 1000, original_price: null },
        { id: 'half', price: 500, original_price: 1000 },
        { id: 'small', price: 900, original_price: 1000 },
        { id: 'other', price: 800 },
      ],
      3,
    );
    expect(picked.map((item) => item.id)).toEqual(['half', 'small', 'full']);
  });

  it('uses the deepest variant discount on one product', () => {
    const offer = spotlightOffer({
      id: 'sku',
      price: 100,
      variants: [
        { price: 100, original_price: 110 },
        { price: 80, original_price: 200 },
      ],
    });
    expect(Math.round(offer.percent)).toBe(60);
    expect(offer.price).toBe(80);
    expect(offer.original).toBe(200);
  });

  it('returns fewer than three when the catalog is shorter', () => {
    expect(pickHomeSpotlightProducts([{ id: 'only', price: 10 }], 3)).toHaveLength(1);
    expect(pickHomeSpotlightProducts([], 3)).toEqual([]);
  });
});
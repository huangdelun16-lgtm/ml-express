import { describe, expect, it } from 'vitest';
import { promoteGalleryCover } from './src/productReview';

describe('promoteGalleryCover', () => {
  it('把选中的图挪到第一张，其余顺序保持', () => {
    expect(promoteGalleryCover(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b']);
  });

  it('已经是封面时不改顺序', () => {
    const urls = ['a', 'b'];
    expect(promoteGalleryCover(urls, 0)).toBe(urls);
  });
});

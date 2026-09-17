import { describe, expect, it } from 'vitest';
import {
  COMPLETED_STATUS_FILTER,
  normalizeOrderStatusFilter,
  orderMatchesStatusFilter,
} from './orderStatusFilter';

describe('normalizeOrderStatusFilter', () => {
  it('maps 已完成 onto the 已送达 chip', () => {
    expect(normalizeOrderStatusFilter('已完成')).toBe(COMPLETED_STATUS_FILTER);
    expect(normalizeOrderStatusFilter('已送达')).toBe('已送达');
    expect(normalizeOrderStatusFilter('打包中')).toBe('打包中');
  });
});

describe('orderMatchesStatusFilter', () => {
  it('treats 已送达 and 已完成 as the same completed bucket', () => {
    expect(orderMatchesStatusFilter('已送达', '已送达')).toBe(true);
    expect(orderMatchesStatusFilter('已完成', '已送达')).toBe(true);
    expect(orderMatchesStatusFilter('已完成', '已完成')).toBe(true);
    expect(orderMatchesStatusFilter('配送中', '已送达')).toBe(false);
  });

  it('matches other statuses exactly', () => {
    expect(orderMatchesStatusFilter('打包中', '打包中')).toBe(true);
    expect(orderMatchesStatusFilter('待收款', '待收款')).toBe(true);
    expect(orderMatchesStatusFilter('已取件', '已取件')).toBe(true);
    expect(orderMatchesStatusFilter('待取件', '已取件')).toBe(false);
  });
});

import { formatTrackingAge } from './trackingRelativeTime';

describe('formatTrackingAge', () => {
  const labels = {
    justNow: '刚刚',
    minutesAgo: '{n} 分钟前',
    hoursAgo: '{n} 小时前',
  };

  it('空值或无效时间为刚刚', () => {
    expect(formatTrackingAge(null, labels)).toBe('刚刚');
    expect(formatTrackingAge('not-a-date', labels)).toBe('刚刚');
  });

  it('一分钟内显示刚刚', () => {
    expect(formatTrackingAge(new Date(), labels)).toBe('刚刚');
  });

  it('按分钟和小时格式化', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatTrackingAge(tenMinAgo, labels)).toBe('10 分钟前');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatTrackingAge(twoHoursAgo, labels)).toBe('2 小时前');
  });
});

import { unreadCountsFingerprint, unreadCountsFromRows } from '../services/_shared/chatUnread';
import { isCourierUnassigned, sanitizeDialNumber } from '../services/_shared/dialPhone';

describe('chatUnread', () => {
  it('aggregates unread rows by order_id', () => {
    expect(
      unreadCountsFromRows([
        { order_id: 'a' },
        { order_id: 'a' },
        { order_id: 'b' },
        { order_id: '' },
      ]),
    ).toEqual({ a: 2, b: 1 });
  });

  it('fingerprint is stable regardless of key insertion order', () => {
    expect(unreadCountsFingerprint({ b: 1, a: 2 })).toBe(
      unreadCountsFingerprint({ a: 2, b: 1 }),
    );
  });
});

describe('dialPhone', () => {
  it('keeps leading plus and digits only', () => {
    expect(sanitizeDialNumber('(+95) 09-788-848-928')).toBe('+9509788848928');
  });

  it('treats 待分配 as unassigned', () => {
    expect(isCourierUnassigned('待分配')).toBe(true);
    expect(isCourierUnassigned('Aung')).toBe(false);
  });
});

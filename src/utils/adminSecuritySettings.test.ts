import {
  clampSessionTimeoutMinutes,
  idleLockMinutes,
  idleLockMs,
  parseJsonbNumber,
} from './adminSecuritySettings';

describe('adminSecuritySettings', () => {
  it('parses jsonb numbers from number / string / wrapped value', () => {
    expect(parseJsonbNumber(45, 10)).toBe(45);
    expect(parseJsonbNumber('45', 10)).toBe(45);
    expect(parseJsonbNumber({ value: 45 }, 10)).toBe(45);
    expect(parseJsonbNumber('nope', 10)).toBe(10);
  });

  it('clamps session timeout to 5–240 minutes', () => {
    expect(clampSessionTimeoutMinutes(45)).toBe(45);
    expect(clampSessionTimeoutMinutes(1)).toBe(5);
    expect(clampSessionTimeoutMinutes(999)).toBe(240);
  });

  it('warns 5 minutes before logout when timeout is 45', () => {
    expect(idleLockMinutes(45)).toEqual({ timeoutMinutes: 45, warnMinutes: 40 });
    expect(idleLockMs(45)).toEqual({
      warnMs: 40 * 60 * 1000,
      logoutMs: 45 * 60 * 1000,
    });
  });

  it('keeps at least 1 minute between warn and logout', () => {
    expect(idleLockMinutes(5)).toEqual({ timeoutMinutes: 5, warnMinutes: 1 });
  });
});

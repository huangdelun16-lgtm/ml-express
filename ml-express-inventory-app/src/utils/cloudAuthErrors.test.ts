import { describe, expect, it } from 'vitest';
import { isInventoryCloudAuthError, INVENTORY_RELOGIN_HINT } from './cloudAuthErrors';

describe('cloudAuthErrors', () => {
  it('detects JWT and RLS errors', () => {
    expect(isInventoryCloudAuthError(new Error('JWT expired'))).toBe(true);
    expect(isInventoryCloudAuthError(new Error('new row violates row-level security policy'))).toBe(
      true,
    );
    expect(isInventoryCloudAuthError(new Error('network timeout'))).toBe(false);
  });

  it('provides relogin hint', () => {
    expect(INVENTORY_RELOGIN_HINT).toContain('重新登录');
  });
});

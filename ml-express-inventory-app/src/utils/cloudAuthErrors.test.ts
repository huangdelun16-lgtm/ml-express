import { describe, expect, it } from 'vitest';
import {
  isInventoryCloudAuthError,
  isInventoryRlsPolicyError,
  INVENTORY_RELOGIN_HINT,
} from './cloudAuthErrors';

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

  it('detects dedicated rls policy errors', () => {
    expect(
      isInventoryRlsPolicyError(
        new Error('new row violates row-level security policy for table "inventory_store_items"'),
      ),
    ).toBe(true);
  });
});

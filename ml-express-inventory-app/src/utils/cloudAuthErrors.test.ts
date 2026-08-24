import { describe, expect, it } from 'vitest';
import {
  isInventoryCloudAuthError,
  isInventoryRlsPolicyError,
  inventoryAccessTokenHasRequiredClaims,
  shouldRefreshInventoryAccessToken,
  shouldJoinInventorySessionRefresh,
  interpretInventoryStoreAccess,
  INVENTORY_RELOGIN_HINT,
} from './cloudAuthErrors';

function fakeJwt(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  return `hdr.${b64}.sig`;
}

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
    expect(
      isInventoryRlsPolicyError(new Error('permission denied for function inventory_confirm_pkg_hub_received')),
    ).toBe(true);
  });

  it('reads inventory claims from the access-token payload', () => {
    const token = fakeJwt({
      app_metadata: {
        inventory_store_id: '11111111-1111-4111-8111-111111111111',
        inventory_store_code: 'MDY001',
        inventory_hub_code: 'MDY',
        inventory_session_id: 'sess-1',
      },
    });
    expect(inventoryAccessTokenHasRequiredClaims(token)).toBe(true);
    expect(inventoryAccessTokenHasRequiredClaims(fakeJwt({ app_metadata: { inventory_store_code: 'MDY001' } }))).toBe(
      false,
    );
  });

  it('refreshes when claims are missing even if the token is not near expiry', () => {
    expect(
      shouldRefreshInventoryAccessToken({
        expiresAtMs: Date.now() + 60 * 60 * 1000,
        hasInventoryClaims: false,
      }),
    ).toBe(true);
    expect(
      shouldRefreshInventoryAccessToken({
        expiresAtMs: Date.now() + 60 * 60 * 1000,
        hasInventoryClaims: true,
      }),
    ).toBe(false);
    expect(
      shouldRefreshInventoryAccessToken({
        expiresAtMs: Date.now() + 60 * 60 * 1000,
        hasInventoryClaims: true,
        force: true,
      }),
    ).toBe(true);
  });

  it('does not let a force refresh join a non-force in-flight', () => {
    expect(
      shouldJoinInventorySessionRefresh({
        hasInFlight: true,
        inFlightIsForce: false,
        requestedForce: true,
      }),
    ).toBe(false);
    expect(
      shouldJoinInventorySessionRefresh({
        hasInFlight: true,
        inFlightIsForce: true,
        requestedForce: true,
      }),
    ).toBe(true);
    expect(
      shouldJoinInventorySessionRefresh({
        hasInFlight: true,
        inFlightIsForce: false,
        requestedForce: false,
      }),
    ).toBe(true);
  });

  it('only treats a readable non-transit or inactive row as store disabled', () => {
    expect(interpretInventoryStoreAccess(null)).toBe('unknown');
    expect(interpretInventoryStoreAccess({ store_type: 'transit_station', status: 'active' })).toBe(
      'allowed',
    );
    expect(interpretInventoryStoreAccess({ store_type: 'transit_station', status: null })).toBe(
      'allowed',
    );
    expect(interpretInventoryStoreAccess({ store_type: 'city_partner', status: 'active' })).toBe(
      'disabled',
    );
    expect(interpretInventoryStoreAccess({ store_type: 'transit_station', status: 'disabled' })).toBe(
      'disabled',
    );
  });
});

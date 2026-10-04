import { describe, expect, it } from 'vitest';
import { svc } from '../errors/serviceError';
import { translations } from '../i18n/translations';
import { classifyCloudOperationFailure, explainCloudOperationFailure } from './cloudOperationFailure';

describe('classifyCloudOperationFailure', () => {
  it('treats fetch failures as network', () => {
    expect(classifyCloudOperationFailure(new Error('Network request failed'))).toBe('network');
    expect(classifyCloudOperationFailure(svc('truckLoadRpcFailed'))).toBe('network');
  });

  it('treats expired login and row-level security as session', () => {
    expect(classifyCloudOperationFailure(svc('authSessionExpired'))).toBe('session');
    expect(classifyCloudOperationFailure(new Error('JWT expired'))).toBe('session');
    expect(
      classifyCloudOperationFailure(new Error('new row violates row-level security policy')),
    ).toBe('session');
  });

  it('treats a missing cloud pack as origin not synced', () => {
    expect(classifyCloudOperationFailure(svc('pkgNotFoundNeedLoad'))).toBe('origin');
    expect(classifyCloudOperationFailure(svc('cloudPackNotRegistered', { barcode: 'RUI26POL40001' }))).toBe(
      'origin',
    );
  });

  it('leaves business rules alone', () => {
    expect(classifyCloudOperationFailure(svc('packCannotTruckLoadInTransit', { barcode: 'RUI26POL40001' }))).toBe(
      null,
    );
    expect(classifyCloudOperationFailure(svc('pkgLegDestMismatch', { legDest: 'POL', hub: 'MDY' }))).toBe(null);
  });

  it('explains the next step for stock-out and hub receive', () => {
    const t = translations.zh;
    expect(explainCloudOperationFailure(t, new Error('Failed to fetch'), 'stockOut')).toBe(
      t.stockOut.cloudFailNetwork,
    );
    expect(explainCloudOperationFailure(t, svc('syncRlsBlocked'), 'hubReceive')).toBe(
      t.hubReceive.cloudFailSession,
    );
    expect(explainCloudOperationFailure(t, svc('pkgNotFoundNeedLoad'), 'hubReceive')).toBe(
      t.hubReceive.cloudFailOrigin,
    );
    expect(explainCloudOperationFailure(t, svc('destCannotBeOwnStation'), 'stockOut')).toBeNull();
    expect(explainCloudOperationFailure(t, new Error('Failed to fetch'), 'scan')).toBe(
      t.cameraScan.cloudFailNetwork,
    );
  });
});

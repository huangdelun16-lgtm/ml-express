import type { ServiceErrorCode } from '../errors/serviceError';
import { isServiceError } from '../errors/serviceError';
import { isInventoryAuthRequiredError } from '../services/authService';
import { isInventoryRlsPolicyError } from '../utils/cloudAuthErrors';
import { getSupabaseConfigHint } from '../services/supabase';
import type { PkgTrackingStatus } from '../types/tracking';
import { fmt } from './format';
import { getPkgStatusLabel } from './helpers';
import type { TranslationDict } from './translations';

function isServiceErrorCode(value: string, t: TranslationDict): value is ServiceErrorCode {
  return value in t.serviceErrors;
}

export function formatServiceError(
  t: TranslationDict,
  code: ServiceErrorCode,
  params?: Record<string, string | number>,
): string {
  const resolvedParams = { ...(params ?? {}) };
  if (code === 'cloudPkgAlreadyStatus' && params?.statusKey) {
    resolvedParams.status = getPkgStatusLabel(t, params.statusKey as PkgTrackingStatus);
  }
  const template = t.serviceErrors[code] ?? t.serviceErrors.unknown;
  return Object.keys(resolvedParams).length > 0 ? fmt(template, resolvedParams) : template;
}

export function resolveAppError(t: TranslationDict, error: unknown): string {
  if (isServiceError(error)) {
    return formatServiceError(t, error.code, error.params);
  }

  if (isInventoryAuthRequiredError(error)) {
    const authErr = error as Error & { code?: ServiceErrorCode; params?: Record<string, string | number> };
    if (authErr.code && isServiceErrorCode(authErr.code, t)) {
      return formatServiceError(t, authErr.code, authErr.params);
    }
    return t.serviceErrors.authSessionExpired;
  }

  if (error instanceof Error) {
    if (isServiceErrorCode(error.message, t)) {
      const params = (error as Error & { params?: Record<string, string | number> }).params;
      return formatServiceError(t, error.message as ServiceErrorCode, params);
    }
    if (isInventoryRlsPolicyError(error.message)) {
      return formatServiceError(t, 'syncRlsBlocked');
    }
    if (/network|fetch|timeout|failed to fetch|offline/i.test(error.message)) {
      return formatServiceError(t, 'syncNetworkFailed');
    }
    const devHint = __DEV__ ? getSupabaseConfigHint() : '';
    if (devHint && error.message.includes('Supabase')) {
      return `${error.message}\n${devHint}`;
    }
    return error.message;
  }

  return t.common.retry;
}

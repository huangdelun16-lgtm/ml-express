import { isServiceError, type ServiceErrorCode } from '../errors/serviceError';
import type { TranslationDict } from '../i18n/translations';
import { isInventoryCloudAuthError, isInventoryRlsPolicyError } from './cloudAuthErrors';
import { isLikelyNetworkError } from './networkError';

export type CloudFailureKind = 'network' | 'session' | 'origin';
export type CloudFailureScene = 'stockOut' | 'hubReceive';

const NETWORK_CODES = new Set<ServiceErrorCode>([
  'syncNetworkFailed',
  'truckLoadRpcFailed',
  'cannotVerifyUnpackCloud',
]);

const SESSION_CODES = new Set<ServiceErrorCode>([
  'authSessionExpired',
  'authJwtMissingHubCode',
  'cloudLoginFailed',
  'syncRlsBlocked',
  'financeScopeMismatch',
]);

const ORIGIN_CODES = new Set<ServiceErrorCode>([
  'pkgNotFoundNeedLoad',
  'cloudPackNotRegistered',
  'cloudPacksNotRegistered',
  'orderNotFound',
  'linkedPkgNotFound',
  'packNotLoadedYet',
  'truckLoadRecordNotFound',
  'packNotFoundResync',
]);

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '';
}

function kindForCode(code: string): CloudFailureKind | null {
  if (NETWORK_CODES.has(code as ServiceErrorCode)) return 'network';
  if (SESSION_CODES.has(code as ServiceErrorCode)) return 'session';
  if (ORIGIN_CODES.has(code as ServiceErrorCode)) return 'origin';
  return null;
}

/** 装车 / 到站失败时，现场能采取的下一步。对不上这三类则返回 null，沿用原来的业务文案。 */
export function classifyCloudOperationFailure(error: unknown): CloudFailureKind | null {
  if (isServiceError(error)) {
    const fromCode = kindForCode(error.code);
    if (fromCode) return fromCode;
  }

  const message = errorText(error);
  const fromMessageCode = kindForCode(message);
  if (fromMessageCode) return fromMessageCode;
  if (isLikelyNetworkError(error) || isLikelyNetworkError(message)) return 'network';
  if (isInventoryCloudAuthError(error) || isInventoryRlsPolicyError(message)) return 'session';
  if (/未找到该快递包追踪|未在云端登记|尚未装车出库|package tracking not found/i.test(message)) {
    return 'origin';
  }
  return null;
}

export function explainCloudOperationFailure(
  t: TranslationDict,
  error: unknown,
  scene: CloudFailureScene,
): string | null {
  const kind = classifyCloudOperationFailure(error);
  if (!kind) return null;
  const pack = scene === 'stockOut' ? t.stockOut : t.hubReceive;
  if (kind === 'network') return pack.cloudFailNetwork;
  if (kind === 'session') return pack.cloudFailSession;
  return pack.cloudFailOrigin;
}

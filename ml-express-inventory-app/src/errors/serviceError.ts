export type ServiceErrorParams = Record<string, string | number>;

export type ServiceErrorCode =
  | 'supabaseNotConfigured'
  | 'supabaseTrackingNotConfigured'
  | 'supabaseConfigDevHint'
  | 'legDestRequired'
  | 'pkgSyncFailed'
  | 'pkgNotFoundNeedLoad'
  | 'pkgLegDestMismatch'
  | 'pkgSplitCompleted'
  | 'pkgCancelled'
  | 'linkedPkgNotFound'
  | 'orderDestLegMismatch'
  | 'scanPkgFirstBeforeOrders'
  | 'orderReleasedRepack'
  | 'scanOrderBarcode'
  | 'orderNotFound'
  | 'scanPkgBeforeRelease'
  | 'noOrdersToRelease'
  | 'cloudLoginFailed'
  | 'authSessionExpired'
  | 'authJwtMissingHubCode'
  | 'storeDisabled'
  | 'fillStoreCodePassword'
  | 'loginFailed'
  | 'fillCurrentNewPassword'
  | 'newPasswordMinLength'
  | 'newPasswordSameAsCurrent'
  | 'changePasswordFailed'
  | 'packNotFound'
  | 'packNotEditableLoaded'
  | 'qtyMustBePositive'
  | 'itemNotFoundByBarcode'
  | 'insufficientStock'
  | 'selectAtLeastOneItem'
  | 'itemNotFoundOrDeleted'
  | 'itemInsufficientPack'
  | 'itemNotInboundPack'
  | 'itemAlreadyPacked'
  | 'itemPackedInOther'
  | 'selectDestination'
  | 'cannotGeneratePackNo'
  | 'packNameRequired'
  | 'selectAtLeastOnePack'
  | 'destCannotBeOwnStation'
  | 'packCannotTruckLoadHubReceived'
  | 'packCannotTruckLoadInTransit'
  | 'packCannotTruckLoadOutbound'
  | 'packCannotTruckLoadDuplicate'
  | 'packNotFoundGeneric'
  | 'loadedPackCannotUnpack'
  | 'cannotVerifyUnpackCloud'
  | 'packInTransitCannotUnpack'
  | 'packNotFoundResync'
  | 'packNotLoadedYet'
  | 'truckLoadRecordNotFound'
  | 'cannotParseTruckDest'
  | 'cloudPkgAlreadyStatus'
  | 'orderDestNotThisHub'
  | 'cannotResolveOrderDest'
  | 'orderNotFoundOrDeleted'
  | 'editDeniedUnknownOwner'
  | 'editDeniedOtherStore'
  | 'signDeniedPkg'
  | 'signDeniedNotArrived'
  | 'signDeniedAlready'
  | 'signDeniedMuseOrigin'
  | 'signDeniedWrongHub'
  | 'signDeniedGeneric'
  | 'cloudSyncFailed'
  | 'cloudUnpackFailed'
  | 'cloudClearFailed'
  | 'cloudInventoryClearFailed'
  | 'cloudTrackingClearFailed'
  | 'cloudNotConfiguredManual'
  | 'amountMustBePositive'
  | 'invalidDateFormat'
  | 'saveFailed'
  | 'localItemNotFound'
  | 'localPackNotFound'
  | 'unknownSyncType'
  | 'syncFailed'
  | 'invalidPackBarcode'
  | 'packNoTransportFee'
  | 'syncItemFailed'
  | 'syncPackFailed'
  | 'syncRlsBlocked'
  | 'syncNetworkFailed'
  | 'operatorNameRequired'
  | 'cloudPackAlreadyLoaded'
  | 'cloudPackInTrackingCannotUnpack'
  | 'loginRequiredBeforeClear'
  | 'cloudClearRemoteFailed'
  | 'unknown';

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;

  readonly params?: ServiceErrorParams;

  constructor(code: ServiceErrorCode, params?: ServiceErrorParams) {
    super(code);
    this.name = 'ServiceError';
    this.code = code;
    this.params = params;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function svc(code: ServiceErrorCode, params?: ServiceErrorParams): ServiceError {
  return new ServiceError(code, params);
}

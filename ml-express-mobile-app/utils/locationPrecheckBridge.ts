import { DeviceEventEmitter } from 'react-native';

/** 与系统位置权限弹窗紧挨的前置说明（须为应用内显著界面，避免 Alert 被认定不合规） */
export type LocationPrecheckPayload = {
  title: string;
  body: string;
  continueLabel: string;
  cancelLabel: string;
};

export const LOCATION_PRECHECK_EVENT = 'ml_express_location_precheck';

let pendingResolve: ((accepted: boolean) => void) | null = null;

export function showLocationPrecheckModal(payload: LocationPrecheckPayload): Promise<boolean> {
  return new Promise((resolve) => {
    pendingResolve = resolve;
    DeviceEventEmitter.emit(LOCATION_PRECHECK_EVENT, payload);
  });
}

export function resolveLocationPrecheck(accepted: boolean) {
  const r = pendingResolve;
  pendingResolve = null;
  if (r) r(accepted);
}

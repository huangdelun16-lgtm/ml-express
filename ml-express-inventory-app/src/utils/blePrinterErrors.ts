export function bleErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || '';
  return String(error ?? '');
}

/** 用户需先开蓝牙 / 授权，不应弹选机 */
export function isBleUserStateError(error: unknown): boolean {
  const msg = bleErrorMessage(error);
  return (
    msg === 'BLUETOOTH_OFF' ||
    msg === 'BLUETOOTH_PERMISSION_DENIED' ||
    msg === 'BLUETOOTH_READY_TIMEOUT' ||
    msg === 'BLUETOOTH_UNSUPPORTED'
  );
}

/** 未选机，或已保存设备当前连不上：应弹出选机 */
export function isBlePickerRequiredError(error: unknown): boolean {
  if (isBleUserStateError(error)) return false;
  const msg = bleErrorMessage(error);
  if (!msg) return false;
  if (msg === 'BLE_PRINTER_NOT_CONNECTED' || msg === 'BLE_PRINTER_NOT_FOUND') return true;
  return /device not found|unknown device|was never connected|peripheral not found|cannot be found/i.test(
    msg,
  );
}

/** 直连失败后值得再短扫一次再连 */
export function shouldRetryConnectWithScan(error: unknown): boolean {
  const msg = bleErrorMessage(error);
  if (!msg) return true;
  if (isBleUserStateError(error)) return false;
  return /not found|never connected|disconnected|timeout|timed out|already connected|cannot be found/i.test(
    msg,
  );
}

export function isAlreadyConnectedError(error: unknown): boolean {
  return /already connected/i.test(bleErrorMessage(error));
}

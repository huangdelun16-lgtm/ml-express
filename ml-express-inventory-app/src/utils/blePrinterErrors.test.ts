import { describe, expect, it } from 'vitest';
import {
  isAlreadyConnectedError,
  isBlePickerRequiredError,
  isBleUserStateError,
  shouldRetryConnectWithScan,
} from './blePrinterErrors';

describe('blePrinterErrors', () => {
  it('keeps bluetooth-off and permission errors out of the picker path', () => {
    expect(isBleUserStateError(new Error('BLUETOOTH_OFF'))).toBe(true);
    expect(isBleUserStateError(new Error('BLUETOOTH_PERMISSION_DENIED'))).toBe(true);
    expect(isBlePickerRequiredError(new Error('BLUETOOTH_OFF'))).toBe(false);
    expect(shouldRetryConnectWithScan(new Error('BLUETOOTH_OFF'))).toBe(false);
  });

  it('opens picker when no printer is saved or the saved id cannot be found', () => {
    expect(isBlePickerRequiredError(new Error('BLE_PRINTER_NOT_CONNECTED'))).toBe(true);
    expect(isBlePickerRequiredError(new Error('BLE_PRINTER_NOT_FOUND'))).toBe(true);
    expect(isBlePickerRequiredError(new Error('Device not found'))).toBe(true);
    expect(isBlePickerRequiredError(new Error('was never connected'))).toBe(true);
    expect(isBlePickerRequiredError(new Error('BLE_WRITE_CHAR_NOT_FOUND'))).toBe(false);
  });

  it('retries with a short scan after typical cold-start connect failures', () => {
    expect(shouldRetryConnectWithScan(new Error('Device not found'))).toBe(true);
    expect(shouldRetryConnectWithScan(new Error('Connection timeout'))).toBe(true);
    expect(isAlreadyConnectedError(new Error('Device already connected'))).toBe(true);
  });
});

type PrinterPickerFn = () => Promise<boolean>;

let requestPicker: PrinterPickerFn | null = null;

export function registerPrinterPicker(fn: PrinterPickerFn | null): void {
  requestPicker = fn;
}

export async function requestPrinterPicker(): Promise<boolean> {
  if (!requestPicker) return false;
  return requestPicker();
}

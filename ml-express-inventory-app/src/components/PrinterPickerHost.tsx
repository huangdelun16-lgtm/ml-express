import React, { useEffect, useRef, useState } from 'react';
import BluetoothScanModal from './BluetoothScanModal';
import { registerPrinterPicker } from '../services/printerPickerBridge';

export default function PrinterPickerHost() {
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    registerPrinterPicker(
      () =>
        new Promise<boolean>((resolve) => {
          resolverRef.current?.(false);
          resolverRef.current = resolve;
          setVisible(true);
        }),
    );
    return () => {
      registerPrinterPicker(null);
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  const finish = (ok: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setVisible(false);
    resolve?.(ok);
  };

  return (
    <BluetoothScanModal
      visible={visible}
      onClose={() => finish(false)}
      onConnected={() => finish(true)}
    />
  );
}

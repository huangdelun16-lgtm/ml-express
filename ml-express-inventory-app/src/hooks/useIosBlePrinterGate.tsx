import React, { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import IosBlePrinterPickerModal from '../components/IosBlePrinterPickerModal';
import { useTranslation } from '../i18n';
import {
  isIosBleThermalAvailable,
  type IosBlePrinterDevice,
} from '../services/iosBleThermalPrinter';
import { getPrinterSettings, savePrinterSettings } from '../services/printerService';

type PendingPrint = {
  action: () => Promise<void>;
  onError: (error: unknown) => void;
  setBusy?: (busy: boolean) => void;
};

/**
 * iOS 蓝牙打印未选机时弹出搜索选机，保存后自动重试本次打印。
 */
export function useIosBlePrinterGate() {
  const { t } = useTranslation();
  const [pickerVisible, setPickerVisible] = useState(false);
  const pendingRef = useRef<PendingPrint | null>(null);

  const runWithBleGate = useCallback(
    async (
      action: () => Promise<void>,
      handlers: {
        onError: (error: unknown) => void;
        setBusy?: (busy: boolean) => void;
      },
    ) => {
      try {
        await action();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error ?? '');
        if (
          msg === 'IOS_BLE_PRINTER_NOT_SELECTED' &&
          Platform.OS === 'ios' &&
          isIosBleThermalAvailable()
        ) {
          pendingRef.current = {
            action,
            onError: handlers.onError,
            setBusy: handlers.setBusy,
          };
          setPickerVisible(true);
          return;
        }
        handlers.onError(error);
      }
    },
    [],
  );

  const handleClose = useCallback(() => {
    pendingRef.current = null;
    setPickerVisible(false);
  }, []);

  const handleSelect = useCallback(
    (device: IosBlePrinterDevice) => {
      void (async () => {
        try {
          const current = await getPrinterSettings();
          await savePrinterSettings({
            ...current,
            connectionMode: 'bluetooth',
            iosBlePrinterId: device.id,
            iosBlePrinterName: device.name,
            iosPrinterName: device.name,
          });
          setPickerVisible(false);
          const pending = pendingRef.current;
          pendingRef.current = null;
          if (!pending) return;

          pending.setBusy?.(true);
          try {
            await pending.action();
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error ?? '');
            if (msg === 'PRINT_CANCELLED') return;
            pending.onError(error);
          } finally {
            pending.setBusy?.(false);
          }
        } catch (error) {
          pendingRef.current?.onError(error);
          pendingRef.current = null;
          setPickerVisible(false);
        }
      })();
    },
    [],
  );

  const blePicker = (
    <IosBlePrinterPickerModal
      visible={pickerVisible}
      onClose={handleClose}
      onSelect={handleSelect}
      title={t.settings.iosScanBlePrinter}
      scanningLabel={t.settings.iosScanningBle}
      emptyLabel={t.settings.iosBleScanEmpty}
      connectLabel={t.settings.sendingPrint}
      closeLabel={t.common.close}
    />
  );

  return { runWithBleGate, blePicker };
}

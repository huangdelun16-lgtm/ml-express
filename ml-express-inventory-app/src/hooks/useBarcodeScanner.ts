import { useCallback, useRef, useState } from 'react';
import { DEFAULT_SCAN_COOLDOWN_MS } from '../constants/barcodeScan';
import { normalizeScanCode, shouldAcceptScan, vibrateScanSuccess } from '../utils/barcodeScan';

export function useBarcodeScanner(
  onScan: (code: string) => void,
  cooldownMs = DEFAULT_SCAN_COOLDOWN_MS,
) {
  const [locked, setLocked] = useState(false);
  const lastCodeRef = useRef('');
  const lastAtRef = useRef(0);

  const handleScan = useCallback(
    (raw: string) => {
      const code = normalizeScanCode(raw);
      if (
        !shouldAcceptScan(code, lastCodeRef.current, lastAtRef.current, cooldownMs, locked)
      ) {
        return false;
      }
      lastCodeRef.current = code;
      lastAtRef.current = Date.now();
      setLocked(true);
      vibrateScanSuccess();
      onScan(code);
      setTimeout(() => setLocked(false), cooldownMs);
      return true;
    },
    [onScan, cooldownMs, locked],
  );

  const reset = useCallback(() => {
    setLocked(false);
    lastCodeRef.current = '';
    lastAtRef.current = 0;
  }, []);

  return { handleScan, reset, locked };
}

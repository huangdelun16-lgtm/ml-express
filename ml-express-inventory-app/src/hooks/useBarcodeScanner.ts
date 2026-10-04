import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SCAN_COOLDOWN_MS } from '../constants/barcodeScan';
import { SCAN_CONFIRM_MS, decideScanRead, extractScanPayload, vibrateScanSuccess } from '../utils/barcodeScan';

export function useBarcodeScanner(
  onScan: (code: string) => void,
  cooldownMs = DEFAULT_SCAN_COOLDOWN_MS,
) {
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const lastCodeRef = useRef('');
  const lastAtRef = useRef(0);
  const pendingRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (settleRef.current) clearTimeout(settleRef.current);
    };
  }, []);

  const acceptCode = useCallback(
    (code: string) => {
      if (settleRef.current) clearTimeout(settleRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = '';
      lastCodeRef.current = code;
      lastAtRef.current = Date.now();
      lockedRef.current = true;
      setLocked(true);
      vibrateScanSuccess();
      onScan(code);
      timerRef.current = setTimeout(() => {
        lockedRef.current = false;
        setLocked(false);
      }, cooldownMs);
    },
    [onScan, cooldownMs],
  );

  const handleScan = useCallback(
    (raw: string, rawAlt?: string | null, immediate = false) => {
      const code = extractScanPayload(raw, rawAlt);
      const decision = decideScanRead(
        code,
        pendingRef.current,
        lastCodeRef.current,
        lastAtRef.current,
        Date.now(),
        cooldownMs,
        lockedRef.current,
        immediate,
      );
      if (decision.action === 'ignore') return false;
      if (decision.action === 'hold') {
        if (pendingRef.current !== decision.code) {
          pendingRef.current = decision.code;
          if (settleRef.current) clearTimeout(settleRef.current);
          settleRef.current = setTimeout(() => {
            const held = pendingRef.current;
            if (!held || lockedRef.current) return;
            acceptCode(held);
          }, SCAN_CONFIRM_MS);
        }
        return false;
      }
      acceptCode(decision.code);
      return true;
    },
    [acceptCode, cooldownMs],
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (settleRef.current) clearTimeout(settleRef.current);
    lockedRef.current = false;
    pendingRef.current = '';
    setLocked(false);
    lastCodeRef.current = '';
    lastAtRef.current = 0;
  }, []);

  return { handleScan, reset, locked };
}

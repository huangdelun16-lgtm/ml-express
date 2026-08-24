import { useCallback, useRef } from 'react';
import { lookupCrossBorderCustomer, type CrossBorderCustomerLookup } from '../services/crossBorderCustomerService';
import { destinationFromCustomerCode } from '../constants/destinationOptions';

type ApplyLookup = (match: CrossBorderCustomerLookup) => void;

export function useCrossBorderCustomerLookup(onMatch: ApplyLookup) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCodeRef = useRef('');

  const lookup = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!code) {
        lastCodeRef.current = '';
        return;
      }
      timerRef.current = setTimeout(() => {
        void (async () => {
          if (code === lastCodeRef.current) return;
          const match = await lookupCrossBorderCustomer(code);
          if (!match || match.customer_code !== code) return;
          lastCodeRef.current = code;
          onMatch(match);
        })();
      }, 350);
    },
    [onMatch],
  );

  const lookupNow = useCallback(
    async (rawCode: string): Promise<CrossBorderCustomerLookup | null> => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return null;
      const match = await lookupCrossBorderCustomer(code);
      if (match) {
        lastCodeRef.current = code;
        onMatch(match);
      }
      return match;
    },
    [onMatch],
  );

  return { lookup, lookupNow };
}

export function applyCrossBorderCustomerToForm(
  match: CrossBorderCustomerLookup,
  setters: {
    setRecipientName: (v: string) => void;
    setRecipientPhone: (v: string) => void;
    setDestination?: (v: string) => void;
  },
) {
  if (match.customer_name) setters.setRecipientName(match.customer_name);
  if (match.phone) setters.setRecipientPhone(match.phone);
  if (setters.setDestination) {
    const dest =
      destinationFromCustomerCode(match.delivery_area_code) ||
      destinationFromCustomerCode(match.customer_code);
    if (dest) setters.setDestination(dest);
  }
}

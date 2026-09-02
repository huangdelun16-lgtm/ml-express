import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMerchantOrders } from '../../contexts/MerchantOrderContext';
import { deliveryStoreService } from '../../services/supabase';
import { fetchMerchantRiderApproachHit } from '../../services/merchantRiderApproachService';
import {
  isValidCoord,
  merchantRiderApproachAlertKind,
  merchantRiderApproachCopy,
  merchantRiderApproachSpeech,
  type MerchantRiderApproachBand,
  type MerchantRiderApproachHit,
} from '../../services/_shared/merchantRiderApproach';
import {
  ensureDesktopNotificationPermission,
  focusMerchantWindow,
  playNewOrderChime,
  showRiderApproachDesktopNotification,
  speakUtteranceWhenVoicesReady,
  startRiderApproachTitleFlash,
  stopPendingOrderTitleFlash,
} from '../../utils/merchantOrderDesktopAlert';
import MerchantRiderApproachModal, {
  MerchantRiderApproachBanner,
} from './MerchantRiderApproachModal';

const POLL_MS = 8_000;

export default function MerchantRiderApproachHost({ storeId }: { storeId: string }) {
  const { language } = useLanguage();
  const { showOrderAlert } = useMerchantOrders();
  const lang = (language === 'en' || language === 'my' ? language : 'zh') as
    | 'zh'
    | 'en'
    | 'my';
  const [hit, setHit] = useState<MerchantRiderApproachHit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const storeCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevBandRef = useRef<MerchantRiderApproachBand | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('has-rider-approach', Boolean(hit));
    return () => document.documentElement.classList.remove('has-rider-approach');
  }, [hit]);

  useEffect(() => {
    if (!hit && !showOrderAlert) stopPendingOrderTitleFlash();
  }, [hit, showOrderAlert]);

  const fireAlert = useCallback(
    (next: MerchantRiderApproachHit) => {
      const copy = merchantRiderApproachCopy(next, lang);
      const speech = merchantRiderApproachSpeech(next, lang);
      focusMerchantWindow();
      playNewOrderChime();
      if (next.band === 'near') {
        try {
          navigator.vibrate?.([0, 400, 180, 400, 180, 600]);
        } catch {
          /* ignore */
        }
      } else {
        try {
          navigator.vibrate?.(400);
        } catch {
          /* ignore */
        }
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(speech.text);
          utterance.lang = speech.voiceLang;
          utterance.rate = 0.95;
          speakUtteranceWhenVoicesReady(utterance, speech.voiceLang);
        } catch {
          /* ignore */
        }
      }
      showRiderApproachDesktopNotification(copy.title, `${copy.subtitle} · ${copy.metersLabel}`, () => {
        setModalOpen(true);
      });
      if (typeof document !== 'undefined' && document.hidden) {
        startRiderApproachTitleFlash(copy.badge);
      }
      setModalOpen(true);
    },
    [lang],
  );

  const poll = useCallback(async () => {
    if (!storeId) return;
    let coords = storeCoordsRef.current;
    if (!coords) {
      const store = await deliveryStoreService.getStoreById(storeId);
      const lat = Number(store?.latitude);
      const lng = Number(store?.longitude);
      if (!isValidCoord(lat, lng)) {
        setHit(null);
        prevBandRef.current = null;
        return;
      }
      coords = { lat, lng };
      storeCoordsRef.current = coords;
    }

    const next = await fetchMerchantRiderApproachHit(storeId, coords.lat, coords.lng);
    setHit(next);
    const kind = merchantRiderApproachAlertKind(prevBandRef.current, next?.band ?? null);
    prevBandRef.current = next?.band ?? null;
    if (!next) setModalOpen(false);
    if (kind && next) fireAlert(next);
  }, [fireAlert, storeId]);

  useEffect(() => {
    prevBandRef.current = null;
    storeCoordsRef.current = null;
    setHit(null);
    setModalOpen(false);
    if (!storeId) return undefined;
    void ensureDesktopNotificationPermission();
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [poll, storeId]);

  const hideModalForNewOrder = showOrderAlert && modalOpen;

  return (
    <>
      {hit ? (
        <MerchantRiderApproachBanner
          hit={hit}
          language={lang}
          onOpen={() => setModalOpen(true)}
        />
      ) : null}
      <MerchantRiderApproachModal
        visible={modalOpen && !hideModalForNewOrder}
        hit={hit}
        language={lang}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, Vibration, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useApp } from '../contexts/AppContext';
import { deliveryStoreService } from '../services/supabase';
import { fetchMerchantRiderApproachHit } from '../services/merchantRiderApproachService';
import {
  isValidCoord,
  merchantRiderApproachAlertKind,
  merchantRiderApproachSpeech,
  type MerchantRiderApproachBand,
  type MerchantRiderApproachHit,
} from '../services/_shared/merchantRiderApproach';
import MerchantRiderApproachModal, {
  MerchantRiderApproachBanner,
} from './MerchantRiderApproachModal';

const POLL_MS = 8_000;

function normalizeMerchantUser(raw: any): { id: string } | null {
  if (!raw?.id) return null;
  let userType = String(raw.user_type || 'customer');
  if (userType === 'merchants' || userType === 'partner') userType = 'merchant';
  if (userType !== 'merchant') return null;
  return { id: String(raw.id) };
}

export default function MerchantRiderApproachHost() {
  const { language, showOrderAlert } = useApp();
  const lang = (language === 'en' || language === 'my' ? language : 'zh') as
    | 'zh'
    | 'en'
    | 'my';
  const [hit, setHit] = useState<MerchantRiderApproachHit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const storeCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const storeIdRef = useRef<string>('');
  const prevBandRef = useRef<MerchantRiderApproachBand | null>(null);
  const showOrderAlertRef = useRef(showOrderAlert);
  const riderHapticRef = useRef(false);

  showOrderAlertRef.current = showOrderAlert;

  const stopRiderHaptics = useCallback(() => {
    if (!riderHapticRef.current) return;
    riderHapticRef.current = false;
    if (!showOrderAlertRef.current) {
      Vibration.cancel();
    }
  }, []);

  const fireAlert = useCallback(
    (next: MerchantRiderApproachHit) => {
      const speech = merchantRiderApproachSpeech(next, lang);
      if (!showOrderAlertRef.current) {
        Vibration.cancel();
        if (next.band === 'near') {
          riderHapticRef.current = true;
          Vibration.vibrate([0, 400, 180, 400, 180, 600], true);
        } else {
          riderHapticRef.current = false;
          Vibration.vibrate(400);
        }
      }
      try {
        Speech.stop();
        Speech.speak(speech.text, {
          language: speech.voiceLang,
          rate: 0.95,
          pitch: 1.0,
        });
      } catch {
        /* ignore TTS */
      }
      try {
        const ns = require('../services/notificationService').default.getInstance();
        ns.sendSystemAnnouncementNotification({
          title: next.band === 'near' ? '🛵 骑手已到附近' : '🛵 骑手即将到店',
          message: speech.text,
          priority: 'high',
        });
      } catch {
        /* ignore */
      }
      setModalOpen(true);
    },
    [lang],
  );

  const poll = useCallback(async () => {
    try {
      const currentUserStr = await AsyncStorage.getItem('currentUser');
      if (!currentUserStr) {
        storeIdRef.current = '';
        storeCoordsRef.current = null;
        prevBandRef.current = null;
        setHit(null);
        setModalOpen(false);
        stopRiderHaptics();
        return;
      }
      const user = normalizeMerchantUser(JSON.parse(currentUserStr));
      if (!user) {
        setHit(null);
        return;
      }

      if (storeIdRef.current !== user.id) {
        storeIdRef.current = user.id;
        storeCoordsRef.current = null;
        prevBandRef.current = null;
      }

      let coords = storeCoordsRef.current;
      if (!coords) {
        const store = (await deliveryStoreService.getStoreById(user.id)) as {
          latitude?: number | string | null;
          longitude?: number | string | null;
        } | null;
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

      const next = await fetchMerchantRiderApproachHit(user.id, coords.lat, coords.lng);
      setHit(next);
      const kind = merchantRiderApproachAlertKind(prevBandRef.current, next?.band ?? null);
      prevBandRef.current = next?.band ?? null;
      if (!next) {
        setModalOpen(false);
        stopRiderHaptics();
      }
      if (kind && next) fireAlert(next);
    } catch {
      /* keep previous banner; retry on next poll */
    }
  }, [fireAlert, stopRiderHaptics]);

  useEffect(() => {
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void poll();
    };
    const appSub = AppState.addEventListener('change', onAppState);
    const orderSub = DeviceEventEmitter.addListener('order_status_updated', () => {
      void poll();
    });
    return () => {
      clearInterval(timer);
      appSub.remove();
      orderSub.remove();
      stopRiderHaptics();
    };
  }, [poll, stopRiderHaptics]);

  const hideModalForNewOrder = showOrderAlert && modalOpen;

  return (
    <>
      {hit ? (
        <MerchantRiderApproachBanner
          hit={hit}
          language={lang}
          onOpen={() => {
            setModalOpen(true);
            if (hit.band === 'near' && !showOrderAlertRef.current) {
              riderHapticRef.current = true;
              Vibration.vibrate([0, 400, 180, 400, 180, 600], true);
            }
          }}
        />
      ) : null}
      <MerchantRiderApproachModal
        visible={modalOpen && !hideModalForNewOrder}
        hit={hit}
        language={lang}
        onClose={() => {
          setModalOpen(false);
          stopRiderHaptics();
        }}
      />
    </>
  );
}

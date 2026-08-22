import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from '../i18n';
import {
  markSessionKicked,
  verifyDeviceSessionStillActive,
} from '../services/authService';
import { isCloudReachable } from '../utils/networkReachability';
import { isSupabaseConfigured } from '../services/supabase';

type Props = {
  storeId: string;
  onKicked: () => void;
};

const POLL_MS = 20_000;
const INITIAL_DELAY_MS = 5_000;

export default function InventorySessionMonitor({ storeId, onKicked }: Props) {
  const { t } = useTranslation();
  const kickedRef = useRef(false);
  const onKickedRef = useRef(onKicked);

  useEffect(() => {
    onKickedRef.current = onKicked;
  }, [onKicked]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !storeId) return;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKicked = () => {
      if (kickedRef.current) return;
      kickedRef.current = true;

      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;

      void markSessionKicked();

      Alert.alert(t.auth.sessionKickedTitle, t.auth.sessionKickedMessage, [
        {
          text: t.common.ok,
          onPress: () => onKickedRef.current(),
        },
      ], { cancelable: false });
    };

    const checkSession = async () => {
      if (kickedRef.current) return;
      if (!(await isCloudReachable())) return;
      const active = await verifyDeviceSessionStillActive(storeId);
      if (!active) handleKicked();
    };

    initialTimer = setTimeout(() => {
      void checkSession();
    }, INITIAL_DELAY_MS);
    pollTimer = setInterval(() => {
      void checkSession();
    }, POLL_MS);

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [storeId, t.auth.sessionKickedMessage, t.auth.sessionKickedTitle, t.common.ok]);

  return null;
}

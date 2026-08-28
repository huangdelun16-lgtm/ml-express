import { AppState, DeviceEventEmitter, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { packageService, supabase } from './supabase';
import { logger } from './LoggerService';
import { shouldAlertCourierOnNewAssignment } from '../utils/packageStatusNormalize';

export const COURIER_NEW_ORDER_EVENT = 'courier_new_order_assigned';

const FOREGROUND_POLL_MS = 12000;
const BACKGROUND_POLL_MS = 30000;
const MAX_ANNOUNCED = 200;

const announcedIds = new Set<string>();
let persistKey = '';

function storageKey(courierName: string): string {
  return `announced_courier_orders_${courierName.trim()}`;
}

async function persistAnnounced(): Promise<void> {
  if (!persistKey) return;
  try {
    const ids = Array.from(announcedIds).slice(-MAX_ANNOUNCED);
    await AsyncStorage.setItem(persistKey, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function isCourierOrderAnnounced(id: string): boolean {
  return announcedIds.has(id);
}

export async function hydrateAnnouncedOrderIds(courierName: string): Promise<void> {
  const nextKey = storageKey(courierName);
  if (persistKey !== nextKey) {
    announcedIds.clear();
    persistKey = nextKey;
  }
  try {
    const raw = await AsyncStorage.getItem(persistKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((id) => {
        if (id) announcedIds.add(String(id));
      });
    }
  } catch {
    // keep in-memory ids
  }
}

export async function seedAnnouncedOrderIds(ids: string[]): Promise<void> {
  ids.forEach((id) => {
    if (id) announcedIds.add(id);
  });
  await persistAnnounced();
}

export type AnnounceCourierOrderOptions = {
  playVoice?: boolean;
  voiceText?: string;
  speechLang?: string;
};

/**
 * 同一单只提醒一次（推送 / 轮询 / Realtime 共用）。
 * @returns 是否为首次发现
 */
export async function announceCourierNewOrder(
  pkg: { id?: string | null; status?: string | null },
  options: AnnounceCourierOrderOptions = {},
): Promise<boolean> {
  const id = String(pkg?.id || '').trim();
  if (!id) return false;
  if (announcedIds.has(id)) return false;
  if (!shouldAlertCourierOnNewAssignment(pkg.status)) {
    announcedIds.add(id);
    await persistAnnounced();
    return false;
  }

  announcedIds.add(id);
  await persistAnnounced();

  DeviceEventEmitter.emit(COURIER_NEW_ORDER_EVENT, {
    id,
    status: pkg.status,
  });

  try {
    Vibration.vibrate([0, 800, 200, 800, 200, 800]);
  } catch {
    // ignore
  }

  if (options.playVoice !== false && options.voiceText) {
    try {
      Speech.stop();
      Speech.speak(options.voiceText, {
        language: options.speechLang || 'zh-CN',
        pitch: 1.0,
        rate: 0.85,
      });
    } catch (err) {
      logger.warn('新单语音播报失败', err);
    }
  }

  return true;
}

export type CourierAssignmentWatchOptions = {
  courierName: string;
  voiceText: string;
  speechLang: string;
  onFreshAssignment?: (pkg: { id: string; status: string }) => void;
};

/**
 * REST 轮询为主（缅甸 /__sb 无法升级 Realtime WS），Realtime 能通则更快。
 */
export function startCourierAssignmentWatch(
  options: CourierAssignmentWatchOptions,
): () => void {
  const courierName = String(options.courierName || '').trim();
  if (!courierName) return () => {};

  let cancelled = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let seeded = false;
  const channel = supabase.channel(`monitor-orders-${Date.now()}`);

  const pollOnce = async () => {
    if (cancelled) return;
    try {
      const rows = await packageService.listCourierActiveAssignmentIds(courierName);
      const active = rows.filter((row) => shouldAlertCourierOnNewAssignment(row.status));
      if (!seeded) {
        await seedAnnouncedOrderIds(active.map((row) => row.id));
        seeded = true;
        return;
      }
      for (const row of active) {
        const first = await announceCourierNewOrder(row, {
          playVoice: true,
          voiceText: options.voiceText,
          speechLang: options.speechLang,
        });
        if (first) {
          options.onFreshAssignment?.(row);
        }
      }
    } catch (err) {
      logger.warn('新单 REST 轮询失败', err);
    }
  };

  const schedulePoll = () => {
    if (pollTimer) clearInterval(pollTimer);
    const ms =
      AppState.currentState === 'active' ? FOREGROUND_POLL_MS : BACKGROUND_POLL_MS;
    pollTimer = setInterval(() => {
      void pollOnce();
    }, ms);
  };

  const appStateSub = AppState.addEventListener('change', (state) => {
    schedulePoll();
    if (state === 'active') {
      void pollOnce();
    }
  });

  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'packages' },
      (payload) => {
        const newPkg = payload.new as { id?: string; status?: string; courier?: string } | undefined;
        const oldPkg = payload.old as { courier?: string } | undefined;
        if (!newPkg?.id) return;
        const mine = String(newPkg.courier || '').trim().toLowerCase() === courierName.toLowerCase();
        if (!mine) return;
        const assignedNow =
          payload.eventType === 'INSERT' ||
          (payload.eventType === 'UPDATE' &&
            String(oldPkg?.courier || '').trim().toLowerCase() !== courierName.toLowerCase());
        if (!assignedNow) return;
        void announceCourierNewOrder(newPkg, {
          playVoice: true,
          voiceText: options.voiceText,
          speechLang: options.speechLang,
        }).then((first) => {
          if (first) options.onFreshAssignment?.({ id: newPkg.id!, status: String(newPkg.status || '') });
        });
      },
    )
    .subscribe((status) => {
      logger.debug('新单 Realtime 频道', { status });
    });

  void (async () => {
    await hydrateAnnouncedOrderIds(courierName);
    await pollOnce();
    if (!cancelled) schedulePoll();
  })();

  return () => {
    cancelled = true;
    if (pollTimer) clearInterval(pollTimer);
    appStateSub.remove();
    supabase.removeChannel(channel);
  };
}

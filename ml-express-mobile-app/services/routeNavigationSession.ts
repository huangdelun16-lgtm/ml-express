import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';

const SESSION_KEY = 'active_route_navigation_session_v1';
const ARRIVAL_RADIUS_M = 120;

export type RouteNavSessionStop = {
  id: string;
  latitude: number;
  longitude: number;
  sequenceLabel: string;
  title: string;
  originBadge?: string;
};

type ActiveRouteSession = {
  stops: RouteNavSessionStop[];
  currentIndex: number;
  language: string;
  startedAt: string;
};

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function speechLanguage(language: string): string {
  if (language === 'my') return 'my-MM';
  if (language === 'en') return 'en-US';
  return 'zh-CN';
}

function buildArrivalMessage(stop: RouteNavSessionStop, language: string): string {
  const badge = stop.originBadge ? ` (${stop.originBadge})` : '';
  if (language === 'zh') {
    return `已到达 ${stop.sequenceLabel} 站${badge}，${stop.title}`;
  }
  if (language === 'en') {
    return `Arrived at stop ${stop.sequenceLabel}${badge}, ${stop.title}`;
  }
  return `${stop.sequenceLabel} မှတ်တိုင်ရောက်ရှိပြီ${badge}，${stop.title}`;
}

function buildNextStopMessage(stop: RouteNavSessionStop, language: string): string {
  if (language === 'zh') {
    return `请前往 ${stop.sequenceLabel} 站，${stop.title}`;
  }
  if (language === 'en') {
    return `Proceed to stop ${stop.sequenceLabel}, ${stop.title}`;
  }
  return `${stop.sequenceLabel} မှတ်တိုင်သို့ ဆက်လက်သွားပါ，${stop.title}`;
}

async function loadSession(): Promise<ActiveRouteSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveRouteSession;
  } catch {
    return null;
  }
}

async function saveSession(session: ActiveRouteSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearRouteNavigationSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/** 启动路线导航会话（Google 语音导航前调用，用于到站 TTS） */
export async function startRouteNavigationSession(
  stops: RouteNavSessionStop[],
  language: string,
): Promise<void> {
  if (stops.length === 0) {
    await clearRouteNavigationSession();
    return;
  }
  const session: ActiveRouteSession = {
    stops,
    currentIndex: 0,
    language,
    startedAt: new Date().toISOString(),
  };
  await saveSession(session);

  const first = stops[0];
  const intro =
    language === 'zh'
      ? `导航已开始，首站 ${first.sequenceLabel}，${first.title}`
      : language === 'en'
        ? `Navigation started. First stop ${first.sequenceLabel}, ${first.title}`
        : `လမ်းညွှန်စတင်ပါ。ပထမ ${first.sequenceLabel}，${first.title}`;
  Speech.stop();
  Speech.speak(intro, { language: speechLanguage(language) });
}

/** 后台定位回调：检测是否到达当前目标站并语音播报 */
export async function checkRouteArrivalAtLocation(
  latitude: number,
  longitude: number,
): Promise<void> {
  const session = await loadSession();
  if (!session) return;

  const next = session.stops[session.currentIndex];
  if (!next) {
    await clearRouteNavigationSession();
    return;
  }

  const dist = haversineMeters(
    { latitude, longitude },
    { latitude: next.latitude, longitude: next.longitude },
  );
  if (dist > ARRIVAL_RADIUS_M) return;

  Vibration.vibrate(500);
  Speech.stop();
  Speech.speak(buildArrivalMessage(next, session.language), {
    language: speechLanguage(session.language),
  });

  session.currentIndex += 1;
  if (session.currentIndex >= session.stops.length) {
    await clearRouteNavigationSession();
    setTimeout(() => {
      const doneMsg =
        session.language === 'zh'
          ? '全部站点已完成'
          : session.language === 'en'
            ? 'All stops completed'
            : 'မှတ်တိုင်အားလုံး ပြီးမြောက်ပါပြီ';
      Speech.speak(doneMsg, { language: speechLanguage(session.language) });
    }, 2200);
    return;
  }

  await saveSession(session);
  const upcoming = session.stops[session.currentIndex];
  setTimeout(() => {
    Speech.speak(buildNextStopMessage(upcoming, session.language), {
      language: speechLanguage(session.language),
    });
  }, 2600);
}

import type {
  CrossBorderLocalizedText,
  CrossBorderStatusKey,
  CrossBorderTrackingEvent,
  CrossBorderTrackingResult,
} from '../services/crossBorderTrackingService';

export type CrossBorderTimelineState = 'done' | 'current' | 'pending';

export type CrossBorderTimelineStep = {
  key: Exclude<CrossBorderStatusKey, 'unknown' | 'registered' | 'origin_arrived'>;
  labels: CrossBorderLocalizedText;
  detail: CrossBorderLocalizedText;
  event_time?: string;
  note?: string;
  state: CrossBorderTimelineState;
};

const PIPELINE = ['inbound', 'pending_load', 'loaded', 'destination_arrived', 'signed'] as const;

type PipelineKey = (typeof PIPELINE)[number];

function loc(zh: string, en: string, my: string): CrossBorderLocalizedText {
  return { zh, en, my };
}

function hubName(
  label: { zh?: string; en?: string } | null | undefined,
  fallback: string,
): { zh: string; en: string; my: string } {
  const zh = label?.zh?.trim() || fallback;
  const en = label?.en?.trim() || label?.zh?.trim() || fallback;
  return { zh, en, my: en };
}

function findEvent(
  events: CrossBorderTrackingEvent[],
  keys: CrossBorderStatusKey[],
): CrossBorderTrackingEvent | undefined {
  return events.find((event) => keys.includes(event.status_key));
}

function progressRank(key: CrossBorderStatusKey | undefined): number {
  switch (key) {
    case 'signed':
      return 5;
    case 'destination_arrived':
      return 4;
    case 'loaded':
      return 3;
    case 'pending_load':
      return 2;
    case 'inbound':
    case 'origin_arrived':
    case 'registered':
      return 1;
    default:
      return 0;
  }
}

function eventRank(events: CrossBorderTrackingEvent[]): number {
  return events.reduce((max, event) => Math.max(max, progressRank(event.status_key)), 0);
}

export function resolveCrossBorderDisplayKey(
  result: Pick<CrossBorderTrackingResult, 'current_status_key' | 'events'>,
): CrossBorderStatusKey {
  const rank = Math.max(progressRank(result.current_status_key), eventRank(result.events || []));
  if (rank >= 5) return 'signed';
  if (rank >= 4) return 'destination_arrived';
  if (rank >= 3) return 'loaded';
  if (rank >= 1) return 'pending_load';
  return result.current_status_key || 'unknown';
}

function stepCopy(
  key: PipelineKey,
  origin: { zh: string; en: string; my: string },
  dest: { zh: string; en: string; my: string },
): { labels: CrossBorderLocalizedText; detail: CrossBorderLocalizedText } {
  switch (key) {
    case 'inbound':
      return {
        labels: loc('已入库', 'Warehoused', 'ဂိုဒေါင်ဝင်ပြီး'),
        detail: loc(
          `货物已在${origin.zh}仓库完成入库登记`,
          `Received and registered at ${origin.en} warehouse`,
          `${origin.my} ဂိုဒေါင်တွင် လက်ခံမှတ်ပုံတင်ပြီး`,
        ),
      };
    case 'pending_load':
      return {
        labels: loc('待装车', 'Awaiting truck load', 'ကားတင်ရန်စောင့်'),
        detail: loc(
          `正在${origin.zh}仓库理货，等待装车发往${dest.zh}`,
          `At ${origin.en} warehouse, waiting to load for ${dest.en}`,
          `${origin.my} ဂိုဒေါင်တွင် ${dest.my} သို့ ကားတင်ရန် စောင့်ဆိုင်းနေ`,
        ),
      };
    case 'loaded':
      return {
        labels: loc('已装车', 'Loaded on truck', 'ကားတင်ပြီး'),
        detail: loc(
          `已从${origin.zh}仓库装车发出，运往${dest.zh}`,
          `Loaded at ${origin.en} and departed for ${dest.en}`,
          `${origin.my} မှ ${dest.my} သို့ ကားတင်ထွက်ခွာပြီး`,
        ),
      };
    case 'destination_arrived':
      return {
        labels: loc('已到达', 'Arrived', 'ရောက်ရှိပြီး'),
        detail: loc(
          `货物已到达${dest.zh}站点，可安排取件`,
          `Arrived at ${dest.en} station, ready for pickup`,
          `${dest.my} စခန်းသို့ ရောက်ရှိပြီး ထုတ်ယူနိုင်ပါသည်`,
        ),
      };
    case 'signed':
      return {
        labels: loc('已签收', 'Signed & collected', 'လက်ခံပြီး'),
        detail: loc('客户已签收货物', 'Customer has signed and collected', 'ဖောက်သည် လက်ခံပြီး'),
      };
  }
}

function stateFor(stepRank: number, currentRank: number): CrossBorderTimelineState {
  if (currentRank <= 0) return 'pending';
  if (stepRank < currentRank) return 'done';
  if (stepRank === currentRank) return 'current';
  return 'pending';
}

export function buildCrossBorderTimeline(
  result: CrossBorderTrackingResult,
): CrossBorderTimelineStep[] {
  const origin = hubName(result.origin_label, '发站');
  const dest = hubName(result.final_destination_label, result.final_destination || '目的地');
  const events = result.events || [];
  const inboundEvent = findEvent(events, ['inbound', 'origin_arrived']);
  const pendingEvent = findEvent(events, ['pending_load']);
  const loadedEvent = findEvent(events, ['loaded']);
  const arrivedEvent = findEvent(events, ['destination_arrived']);
  const signedEvent = findEvent(events, ['signed']);

  const displayKey = resolveCrossBorderDisplayKey(result);
  const currentRank = progressRank(displayKey);

  const eventByKey: Record<PipelineKey, CrossBorderTrackingEvent | undefined> = {
    inbound: inboundEvent,
    pending_load: pendingEvent,
    loaded: loadedEvent,
    destination_arrived: arrivedEvent,
    signed: signedEvent,
  };

  return PIPELINE.map((key) => {
    const copy = stepCopy(key, origin, dest);
    const event = eventByKey[key];
    const stepRank = progressRank(key);
    const state = stateFor(stepRank, currentRank);
    return {
      key,
      labels: copy.labels,
      detail: copy.detail,
      event_time: event?.event_time,
      note: event?.note,
      state,
    };
  });
}

export function crossBorderStepColor(state: CrossBorderTimelineState, key: CrossBorderStatusKey): string {
  if (state === 'pending') return '#cbd5e1';
  if (key === 'signed' || key === 'destination_arrived') return '#10b981';
  if (key === 'loaded') return '#8b5cf6';
  if (key === 'pending_load') return '#f59e0b';
  return '#2C98A6';
}

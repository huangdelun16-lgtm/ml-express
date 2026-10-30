import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  supabase,
} from '../services/supabase';

export const ARRIVAL_NOTIFY_TEMPLATE_KEY = 'inventory.arrival_notify.template';

export const DEFAULT_ARRIVAL_NOTIFY_TEMPLATE =
  '【ML Express】{name}您好，包裹已到达{hub}站，单号 {barcode}，快递单 {express}，请凭有效证件前来取件。';

export type ArrivalNotifyTemplateFields = {
  name?: string;
  hub?: string;
  barcode?: string;
  express?: string;
};

export function parseArrivalNotifyTemplate(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === 'string') return parsed.trim();
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export function renderArrivalNotifyTemplate(
  template: string,
  fields: ArrivalNotifyTemplateFields,
): string {
  const name = String(fields.name ?? '').trim();
  const hub = String(fields.hub ?? '').trim();
  const barcode = String(fields.barcode ?? '').trim();
  const express = String(fields.express ?? '').trim();
  let text = template;
  if (!name) {
    text = text.replace(/\{name\}您好，/g, '').replace(/\{name\}您好,/g, '').replace(/\{name\}/g, '');
  } else {
    text = text.replace(/\{name\}/g, name);
  }
  if (!express) {
    text = text.replace(/[，,]\s*快递单\s*\{express\}/g, '');
    text = text.replace(/\{express\}/g, '');
  } else {
    text = text.replace(/\{express\}/g, express);
  }
  text = text.replace(/\{hub\}/g, hub).replace(/\{barcode\}/g, barcode);
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/，{2,}/g, '，')
    .replace(/,{2,}/g, ',')
    .trim();
}

function pickTemplate(
  rows: Array<{ settings_key?: string | null; settings_value?: unknown }>,
): string {
  const row = rows.find((item) => item.settings_key === ARRIVAL_NOTIFY_TEMPLATE_KEY);
  return parseArrivalNotifyTemplate(row?.settings_value);
}

async function queryTemplateViaClient(): Promise<string> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_key, settings_value')
    .eq('settings_key', ARRIVAL_NOTIFY_TEMPLATE_KEY)
    .limit(1);
  if (error || !data?.length) return '';
  return pickTemplate(data);
}

async function queryTemplateViaAnon(): Promise<string> {
  const url = getSupabaseUrl().replace(/\/$/, '');
  const key = getSupabaseAnonKey();
  if (!url || !key) return '';
  const endpoint =
    `${url}/rest/v1/system_settings?settings_key=eq.${encodeURIComponent(ARRIVAL_NOTIFY_TEMPLATE_KEY)}` +
    '&select=settings_key,settings_value&limit=1';
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Cache-Control': 'no-store',
    },
  });
  if (!response.ok) return '';
  const rows = (await response.json()) as unknown;
  if (Array.isArray(rows)) return pickTemplate(rows);
  if (rows && typeof rows === 'object') {
    return pickTemplate([rows as { settings_key?: string; settings_value?: unknown }]);
  }
  return '';
}

/** 后台没保存，或读不到时返回空字符串，调用方继续用内置文案。 */
export async function fetchArrivalNotifyTemplate(): Promise<string> {
  if (!isSupabaseConfigured()) return '';
  const fromClient = await queryTemplateViaClient();
  if (fromClient) return fromClient;
  return queryTemplateViaAnon();
}

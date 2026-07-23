import LoggerService from './LoggerService';
import { supabase } from './supabase';

export type CrossBorderStatusKey =
  | 'origin_arrived'
  | 'loaded'
  | 'destination_arrived'
  | 'signed'
  | 'registered'
  | 'unknown';

export type CrossBorderLocalizedText = {
  zh: string;
  en: string;
  my: string;
};

export type CrossBorderTrackingEvent = {
  status_key: CrossBorderStatusKey;
  labels: CrossBorderLocalizedText;
  event_time: string;
  note?: string;
};

export type CrossBorderTrackingResult = {
  kind: 'cross_border';
  query: string;
  match_type: 'express' | 'inbound';
  order_barcode: string;
  express_barcode: string;
  recipient_name: string;
  final_destination: string;
  final_destination_label?: { zh: string; en: string } | null;
  origin_label?: { zh: string; en: string };
  weight: string;
  product_name: string;
  current_status_key: CrossBorderStatusKey;
  current_status: CrossBorderLocalizedText;
  events: CrossBorderTrackingEvent[];
};

export function pickCrossBorderLabel(
  labels: CrossBorderLocalizedText | undefined,
  language: string,
): string {
  if (!labels) return '—';
  if (language === 'en') return labels.en || labels.zh;
  if (language === 'my') return labels.my || labels.en || labels.zh;
  return labels.zh || labels.en;
}

export function crossBorderStatusColor(statusKey: CrossBorderStatusKey): string {
  switch (statusKey) {
    case 'signed':
      return '#10b981';
    case 'destination_arrived':
      return '#22c55e';
    case 'loaded':
      return '#8b5cf6';
    case 'origin_arrived':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
}

export const crossBorderTrackingService = {
  async trackByCode(code: string): Promise<CrossBorderTrackingResult | null> {
    const trimmed = code.trim();
    if (trimmed.length < 3) return null;

    try {
      const { data, error } = await supabase.rpc('track_cross_border_shipment', {
        p_code: trimmed,
      });

      if (error) {
        LoggerService.error('[crossBorderTracking] RPC error:', error);
        throw error;
      }

      if (!data || typeof data !== 'object') return null;
      const row = data as CrossBorderTrackingResult;
      if (row.kind !== 'cross_border') return null;
      row.events = Array.isArray(row.events) ? row.events : [];
      return row;
    } catch (error) {
      LoggerService.error('[crossBorderTracking] trackByCode failed:', error);
      return null;
    }
  },
};

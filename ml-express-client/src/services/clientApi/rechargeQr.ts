import {
  CLIENT_RECHARGE_QR_SETTING_KEY,
  RECHARGE_QR_AMOUNT_TIERS,
  mergeRechargeQrUrlMap,
} from '../_shared/rechargeQr';
import { supabase } from './supabaseClient';

export { CLIENT_RECHARGE_QR_SETTING_KEY, RECHARGE_QR_AMOUNT_TIERS };

const RECHARGE_QR_PUBLIC_BASE = 'https://market-link-express.com';

export function getDefaultRechargeQrUrlMap(): Record<number, string> {
  return {
    10000: `${RECHARGE_QR_PUBLIC_BASE}/kbz_qr_10000.png`,
    50000: `${RECHARGE_QR_PUBLIC_BASE}/kbz_qr_50000.png`,
    100000: `${RECHARGE_QR_PUBLIC_BASE}/kbz_qr_100000.png`,
    300000: `${RECHARGE_QR_PUBLIC_BASE}/kbz_qr_300000.png`,
    500000: `${RECHARGE_QR_PUBLIC_BASE}/kbz_qr_500000.png`,
    1000000: `${RECHARGE_QR_PUBLIC_BASE}/kbz_qr_1000000.png`,
  };
}

export async function fetchRechargeQrUrlMap(): Promise<Record<number, string>> {
  const defaults = getDefaultRechargeQrUrlMap();
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('settings_value')
      .eq('settings_key', CLIENT_RECHARGE_QR_SETTING_KEY)
      .maybeSingle();
    if (error || data == null) return { ...defaults };
    return mergeRechargeQrUrlMap(defaults, data.settings_value);
  } catch {
    return { ...defaults };
  }
}

import { supabase, auditLogService, systemSettingsService } from './supabase';
import {
  MERCHANT_OPS_DESK_SETTING_KEY,
  emptyDeskState,
  mergeDeskStates,
  parseDeskState,
  readLocalDesk,
  writeLocalDesk,
  type MerchantOpsDeskState,
} from '../utils/merchantOpsDesk';

function actorName(): string {
  return (
    sessionStorage.getItem('currentUserName') ||
    localStorage.getItem('currentUserName') ||
    sessionStorage.getItem('currentUser') ||
    localStorage.getItem('currentUser') ||
    '调度'
  );
}

function actorId(): string {
  return (
    sessionStorage.getItem('currentUser') ||
    localStorage.getItem('currentUser') ||
    'admin'
  );
}

export async function loadMerchantOpsDesk(day: string): Promise<MerchantOpsDeskState> {
  const local = readLocalDesk();
  let remote = emptyDeskState();
  try {
    const rows = await systemSettingsService.getSettingsByKeys([MERCHANT_OPS_DESK_SETTING_KEY]);
    remote = parseDeskState(rows[0]?.settings_value);
  } catch (err) {
    console.warn('loadMerchantOpsDesk remote:', err);
  }
  const merged = mergeDeskStates(remote, local, day);
  writeLocalDesk(merged);
  return merged;
}

export async function persistMerchantOpsDesk(state: MerchantOpsDeskState): Promise<void> {
  writeLocalDesk(state);
  try {
    await systemSettingsService.upsertSetting({
      category: 'admin',
      settings_key: MERCHANT_OPS_DESK_SETTING_KEY,
      settings_value: state,
      description: '商家监管跟进（已联系 / 今日忽略）',
      updated_by: actorName(),
    });
  } catch (err) {
    console.warn('persistMerchantOpsDesk:', err);
  }
}

export async function nudgeMerchantAccept(storeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('delivery_stores')
    .update({ ops_nudge_at: new Date().toISOString() })
    .eq('id', storeId);
  if (error) {
    console.warn('nudgeMerchantAccept:', error.message);
    return false;
  }
  return true;
}

export async function logMerchantOpsFollowup(input: {
  storeId: string;
  storeName: string;
  action: string;
  detail?: string;
}): Promise<void> {
  try {
    await auditLogService.log({
      user_id: actorId(),
      user_name: actorName(),
      action_type: 'update',
      module: 'delivery_stores',
      target_id: input.storeId,
      target_name: input.storeName,
      action_description: input.action,
      new_value: input.detail || undefined,
    });
  } catch (err) {
    console.warn('logMerchantOpsFollowup:', err);
  }
}

export function currentOpsActorName(): string {
  return actorName();
}

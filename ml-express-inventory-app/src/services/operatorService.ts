import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'inventory_shift_operator_v1';

function storageKey(storeCode: string): string {
  return `${KEY_PREFIX}_${storeCode.trim().toUpperCase()}`;
}

/** 当班操作员姓名（按店铺保存，换班可改，无需退出登录） */
export async function loadShiftOperatorName(storeCode: string): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(storeCode));
    return raw?.trim() ?? '';
  } catch {
    return '';
  }
}

export async function saveShiftOperatorName(storeCode: string, name: string): Promise<void> {
  await AsyncStorage.setItem(storageKey(storeCode), name.trim());
}

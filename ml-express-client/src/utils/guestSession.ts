import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { APP_CONFIG } from '../config/constants';

const SESSION_KEYS = [
  'userId',
  'currentUser',
  'userEmail',
  'userName',
  'userPhone',
  'userType',
  'currentSessionId',
] as const;

export async function isGuestMode(): Promise<boolean> {
  return (await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.IS_GUEST)) === 'true';
}

/** 进入访客模式：清除登录态，保留语言/主题等偏好 */
export async function enterGuestMode(onGuestChange?: (isGuest: boolean) => void): Promise<void> {
  await Promise.all(SESSION_KEYS.map((key) => AsyncStorage.removeItem(key)));
  await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.IS_GUEST, 'true');
  onGuestChange?.(true);
}

export async function clearGuestMode(onGuestChange?: (isGuest: boolean) => void): Promise<void> {
  await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.IS_GUEST);
  onGuestChange?.(false);
}

type GuestPromptLang = 'zh' | 'en' | 'my';

const guestPromptCopy: Record<
  GuestPromptLang,
  { title: string; message: string; cancel: string; login: string }
> = {
  zh: {
    title: '需要登录',
    message: '登录后即可下单、查看订单与管理地址',
    cancel: '稍后再说',
    login: '去登录',
  },
  en: {
    title: 'Sign in required',
    message: 'Sign in to place orders, view orders, and manage addresses',
    cancel: 'Later',
    login: 'Sign in',
  },
  my: {
    title: 'ဝင်ရောက်ရန်လိုအပ်သည်',
    message: 'အော်ဒါတင်ရန်၊ အော်ဒါကြည့်ရန် နှင့် လိပ်စာစီမံရန် ဝင်ရောက်ပါ',
    cancel: 'နောက်မှ',
    login: 'ဝင်ရောက်မည်',
  },
};

export function promptGuestLogin(
  navigation: { navigate: (screen: string) => void },
  language: GuestPromptLang = 'zh'
): void {
  const copy = guestPromptCopy[language] || guestPromptCopy.zh;
  Alert.alert(copy.title, copy.message, [
    { text: copy.cancel, style: 'cancel' },
    { text: copy.login, onPress: () => navigation.navigate('Login') },
  ]);
}

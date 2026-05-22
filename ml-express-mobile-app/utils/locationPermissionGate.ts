import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { PermissionStatus } from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasAcceptedLocationDisclosure } from './locationDisclosureStorage';
import { showLocationPrecheckModal } from './locationPrecheckBridge';

type Lang = 'zh' | 'en' | 'my';

async function getAppLanguage(): Promise<Lang> {
  try {
    const raw = await AsyncStorage.getItem('appSettings');
    if (raw) {
      const p = JSON.parse(raw);
      const l = p?.language;
      if (l === 'en' || l === 'my') return l;
    }
  } catch {
    /* ignore */
  }
  return 'zh';
}

function normLang(language?: string): Lang {
  if (language === 'en' || language === 'my') return language;
  return 'zh';
}

/** Google Play：系统位置弹窗前须应用内显著说明 + 用户主动确认（全屏 Modal，不用系统 Alert） */
const FG = {
  zh: {
    title: '📍 位置权限说明',
    body: '为在地图上显示您与订单路线、计算导航与距离、以及向平台上报配送进度，本应用需要访问此设备的位置信息。\n\n点击下方「继续」后，系统将弹出官方权限对话框，请选择「使用应用时允许」。若您拒绝，仍可使用不依赖自动定位的功能。',
    cont: '继续',
    cancel: '取消',
  },
  en: {
    title: '📍 Location Permission',
    body: 'To show you and orders on the map, support turn‑by‑turn context, and report delivery progress to dispatch, this app needs access to this device’s location.\n\nTap "Continue" to open the system permission dialog and select "While using the app". If you deny, you can still use features that do not rely on automatic location.',
    cont: 'Continue',
    cancel: 'Cancel',
  },
  my: {
    title: '📍 တည်နေရာခွင့်ပြုချက်',
    body: 'မြေပုံပေါ်တွင် သင့်တည်နေရာနှင့် အော်ဒါလမ်းကြောင်းများကို ပြသရန်၊ လမ်းညွှန်ချက်များနှင့် အကွာအဝေးကို တွက်ချက်ရန်၊ နှင့် ပို့ဆောင်မှုအခြေအနေကို ပလက်ဖောင်းသို့ တင်ပြရန်အတွက် ဤစက်၏ တည်နေရာအချက်အလက် လိုအပ်ပါသည်။\n\n"ဆက်လက်" ကိုနှိပ်ပြီး စနစ်မှ ခွင့်ပြုချက်တောင်းခံသည့်အခါ "အက်ပ်ကို အသုံးပြုနေစဉ်" ကို ရွေးချယ်ပါ။',
    cont: 'ဆက်လက်',
    cancel: 'ပယ်ဖျက်',
  },
};

const BG = {
  zh: {
    title: '📍 后台位置权限说明',
    body: '为了确保您在切换到后台或锁屏时，系统仍能为您精准派单并记录配送路径，我们需要您开启“始终允许”位置权限。\n\n点击下方「继续」后将打开系统设置，请在位置权限中选择「始终允许」。',
    cont: '去设置',
    cancel: '暂时不需要',
  },
  en: {
    title: '📍 Background Location',
    body: 'To ensure accurate task assignment and route tracking when the app is in the background or screen is locked, we need "Allow all the time" location access.\n\nTap "Go to Settings" and select "Allow all the time" in the system permission page.',
    cont: 'Go to Settings',
    cancel: 'Not Now',
  },
  my: {
    title: '📍 နောက်ခံတည်နေရာခွင့်ပြုချက်',
    body: 'အက်ပ်ကို နောက်ခံတွင်ထားရှိစဉ် သို့မဟုတ် ဖုန်းပိတ်ထားစဉ်အတွင်း တိကျသော အော်ဒါပေးပို့မှုနှင့် လမ်းကြောင်းမှတ်တမ်းများအတွက် "အမြဲခွင့်ပြုရန်" တည်နေရာခွင့်ပြုချက် လိုအပ်ပါသည်။\n\n"ဆက်တင်သို့သွားရန်" ကိုနှိပ်ပြီး စနစ်ခွင့်ပြုချက်တွင် "အမြဲခွင့်ပြုရန်" ကို ရွေးချယ်ပါ။',
    cont: 'ဆက်တင်သို့သွားရန်',
    cancel: 'ယခု မလိုအပ်သေးပါ',
  },
};

async function androidForegroundPrecheck(l: Lang): Promise<boolean> {
  const c = FG[l];
  return showLocationPrecheckModal({
    title: c.title,
    body: c.body,
    continueLabel: c.cont,
    cancelLabel: c.cancel,
  });
}

async function androidBackgroundPrecheck(l: Lang): Promise<boolean> {
  const c = BG[l];
  return showLocationPrecheckModal({
    title: c.title,
    body: c.body,
    continueLabel: c.cont,
    cancelLabel: c.cancel,
  });
}

/**
 * 仅在用户已在本应用内阅读并「同意」显著披露（LocationDisclosureScreen）后，才发起系统位置权限流程。
 * Android：系统对话框前再展示全屏说明（Google Play Prominent Disclosure）。
 */
export async function requestForegroundPermissionsIfDisclosed(
  languageHint?: string,
): Promise<Location.LocationPermissionResponse> {
  if (!(await hasAcceptedLocationDisclosure())) {
    return {
      status: PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      expires: 'never',
    };
  }
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.status === 'granted') {
    return existing;
  }
  const lang = languageHint !== undefined ? normLang(languageHint) : await getAppLanguage();
  if (Platform.OS === 'android') {
    const ok = await androidForegroundPrecheck(lang);
    if (!ok) {
      return {
        status: PermissionStatus.DENIED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      };
    }
  }
  return Location.requestForegroundPermissionsAsync();
}

/**
 * 后台位置权限：须在系统「始终/后台」对话框前展示披露（Android 全屏）。
 * 调用方应先确保前台权限已 granted。
 */
export async function requestBackgroundPermissionsIfDisclosed(
  languageHint?: string,
): Promise<Location.LocationPermissionResponse> {
  if (!(await hasAcceptedLocationDisclosure())) {
    return {
      status: PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      expires: 'never',
    };
  }
  const existing = await Location.getBackgroundPermissionsAsync();
  if (existing.status === 'granted') {
    return existing;
  }
  const lang = languageHint !== undefined ? normLang(languageHint) : await getAppLanguage();
  if (Platform.OS === 'android') {
    const ok = await androidBackgroundPrecheck(lang);
    if (!ok) {
      return {
        status: PermissionStatus.DENIED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      };
    }
  }
  return Location.requestBackgroundPermissionsAsync();
}

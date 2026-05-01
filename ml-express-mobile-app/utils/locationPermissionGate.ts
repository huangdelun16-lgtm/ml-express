import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { PermissionStatus } from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasAcceptedLocationDisclosure } from './locationDisclosureStorage';

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

/** Google Play：系统位置弹窗前必须紧邻应用内说明 + 用户主动确认（与 LocationDisclosureScreen 首次流程分开，覆盖后续再次请求） */
const FG = {
  zh: {
    title: '即将申请位置权限',
    body: '为在地图上显示您与订单路线、计算导航与距离、以及向平台上报配送进度，本应用需要访问此设备的位置信息。\n\n点击「继续」后，系统会弹出官方权限对话框，请在对话框中选择允许方式。若您拒绝，仍可手动使用不依赖自动定位的功能。',
    cont: '继续',
    cancel: '取消',
  },
  en: {
    title: 'Location permission next',
    body: 'To show you and orders on the map, support turn-by-turn context, and report delivery progress to dispatch, this app needs access to this device’s location.\n\nTap Continue to open the system permission dialog and choose an option. If you deny, you can still use features that do not rely on automatic location.',
    cont: 'Continue',
    cancel: 'Cancel',
  },
  my: {
    title: 'တည်နေရာခွင့်ပြုချက် တောင်းမည်',
    body:
      'မြေပုံ၊ လမ်းညွှန်နှင့် ပို့ဆောင်ရေးအခြေအနေ အပ်ဒိတ်အတွက် ဤစက်မှ တည်နေရာကို ရယူရန် လိုအပ်ပါသည်။ ဆက်လက်ကိုနှိပ်ပြီးနောက် စနစ်မှ ခွင့်ပြုချက် ပေါ်လာမည်။ ငြင်းဆန်ပါက တည်နေရာ အလိုအလျောက် မလိုအပ်သော လုပ်ဆောင်ချက်များကို ဆက်လက်သုံးနိုင်ပါသည်။',
    cont: 'ဆက်လက်',
    cancel: 'ပယ်ဖျက်',
  },
};

const BG = {
  zh: {
    title: '即将申请后台 / 始终位置权限',
    body: '接下来系统可能询问「始终允许」或在应用未打开时访问位置。\n\n若您同意：即便应用处于后台、未使用或关闭状态，我们仍可能收集位置信息，用于向客户与平台同步实时配送轨迹、派单与安全相关功能。点击「继续」后将出现系统对话框。\n\n若您拒绝，后台持续轨迹与部分派单能力可能受限。',
    cont: '继续',
    cancel: '取消',
  },
  en: {
    title: 'Background location next',
    body: 'The system may next ask for “All the time” / location access while you are not using the app.\n\nIf you allow: we may collect location when the app is in the background, closed, or not in active use—to share live delivery progress with customers and dispatch, and for safety-related features. Tap Continue to see the system dialog.\n\nIf you deny, continuous background tracking and some dispatch features may be limited.',
    cont: 'Continue',
    cancel: 'Cancel',
  },
  my: {
    title: 'နောက်ခံ တည်နေရာခွင့်ပြုချက်',
    body:
      'အက်ပ်ကို မသုံးနေချိန်တွင်လည်း တည်နေရာခွင့်ပြုချက် တောင်းနိုင်ပါသည်။ သဘောတူပါက နောက်ခံတွင် လမ်းကြောင်းနှင့် ဖြန့်ပိုးသူ သိစေရေးအတွက် တည်နေရာ စုဆောင်းနိုင်ပါသည်။ "ဆက်လက်" နှိပ်ပြီးနောက် စနစ်၏ ခွင့်ပြုချက်ကို ရွေးပါ။',
    cont: 'ဆက်လက်',
    cancel: 'ပယ်ဖျက်',
  },
};

function androidForegroundPrecheck(l: Lang): Promise<boolean> {
  const c = FG[l];
  return new Promise((resolve) => {
    Alert.alert(c.title, c.body, [
      { text: c.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: c.cont, onPress: () => resolve(true) },
    ], { cancelable: false });
  });
}

function androidBackgroundPrecheck(l: Lang): Promise<boolean> {
  const c = BG[l];
  return new Promise((resolve) => {
    Alert.alert(c.title, c.body, [
      { text: c.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: c.cont, onPress: () => resolve(true) },
    ], { cancelable: false });
  });
}

/**
 * 仅在用户已在本应用内阅读并「同意」显著披露（LocationDisclosureScreen）后，才发起系统位置权限流程。
 * Android：在系统对话框前再展示一次应用内说明（Google Play User Data / Prominent Disclosure）。
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
 * 后台位置权限：须在系统「始终/后台」对话框前展示披露（Android）。
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

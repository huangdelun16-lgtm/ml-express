import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { locationService } from '../services/locationService';
import { COURIER_ONLINE_MODE_KEY } from '../constants/courierOnline';
import { setLocationDisclosureAccepted } from '../utils/locationDisclosureStorage';
import { requestForegroundPermissionsIfDisclosed } from '../utils/locationPermissionGate';
import { Ionicons } from '@expo/vector-icons';

type Props = { navigation: any; route?: { params?: { fromProfile?: boolean } } };

/**
 * 显著披露：必须在系统位置权限弹窗之前展示；用户点「同意」后再请求系统权限（Google User Data 政策）
 */
export default function LocationDisclosureScreen({ navigation, route }: Props) {
  const { language } = useApp();
  const fromProfile = route?.params?.fromProfile === true;
  const [loading, setLoading] = useState(false);

  const copy = {
    zh: {
      title: '位置信息使用说明',
      body: `为了向您分派附近订单、在地图中提供导航、记录配送路线并在配送过程中向平台更新您的实时位置，我们需要使用您设备的精确或大致位置。\n\n【后台定位说明】：作为骑手，本应用需要收集位置数据以开启“派单”、“配送路线记录”及“实时位置分享”功能，即便在应用被关闭或未在使用时也是如此。\n\n若您之后开启相关系统权限，我们会按步骤提示。我们不会在未说明的用途下使用位置数据。您可拒绝，仍可使用不依赖自动定位的其它功能。`,
      agree: '同意并继续',
      skip: '暂不使用位置',
    },
    en: {
      title: 'How we use your location',
      body: `To assign nearby work, show turn‑by‑turn context on the map, keep a record of the delivery path, and share your real‑time position with dispatch, we need access to your device’s location.\n\n[Background Location]: As a rider, this app collects location data to enable "Dispatch", "Route History", and "Live Position Sharing" even when the app is closed or not in use.\n\nWe do not use location for unlisted purposes. You can decline and still use features that do not need automatic location.`,
      agree: 'Agree & continue',
      skip: 'Not now',
    },
    my: {
      title: 'တည်နေရာသုံးစွဲမှု',
      body: `အနီးအနားရှိ အော်ဒါများခွဲဝေပေးရန်၊ မြေပုံပေါ်တွင် လမ်းညွှန်ပြသရန်၊ ပို့ဆောင်မှုလမ်းကြောင်းများကို မှတ်တမ်းတင်ရန်နှင့် ပို့ဆောင်နေစဉ်အတွင်း သင့်တည်နေရာကို အချိန်နှင့်တပြေးညီ အပ်ဒိတ်လုပ်ရန် သင့်စက်၏ တည်နေရာကို အသုံးပြုရန် လိုအပ်ပါသည်။\n\n[နောက်ခံတည်နေရာ]: စာပို့သမားတစ်ဦးအနေဖြင့်၊ ဤအက်ပ်ကို ပိတ်ထားချိန် သို့မဟုတ် အသုံးမပြုချိန်တွင်ပင် "အော်ဒါခွဲဝေမှု"၊ "လမ်းကြောင်းမှတ်တမ်း" နှင့် "တိုက်ရိုက်တည်နေရာမျှဝေမှု" တို့ကို လုပ်ဆောင်နိုင်ရန် တည်နေရာဒေတာကို စုဆောင်းရန် လိုအပ်ပါသည်။\n\nတည်နေရာဒေတာကို ဖော်ပြမထားသော အခြားကိစ္စများအတွက် အသုံးမပြုပါ။ ငြင်းဆိုနိုင်ပြီး တည်နေရာမလိုအပ်သော အခြားလုပ်ဆောင်ချက်များကို ဆက်လက်သုံးနိုင်ပါသည်။`,
      agree: 'သဘောတူ၍ ဆက်ရန်',
      skip: 'ယခု မလိုအပ်သေးပါ',
    },
  };

  const L = copy[language === 'en' || language === 'my' ? language : 'zh'];

  const finishToMain = () => {
    if (fromProfile) {
      navigation.goBack();
    } else {
      navigation.replace('Main');
    }
  };

  const onAgree = async () => {
    setLoading(true);
    try {
      await setLocationDisclosureAccepted();
      
      // 1. 请求前台权限 (Android 会经 locationPermissionGate 显示全屏说明)
      const { status: fg } = await requestForegroundPermissionsIfDisclosed(language);
      
      if (fg === 'granted') {
        // 2. 增加小延迟，确保系统前台权限对话框完全消失后再请求后台
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 3. 检查并请求后台权限
        const { status: bgExisting } = await Location.getBackgroundPermissionsAsync();
        if (bgExisting !== 'granted') {
          await requestBackgroundPermissionsIfDisclosed(language);
        }
      }
    } catch (e) {
      console.warn('LocationDisclosure onAgree:', e);
    } finally {
      setLoading(false);
      finishToMain();
    }
  };

  const onSkip = () => {
    finishToMain();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>
        <Ionicons name="location" size={40} color="#60a5fa" style={styles.icon} />
        <Text style={styles.title}>{L.title}</Text>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <Text style={styles.body}>{L.body}</Text>
        </ScrollView>
        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={onAgree}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGrad}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>{L.agree}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={onSkip} disabled={loading}>
          <Text style={styles.btnSecondaryText}>{L.skip}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, paddingHorizontal: 22, paddingTop: 56, paddingBottom: 32 },
  icon: { alignSelf: 'center', marginBottom: 12 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  scroll: { flex: 1, maxHeight: '52%' },
  scrollContent: { paddingBottom: 8 },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
  },
  btnPrimary: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  btnDisabled: { opacity: 0.7 },
  btnGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnSecondary: { marginTop: 14, paddingVertical: 10, alignItems: 'center' },
  btnSecondaryText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
});

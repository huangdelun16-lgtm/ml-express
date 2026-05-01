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
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { locationService } from '../services/locationService';
import { COURIER_ONLINE_MODE_KEY } from '../constants/courierOnline';
import { setLocationDisclosureAccepted } from '../utils/locationDisclosureStorage';
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
      body: `为了向您分派附近订单、在地图中提供导航、记录配送路线并在配送过程中向平台更新您的实时位置，\n\n我们需要使用您设备的精确或大致位置（由您在系统弹窗中的选择决定）。\n\n若您作为骑手并开启「始终」或后台定位：为派单、路线记录与向平台上报实时位置，本应用可能在本应用被关闭、您未使用本应用时仍收集位置信息。\n\n若您之后再开启相关系统权限，我们会按步骤提示。我们不会在未说明的用途下使用位置数据。您可拒绝，仍可使用不依赖自动定位的其它功能。`,
      agree: '同意并继续',
      skip: '暂不使用位置',
    },
    en: {
      title: 'How we use your location',
      body: `To assign nearby work, show turn‑by‑turn context on the map, keep a record of the delivery path, and share your real‑time position with dispatch when you are working,\n\nthis app may collect approximate and precise location of this device, depending on the option you pick in the system dialog.\n\nIf you allow “All the time” or background/always location (typical for riders): this app collects location data to enable dispatch, route history, and live position updates to the platform even when the app is closed or not in use. Additional prompts may follow when the system requests background access.\n\nWe do not use location for unlisted purposes. You can decline and still use features that do not need automatic location.`,
      agree: 'Agree & continue',
      skip: 'Not now',
    },
    my: {
      title: 'တည်နေရာသုံးစွဲမှု',
      body: `အနီအနားအလုပ်ခေါ်ခြင်း၊ GPS မြေပုံအညွှန်း၊ အပ်ပလီကေးရှင်းမှ ပို့ဆောင်မှုမှတ်တမ်း နှင့် ဖြန့်ပေးသူရှိစဉ် တည်နေရာ အစီအစဉ် တို့ အတွက်ကြောင့်\n\nအတိအကျ သို့ အကျဉ်းချုပ် တည်နေရာ လိုအပ်နိုင်ပါသည်။\n\nနောင် နောက်ခံ/အမြဲခွင့် ရွေးပါက ဖြန့်ပေးပြီးနောက် မှတ်တင် ဆက်လက်ပြုလုပ်ပါမည်။\n\nအသုံးပြုမှုကို ငြင်းဆန့်နိုင်ပြီး တည်နေရာ မထောက်ပံ့သော လုပ်ငန်းများကို ဆက်လက်သုံးနိုင်သည်။`,
      agree: 'သဘောတူ၍ ဆက်ရန်',
      skip: 'ယခု မလိုအပ်',
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
      // 紧邻用户「同意」操作，直接调系统权限；不经过 locationPermissionGate，避免全屏披露后再弹一层 Android 说明。
      await Location.requestForegroundPermissionsAsync();
      const courierId = await AsyncStorage.getItem('currentCourierId');
      const onlinePref = await AsyncStorage.getItem(COURIER_ONLINE_MODE_KEY);
      if (courierId && onlinePref !== 'false') {
        try {
          await locationService.startBackgroundTracking();
        } catch (e) {
          console.warn('startBackgroundTracking after disclosure:', e);
        }
      }
    } catch (e) {
      console.warn('LocationDisclosure onAgree:', e);
    } finally {
      setLoading(false);
    }
    finishToMain();
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

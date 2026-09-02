import React from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { MerchantRiderApproachHit } from '../services/_shared/merchantRiderApproach';
import { merchantRiderApproachCopy } from '../services/_shared/merchantRiderApproach';

function hintText(language: 'zh' | 'en' | 'my') {
  if (language === 'en') {
    return 'Same 120 m cue as the rider map. Status does not change automatically — hand over in person first.';
  }
  if (language === 'my') {
    return 'စီးနင်းသူမြေပုံ 120 m အချက်ပေးချက်နှင့် တူညီသည်။ အခြေအနေ အလိုအလျောက် မပြောင်းပါ။';
  }
  return '对齐骑手端 120 米提示：系统不会自动改状态，请当面交接后再在订单里操作。';
}

function gotIt(language: 'zh' | 'en' | 'my') {
  if (language === 'en') return 'Got it';
  if (language === 'my') return 'ရပါပြီ';
  return '知道了';
}

function openLabel(language: 'zh' | 'en' | 'my') {
  if (language === 'en') return 'Open';
  if (language === 'my') return 'ကြည့်ရန်';
  return '查看';
}

export function MerchantRiderApproachBanner({
  hit,
  language,
  onOpen,
}: {
  hit: MerchantRiderApproachHit;
  language: 'zh' | 'en' | 'my';
  onOpen: () => void;
}) {
  const copy = merchantRiderApproachCopy(hit, language);
  const near = hit.band === 'near';
  return (
    <View style={styles.bannerWrap} pointerEvents="box-none">
      <LinearGradient
        colors={near ? (['#ef4444', '#b91c1c'] as const) : (['#f59e0b', '#d97706'] as const)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bannerInner}
      >
        <Ionicons name={near ? 'alert-circle' : 'bicycle'} size={22} color="#fff" />
        <View style={styles.bannerTextCol}>
          <Text style={styles.bannerTitle}>
            {copy.badge} · {copy.title}
          </Text>
          <Text style={styles.bannerSub}>
            {copy.subtitle} · {copy.metersLabel}
          </Text>
        </View>
        <TouchableOpacity style={styles.bannerBtn} onPress={onOpen} accessibilityRole="button">
          <Text style={styles.bannerBtnText}>{openLabel(language)}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

export default function MerchantRiderApproachModal({
  visible,
  hit,
  language,
  onClose,
}: {
  visible: boolean;
  hit: MerchantRiderApproachHit | null;
  language: 'zh' | 'en' | 'my';
  onClose: () => void;
}) {
  if (!hit) return null;
  const copy = merchantRiderApproachCopy(hit, language);
  const near = hit.band === 'near';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <View style={[styles.panel, near && styles.panelNear]}>
          <LinearGradient
            colors={near ? (['#ef4444', '#b91c1c'] as const) : (['#f59e0b', '#d97706'] as const)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.head}
          >
            <Text style={styles.badge}>🛵 {copy.badge}</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.sub}>{copy.subtitle}</Text>
            <Text style={styles.meters}>{copy.metersLabel}</Text>
          </LinearGradient>
          <View style={styles.body}>
            <Text style={styles.hint}>{hintText(language)}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.85}>
              <LinearGradient colors={['#34d399', '#059669'] as const} style={styles.okBtn}>
                <Text style={styles.okText}>{gotIt(language)}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 80,
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    backgroundColor: 'transparent',
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  bannerTextCol: { flex: 1 },
  bannerTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bannerSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  bannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'center',
    padding: 22,
  },
  panel: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  panelNear: { borderColor: 'rgba(239, 68, 68, 0.55)' },
  head: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 },
  badge: {
    alignSelf: 'flex-start',
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
    lineHeight: 28,
  },
  sub: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '600', marginTop: 6 },
  meters: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 8 },
  body: { padding: 20 },
  hint: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, marginBottom: 16 },
  okBtn: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okText: { color: '#042f2e', fontSize: 16, fontWeight: '800' },
});

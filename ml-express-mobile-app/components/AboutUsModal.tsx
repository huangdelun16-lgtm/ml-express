import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStaffVersionDisplay } from '../utils/appVersion';

const HOTLINE_NUMBERS = [
  { display: '(+95) 09788848928', tel: '+959788848928' },
  { display: '(+95) 09259369349', tel: '+959259369349' },
  { display: '(+95) 09941118588', tel: '+959941118588' },
  { display: '(+95) 09941118688', tel: '+959941118688' },
];

type Lang = 'zh' | 'en' | 'my' | string;

const COPY: Record<string, {
  title: string;
  company: string;
  description: string;
  servicesTitle: string;
  services: string;
  version: string;
  contact: string;
  email: string;
  phone: string;
  website: string;
  hotlineTitle: string;
  cancel: string;
}> = {
  zh: {
    title: '关于我们',
    company: 'MARKET LINK EXPRESS',
    description:
      'MARKET LINK EXPRESS 是缅甸专业快递配送平台，为商家与客户提供同城配送、代收货款与实时追踪服务。骑手端用于接单、导航与送达凭证。',
    servicesTitle: '服务范围',
    services: '同城配送 · 代收货款 (COD) · 实时追踪 · 配送拍照凭证',
    version: '软件版本',
    contact: '联系我们',
    email: '邮箱',
    phone: '客服热线',
    website: '官方网站',
    hotlineTitle: '选择拨打的客服热线',
    cancel: '取消',
  },
  en: {
    title: 'About Us',
    company: 'MARKET LINK EXPRESS',
    description:
      'MARKET LINK EXPRESS is a professional delivery platform in Myanmar, offering city delivery, COD collection and live tracking. The staff app is for accepting jobs, navigation and delivery proof.',
    servicesTitle: 'Services',
    services: 'City delivery · COD · Live tracking · Photo proof',
    version: 'App version',
    contact: 'Contact',
    email: 'Email',
    phone: 'Hotline',
    website: 'Website',
    hotlineTitle: 'Choose a hotline',
    cancel: 'Cancel',
  },
  my: {
    title: 'ကျွန်ုပ်တို့အကြောင်း',
    company: 'MARKET LINK EXPRESS',
    description:
      'MARKET LINK EXPRESS သည် မြန်မာနိုင်ငံရှိ ပို့ဆောင်ရေး ပလက်ဖောင်းဖြစ်ပြီး မြို့တွင်းပို့ဆောင်မှု၊ COD နှင့် အချိန်နှင့်တပြေးညီ ခြေရာခံခြင်း ပေးပါသည်။',
    servicesTitle: 'ဝန်ဆောင်မှုများ',
    services: 'မြို့တွင်းပို့ဆောင် · COD · ခြေရာခံ · ဓာတ်ပုံအထောက်အထား',
    version: 'ဗားရှင်း',
    contact: 'ဆက်သွယ်ရန်',
    email: 'အီးမေးလ်',
    phone: 'ဖုန်း',
    website: 'ဝဘ်ဆိုက်',
    hotlineTitle: 'ဖုန်းနံပါတ်ရွေးချယ်ပါ',
    cancel: 'မလုပ်တော့',
  },
};

export default function AboutUsModal({
  visible,
  onClose,
  language,
}: {
  visible: boolean;
  onClose: () => void;
  language: Lang;
}) {
  const t = COPY[language] || COPY.zh;
  const versionLabel = getStaffVersionDisplay();

  const openHotline = () => {
    Alert.alert(t.hotlineTitle, '', [
      ...HOTLINE_NUMBERS.map((item) => ({
        text: item.display,
        onPress: () => Linking.openURL(`tel:${item.tel}`),
      })),
      { text: t.cancel, style: 'cancel' as const },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.brand}>
              <Image source={require('../assets/logo.png')} style={styles.logo} />
              <Text style={styles.company}>{t.company}</Text>
              <Text style={styles.product}>MARKET LINK STAFF</Text>
            </View>
            <Text style={styles.description}>{t.description}</Text>
            <Text style={styles.sectionLabel}>{t.servicesTitle}</Text>
            <Text style={styles.sectionValue}>{t.services}</Text>
            <Text style={styles.sectionLabel}>{t.version}</Text>
            <Text style={styles.sectionValue}>{versionLabel}</Text>
            <Text style={styles.sectionLabel}>{t.contact}</Text>
            <TouchableOpacity
              style={styles.link}
              onPress={() => Linking.openURL('mailto:marketlink982@gmail.com')}
            >
              <Text style={styles.linkText}>📧 {t.email}: marketlink982@gmail.com</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={openHotline}>
              <Text style={styles.linkText}>📞 {t.phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.link}
              onPress={() => Linking.openURL('https://market-link-express.com')}
            >
              <Text style={styles.linkText}>🌐 {t.website}: market-link-express.com</Text>
            </TouchableOpacity>
            <Text style={styles.copyright}>© {new Date().getFullYear()} Market Link Express</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxHeight: '86%',
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  brand: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 72, height: 72, borderRadius: 16, marginBottom: 10 },
  company: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  product: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 4 },
  description: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 22,
  },
  link: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  linkText: { color: '#93c5fd', fontSize: 14, fontWeight: '700' },
  copyright: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.28)',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 28,
  },
});

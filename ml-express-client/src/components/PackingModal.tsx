import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../config/theme';

interface PackingModalProps {
  visible: boolean;
  orderData: any;
  language: 'zh' | 'en' | 'my';
  onComplete: () => void;
}

const getLabels = (lang: 'zh' | 'en' | 'my') => {
  if (lang === 'en') {
    return {
      title: 'Packing Order',
      orderId: 'Order No',
      merchant: 'Merchant',
      customer: 'Customer',
      items: 'Items',
      complete: 'Packing Done',
    };
  }
  if (lang === 'my') {
    return {
      title: 'ပစ္စည်းပြင်ဆင်ခြင်း',
      orderId: 'အော်ဒါနံပါတ်',
      merchant: 'ဆိုင်',
      customer: 'ဖောက်သည်',
      items: 'ပစ္စည်းများ',
      complete: 'ပြင်ဆင်ပြီး',
    };
  }
  return {
    title: '打包商品',
    orderId: '订单号',
    merchant: '商家',
    customer: '客户',
    items: '商品清单',
    complete: '打包完成',
  };
};

const parseItems = (description?: string) => {
  if (!description) return [];
  const itemsMatch = description.match(/\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/);
  if (!itemsMatch || !itemsMatch[1]) return [];
  return itemsMatch[1].split(', ').map((item: string) => item.trim()).filter(Boolean);
};

export default function PackingModal({ visible, orderData, language, onComplete }: PackingModalProps) {
  const t = getLabels(language);
  const items = parseItems(orderData?.description);
  const orderId = orderData?.id ? `#${orderData.id.slice(-5)}` : '-';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="cube" size={26} color="#fbbf24" />
            </View>
            <Text style={styles.title}>{t.title}</Text>
          </LinearGradient>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t.orderId}</Text>
              <Text style={styles.value}>{orderId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t.merchant}</Text>
              <Text style={styles.value}>{orderData?.sender_name || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t.customer}</Text>
              <Text style={styles.value}>{orderData?.receiver_name || '-'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.items}</Text>
              {items.length === 0 ? (
                <Text style={styles.emptyText}>-</Text>
              ) : (
                items.map((item, index) => (
                  <Text key={`${item}-${index}`} style={styles.itemText}>
                    • {item}
                  </Text>
                ))
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.completeBtn} onPress={onComplete}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.completeGradient}>
              <Ionicons name="checkmark-circle-outline" size={20} color="white" />
              <Text style={styles.completeText}>{t.complete}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    ...theme.shadows.large,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    padding: 16,
    maxHeight: 360,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  section: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: 6,
  },
  itemText: {
    fontSize: 13,
    color: '#1e293b',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  completeBtn: {
    margin: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  completeGradient: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
});

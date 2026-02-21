import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
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
      title: 'Packing Checklist',
      orderId: 'Order No',
      merchant: 'Merchant',
      customer: 'Customer',
      items: 'Items to Pack',
      complete: 'Packing Done',
      notes: 'Notes',
      payment: 'Payment',
      checkAll: 'Check all items to complete',
      cod: 'Collect COD:',
      paid: 'Paid via Balance',
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
      notes: 'မှတ်ချက်',
      payment: 'ငွေပေးချေမှု',
      checkAll: 'ပြီးစီးရန် အားလုံးကို ရွေးပါ',
      cod: 'COD ကောက်ခံရန်:',
      paid: 'လက်ကျန်ငွေဖြင့် ပေးချေပြီး',
    };
  }
  return {
    title: '商品打包核对单',
    orderId: '订单号',
    merchant: '商家',
    customer: '客户',
    items: '待打包商品',
    complete: '确认打包完成',
    notes: '客户备注',
    payment: '支付信息',
    checkAll: '请勾选所有商品以完成打包',
    cod: '需代收货款 (COD):',
    paid: '已余额支付',
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
  
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 每次打开模态框时重置勾选状态
  useEffect(() => {
    if (visible) {
      setCheckedItems(new Set());
    }
  }, [visible]);

  const toggleItem = (index: number) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
      // 轻微震动反馈效果
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
      ]).start();
    }
    setCheckedItems(newSet);
  };

  const isAllChecked = items.length > 0 && checkedItems.size === items.length;

  // 解析支付信息
  const payMatch = orderData?.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
  const payToMerchantAmount = payMatch ? payMatch[1] : null;
  const isCOD = orderData?.payment_method === 'cash';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 顶部票头区域 */}
          <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="cube" size={26} color="#fbbf24" />
            </View>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.orderIdText}>{t.orderId}: <Text style={{fontWeight: '900', fontSize: 16}}>{orderId}</Text></Text>
          </LinearGradient>

          {/* 锯齿边缘效果 */}
          <View style={styles.zigZagContainer}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View key={i} style={styles.zigZag} />
            ))}
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            
            {/* 客户备注高亮 */}
            {orderData?.notes && (
              <View style={styles.notesBox}>
                <Ionicons name="warning" size={20} color="#b45309" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notesTitle}>{t.notes}</Text>
                  <Text style={styles.notesText}>{orderData.notes}</Text>
                </View>
              </View>
            )}

            {/* 财务/收款提示 */}
            <View style={styles.paymentBox}>
              <Ionicons name={isCOD ? "cash" : "card"} size={24} color={isCOD ? "#ea580c" : "#059669"} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.paymentLabel}>{t.payment}</Text>
                {isCOD ? (
                  <Text style={[styles.paymentValue, { color: '#ea580c' }]}>
                    {t.cod} {(orderData?.price || '0').replace('MMK', '')} MMK
                  </Text>
                ) : (
                  <Text style={[styles.paymentValue, { color: '#059669' }]}>
                    {t.paid} {payToMerchantAmount ? `(${payToMerchantAmount} MMK)` : ''}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* 商品清单 Checklist */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.items}</Text>
                <Text style={styles.progressText}>
                  {checkedItems.size} / {items.length}
                </Text>
              </View>
              
              {items.length === 0 ? (
                <Text style={styles.emptyText}>-</Text>
              ) : (
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  {items.map((item, index) => {
                    const isChecked = checkedItems.has(index);
                    return (
                      <TouchableOpacity 
                        key={`${item}-${index}`} 
                        style={[styles.checkItem, isChecked && styles.checkItemActive]}
                        onPress={() => toggleItem(index)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkBox, isChecked && styles.checkBoxActive]}>
                          {isChecked && <Ionicons name="checkmark" size={16} color="white" />}
                        </View>
                        <Text style={[styles.itemText, isChecked && styles.itemTextActive]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </Animated.View>
              )}
            </View>
          </ScrollView>

          {/* 底部按钮区域 */}
          <View style={styles.footer}>
            {!isAllChecked && items.length > 0 && (
              <Text style={styles.hintText}>{t.checkAll}</Text>
            )}
            <TouchableOpacity 
              style={[styles.completeBtn, (!isAllChecked && items.length > 0) && styles.completeBtnDisabled]} 
              onPress={onComplete}
              disabled={!isAllChecked && items.length > 0}
            >
              <LinearGradient 
                colors={(!isAllChecked && items.length > 0) ? ['#94a3b8', '#64748b'] : ['#10b981', '#059669']} 
                style={styles.completeGradient}
              >
                <Ionicons name={isAllChecked ? "checkmark-done-circle" : "cube-outline"} size={22} color="white" />
                <Text style={styles.completeText}>{t.complete}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    overflow: 'hidden',
    ...theme.shadows.large,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 1,
  },
  orderIdText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  zigZagContainer: {
    flexDirection: 'row',
    height: 10,
    width: '100%',
    backgroundColor: '#f8fafc',
    marginTop: -5,
    overflow: 'hidden',
    justifyContent: 'space-around',
  },
  zigZag: {
    width: 14,
    height: 14,
    backgroundColor: '#2563eb', // Matches bottom of gradient
    transform: [{ rotate: '45deg' }],
    marginTop: -10,
  },
  body: {
    padding: 20,
    maxHeight: 400,
  },
  notesBox: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 12,
    alignItems: 'flex-start',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 15,
    color: '#92400e',
    fontWeight: '700',
    lineHeight: 22,
  },
  paymentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginVertical: 10,
  },
  section: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkItemActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    fontWeight: '700',
  },
  itemTextActive: {
    color: '#10b981',
    textDecorationLine: 'line-through',
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  hintText: {
    textAlign: 'center',
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  completeBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completeBtnDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  completeGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  completeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

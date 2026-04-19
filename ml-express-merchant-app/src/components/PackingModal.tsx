import React, { useState, useEffect, useMemo } from 'react';
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
import { getPackingModalModel } from '../utils/parseOrderPackingItems';

interface PackingModalProps {
  visible: boolean;
  orderData: any;
  /** 与商家端 Web ProfilePage 一致：店铺商品名 -> 单价 */
  productPriceMap: Record<string, number>;
  language: 'zh' | 'en' | 'my';
  onComplete: () => void;
  onClose: () => void;
}

const getLabels = (lang: 'zh' | 'en' | 'my') => {
  if (lang === 'en') {
    return {
      title: 'Order Packing',
      packageId: 'Order ID',
      checklist: 'Checklist',
      noListHint: 'No detailed list, please check package content',
      confirmReady: 'Confirm all items ready',
      colItem: 'Item',
      colQty: 'Qty',
      colUnit: 'Unit',
      colSub: 'Subtotal',
      itemsTotal: 'Items total (MMK)',
      customerNote: 'Customer Note',
      complete: 'Confirm Packing Done',
      footerHint: 'Please ensure all items are packed securely',
      close: 'Close',
    };
  }
  if (lang === 'my') {
    return {
      title: 'အော်ဒါထုပ်ပိုးနေသည်',
      packageId: 'အော်ဒါနံပါတ်',
      checklist: 'ပစ္စည်းစာရင်းစစ်ဆေးရန်',
      noListHint: 'အသေးစိတ် စာရင်းမရှိသေးပါ၊ ထုပ်ပိုးမှုကို စစ်ဆေးပါ',
      confirmReady: 'ပစ္စည်းအားလုံး ပြင်ဆင်ပြီးပါပြီ',
      colItem: 'ပစ္စည်း',
      colQty: 'အရေ.အတွက်',
      colUnit: 'တစ်ခုဈေး',
      colSub: 'စုစုပေါင်း',
      itemsTotal: 'ပစ္စည်းစုစုပေါင်း (MMK)',
      customerNote: 'ဖောက်သည်မှတ်ချက်',
      complete: 'ထုပ်ပိုးပြီးကြောင်း အတည်ပြုပါ',
      footerHint: 'ပစ္စည်းအားလုံး မှန်ကန်စွာ ထုပ်ပိုးထားကြောင်း သေချာပါစေ',
      close: 'ပိတ်ရန်',
    };
  }
  return {
    title: '订单打包中',
    packageId: '订单号',
    checklist: '核对商品清单',
    noListHint: '暂无详细商品清单，请核对包裹内容',
    confirmReady: '确认商品已备齐',
    colItem: '商品',
    colQty: '数量',
    colUnit: '单价',
    colSub: '小计',
    itemsTotal: '商品合计（MMK）',
    customerNote: '客户备注',
    complete: '确认打包完成',
    footerHint: '请确保所有商品已备齐并打包好',
    close: '关闭',
  };
};

export default function PackingModal({
  visible,
  orderData,
  productPriceMap,
  language,
  onComplete,
  onClose,
}: PackingModalProps) {
  const t = getLabels(language);
  const packingModalModel = useMemo(
    () =>
      orderData
        ? getPackingModalModel(orderData.description, productPriceMap)
        : null,
    [orderData?.description, productPriceMap],
  );

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible) {
      setCheckedItems({});
    }
  }, [visible, orderData?.id]);

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const completeDisabled =
    !packingModalModel ||
    (packingModalModel.lineCount === 0
      ? !checkedItems.default
      : packingModalModel.rows.some(
          (_row, index) => !checkedItems[`item-${index}`],
        ));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerEmoji}>📦</Text>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.packageIdText}>
              {t.packageId}: {orderData?.id ?? '—'}
            </Text>
          </LinearGradient>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>
              📋 {t.checklist}
            </Text>

            <View style={styles.checklistContainer}>
              {packingModalModel && packingModalModel.lineCount === 0 ? (
                <View style={styles.emptyListBox}>
                  <Text style={styles.emptyListText}>{t.noListHint}</Text>
                  <TouchableOpacity
                    style={styles.defaultCheckRow}
                    onPress={() => toggleItem('default')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.defaultCheckBoxWrap}>
                      <View
                        style={[
                          styles.checkBox,
                          checkedItems.default && styles.checkBoxActive,
                        ]}
                      >
                        {checkedItems.default ? (
                          <Ionicons name="checkmark" size={16} color="white" />
                        ) : null}
                      </View>
                    </View>
                    <Text style={styles.defaultCheckLabel}>{t.confirmReady}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {packingModalModel ? (
                    <View style={styles.tableHeader}>
                      <Text style={[styles.thText, styles.thName]}>{t.colItem}</Text>
                      <View style={styles.metricsRowHeader}>
                        <Text style={[styles.thText, styles.thNum]}>{t.colQty}</Text>
                        <Text style={[styles.thText, styles.thNum]}>{t.colUnit}</Text>
                        <Text style={[styles.thText, styles.thNum]}>{t.colSub}</Text>
                      </View>
                    </View>
                  ) : null}
                  {packingModalModel?.rows.map((row, index) => {
                    const key = `item-${index}`;
                    const isOn = !!checkedItems[key];
                    return (
                      <TouchableOpacity
                        key={`${row.name}-${index}`}
                        style={[styles.tableRow, isOn && styles.tableRowOn]}
                        onPress={() => toggleItem(key)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.itemCol}>
                          <View style={styles.checkboxAbove}>
                            <View style={[styles.checkBoxSm, isOn && styles.checkBoxActive]}>
                              {isOn ? <Ionicons name="checkmark" size={14} color="white" /> : null}
                            </View>
                          </View>
                          <Text
                            style={[styles.cellName, isOn && styles.cellStrike]}
                          >
                            {row.name}
                          </Text>
                        </View>
                        <View style={styles.metricsRow}>
                          <Text style={[styles.cellNum, isOn && styles.cellMuted]}>{row.qty}</Text>
                          <Text style={[styles.cellNumSm, isOn && styles.cellMuted]}>
                            {row.unitPrice != null ? row.unitPrice.toLocaleString() : '—'}
                          </Text>
                          <Text style={[styles.cellSub, isOn && styles.cellMuted]}>
                            {row.lineTotal != null ? row.lineTotal.toLocaleString() : '—'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {packingModalModel && packingModalModel.summaryTotal != null ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t.itemsTotal}</Text>
                      <Text style={styles.summaryValue}>
                        {packingModalModel.summaryTotal.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            {packingModalModel?.customerNote ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>💡 {t.customerNote}</Text>
                <Text style={styles.noteBody}>{packingModalModel.customerNote}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.completeBtn, completeDisabled && styles.completeBtnDisabled]}
              onPress={onComplete}
              disabled={completeDisabled}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={completeDisabled ? ['#94a3b8', '#64748b'] : ['#10b981', '#059669']}
                style={styles.completeGradient}
              >
                <Text style={styles.completeText}>{t.complete}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.footerHint}>{t.footerHint}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  card: {
    zIndex: 1,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 35,
    overflow: 'hidden',
    ...theme.shadows.large,
  },
  header: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  closeBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  headerEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  packageIdText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    maxHeight: 420,
  },
  sectionTitle: {
    color: '#1e293b',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 16,
  },
  checklistContainer: {
    marginBottom: 20,
  },
  emptyListBox: {
    padding: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyListText: {
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  defaultCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultCheckBoxWrap: {
    marginRight: 12,
  },
  defaultCheckLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxSm: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 8,
    marginBottom: 4,
  },
  thText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  thName: {
    flex: 1,
    minWidth: 0,
  },
  thNum: {
    width: 56,
    textAlign: 'right',
  },
  metricsRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  tableRowOn: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: '#10b981',
  },
  itemCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  checkboxAbove: {
    alignItems: 'center',
    marginBottom: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 4,
  },
  cellName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 20,
    flexShrink: 1,
  },
  cellStrike: {
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  cellNum: {
    width: 56,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    color: '#334155',
  },
  cellNumSm: {
    width: 56,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    color: '#475569',
  },
  cellSub: {
    width: 64,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
  },
  cellMuted: {
    color: '#94a3b8',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  summaryLabel: {
    fontWeight: '900',
    color: '#065f46',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  summaryValue: {
    fontWeight: '900',
    color: '#047857',
    fontSize: 16,
  },
  noteBox: {
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16,
  },
  noteTitle: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  noteBody: {
    color: '#b45309',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  footer: {
    padding: 18,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  completeBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  completeBtnDisabled: {
    opacity: 0.65,
  },
  completeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
  footerHint: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },
});

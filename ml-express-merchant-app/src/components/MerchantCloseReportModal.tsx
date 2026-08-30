import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { TodayCloseReport } from '../utils/merchantOpsReport';

type Lang = 'zh' | 'en' | 'my';

type Props = {
  visible: boolean;
  language: string;
  mode: 'view' | 'close';
  report: TodayCloseReport | null;
  loading?: boolean;
  confirmLoading?: boolean;
  onClose: () => void;
  onConfirmClose?: () => void;
  onOpenProducts?: () => void;
};

const COPY: Record<Lang, Record<string, string>> = {
  zh: {
    titleView: '今日关店报表',
    titleClose: '关店前核对',
    todayOrders: '今日新单',
    unfinished: '未完成',
    completed: '今日送达',
    cancelled: '今日取消',
    fee: '今日跑腿费',
    cod: '今日代收款',
    stock: '缺货提醒',
    stockEmpty: '库存正常',
    out: '缺货',
    low: '偏低',
    leftover: '还有未完成订单，关店后无法新下单。',
    closeBtn: '确认今日关店',
    ok: '知道了',
    products: '去补货',
  },
  en: {
    titleView: 'Today’s close report',
    titleClose: 'Check before closing',
    todayOrders: 'New today',
    unfinished: 'Unfinished',
    completed: 'Delivered today',
    cancelled: 'Cancelled',
    fee: 'Delivery fees',
    cod: 'COD today',
    stock: 'Stock alerts',
    stockEmpty: 'Stock looks fine',
    out: 'Out',
    low: 'Low',
    leftover: 'Unfinished orders remain. New orders stop after close.',
    closeBtn: 'Close store today',
    ok: 'OK',
    products: 'Restock',
  },
  my: {
    titleView: 'ယနေ့ပိတ်သိမ်း',
    titleClose: 'မပိတ်မီ စစ်ဆေးရန်',
    todayOrders: 'ယနေ့အော်ဒါ',
    unfinished: 'မပြီးသေး',
    completed: 'ပို့ပြီး',
    cancelled: 'ပယ်ဖျက်',
    fee: 'ပို့ဆောင်ခ',
    cod: 'COD',
    stock: 'လက်ကျန်',
    stockEmpty: 'လက်ကျန်အဆင်ပြေ',
    out: 'ကုန်',
    low: 'နည်း',
    leftover: 'မပြီးသေးသော အော်ဒါရှိပါသည်။',
    closeBtn: 'ဆိုင်ပိတ်မည်',
    ok: 'ရပါပြီ',
    products: 'ကုန်ဖြည့်',
  },
};

function money(n: number) {
  return `${Math.round(n).toLocaleString()} MMK`;
}

export default function MerchantCloseReportModal({
  visible,
  language,
  mode,
  report,
  loading,
  confirmLoading,
  onClose,
  onConfirmClose,
  onOpenProducts,
}: Props) {
  const t = COPY[language === 'en' || language === 'my' ? language : 'zh'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(15,23,42,0.45)',
        }}
      >
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>
              {mode === 'close' ? t.titleClose : t.titleView}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 18, color: '#64748b' }}>✕</Text>
            </TouchableOpacity>
          </View>
          {loading || !report ? (
            <ActivityIndicator color="#2563eb" style={{ marginVertical: 32 }} />
          ) : (
            <ScrollView>
              <Text style={{ color: '#64748b', fontWeight: '700', marginBottom: 12 }}>
                {report.dateKey}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  [t.todayOrders, report.todayOrderCount],
                  [t.unfinished, report.unfinishedCount],
                  [t.completed, report.completedToday],
                  [t.cancelled, report.cancelledToday],
                ].map(([label, value]) => (
                  <View
                    key={String(label)}
                    style={{
                      width: '47%',
                      backgroundColor: '#f8fafc',
                      borderRadius: 14,
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                      {label}
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={{ marginTop: 14, color: '#334155', fontWeight: '700' }}>
                {t.fee}: {money(report.todayDeliveryFee)}
              </Text>
              <Text style={{ marginTop: 4, color: '#334155', fontWeight: '700' }}>
                {t.cod}: {money(report.todayCodAmount)}
              </Text>
              {report.unfinishedCount > 0 && mode === 'close' ? (
                <Text style={{ marginTop: 10, color: '#d97706', fontWeight: '700' }}>
                  {t.leftover}
                </Text>
              ) : null}
              <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '800' }}>{t.stock}</Text>
              {report.stockAlerts.length === 0 ? (
                <Text style={{ color: '#64748b', marginTop: 6 }}>{t.stockEmpty}</Text>
              ) : (
                report.stockAlerts.slice(0, 12).map((item) => (
                  <View
                    key={`${item.productId}-${item.variantName || 'base'}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: '#e2e8f0',
                    }}
                  >
                    <Text style={{ flex: 1, fontWeight: '700', color: '#1e293b' }}>
                      {item.productName}
                      {item.variantName ? ` · ${item.variantName}` : ''}
                    </Text>
                    <Text
                      style={{
                        fontWeight: '800',
                        color: item.level === 'out' ? '#dc2626' : '#d97706',
                      }}
                    >
                      {item.level === 'out' ? t.out : t.low} {item.stock}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            {onOpenProducts && report && report.stockAlerts.length > 0 ? (
              <TouchableOpacity
                onPress={onOpenProducts}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#e2e8f0' }}
              >
                <Text style={{ fontWeight: '800' }}>{t.products}</Text>
              </TouchableOpacity>
            ) : null}
            {mode === 'close' ? (
              <TouchableOpacity
                disabled={confirmLoading}
                onPress={onConfirmClose}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: '#dc2626',
                }}
              >
                <Text style={{ fontWeight: '800', color: '#fff' }}>{t.closeBtn}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onClose}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: '#2563eb',
                }}
              >
                <Text style={{ fontWeight: '800', color: '#fff' }}>{t.ok}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

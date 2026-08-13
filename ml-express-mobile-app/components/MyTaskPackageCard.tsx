import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Package } from '../services/supabase';
import { DeliveryCountdownBadge } from './DeliveryCountdownBadge';

type Props = {
  item: Package;
  language: string;
  onPress: (item: Package) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
};

export function MyTaskPackageCard({
  item,
  language,
  onPress,
  getStatusColor,
  getStatusText,
}: Props) {
  const identityMatch = item.description?.match(
    /\[(?:下单身份|Orderer Identity|Orderer|အော်ဒါတင်သူ အမျိုးအစား|အော်ဒါတင်သူ): (.*?)\]/
  );
  const identity = identityMatch?.[1];
  const isMERCHANTS = identity === '商家' || identity === 'MERCHANTS';

  const payMatch = item.description?.match(
    /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/
  );

  return (
    <TouchableOpacity
      style={styles.packageCard}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.cardId}>{item.id}</Text>
          {identity ? (
            <View
              style={[
                styles.identityBadge,
                { backgroundColor: isMERCHANTS ? '#3b82f6' : '#f59e0b' },
              ]}
            >
              <Text style={styles.identityText}>{identity}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <DeliveryCountdownBadge
        pkg={item}
        language={language === 'zh' ? 'zh' : language === 'en' ? 'en' : 'my'}
        variant="compact"
        theme="dark"
      />
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Ionicons name="person" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.cardValue}>{item.receiver_name}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="location" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.cardValue} numberOfLines={1}>
            {item.receiver_address}
          </Text>
        </View>
      </View>
      {payMatch?.[1] ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 12,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>
            💰{' '}
            {language === 'zh'
              ? '余额支付'
              : language === 'en'
                ? 'Balance Payment'
                : 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း'}
            : {payMatch[1]} MMK
          </Text>
        </View>
      ) : null}
      <View style={styles.cardFooter}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.package_type}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.weight}kg</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  packageCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardId: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  identityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  identityText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  cardBody: { gap: 6, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardValue: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
});

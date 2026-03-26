import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ClockIcon } from '../Icon';
import { FadeInView } from '../Animations';

interface DeliverySpeed {
  value: string;
  label: string;
  extra: number;
}

interface DeliveryOptionsProps {
  language: 'zh' | 'en' | 'my';
  styles: any;
  currentT: any;
  deliverySpeed: string;
  deliverySpeeds: DeliverySpeed[];
  onDeliverySpeedChange: (value: string) => void;
  onScheduleTimeClick: () => void;
  isDisabled?: boolean; // 🚀 新增：是否禁用
}

const DeliveryOptions = memo<DeliveryOptionsProps>(({
  language,
  styles,
  currentT,
  deliverySpeed,
  deliverySpeeds,
  onDeliverySpeedChange,
  onScheduleTimeClick,
  isDisabled = false,
}) => {
  const handleSpeedSelect = (speedValue: string) => {
    if (isDisabled) return; // 🚀 禁用时不处理
    onDeliverySpeedChange(speedValue);
    if (speedValue === '定时达') {
      onScheduleTimeClick();
    }
  };

  return (
    <FadeInView delay={350}>
      <View style={[styles.section, isDisabled && { opacity: 0.6 }]}>
        <View style={styles.sectionTitleContainer}>
          <ClockIcon size={18} color="#1e293b" />
          <Text style={styles.sectionTitle}> {currentT.deliveryOptions}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {isDisabled 
              ? (language === 'zh' ? '顺路送达 (不可选)' : language === 'en' ? 'Eco Way (Disabled)' : 'တန်တန်လေးပို့ (မရနိုင်ပါ)') 
              : '🚚配送选项 *'}
          </Text>
          {isDisabled ? (
            <View style={[styles.radioOption, styles.radioOptionActive, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}>
              <View style={styles.radio}>
                <View style={[styles.radioInner, { backgroundColor: '#94a3b8' }]} />
              </View>
              <View style={styles.radioContent}>
                <Text style={[styles.radioText, { color: '#64748b' }]}>
                  {language === 'zh' ? '顺路递 (24小时内送达)' : language === 'en' ? 'Eco Way (Within 24h)' : 'တန်တန်လေးပို့ (၂၄ နာရီအတွင်း)'}
                </Text>
              </View>
            </View>
          ) : (
            deliverySpeeds.map((speed) => (
              <TouchableOpacity
                key={speed.value}
                style={[
                  styles.radioOption,
                  deliverySpeed === speed.value && styles.radioOptionActive
                ]}
                onPress={() => handleSpeedSelect(speed.value)}
                activeOpacity={0.7}
              >
                <View style={styles.radio}>
                  {deliverySpeed === speed.value && <View style={styles.radioInner} />}
                </View>
                <View style={styles.radioContent}>
                  <Text style={[
                    styles.radioText,
                    deliverySpeed === speed.value && styles.radioTextActive
                  ]}>
                    {speed.label}
                  </Text>
                  {speed.extra > 0 && (
                    <Text style={styles.extraPrice}>+{speed.extra} MMK</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </FadeInView>
  );
});

DeliveryOptions.displayName = 'DeliveryOptions';

export default DeliveryOptions;


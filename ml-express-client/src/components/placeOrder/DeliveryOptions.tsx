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
}

const DeliveryOptions = memo<DeliveryOptionsProps>(({
  language,
  styles,
  currentT,
  deliverySpeed,
  deliverySpeeds,
  onDeliverySpeedChange,
  onScheduleTimeClick,
}) => {
  const handleSpeedSelect = (speedValue: string) => {
    onDeliverySpeedChange(speedValue);
    if (speedValue === '定时达') {
      onScheduleTimeClick();
    }
  };

  return (
    <FadeInView delay={350}>
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <ClockIcon size={18} color="#1e293b" />
          <Text style={styles.sectionTitle}> {currentT.deliveryOptions}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>🚚配送选项 *</Text>
          {deliverySpeeds.map((speed) => (
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
          ))}
        </View>
      </View>
    </FadeInView>
  );
});

DeliveryOptions.displayName = 'DeliveryOptions';

export default DeliveryOptions;


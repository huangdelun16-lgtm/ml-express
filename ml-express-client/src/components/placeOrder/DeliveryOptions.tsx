import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FadeInView } from '../Animations';

const TEAL = '#2C98A6';
const NAVY = '#0f172a';

interface DeliverySpeed {
  value: string;
  label: string;
  extra: number;
}

interface DeliveryOptionsProps {
  styles: any;
  currentT: any;
  deliverySpeed: string;
  deliverySpeeds: DeliverySpeed[];
  onDeliverySpeedChange: (value: string) => void;
  onScheduleTimeClick: () => void;
}

const DeliveryOptions = memo<DeliveryOptionsProps>(({
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
        <View style={local.header}>
          <View style={local.iconWrap}>
            <Ionicons name="bicycle" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{currentT.deliveryOptions}</Text>
            <Text style={local.hint}>{currentT.deliveryByOption || currentT.deliveryOptions}</Text>
          </View>
        </View>

        <View style={local.pillRow}>
          {deliverySpeeds.map((speed) => {
            const active = deliverySpeed === speed.value;
            return (
              <TouchableOpacity
                key={speed.value}
                style={[local.pill, active && local.pillActive]}
                onPress={() => handleSpeedSelect(speed.value)}
                activeOpacity={0.85}
              >
                <Text style={[local.pillText, active && local.pillTextActive]} numberOfLines={1}>
                  {speed.label}
                </Text>
                {speed.extra > 0 ? (
                  <Text style={[local.pillExtra, active && local.pillExtraActive]}>+{speed.extra}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </FadeInView>
  );
});

DeliveryOptions.displayName = 'DeliveryOptions';

const local = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexGrow: 1,
    minWidth: '42%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  pillTextActive: {
    color: '#fff',
  },
  pillExtra: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  pillExtraActive: {
    color: 'rgba(255,255,255,0.85)',
  },
});

export default DeliveryOptions;

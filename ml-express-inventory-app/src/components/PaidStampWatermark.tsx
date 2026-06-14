import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** 已签收订单卡片上的 Paid 圆圈盖章水印 */
export default function PaidStampWatermark() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.outer}>
        <View style={styles.inner}>
          <Text style={styles.text}>PAID</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 4,
    top: 12,
    zIndex: 2,
    transform: [{ rotate: '-16deg' }],
  },
  outer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderColor: 'rgba(34,197,94,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.06)',
  },
  inner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: 'rgba(74,222,128,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'rgba(74,222,128,0.52)',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});

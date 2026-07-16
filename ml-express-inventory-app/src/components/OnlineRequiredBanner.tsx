import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../i18n';

export default function OnlineRequiredBanner() {
  const { t } = useTranslation();
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.text}>● {t.common.onlineRequired}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
    marginBottom: 10,
  },
  text: { color: '#7dd3fc', fontSize: 11, lineHeight: 16, fontWeight: '700' },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useTranslation } from '../i18n';

export default function OnlineRequiredBanner() {
  const { t } = useTranslation();
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.text} myanmarWeight="semibold">
        ● {t.common.onlineRequired}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
    marginBottom: 10,
  },
  text: { color: '#7dd3fc', fontSize: 12, lineHeight: 20, fontWeight: '700' },
});

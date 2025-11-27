import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useApp } from '../contexts/AppContext';

interface BackToHomeButtonProps {
  navigation: any;
  position?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
  style?: any;
}

export default function BackToHomeButton({ navigation, position = 'topRight', style }: BackToHomeButtonProps) {
  const { language } = useApp();

  const t = {
    zh: {
      backToHome: '返回首页',
    },
    en: {
      backToHome: 'Back to Home',
    },
    my: {
      backToHome: 'ပင်မစာမျက်နှာသို့',
    },
  };

  const currentT = t[language] || t.zh;

  const handleBackToHome = () => {
    navigation.navigate('Main');
  };

  const getPositionStyle = () => {
    switch (position) {
      case 'topRight':
        return { position: 'absolute' as const, top: 50, right: 20, zIndex: 1000 };
      case 'topLeft':
        return { position: 'absolute' as const, top: 50, left: 20, zIndex: 1000 };
      case 'bottomRight':
        return { position: 'absolute' as const, bottom: 20, right: 20, zIndex: 1000 };
      case 'bottomLeft':
        return { position: 'absolute' as const, bottom: 20, left: 20, zIndex: 1000 };
      default:
        return { position: 'absolute' as const, top: 50, right: 20, zIndex: 1000 };
    }
  };

  return (
    <TouchableOpacity
      style={[getPositionStyle(), styles.button, style]}
      onPress={handleBackToHome}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        <Text style={styles.icon}>🏠</Text>
        <Text style={styles.text}>{currentT.backToHome}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});


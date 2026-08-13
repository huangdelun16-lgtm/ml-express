import React from 'react';
import LoggerService from '../services/LoggerService';
import { TouchableOpacity, Text, StyleSheet, Alert, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { feedbackService } from '../services/FeedbackService';

interface LogoutButtonProps {
  navigation: any;
  position?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
  style?: any;
}
export default function LogoutButton({ navigation, position = 'topRight', style }: LogoutButtonProps) {
  const { language } = useApp();
  const t = {
    zh: {
      logout: '退出',
      confirmLogout: '确定要退出登录吗？',
      cancel: '取消',
      confirm: '确定',
    },
    en: {
      logout: 'Logout',
      confirmLogout: 'Are you sure you want to logout?',
      cancel: 'Cancel',
      confirm: 'Confirm',
    },
    my: {
      logout: 'ထွက်ရန်',
      confirmLogout: 'ထွက်ရန် သေချာပါသလား?',
      cancel: 'ပယ်ဖျက်ရန်',
      confirm: 'အတည်ပြုရန်',
    },
  };
  const currentT = t[language] || t.zh;
  const handleLogout = () => {
    Alert.alert(
      currentT.logout,
      currentT.confirmLogout,
      [
        { text: currentT.cancel, style: 'cancel' },
        {
          text: currentT.confirm,
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              LoggerService.error('退出登录失败:', error);
              feedbackService.error(currentT.logout + '失败，请重试');
            }
          },
        },
      ]
    );
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
        return {};
    }
  };

  return (
    <TouchableOpacity
      style={[getPositionStyle(), styles.button, style]}
      onPress={handleLogout}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        <Text style={styles.icon}>🚪</Text>
        <Text style={styles.text}>{currentT.logout}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
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

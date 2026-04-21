import React, { useEffect, useRef, useState, type ComponentType } from 'react';
import { View, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';

type Props = {
  component: ComponentType<any>;
  allowedRoles: string[];
  navigation: { goBack: () => void };
  route: any;
};

/**
 * 限制仅指定后台角色可访问 Stack 子页（防止骑手误进管理端路由）。
 */
export function RoleGuardScreen({ component: Screen, allowedRoles, navigation, route }: Props) {
  const { t } = useApp();
  const [role, setRole] = useState<string | null>(null);
  const alerted = useRef(false);

  useEffect(() => {
    (async () => {
      const r = (await AsyncStorage.getItem('currentUserRole')) || 'operator';
      setRole(r);
    })();
  }, []);

  useEffect(() => {
    if (role === null) return;
    if (allowedRoles.includes(role)) return;
    if (alerted.current) return;
    alerted.current = true;
    Alert.alert(t.adminAccessDeniedTitle, t.adminAccessDeniedBody, [
      { text: t.ok, onPress: () => navigation.goBack() },
    ]);
  }, [role, allowedRoles, navigation, t]);

  if (role === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!allowedRoles.includes(role)) {
    return <View style={styles.blank} />;
  }

  return <Screen navigation={navigation} route={route} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  blank: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});

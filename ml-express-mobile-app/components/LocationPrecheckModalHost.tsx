import React, { useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LOCATION_PRECHECK_EVENT,
  resolveLocationPrecheck,
  type LocationPrecheckPayload,
} from '../utils/locationPrecheckBridge';

/**
 * 挂载在根布局，接收 locationPermissionGate 发出的全屏披露，再拉起系统权限。
 */
export default function LocationPrecheckModalHost() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [copy, setCopy] = useState<LocationPrecheckPayload | null>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      LOCATION_PRECHECK_EVENT,
      (p: LocationPrecheckPayload) => {
        setCopy(p);
        setVisible(true);
      },
    );
    return () => sub.remove();
  }, []);

  const close = (accepted: boolean) => {
    setVisible(false);
    setCopy(null);
    resolveLocationPrecheck(accepted);
  };

  return (
    <Modal
      visible={visible && !!copy}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => close(false)}
    >
      {copy ? (
        <LinearGradient
          colors={['#0f172a', '#1e3a8a', '#0f172a']}
          style={[styles.root, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <Text style={styles.title}>{copy.title}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.body}>{copy.body}</Text>
          </ScrollView>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => close(true)}
            style={styles.btnPrimaryWrap}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnPrimary}
            >
              <Text style={styles.btnPrimaryText}>{copy.continueLabel}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => close(false)}>
            <Text style={styles.btnSecondaryText}>{copy.cancelLabel}</Text>
          </TouchableOpacity>
        </LinearGradient>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  scroll: { flex: 1, maxHeight: '58%' },
  scrollInner: { paddingBottom: 12 },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.92)',
  },
  btnPrimaryWrap: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  btnPrimary: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnSecondary: { marginTop: 14, paddingVertical: 10, alignItems: 'center' },
  btnSecondaryText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
});

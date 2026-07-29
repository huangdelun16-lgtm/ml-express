import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import ChangePasswordModal from '../components/ChangePasswordModal';
import BluetoothScanModal from '../components/BluetoothScanModal';
import LanguageSwitcherRow from '../components/LanguageSwitcherRow';
import { useAuth } from '../contexts/AuthContext';
import { resolveAppError, useTranslation } from '../i18n';
import { probeCloudConnection } from '../services/cloudConnection';
import { resolveStoreHubCode } from '../utils/storeZone';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { INVENTORY_SUPPORT_URL } from '../constants/support';
import {
  checkAndroidAppUpdate,
  openAndroidApkDownload,
} from '../services/appUpdateService';
import { getActiveBluetoothDevice } from '../services/bluetoothScanner';
import type { ScannedBluetoothDevice } from '../utils/bluetoothDeviceMerge';

function SectionCard({
  icon,
  title,
  accent,
  badge,
  children,
}: {
  icon: string;
  title: string;
  accent: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIconWrap, { backgroundColor: `${accent}22` }]}>
          <Text style={styles.sectionIcon}>{icon}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {badge ? (
          <View style={[styles.sectionBadge, { backgroundColor: `${accent}33` }]}>
            <Text style={[styles.sectionBadgeText, { color: accent }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.sectionBody, { borderColor: `${accent}40` }]}>{children}</View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  accent,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  accent: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.quickAction, { borderColor: `${accent}55` }, disabled && styles.quickActionDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${accent}22` }]}>
        <Text style={styles.quickActionEmoji}>{icon}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const {
    operatorName,
    storeCode,
    store,
    hubCode,
    logout,
  } = useAuth();
  const { t, fmt } = useTranslation();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [bluetoothScanVisible, setBluetoothScanVisible] = useState(false);
  const [connectedBluetooth, setConnectedBluetooth] = useState<ScannedBluetoothDevice | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'checking' | 'online' | 'offline'
  >('checking');
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const hub = store ? resolveStoreHubCode(store) : hubCode ?? '';
  const appVersion = Constants.expoConfig?.version ?? '1.8.7';
  const buildVersion = Constants.nativeBuildVersion ?? '20';

  const checkConnection = useCallback(async () => {
    setConnectionStatus('checking');
    const result = await probeCloudConnection();
    setConnectionStatus(result.authenticated ? 'online' : 'offline');
  }, []);

  useFocusEffect(
    useCallback(() => {
      void checkConnection();
      void getActiveBluetoothDevice().then(setConnectedBluetooth);
    }, [checkConnection]),
  );

  const handleLogout = () => {
    Alert.alert(t.settings.logoutTitle, t.settings.logoutConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.logout, style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const handleCheckForUpdate = () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    void (async () => {
      try {
        const result = await checkAndroidAppUpdate();
        if (!result.latest) {
          Alert.alert(t.common.tip, t.settings.updateNoReleaseConfig);
          return;
        }
        if (!result.hasUpdate) {
          Alert.alert(
            t.settings.updateUpToDateTitle,
            fmt(t.settings.updateUpToDateBody, {
              current: result.currentVersion,
              code: String(result.currentVersionCode),
            }),
          );
          return;
        }
        const latest = result.latest;
        Alert.alert(
          t.settings.updateAvailableTitle,
          fmt(t.settings.updateAvailableBody, {
            current: result.currentVersion,
            code: String(result.currentVersionCode),
            latest: latest.version,
            latestCode: String(latest.versionCode),
            notes: latest.releaseNotes || '—',
          }),
          [
            { text: t.common.cancel, style: 'cancel' },
            {
              text: t.settings.updateDownload,
              onPress: () => {
                void openAndroidApkDownload(latest.apkUrl).catch((e: unknown) => {
                  Alert.alert(t.settings.updateCheckFailed, resolveAppError(t, e));
                });
              },
            },
          ],
        );
      } catch (e: unknown) {
        Alert.alert(t.settings.updateCheckFailed, resolveAppError(t, e));
      } finally {
        setCheckingUpdate(false);
      }
    })();
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{hub?.slice(0, 2) ?? t.common.thisStation.slice(0, 1)}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName} numberOfLines={1}>
              {operatorName ?? t.common.transitHub}
            </Text>
            <View style={styles.heroTags}>
              {storeCode ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{storeCode}</Text>
                </View>
              ) : null}
              {hub ? (
                <View style={[styles.tag, styles.tagHub]}>
                  <Text style={styles.tagHubText}>{fmt(t.settings.regionTag, { hub: regionDisplayLabel(hub) })}</Text>
                </View>
              ) : null}
            </View>
            {store?.address ? (
              <Text style={styles.heroAddr} numberOfLines={2}>{store.address}</Text>
            ) : null}
          </View>
          <Pressable
            style={styles.logoutChip}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel={t.common.logout}
          >
            <Text style={styles.logoutChipText}>{t.common.logout}</Text>
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          <QuickAction
            icon="🔐"
            label={t.settings.changePassword}
            accent="#10b981"
            onPress={() => setPasswordModalVisible(true)}
          />
        </View>
      </View>

      <SectionCard
        icon="●"
        title={t.settings.connectionTitle}
        accent={connectionStatus === 'online' ? '#10b981' : '#f59e0b'}
        badge={
          connectionStatus === 'checking'
            ? t.settings.connectionChecking
            : connectionStatus === 'online'
              ? t.settings.connectionOnline
              : t.settings.connectionOffline
        }
      >
        <Text style={styles.hintText}>{t.settings.onlineOnlyHint}</Text>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => void checkConnection()}
          disabled={connectionStatus === 'checking'}
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnSecondaryText}>{t.settings.testConnection}</Text>
        </Pressable>
      </SectionCard>

      <SectionCard
        icon="📡"
        title={t.settings.scanPrinterTitle}
        accent="#38bdf8"
        badge={connectedBluetooth ? t.settings.scanPrinterConnected : undefined}
      >
        <Text style={styles.hintText}>{t.settings.scanPrinterHint}</Text>
        {connectedBluetooth ? (
          <Text style={styles.connectedPrinterText}>
            {fmt(t.settings.scanPrinterConnectedTo, { name: connectedBluetooth.name })}
          </Text>
        ) : null}
        <Pressable
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => setBluetoothScanVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t.settings.scanPrinterStart}
        >
          <Text style={styles.actionBtnPrimaryText}>{t.settings.scanPrinterStart}</Text>
        </Pressable>
      </SectionCard>

      <SectionCard icon="🌐" title={t.language.title} accent="#0ea5e9">
        <LanguageSwitcherRow />
      </SectionCard>

      <SectionCard icon="ℹ️" title={t.settings.appInfo} accent="#8b5cf6">
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t.settings.versionLabel}</Text>
          <Text style={styles.infoValue}>{appVersion} ({buildVersion})</Text>
        </View>
        {Platform.OS === 'android' ? (
          <Pressable
            style={[styles.actionBtn, styles.actionBtnPrimary, checkingUpdate && styles.btnDisabled]}
            onPress={handleCheckForUpdate}
            disabled={checkingUpdate}
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnPrimaryText}>
              {checkingUpdate ? t.settings.checkingUpdate : t.settings.checkForUpdate}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => void Linking.openURL(INVENTORY_SUPPORT_URL)}
          accessibilityRole="link"
        >
          <Text style={styles.actionBtnSecondaryText}>{t.settings.openSupport}</Text>
        </Pressable>
      </SectionCard>

      <Text style={styles.footer}>{t.settings.footer}</Text>

      <ChangePasswordModal
        visible={passwordModalVisible}
        storeCode={storeCode}
        onClose={() => setPasswordModalVisible(false)}
        onSuccess={() =>
          Alert.alert(t.settings.passwordUpdated, t.settings.passwordUpdatedMsg)
        }
      />

      <BluetoothScanModal
        visible={bluetoothScanVisible}
        onClose={() => setBluetoothScanVisible(false)}
        onConnectionChange={() => {
          void getActiveBluetoothDevice().then(setConnectedBluetooth);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#065f46',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  heroAvatarText: { color: '#ecfdf5', fontWeight: '900', fontSize: 20 },
  heroInfo: { flex: 1, minWidth: 0 },
  heroName: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  heroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tagHub: { backgroundColor: '#172554', borderColor: '#1d4ed8' },
  tagHubText: { color: '#93c5fd', fontSize: 12, fontWeight: '800' },
  heroAddr: { color: '#64748b', fontSize: 12, marginTop: 8, lineHeight: 17 },
  logoutChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
  },
  logoutChipText: { color: '#f87171', fontWeight: '800', fontSize: 13 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
  },
  quickActionDisabled: { opacity: 0.5 },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionEmoji: { fontSize: 20 },
  quickActionLabel: { color: '#f1f5f9', fontWeight: '800', fontSize: 14 },
  sectionCard: { marginBottom: 14 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '900', flex: 1 },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '900' },
  sectionBody: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  hintText: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  connectedPrinterText: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  actionBtnPrimary: { backgroundColor: '#2563eb', marginBottom: 8 },
  actionBtnPrimaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  actionBtnSecondary: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 8,
  },
  actionBtnSecondaryText: { color: '#e2e8f0', fontWeight: '900', fontSize: 14 },
  btnDisabled: { opacity: 0.55 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  infoLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  infoValue: { color: '#f8fafc', fontSize: 14, fontWeight: '900' },
  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
});

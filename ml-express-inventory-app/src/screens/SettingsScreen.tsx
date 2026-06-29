import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import ChangePasswordModal from '../components/ChangePasswordModal';
import LanguageSwitcherRow from '../components/LanguageSwitcherRow';
import { useAuth } from '../contexts/AuthContext';
import { formatTimeAgo, resolveAppError, useTranslation } from '../i18n';
import type { TranslationDict } from '../i18n/translations';
import {
  getBluetoothCapabilityHint,
  getPrinterSettings,
  pickIosLabelPrinter,
  savePrinterSettings,
  type PrinterConnectionMode,
  type PrinterSettings,
} from '../services/printerService';
import { clearAllTestData } from '../services/inventoryService';
import {
  getCloudSyncStatus,
  runManualCloudSync,
  type CloudSyncStatus,
} from '../services/cloudSyncStatus';
import { resolveStoreHubCode } from '../utils/storeZone';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { resolveSyncErrorMessage, syncImpactMessage } from '../utils/cloudSyncSla';

function SyncStatusRow({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'err' }) {
  const valueColor =
    tone === 'ok' ? '#6ee7b7' : tone === 'warn' ? '#fcd34d' : tone === 'err' ? '#fca5a5' : '#e2e8f0';
  return (
    <View style={styles.syncRow}>
      <Text style={styles.syncLabel}>{label}</Text>
      <Text style={[styles.syncValue, { color: valueColor }]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function connectionLabel(t: TranslationDict, status: CloudSyncStatus): { text: string; tone: 'ok' | 'warn' | 'err' } {
  const { connection } = status;
  if (!connection.configured) {
    return { text: t.settings.cloudSync.notConfigured, tone: 'err' };
  }
  if (!connection.authenticated) {
    return { text: t.settings.cloudSync.authRequired, tone: 'warn' };
  }
  return { text: t.settings.cloudSync.connected, tone: 'ok' };
}

function opTypeLabel(t: TranslationDict, op: string | null): string {
  if (op === 'item_and_movement') return t.settings.cloudSync.opItem;
  if (op === 'packed_shipment') return t.settings.cloudSync.opPack;
  if (op === 'truck_load') return t.settings.cloudSync.opTruckLoad;
  return op ?? '—';
}

const WIDTH_OPTIONS: PrinterSettings['labelWidthMm'][] = [40, 50, 60, 80];
const CONNECTION_OPTIONS: { mode: PrinterConnectionMode; labelKey: 'connectionSystem' | 'connectionBluetooth' }[] = [
  { mode: 'system', labelKey: 'connectionSystem' },
  { mode: 'bluetooth', labelKey: 'connectionBluetooth' },
];

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
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${accent}22` }]}>
        <Text style={styles.quickActionEmoji}>{icon}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { operatorName, storeCode, store, hubCode, logout, hasShiftOperator, updateShiftOperator } = useAuth();
  const { t, fmt, language } = useTranslation();
  const [settings, setSettings] = useState<PrinterSettings | null>(null);
  const [clearing, setClearing] = useState(false);
  const [cloudSync, setCloudSync] = useState<CloudSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [pickingPrinter, setPickingPrinter] = useState(false);
  const [operatorDraft, setOperatorDraft] = useState('');
  const [savingOperator, setSavingOperator] = useState(false);

  const hub = store ? resolveStoreHubCode(store) : hubCode ?? '';

  const refreshCloudSync = async () => {
    const status = await getCloudSyncStatus(store);
    setCloudSync(status);
  };

  useEffect(() => {
    void getPrinterSettings().then(setSettings);
    void refreshCloudSync();
  }, [storeCode, store?.id]);

  useEffect(() => {
    setOperatorDraft(hasShiftOperator ? (operatorName ?? '') : '');
  }, [hasShiftOperator, operatorName, storeCode]);

  const updatePrinter = async (patch: Partial<PrinterSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await savePrinterSettings(next);
  };

  if (!settings) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>{t.settings.loading}</Text>
      </View>
    );
  }

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
          <Pressable style={styles.logoutChip} onPress={() => void logout()}>
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

      <SectionCard icon="🌐" title={t.language.title} accent="#0ea5e9">
        <LanguageSwitcherRow />
      </SectionCard>

      <SectionCard icon="👤" title={t.settings.operator.title} accent="#10b981">
        <Text style={styles.fieldLabel}>{t.settings.operator.nameLabel}</Text>
        <TextInput
          style={styles.operatorInput}
          value={operatorDraft}
          onChangeText={setOperatorDraft}
          placeholder={t.settings.operator.namePlaceholder}
          placeholderTextColor="#64748b"
          autoCapitalize="words"
          autoCorrect={false}
        />
        <Text style={styles.hintText}>{t.settings.operator.nameHint}</Text>
        {!hasShiftOperator && store ? (
          <Text style={styles.operatorWarn}>{t.settings.operator.storeFallback}</Text>
        ) : null}
        <Pressable
          style={[
            styles.actionBtn,
            styles.actionBtnPrimary,
            (savingOperator || !operatorDraft.trim() || !store) && styles.btnDisabled,
          ]}
          disabled={savingOperator || !operatorDraft.trim() || !store}
          onPress={() => {
            if (!store || !operatorDraft.trim()) return;
            void (async () => {
              setSavingOperator(true);
              try {
                await updateShiftOperator(operatorDraft);
                Alert.alert(t.common.success, t.settings.operator.saved);
              } catch (e: unknown) {
                Alert.alert(t.common.fail, resolveAppError(t, e));
              } finally {
                setSavingOperator(false);
              }
            })();
          }}
        >
          <Text style={styles.actionBtnPrimaryText}>
            {savingOperator ? t.common.processing : t.settings.operator.save}
          </Text>
        </Pressable>
      </SectionCard>

      <SectionCard
        icon="☁️"
        title={t.settings.cloudSync.title}
        accent="#8b5cf6"
        badge={cloudSync && cloudSync.pending > 0 ? String(cloudSync.pending) : undefined}
      >
        {cloudSync ? (
          <>
            <SyncStatusRow
              label={t.settings.cloudSync.connectionStatus}
              value={connectionLabel(t, cloudSync).text}
              tone={connectionLabel(t, cloudSync).tone}
            />
            {!cloudSync.connection.authenticated && cloudSync.connection.errorCode ? (
              <Text style={styles.hintText}>
                {resolveAppError(t, new Error(cloudSync.connection.errorCode))}
              </Text>
            ) : null}
            <SyncStatusRow
              label={t.settings.cloudSync.pending}
              value={
                cloudSync.pending > 0
                  ? fmt(t.settings.cloudSync.pendingCount, { count: cloudSync.pending })
                  : t.settings.cloudSync.pendingNone
              }
              tone={cloudSync.pending > 0 ? 'warn' : 'ok'}
            />
            {cloudSync.pending > 0 ? (
              <>
                {cloudSync.pendingTruckLoad > 0 ? (
                  <Text style={styles.hintText}>
                    {fmt(t.settings.cloudSync.priorityTruck, { count: cloudSync.pendingTruckLoad })}
                  </Text>
                ) : null}
                {cloudSync.pendingPack > 0 ? (
                  <Text style={styles.hintText}>
                    {fmt(t.settings.cloudSync.priorityPack, { count: cloudSync.pendingPack })}
                  </Text>
                ) : null}
                {cloudSync.pendingItem > 0 ? (
                  <Text style={styles.hintText}>
                    {fmt(t.settings.cloudSync.priorityItem, { count: cloudSync.pendingItem })}
                  </Text>
                ) : null}
                {syncImpactMessage(t, cloudSync.highestPriorityType, cloudSync.pending) ? (
                  <View style={styles.syncBanner}>
                    <Text style={styles.syncBannerLabel}>{t.settings.cloudSync.slaImpactTitle}</Text>
                    <Text style={styles.syncBannerText}>
                      {syncImpactMessage(t, cloudSync.highestPriorityType, cloudSync.pending)}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
            {cloudSync.pending > 0 && cloudSync.oldestOpType ? (
              <Text style={styles.hintText}>{opTypeLabel(t, cloudSync.oldestOpType)}</Text>
            ) : null}
            <SyncStatusRow
              label={t.settings.cloudSync.lastSync}
              value={
                cloudSync.lastSync
                  ? `${formatTimeAgo(cloudSync.lastSync.at, t).primary} · ${
                      cloudSync.lastSync.ok
                        ? t.settings.cloudSync.lastSyncOk
                        : t.settings.cloudSync.lastSyncFailed
                    }`
                  : t.settings.cloudSync.lastSyncNever
              }
              tone={
                !cloudSync.lastSync
                  ? undefined
                  : cloudSync.lastSync.ok
                    ? 'ok'
                    : 'err'
              }
            />
            {cloudSync.lastSync?.at ? (
              <Text style={styles.hintText}>{formatTimeAgo(cloudSync.lastSync.at, t).secondary}</Text>
            ) : null}
            {cloudSync.queueError ? (
              <>
                <SyncStatusRow
                  label={t.settings.cloudSync.queueError}
                  value={resolveSyncErrorMessage(t, cloudSync.queueError)}
                  tone="err"
                />
              </>
            ) : null}
            {cloudSync.lastSync?.error && !cloudSync.queueError ? (
              <SyncStatusRow
                label={t.settings.cloudSync.lastSyncFailed}
                value={resolveSyncErrorMessage(t, cloudSync.lastSync.error)}
                tone="err"
              />
            ) : null}
          </>
        ) : (
          <ActivityIndicator color="#a78bfa" />
        )}
        <Pressable
          style={[
            styles.actionBtn,
            styles.actionBtnPrimary,
            (syncing || !store || !hub) && styles.btnDisabled,
          ]}
          disabled={syncing || !store || !hub}
          onPress={() => {
            if (!store || !hub) return;
            void (async () => {
              setSyncing(true);
              try {
                const result = await runManualCloudSync(store, hub);
                await refreshCloudSync();
                Alert.alert(
                  t.settings.cloudSync.syncSuccess,
                  result.pending > 0
                    ? fmt(t.settings.cloudSync.syncSuccessWithPending, { count: result.pending })
                    : t.settings.cloudSync.syncSuccess,
                );
              } catch (e: unknown) {
                await refreshCloudSync();
                Alert.alert(t.common.fail, resolveAppError(t, e));
              } finally {
                setSyncing(false);
              }
            })();
          }}
        >
          <Text style={styles.actionBtnPrimaryText}>
            {syncing ? t.settings.cloudSync.syncing : t.settings.cloudSync.syncNow}
          </Text>
        </Pressable>
      </SectionCard>

      <SectionCard icon="🖨️" title={t.settings.labelPrint} accent="#3b82f6">
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>{t.settings.enablePrint}</Text>
          <Switch
            value={settings.enabled}
            onValueChange={(v) => updatePrinter({ enabled: v })}
            trackColor={{ false: '#334155', true: '#2563eb' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.fieldLabel}>{t.settings.connectionMode}</Text>
        <View style={styles.chips}>
          {CONNECTION_OPTIONS.map(({ mode, labelKey }) => (
            <Pressable
              key={mode}
              style={[styles.chip, settings.connectionMode === mode && styles.chipOn]}
              onPress={() => void updatePrinter({ connectionMode: mode })}
            >
              <Text style={[styles.chipText, settings.connectionMode === mode && styles.chipTextOn]}>
                {t.settings[labelKey]}
              </Text>
            </Pressable>
          ))}
        </View>
        {settings.connectionMode === 'bluetooth' ? (
          <>
            <Text style={styles.hintText}>{getBluetoothCapabilityHint(language)}</Text>
            <Text style={styles.hintText}>{t.settings.bluetoothPairHint}</Text>
            {Platform.OS === 'ios' ? (
              <>
                <Text style={styles.fieldLabel}>{t.settings.iosSelectPrinter}</Text>
                <Text style={styles.hintText}>
                  {settings.iosPrinterName
                    ? fmt(t.settings.iosPrinterSelected, { name: settings.iosPrinterName })
                    : t.settings.iosPrinterNotSelected}
                </Text>
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnPrimary, pickingPrinter && styles.btnDisabled]}
                  disabled={pickingPrinter}
                  onPress={() => {
                    void (async () => {
                      setPickingPrinter(true);
                      try {
                        const next = await pickIosLabelPrinter();
                        setSettings(next);
                      } catch (e: unknown) {
                        Alert.alert(t.settings.printFailed, resolveAppError(t, e));
                      } finally {
                        setPickingPrinter(false);
                      }
                    })();
                  }}
                >
                  <Text style={styles.actionBtnPrimaryText}>{t.settings.iosSelectPrinter}</Text>
                </Pressable>
              </>
            ) : null}
          </>
        ) : null}
        <Text style={styles.fieldLabel}>{t.settings.labelWidth}</Text>
        <View style={styles.chips}>
          {WIDTH_OPTIONS.map((w) => (
            <Pressable
              key={w}
              style={[styles.chip, settings.labelWidthMm === w && styles.chipOn]}
              onPress={() => updatePrinter({ labelWidthMm: w })}
            >
              <Text style={[styles.chipText, settings.labelWidthMm === w && styles.chipTextOn]}>
                {w}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>{t.settings.copies}</Text>
        <TextInput
          style={styles.copiesInput}
          keyboardType="number-pad"
          value={String(settings.copies)}
          onChangeText={(t) => {
            const n = Math.max(1, Math.min(9, Number(t) || 1));
            void updatePrinter({ copies: n });
          }}
        />
      </SectionCard>

      <SectionCard icon="🧪" title={t.settings.testData} accent="#ef4444">
        <Pressable
          style={[styles.actionBtn, styles.actionBtnDanger, clearing && styles.btnDisabled]}
          disabled={clearing}
          onPress={() => {
            Alert.alert(
              t.settings.clearAllTitle,
              t.settings.clearAllMessage,
              [
                { text: t.common.cancel, style: 'cancel' },
                {
                  text: t.common.deleteAll,
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      setClearing(true);
                      try {
                        const result = await clearAllTestData(store ?? undefined, hub);
                        const edgePart = result.cloudEdge
                          ? `\nCloud: ${result.cloudEdge.items} items, ${result.cloudEdge.packs} packs`
                          : result.cloudEdgeError
                            ? `\nCloud: ${resolveAppError(t, new Error(result.cloudEdgeError))}`
                            : '';
                        Alert.alert(
                          t.common.cleared,
                          `Local: ${result.local.items} items, ${result.local.packs} packs, ${result.local.movements} movements${edgePart}`,
                        );
                      } catch (e: unknown) {
                        Alert.alert(
                          t.common.fail,
                          resolveAppError(t, e),
                        );
                      } finally {
                        setClearing(false);
                      }
                    })();
                  },
                },
              ],
            );
          }}
        >
          <Text style={styles.actionBtnText}>
            {clearing ? t.settings.clearing : t.settings.clearAllBtn}
          </Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, paddingBottom: 40 },
  loadingRoot: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#94a3b8', fontWeight: '700' },
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
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  syncLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700', flex: 1 },
  syncValue: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
    flex: 1.2,
    textAlign: 'right',
  },
  syncBanner: {
    backgroundColor: '#4c1d95',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#6d28d9',
  },
  syncBannerLabel: { color: '#c4b5fd', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  syncBannerText: { color: '#e9d5ff', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  operatorInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '700',
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  operatorWarn: {
    color: '#fcd34d',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
    fontWeight: '700',
  },
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  fieldLabel: { color: '#f1f5f9', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  hintText: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  chipOn: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontWeight: '800' },
  chipTextOn: { color: '#fff' },
  copiesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
    marginBottom: 10,
    maxWidth: 88,
    fontWeight: '900',
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  actionBtnDanger: { backgroundColor: '#b91c1c' },
  actionBtnPrimary: { backgroundColor: '#2563eb', marginBottom: 8 },
  actionBtnPrimaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  btnDisabled: { opacity: 0.55 },
  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
});

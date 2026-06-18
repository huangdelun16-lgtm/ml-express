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
import { useAuth } from '../contexts/AuthContext';
import {
  getPrinterSettings,
  savePrinterSettings,
  type PrinterSettings,
} from '../services/printerService';
import { clearAllTestData } from '../services/inventoryService';
import { getCloudSyncQueueSnapshot } from '../services/inventoryCloudQueue';
import { resolveStoreHubCode } from '../utils/storeZone';

const WIDTH_OPTIONS: PrinterSettings['labelWidthMm'][] = [40, 50, 60, 80];

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
  const { operatorName, storeCode, store, hubCode, logout } = useAuth();
  const [settings, setSettings] = useState<PrinterSettings | null>(null);
  const [clearing, setClearing] = useState(false);
  const [syncPending, setSyncPending] = useState(0);
  const [syncLastError, setSyncLastError] = useState<string | null>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const hub = store ? resolveStoreHubCode(store) : hubCode ?? '';

  const refreshSyncQueue = async () => {
    if (!storeCode) {
      setSyncPending(0);
      setSyncLastError(null);
      return;
    }
    const snapshot = await getCloudSyncQueueSnapshot(storeCode);
    setSyncPending(snapshot.pending);
    setSyncLastError(snapshot.lastError);
  };

  useEffect(() => {
    void getPrinterSettings().then(setSettings);
    void refreshSyncQueue();
  }, [storeCode]);

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
        <Text style={styles.loadingText}>加载设置…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{hub?.slice(0, 2) ?? '站'}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName} numberOfLines={1}>{operatorName ?? '中转站'}</Text>
            <View style={styles.heroTags}>
              {storeCode ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{storeCode}</Text>
                </View>
              ) : null}
              {hub ? (
                <View style={[styles.tag, styles.tagHub]}>
                  <Text style={styles.tagHubText}>区域 {hub}</Text>
                </View>
              ) : null}
            </View>
            {store?.address ? (
              <Text style={styles.heroAddr} numberOfLines={2}>{store.address}</Text>
            ) : null}
          </View>
          <Pressable style={styles.logoutChip} onPress={() => void logout()}>
            <Text style={styles.logoutChipText}>退出</Text>
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          <QuickAction
            icon="🔐"
            label="修改密码"
            accent="#10b981"
            onPress={() => setPasswordModalVisible(true)}
          />
        </View>
      </View>

      {syncPending > 0 ? (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            ⏳ {syncPending} 项待上传
            {syncLastError ? ` · ${syncLastError}` : ''}
          </Text>
        </View>
      ) : null}

      <SectionCard icon="🖨️" title="标签打印" accent="#3b82f6">
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>启用打印</Text>
          <Switch
            value={settings.enabled}
            onValueChange={(v) => updatePrinter({ enabled: v })}
            trackColor={{ false: '#334155', true: '#2563eb' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.fieldLabel}>标签宽度 (mm)</Text>
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
        <Text style={styles.fieldLabel}>每次打印份数</Text>
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

      <SectionCard icon="🧪" title="测试数据" accent="#ef4444">
        <Pressable
          style={[styles.actionBtn, styles.actionBtnDanger, clearing && styles.btnDisabled]}
          disabled={clearing}
          onPress={() => {
            Alert.alert(
              '清空全部订单',
              '将删除本机所有入库订单、快递包、流水，并清空云端库存与追踪。确定继续？',
              [
                { text: '取消', style: 'cancel' },
                {
                  text: '全部删除',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      setClearing(true);
                      try {
                        const result = await clearAllTestData(store ?? undefined, hub);
                        const edgePart = result.cloudEdge
                          ? `\n云端：${result.cloudEdge.items} 商品、${result.cloudEdge.packs} 包裹`
                          : result.cloudEdgeError
                            ? `\n云端：${result.cloudEdgeError}`
                            : '';
                        Alert.alert(
                          '已清空',
                          `本机：${result.local.items} 商品、${result.local.packs} 包裹、${result.local.movements} 条流水${edgePart}`,
                        );
                      } catch (e: unknown) {
                        Alert.alert('失败', e instanceof Error ? e.message : '请重试');
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
          <Text style={styles.actionBtnText}>{clearing ? '清空中…' : '清空全部订单（测试）'}</Text>
        </Pressable>
      </SectionCard>

      <Text style={styles.footer}>ML Inventory v1.0 · Market Link Express</Text>

      <ChangePasswordModal
        visible={passwordModalVisible}
        storeCode={storeCode}
        onClose={() => setPasswordModalVisible(false)}
        onSuccess={() => Alert.alert('密码已更新', '当前会话已刷新，下次登录请使用新密码。')}
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
  syncBanner: {
    backgroundColor: '#4c1d95',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#6d28d9',
  },
  syncBannerText: { color: '#e9d5ff', fontSize: 13, fontWeight: '700' },
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
  fieldLabel: { color: '#f1f5f9', fontWeight: '800', fontSize: 14 },
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

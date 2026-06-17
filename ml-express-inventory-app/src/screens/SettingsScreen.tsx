import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  getPrinterSettings,
  savePrinterSettings,
  type PrinterSettings,
} from '../services/printerService';
import { clearAllTestData, syncPlatformInventoryCloud } from '../services/inventoryService';
import { getCloudSyncQueueSnapshot } from '../services/inventoryCloudQueue';
import { isInventoryCloudAuthError, INVENTORY_RELOGIN_HINT } from '../utils/cloudAuthErrors';
import { isInventoryAuthRequiredError } from '../services/authService';
import { resolveStoreHubCode } from '../utils/storeZone';

const WIDTH_OPTIONS: PrinterSettings['labelWidthMm'][] = [40, 50, 60, 80];

function SectionCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionDot, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={[styles.sectionBody, { borderLeftColor: accent }]}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { operatorName, storeCode, store, hubCode, logout } = useAuth();
  const [settings, setSettings] = useState<PrinterSettings | null>(null);
  const [clearing, setClearing] = useState(false);
  const [syncPending, setSyncPending] = useState(0);
  const [syncLastError, setSyncLastError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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
      <View style={styles.root}>
        <Text style={styles.hint}>加载中…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{hub?.slice(0, 2) ?? '站'}</Text>
        </View>
        <View style={styles.profileMain}>
          <Text style={styles.profileName}>{operatorName ?? '中转站'}</Text>
          <Text style={styles.profileMeta}>
            {storeCode ? `代码 ${storeCode}` : ''}
            {hub ? ` · 区域 ${hub}` : ''}
          </Text>
          {store?.address ? <Text style={styles.profileAddr}>{store.address}</Text> : null}
        </View>
        <Pressable style={styles.logoutBtn} onPress={() => void logout()}>
          <Text style={styles.logoutBtnText}>退出</Text>
        </Pressable>
      </View>

      <SectionCard title="标签打印" accent="#2563eb">
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>启用打印</Text>
          <Switch value={settings.enabled} onValueChange={(v) => updatePrinter({ enabled: v })} />
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
        <Text style={styles.muted}>
          通过系统打印 / AirPrint 输出 HTML 标签。入库成功弹窗可一键打印条码。
        </Text>
      </SectionCard>

      <SectionCard title="扫码说明" accent="#0891b2">
        <Text style={styles.muted}>
          · 扫码枪：保持输入框聚焦，扫完自动回车{'\n'}
          · 手机相机：点输入框右侧「扫码」{'\n'}
          · 通用扫码：首页「通用扫码」查看本地 + 云端状态
        </Text>
      </SectionCard>

      <SectionCard title="云端同步" accent="#7c3aed">
        <Text style={styles.muted}>
          离线或网络失败时，入库/打包/装车操作会进入本机队列，联网后自动重试。
        </Text>
        <Text style={styles.syncStat}>
          待上传：{syncPending} 项
          {syncLastError ? ` · 最近失败：${syncLastError}` : ''}
        </Text>
        <Pressable
          style={[styles.syncBtn, syncing && styles.dangerBtnDisabled]}
          disabled={syncing || !store}
          onPress={() => {
            if (!store) return;
            void (async () => {
              setSyncing(true);
              try {
                await syncPlatformInventoryCloud(store, hub);
                await refreshSyncQueue();
                Alert.alert('同步完成', syncPending > 0 ? '已重试离线队列并拉取云端' : '已与云端对齐');
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : '同步失败';
                const needsRelogin =
                  isInventoryAuthRequiredError(e) || isInventoryCloudAuthError(e);
                Alert.alert(
                  needsRelogin ? '请重新登录' : '同步失败',
                  needsRelogin ? msg || INVENTORY_RELOGIN_HINT : msg,
                  needsRelogin
                    ? [
                        { text: '取消', style: 'cancel' },
                        {
                          text: '退出并重新登录',
                          onPress: () => void logout(),
                        },
                      ]
                    : [{ text: 'OK' }],
                );
              } finally {
                setSyncing(false);
              }
            })();
          }}
        >
          <Text style={styles.syncBtnText}>{syncing ? '同步中…' : '立即同步云端'}</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="测试数据" accent="#991b1b">
        <Text style={styles.muted}>
          清空本机订单、快递包、流水、离线同步队列，以及云端库存与装车/到站追踪。仅用于测试，不可恢复。
        </Text>
        <Pressable
          style={[styles.dangerBtn, clearing && styles.dangerBtnDisabled]}
          disabled={clearing}
          onPress={() => {
            Alert.alert(
              '清空全部订单',
              '将删除本机所有入库订单、快递包、流水，并清空云端库存表与装车/到站追踪。确定继续？',
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
                          ? `\n云端：${result.cloudEdge.items} 商品、${result.cloudEdge.packs} 包裹、${result.cloudEdge.trackingPacks} 在途包、${result.cloudEdge.trackingOrders} 在途单`
                          : result.cloudEdgeError
                            ? `\n云端：${result.cloudEdgeError}`
                            : '';
                        const platformPart =
                          result.cloudPlatform && !result.cloudEdge
                            ? `\n云端库存（回退）：${result.cloudPlatform.items} 商品、${result.cloudPlatform.packs} 包裹`
                            : result.cloudPlatformError
                              ? `\n云端库存（回退）：${result.cloudPlatformError}`
                              : '';
                        const cloudPart =
                          result.cloud && !result.cloudEdge
                            ? `\n云端追踪（回退）：${result.cloud.packs} 包、${result.cloud.orders} 单`
                            : result.cloudError
                              ? `\n云端追踪（回退）：${result.cloudError}`
                              : '';
                        const queuePart =
                          result.queueCleared > 0
                            ? `\n离线队列：${result.queueCleared} 条`
                            : '';
                        Alert.alert(
                          '已清空',
                          `本机：${result.local.items} 商品、${result.local.packs} 包裹、${result.local.movements} 条流水${edgePart}${platformPart}${cloudPart}${queuePart}`,
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
          <Text style={styles.dangerBtnText}>{clearing ? '清空中…' : '清空全部订单（测试）'}</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="关于" accent="#64748b">
        <Text style={styles.muted}>
          ML Inventory v1.0 — 中转站库存 App{'\n'}
          库存与流水存本机 SQLite；装车/到站状态同步 Supabase。
        </Text>
        <Pressable
          onPress={() =>
            Alert.alert(
              '数据说明',
              '库存与流水仅存于本设备。换机或卸载前请自行备份。',
            )
          }
        >
          <Text style={styles.link}>数据与同步说明</Text>
        </Pressable>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  hint: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  profileMain: { flex: 1, minWidth: 0 },
  profileName: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  profileMeta: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginTop: 4 },
  profileAddr: { color: '#64748b', fontSize: 12, marginTop: 4 },
  logoutBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  logoutBtnText: { color: '#94a3b8', fontWeight: '800', fontSize: 13 },
  sectionCard: { marginBottom: 16 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  sectionBody: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
  },
  muted: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  fieldLabel: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  chipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#94a3b8', fontWeight: '700' },
  chipTextOn: { color: '#fff' },
  copiesInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    maxWidth: 80,
    fontWeight: '800',
  },
  dangerBtn: {
    marginTop: 12,
    backgroundColor: '#991b1b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerBtnDisabled: { opacity: 0.6 },
  dangerBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  syncStat: { color: '#c4b5fd', fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 10 },
  syncBtn: {
    backgroundColor: '#6d28d9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  syncBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  link: { color: '#60a5fa', fontWeight: '700', marginTop: 10 },
});

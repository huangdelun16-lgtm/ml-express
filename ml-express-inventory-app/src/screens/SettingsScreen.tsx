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
import { clearAllTestData } from '../services/inventoryService';

const WIDTH_OPTIONS: PrinterSettings['labelWidthMm'][] = [40, 50, 60, 80];

export default function SettingsScreen() {
  const { operatorName, storeCode, store, logout } = useAuth();
  const [settings, setSettings] = useState<PrinterSettings | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    void getPrinterSettings().then(setSettings);
  }, []);

  const update = async (patch: Partial<PrinterSettings>) => {
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
      <Text style={styles.section}>中转站账号</Text>
      <View style={styles.card}>
        <Text style={styles.rowLabel}>店铺名称</Text>
        <Text style={styles.rowValue}>{operatorName}</Text>
        {storeCode ? (
          <>
            <Text style={styles.rowLabel}>店铺代码</Text>
            <Text style={styles.rowMeta}>{storeCode}</Text>
          </>
        ) : null}
        {store?.region ? (
          <>
            <Text style={styles.rowLabel}>区域</Text>
            <Text style={styles.rowMeta}>{store.region}</Text>
          </>
        ) : null}
        <Pressable onPress={() => void logout()}>
          <Text style={styles.link}>退出登录</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>标签打印（打印机型号待定）</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.rowLabel}>启用打印</Text>
          <Switch
            value={settings.enabled}
            onValueChange={(v) => update({ enabled: v })}
          />
        </View>
        <Text style={styles.rowLabel}>标签宽度 (mm)</Text>
        <View style={styles.chips}>
          {WIDTH_OPTIONS.map((w) => (
            <Pressable
              key={w}
              style={[styles.chip, settings.labelWidthMm === w && styles.chipOn]}
              onPress={() => update({ labelWidthMm: w })}
            >
              <Text style={[styles.chipText, settings.labelWidthMm === w && styles.chipTextOn]}>{w}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.rowLabel}>每次打印份数</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={String(settings.copies)}
          onChangeText={(t) => {
            const n = Math.max(1, Math.min(9, Number(t) || 1));
            void update({ copies: n });
          }}
        />
        <Text style={styles.note}>
          当前通过系统打印 / AirPrint 输出 HTML 标签。选定具体标签机后可接入 ESC/POS 或厂商 SDK。
        </Text>
      </View>

      <Text style={styles.section}>扫码说明</Text>
      <View style={styles.card}>
        <Text style={styles.note}>
          · 扫码枪（USB/WiFi/蓝牙 HID）：保持输入框聚焦，扫完自动回车{'\n'}
          · 手机相机：点输入框右侧「扫码」，支持补光与手动输入{'\n'}
          · 通用扫码页：首页「相机扫码」，扫完显示本地+云端状态
        </Text>
      </View>

      <Text style={styles.section}>测试数据</Text>
      <View style={styles.card}>
        <Text style={styles.note}>
          清空本机全部订单、快递包、库存流水，并尝试清空 Supabase 云端追踪记录。仅用于重新测试，不可恢复。
        </Text>
        <Pressable
          style={[styles.dangerBtn, clearing && styles.dangerBtnDisabled]}
          disabled={clearing}
          onPress={() => {
            Alert.alert(
              '清空全部订单',
              '将删除本机所有入库订单、快递包、流水，并清空云端装车/到站追踪。确定继续？',
              [
                { text: '取消', style: 'cancel' },
                {
                  text: '全部删除',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      setClearing(true);
                      try {
                        const result = await clearAllTestData();
                        const cloudPart = result.cloud
                          ? `\n云端：${result.cloud.packs} 包、${result.cloud.orders} 单`
                          : result.cloudError
                            ? `\n云端：${result.cloudError}`
                            : '';
                        Alert.alert(
                          '已清空',
                          `本机：${result.local.items} 商品、${result.local.packs} 包裹、${result.local.movements} 条流水${cloudPart}`,
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
      </View>

      <Text style={styles.section}>关于</Text>
      <View style={styles.card}>
        <Text style={styles.note}>
          ML Inventory v1.0 — 中转站库存 App{'\n'}
          登录校验连接 Admin 合伙店铺；库存与流水在本机 SQLite；装车/到站状态同步 Supabase 云端。
        </Text>
        <Pressable
          onPress={() =>
            Alert.alert(
              '数据说明',
              '所有库存与流水仅存于本设备。换机或卸载前请自行导出（后续版本可加入导出功能）。',
            )
          }
        >
          <Text style={styles.link}>数据与同步说明</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  hint: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  section: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowLabel: { color: '#e2e8f0', fontWeight: '700', marginBottom: 6 },
  rowValue: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  rowMeta: { color: '#94a3b8', fontSize: 15, fontWeight: '700', fontFamily: 'monospace', marginBottom: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    maxWidth: 80,
  },
  note: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  link: { color: '#60a5fa', fontWeight: '700', marginTop: 10 },
  dangerBtn: {
    marginTop: 12,
    backgroundColor: '#991b1b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerBtnDisabled: { opacity: 0.6 },
  dangerBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

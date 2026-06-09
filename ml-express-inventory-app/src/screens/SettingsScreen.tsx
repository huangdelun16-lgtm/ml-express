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

const WIDTH_OPTIONS: PrinterSettings['labelWidthMm'][] = [40, 50, 60, 80];

export default function SettingsScreen() {
  const { operatorName, logout } = useAuth();
  const [settings, setSettings] = useState<PrinterSettings | null>(null);

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
      <Text style={styles.section}>工作人员</Text>
      <View style={styles.card}>
        <Text style={styles.rowLabel}>当前账号</Text>
        <Text style={styles.rowValue}>{operatorName}</Text>
        <Pressable onPress={() => logout()}>
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

      <Text style={styles.section}>扫码枪</Text>
      <View style={styles.card}>
        <Text style={styles.note}>
          USB、Wi-Fi、蓝牙扫码枪请设置为 HID 键盘模式。入库/出库页保持输入框聚焦，扫完自动回车即可录入。
        </Text>
      </View>

      <Text style={styles.section}>关于</Text>
      <View style={styles.card}>
        <Text style={styles.note}>
          ML Inventory v1.0 — 平台库存独立 App{'\n'}
          数据保存在本机 SQLite，暂不连接 Supabase 或其它业务端。
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
});

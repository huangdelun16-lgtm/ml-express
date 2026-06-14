import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import BarcodeScannerView from '../components/BarcodeScannerView';
import { useAuth } from '../contexts/AuthContext';
import { getItemByBarcode, markCustomerSigned } from '../services/inventoryService';
import { findTrackingByAnyCode } from '../services/trackingService';
import type { InventoryItem } from '../types/inventory';
import { PKG_STATUS_LABEL } from '../types/tracking';
import { canMarkCustomerSigned } from '../utils/customerSign';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

type Nav = {
  navigate: (
    name: string,
    params?: { presetBarcode?: string; presetCode?: string },
  ) => void;
};

type ScanResult = {
  code: string;
  item: InventoryItem | null;
  cloudStatus: string | null;
  cloudRoute: string | null;
};

export default function CameraScanScreen({ navigation }: { navigation: Nav }) {
  const { store, operatorName } = useAuth();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = async (code: string) => {
    setLoading(true);
    setResult(null);
    try {
      const [item, cloud] = await Promise.all([
        getItemByBarcode(code),
        findTrackingByAnyCode(code),
      ]);
      const pkg = cloud.pkg;
      setResult({
        code,
        item,
        cloudStatus: pkg ? PKG_STATUS_LABEL[pkg.status] : null,
        cloudRoute: pkg ? `${pkg.origin_store_code} → ${pkg.destination_code}` : null,
      });
    } finally {
      setLoading(false);
    }
  };

  const goTrack = () => {
    if (!result) return;
    navigation.navigate('TrackExpress', { presetCode: result.code });
  };

  const goStockIn = () => {
    if (!result) return;
    navigation.navigate('StockIn', { presetBarcode: result.code });
  };

  const goHubReceive = () => {
    navigation.navigate('HubReceive');
  };

  const canSign =
    result?.item && store && canMarkCustomerSigned(store, result.item);

  const handleSign = async () => {
    if (!result?.item || !store) return;
    setSigning(true);
    try {
      await markCustomerSigned(result.item.id, operatorName ?? '工作人员', store);
      const item = await getItemByBarcode(result.code);
      setResult({ ...result, item });
      showTaskSuccess('签收成功', `${result.item.name} 已标记为客户已签收`);
    } catch (e: unknown) {
      Alert.alert('签收失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setSigning(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.scannerArea}>
        <BarcodeScannerView
          active={isFocused}
          compact
          onScan={(code) => void handleScan(code)}
          title="通用扫码"
          subtitle="扫完自动查询本地与云端状态"
        />
      </View>

      <View style={styles.resultPanel}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.loadingText}>查询中…</Text>
          </View>
        ) : !result ? (
          <Text style={styles.placeholder}>扫码后在此显示结果与快捷操作</Text>
        ) : (
          <>
            <Text style={styles.code} selectable>
              {result.code}
            </Text>
            <Text style={styles.meta}>
              {result.item
                ? `本地：${result.item.name} · 库存 ${result.item.qty_on_hand}`
                : '本地：未建档'}
            </Text>
            {result.cloudStatus ? (
              <Text style={styles.meta}>
                云端：{result.cloudStatus}
                {result.cloudRoute ? ` · ${result.cloudRoute}` : ''}
              </Text>
            ) : (
              <Text style={styles.meta}>云端：无在途记录</Text>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.actionPrimary} onPress={goTrack}>
                <Text style={styles.actionPrimaryText}>追踪详情</Text>
              </Pressable>
              {canSign ? (
                <Pressable
                  style={[styles.actionSign, signing && styles.actionDisabled]}
                  onPress={() => void handleSign()}
                  disabled={signing}
                >
                  <Text style={styles.actionSignText}>
                    {signing ? '签收中…' : '已签收'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.action} onPress={goStockIn}>
                <Text style={styles.actionText}>去入库</Text>
              </Pressable>
              {result.code.toUpperCase().startsWith('PKG') ? (
                <Pressable style={styles.action} onPress={goHubReceive}>
                  <Text style={styles.actionText}>到站收货</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scannerArea: { flex: 1, minHeight: 300 },
  resultPanel: {
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 14,
    minHeight: 140,
  },
  placeholder: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 12 },
  loadingText: { color: '#94a3b8' },
  code: { color: '#fde68a', fontSize: 16, fontWeight: '900', fontFamily: 'monospace' },
  meta: { color: '#94a3b8', fontSize: 13, marginTop: 6, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  action: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  actionText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  actionSign: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionSignText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  actionDisabled: { opacity: 0.65 },
});

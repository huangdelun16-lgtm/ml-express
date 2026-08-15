import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import BarcodeScannerView from '../components/BarcodeScannerView';
import CustomerSignFlowModal, { type CustomerSignFlowRequest } from '../components/CustomerSignFlowModal';
import { useAuth } from '../contexts/AuthContext';
import { getPkgStatusLabel, resolveAppError, useTranslation } from '../i18n';
import { getItemByBarcode } from '../services/inventoryService';
import { findTrackingByAnyCode } from '../services/trackingService';
import type { InventoryItem } from '../types/inventory';
import { canMarkCustomerSigned } from '../utils/customerSign';
import { isPackageBarcode } from '../utils/packageNumber';
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { feedbackService } from '../services/FeedbackService';

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
  const { t, fmt } = useTranslation();
  const { store, operatorName } = useAuth();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);
  const [signRequest, setSignRequest] = useState<CustomerSignFlowRequest | null>(null);
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
        cloudStatus: pkg ? getPkgStatusLabel(t, pkg.status) : null,
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

  const handleSign = () => {
    if (!result?.item || !store) return;
    setSignRequest({
      itemIds: [result.item.id],
      operator: operatorName ?? t.common.operator,
      store,
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.scannerArea}>
        <BarcodeScannerView
          active={isFocused && signRequest == null}
          compact
          onScan={(code) => void handleScan(code)}
          title={t.cameraScan.title}
          subtitle={t.cameraScan.subtitle}
        />
      </View>

      <View style={styles.resultPanel}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.loadingText}>{t.common.querying}</Text>
          </View>
        ) : !result ? (
          <Text style={styles.placeholder}>{t.cameraScan.placeholder}</Text>
        ) : (
          <>
            <Text style={styles.code} selectable>
              {result.code}
            </Text>
            <Text style={styles.meta}>
              {result.item
                ? `${t.common.localPrefix}${result.item.name} · ${fmt(t.common.stockQty, { qty: result.item.qty_on_hand })}`
                : t.common.localNotFound}
            </Text>
            {result.cloudStatus ? (
              <Text style={styles.meta}>
                {t.common.cloudPrefix}
                {result.cloudStatus}
                {result.cloudRoute ? ` · ${result.cloudRoute}` : ''}
              </Text>
            ) : (
              <Text style={styles.meta}>{t.common.cloudNoRecord}</Text>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.actionPrimary} onPress={goTrack}>
                <Text style={styles.actionPrimaryText}>{t.cameraScan.trackDetail}</Text>
              </Pressable>
              {canSign ? (
                <Pressable
                  style={[styles.actionSign, signRequest && styles.actionDisabled]}
                  onPress={handleSign}
                  disabled={signRequest != null}
                >
                  <Text style={styles.actionSignText}>
                    {signRequest ? t.common.signInProgress : t.common.signed}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.action} onPress={goStockIn}>
                <Text style={styles.actionText}>{t.cameraScan.goStockIn}</Text>
              </Pressable>
              {isPackageBarcode(result.code) ? (
                <Pressable style={styles.action} onPress={goHubReceive}>
                  <Text style={styles.actionText}>{t.cameraScan.goHubReceive}</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </View>

      <CustomerSignFlowModal
        request={signRequest}
        onClose={() => setSignRequest(null)}
        resolveError={(e) => resolveAppError(t, e)}
        onSuccess={async (detail, signedCount) => {
          const item = await getItemByBarcode(result?.code ?? detail.barcode);
          if (result) setResult({ ...result, item });
          showTaskSuccess(
            t.common.signSuccess,
            signedCount > 1
              ? `已签收 ${signedCount} 单`
              : fmt(t.common.signMarked, { name: detail.name }),
          );
        }}
        onError={(message) => feedbackService.notify(t.common.signFailed, message)}
      />
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

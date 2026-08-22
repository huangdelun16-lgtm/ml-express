import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { InventoryStoreSession } from '../../services/authService';
import type { PkgTrackingDetail } from '../../types/tracking';
import type { TranslationDict } from '../../i18n/translations';
import { regionDisplayLabel } from '../../constants/destinationOptions';
import { getPkgStatusLabel } from '../../i18n';
import { colors, radius, space } from '../../theme';

export function HubReceiveStatusPanels({
  t,
  fmt,
  hubCode,
  store,
  cloudConnected,
  loading,
  ordersModalVisible,
  error,
  message,
  activePack,
  onReopen,
  children,
}: {
  t: TranslationDict;
  fmt: (template: string, vars: Record<string, string | number>) => string;
  hubCode: string;
  store: InventoryStoreSession;
  cloudConnected: boolean | null;
  loading: boolean;
  ordersModalVisible: boolean;
  error: string;
  message: string;
  activePack: PkgTrackingDetail | null;
  onReopen: (pack: PkgTrackingDetail) => void;
  children?: React.ReactNode;
}) {
  return (
    <>
      {cloudConnected === false ? (
        <View style={styles.cloudWarnBox}>
          <Text style={styles.cloudWarnTitle}>{t.hubReceive.cloudRequiredTitle}</Text>
          <Text style={styles.cloudWarnText}>{t.hubReceive.cloudRequiredHint}</Text>
        </View>
      ) : null}

      <View style={styles.zoneCard}>
        <Text style={styles.zoneTitle}>
          {fmt(t.hubReceive.zoneTitle, { hub: hubCode ? regionDisplayLabel(hubCode) : t.common.notSet })}
        </Text>
        <Text style={styles.zoneSub}>
          {store.storeCode} · {store.storeName}
        </Text>
        <Text style={styles.zoneHint}>{t.hubReceive.zoneHint}</Text>
      </View>

      {children}

      {loading && !ordersModalVisible ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accentSky} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View style={styles.okBox}>
          <Text style={styles.okText}>{message}</Text>
        </View>
      ) : null}

      {activePack && !ordersModalVisible ? (
        <Pressable
          style={styles.reopenBtn}
          onPress={() => onReopen(activePack)}
          accessibilityRole="button"
          accessibilityLabel={`${activePack.pack_barcode}，${t.common.continueDispatch}`}
        >
          <Text style={styles.reopenBtnTitle}>{activePack.pack_barcode}</Text>
          <Text style={styles.reopenBtnSub}>
            {getPkgStatusLabel(t, activePack.status)} · {t.common.progress}{' '}
            {activePack.received_order_count}/{activePack.item_count} · {t.common.continueDispatch}
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  zoneCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentCyan,
  },
  zoneTitle: { color: colors.accentSkyBright, fontSize: 16, fontWeight: '900' },
  zoneSub: { color: colors.muted, fontSize: 13, marginTop: 4 },
  zoneHint: { color: colors.muted2, fontSize: 12, lineHeight: 18, marginTop: 8 },
  cloudWarnBox: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
  },
  cloudWarnTitle: { color: colors.amberSoft, fontWeight: '900', fontSize: 14 },
  cloudWarnText: { color: '#fde68a', fontSize: 12, lineHeight: 18, marginTop: 6 },
  loadingBox: { alignItems: 'center', paddingVertical: space.md },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 10,
    padding: space.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  errorText: { color: colors.dangerSoft, fontSize: 13, lineHeight: 20 },
  okBox: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 10,
    padding: space.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  okText: { color: colors.successSoft, fontSize: 13, lineHeight: 20 },
  reopenBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  reopenBtnTitle: {
    color: '#d8b4fe',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  reopenBtnSub: { color: colors.muted, fontSize: 12, marginTop: 6 },
});

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { InventoryStoreSession } from '../../services/authService';
import type { PkgTrackingDetail } from '../../types/tracking';
import type { TranslationDict } from '../../i18n/translations';
import { regionDisplayLabel } from '../../constants/destinationOptions';
import { getPkgStatusLabel } from '../../i18n';
import { colors, radius, space } from '../../theme';

function splitStatusText(raw: string): { title: string; body: string } {
  const parts = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  return { title: parts[0] ?? '', body: parts.slice(1).join('\n') };
}

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
  const hubLabel = hubCode ? regionDisplayLabel(hubCode) : t.common.notSet;
  const errorParts = error ? splitStatusText(error) : null;
  const okParts = message ? splitStatusText(message) : null;
  const steps = [t.hubReceive.zoneStep1, t.hubReceive.zoneStep2, t.hubReceive.zoneStep3];

  return (
    <>
      {cloudConnected === false ? (
        <View style={styles.cloudWarnBox}>
          <Text style={styles.cloudWarnTitle}>{t.hubReceive.cloudRequiredTitle}</Text>
          <Text style={styles.cloudWarnText}>{t.hubReceive.cloudRequiredHint}</Text>
        </View>
      ) : null}

      <View style={styles.zoneCard}>
        <View style={styles.zoneTop}>
          <View style={styles.hubBadge}>
            <Text style={styles.hubBadgeText}>{hubLabel}</Text>
          </View>
          <View style={styles.zoneMeta}>
            <Text style={styles.zoneTitle}>{fmt(t.hubReceive.zoneTitle, { hub: hubLabel })}</Text>
            <Text style={styles.zoneSub}>
              {store.storeCode} · {store.storeName}
            </Text>
          </View>
        </View>
        <View style={styles.steps}>
          {steps.map((label, index) => (
            <View key={label} style={styles.stepChip}>
              <View style={styles.stepDot}>
                <Text style={styles.stepIndex}>{index + 1}</Text>
              </View>
              <Text style={styles.stepLabel} numberOfLines={1}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {children}

      {loading && !ordersModalVisible ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accentSky} />
        </View>
      ) : null}

      {errorParts ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{errorParts.title}</Text>
          {errorParts.body ? <Text style={styles.errorText}>{errorParts.body}</Text> : null}
        </View>
      ) : null}
      {okParts ? (
        <View style={styles.okBox}>
          <Text style={styles.okTitle}>{okParts.title}</Text>
          {okParts.body ? <Text style={styles.okText}>{okParts.body}</Text> : null}
        </View>
      ) : null}

      {activePack && !ordersModalVisible ? (
        <Pressable
          style={({ pressed }) => [styles.reopenBtn, pressed && styles.reopenPressed]}
          onPress={() => onReopen(activePack)}
          accessibilityRole="button"
          accessibilityLabel={`${activePack.pack_barcode}，${t.common.continueDispatch}`}
        >
          <View style={styles.reopenTop}>
            <Text style={styles.reopenBtnTitle}>{activePack.pack_barcode}</Text>
            <Text style={styles.reopenCta}>{t.common.continueDispatch}</Text>
          </View>
          <Text style={styles.reopenBtnSub}>
            {getPkgStatusLabel(t, activePack.status)} · {t.common.progress}{' '}
            {activePack.received_order_count}/{activePack.item_count}
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  zoneCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoneTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hubBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(56,189,248,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubBadgeText: { color: colors.accentSkyBright, fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  zoneMeta: { flex: 1, minWidth: 0 },
  zoneTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  zoneSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  steps: { flexDirection: 'row', gap: 6, marginTop: 8 },
  stepChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    minWidth: 0,
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(56,189,248,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndex: {
    color: colors.accentSkyBright,
    fontSize: 10,
    fontWeight: '900',
  },
  stepLabel: { color: colors.slateSoft, fontSize: 10, fontWeight: '700', flex: 1 },
  cloudWarnBox: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
  },
  cloudWarnTitle: { color: colors.amberSoft, fontWeight: '800', fontSize: 14 },
  cloudWarnText: { color: '#fde68a', fontSize: 12, lineHeight: 18, marginTop: 6 },
  loadingBox: { alignItems: 'center', paddingVertical: space.md },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.28)',
  },
  errorTitle: { color: colors.dangerSoft, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  errorText: { color: '#fda4af', fontSize: 12, lineHeight: 19, marginTop: 8 },
  okBox: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.28)',
  },
  okTitle: { color: colors.successSoft, fontSize: 14, fontWeight: '800' },
  okText: { color: '#6ee7b7', fontSize: 12, lineHeight: 19, marginTop: 6 },
  reopenBtn: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  reopenPressed: { opacity: 0.88 },
  reopenTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reopenBtnTitle: {
    color: colors.accentSkyBright,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
    flex: 1,
  },
  reopenCta: { color: colors.financeBlue, fontSize: 12, fontWeight: '800' },
  reopenBtnSub: { color: colors.muted, fontSize: 12, marginTop: 6 },
});

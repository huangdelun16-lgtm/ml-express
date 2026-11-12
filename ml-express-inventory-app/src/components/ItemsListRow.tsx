import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import PackagingStockInBarcodeText from './PackagingStockInBarcodeText';
import PaidStampWatermark from './PaidStampWatermark';
import Text from './AppText';
import { useTranslation } from '../i18n';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { colors } from '../theme';
import type { InventoryItemListRow } from '../types/inventory';
import {
  isCustomerSignedItem,
  resolveItemCardQty,
  stockUnitLabel,
} from '../utils/itemFieldFormat';
import { resolveItemDestinationCode } from '../utils/itemDestination';
import { resolveItemOrderNumber, resolveItemProductSubtitle } from '../utils/itemOrderNumber';

type Props = {
  item: InventoryItemListRow;
  hubCode?: string;
  selected: boolean;
  selectActive: boolean;
  selectAccent: string;
  exceptionState?: 'open' | 'resolved' | null;
  unnotified?: boolean;
  onPress: () => void;
};

export default function ItemsListRow({
  item,
  hubCode,
  selected,
  selectActive,
  selectAccent,
  exceptionState = null,
  unnotified = false,
  onPress,
}: Props) {
  const { t } = useTranslation();
  const cardQty = resolveItemCardQty(item);
  const orderNumber = resolveItemOrderNumber(item);
  const productSubtitle = resolveItemProductSubtitle(item);
  const meta = [item.spec, item.unit, item.weight].filter(Boolean).join(' · ');
  const regionCode = resolveItemDestinationCode(item);
  const transitShipped = item.hub_transit_shipped;
  const transitReleased = item.hub_transit_released && !transitShipped;
  const transitPendingAtHub =
    item.packed &&
    !transitReleased &&
    !transitShipped &&
    !item.hub_arrived &&
    regionCode &&
    hubCode &&
    regionCode.toUpperCase() !== hubCode.toUpperCase();
  const packBarcode = item.packed && !transitReleased ? item.parent_pack_barcode?.trim() : '';
  const signedDone = isCustomerSignedItem(item);

  return (
    <Pressable
      style={[
        styles.row,
        exceptionState === 'open' && styles.rowExceptionOpen,
        exceptionState === 'resolved' && styles.rowExceptionResolved,
        selectActive && selected && {
          borderColor: selectAccent,
          borderWidth: 2,
          backgroundColor: '#1a2332',
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.customer_name?.trim() || item.recipient_name?.trim() || t.items.noCustomer}，${orderNumber}，${item.barcode}`}
    >
      {selectActive ? <SelectCheck selected={selected} accent={selectAccent} /> : null}
      <View style={styles.cardBody}>
        {signedDone ? <PaidStampWatermark /> : null}
        <View style={styles.cardTop}>
          <View style={styles.cardMain}>
            <Text style={styles.topLine} numberOfLines={1}>
              <Text style={styles.customer}>
                {item.customer_name?.trim() || item.recipient_name?.trim() || t.items.noCustomer}
              </Text>
              {regionCode ? (
                <Text style={styles.destination}> · {regionDisplayLabel(regionCode)}</Text>
              ) : item.destination ? (
                <Text style={styles.destination}> · {item.destination}</Text>
              ) : null}
            </Text>
            <Text style={styles.productName} numberOfLines={2}>
              {orderNumber}
            </Text>
            {productSubtitle ? (
              <Text style={styles.productSubtitle} numberOfLines={1}>
                {productSubtitle}
              </Text>
            ) : null}
            {exceptionState ? (
              <View
                style={[
                  styles.exceptionFlag,
                  exceptionState === 'resolved' ? styles.exceptionFlagResolved : styles.exceptionFlagOpen,
                ]}
              >
                <Text
                  style={[
                    styles.exceptionFlagText,
                    exceptionState === 'resolved'
                      ? styles.exceptionFlagTextResolved
                      : styles.exceptionFlagTextOpen,
                  ]}
                >
                  {exceptionState === 'resolved' ? t.exception.resolvedBadge : t.exception.openBadge}
                </Text>
              </View>
            ) : null}
            <View style={styles.statusRow}>
              {unnotified ? (
                <View style={[styles.statusBadge, styles.statusUnnotified]}>
                  <Text style={[styles.statusText, styles.statusUnnotifiedText]}>
                    {t.arrivalNotify.unnotifiedBadge}
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.statusBadge,
                  signedDone
                    ? styles.statusSignedDone
                    : transitShipped
                      ? styles.statusTransitShipped
                      : transitReleased
                        ? styles.statusTransitReleased
                        : transitPendingAtHub
                          ? styles.statusTransitReleased
                          : item.hub_arrived
                            ? styles.statusHubArrived
                            : item.stocked_in
                              ? styles.statusInDone
                              : styles.statusInPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    signedDone
                      ? styles.statusSignedDoneText
                      : transitShipped
                        ? styles.statusTransitShippedText
                        : transitReleased
                          ? styles.statusTransitReleasedText
                          : transitPendingAtHub
                            ? styles.statusTransitReleasedText
                            : item.hub_arrived
                              ? styles.statusHubArrivedText
                              : item.stocked_in
                                ? styles.statusInDoneText
                                : styles.statusInPendingText,
                  ]}
                >
                  {signedDone
                    ? t.items.statusSigned
                    : transitShipped
                      ? t.items.statusTransferred
                      : transitReleased
                        ? t.items.statusPendingOut
                        : transitPendingAtHub
                          ? t.items.statusPendingTransit
                          : item.hub_arrived
                            ? t.items.statusArrived
                            : item.stocked_in
                              ? t.items.statusInbound
                              : t.items.statusNotInbound}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  item.packed && !transitReleased ? styles.statusPackDone : styles.statusPackPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.packed && !transitReleased ? styles.statusPackDoneText : styles.statusPackPendingText,
                  ]}
                >
                  {item.packed && !transitReleased ? t.items.statusPacked : t.items.statusNotPacked}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.qtyBox}>
            <Text style={styles.qty}>{cardQty}</Text>
            <Text style={styles.unit}>{stockUnitLabel()}</Text>
          </View>
        </View>

        <View style={styles.tagRow}>
          {packBarcode ? (
            <View style={styles.tagPurple}>
              <Text style={styles.tagPurpleLabel}>{t.items.packNo}</Text>
              <Text style={styles.tagPurpleValue} numberOfLines={1}>
                {packBarcode}
              </Text>
            </View>
          ) : null}
          {item.input_barcode ? (
            <View style={styles.tagBlue}>
              <Text style={styles.tagBlueLabel}>{t.items.expressNo}</Text>
              <Text style={styles.tagBlueValue} numberOfLines={1}>
                {item.input_barcode}
              </Text>
            </View>
          ) : null}
          <View style={[styles.tagYellow, !item.input_barcode && !packBarcode && styles.tagYellowFull]}>
            <Text style={styles.tagYellowLabel}>{t.items.inbound}</Text>
            <PackagingStockInBarcodeText
              barcode={item.barcode}
              variant="list"
              numberOfLines={1}
              style={styles.tagYellowValue}
            />
          </View>
        </View>

        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SelectCheck({ selected, accent }: { selected: boolean; accent: string }) {
  return (
    <View style={[styles.check, selected && { backgroundColor: accent, borderColor: accent }]}>
      <Text style={styles.checkMark}>{selected ? '✓' : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
  },
  rowExceptionOpen: {
    backgroundColor: '#3a220c',
    borderColor: '#f59e0b',
    borderWidth: 2,
    borderLeftWidth: 6,
  },
  rowExceptionResolved: {
    backgroundColor: '#241c12',
    borderColor: '#d97706',
    borderWidth: 2,
    borderLeftWidth: 6,
  },
  exceptionFlag: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  exceptionFlagOpen: { backgroundColor: '#f59e0b' },
  exceptionFlagResolved: { backgroundColor: '#b45309' },
  exceptionFlagText: { fontSize: 13, fontWeight: '900' },
  exceptionFlagTextOpen: { color: '#1c1917' },
  exceptionFlagTextResolved: { color: '#fff7ed' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderMuted,
    marginRight: 10,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: colors.white, fontWeight: '900', fontSize: 12 },
  cardBody: { flex: 1, minWidth: 0, position: 'relative' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardMain: { flex: 1, minWidth: 0 },
  topLine: { fontSize: 13, lineHeight: 18 },
  customer: { color: colors.accentSkyBright, fontWeight: '800' },
  destination: { color: colors.purpleMuted, fontWeight: '700' },
  productName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  productSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusInDone: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderColor: 'rgba(74,222,128,0.5)',
  },
  statusInPending: {
    backgroundColor: 'rgba(148,163,184,0.14)',
    borderColor: 'rgba(203,213,225,0.32)',
  },
  statusHubArrived: {
    backgroundColor: 'rgba(14,165,233,0.18)',
    borderColor: 'rgba(56,189,248,0.45)',
  },
  statusTransitReleased: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderColor: 'rgba(196,181,253,0.45)',
  },
  statusTransitShipped: {
    backgroundColor: 'rgba(56,189,248,0.16)',
    borderColor: 'rgba(125,211,252,0.4)',
  },
  statusSignedDone: {
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderColor: 'rgba(74,222,128,0.5)',
  },
  statusPackDone: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderColor: 'rgba(196,181,253,0.45)',
  },
  statusPackPending: {
    backgroundColor: 'rgba(148,163,184,0.14)',
    borderColor: 'rgba(203,213,225,0.32)',
  },
  statusException: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderColor: 'rgba(251,191,36,0.5)',
  },
  statusUnnotified: {
    backgroundColor: 'rgba(22,163,74,0.2)',
    borderColor: 'rgba(74,222,128,0.4)',
  },
  statusText: { fontSize: 12, fontWeight: '800' },
  statusInDoneText: { color: '#4ade80' },
  statusInPendingText: { color: colors.textSecondary },
  statusHubArrivedText: { color: colors.accentSky },
  statusTransitReleasedText: { color: colors.purpleMuted },
  statusTransitShippedText: { color: colors.accentSky },
  statusSignedDoneText: { color: '#4ade80' },
  statusPackDoneText: { color: colors.purpleMuted },
  statusPackPendingText: { color: colors.textSecondary },
  statusExceptionText: { color: colors.warning },
  statusUnnotifiedText: { color: '#4ade80' },
  tagRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  tagBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.38)',
  },
  tagBlueLabel: { color: colors.accentSky, fontSize: 11, fontWeight: '800' },
  tagBlueValue: {
    color: colors.accentSkyBright,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  tagYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
  },
  tagYellowFull: { flexGrow: 1 },
  tagYellowLabel: { color: colors.warning, fontSize: 11, fontWeight: '800' },
  tagYellowValue: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  tagPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(168,85,247,0.14)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
  },
  tagPurpleLabel: { color: colors.purpleMuted, fontSize: 11, fontWeight: '800' },
  tagPurpleValue: {
    color: '#d8b4fe',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  meta: {
    color: colors.slateSoft,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.24)',
    fontFamily: 'monospace',
  },
  qtyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.38)',
  },
  qty: { color: colors.warning, fontSize: 16, fontWeight: '800', lineHeight: 20 },
  unit: { color: colors.amberSoft, fontSize: 11, fontWeight: '700', marginTop: 1 },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PackagingStockInBarcodeText from './PackagingStockInBarcodeText';
import PaidStampWatermark from './PaidStampWatermark';
import { useTranslation } from '../i18n';
import { regionDisplayLabel } from '../constants/destinationOptions';
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
  onPress: () => void;
};

export default function ItemsListRow({
  item,
  hubCode,
  selected,
  selectActive,
  selectAccent,
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
      style={[styles.row, selectActive && selected && { borderColor: selectAccent, backgroundColor: '#1a2332' }]}
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
            <View style={styles.statusRow}>
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
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 7,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 8,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 12 },
  cardBody: { flex: 1, minWidth: 0, position: 'relative' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardMain: { flex: 1, minWidth: 0 },
  topLine: { fontSize: 12, lineHeight: 16 },
  customer: { color: '#7dd3fc', fontWeight: '800' },
  destination: { color: '#a5b4fc', fontWeight: '700' },
  productName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
    lineHeight: 24,
    paddingVertical: 2,
  },
  productSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusInDone: { backgroundColor: 'rgba(34,197,94,0.15)' },
  statusInPending: { backgroundColor: 'rgba(100,116,139,0.2)' },
  statusHubArrived: { backgroundColor: 'rgba(14,165,233,0.15)' },
  statusTransitReleased: { backgroundColor: 'rgba(168,85,247,0.15)' },
  statusTransitShipped: { backgroundColor: 'rgba(56,189,248,0.15)' },
  statusSignedDone: { backgroundColor: 'rgba(34,197,94,0.2)' },
  statusPackDone: { backgroundColor: 'rgba(168,85,247,0.15)' },
  statusPackPending: { backgroundColor: 'rgba(100,116,139,0.2)' },
  statusText: { fontSize: 10, fontWeight: '900' },
  statusInDoneText: { color: '#4ade80' },
  statusInPendingText: { color: '#94a3b8' },
  statusHubArrivedText: { color: '#38bdf8' },
  statusTransitReleasedText: { color: '#c4b5fd' },
  statusTransitShippedText: { color: '#38bdf8' },
  statusSignedDoneText: { color: '#4ade80' },
  statusPackDoneText: { color: '#c4b5fd' },
  statusPackPendingText: { color: '#94a3b8' },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  tagBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  tagBlueLabel: { color: '#38bdf8', fontSize: 10, fontWeight: '800' },
  tagBlueValue: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  tagYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  tagYellowFull: { flex: 1 },
  tagYellowLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '800' },
  tagYellowValue: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  tagPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.28)',
  },
  tagPurpleLabel: { color: '#c4b5fd', fontSize: 10, fontWeight: '800' },
  tagPurpleValue: {
    color: '#d8b4fe',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  meta: { color: '#64748b', fontSize: 11, marginTop: 4, fontFamily: 'monospace' },
  qtyBox: { alignItems: 'flex-end', minWidth: 34 },
  qty: { color: '#fbbf24', fontSize: 17, fontWeight: '900', lineHeight: 19 },
  unit: { color: '#94a3b8', fontSize: 10, marginTop: 0 },
});

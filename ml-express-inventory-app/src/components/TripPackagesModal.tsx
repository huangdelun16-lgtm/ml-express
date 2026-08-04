import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { getPkgStatusLabel, useTranslation } from '../i18n';
import type { TruckTripSummary } from '../utils/truckTripGroups';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { formatDisplayDate } from '../utils/dateFormat';

type Props = {
  visible: boolean;
  trip: TruckTripSummary | null;
  onClose: () => void;
  onOpenPackage?: (packBarcode: string) => void;
};

type Step = 'summary' | 'packages';

export default function TripPackagesModal({
  visible,
  trip,
  onClose,
  onOpenPackage,
}: Props) {
  const { t, fmt } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const [step, setStep] = useState<Step>('summary');
  const sheetMaxHeight = windowHeight * 0.88;

  useEffect(() => {
    if (visible) setStep('summary');
  }, [visible, trip?.tripNumber]);

  if (!trip) return null;

  const destLabel = regionDisplayLabel(trip.legDestination);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t.common.close} />
        <View style={[styles.sheet, { maxHeight: sheetMaxHeight }]}>
          <View style={styles.headerBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t.shipmentTrack.tripModalPackTitle}</Text>
              {step === 'packages' ? (
                <Text style={styles.progress}>
                  {trip.packCount}/{trip.packCount}
                </Text>
              ) : null}
            </View>
            <Text style={styles.tripNo} selectable>
              {trip.tripNumber}
            </Text>
            <View style={styles.summaryRow}>
              <Text style={styles.routeMeta} numberOfLines={1}>
                {fmt(t.shipmentTrack.tripModalRoute, {
                  dest: destLabel,
                  count: trip.packCount,
                })}
              </Text>
              {trip.transportFee ? (
                <Text style={styles.feeInline}>
                  {fmt(t.shipmentTrack.tripModalFee, { fee: trip.transportFee })}
                </Text>
              ) : null}
            </View>
            {trip.outboundDate ? (
              <Text style={styles.dateMeta}>
                {fmt(t.shipmentTrack.tripModalDate, {
                  date: formatDisplayDate(trip.outboundDate),
                })}
              </Text>
            ) : null}
          </View>

          {step === 'summary' ? (
            <View style={styles.summaryBody}>
              <Text style={styles.summaryHint}>{t.shipmentTrack.tripModalSummaryHint}</Text>
              <Pressable style={styles.viewAllBtn} onPress={() => setStep('packages')}>
                <Text style={styles.viewAllBtnText}>
                  {fmt(t.shipmentTrack.tripModalViewPackages, { count: trip.packCount })}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {trip.packages.map((pkg, index) => (
                <Pressable
                  key={pkg.id}
                  style={styles.packRow}
                  onPress={() => onOpenPackage?.(pkg.pack_barcode)}
                >
                  <Text style={styles.orderIndex}>{index + 1}</Text>
                  <View style={styles.packBody}>
                    <View style={styles.packTop}>
                      <Text style={styles.packBarcode} numberOfLines={1} selectable>
                        {pkg.pack_barcode}
                      </Text>
                      <Text style={styles.packStatus}>{getPkgStatusLabel(t, pkg.status)}</Text>
                    </View>
                    <Text style={styles.packMeta}>
                      {fmt(t.common.itemsCount, { count: pkg.item_count })}
                      {pkg.total_weight ? ` · ${pkg.total_weight} Kg` : ''}
                    </Text>
                    <Text style={styles.packRoute}>
                      {pkg.origin_store_code} → {regionDisplayLabel(pkg.destination_code)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.footerBlock}>
            {step === 'packages' ? (
              <Pressable style={styles.backBtn} onPress={() => setStep('summary')}>
                <Text style={styles.backBtnText}>{t.shipmentTrack.tripModalBack}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>{t.common.close}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.82)',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    zIndex: 1,
    overflow: 'hidden',
  },
  headerBlock: {
    flexShrink: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  progress: { color: '#fbbf24', fontSize: 12, fontWeight: '800', marginLeft: 'auto' },
  tripNo: {
    color: '#fcd34d',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  routeMeta: { color: '#94a3b8', fontSize: 12, flex: 1 },
  feeInline: { color: '#fde68a', fontSize: 13, fontWeight: '900' },
  dateMeta: { color: '#64748b', fontSize: 11, marginTop: 4 },
  summaryBody: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    gap: 14,
  },
  summaryHint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  viewAllBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewAllBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  listScroll: {
    marginTop: 8,
    maxHeight: 340,
  },
  listContent: {
    gap: 6,
    paddingBottom: 4,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderIndex: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '900',
    width: 18,
    textAlign: 'center',
    marginTop: 2,
  },
  packBody: { flex: 1, minWidth: 0 },
  packTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  packBarcode: {
    color: '#d8b4fe',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
    flex: 1,
  },
  packStatus: { color: '#7dd3fc', fontSize: 10, fontWeight: '900' },
  packMeta: { color: '#64748b', fontSize: 11, marginTop: 4 },
  packRoute: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  footerBlock: {
    flexShrink: 0,
    marginTop: 10,
    gap: 8,
  },
  backBtn: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  backBtnText: { color: '#cbd5e1', fontWeight: '800', fontSize: 14 },
  closeBtn: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  closeBtnText: { color: '#e2e8f0', fontWeight: '800', fontSize: 14 },
});

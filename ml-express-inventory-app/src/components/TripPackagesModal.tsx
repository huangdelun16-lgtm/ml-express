import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

export default function TripPackagesModal({
  visible,
  trip,
  onClose,
  onOpenPackage,
}: Props) {
  const { t, fmt } = useTranslation();
  if (!trip) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{fmt(t.shipmentTrack.tripModalTitle, { trip: trip.tripNumber })}</Text>
          <Text style={styles.subtitle}>
            {fmt(t.shipmentTrack.tripModalRoute, {
              dest: regionDisplayLabel(trip.legDestination),
              count: trip.packCount,
            })}
          </Text>
          {trip.outboundDate ? (
            <Text style={styles.meta}>
              {fmt(t.shipmentTrack.tripModalDate, { date: formatDisplayDate(trip.outboundDate) })}
            </Text>
          ) : null}
          {trip.transportFee ? (
            <Text style={styles.meta}>
              {fmt(t.shipmentTrack.tripModalFee, { fee: trip.transportFee })}
            </Text>
          ) : null}

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {trip.packages.map((pkg) => (
              <Pressable
                key={pkg.id}
                style={styles.packRow}
                onPress={() => onOpenPackage?.(pkg.pack_barcode)}
              >
                <View style={styles.packTop}>
                  <Text style={styles.packBarcode} numberOfLines={1}>
                    {pkg.pack_barcode}
                  </Text>
                  <Text style={styles.packStatus}>{getPkgStatusLabel(t, pkg.status)}</Text>
                </View>
                <Text style={styles.packMeta}>
                  {fmt(t.common.itemsCount, { count: pkg.item_count })}
                  {pkg.total_weight ? ` · ${pkg.total_weight} Kg` : ''}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t.common.close}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  subtitle: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 6 },
  meta: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 4 },
  list: { marginTop: 16, marginBottom: 12 },
  listContent: { paddingBottom: 8 },
  packRow: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  packTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  packBarcode: {
    color: '#d8b4fe',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
    flex: 1,
  },
  packStatus: { color: '#7dd3fc', fontSize: 11, fontWeight: '900' },
  packMeta: { color: '#64748b', fontSize: 11, marginTop: 4 },
  closeBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  closeBtnText: { color: '#cbd5e1', fontWeight: '800', fontSize: 15 },
});

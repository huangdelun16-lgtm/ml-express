import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BarcodeImage from './BarcodeImage';
import type { OrderBarcodeData } from './OrderBarcodeModal';
import { useTranslation } from '../i18n';

type Props = {
  data: OrderBarcodeData;
};

export default function LabelBarcodeContent({ data }: Props) {
  const { t } = useTranslation();
  const expressNo = data.inputBarcode?.trim() ?? '';

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t.settings.printWindowLabelContent}</Text>
      {expressNo ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t.items.expressNo}</Text>
          <Text style={styles.fieldValue} selectable numberOfLines={2}>
            {expressNo}
          </Text>
        </View>
      ) : null}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          {data.kind === 'pack' ? t.items.packNo : t.items.inbound}
        </Text>
        <View style={styles.barcodeBox}>
          <BarcodeImage code={data.barcode} height={72} maxWidth={260} showCodeText />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    textAlign: 'center',
  },
  field: { marginBottom: 12 },
  fieldLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  fieldValue: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  barcodeBox: {
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
});

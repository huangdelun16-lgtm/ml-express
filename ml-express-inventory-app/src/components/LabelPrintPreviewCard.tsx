import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BarcodeImage from './BarcodeImage';
import { XPRINTER_P203A } from '../constants/xprinterP203a';
import { truncateLabelText } from '../utils/labelPrintLayout';

type Props = {
  barcode: string;
  inputBarcode?: string;
  destination?: string;
};

export default function LabelPrintPreviewCard({
  barcode,
  inputBarcode,
  destination,
}: Props) {
  const previewWidth = Math.round((XPRINTER_P203A.defaultWidthMm / 58) * 220);

  return (
    <View style={[styles.wrap, { width: previewWidth }]}>
      <View style={styles.label}>
        {inputBarcode?.trim() ? (
          <Text style={styles.inputCode} numberOfLines={2}>
            {inputBarcode.trim()}
          </Text>
        ) : null}
        {destination?.trim() ? (
          <Text style={styles.metaDest} numberOfLines={1}>
            {truncateLabelText(`→ ${destination.trim()}`, 20)}
          </Text>
        ) : null}
        <BarcodeImage code={barcode} height={56} showCodeText={false} />
        <Text style={styles.code} selectable numberOfLines={2}>
          {barcode}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', marginBottom: 12 },
  label: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  inputCode: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 4,
  },
  metaDest: {
    color: '#0369a1',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  code: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 6,
  },
});

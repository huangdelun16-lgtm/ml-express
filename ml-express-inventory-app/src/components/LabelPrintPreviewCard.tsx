import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import BarcodeImage from './BarcodeImage';
import { truncateLabelText } from '../utils/labelPrintLayout';

type Props = {
  barcode: string;
  inputBarcode?: string;
  destination?: string;
};

/** 标签预览最大宽度：不超过屏幕可用宽度，也不超过约 58mm 标签比例 */
function useLabelPreviewMaxWidth(): number {
  const { width: screenWidth } = useWindowDimensions();
  const byScreen = Math.max(200, screenWidth - 96);
  const byLabelMm = Math.round((58 / 58) * 220);
  return Math.min(byScreen, byLabelMm);
}

export default function LabelPrintPreviewCard({
  barcode,
  inputBarcode,
  destination,
}: Props) {
  const previewWidth = useLabelPreviewMaxWidth();
  const barcodeMaxWidth = previewWidth - 16;

  return (
    <View style={[styles.wrap, { maxWidth: previewWidth }]}>
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
        <BarcodeImage
          code={barcode}
          height={64}
          maxWidth={barcodeMaxWidth}
          showCodeText={false}
        />
        <Text style={styles.code} selectable numberOfLines={2}>
          {barcode}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    width: '100%',
    marginBottom: 12,
    overflow: 'hidden',
  },
  label: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
    width: '100%',
  },
  inputCode: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: '100%',
  },
  metaDest: {
    color: '#0369a1',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    maxWidth: '100%',
  },
  code: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 6,
    maxWidth: '100%',
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BarcodeImage from './BarcodeImage';
import type { OrderBarcodeData } from './OrderBarcodeModal';

type Props = {
  data: OrderBarcodeData;
};

/** 入库 / 包装入库弹窗中的标签预览（仅展示可打印内容，不含字段说明文字） */
export default function LabelBarcodeContent({ data }: Props) {
  const expressNo = data.inputBarcode?.trim() ?? '';

  return (
    <View style={styles.wrap}>
      {expressNo ? (
        <Text style={styles.expressNo} selectable numberOfLines={2}>
          {expressNo}
        </Text>
      ) : null}
      <BarcodeImage
        code={data.barcode}
        height={72}
        maxWidth={260}
        showCodeText
        centered
      />
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
    alignItems: 'center',
  },
  expressNo: {
    color: '#0284c7',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 12,
    width: '100%',
  },
});

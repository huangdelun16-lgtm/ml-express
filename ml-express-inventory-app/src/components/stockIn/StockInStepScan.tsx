import React from 'react';
import { StyleSheet, Text } from 'react-native';
import InboundDateField from '../InboundDateField';
import { InboundFormSection } from '../InboundFormPrimitives';
import ScanInputBar from '../ScanInputBar';
import type { InventoryItem } from '../../types/inventory';
import { stockUnitLabel } from '../../utils/itemFieldFormat';
import { todayInMyanmar } from '../../utils/stockInDate';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme';

export default function StockInStepScan({
  scan,
  inboundDate,
  scanLoading,
  lookupHint,
  item,
  onScanChange,
  onResolveBarcode,
  onInboundDateChange,
}: {
  scan: string;
  inboundDate: Date;
  scanLoading: boolean;
  lookupHint: string;
  item: InventoryItem | null;
  onScanChange: (text: string) => void;
  onResolveBarcode: (code: string) => void;
  onInboundDateChange: (date: Date) => void;
}) {
  const { t, fmt } = useTranslation();

  return (
    <InboundFormSection title={t.stockIn.step1Title} accent={colors.accentBlue}>
      <ScanInputBar
        value={scan}
        onChangeText={onScanChange}
        onSubmit={onResolveBarcode}
        busy={scanLoading}
        cameraScan={{
          title: t.stockIn.step1Label,
          subtitle: t.trackExpress.cameraSubtitle,
        }}
        placeholder={t.stockIn.step1Placeholder}
      />
      {lookupHint ? <Text style={styles.lookupHint}>{lookupHint}</Text> : null}
      {item ? (
        <Text style={styles.lookupMeta}>
          {item.name} · {fmt(t.common.stockQty, { qty: item.qty_on_hand })} {stockUnitLabel()}
        </Text>
      ) : null}

      <InboundDateField
        value={inboundDate}
        onChange={onInboundDateChange}
        maximumDate={todayInMyanmar()}
      />
    </InboundFormSection>
  );
}

const styles = StyleSheet.create({
  lookupHint: { color: colors.successText, fontSize: 13, marginTop: 8, fontWeight: '700' },
  lookupMeta: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 },
});

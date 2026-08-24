import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DestinationPickerField from '../DestinationPickerField';
import { InboundFormField, InboundFormSection } from '../InboundFormPrimitives';
import { DimensionSpecField, LockedSuffixField } from '../StructuredItemFields';
import type { FormFieldChainProps } from '../../hooks/useFormFieldChain';
import { sanitizeNumberInput, stockUnitLabel } from '../../utils/itemFieldFormat';
import { useTranslation } from '../../i18n';
import { colors, radius, space } from '../../theme';
import ScanRefBanner from './ScanRefBanner';

/** 入库向导暂不展示；自动计费与写入流水仍保留，订单详情继续显示 */
const SHOW_TOTAL_FEE_FIELD = false;
/** 费用页暂不展示详细地址；草稿 / 提交 / 订单详情仍可保留已有值 */
const SHOW_DETAIL_ADDRESS_FIELD = false;

export default function StockInStepFee({
  scan,
  destination,
  detailAddress,
  specL,
  specW,
  specH,
  weightN,
  qty,
  payCod,
  payPrepaid,
  totalFee,
  feeFormulaHint,
  canAutoTotalFee,
  totalFeeManual,
  note,
  chain,
  onDestinationChange,
  onDetailAddressChange,
  onSpecChange,
  onWeightChange,
  onQtyChange,
  onToggleCod,
  onTogglePrepaid,
  onTotalFeeChange,
  onNoteChange,
}: {
  scan: string;
  destination: string;
  detailAddress: string;
  specL: string;
  specW: string;
  specH: string;
  weightN: string;
  qty: string;
  payCod: boolean;
  payPrepaid: boolean;
  totalFee: string;
  feeFormulaHint: string;
  canAutoTotalFee: boolean;
  totalFeeManual: boolean;
  note: string;
  chain: {
    detail: FormFieldChainProps;
    specL: FormFieldChainProps;
    specW: FormFieldChainProps;
    specH: FormFieldChainProps;
    weight: FormFieldChainProps;
    qty: FormFieldChainProps;
    totalFee: FormFieldChainProps;
    note: FormFieldChainProps;
  };
  onDestinationChange: (v: string) => void;
  onDetailAddressChange: (v: string) => void;
  onSpecChange: (next: { l: string; w: string; h: string }) => void;
  onWeightChange: (v: string) => void;
  onQtyChange: (v: string) => void;
  onToggleCod: () => void;
  onTogglePrepaid: () => void;
  onTotalFeeChange: (v: string) => void;
  onNoteChange: (v: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <ScanRefBanner code={scan} hint={t.stockIn.scannedBarcode} />
      <InboundFormSection title={t.stockIn.feeSection} accent={colors.success}>
        <DestinationPickerField
          label={t.stockIn.finalDest}
          hint={t.stockOut.destinationHint}
          value={destination}
          onChange={onDestinationChange}
        />
        {SHOW_DETAIL_ADDRESS_FIELD ? (
          <InboundFormField
            label={t.stockIn.detailAddress}
            value={detailAddress}
            onChange={onDetailAddressChange}
            placeholder={t.stockIn.detailAddress}
            multiline
            inputRef={chain.detail.inputRef}
            returnKeyType={chain.detail.returnKeyType}
            onSubmitEditing={chain.detail.onSubmitEditing}
            blurOnSubmit={chain.detail.blurOnSubmit}
          />
        ) : null}
        <DimensionSpecField
          l={specL}
          w={specW}
          h={specH}
          onChange={onSpecChange}
          lInput={chain.specL}
          wInput={chain.specW}
          hInput={chain.specH}
        />
        <LockedSuffixField
          label={t.stockIn.weightRequired}
          value={weightN}
          suffix="Kg"
          onChange={onWeightChange}
          placeholder={t.stockIn.weightRequired.replace(' *', '')}
          inputRef={chain.weight.inputRef}
          returnKeyType={chain.weight.returnKeyType}
          onSubmitEditing={chain.weight.onSubmitEditing}
          blurOnSubmit={chain.weight.blurOnSubmit}
        />
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>{t.stockIn.qtyRequired}</Text>
          <View style={styles.qtyControls}>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => onQtyChange(String(Math.max(1, (Number(qty) || 1) - 1)))}
              accessibilityRole="button"
              accessibilityLabel={t.stockIn.qtyRequired}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <TextInput
              ref={chain.qty.inputRef}
              style={styles.qtyInput}
              keyboardType="decimal-pad"
              value={qty}
              onChangeText={onQtyChange}
              returnKeyType={chain.qty.returnKeyType}
              onSubmitEditing={chain.qty.onSubmitEditing}
              blurOnSubmit={chain.qty.blurOnSubmit}
              submitBehavior="submit"
            />
            <Pressable
              style={styles.qtyBtn}
              onPress={() => onQtyChange(String((Number(qty) || 0) + 1))}
              accessibilityRole="button"
              accessibilityLabel={t.stockIn.qtyRequired}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
            <Text style={styles.qtyUnit}>{stockUnitLabel()}</Text>
          </View>
        </View>
        <View style={styles.payRow}>
          <Text style={styles.payLabel}>{t.stockIn.paymentRequired}</Text>
          <View style={styles.payChecks}>
            <Pressable style={[styles.payCheck, payCod && styles.payCheckOn]} onPress={onToggleCod}>
              <Text style={[styles.payCheckText, payCod && styles.payCheckTextOn]}>{t.stockIn.cod}</Text>
            </Pressable>
            <Pressable
              style={[styles.payCheck, payPrepaid && styles.payCheckOn]}
              onPress={onTogglePrepaid}
            >
              <Text style={[styles.payCheckText, payPrepaid && styles.payCheckTextOn]}>
                {t.stockIn.prepaid}
              </Text>
            </Pressable>
          </View>
        </View>
        {SHOW_TOTAL_FEE_FIELD ? (
          <>
            <InboundFormField
              label={t.stockIn.totalFee}
              value={totalFee}
              onChange={(v) => onTotalFeeChange(sanitizeNumberInput(v))}
              placeholder={t.manualEntry.amount}
              keyboard="decimal-pad"
              inputRef={chain.totalFee.inputRef}
              returnKeyType={chain.totalFee.returnKeyType}
              onSubmitEditing={chain.totalFee.onSubmitEditing}
              blurOnSubmit={chain.totalFee.blurOnSubmit}
            />
            {feeFormulaHint && canAutoTotalFee && !totalFeeManual ? (
              <Text style={styles.feeHint}>{feeFormulaHint}</Text>
            ) : null}
          </>
        ) : null}
        <InboundFormField
          label={t.stockIn.noteOptional}
          value={note}
          onChange={onNoteChange}
          placeholder={t.manualEntry.notePlaceholder}
          multiline
          inputRef={chain.note.inputRef}
          returnKeyType={chain.note.returnKeyType}
          onSubmitEditing={chain.note.onSubmitEditing}
          blurOnSubmit={chain.note.blurOnSubmit}
        />
      </InboundFormSection>
    </>
  );
}

const styles = StyleSheet.create({
  qtyRow: { marginBottom: space.md },
  qtyLabel: { color: colors.textSecondary, fontWeight: '700', marginBottom: 8, fontSize: 13 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtnText: { color: colors.text, fontSize: 22, fontWeight: '800' },
  qtyInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.inputText,
  },
  qtyUnit: { color: colors.muted, fontWeight: '800', fontSize: 14, minWidth: 36 },
  payRow: { marginBottom: space.md },
  payLabel: { color: colors.textSecondary, fontWeight: '700', marginBottom: 8, fontSize: 13 },
  payChecks: { flexDirection: 'row', gap: 10 },
  payCheck: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.bg,
  },
  payCheckOn: {
    borderColor: colors.success,
    backgroundColor: 'rgba(5,150,105,0.15)',
  },
  payCheckText: { color: colors.muted, fontWeight: '800', fontSize: 14 },
  payCheckTextOn: { color: colors.successText },
  feeHint: {
    color: colors.muted2,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
    marginTop: -4,
  },
});

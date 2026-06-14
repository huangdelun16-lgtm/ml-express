import React, { useMemo } from 'react';
import { useFormFieldChain } from '../hooks/useFormFieldChain';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DestinationPickerField from './DestinationPickerField';
import PackagingPickerField from './PackagingPickerField';
import { InboundFormField, InboundFormSection, inboundFormStyles } from './InboundFormPrimitives';
import { DimensionSpecField, LockedSuffixField } from './StructuredItemFields';
import { stockUnitLabel } from '../utils/itemFieldFormat';

export type InboundOrderFormBodyValues = {
  productName: string;
  specL: string;
  specW: string;
  specH: string;
  weightN: string;
  packaging: string;
  recipientName: string;
  recipientPhone: string;
  destination: string;
  note: string;
};

type Props = {
  mode: 'stock-in' | 'edit';
  values: InboundOrderFormBodyValues;
  specStr: string;
  weightStr: string;
  editable?: boolean;
  onProductNameChange: (v: string) => void;
  onSpecChange: (parts: { l: string; w: string; h: string }) => void;
  onWeightChange: (v: string) => void;
  onPackagingChange: (v: string) => void;
  onRecipientNameChange: (v: string) => void;
  onRecipientPhoneChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  barcodeText: string;
  barcodeCaption?: string;
  inboundDateLabel?: string;
  inboundDateYmd?: string;
  inboundDate?: Date;
  showDatePicker?: boolean;
  onOpenDatePicker?: () => void;
  onCloseDatePicker?: () => void;
  onDateChange?: (_event: unknown, date?: Date) => void;
  maxInboundDate?: Date;
  qty?: string;
  onQtyChange?: (v: string) => void;
  onQtyDec?: () => void;
  onQtyInc?: () => void;
  qtyOnHand?: number;
};

export default function InboundOrderFormBody({
  mode,
  values,
  specStr,
  weightStr,
  editable = true,
  onProductNameChange,
  onSpecChange,
  onWeightChange,
  onPackagingChange,
  onRecipientNameChange,
  onRecipientPhoneChange,
  onDestinationChange,
  onNoteChange,
  barcodeText,
  barcodeCaption,
  inboundDateLabel,
  inboundDateYmd,
  inboundDate,
  showDatePicker,
  onOpenDatePicker,
  onCloseDatePicker,
  onDateChange,
  maxInboundDate,
  qty,
  onQtyChange,
  onQtyDec,
  onQtyInc,
  qtyOnHand,
}: Props) {
  const canEdit = editable;
  const chainKeys = useMemo(
    () =>
      mode === 'stock-in'
        ? ['product', 'specL', 'specW', 'specH', 'weight', 'name', 'phone', 'qty', 'note']
        : ['product', 'specL', 'specW', 'specH', 'weight', 'name', 'phone', 'note'],
    [mode],
  );
  const fieldChain = useFormFieldChain(chainKeys);

  return (
    <>
      <InboundFormSection title="商品信息" accent="#059669">
        <InboundFormField
          label="商品名称 *"
          value={values.productName}
          onChange={onProductNameChange}
          placeholder="输入商品名称"
          editable={canEdit}
          inputRef={fieldChain.propsFor('product').inputRef}
          returnKeyType={fieldChain.propsFor('product').returnKeyType}
          onSubmitEditing={fieldChain.propsFor('product').onSubmitEditing}
          blurOnSubmit={fieldChain.propsFor('product').blurOnSubmit}
        />
        {canEdit ? (
          <PackagingPickerField value={values.packaging} onChange={onPackagingChange} />
        ) : (
          <InboundFormField label="商品包装" value={values.packaging} editable={false} />
        )}
        {canEdit ? (
          <DimensionSpecField
            l={values.specL}
            w={values.specW}
            h={values.specH}
            onChange={onSpecChange}
            lInput={fieldChain.propsFor('specL')}
            wInput={fieldChain.propsFor('specW')}
            hInput={fieldChain.propsFor('specH')}
          />
        ) : (
          <InboundFormField label="规格（cm）" value={specStr} editable={false} />
        )}
        <LockedSuffixField
          label="重量"
          value={values.weightN}
          suffix="Kg"
          onChange={onWeightChange}
          placeholder="重量"
          editable={canEdit}
          inputRef={fieldChain.propsFor('weight').inputRef}
          returnKeyType={fieldChain.propsFor('weight').returnKeyType}
          onSubmitEditing={fieldChain.propsFor('weight').onSubmitEditing}
          blurOnSubmit={fieldChain.propsFor('weight').blurOnSubmit}
        />
        {(specStr || weightStr) && canEdit ? (
          <View style={inboundFormStyles.preview}>
            <Text style={inboundFormStyles.previewTitle}>规格 / 重量预览</Text>
            {specStr ? <Text style={inboundFormStyles.previewLine}>{specStr}</Text> : null}
            {weightStr ? <Text style={inboundFormStyles.previewLine}>{weightStr}</Text> : null}
          </View>
        ) : null}
        <View style={inboundFormStyles.barcodeBox}>
          <Text style={inboundFormStyles.barcodeLabel}>
            {barcodeCaption ?? (mode === 'edit' ? '入库条码' : '入库条码（自动生成）')}
          </Text>
          <Text style={inboundFormStyles.barcodeValue}>{barcodeText}</Text>
        </View>
      </InboundFormSection>

      <InboundFormSection title="收发信息" accent="#0891b2">
        {inboundDateLabel && inboundDateYmd ? (
          <View style={inboundFormStyles.field}>
            <Text style={inboundFormStyles.label}>入库日期 *</Text>
            {mode === 'stock-in' && canEdit && onOpenDatePicker ? (
              <>
                <Pressable style={inboundFormStyles.dateBtn} onPress={onOpenDatePicker}>
                  <Text style={inboundFormStyles.dateBtnText}>{inboundDateLabel}</Text>
                  <Text style={inboundFormStyles.dateBtnHint}>{inboundDateYmd}</Text>
                </Pressable>
                {showDatePicker && inboundDate && onDateChange ? (
                  <DateTimePicker
                    value={inboundDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={maxInboundDate}
                  />
                ) : null}
                {Platform.OS === 'ios' && showDatePicker && onCloseDatePicker ? (
                  <Pressable style={styles.dateDoneBtn} onPress={onCloseDatePicker}>
                    <Text style={styles.dateDoneText}>确定日期</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <View style={inboundFormStyles.dateBtn}>
                <Text style={inboundFormStyles.dateBtnText}>{inboundDateLabel}</Text>
                <Text style={inboundFormStyles.dateBtnHint}>{inboundDateYmd}</Text>
              </View>
            )}
          </View>
        ) : null}
        <InboundFormField
          label="姓名 *"
          value={values.recipientName}
          onChange={onRecipientNameChange}
          placeholder="收件人 / 联系人姓名"
          editable={canEdit}
          inputRef={fieldChain.propsFor('name').inputRef}
          returnKeyType={fieldChain.propsFor('name').returnKeyType}
          onSubmitEditing={fieldChain.propsFor('name').onSubmitEditing}
          blurOnSubmit={fieldChain.propsFor('name').blurOnSubmit}
        />
        <InboundFormField
          label="电话号码"
          value={values.recipientPhone}
          onChange={onRecipientPhoneChange}
          placeholder="09xxxxxxxxx"
          keyboard="phone-pad"
          editable={canEdit}
          inputRef={fieldChain.propsFor('phone').inputRef}
          returnKeyType={fieldChain.propsFor('phone').returnKeyType}
          onSubmitEditing={fieldChain.propsFor('phone').onSubmitEditing}
          blurOnSubmit={fieldChain.propsFor('phone').blurOnSubmit}
        />
        {canEdit ? (
          <DestinationPickerField
            label="最终目的地"
            hint="订单最终送达地区，全程不变；入库条码前缀取所选地区码"
            value={values.destination}
            onChange={onDestinationChange}
          />
        ) : (
          <InboundFormField label="最终目的地" value={values.destination} editable={false} />
        )}
      </InboundFormSection>

      {mode === 'stock-in' && qty !== undefined && onQtyChange && onQtyDec && onQtyInc ? (
        <InboundFormSection title="入库数量" accent="#059669">
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyBtn} onPress={onQtyDec}>
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <TextInput
              ref={fieldChain.propsFor('qty').inputRef}
              style={styles.qtyInput}
              keyboardType="decimal-pad"
              value={qty}
              onChangeText={onQtyChange}
              editable={canEdit}
              returnKeyType={fieldChain.propsFor('qty').returnKeyType}
              onSubmitEditing={fieldChain.propsFor('qty').onSubmitEditing}
              blurOnSubmit={fieldChain.propsFor('qty').blurOnSubmit}
              submitBehavior="submit"
            />
            <Pressable style={styles.qtyBtn} onPress={onQtyInc}>
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
            <Text style={styles.qtyUnit}>{stockUnitLabel()}</Text>
          </View>
          <InboundFormField
            label="备注（可选）"
            value={values.note}
            onChange={onNoteChange}
            placeholder="采购单号、供应商、批次等"
            multiline
            editable={canEdit}
            inputRef={fieldChain.propsFor('note', { multiline: true }).inputRef}
            returnKeyType={fieldChain.propsFor('note', { multiline: true }).returnKeyType}
            onSubmitEditing={fieldChain.propsFor('note', { multiline: true }).onSubmitEditing}
            blurOnSubmit={fieldChain.propsFor('note', { multiline: true }).blurOnSubmit}
          />
        </InboundFormSection>
      ) : (
        <InboundFormSection title="其它" accent="#64748b">
          {qtyOnHand !== undefined ? (
            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>当前库存</Text>
              <Text style={styles.stockValue}>
                {qtyOnHand} {stockUnitLabel()}
              </Text>
            </View>
          ) : null}
          <InboundFormField
            label="备注（可选）"
            value={values.note}
            onChange={onNoteChange}
            placeholder="采购单号、供应商、批次等"
            multiline
            editable={canEdit}
            inputRef={fieldChain.propsFor('note', { multiline: true }).inputRef}
            returnKeyType={fieldChain.propsFor('note', { multiline: true }).returnKeyType}
            onSubmitEditing={fieldChain.propsFor('note', { multiline: true }).onSubmitEditing}
            blurOnSubmit={fieldChain.propsFor('note', { multiline: true }).blurOnSubmit}
          />
        </InboundFormSection>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dateDoneBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#0891b2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dateDoneText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  qtyBtnText: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  qtyInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    color: '#0f172a',
  },
  qtyUnit: { color: '#94a3b8', fontWeight: '800', fontSize: 14, minWidth: 36 },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stockLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  stockValue: { color: '#fbbf24', fontWeight: '900', fontSize: 18 },
});

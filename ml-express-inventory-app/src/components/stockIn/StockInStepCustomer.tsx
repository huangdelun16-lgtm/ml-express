import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { InboundFormField, InboundFormSection } from '../InboundFormPrimitives';
import PackagingPickerField from '../PackagingPickerField';
import type { FormFieldChainProps } from '../../hooks/useFormFieldChain';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme';
import ScanRefBanner from './ScanRefBanner';

/** 入库向导暂不展示；state / 草稿 / 提交仍保留 */
const SHOW_PACKAGING_FIELD = false;

export default function StockInStepCustomer({
  scan,
  customerCode,
  customerLookupHint,
  recipientName,
  recipientPhone,
  productName,
  packaging,
  chain,
  onCustomerCodeChange,
  onCustomerCodeSubmit,
  onRecipientNameChange,
  onRecipientPhoneChange,
  onProductNameChange,
  onPackagingChange,
}: {
  scan: string;
  customerCode: string;
  customerLookupHint: string;
  recipientName: string;
  recipientPhone: string;
  productName: string;
  packaging: string;
  chain: {
    code: FormFieldChainProps;
    name: FormFieldChainProps;
    phone: FormFieldChainProps;
    product: FormFieldChainProps;
  };
  onCustomerCodeChange: (v: string) => void;
  onCustomerCodeSubmit: () => void;
  onRecipientNameChange: (v: string) => void;
  onRecipientPhoneChange: (v: string) => void;
  onProductNameChange: (v: string) => void;
  onPackagingChange: (v: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <ScanRefBanner code={scan} hint={t.stockIn.scannedBarcode} />
      <InboundFormSection title={t.stockIn.customerSection} accent={colors.accentTeal}>
        <InboundFormField
          label={t.stockIn.customerCode}
          value={customerCode}
          onChange={onCustomerCodeChange}
          placeholder={t.stockIn.customerCodePlaceholder}
          autoCapitalize="characters"
          inputRef={chain.code.inputRef}
          returnKeyType={chain.code.returnKeyType}
          onSubmitEditing={(e) => {
            onCustomerCodeSubmit();
            chain.code.onSubmitEditing?.(e);
          }}
          blurOnSubmit={chain.code.blurOnSubmit}
        />
        {customerLookupHint ? (
          <Text style={styles.lookupHint}>{customerLookupHint}</Text>
        ) : (
          <Text style={styles.customerCodeHint}>{t.stockIn.customerCodeHint}</Text>
        )}
        <InboundFormField
          label={t.stockIn.nameRequired}
          value={recipientName}
          onChange={onRecipientNameChange}
          placeholder={t.stockIn.nameRequired.replace(' *', '')}
          inputRef={chain.name.inputRef}
          returnKeyType={chain.name.returnKeyType}
          onSubmitEditing={chain.name.onSubmitEditing}
          blurOnSubmit={chain.name.blurOnSubmit}
        />
        <InboundFormField
          label={t.stockIn.phone}
          value={recipientPhone}
          onChange={onRecipientPhoneChange}
          placeholder="09xxxxxxxxx"
          keyboard="phone-pad"
          inputRef={chain.phone.inputRef}
          returnKeyType={chain.phone.returnKeyType}
          onSubmitEditing={chain.phone.onSubmitEditing}
          blurOnSubmit={chain.phone.blurOnSubmit}
        />
        <InboundFormField
          label={t.stockIn.itemNameRequired}
          value={productName}
          onChange={onProductNameChange}
          placeholder={t.stockIn.itemNameRequired.replace(' *', '')}
          inputRef={chain.product.inputRef}
          returnKeyType={chain.product.returnKeyType}
          onSubmitEditing={chain.product.onSubmitEditing}
          blurOnSubmit={chain.product.blurOnSubmit}
        />
        {SHOW_PACKAGING_FIELD ? (
          <PackagingPickerField value={packaging} onChange={onPackagingChange} />
        ) : null}
      </InboundFormSection>
    </>
  );
}

const styles = StyleSheet.create({
  lookupHint: { color: colors.successText, fontSize: 13, marginTop: 8, fontWeight: '700' },
  customerCodeHint: {
    color: colors.muted2,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 18,
  },
});

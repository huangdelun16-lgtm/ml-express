import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CopyableCodeRow from './CopyableCodeRow';
import { SignaturePreview } from './SignaturePad';
import { stockUnitLabel } from '../utils/itemFieldFormat';
import { isPackagingStockInLineBarcode } from '../utils/inboundBarcode';
import { callPhoneNumber } from '../utils/phoneCall';
import type { CustomerSignReceipt } from '../types/customerSignReceipt';
import { pickupTypeLabel } from '../types/customerSignReceipt';

export type InboundInvoiceData = {
  barcode: string;
  inputBarcode?: string;
  productName: string;
  inboundDateLabel: string;
  recipientName: string;
  recipientPhone?: string;
  destination: string;
  detailAddress?: string;
  qty: number;
  packaging?: string;
  spec?: string;
  weight?: string;
  totalFee?: string;
  paymentLabel?: string;
  note?: string;
  storeName?: string;
  signReceipt?: CustomerSignReceipt;
  /** 多个入库包内序号，如 3-1 */
  packItemLabel?: string;
};

function formatSignTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InvoiceRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  if (!value.trim()) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]} numberOfLines={4}>
        {value}
      </Text>
    </View>
  );
}

export function InboundInvoiceContent({
  data,
  copyLabels,
  packItemSeqLabel,
}: {
  data: InboundInvoiceData;
  copyLabels?: { copied: string; tapToCopy: string; expressNo: string; inbound: string };
  /** 包内序号行标签，默认「包内序号」 */
  packItemSeqLabel?: string;
}) {
  return (
    <>
      <View style={styles.invoiceHeader}>
        <Text style={styles.invoiceBrand}>ML EXPRESS</Text>
        <Text style={styles.invoiceTitle}>订单详情 / INVOICE</Text>
        {data.storeName ? <Text style={styles.invoiceStore}>{data.storeName}</Text> : null}
        <Text style={styles.invoiceDate}>{data.inboundDateLabel}</Text>
        {data.packItemLabel && !isPackagingStockInLineBarcode(data.barcode) ? (
          <View style={styles.packSeqBadge}>
            <Text style={styles.packSeqLabel}>{packItemSeqLabel ?? '包内序号'}</Text>
            <Text style={styles.packSeqValue}>{data.packItemLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      <InvoiceRow label="客户姓名" value={data.recipientName} />
      {data.recipientPhone ? <InvoiceRow label="电话" value={data.recipientPhone} /> : null}
      <InvoiceRow label="商品名称" value={data.productName} />
      {data.packaging ? <InvoiceRow label="商品包装" value={data.packaging} /> : null}
      <InvoiceRow label="最终目的地" value={data.destination} />
      {data.detailAddress ? <InvoiceRow label="详细地址" value={data.detailAddress} /> : null}
      {data.spec ? <InvoiceRow label="规格" value={data.spec} /> : null}
      {data.weight ? <InvoiceRow label="重量" value={data.weight} /> : null}
      <InvoiceRow label="数量" value={`${data.qty} ${stockUnitLabel()}`} />
      {data.totalFee ? <InvoiceRow label="总费用" value={`${data.totalFee} MMK`} highlight /> : null}
      {data.paymentLabel ? <InvoiceRow label="付款方式" value={data.paymentLabel} /> : null}
      {data.note ? <InvoiceRow label="备注" value={data.note} /> : null}

      {data.signReceipt ? (
        <View style={styles.signReceiptSection}>
          <Text style={styles.signReceiptTitle}>签收留痕</Text>
          {data.signReceipt.pickupType === 'proxy' ? (
            <>
              <InvoiceRow label="代收电话" value={data.signReceipt.signPhone} highlight />
              <InvoiceRow
                label="代收人"
                value={data.signReceipt.proxyName?.trim() || '—'}
              />
            </>
          ) : (
            <InvoiceRow label="签收方式" value={pickupTypeLabel(data.signReceipt.pickupType)} />
          )}
          {data.signReceipt.signedByOperator ? (
            <InvoiceRow label="操作员" value={data.signReceipt.signedByOperator} />
          ) : null}
          {data.signReceipt.signedAt ? (
            <InvoiceRow
              label="签收时间"
              value={formatSignTime(data.signReceipt.signedAt)}
            />
          ) : null}
          {data.signReceipt.signatureStrokes.length > 0 ? (
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>收件人签名</Text>
              <SignaturePreview strokes={data.signReceipt.signatureStrokes} />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.barcodeBlock}>
        <Text style={styles.barcodeBlockTitle}>条码信息</Text>
        {copyLabels ? (
          <View style={styles.copyBlock}>
            <CopyableCodeRow
              label={copyLabels.expressNo}
              value={data.inputBarcode ?? ''}
              copiedLabel={copyLabels.copied}
              tapHint={copyLabels.tapToCopy}
              variant="light"
            />
            <CopyableCodeRow
              label={copyLabels.inbound}
              value={data.barcode}
              copiedLabel={copyLabels.copied}
              tapHint={copyLabels.tapToCopy}
              variant="light"
            />
          </View>
        ) : null}
      </View>
    </>
  );
}

export function InboundInvoiceFooter({
  recipientPhone,
  signing,
  canSignDelivered,
  onSignDelivered,
  onClose,
}: {
  recipientPhone?: string;
  signing?: boolean;
  canSignDelivered?: boolean;
  onSignDelivered?: () => void;
  onClose: () => void;
}) {
  const phone = recipientPhone?.trim() ?? '';
  const showSign = canSignDelivered && onSignDelivered;

  return (
    <View style={inboundInvoiceStyles.footer}>
      {phone ? (
        <Pressable
          style={inboundInvoiceStyles.btnCall}
          onPress={() => void callPhoneNumber(phone)}
        >
          <Text style={inboundInvoiceStyles.btnCallText}>📞 呼叫客户</Text>
        </Pressable>
      ) : null}
      {showSign ? (
        <Pressable
          style={[
            inboundInvoiceStyles.btnSign,
            signing && inboundInvoiceStyles.btnDisabled,
          ]}
          onPress={onSignDelivered}
          disabled={signing}
        >
          <Text style={inboundInvoiceStyles.btnSignText}>
            {signing ? '签收中…' : '✓ 已签收'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable style={inboundInvoiceStyles.btnClose} onPress={onClose}>
        <Text style={inboundInvoiceStyles.btnCloseText}>关闭</Text>
      </Pressable>
    </View>
  );
}

export const inboundInvoiceStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  sheet: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '92%',
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scroll: { padding: 20, paddingBottom: 16 },
  invoiceHeader: { alignItems: 'center', marginBottom: 12 },
  invoiceBrand: { color: '#059669', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  invoiceTitle: { color: '#334155', fontSize: 13, fontWeight: '700', marginTop: 4 },
  invoiceStore: { color: '#64748b', fontSize: 12, marginTop: 6 },
  invoiceDate: { color: '#0f172a', fontSize: 14, fontWeight: '800', marginTop: 8 },
  packSeqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  packSeqLabel: { color: '#047857', fontSize: 13, fontWeight: '800' },
  packSeqValue: { color: '#059669', fontSize: 20, fontWeight: '900', fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: '#cbd5e1', marginVertical: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  rowLabel: { color: '#64748b', fontSize: 13, fontWeight: '600', flex: 1 },
  rowValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    flex: 1.2,
    textAlign: 'right',
  },
  rowValueHighlight: { color: '#059669', fontSize: 16 },
  signReceiptSection: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 2,
  },
  signReceiptTitle: { color: '#047857', fontSize: 14, fontWeight: '900', marginBottom: 6 },
  signatureBlock: { marginTop: 10, gap: 8 },
  signatureLabel: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  barcodeBlock: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  barcodeBlockTitle: { color: '#64748b', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  copyBlock: { width: '100%', marginBottom: 8 },
  expressCode: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  inboundCode: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  footer: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footerBtnHalf: { flex: 1 },
  footerBtnFull: { flex: 1 },
  btnCall: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnCallText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnPrint: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnPrintText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnSign: {
    backgroundColor: '#047857',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnSignText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnClose: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnCloseText: { color: '#f8fafc', fontWeight: '800', fontSize: 16 },
});

const styles = inboundInvoiceStyles;

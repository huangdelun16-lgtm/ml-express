import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getItemDetail } from '../services/inventoryService';
import type { InventoryItemDetail } from '../types/inventory';
import { stockUnitLabel } from '../utils/itemFieldFormat';

type Props = {
  visible: boolean;
  itemId: string | null;
  onClose: () => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  if (!text) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {text}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function ItemViewModal({ visible, itemId, onClose }: Props) {
  const [detail, setDetail] = useState<InventoryItemDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !itemId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getItemDetail(itemId).then((d) => {
      if (!cancelled) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, itemId]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>关闭</Text>
          </Pressable>
          <Text style={styles.headerTitle}>查看订单</Text>
          <View style={{ width: 48 }} />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#60a5fa" />
          </View>
        ) : !detail ? (
          <View style={styles.loadingBox}>
            <Text style={styles.emptyText}>订单不存在或已删除</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.heroName}>{detail.name}</Text>
            <Text style={styles.heroMeta}>
              库存 {detail.qty_on_hand} {stockUnitLabel()}
            </Text>

            <Section title="收发信息">
              <DetailRow label="客户姓名" value={detail.customer_name} />
              <DetailRow label="联系电话" value={detail.recipient_phone} />
              <DetailRow label="目的地" value={detail.destination} />
              <DetailRow label="商品包装" value={detail.packaging} />
            </Section>

            <Section title="商品信息">
              <DetailRow label="商品名称" value={detail.name} />
              <DetailRow label="规格" value={detail.spec} />
              <DetailRow label="单位" value={detail.unit} />
              <DetailRow label="重量" value={detail.weight} />
            </Section>

            <Section title="条码信息">
              <DetailRow label="快递单" value={detail.input_barcode} />
              <DetailRow label="入库条码" value={detail.barcode} />
            </Section>

            {detail.note ? (
              <Section title="备注">
                <Text style={styles.noteText} selectable>
                  {detail.note}
                </Text>
              </Section>
            ) : null}

            {detail.pack ? (
              <>
                <Section title="包裹信息">
                  <DetailRow label="包装号" value={detail.pack.bundle_barcode} />
                  <DetailRow label="包裹名称" value={detail.pack.bundle_name} />
                  <DetailRow label="规格" value={detail.pack.spec} />
                  <DetailRow label="单位" value={detail.pack.unit} />
                  <DetailRow label="重量" value={detail.pack.weight} />
                  <DetailRow label="打包人" value={detail.pack.operator} />
                  <DetailRow label="打包时间" value={formatTime(detail.pack.created_at)} />
                </Section>

                <Section title={`内含商品（${detail.pack.items.length} 件）`}>
                  {detail.pack.items.map((line) => (
                    <View key={line.id} style={styles.packLine}>
                      <Text style={styles.packLineName}>{line.item_name}</Text>
                      <Text style={styles.packLineCode} selectable>
                        入库 {line.item_barcode}
                      </Text>
                      <Text style={styles.packLineQty}>× {line.qty}</Text>
                    </View>
                  ))}
                </Section>

                {detail.pack.note ? (
                  <Section title="打包备注">
                    <Text style={styles.noteText} selectable>
                      {detail.pack.note}
                    </Text>
                  </Section>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  close: { color: '#60a5fa', fontWeight: '700', fontSize: 16, width: 48 },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  content: { padding: 16, paddingBottom: 32 },
  heroName: { color: '#f8fafc', fontSize: 22, fontWeight: '900' },
  heroMeta: { color: '#fbbf24', fontSize: 14, fontWeight: '800', marginTop: 6, marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionBody: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  row: { gap: 2 },
  rowLabel: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  rowValue: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  noteText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  packLine: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  packLineName: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  packLineCode: { color: '#fde68a', fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
  packLineQty: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
});

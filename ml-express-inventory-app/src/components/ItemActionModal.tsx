import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { InventoryItem } from '../types/inventory';

type Props = {
  visible: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
};

export default function ItemActionModal({ visible, item, onClose, onView, onEdit }: Props) {
  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.customer_name || '未登记客户'}
            {item.destination ? ` · ${item.destination}` : ''}
          </Text>

          <Pressable style={styles.btnView} onPress={onView}>
            <Text style={styles.btnViewText}>查看</Text>
          </Pressable>
          <Pressable style={styles.btnEdit} onPress={onEdit}>
            <Text style={styles.btnEditText}>编辑</Text>
          </Pressable>
          <Pressable style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.btnCancelText}>关闭</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 4, marginBottom: 16 },
  btnView: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnViewText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnEdit: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 10,
  },
  btnEditText: { color: '#e2e8f0', fontWeight: '800', fontSize: 16 },
  btnCancel: { paddingVertical: 10, alignItems: 'center' },
  btnCancelText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MyOrdersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>我的订单</Text>
      <Text style={styles.subtitle}>开发中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7fafc' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 },
});


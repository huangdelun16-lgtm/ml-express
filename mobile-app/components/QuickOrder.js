import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { orderService } from '../services/api';

export default function QuickOrder({ userData, onOrderCreated }) {
  const [orderData, setOrderData] = useState({
    senderName: userData?.name || '',
    senderPhone: userData?.phone || '',
    senderAddress: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    itemDescription: '',
    weight: '',
    specialInstructions: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculatePrice = () => {
    const weight = parseFloat(orderData.weight) || 0;
    const basePrice = 10; // 起步价
    const weightPrice = weight > 1 ? (weight - 1) * 3 : 0;
    return basePrice + weightPrice;
  };

  const validateForm = () => {
    const required = [
      'senderName', 'senderPhone', 'senderAddress',
      'receiverName', 'receiverPhone', 'receiverAddress',
      'itemDescription', 'weight'
    ];

    for (const field of required) {
      if (!orderData[field].trim()) {
        Alert.alert('表单验证', '请填写所有必填字段');
        return false;
      }
    }

    if (!/^1[3-9]\d{9}$/.test(orderData.senderPhone) || 
        !/^1[3-9]\d{9}$/.test(orderData.receiverPhone)) {
      Alert.alert('表单验证', '请输入正确的手机号码');
      return false;
    }

    if (parseFloat(orderData.weight) <= 0) {
      Alert.alert('表单验证', '重量必须大于0');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const orderPayload = {
        ...orderData,
        customerId: userData?.id,
        businessType: 'city',
        totalAmount: calculatePrice(),
        status: '待预付',
        paymentMethod: 'prepaid',
        createdAt: new Date().toISOString(),
        trackingNumber: `C${Date.now()}${Math.floor(Math.random() * 1000)}`,
        weight: parseFloat(orderData.weight),
      };

      console.log('提交订单:', orderPayload);

      const response = await orderService.createOrder(orderPayload);

      if (response.success) {
        Alert.alert(
          '下单成功！',
          `订单已创建\n运单号: ${orderPayload.trackingNumber}\n金额: ¥${calculatePrice()}`,
          [
            {
              text: '确定',
              onPress: () => {
                // 重置表单
                setOrderData({
                  senderName: userData?.name || '',
                  senderPhone: userData?.phone || '',
                  senderAddress: '',
                  receiverName: '',
                  receiverPhone: '',
                  receiverAddress: '',
                  itemDescription: '',
                  weight: '',
                  specialInstructions: '',
                });
                
                // 通知父组件订单已创建
                if (onOrderCreated) {
                  onOrderCreated(response.data);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('下单失败', response.message || '请稍后重试');
      }
    } catch (error) {
      console.error('下单失败:', error);
      Alert.alert('下单失败', '网络连接失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📦 快速下单</Text>
        <Text style={styles.subtitle}>填写寄件信息，快速创建订单</Text>
      </View>

      {/* 寄件人信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📤 寄件人信息</Text>
        
        <TextInput
          style={styles.input}
          placeholder="寄件人姓名 *"
          value={orderData.senderName}
          onChangeText={(value) => updateField('senderName', value)}
          editable={!isSubmitting}
        />
        
        <TextInput
          style={styles.input}
          placeholder="寄件人电话 *"
          value={orderData.senderPhone}
          onChangeText={(value) => updateField('senderPhone', value)}
          keyboardType="phone-pad"
          editable={!isSubmitting}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="寄件地址 *"
          value={orderData.senderAddress}
          onChangeText={(value) => updateField('senderAddress', value)}
          multiline={true}
          numberOfLines={3}
          editable={!isSubmitting}
        />
      </View>

      {/* 收件人信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📥 收件人信息</Text>
        
        <TextInput
          style={styles.input}
          placeholder="收件人姓名 *"
          value={orderData.receiverName}
          onChangeText={(value) => updateField('receiverName', value)}
          editable={!isSubmitting}
        />
        
        <TextInput
          style={styles.input}
          placeholder="收件人电话 *"
          value={orderData.receiverPhone}
          onChangeText={(value) => updateField('receiverPhone', value)}
          keyboardType="phone-pad"
          editable={!isSubmitting}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="收件地址 *"
          value={orderData.receiverAddress}
          onChangeText={(value) => updateField('receiverAddress', value)}
          multiline={true}
          numberOfLines={3}
          editable={!isSubmitting}
        />
      </View>

      {/* 物品信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 物品信息</Text>
        
        <TextInput
          style={styles.input}
          placeholder="物品描述 *"
          value={orderData.itemDescription}
          onChangeText={(value) => updateField('itemDescription', value)}
          editable={!isSubmitting}
        />
        
        <TextInput
          style={styles.input}
          placeholder="重量 (kg) *"
          value={orderData.weight}
          onChangeText={(value) => updateField('weight', value)}
          keyboardType="numeric"
          editable={!isSubmitting}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="特殊说明（可选）"
          value={orderData.specialInstructions}
          onChangeText={(value) => updateField('specialInstructions', value)}
          multiline={true}
          numberOfLines={2}
          editable={!isSubmitting}
        />
      </View>

      {/* 费用计算 */}
      <View style={styles.priceSection}>
        <Text style={styles.priceTitle}>💰 费用计算</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>起步价:</Text>
          <Text style={styles.priceValue}>¥10.00</Text>
        </View>
        {parseFloat(orderData.weight) > 1 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              重量费 ({(parseFloat(orderData.weight) - 1).toFixed(1)}kg × ¥3):
            </Text>
            <Text style={styles.priceValue}>
              ¥{((parseFloat(orderData.weight) - 1) * 3).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>总计:</Text>
          <Text style={styles.totalValue}>¥{calculatePrice().toFixed(2)}</Text>
        </View>
      </View>

      {/* 提交按钮 */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitButtonText}>提交订单</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priceSection: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  priceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  submitButton: {
    backgroundColor: '#1976d2',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpace: {
    height: 20,
  },
});

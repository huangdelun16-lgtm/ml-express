import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  RadioButton,
  Divider,
  Switch,
} from 'react-native-paper';
import { orderService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/theme';

export default function CustomerOrderScreen() {
  const { user } = useAuth();
  const [orderData, setOrderData] = useState({
    senderName: user?.name || '',
    senderPhone: user?.phone || '',
    senderAddress: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    itemDescription: '',
    weight: '',
    value: '',
    isFragile: false,
    urgentDelivery: false,
    paymentMethod: 'prepaid', // 预付费
    specialInstructions: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const required = [
      'senderName', 'senderPhone', 'senderAddress',
      'receiverName', 'receiverPhone', 'receiverAddress',
      'itemDescription', 'weight'
    ];

    for (const field of required) {
      if (!orderData[field as keyof typeof orderData]) {
        Alert.alert('错误', '请填写所有必填字段');
        return false;
      }
    }

    if (!/^1[3-9]\d{9}$/.test(orderData.senderPhone) || 
        !/^1[3-9]\d{9}$/.test(orderData.receiverPhone)) {
      Alert.alert('错误', '请输入正确的手机号码');
      return false;
    }

    return true;
  };

  const calculatePrice = () => {
    const weight = parseFloat(orderData.weight) || 0;
    const basePrice = 10; // 起步价10元
    const weightPrice = weight > 1 ? (weight - 1) * 3 : 0; // 超过1kg每kg加3元
    const urgentFee = orderData.urgentDelivery ? 5 : 0; // 加急费5元
    const fragileFee = orderData.isFragile ? 3 : 0; // 易碎品加3元
    
    return basePrice + weightPrice + urgentFee + fragileFee;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const orderPayload = {
        ...orderData,
        customerId: user?.id,
        businessType: 'city',
        totalAmount: calculatePrice(),
        status: '待预付',
        createdAt: new Date().toISOString(),
        trackingNumber: `C${Date.now()}${Math.floor(Math.random() * 1000)}`,
      };

      const response = await orderService.createOrder(orderPayload);
      
      if (response.success) {
        Alert.alert(
          '下单成功',
          `订单已创建！\n运单号: ${orderPayload.trackingNumber}\n总金额: ¥${calculatePrice()}`,
          [
            {
              text: '确定',
              onPress: () => {
                // 重置表单
                setOrderData({
                  senderName: user?.name || '',
                  senderPhone: user?.phone || '',
                  senderAddress: '',
                  receiverName: '',
                  receiverPhone: '',
                  receiverAddress: '',
                  itemDescription: '',
                  weight: '',
                  value: '',
                  isFragile: false,
                  urgentDelivery: false,
                  paymentMethod: 'prepaid',
                  specialInstructions: '',
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('下单失败', response.message || '请稍后重试');
      }
    } catch (error) {
      console.error('下单失败:', error);
      Alert.alert('下单失败', '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>寄件人信息</Title>
          
          <TextInput
            label="寄件人姓名 *"
            value={orderData.senderName}
            onChangeText={(value) => handleInputChange('senderName', value)}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="寄件人电话 *"
            value={orderData.senderPhone}
            onChangeText={(value) => handleInputChange('senderPhone', value)}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
          />
          
          <TextInput
            label="寄件地址 *"
            value={orderData.senderAddress}
            onChangeText={(value) => handleInputChange('senderAddress', value)}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={2}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>收件人信息</Title>
          
          <TextInput
            label="收件人姓名 *"
            value={orderData.receiverName}
            onChangeText={(value) => handleInputChange('receiverName', value)}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="收件人电话 *"
            value={orderData.receiverPhone}
            onChangeText={(value) => handleInputChange('receiverPhone', value)}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
          />
          
          <TextInput
            label="收件地址 *"
            value={orderData.receiverAddress}
            onChangeText={(value) => handleInputChange('receiverAddress', value)}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={2}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>物品信息</Title>
          
          <TextInput
            label="物品描述 *"
            value={orderData.itemDescription}
            onChangeText={(value) => handleInputChange('itemDescription', value)}
            style={styles.input}
            mode="outlined"
            placeholder="请描述您要寄送的物品"
          />
          
          <TextInput
            label="重量 (kg) *"
            value={orderData.weight}
            onChangeText={(value) => handleInputChange('weight', value)}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
          />
          
          <TextInput
            label="物品价值 (元)"
            value={orderData.value}
            onChangeText={(value) => handleInputChange('value', value)}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            placeholder="用于保险计算"
          />

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>易碎品 (+¥3)</Text>
            <Switch
              value={orderData.isFragile}
              onValueChange={(value) => handleInputChange('isFragile', value)}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>加急配送 (+¥5)</Text>
            <Switch
              value={orderData.urgentDelivery}
              onValueChange={(value) => handleInputChange('urgentDelivery', value)}
            />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>配送选项</Title>
          
          <Text style={styles.radioTitle}>付款方式</Text>
          <RadioButton.Group
            onValueChange={(value) => handleInputChange('paymentMethod', value)}
            value={orderData.paymentMethod}
          >
            <View style={styles.radioItem}>
              <RadioButton value="prepaid" />
              <Text style={styles.radioLabel}>寄付 (预付费)</Text>
            </View>
            <View style={styles.radioItem}>
              <RadioButton value="collect" />
              <Text style={styles.radioLabel}>到付</Text>
            </View>
          </RadioButton.Group>

          <TextInput
            label="特殊说明"
            value={orderData.specialInstructions}
            onChangeText={(value) => handleInputChange('specialInstructions', value)}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="如有特殊要求请在此说明"
          />
        </Card.Content>
      </Card>

      <Card style={[styles.card, styles.priceCard]}>
        <Card.Content>
          <Title style={styles.priceTitle}>费用明细</Title>
          <View style={styles.priceRow}>
            <Text>起步价:</Text>
            <Text>¥10.00</Text>
          </View>
          {parseFloat(orderData.weight) > 1 && (
            <View style={styles.priceRow}>
              <Text>重量费 ({(parseFloat(orderData.weight) - 1).toFixed(1)}kg × ¥3):</Text>
              <Text>¥{((parseFloat(orderData.weight) - 1) * 3).toFixed(2)}</Text>
            </View>
          )}
          {orderData.urgentDelivery && (
            <View style={styles.priceRow}>
              <Text>加急费:</Text>
              <Text>¥5.00</Text>
            </View>
          )}
          {orderData.isFragile && (
            <View style={styles.priceRow}>
              <Text>易碎品费:</Text>
              <Text>¥3.00</Text>
            </View>
          )}
          <Divider style={styles.divider} />
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalText}>总计:</Text>
            <Text style={styles.totalAmount}>¥{calculatePrice().toFixed(2)}</Text>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSubmitOrder}
        style={styles.submitButton}
        loading={loading}
        disabled={loading}
        contentStyle={styles.submitButtonContent}
      >
        提交订单
      </Button>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.primary,
  },
  input: {
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  priceCard: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success,
    borderWidth: 1,
  },
  priceTitle: {
    color: colors.success,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    marginTop: 8,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  divider: {
    marginVertical: 8,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  bottomSpace: {
    height: 20,
  },
});

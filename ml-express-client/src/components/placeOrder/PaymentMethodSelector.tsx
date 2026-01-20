import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FadeInView } from '../Animations';
import { MoneyIcon } from '../Icon';

interface PaymentMethodSelectorProps {
  language: 'zh' | 'en' | 'my';
  styles: any;
  currentT: any;
  paymentMethod: 'balance' | 'cash';
  onPaymentMethodChange: (method: 'balance' | 'cash') => void;
  accountBalance: number;
}

const PaymentMethodSelector = memo<PaymentMethodSelectorProps>(({
  language,
  styles,
  currentT,
  paymentMethod,
  onPaymentMethodChange,
  accountBalance,
}) => {
  return (
    <FadeInView delay={300}>
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons name="card-outline" size={18} color="#1e293b" />
          <Text style={styles.sectionTitle}> {currentT.paymentMethod}</Text>
        </View>

        <View style={styles.paymentMethodContainer}>
          {/* 余额支付 */}
          <TouchableOpacity
            style={[
              styles.paymentMethodOption,
              paymentMethod === 'balance' && styles.paymentMethodOptionActive
            ]}
            onPress={() => onPaymentMethodChange('balance')}
            activeOpacity={0.7}
          >
            <View style={styles.paymentMethodRadio}>
              {paymentMethod === 'balance' && <View style={styles.paymentMethodRadioInner} />}
            </View>
            <View style={styles.paymentMethodContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <View>
                  <Text style={[
                    styles.paymentMethodLabel,
                    paymentMethod === 'balance' && styles.paymentMethodLabelActive
                  ]}>{currentT.balancePayment}</Text>
                  <Text style={styles.paymentMethodDesc}>
                    {currentT.accountBalance}: {accountBalance.toLocaleString()} MMK
                  </Text>
                </View>
                <Ionicons 
                  name="wallet-outline" 
                  size={24} 
                  color={paymentMethod === 'balance' ? '#3b82f6' : '#94a3b8'} 
                />
              </View>
            </View>
          </TouchableOpacity>

          {/* 现金支付 */}
          <TouchableOpacity
            style={[
              styles.paymentMethodOption,
              paymentMethod === 'cash' && styles.paymentMethodOptionActive
            ]}
            onPress={() => onPaymentMethodChange('cash')}
            activeOpacity={0.7}
          >
            <View style={styles.paymentMethodRadio}>
              {paymentMethod === 'cash' && <View style={styles.paymentMethodRadioInner} />}
            </View>
            <View style={styles.paymentMethodContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <View>
                  <Text style={[
                    styles.paymentMethodLabel,
                    paymentMethod === 'cash' && styles.paymentMethodLabelActive
                  ]}>{currentT.cashPayment}</Text>
                  <Text style={styles.paymentMethodDesc}>{currentT.useCash}</Text>
                </View>
                <Ionicons 
                  name="cash-outline" 
                  size={24} 
                  color={paymentMethod === 'cash' ? '#3b82f6' : '#94a3b8'} 
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </FadeInView>
  );
});

PaymentMethodSelector.displayName = 'PaymentMethodSelector';

export default PaymentMethodSelector;

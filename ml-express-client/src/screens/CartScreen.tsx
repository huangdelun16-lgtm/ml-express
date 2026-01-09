import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCart, CartItem } from '../contexts/CartContext';
import { useApp } from '../contexts/AppContext';
import { theme } from '../config/theme';
import BackToHomeButton from '../components/BackToHomeButton';

const { width } = Dimensions.get('window');

export default function CartScreen({ navigation }: any) {
  const { language } = useApp();
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();

  const t = {
    zh: {
      title: '购物车',
      empty: '您的购物车是空的',
      emptyDesc: '快去商场看看心仪的商品吧',
      total: '合计',
      checkout: '去结算',
      clear: '清空',
      clearConfirm: '确定要清空购物车吗？',
      delete: '删除',
      itemTotal: '共 {count} 件商品',
    },
    en: {
      title: 'Shopping Cart',
      empty: 'Your cart is empty',
      emptyDesc: 'Go to the mall to find some items',
      total: 'Total',
      checkout: 'Checkout',
      clear: 'Clear',
      clearConfirm: 'Are you sure to clear the cart?',
      delete: 'Delete',
      itemTotal: '{count} items in total',
    },
    my: {
      title: 'ဈေးဝယ်လှည်း',
      empty: 'ဈေးဝယ်လှည်းထဲတွင် ဘာမှမရှိသေးပါ',
      emptyDesc: 'ဈေးဝယ်စင်တာတွင် ပစ္စည်းများ သွားရောက်ကြည့်ရှုပါ',
      total: 'စုစုပေါင်း',
      checkout: 'အော်ဒါတင်မည်',
      clear: 'အားလုံးဖျက်မည်',
      clearConfirm: 'ဈေးဝယ်လှည်းကို အားလုံးဖျက်ရန် သေချာပါသလား?',
      delete: 'ဖျက်မည်',
      itemTotal: 'စုစုပေါင်း ပစ္စည်း {count} ခု',
    },
  }[language] || {
    title: 'Shopping Cart',
    empty: 'Your cart is empty',
    emptyDesc: 'Go to the mall to find some items',
    total: 'Total',
    checkout: 'Checkout',
    clear: 'Clear',
    clearConfirm: 'Are you sure to clear the cart?',
    delete: 'Delete',
    itemTotal: '{count} items in total',
  };

  const handleClearCart = () => {
    Alert.alert(
      t.clear,
      t.clearConfirm,
      [
        { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        { text: t.clear, style: 'destructive', onPress: clearCart }
      ]
    );
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    
    // 按店铺分组结算？目前先支持单一结算或全部结算
    // 为了简单起见，我们将所有商品传给 PlaceOrder
    navigation.navigate('PlaceOrder', {
      selectedProducts: cartItems
    });
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.itemImage} />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Ionicons name="image-outline" size={32} color="#cbd5e1" />
          </View>
        )}
      </View>
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemPrice}>{item.price.toLocaleString()} MMK</Text>
        
        <View style={styles.quantityRow}>
          <View style={styles.quantityControls}>
            <TouchableOpacity 
              style={styles.quantityBtn}
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Ionicons name="remove" size={18} color="#3b82f6" />
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            <TouchableOpacity 
              style={styles.quantityBtn}
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Ionicons name="add" size={18} color="#3b82f6" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.deleteBtn}
            onPress={() => removeFromCart(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e3a8a', '#2563eb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <BackToHomeButton navigation={navigation} color="white" />
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>{t.title}</Text>
            {cartItems.length > 0 && (
              <TouchableOpacity onPress={handleClearCart}>
                <Text style={styles.clearText}>{t.clear}</Text>
              </TouchableOpacity>
            )}
          </View>
          {cartItems.length > 0 && (
            <Text style={styles.itemCountText}>
              {t.itemTotal.replace('{count}', cartCount.toString())}
            </Text>
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cart-outline" size={64} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyText}>{t.empty}</Text>
            <Text style={styles.emptyDesc}>{t.emptyDesc}</Text>
            <TouchableOpacity 
              style={styles.goShoppingBtn}
              onPress={() => navigation.navigate('CityMall')}
            >
              <Text style={styles.goShoppingBtnText}>{language === 'zh' ? '去逛逛' : 'Go Shopping'}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {cartItems.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalInfo}>
            <Text style={styles.totalLabel}>{t.total}</Text>
            <Text style={styles.totalAmount}>{cartTotal.toLocaleString()} <Text style={styles.currency}>MMK</Text></Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.checkoutGradient}
            >
              <Text style={styles.checkoutText}>{t.checkout}</Text>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    marginTop: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  clearText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  itemCountText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  cartItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    ...theme.shadows.small,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    color: '#10b981',
    fontWeight: '700',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 4,
    gap: 12,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  quantityValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    minWidth: 20,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 32,
  },
  goShoppingBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    ...theme.shadows.small,
  },
  goShoppingBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    ...theme.shadows.large,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  currency: {
    fontSize: 12,
    color: '#10b981',
  },
  checkoutBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkoutGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart, CartItem, getCartItemLineKey } from '../contexts/CartContext';
import { useApp } from '../contexts/AppContext';
import { deliveryStoreService } from '../services/supabase';
import { remoteImageUri } from '../services/clientApi/nativeSupabaseUrl';

const TEAL = '#2C98A6';
const PAGE_BG = '#F3F5F7';
const NAVY = '#0f172a';

export default function CartScreen({ navigation }: any) {
  const { language } = useApp();
  const insets = useSafeAreaInsets();
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();
  const [storeName, setStoreName] = useState('');

  const t = {
    zh: {
      title: '购物车',
      empty: '购物车是空的',
      emptyDesc: '去商场挑几件喜欢的商品吧',
      total: '合计',
      checkout: '去结算',
      clear: '清空',
      clearConfirm: '确定要清空购物车吗？',
      itemTotal: '共 {count} 件',
      goShopping: '去逛逛',
      store: '店铺',
      variant: '规格：',
      cancel: '取消',
    },
    en: {
      title: 'Cart',
      empty: 'Your cart is empty',
      emptyDesc: 'Browse the mall and add something you like',
      total: 'Total',
      checkout: 'Checkout',
      clear: 'Clear',
      clearConfirm: 'Clear the cart?',
      itemTotal: '{count} items',
      goShopping: 'Go shopping',
      store: 'Store',
      variant: 'Variant: ',
      cancel: 'Cancel',
    },
    my: {
      title: 'ဈေးဝယ်လှည်း',
      empty: 'လှည်းထဲတွင် ပစ္စည်းမရှိသေးပါ',
      emptyDesc: 'ဈေးဝယ်စင်တာတွင် ပစ္စည်းများ ရွေးချယ်ပါ',
      total: 'စုစုပေါင်း',
      checkout: 'ငွေရှင်းရန်',
      clear: 'ရှင်းမည်',
      clearConfirm: 'လှည်းကို ရှင်းရန် သေချာပါသလား?',
      itemTotal: '{count} ခု',
      goShopping: 'သွားကြည့်မည်',
      store: 'ဆိုင်',
      variant: 'အမျိုးအစား: ',
      cancel: 'မလုပ်တော့',
    },
  }[language] || {
    title: 'Cart',
    empty: 'Your cart is empty',
    emptyDesc: 'Browse the mall and add something you like',
    total: 'Total',
    checkout: 'Checkout',
    clear: 'Clear',
    clearConfirm: 'Clear the cart?',
    itemTotal: '{count} items',
    goShopping: 'Go shopping',
    store: 'Store',
    variant: 'Variant: ',
    cancel: 'Cancel',
  };

  const storeId = cartItems[0]?.store_id;
  const displayStoreName = storeName || t.store;

  useEffect(() => {
    if (!storeId) {
      setStoreName('');
      return;
    }
    let cancelled = false;
    deliveryStoreService.getStoreById(storeId).then((store) => {
      if (!cancelled) setStoreName(store?.store_name || '');
    });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const handleClearCart = () => {
    Alert.alert(t.clear, t.clearConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.clear, style: 'destructive', onPress: clearCart },
    ]);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    navigation.navigate('PlaceOrder', {
      selectedProducts: cartItems,
    });
  };

  const goToStore = () => {
    if (!storeId) return;
    navigation.navigate('MerchantProducts', {
      storeId,
      storeName: displayStoreName,
    });
  };

  const goToProductDetail = (item: CartItem) => {
    navigation.navigate('MerchantProducts', {
      storeId: item.store_id,
      storeName: displayStoreName,
      openProductDetailId: item.id,
      openProductDetailVariantId: item.variant_id,
    });
  };

  const renderStoreHeader = () => {
    if (cartItems.length === 0) return null;
    return (
      <TouchableOpacity style={styles.storeHeader} onPress={goToStore} activeOpacity={0.85}>
        <View style={styles.storeIconWrap}>
          <Ionicons name="storefront" size={16} color="#fff" />
        </View>
        <Text style={styles.storeHeaderName} numberOfLines={1}>
          {displayStoreName}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
      </TouchableOpacity>
    );
  };

  const renderCartItem = ({ item, index }: { item: CartItem; index: number }) => {
    const lineKey = getCartItemLineKey(item);
    const imageUri = remoteImageUri(item.image_url);
    return (
      <View style={[styles.itemRow, index > 0 && styles.itemRowDivider, index === cartItems.length - 1 && styles.itemRowLast]}>
        <TouchableOpacity
          style={styles.itemTap}
          activeOpacity={0.8}
          onPress={() => goToProductDetail(item)}
        >
          <View style={styles.itemImageWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.itemImage} />
            ) : (
              <View style={styles.itemImagePlaceholder}>
                <Ionicons name="image-outline" size={26} color="#cbd5e1" />
              </View>
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.variant_name ? (
              <View style={styles.variantChip}>
                <Text style={styles.variantChipText} numberOfLines={1}>
                  {t.variant}
                  {item.variant_name}
                </Text>
              </View>
            ) : null}
            {item.customer_remark ? (
              <Text style={styles.itemRemark} numberOfLines={2}>
                {item.customer_remark}
              </Text>
            ) : null}
            <Text style={styles.itemPrice}>{item.price.toLocaleString()} MMK</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.itemSide}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => removeFromCart(lineKey)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperMinus}
              onPress={() => updateQuantity(lineKey, item.quantity - 1)}
            >
              <Ionicons name="remove" size={16} color={TEAL} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.stepperPlus}
              onPress={() => updateQuantity(lineKey, item.quantity + 1)}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>{t.title}</Text>
          {cartItems.length > 0 ? (
            <TouchableOpacity onPress={handleClearCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearText}>{t.clear}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {cartItems.length > 0 ? (
          <Text style={styles.itemCountText}>
            {t.itemTotal.replace('{count}', String(cartCount))}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={(item) => getCartItemLineKey(item)}
        renderItem={renderCartItem}
        ListHeaderComponent={renderStoreHeader}
        contentContainerStyle={[
          styles.listContent,
          cartItems.length === 0 && styles.listEmpty,
          { paddingBottom: cartItems.length > 0 ? 108 : 24 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cart-outline" size={56} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyText}>{t.empty}</Text>
            <Text style={styles.emptyDesc}>{t.emptyDesc}</Text>
            <TouchableOpacity
              style={styles.goShoppingBtn}
              onPress={() => navigation.navigate('Main', { screen: 'CityMall' })}
            >
              <Text style={styles.goShoppingBtnText}>{t.goShopping}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {cartItems.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.totalInfo}>
            <Text style={styles.totalLabel}>{t.total}</Text>
            <Text style={styles.totalAmount}>
              {cartTotal.toLocaleString()}
              <Text style={styles.currency}> MMK</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} activeOpacity={0.88}>
            <Text style={styles.checkoutText}>{t.checkout}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: PAGE_BG,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: -0.4,
  },
  clearText: {
    color: TEAL,
    fontSize: 14,
    fontWeight: '700',
  },
  itemCountText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  listEmpty: {
    flexGrow: 1,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f6',
    gap: 8,
  },
  storeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeHeaderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  itemRowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  itemRowLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  itemTap: {
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  itemImageWrap: {
    width: 72,
    height: 72,
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
    marginLeft: 12,
    minWidth: 0,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 20,
  },
  variantChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  variantChipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  itemRemark: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 16,
  },
  itemPrice: {
    marginTop: 8,
    fontSize: 16,
    color: TEAL,
    fontWeight: '800',
  },
  itemSide: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  deleteBtn: {
    padding: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperMinus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: TEAL,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPlus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#e8f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 28,
    textAlign: 'center',
  },
  goShoppingBtn: {
    backgroundColor: TEAL,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 22,
  },
  goShoppingBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eef2f6',
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
  },
  currency: {
    fontSize: 12,
    color: TEAL,
    fontWeight: '800',
  },
  checkoutBtn: {
    minWidth: 128,
    height: 48,
    borderRadius: 24,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

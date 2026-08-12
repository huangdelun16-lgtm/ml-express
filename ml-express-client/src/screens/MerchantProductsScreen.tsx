import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import { useCart, CartItem, getCartItemLineKey } from '../contexts/CartContext';
import { merchantService, Product } from '../services/supabase';
import { theme } from '../config/theme';
import Toast from '../components/Toast';
import ProductVariantChipList from '../components/ProductVariantChipList';
import MyanmarAwareText from '../components/MyanmarAwareText';
import { adjustStyleForMyanmarText } from '../utils/myanmarText';
import {
  buildProductForCart,
  cartLineKey,
  formatProductPriceLabel,
  getAvailableVariants,
  getProductDisplayOriginalPrice,
  maxSelectableStockForProduct,
  productHasVariants,
} from '../utils/productVariants';

const { width, height: WINDOW_HEIGHT } = Dimensions.get('window');
/** 商品详情弹窗固定高度，否则内层 flex:1 在 RN 中会塌陷，只显示图片不显示备注区 */
const DETAIL_MODAL_HEIGHT = Math.min(WINDOW_HEIGHT * 0.88, 720);
const DETAIL_HERO_HEIGHT = 248;

const PIECE_REMARK_LABELS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function pieceRemarkPrefix(index: number): string {
  return PIECE_REMARK_LABELS[index] ?? `${index + 1}.`;
}

function padLineRemarks(arr: string[], length: number): string[] {
  const next = arr.slice(0, length);
  while (next.length < length) next.push('');
  return next;
}

export default function MerchantProductsScreen({ route, navigation }: any) {
  const {
    storeId,
    storeName,
    highlightProductId,
    autoAddProductId,
    openProductDetailId,
    openProductDetailVariantId,
  } = route.params || {};
  const { language } = useApp();
  const { addToCart, removeFromCart, cartCount, cartItems, updateCartItemDetails } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 产品详情模态框
  const [showDetailModal, setShowEditDetailModal] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);

  const [detailOpenedFromCart, setDetailOpenedFromCart] = useState(false);

  // Toast状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const detailScrollRef = useRef<ScrollView>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hasDetailIntroImages = (product: Product | null) =>
    (product?.detail_image_urls?.length ?? 0) > 0;

  const scrollToDetailIntro = () => {
    detailScrollRef.current?.scrollToEnd({ animated: true });
  };

  const t = {
    zh: {
      title: '店铺商品',
      stock: '库存',
      unavailable: '已下架',
      noProducts: '暂无商品',
      infinite: '无限',
      addToCart: '加入购物车',
      quantity: '数量',
      addedToCart: '已加入购物车',
      productDetail: '商品详情',
      description: '商品描述',
      noDescription: '暂无详细描述',
      detailImages: '商品详细介绍',
      detailIntro: '详细介绍',
      itemRemark: '本商品备注（选填）',
      itemRemarkPlaceholder: '如：少糖、不要辣、口味等',
      itemRemarkMultiHint: '每件可单独备注',
    },
    en: {
      title: 'Products',
      stock: 'Stock',
      unavailable: 'Off Shelf',
      noProducts: 'No products available',
      infinite: 'Infinite',
      addToCart: 'Add to Cart',
      quantity: 'Quantity',
      addedToCart: 'Added to cart',
      productDetail: 'Product Details',
      description: 'Description',
      noDescription: 'No description available',
      detailImages: 'Product details',
      detailIntro: 'Details',
      itemRemark: 'Note for this item (optional)',
      itemRemarkPlaceholder: 'e.g. less sugar, no spicy',
      itemRemarkMultiHint: 'Add a note per item',
    },
    my: {
      title: 'ကုန်ပစ္စည်းများ',
      stock: 'လက်ကျန်',
      unavailable: 'ခေတ္တရပ်နားထားသည်',
      noProducts: 'ကုန်ပစ္စည်းမရှိသေးပါ',
      infinite: 'အကန့်အသတ်မရှိ',
      addToCart: 'ခြင်းထဲသို့ထည့်ရန်',
      quantity: 'အရေအတွက်',
      addedToCart: 'ခြင်းထဲသို့ထည့်ပြီးပါပြီ',
      productDetail: 'ကုန်ပစ္စည်းအသေးစိတ်',
      description: 'ကုန်ပစ္စည်းအကြောင်းအရာ',
      noDescription: 'ဖော်ပြချက်မရှိပါ',
      detailImages: 'Product details',
      detailIntro: 'Details',
      itemRemark: 'ဤပစ္စည်းအတွက် မှတ်ချက် (ရွေးချယ်နိုင်)',
      itemRemarkPlaceholder: 'ဥပမာ- သကြားနည်း၊ မစပ်ပါ',
      itemRemarkMultiHint: 'တစ်ခုချင်းစီမှတ်ချက်ထည့်နိုင်',
    }
  };

  const currentT = t[language as keyof typeof t] || t.zh;
  const isFocused = useIsFocused();

  useEffect(() => {
    loadProducts();
  }, []);

  // 🚀 响应来自商城的跳转指令（高亮或自动加车）
  useEffect(() => {
    if (!loading && products.length > 0) {
      if (autoAddProductId) {
        const product = products.find(p => p.id === autoAddProductId);
        if (product && product.is_available) {
          if (productHasVariants(product)) {
            handleOpenProductDetail(product);
          } else {
            updateItemQuantity(autoAddProductId, 1);
            showToast(language === 'zh' ? '已为您自动选中商品' : 'Product auto-selected', 'success');
          }
        }
      }
    }
  }, [loading, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await merchantService.getPublicStoreProducts(storeId);
      setProducts(data);
    } catch (error) {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  /** 顾客备注：每件一行，与件数对齐 */
  const [lineRemarks, setLineRemarks] = useState<Record<string, string[]>>({});
  const [detailRemarks, setDetailRemarks] = useState<string[]>(['']);
  const [detailQty, setDetailQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const [detailCartLineKey, setDetailCartLineKey] = useState<string | null>(null);

  const updateItemQuantity = (id: string, delta: number) => {
    setItemQuantities((prev) => {
      const newQ = Math.max(0, (prev[id] || 0) + delta);
      setLineRemarks((lr) => {
        if (!Object.prototype.hasOwnProperty.call(lr, id)) return lr;
        if (newQ === 0) {
          const { [id]: _, ...rest } = lr;
          return rest;
        }
        return { ...lr, [id]: padLineRemarks(lr[id], newQ) };
      });
      return { ...prev, [id]: newQ };
    });
  };

  const getSelectedItems = () => {
    return products.filter(p => (itemQuantities[p.id] || 0) > 0).map(p => ({
      ...p,
      quantity: itemQuantities[p.id]
    }));
  };

  const maxSelectableStock = (p: Product | null, variantId?: string | null) => {
    if (!p) return 99999;
    return maxSelectableStockForProduct(p, variantId);
  };

  const handleOpenProductDetail = (
    product: Product,
    cartLine?: CartItem | null,
    presetVariantId?: string | null,
  ) => {
    setSelectedProductDetail(product);
    const initialVariantId =
      cartLine?.variant_id ?? presetVariantId ?? selectedVariantByProduct[product.id] ?? null;
    setSelectedVariantId(initialVariantId);
    setDetailCartLineKey(cartLine ? getCartItemLineKey(cartLine) : null);
    const cap = maxSelectableStock(product, initialVariantId);

    if (cartLine) {
      setDetailOpenedFromCart(true);
      let q = cartLine.quantity;
      if (cap > 0 && cap !== 99999) q = Math.min(q, cap);
      if (cap === 0) q = 1;
      q = Math.max(1, q);
      let base: string[] = [];
      if (cartLine.customer_remarks && cartLine.customer_remarks.length > 0) {
        base = [...cartLine.customer_remarks];
      } else if (cartLine.customer_remark?.trim()) {
        base = [cartLine.customer_remark.trim()];
      }
      setDetailRemarks(padLineRemarks(base, q));
      setDetailQty(q);
      setShowEditDetailModal(true);
      return;
    }

    setDetailOpenedFromCart(false);
    const gridQ = itemQuantities[product.id] || 0;
    let q = gridQ > 0 ? gridQ : 1;
    if (cap > 0 && cap !== 99999) q = Math.min(q, cap);
    if (cap === 0) q = 1;
    q = Math.max(1, q);
    const existing = lineRemarks[product.id];
    const base = Array.isArray(existing) ? [...existing] : [];
    setDetailRemarks(padLineRemarks(base, q));
    setDetailQty(q);
    setShowEditDetailModal(true);
  };

  useEffect(() => {
    if (!isFocused || !openProductDetailId || loading || products.length === 0) return;
    const pid = openProductDetailId as string;
    const product = products.find((p) => p.id === pid);
    const variantParam = route.params?.openProductDetailVariantId as string | undefined;
    const cartLine =
      cartItems.find((c) => {
        if (c.id !== pid) return false;
        if (variantParam) return c.variant_id === variantParam;
        return true;
      }) ?? null;
    if (!product) {
      navigation.setParams({ openProductDetailId: undefined });
      return;
    }
    if (!product.is_available) {
      showToast(
        language === 'zh'
          ? '商品已下架'
          : language === 'en'
            ? 'This item is unavailable'
            : 'မရရှိနိုင်ပါ',
        'warning'
      );
      navigation.setParams({ openProductDetailId: undefined });
      return;
    }
    handleOpenProductDetail(product, cartLine, variantParam);
    navigation.setParams({ openProductDetailId: undefined });
  }, [
    isFocused,
    loading,
    products,
    openProductDetailId,
    cartItems,
    navigation,
    language,
  ]);

  const remarkForProductId = (id: string): string[] | undefined => {
    if (!Object.prototype.hasOwnProperty.call(lineRemarks, id)) return undefined;
    const q = itemQuantities[id] || 0;
    if (q <= 0) return undefined;
    const padded = padLineRemarks(lineRemarks[id], q);
    if (!padded.some((r) => r.trim())) return undefined;
    return padded;
  };

  const adjustDetailQty = (nextQty: number) => {
    const n = Math.max(1, nextQty);
    setDetailQty(n);
    setDetailRemarks((prev) => {
      if (prev.length > n) return prev.slice(0, n);
      if (prev.length < n) return [...prev, ...Array(n - prev.length).fill('')];
      return prev;
    });
  };

  const detailStockCap = maxSelectableStock(selectedProductDetail, selectedVariantId);
  const detailDisplayProduct = selectedProductDetail
    ? buildProductForCart(selectedProductDetail, selectedVariantId)
    : null;
  const detailQtyPlusDisabled =
    detailStockCap === 0 || (detailStockCap !== 99999 && detailQty >= detailStockCap);
  const detailAddDisabled =
    !selectedProductDetail ||
    detailStockCap === 0 ||
    (productHasVariants(selectedProductDetail) && !selectedVariantId);

  const closeDetailModal = () => {
    setShowEditDetailModal(false);
    setSelectedProductDetail(null);
    setSelectedVariantId(null);
    setDetailCartLineKey(null);
    setDetailOpenedFromCart(false);
  };

  const handleDetailSubmit = () => {
    if (!selectedProductDetail) return;
    const pid = selectedProductDetail.id;
    if (productHasVariants(selectedProductDetail) && !selectedVariantId) {
      showToast(
        language === 'zh' ? '请先选择规格' : 'Please select a variant',
        'warning',
      );
      return;
    }
    if (detailStockCap === 0) {
      showToast(language === 'zh' ? '暂无库存' : 'Out of stock', 'warning');
      return;
    }
    const qty =
      detailStockCap === 99999 ? detailQty : Math.min(detailQty, detailStockCap);
    const padded = padLineRemarks(detailRemarks, qty);
    const remarks = padded.some((r) => r.trim()) ? padded : undefined;
    const fromCart = detailOpenedFromCart;
    const lineKey = cartLineKey(pid, selectedVariantId);
    const oldKey = detailCartLineKey ?? lineKey;
    const variantId = selectedVariantId ?? undefined;

    const commitDetailCart = () => {
      if (fromCart) {
        if (qty <= 0) {
          removeFromCart(oldKey);
        } else if (oldKey !== lineKey) {
          removeFromCart(oldKey);
          addToCart(selectedProductDetail, qty, remarks, variantId);
        } else {
          updateCartItemDetails(oldKey, qty, padded);
        }
        showToast(
          language === 'zh'
            ? '购物车已更新'
            : language === 'en'
              ? 'Cart updated'
              : 'ဈေးဝယ်လှည်းအပ်ဒိတ်လုပ်ပြီး',
          'success',
        );
      } else {
        addToCart(selectedProductDetail, qty, remarks, variantId);
        showToast(currentT.addedToCart, 'success');
      }
      closeDetailModal();
    };

    if (!fromCart && cartItems.length > 0 && cartItems[0].store_id !== storeId) {
      Alert.alert(
        language === 'zh' ? '清空购物车提示' : 'Clear Cart Notice',
        language === 'zh'
          ? '购物车中已存在其他店铺的商品，继续添加将清空原有商品。确定继续吗？'
          : 'Cart already contains items from another store. Adding new items will clear existing ones. Continue?',
        [
          { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
          { text: language === 'zh' ? '确定' : 'Continue', onPress: commitDetailCart },
        ],
      );
      return;
    }

    commitDetailCart();
  };

  const handleBulkAddToCart = () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      Alert.alert(language === 'zh' ? '提示' : 'Notice', language === 'zh' ? '请先选择商品数量' : 'Please select item quantity');
      return;
    }

    // 🚀 核心逻辑优化：检查是否属于不同店铺
    if (cartItems.length > 0 && cartItems[0].store_id !== storeId) {
      Alert.alert(
        language === 'zh' ? '清空购物车提示' : 'Clear Cart Notice',
        language === 'zh' 
          ? '购物车中已存在其他店铺的商品，继续添加将清空原有商品。确定继续吗？' 
          : 'Cart already contains items from another store. Adding new items will clear existing ones. Continue?',
        [
          { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
          { 
            text: language === 'zh' ? '确定' : 'Continue', 
            onPress: () => {
              selectedItems.forEach(item => {
                const variantId = productHasVariants(item)
                  ? selectedVariantByProduct[item.id]
                  : undefined;
                addToCart(item, item.quantity, remarkForProductId(item.id), variantId);
              });
              showToast(currentT.addedToCart, 'success');
              setItemQuantities({});
              setLineRemarks({});
            } 
          }
        ]
      );
      return;
    }

    const missingVariant = selectedItems.find(
      (p) => productHasVariants(p) && !selectedVariantByProduct[p.id],
    );
    if (missingVariant) {
      Alert.alert(
        language === 'zh' ? '提示' : 'Notice',
        language === 'zh'
          ? `请为「${missingVariant.name}」选择规格（点击商品卡片）`
          : `Please select a variant for "${missingVariant.name}"`,
      );
      handleOpenProductDetail(missingVariant);
      return;
    }

    selectedItems.forEach(item => {
      const variantId = productHasVariants(item) ? selectedVariantByProduct[item.id] : undefined;
      addToCart(item, item.quantity, remarkForProductId(item.id), variantId);
    });
    showToast(currentT.addedToCart, 'success');
    // 可选：清空当前选择
    setItemQuantities({});
    setLineRemarks({});
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const quantity = itemQuantities[item.id] || 0;
    const hasVariants = productHasVariants(item);
    const langKey = language === 'zh' ? 'zh' : language === 'my' ? 'my' : 'en';

    const customerAction = item.is_available ? (
      hasVariants ? (
        <Text style={styles.variantHintText}>
          {language === 'zh' ? '选规格' : language === 'en' ? 'Variant' : 'Variant'}
        </Text>
      ) : (
        <View style={styles.smallQuantitySelector}>
          <TouchableOpacity
            onPress={() => updateItemQuantity(item.id, -1)}
            style={[styles.smallQtyBtn, quantity === 0 && styles.disabledQtyBtn]}
            disabled={quantity === 0}
          >
            <Ionicons name="remove" size={14} color={quantity === 0 ? '#cbd5e1' : '#3b82f6'} />
          </TouchableOpacity>
          <Text style={[styles.smallQtyValue, quantity === 0 && { color: '#cbd5e1' }]}>{quantity}</Text>
          <TouchableOpacity
            onPress={() => updateItemQuantity(item.id, 1)}
            style={styles.smallQtyBtn}
          >
            <Ionicons name="add" size={14} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      )
    ) : null;

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          styles.productCardCustomer,
          item.id === highlightProductId && styles.highlightedCard,
        ]}
        onPress={() => handleOpenProductDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainerCustomer}>
          {item.image_url && !item.image_url.startsWith('file://') ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={28} color="#cbd5e1" />
            </View>
          )}
          {!item.is_available && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>{currentT.unavailable}</Text>
            </View>
          )}
        </View>

        <View style={[styles.productInfo, styles.productInfoCustomer]}>
          <MyanmarAwareText style={styles.productName} numberOfLines={2}>
            {item.name}
          </MyanmarAwareText>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{formatProductPriceLabel(item, langKey)}</Text>
            {!hasVariants && item.original_price && item.original_price > item.price && (
              <Text style={styles.originalPrice}>{item.original_price.toLocaleString()} MMK</Text>
            )}
          </View>
          {hasVariants ? <ProductVariantChipList product={item} language={langKey} /> : null}

          <View style={styles.stockRow}>
            <View style={styles.stockRowLeft}>
              <Ionicons name="cube-outline" size={14} color="#64748b" />
              <Text style={styles.productStock} numberOfLines={1}>
                {currentT.stock}:{' '}
                {hasVariants
                  ? language === 'zh'
                    ? '多规格'
                    : 'Variants'
                  : item.stock === -1
                    ? currentT.infinite
                    : item.stock}
              </Text>
            </View>
            {customerAction}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e3a8a', '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{storeName || currentT.title}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              style={styles.cartBtn}
            >
              <Ionicons name="cart-outline" size={24} color="white" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={renderProductItem}
            numColumns={1}
            contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="basket-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyText}>{currentT.noProducts}</Text>
              </View>
            }
          />
        )}

        {products.length > 0 && (
          <View style={styles.stickyFooter}>
            <TouchableOpacity 
              style={styles.bulkAddToCartBtn}
              onPress={handleBulkAddToCart}
            >
              <LinearGradient
                colors={['#fbbf24', '#f59e0b']}
                style={styles.bulkBtnGradient}
              >
                <Ionicons name="cart-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.bulkBtnText}>{currentT.addToCart}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 商品详情模态框：单 ScrollView 上滑时白底内容盖住头图 */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDetailOpenedFromCart(false);
          setShowEditDetailModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              styles.detailModalCard,
              {
                padding: 0,
                overflow: 'hidden',
                width: width * 0.92,
                maxWidth: 440,
                height: DETAIL_MODAL_HEIGHT,
              },
            ]}
          >
            <ScrollView
              ref={detailScrollRef}
              style={styles.detailMainScroll}
              contentContainerStyle={styles.detailMainScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces
            >
              <View style={styles.detailHero}>
                {selectedProductDetail?.image_url ? (
                  <Image
                    source={{ uri: selectedProductDetail.image_url }}
                    style={styles.detailHeroImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.detailHeroPlaceholder}>
                    <Ionicons name="image-outline" size={64} color="#cbd5e1" />
                  </View>
                )}
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(0,0,0,0)', 'rgba(15,23,42,0.25)', 'rgba(15,23,42,0.62)']}
                  locations={[0, 0.45, 1]}
                  style={StyleSheet.absoluteFillObject}
                />
                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => {
                    setDetailOpenedFromCart(false);
                    setShowEditDetailModal(false);
                    setSelectedVariantId(null);
                    setDetailCartLineKey(null);
                  }}
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={22} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailSheet}>
                <View style={styles.detailHeader}>
                  <MyanmarAwareText
                    style={adjustStyleForMyanmarText(selectedProductDetail?.name, styles.detailName)}
                    myanmarWeight="bold"
                    text={selectedProductDetail?.name}
                  />
                  <View style={styles.detailPriceRow}>
                    {selectedProductDetail && productHasVariants(selectedProductDetail) && !selectedVariantId ? (
                      <Text style={styles.detailPriceHint}>
                        {language === 'zh'
                          ? '请选择规格查看价格'
                          : language === 'en'
                            ? 'Select a variant to see price'
                            : 'စျေးနှုန်းကြည့်ရန် ရွေးချယ်ပါ'}
                      </Text>
                    ) : (
                      <>
                        <Text style={styles.detailPrice}>
                          {(detailDisplayProduct ?? selectedProductDetail)?.price.toLocaleString()} MMK
                        </Text>
                        {(() => {
                          const dp = detailDisplayProduct ?? selectedProductDetail;
                          const orig =
                            dp?.original_price ??
                            (selectedProductDetail
                              ? getProductDisplayOriginalPrice(selectedProductDetail)
                              : undefined);
                          return orig && dp && orig > dp.price ? (
                            <Text style={styles.detailOriginalPrice}>
                              {orig.toLocaleString()} MMK
                            </Text>
                          ) : null;
                        })()}
                      </>
                    )}
                  </View>
                </View>

                {selectedProductDetail && productHasVariants(selectedProductDetail) ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      {language === 'zh' ? '选择规格' : language === 'en' ? 'Select variant' : 'Variant'}
                    </Text>
                    <View style={styles.variantChipRow}>
                      {getAvailableVariants(selectedProductDetail).map((variant) => {
                        const selected = selectedVariantId === variant.id;
                        const outOfStock =
                          maxSelectableStockForProduct(selectedProductDetail, variant.id) === 0;
                        return (
                          <TouchableOpacity
                            key={variant.id}
                            disabled={outOfStock}
                            onPress={() => {
                              setSelectedVariantId(variant.id);
                              const cap = maxSelectableStock(selectedProductDetail, variant.id);
                              if (cap !== 99999 && detailQty > cap) {
                                adjustDetailQty(Math.max(1, cap));
                              }
                            }}
                            style={[
                              styles.variantChip,
                              selected && styles.variantChipSelected,
                              outOfStock && styles.variantChipOut,
                            ]}
                          >
                            <Text
                              style={[
                                styles.variantChipText,
                                selected && styles.variantChipTextSelected,
                                outOfStock && styles.variantChipTextOut,
                              ]}
                            >
                              {variant.name}
                              {outOfStock
                                ? ` (${language === 'zh' ? '售罄' : 'Sold out'})`
                                : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{currentT.description}</Text>
                  <View style={styles.descriptionBox}>
                    <MyanmarAwareText
                      style={adjustStyleForMyanmarText(
                        selectedProductDetail?.description || currentT.noDescription,
                        styles.detailDescription,
                      )}
                    >
                      {selectedProductDetail?.description || currentT.noDescription}
                    </MyanmarAwareText>
                  </View>
                  {hasDetailIntroImages(selectedProductDetail) ? (
                    <TouchableOpacity
                      style={styles.detailIntroBtn}
                      onPress={scrollToDetailIntro}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="images-outline" size={16} color="#2563eb" />
                      <Text style={styles.detailIntroBtnText}>{currentT.detailIntro}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.detailStockCard}>
                  <Ionicons name="cube-outline" size={20} color="#2563eb" />
                  <Text style={styles.detailStockCardText}>
                    {currentT.stock}:{' '}
                    {selectedProductDetail &&
                    productHasVariants(selectedProductDetail) &&
                    !selectedVariantId
                      ? language === 'zh'
                        ? '请先选择规格'
                        : 'Select variant first'
                      : (detailDisplayProduct ?? selectedProductDetail)?.stock === -1
                        ? currentT.infinite
                        : (detailDisplayProduct ?? selectedProductDetail)?.stock}
                  </Text>
                </View>

                <View style={styles.detailRemarkSection}>
                  <Text style={styles.detailSectionTitle}>{currentT.itemRemark}</Text>
                  {detailQty >= 2 ? (
                    <Text style={styles.detailRemarkMultiHint}>{currentT.itemRemarkMultiHint}</Text>
                  ) : null}
                  {detailRemarks.map((row, index) => (
                    <View key={`remark-${index}`} style={styles.detailRemarkRow}>
                      {detailQty >= 2 ? (
                        <Text style={styles.detailRemarkPieceLabel}>{pieceRemarkPrefix(index)}</Text>
                      ) : null}
                      <TextInput
                        style={[
                          styles.detailRemarkInput,
                          detailQty >= 2 && styles.detailRemarkInputInRow,
                        ]}
                        value={row}
                        onChangeText={(text) => {
                          setDetailRemarks((prev) => {
                            const next = [...prev];
                            next[index] = text;
                            return next;
                          });
                        }}
                        placeholder={currentT.itemRemarkPlaceholder}
                        placeholderTextColor="#94a3b8"
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                      />
                    </View>
                  ))}
                </View>

                {hasDetailIntroImages(selectedProductDetail) ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{currentT.detailIntro}</Text>
                    {selectedProductDetail?.detail_image_urls?.map((url, idx) => (
                      <Image
                        key={`${url}-${idx}`}
                        source={{ uri: url }}
                        style={styles.detailScrollingImage}
                        resizeMode="contain"
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <View
              style={[
                styles.detailFooter,
                { paddingBottom: Platform.OS === 'ios' ? 16 : 10 },
              ]}
            >
              <View style={styles.detailQtyControl}>
                <TouchableOpacity
                  style={[styles.detailQtyBtn, detailQty <= 1 && styles.detailQtyBtnDisabled]}
                  onPress={() => adjustDetailQty(detailQty - 1)}
                  disabled={detailQty <= 1}
                >
                  <Ionicons
                    name="remove"
                    size={22}
                    color={detailQty <= 1 ? '#94a3b8' : '#0f172a'}
                  />
                </TouchableOpacity>
                <Text style={styles.detailQtyValue}>{detailQty}</Text>
                <TouchableOpacity
                  style={[
                    styles.detailQtyBtn,
                    detailQtyPlusDisabled && styles.detailQtyBtnDisabled,
                  ]}
                  onPress={() => {
                    if (detailStockCap === 0) return;
                    const n =
                      detailStockCap === 99999 ? detailQty + 1 : Math.min(detailStockCap, detailQty + 1);
                    if (n > detailQty) adjustDetailQty(n);
                  }}
                  disabled={detailQtyPlusDisabled}
                >
                  <Ionicons
                    name="add"
                    size={22}
                    color={detailQtyPlusDisabled ? '#94a3b8' : '#0f172a'}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.detailAddBtn, detailAddDisabled && styles.detailAddBtnDisabled]}
                disabled={detailAddDisabled}
                onPress={handleDetailSubmit}
              >
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.detailAddGradient}>
                  <Ionicons name="cart-outline" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.detailAddText}>{currentT.addToCart}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        duration={1500}
        onHide={() => setToastVisible(false)}
      />
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
  },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    ...theme.shadows.small,
  },
  productCardCustomer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  highlightedCard: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    backgroundColor: '#eff6ff',
  },
  productImageContainerCustomer: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  productInfoCustomer: {
    flex: 1,
    paddingTop: 2,
  },
  productName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
    marginTop: 2,
  },
  stockRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  productStock: {
    fontSize: 12,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    ...theme.shadows.large,
  },
  /** 与 flex 子项配合：纵向铺满固定高度卡片 */
  detailModalCard: {
    flexDirection: 'column',
    alignSelf: 'center',
  },
  variantHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center',
  },
  detailPriceHint: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  variantChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  variantChipSelected: {
    borderColor: '#2563eb',
    borderWidth: 2,
    backgroundColor: '#eff6ff',
  },
  variantChipOut: {
    backgroundColor: '#f8fafc',
    opacity: 0.7,
  },
  variantChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  variantChipTextSelected: {
    color: '#1d4ed8',
  },
  variantChipTextOut: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  smallQuantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 2,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexShrink: 0,
  },
  smallQtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  smallQtyValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    minWidth: 15,
    textAlign: 'center',
  },
  disabledQtyBtn: {
    backgroundColor: '#f1f5f9',
  },
  // 底部操作栏样式
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    gap: 12,
    ...theme.shadows.large,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bulkAddToCartBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bulkBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  detailMainScroll: {
    flex: 1,
    minHeight: 0,
  },
  detailMainScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  detailHero: {
    width: '100%',
    height: DETAIL_HERO_HEIGHT,
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  detailHeroImage: {
    width: '100%',
    height: '100%',
  },
  detailHeroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  detailSheet: {
    marginTop: -28,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  detailHeader: {
    marginBottom: 18,
    paddingTop: 2,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
    lineHeight: 30,
    flexShrink: 0,
  },
  detailPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    flexWrap: 'wrap',
  },
  detailPrice: {
    fontSize: 21,
    color: '#059669',
    fontWeight: '900',
  },
  detailOriginalPrice: {
    fontSize: 15,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  detailSection: {
    marginBottom: 18,
  },
  detailScrollingImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
  },
  detailIntroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  detailIntroBtnText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '800',
  },
  descriptionBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 26,
  },
  detailStockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eff6ff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 18,
  },
  detailStockCardText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e3a5f',
    flex: 1,
  },
  detailRemarkSection: {
    marginBottom: 4,
  },
  detailRemarkMultiHint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  detailRemarkRow: {
    marginBottom: 12,
  },
  detailRemarkPieceLabel: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '800',
    color: '#334155',
  },
  detailRemarkInput: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  detailRemarkInputInRow: {
    minHeight: 72,
  },
  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 12 },
    }),
  },
  detailQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailQtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailQtyBtnDisabled: {
    opacity: 0.45,
  },
  detailQtyValue: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  detailAddBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
  },
  detailAddBtnDisabled: {
    opacity: 0.48,
  },
  detailAddGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
});


import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useCart, CartItem, getCartItemLineKey } from '../contexts/CartContext';
import {
  deliveryStoreService,
  merchantService,
  reviewService,
  Product,
  ProductCategory,
  DeliveryStore,
} from '../services/supabase';
import { theme } from '../config/theme';
import Toast from '../components/Toast';
import { common } from '../i18n';
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
import { remoteImageUri } from '../services/clientApi/nativeSupabaseUrl';

const { width, height: WINDOW_HEIGHT } = Dimensions.get('window');
/** 商品详情弹窗固定高度，否则内层 flex:1 在 RN 中会塌陷，只显示图片不显示备注区 */
const DETAIL_MODAL_HEIGHT = Math.min(WINDOW_HEIGHT * 0.88, 720);
const DETAIL_HERO_HEIGHT = 248;
const TEAL = '#2C98A6';
const PAGE_BG = '#F3F5F7';
const COVER_HEIGHT = 198;
const LOGO_SIZE = 76;
const HOT_CATEGORY_ID = '__hot__';
const GRID_PAD = 12;
const GRID_GAP = 10;
const CARD_WIDTH = (width - GRID_PAD * 2 - GRID_GAP) / 2;

const PIECE_REMARK_LABELS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function pieceRemarkPrefix(index: number): string {
  return PIECE_REMARK_LABELS[index] ?? `${index + 1}.`;
}

function padLineRemarks(arr: string[], length: number): string[] {
  const next = arr.slice(0, length);
  while (next.length < length) next.push('');
  return next;
}

function StoreRemoteImage({
  uri,
  style,
  resizeMode = 'cover',
  iconSize = 28,
  fallback,
}: {
  uri?: string | null;
  style: object;
  resizeMode?: 'cover' | 'contain';
  iconSize?: number;
  fallback?: React.ReactNode;
}) {
  const src = remoteImageUri(uri);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (!src || failed) {
    if (fallback) return <>{fallback}</>;
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }]}>
        <Ionicons name="image-outline" size={iconSize} color="#cbd5e1" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
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
  const insets = useSafeAreaInsets();
  const { addToCart, removeFromCart, cartItems, updateCartItemDetails } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });
  const [selectedCategoryId, setSelectedCategoryId] = useState(HOT_CATEGORY_ID);
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
  const autoAddedRef = useRef<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hasDetailIntroImages = (product: Product | null) =>
    (product?.detail_image_urls?.filter((url) => remoteImageUri(url)).length ?? 0) > 0;

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
      hot: '热销',
      eta: '按配送选项送达',
      monthlySales: '月销',
      distanceCity: '同城配送',
      freeDelivery: '满额免配',
      checkout: '去结算',
      itemsUnit: '件',
      selectVariant: '请先选择规格',
      outOfStock: '暂无库存',
      unavailableItem: '商品已下架',
      cartUpdated: '购物车已更新',
      clearCartTitle: '清空购物车提示',
      clearCartBody: '购物车中已存在其他店铺的商品，继续添加将清空原有商品。确定继续吗？',
      continueAction: '确定',
      soldOut: '售罄',
      loadFailed: '加载失败',
      selectToSeePrice: '请选择规格查看价格',
      selectVariantTitle: '选择规格',
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
      hot: 'Hot',
      eta: 'By delivery option',
      monthlySales: 'Sold',
      distanceCity: 'City delivery',
      freeDelivery: 'Free delivery over min.',
      checkout: 'Checkout',
      itemsUnit: 'items',
      selectVariant: 'Please select a variant',
      outOfStock: 'Out of stock',
      unavailableItem: 'This item is unavailable',
      cartUpdated: 'Cart updated',
      clearCartTitle: 'Clear Cart Notice',
      clearCartBody: 'Cart already contains items from another store. Adding new items will clear existing ones. Continue?',
      continueAction: 'Continue',
      soldOut: 'Sold out',
      loadFailed: 'Failed to load',
      selectToSeePrice: 'Select a variant to see price',
      selectVariantTitle: 'Select variant',
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
      detailImages: 'အသေးစိတ်ပုံများ',
      detailIntro: 'အသေးစိတ်',
      itemRemark: 'ဤပစ္စည်းအတွက် မှတ်ချက် (ရွေးချယ်နိုင်)',
      itemRemarkPlaceholder: 'ဥပမာ- သကြားနည်း၊ မစပ်ပါ',
      itemRemarkMultiHint: 'တစ်ခုချင်းစီမှတ်ချက်ထည့်နိုင်',
      hot: 'ရောင်းအားကောင်း',
      eta: 'ပို့ဆောင်မှု ရွေးချယ်မှုအတိုင်း',
      monthlySales: 'လစဉ်ရောင်း',
      distanceCity: 'မြို့တွင်းပို့ဆောင်',
      freeDelivery: 'ပြည့်ရင် ပို့ခအခမဲ့',
      checkout: 'ငွေရှင်းရန်',
      itemsUnit: 'ခု',
      selectVariant: 'အမျိုးအစား အရင်ရွေးပါ',
      outOfStock: 'ကုန်ပစ္စည်း မရှိပါ',
      unavailableItem: 'မရရှိနိုင်ပါ',
      cartUpdated: 'ဈေးဝယ်လှည်းအပ်ဒိတ်လုပ်ပြီး',
      clearCartTitle: 'ဈေးဝယ်လှည်း ရှင်းရန်',
      clearCartBody: 'အခြားဆိုင်မှ ပစ္စည်းများ ရှိနေပါသည်။ ဆက်ထည့်ပါက အဟောင်းများကို ရှင်းပါမည်။ ဆက်လုပ်မလား?',
      continueAction: 'ဆက်လုပ်မည်',
      soldOut: 'ရောင်းကုန်',
      loadFailed: 'တင်၍မရပါ',
      selectToSeePrice: 'စျေးနှုန်းကြည့်ရန် ရွေးချယ်ပါ',
      selectVariantTitle: 'အမျိုးအစားရွေးပါ',
    }
  };

  const currentT = t[language as keyof typeof t] || t.zh;
  const c = common(language);
  const isFocused = useIsFocused();

  useEffect(() => {
    loadProducts();
  }, []);

  // 🚀 响应来自商城的跳转指令（高亮或自动加车）
  useEffect(() => {
    if (!loading && products.length > 0 && autoAddProductId && autoAddedRef.current !== autoAddProductId) {
      const product = products.find(p => p.id === autoAddProductId);
      if (product && product.is_available) {
        autoAddedRef.current = autoAddProductId;
        if (productHasVariants(product)) {
          handleOpenProductDetail(product);
        } else {
          handleQuickAdd(product);
        }
        navigation.setParams({ autoAddProductId: undefined });
      }
    }
  }, [loading, products, autoAddProductId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [data, storeData, cats, stats] = await Promise.all([
        merchantService.getPublicStoreProducts(storeId),
        storeId ? deliveryStoreService.getStoreById(storeId) : Promise.resolve(null),
        storeId ? merchantService.getStoreCategories(storeId) : Promise.resolve([]),
        storeId ? reviewService.getStoreReviewStats(storeId) : Promise.resolve({ average: 0, count: 0 }),
      ]);
      setProducts(data);
      setStore(storeData);
      setCategories(cats || []);
      setReviewStats({ average: stats?.average || 0, count: stats?.count || 0 });
    } catch (error) {
      showToast(currentT.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const [detailRemarks, setDetailRemarks] = useState<string[]>(['']);
  const [detailQty, setDetailQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [detailCartLineKey, setDetailCartLineKey] = useState<string | null>(null);

  const categoryTabs = useMemo(
    () => [{ id: HOT_CATEGORY_ID, name: currentT.hot }, ...categories],
    [categories, currentT.hot],
  );

  const filteredProducts = useMemo(() => {
    const list =
      selectedCategoryId === HOT_CATEGORY_ID
        ? [...products]
        : products.filter((p) => p.category_id === selectedCategoryId);
    return list.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
  }, [products, selectedCategoryId]);

  const storeCartItems = useMemo(
    () => cartItems.filter((item) => item.store_id === storeId),
    [cartItems, storeId],
  );
  const storeCartCount = storeCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const storeCartTotal = storeCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const monthlySales = products.reduce((sum, item) => sum + (item.sales_count || 0), 0);
  const ratingLabel = (reviewStats.average > 0 ? reviewStats.average : 4.9).toFixed(1);
  const coverUri = products.map((p) => remoteImageUri(p.image_url)).find(Boolean);
  const displayStoreName = store?.store_name || storeName || currentT.title;
  const storeInitial = (displayStoreName || '店').trim().charAt(0);
  const distanceLabel = currentT.distanceCity;

  const cartQtyForProduct = (productId: string) =>
    storeCartItems.filter((item) => item.id === productId).reduce((sum, item) => sum + item.quantity, 0);

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
      cartLine?.variant_id ?? presetVariantId ?? null;
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
    const gridQ = cartQtyForProduct(product.id);
    let q = gridQ > 0 ? gridQ : 1;
    if (cap > 0 && cap !== 99999) q = Math.min(q, cap);
    if (cap === 0) q = 1;
    q = Math.max(1, q);
    const cartLineForProduct = storeCartItems.find((c) => c.id === product.id);
    const existing = cartLineForProduct?.customer_remarks ?? [];
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
      showToast(currentT.unavailableItem, 'warning');
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
        currentT.selectVariant,
        'warning',
      );
      return;
    }
    if (detailStockCap === 0) {
      showToast(currentT.outOfStock, 'warning');
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
        showToast(currentT.cartUpdated, 'success');
      } else {
        addToCart(selectedProductDetail, qty, remarks, variantId);
        showToast(currentT.addedToCart, 'success');
      }
      closeDetailModal();
    };

    if (!fromCart && cartItems.length > 0 && cartItems[0].store_id !== storeId) {
      Alert.alert(
        currentT.clearCartTitle,
        currentT.clearCartBody,
        [
          { text: c.cancel, style: 'cancel' },
          { text: currentT.continueAction, onPress: commitDetailCart },
        ],
      );
      return;
    }

    commitDetailCart();
  };

  const confirmOtherStoreThen = (onOk: () => void) => {
    if (cartItems.length > 0 && cartItems[0].store_id !== storeId) {
      Alert.alert(
        currentT.clearCartTitle,
        currentT.clearCartBody,
        [
          { text: c.cancel, style: 'cancel' },
          { text: currentT.continueAction, onPress: onOk },
        ],
      );
      return;
    }
    onOk();
  };

  const handleQuickAdd = (item: Product) => {
    if (!item.is_available) return;
    if (productHasVariants(item)) {
      handleOpenProductDetail(item);
      return;
    }
    const cap = maxSelectableStock(item);
    const current = cartQtyForProduct(item.id);
    if (cap === 0 || (cap !== 99999 && current >= cap)) {
      showToast(currentT.outOfStock, 'warning');
      return;
    }
    confirmOtherStoreThen(() => {
      addToCart(item, 1);
      showToast(currentT.addedToCart, 'success');
    });
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const quantity = cartQtyForProduct(item.id);
    const langKey = language === 'zh' ? 'zh' : language === 'my' ? 'my' : 'en';
    return (
      <TouchableOpacity
        style={[styles.productCard, item.id === highlightProductId && styles.highlightedCard]}
        onPress={() => handleOpenProductDetail(item)}
        activeOpacity={0.85}
      >
        <View style={styles.productImageWrap}>
          <StoreRemoteImage uri={item.image_url} style={styles.productImage} iconSize={32} />
          {!item.is_available && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>{currentT.unavailable}</Text>
            </View>
          )}
        </View>
        <View style={styles.productBody}>
          <MyanmarAwareText style={styles.productName} numberOfLines={2}>
            {item.name}
          </MyanmarAwareText>
          <Text style={styles.productPrice} numberOfLines={1}>
            {formatProductPriceLabel(item, langKey)}
          </Text>
        </View>
        {item.is_available ? (
          <TouchableOpacity
            style={styles.addCircle}
            onPress={() => handleQuickAdd(item)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            {quantity > 0 ? (
              <View style={styles.addCircleBadge}>
                <Text style={styles.addCircleBadgeText}>{quantity}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { top: insets.top + 6, position: 'absolute' }]}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          extraData={`${storeCartCount}-${selectedCategoryId}-${highlightProductId}`}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: storeCartCount > 0 ? 108 + insets.bottom : 24 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />
          }
          ListHeaderComponent={
            <View style={{ width }}>
              <View style={styles.coverWrap}>
                <StoreRemoteImage
                  uri={coverUri}
                  style={styles.coverImage}
                  fallback={<LinearGradient colors={['#3AA4B0', TEAL, '#1F7A86']} style={styles.coverImage} />}
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.38)', 'transparent', 'rgba(0,0,0,0.18)']}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={[styles.backBtn, { top: insets.top + 6 }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.logoRow}>
                <View style={styles.storeLogo}>
                  <StoreRemoteImage
                    uri={coverUri}
                    style={styles.storeLogoImage}
                    iconSize={22}
                    fallback={<Text style={styles.storeLogoText}>{storeInitial}</Text>}
                  />
                </View>
              </View>

              <View style={styles.storeInfo}>
                <Text style={styles.storeTitle} numberOfLines={2}>
                  {displayStoreName}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="star" size={14} color="#F5B942" />
                  <Text style={styles.ratingText}>{ratingLabel}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaMuted}>
                    {currentT.monthlySales} {monthlySales}
                  </Text>
                </View>
                <View style={styles.etaPill}>
                  <Ionicons name="bicycle-outline" size={14} color="#fff" />
                  <Text style={styles.etaPillText}>{currentT.eta}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.metaMuted}>{distanceLabel}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name="gift-outline" size={14} color={TEAL} />
                  <Text style={styles.freeDeliveryText}>{currentT.freeDelivery}</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {categoryTabs.map((tab) => {
                  const active = selectedCategoryId === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => setSelectedCategoryId(tab.id)}
                      style={styles.categoryTab}
                    >
                      <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
                        {tab.name}
                      </Text>
                      {active ? <View style={styles.categoryUnderline} /> : <View style={styles.categoryUnderlineGhost} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>{currentT.noProducts}</Text>
            </View>
          }
        />
      )}

      {storeCartCount > 0 ? (
        <TouchableOpacity
          style={[styles.floatingCart, { bottom: Math.max(insets.bottom, 12) + 8 }]}
          onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
          activeOpacity={0.9}
        >
          <View style={styles.floatingCartIcon}>
            <Ionicons name="cart" size={20} color="#fff" />
            <View style={styles.floatingCartBadge}>
              <Text style={styles.floatingCartBadgeText}>{storeCartCount}</Text>
            </View>
          </View>
          <Text style={styles.floatingCartCount}>
            {storeCartCount} {currentT.itemsUnit}
          </Text>
          <Text style={styles.floatingCartTotal} numberOfLines={1}>
            {storeCartTotal.toLocaleString()} MMK
          </Text>
          <Text style={styles.floatingCartGo}>{currentT.checkout}</Text>
        </TouchableOpacity>
      ) : null}

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
                <StoreRemoteImage
                  uri={selectedProductDetail?.image_url}
                  style={styles.detailHeroImage}
                  resizeMode="contain"
                  iconSize={64}
                />
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
                        {currentT.selectToSeePrice}
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
                      {currentT.selectVariantTitle}
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
                                ? ` (${currentT.soldOut})`
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
                      <Ionicons name="images-outline" size={16} color={TEAL} />
                      <Text style={styles.detailIntroBtnText}>{currentT.detailIntro}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.detailStockCard}>
                  <Ionicons name="cube-outline" size={20} color={TEAL} />
                  <Text style={styles.detailStockCardText}>
                    {currentT.stock}:{' '}
                    {selectedProductDetail &&
                    productHasVariants(selectedProductDetail) &&
                    !selectedVariantId
                      ? currentT.selectVariant
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
                    {selectedProductDetail?.detail_image_urls?.map((url, idx) => {
                      const src = remoteImageUri(url);
                      if (!src) return null;
                      return (
                        <StoreRemoteImage
                          key={`${src}-${idx}`}
                          uri={src}
                          style={styles.detailScrollingImage}
                          resizeMode="contain"
                          iconSize={48}
                        />
                      );
                    })}
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
                <LinearGradient colors={[TEAL, '#1F7A86']} style={styles.detailAddGradient}>
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
    backgroundColor: PAGE_BG,
  },
  coverWrap: {
    height: COVER_HEIGHT,
    backgroundColor: TEAL,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  logoRow: {
    paddingHorizontal: 16,
    marginTop: -(LOGO_SIZE / 2),
    zIndex: 4,
  },
  storeLogo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
  },
  storeLogoImage: {
    width: '100%',
    height: '100%',
  },
  storeLogoText: {
    fontSize: 28,
    fontWeight: '800',
    color: TEAL,
  },
  storeInfo: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  storeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 2,
  },
  metaDot: {
    color: '#94a3b8',
    marginHorizontal: 2,
    fontWeight: '700',
  },
  metaMuted: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  etaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TEAL,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  etaPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  freeDeliveryText: {
    fontSize: 13,
    color: TEAL,
    fontWeight: '700',
  },
  categoryRow: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  categoryTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    paddingBottom: 6,
  },
  categoryTabTextActive: {
    color: TEAL,
    fontWeight: '800',
  },
  categoryUnderline: {
    height: 3,
    width: '70%',
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  categoryUnderlineGhost: {
    height: 3,
    width: '70%',
  },
  listContent: {
    paddingBottom: 16,
  },
  productRow: {
    paddingHorizontal: GRID_PAD,
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 12,
    ...theme.shadows.small,
  },
  highlightedCard: {
    borderColor: TEAL,
    borderWidth: 2,
  },
  productImageWrap: {
    width: '100%',
    height: CARD_WIDTH * 0.92,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    position: 'relative',
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
  productBody: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingRight: 40,
    minHeight: 64,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 14,
    color: TEAL,
    fontWeight: '800',
  },
  addCircle: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircleBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  addCircleBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  floatingCart: {
    position: 'absolute',
    right: 14,
    left: 14,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A4E56',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 16,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingCartIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  floatingCartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  floatingCartCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingCartTotal: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  floatingCartGo: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
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
    marginTop: 80,
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
    borderColor: TEAL,
    borderWidth: 2,
    backgroundColor: '#e8f6f7',
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
    color: TEAL,
  },
  variantChipTextOut: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
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
    color: TEAL,
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
    borderColor: 'rgba(44, 152, 166, 0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(44, 152, 166, 0.06)',
  },
  detailIntroBtnText: {
    color: TEAL,
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
    backgroundColor: '#e8f6f7',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#b7e0e5',
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


import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { merchantService, Product, ProductCategory, productFormSource, hasPendingProductUpdate } from '../services/supabase';
import { theme } from '../config/theme';
import { feedbackService } from '../services/FeedbackService';
import { autoPrepareProductImageUri, autoPrepareProductImageUris } from '../utils/productImageNative';
import { rewritePublicStorageUrl } from '../services/merchantApi/nativeSupabaseUrl';
import { pickImageFromLibrary } from '../utils/mediaAccess';
import ProductVariantsEditor from '../components/ProductVariantsEditor';
import {
  defaultMerchantProductForm,
  merchantProductFormFromProduct,
  buildMerchantProductDraft,
  type MerchantProductFormState,
} from '../utils/merchantProductForm';
import { formatProductPriceLabel, productHasVariants } from '../utils/productVariants';
import { collectStockAlerts } from '../utils/merchantOpsReport';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStoreUuid(value: unknown): value is string {
  const id = String(value || '').trim();
  return Boolean(id) && id !== 'undefined' && id !== 'null' && STORE_UUID_RE.test(id);
}

async function resolveMerchantStoreId(routeStoreId?: string | null): Promise<string | null> {
  const candidates: unknown[] = [routeStoreId];
  try {
    candidates.push(await AsyncStorage.getItem('userId'));
    const raw = await AsyncStorage.getItem('currentUser');
    if (raw) {
      const user = JSON.parse(raw);
      candidates.push(user?.store_id, user?.id);
    }
  } catch {
    // ignore storage parse errors; route/session fallbacks still apply
  }
  for (const candidate of candidates) {
    if (isStoreUuid(candidate)) return String(candidate).trim();
  }
  return null;
}

export default function MerchantProductsScreen({ route, navigation }: any) {
  const { storeId: routeStoreId, storeName } = route.params || {};
  const { language } = useApp();
  const [storeId, setStoreId] = useState<string>(isStoreUuid(routeStoreId) ? routeStoreId.trim() : '');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 商品表单状态
  const [showProductModal, setShowProductModal] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [productForm, setProductForm] = useState<MerchantProductFormState>(defaultMerchantProductForm());
  const [showDetailImagesPanel, setShowDetailImagesPanel] = useState(false);

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [bulkModalType, setBulkModalType] = useState<'price' | 'discount' | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    feedbackService.show(message, type);
  };

  const t = {
    zh: {
      title: '商品管理',
      addProduct: '添加商品',
      editProduct: '编辑商品',
      name: '商品名称',
      price: '售价',
      discount: '商品优惠(%)',
      stock: '库存',
      available: '已上架',
      unavailable: '已下架',
      deleteConfirm: '确定要删除这个商品吗？',
      deleteSuccess: '商品已删除',
      saveSuccess: '保存成功',
      noProducts: '暂无商品，点击右上角添加',
      infinite: '无限',
      bulkManage: '批量管理',
      selectAll: '全选',
      unselectAll: '取消全选',
      bulkOn: '批量上架',
      bulkOff: '批量下架',
      bulkPrice: '批量改价',
      bulkDiscount: '批量折扣',
      bulkCount: '已选',
      bulkValuePlaceholder: '输入数值',
      productDetail: '商品详情',
      description: '商品描述',
      noDescription: '暂无详细描述',
      detailImages: '商品详细介绍',
      detailImagesHint: '上传多张介绍图，顾客在商品详情页可纵向滚动浏览',
      addDetailImage: '添加图片',
    },
    en: {
      title: 'Products',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      name: 'Name',
      price: 'Price',
      discount: 'Discount (%)',
      stock: 'Stock',
      available: 'On Sale',
      unavailable: 'Off Shelf',
      deleteConfirm: 'Are you sure to delete this product?',
      deleteSuccess: 'Product deleted',
      saveSuccess: 'Saved successfully',
      noProducts: 'No products yet, tap + to add',
      infinite: 'Infinite',
      bulkManage: 'Bulk',
      selectAll: 'Select All',
      unselectAll: 'Unselect All',
      bulkOn: 'Bulk On',
      bulkOff: 'Bulk Off',
      bulkPrice: 'Bulk Price',
      bulkDiscount: 'Bulk Discount',
      bulkCount: 'Selected',
      bulkValuePlaceholder: 'Enter value',
      productDetail: 'Product Details',
      description: 'Description',
      noDescription: 'No description available',
      detailImages: 'Scrolling Pictures',
      detailImagesHint: 'Upload detail images for vertical scrolling in product view',
      addDetailImage: 'Add image',
    },
    my: {
      title: 'ကုန်ပစ္စည်းစီမံခန့်ခွဲမှု',
      addProduct: 'ကုန်ပစ္စည်းအသစ်ထည့်ရန်',
      editProduct: 'ပြင်ဆင်ရန်',
      name: 'အမည်',
      price: 'စျေးနှုန်း',
      discount: 'လျှော့စျေး (%)',
      stock: 'လက်ကျန်',
      available: 'ရောင်းချနေသည်',
      unavailable: 'ခေတ္တရပ်နားထားသည်',
      deleteConfirm: 'ဤကုန်ပစ္စည်းကို ဖျက်ရန် သေချာပါသလား?',
      deleteSuccess: 'ကုန်ပစ္စည်းဖျက်ပြီးပါပြီ',
      saveSuccess: 'သိမ်းဆည်းပြီးပါပြီ',
      noProducts: 'ကုန်ပစ္စည်းမရှိသေးပါ။ အသစ်ထည့်ရန် + ကိုနှိပ်ပါ',
      infinite: 'အကန့်အသတ်မရှိ',
      bulkManage: 'အစုလိုက်',
      selectAll: 'အားလုံးရွေး',
      unselectAll: 'အားလုံးဖျက်',
      bulkOn: 'အစုလိုက်တင်',
      bulkOff: 'အစုလိုက်ပိတ်',
      bulkPrice: 'စျေးပြောင်း',
      bulkDiscount: 'လျှော့စျေးပြောင်း',
      bulkCount: 'ရွေးထား',
      bulkValuePlaceholder: 'တန်ဖိုးထည့်ပါ',
      productDetail: 'ကုန်ပစ္စည်းအသေးစိတ်',
      description: 'ကုန်ပစ္စည်းအကြောင်းအရာ',
      noDescription: 'ဖော်ပြချက်မရှိပါ',
      detailImages: 'Scrolling Pictures',
      detailImagesHint: 'Upload detail images for vertical scrolling in product view',
      addDetailImage: 'Add image',
    }
  };

  const currentT = t[language as keyof typeof t] || t.zh;

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const id = await resolveMerchantStoreId(routeStoreId || storeId);
      if (!id) {
        setProducts([]);
        showToast(
          language === 'zh' ? '无法识别店铺，请重新登录后再试' : 'Store not found. Please sign in again.',
          'error',
        );
        return;
      }
      setStoreId(id);
      const data = await merchantService.getStoreProducts(id);
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

  const pickImage = async () => {
    try {
      const result = await pickImageFromLibrary({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const preparedUri = await autoPrepareProductImageUri(result.assets[0].uri);
        setProductForm((prev) => ({ ...prev, image_url: preparedUri }));
      }
    } catch (error) {
      console.warn('Pick image error:', error);
      try {
        const result = await pickImageFromLibrary({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 1,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          const preparedUri = await autoPrepareProductImageUri(result.assets[0].uri);
          setProductForm((prev) => ({ ...prev, image_url: preparedUri }));
        }
      } catch (retryError) {
        feedbackService.notify('错误', '无法打开相册，请检查权限');
      }
    }
  };

  const pickDetailImages = async () => {
    try {
      const result = await pickImageFromLibrary({
        allowsMultipleSelection: true,
        selectionLimit: 12,
        allowsEditing: false,
        quality: 1,
        mediaTypes: ['images'],
      });
      if (!result.canceled && result.assets?.length) {
        const uris = await autoPrepareProductImageUris(result.assets.map((asset) => asset.uri));
        setProductForm((prev) => ({
          ...prev,
          detail_image_urls: [...prev.detail_image_urls, ...uris],
        }));
        setShowDetailImagesPanel(true);
      }
    } catch (error) {
      console.warn('Pick detail images error:', error);
      feedbackService.notify('错误', '无法打开相册，请检查权限');
    }
  };

  const handleRemoveDetailImage = (index: number) => {
    setProductForm((prev) => ({
      ...prev,
      detail_image_urls: prev.detail_image_urls.filter((_, i) => i !== index),
    }));
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm(defaultMerchantProductForm());
    setShowDetailImagesPanel(false);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm(merchantProductFormFromProduct(product));
    const src = productFormSource(product);
    setShowDetailImagesPanel((src.detail_image_urls?.length ?? 0) > 0);
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    const { draft, error: draftError } = buildMerchantProductDraft(productForm);
    if (draftError) {
      showToast(draftError, 'warning');
      return;
    }

    const activeStoreId = storeId || (await resolveMerchantStoreId(routeStoreId));
    if (!activeStoreId) {
      showToast(
        language === 'zh' ? '无法识别店铺，请重新登录后再试' : 'Store not found. Please sign in again.',
        'error',
      );
      return;
    }
    setStoreId(activeStoreId);

    try {
      setFormLoading(true);
      let finalImageUrl = productForm.image_url;

      // 如果是本地图片路径，先上传
      if (productForm.image_url && (productForm.image_url.startsWith('file://') || productForm.image_url.startsWith('content://'))) {
        console.log('正在上传本地图片:', productForm.image_url);
        const uploadedUrl = await merchantService.uploadProductImage(activeStoreId, productForm.image_url);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
          console.log('图片上传成功:', uploadedUrl);
        } else {
          feedbackService.notify('错误', '图片上传失败，请检查网络或重试。请确保图片已成功上传后再保存商品。\n(提示: 请确保相册授权正常)');
          setFormLoading(false);
          return;
        }
      }

      const finalDetailUrls: string[] = [];
      for (const uri of productForm.detail_image_urls) {
        if (uri.startsWith('file://') || uri.startsWith('content://')) {
          const uploadedUrl = await merchantService.uploadProductImage(activeStoreId, uri);
          if (uploadedUrl) {
            finalDetailUrls.push(uploadedUrl);
          }
        } else if (uri) {
          finalDetailUrls.push(uri);
        }
      }

      const productData: Record<string, unknown> = {
        store_id: activeStoreId,
        ...draft,
        image_url: finalImageUrl,
        detail_image_urls: finalDetailUrls,
      };

      const result = await merchantService.saveMerchantProduct({
        mode: editingProduct ? 'edit' : 'create',
        product: editingProduct ?? null,
        storeId: activeStoreId,
        draft: productData,
      });

      if (result.success) {
        if (!editingProduct || ('pendingReview' in result && result.pendingReview)) {
          showToast(
            language === 'zh'
              ? editingProduct
                ? '修改已提交，待后台审核通过后客户才能看到新内容'
                : '商品已提交，待后台审核通过后将展示给顾客'
              : editingProduct
                ? 'Changes submitted for admin approval'
                : 'Submitted for admin approval',
            'info',
          );
        } else {
          showToast(currentT.saveSuccess, 'success');
        }
        setShowProductModal(false);
        loadProducts();
      } else {
        showToast(language === 'zh' ? '保存失败' : 'Save failed', 'error');
      }
    } catch (error) {
      showToast(language === 'zh' ? '保存异常' : 'Save exception', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      language === 'zh' ? '删除商品' : 'Delete Product',
      currentT.deleteConfirm,
      [
        { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        { 
          text: language === 'zh' ? '确定删除' : 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await merchantService.deleteProduct(productId);
              if (result.success) {
                showToast(currentT.deleteSuccess, 'success');
                setShowProductModal(false); // 🚀 自动关闭弹窗
                setEditingProduct(null); // 🚀 重置编辑状态
                loadProducts();
              } else {
                showToast('删除失败', 'error');
              }
            } catch (error) {
              showToast('删除异常', 'error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkAvailability = async (isAvailable: boolean) => {
    if (selectedProductIds.size === 0) return;
    setBulkLoading(true);
    try {
      const productMap = new Map(products.map(p => [p.id, p]));
      const ids = Array.from(selectedProductIds);
      const results = await Promise.all(
        ids.map(id => {
          const product = productMap.get(id);
          if (!product) return Promise.resolve(null);
          return merchantService.submitMerchantProductChange(product, { is_available: isAvailable });
        }),
      );
      const pendingCount = results.filter(r => r && 'pendingReview' in r && r.pendingReview).length;
      if (pendingCount > 0) {
        showToast(
          language === 'zh'
            ? `${pendingCount} 件商品变更已提交审核`
            : `${pendingCount} change(s) submitted for approval`,
          'info',
        );
      } else {
        showToast(currentT.saveSuccess, 'success');
      }
      setSelectedProductIds(new Set());
      loadProducts();
    } catch (error) {
      showToast(language === 'zh' ? '批量操作失败' : 'Bulk operation failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkEdit = async () => {
    if (!bulkModalType || selectedProductIds.size === 0) return;
    const numericValue = parseFloat(bulkValue);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      showToast(language === 'zh' ? '请输入有效数值' : 'Please enter a valid value', 'warning');
      return;
    }

    setBulkLoading(true);
    try {
      const productMap = new Map(products.map(p => [p.id, p]));
      const ids = Array.from(selectedProductIds);
      let results: Awaited<ReturnType<typeof merchantService.submitMerchantProductChange>>[] = [];
      if (bulkModalType === 'price') {
        results = await Promise.all(
          ids.map(id => {
            const product = productMap.get(id);
            if (!product) return Promise.resolve({ success: false, error: { message: 'not found' } });
            return merchantService.submitMerchantProductChange(product, { price: numericValue });
          }),
        );
      } else {
        if (numericValue <= 0 || numericValue >= 100) {
          showToast(language === 'zh' ? '折扣需在 1-99 之间' : 'Discount must be 1-99', 'warning');
          return;
        }
        results = await Promise.all(
          ids.map(id => {
            const product = productMap.get(id);
            if (!product) return Promise.resolve({ success: false, error: { message: 'not found' } });
            const originalPrice = Math.round(product.price / (1 - numericValue / 100));
            return merchantService.submitMerchantProductChange(product, { original_price: originalPrice });
          }),
        );
      }
      const pendingCount = results.filter(r => r.success && 'pendingReview' in r && r.pendingReview).length;
      if (pendingCount > 0) {
        showToast(
          language === 'zh'
            ? `${pendingCount} 件商品变更已提交审核`
            : `${pendingCount} change(s) submitted for approval`,
          'info',
        );
      } else {
        showToast(currentT.saveSuccess, 'success');
      }
      setSelectedProductIds(new Set());
      setBulkModalType(null);
      setBulkValue('');
      loadProducts();
    } catch (error) {
      showToast(language === 'zh' ? '批量操作失败' : 'Bulk operation failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const result = await merchantService.toggleAvailability(product);
      if (result.success) {
        loadProducts();
        if ('pendingReview' in result && result.pendingReview) {
          showToast(
            language === 'zh'
              ? '上下架变更已提交，待后台审核通过后生效'
              : 'Availability change submitted for approval',
            'info',
          );
        } else {
          showToast(currentT.saveSuccess, 'success');
        }
      }
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const stockAlerts = useMemo(() => collectStockAlerts(products), [products]);
  const outOfStockIds = useMemo(
    () => new Set(stockAlerts.filter((item) => item.level === 'out').map((item) => item.productId)),
    [stockAlerts],
  );
  const lowStockIds = useMemo(
    () => new Set(stockAlerts.filter((item) => item.level === 'low').map((item) => item.productId)),
    [stockAlerts],
  );

  const renderProductItem = ({ item }: { item: Product }) => {
    const isSelected = selectedProductIds.has(item.id);
    const stockTone = outOfStockIds.has(item.id)
      ? '#fecaca'
      : lowStockIds.has(item.id)
        ? '#fde68a'
        : undefined;
    
    return (
      <TouchableOpacity 
        style={[
          styles.productCard, 
          { width: '100%', flexDirection: 'row', alignItems: 'center' },
          stockTone ? { backgroundColor: stockTone } : null,
        ]}
        onPress={() => handleOpenEditProduct(item)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={[styles.selectCircle, isSelected && styles.selectCircleActive]}
          onPress={() => toggleSelectProduct(item.id)}
        >
          {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
        </TouchableOpacity>
        <View style={styles.productImageContainerList}>
          {item.image_url && !item.image_url.startsWith('file://') ? (
            <Image source={{ uri: rewritePublicStorageUrl(item.image_url) }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#cbd5e1" />
            </View>
          )}
          {!item.is_available && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>{currentT.unavailable}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              {formatProductPriceLabel(item, language === 'en' ? 'en' : 'zh')}
            </Text>
            {!productHasVariants(item) && item.original_price && item.original_price > item.price && (
              <Text style={styles.originalPrice}>{item.original_price.toLocaleString()} MMK</Text>
            )}
          </View>
          
          <View style={styles.stockRow}>
            <Ionicons name="cube-outline" size={14} color="#64748b" />
            <Text style={styles.productStock}>
              {currentT.stock}: {item.stock === -1 ? currentT.infinite : item.stock}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={[styles.statusIndicator, { backgroundColor: item.is_available ? '#dcfce7' : '#fee2e2', marginTop: 0 }]}>
              <Text style={[styles.statusText, { color: item.is_available ? '#15803d' : '#ef4444' }]}>
                {item.is_available ? currentT.available : currentT.unavailable}
              </Text>
            </View>
            <View style={{ marginLeft: 10 }}>
              <Switch
                value={item.is_available}
                onValueChange={() => toggleProductStatus(item)}
                trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                thumbColor="#ffffff"
                style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : {}}
              />
            </View>
          </View>
          {(item.listing_status === 'pending' ||
            item.listing_status === 'rejected' ||
            hasPendingProductUpdate(item) ||
            !!item.listing_review_notes?.trim()) && (
            <Text style={{ marginTop: 6, fontSize: 12, fontWeight: '700', color: item.listing_status === 'rejected' ? '#b91c1c' : '#b45309' }}>
              {hasPendingProductUpdate(item) && item.listing_status === 'approved'
                ? language === 'zh'
                  ? '修改待审核'
                  : 'Edit pending'
                : item.listing_status === 'pending'
                  ? language === 'zh'
                    ? '待后台审核'
                    : 'Pending approval'
                  : item.listing_status === 'rejected'
                    ? language === 'zh'
                      ? '审核未通过'
                      : 'Rejected'
                    : language === 'zh'
                      ? '修改未通过'
                      : 'Edit rejected'}
            </Text>
          )}
          {!!item.listing_review_notes?.trim() && (
            <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: '#b91c1c' }}>
              {language === 'zh' ? '原因：' : 'Reason: '}
              {item.listing_review_notes.trim()}
            </Text>
          )}
        </View>

        <View style={styles.productActions}>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
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
              onPress={handleOpenAddProduct}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={28} color="white" />
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
            contentContainerStyle={[styles.listContent, { paddingBottom: 180 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
            }
            ListHeaderComponent={
              stockAlerts.length > 0 ? (
                <View
                  style={{
                    backgroundColor: '#fff7ed',
                    borderColor: '#fdba74',
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontWeight: '800', color: '#9a3412' }}>
                    {language === 'zh' ? '缺货提醒' : 'Stock alerts'}
                  </Text>
                  <Text style={{ marginTop: 4, color: '#9a3412', fontWeight: '700' }}>
                    {language === 'zh'
                      ? `${stockAlerts.filter((a) => a.level === 'out').length} 件缺货 · ${stockAlerts.filter((a) => a.level === 'low').length} 件库存偏低（≤3）`
                      : `${stockAlerts.filter((a) => a.level === 'out').length} out · ${stockAlerts.filter((a) => a.level === 'low').length} low (≤3)`}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="basket-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyText}>{currentT.noProducts}</Text>
              </View>
            }
          />
        )}

        <View style={styles.bulkBar}>
            <View style={styles.bulkHeaderRow}>
              <TouchableOpacity style={styles.bulkSelectBtn} onPress={handleSelectAll}>
                <Text style={styles.bulkSelectText}>
                  {selectedProductIds.size === products.length ? currentT.unselectAll : currentT.selectAll}
                </Text>
              </TouchableOpacity>
              <View style={styles.bulkCountBadge}>
                <Text style={styles.bulkCountText}>
                  {currentT.bulkCount}: {selectedProductIds.size}
                </Text>
              </View>
            </View>
            <View style={styles.bulkActions}>
              <TouchableOpacity style={styles.bulkActionBtn} onPress={() => handleBulkAvailability(true)} disabled={bulkLoading || selectedProductIds.size === 0}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#1d4ed8" />
                <Text style={styles.bulkActionText}>{currentT.bulkOn}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkActionBtn} onPress={() => handleBulkAvailability(false)} disabled={bulkLoading || selectedProductIds.size === 0}>
                <Ionicons name="close-circle-outline" size={16} color="#1d4ed8" />
                <Text style={styles.bulkActionText}>{currentT.bulkOff}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkActionBtn} onPress={() => setBulkModalType('price')} disabled={bulkLoading || selectedProductIds.size === 0}>
                <Ionicons name="pricetag-outline" size={16} color="#1d4ed8" />
                <Text style={styles.bulkActionText}>{currentT.bulkPrice}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkActionBtn} onPress={() => setBulkModalType('discount')} disabled={bulkLoading || selectedProductIds.size === 0}>
                <Ionicons name="pricetags-outline" size={16} color="#1d4ed8" />
                <Text style={styles.bulkActionText}>{currentT.bulkDiscount}</Text>
              </TouchableOpacity>
            </View>
          </View>
      </View>

      <Modal
        visible={bulkModalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bulkModalContent}>
            <View style={styles.bulkModalHeader}>
              <Text style={styles.bulkModalTitle}>
                {bulkModalType === 'price' ? currentT.bulkPrice : currentT.bulkDiscount}
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setBulkModalType(null)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.bulkFormGroup}>
              <Text style={styles.bulkFormLabel}>
                {bulkModalType === 'price' ? currentT.bulkValuePlaceholder : `${currentT.bulkDiscount} (%)`}
              </Text>
              <View style={styles.bulkInputRow}>
                <TextInput
                  style={[styles.bulkFormInput, bulkModalType === 'discount' && { paddingRight: 44 }]}
                  value={bulkValue}
                  onChangeText={(text) => setBulkValue(text.replace(/[^\d]/g, ''))}
                  keyboardType="numeric"
                  placeholder={bulkModalType === 'price' ? currentT.bulkValuePlaceholder : '10'}
                />
                {bulkModalType === 'discount' && (
                  <View style={styles.bulkSuffix}>
                    <Text style={styles.bulkSuffixText}>%</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.bulkModalFooter}>
              <TouchableOpacity style={styles.bulkSaveBtn} onPress={handleBulkEdit} disabled={bulkLoading}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.bulkSaveGradient}>
                  {bulkLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.bulkSaveText}>{language === 'zh' ? '保存' : 'Save'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 添加/编辑商品模态框 */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? currentT.editProduct : currentT.addProduct}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setShowProductModal(false)}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 图片上传区域 */}
              <TouchableOpacity 
                style={styles.imageUploadBox} 
                onPress={pickImage}
                activeOpacity={0.6}
              >
                {productForm.image_url ? (
                  <Image source={{ uri: rewritePublicStorageUrl(productForm.image_url) }} style={styles.uploadedImage} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera-outline" size={40} color="#94a3b8" />
                    <Text style={styles.uploadText}>点击上传商品图片</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{currentT.name} *</Text>
                <TextInput
                  style={styles.formInput}
                  value={productForm.name}
                  onChangeText={(text) => setProductForm({ ...productForm, name: text })}
                  placeholder="如：冰镇可乐 330ml"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{currentT.description} (详细介绍商品细节)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={productForm.description}
                  onChangeText={(text) => setProductForm({ ...productForm, description: text })}
                  placeholder="请输入商品详细描述信息，例如：规格、口味、保质期、使用方法等..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.detailImagesBtn}
                onPress={() => setShowDetailImagesPanel((v) => !v)}
                activeOpacity={0.85}
              >
                <Ionicons name="images-outline" size={18} color="#3b82f6" />
                <Text style={styles.detailImagesBtnText}>
                  {currentT.detailImages}
                  {productForm.detail_image_urls.length > 0
                    ? ` (${productForm.detail_image_urls.length})`
                    : ''}
                </Text>
              </TouchableOpacity>

              {showDetailImagesPanel ? (
                <View style={styles.detailImagesPanel}>
                  <Text style={styles.detailImagesHint}>{currentT.detailImagesHint}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailImagesScroll}>
                    {productForm.detail_image_urls.map((uri, idx) => (
                      <View key={`${uri}-${idx}`} style={styles.detailImageThumbWrap}>
                        <Image source={{ uri: rewritePublicStorageUrl(uri) }} style={styles.detailImageThumb} />
                        <TouchableOpacity
                          style={styles.detailImageRemove}
                          onPress={() => handleRemoveDetailImage(idx)}
                        >
                          <Ionicons name="close" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.detailImageAdd} onPress={pickDetailImages}>
                      <Ionicons name="add" size={24} color="#64748b" />
                      <Text style={styles.detailImageAddText}>{currentT.addDetailImage}</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              ) : null}

              <ProductVariantsEditor
                enabled={productForm.use_variants}
                onEnabledChange={(use_variants) =>
                  setProductForm((prev) => ({ ...prev, use_variants }))
                }
                variants={productForm.variants}
                onChange={(variants) => setProductForm((prev) => ({ ...prev, variants }))}
                language={language === 'en' ? 'en' : 'zh'}
              />

              {!productForm.use_variants ? (
              <>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{currentT.price} (MMK) *</Text>
                <TextInput
                  style={styles.formInput}
                  value={productForm.price}
                  onChangeText={(text) => setProductForm({ ...productForm, price: text.replace(/[^\d]/g, '') })}
                  placeholder="输入价格"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{currentT.discount}</Text>
                <TextInput
                  style={styles.formInput}
                  value={productForm.discountPercent}
                  onChangeText={(text) => setProductForm({ ...productForm, discountPercent: text.replace(/[^\d]/g, '') })}
                  placeholder="输入优惠百分比（如 10）"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{currentT.stock} (-1代表无限)</Text>
                <TextInput
                  style={styles.formInput}
                  value={productForm.stock}
                  onChangeText={(text) => setProductForm({ ...productForm, stock: text })}
                  placeholder="输入库存数量"
                  keyboardType="numeric"
                />
              </View>
              </>
              ) : null}

              <View style={styles.switchGroup}>
                <Text style={styles.formLabel}>是否上架</Text>
                <Switch
                  value={productForm.is_available}
                  onValueChange={(val) => setProductForm({ ...productForm, is_available: val })}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                />
              </View>

              <View style={styles.modalFooter}>
                {editingProduct && (
                  <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => handleDeleteProduct(editingProduct.id)}
                  >
                    <Ionicons name="trash-outline" size={24} color="#ef4444" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setShowProductModal(false)}
                >
                  <Text style={styles.cancelBtnText}>{language === 'zh' ? '取消' : 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.saveBtnSmall, formLoading && styles.disabledBtn]} 
                  onPress={handleSaveProduct}
                  disabled={formLoading}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    style={styles.saveBtnGradient}
                  >
                    {formLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.saveBtnText}>{language === 'zh' ? '保存' : 'Save'}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
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
  highlightedCard: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    backgroundColor: '#eff6ff',
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
  },
  selectCircleActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  productImageContainerGrid: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  productImageContainerList: {
    width: 80,
    height: 80,
    borderRadius: 12,
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
  productInfo: {
    flex: 1,
    marginLeft: 12,
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
    gap: 4,
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#64748b',
  },
  statusIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  productActions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  editBtn: {
    padding: 8,
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
  bulkModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    ...theme.shadows.large,
  },
  bulkModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  bulkModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  bulkFormGroup: {
    marginBottom: 18,
  },
  bulkFormLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  bulkInputRow: {
    position: 'relative',
  },
  bulkFormInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  bulkSuffix: {
    position: 'absolute',
    right: 10,
    top: 8,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkSuffixText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  bulkModalFooter: {
    alignItems: 'center',
  },
  bulkSaveBtn: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bulkSaveGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkSaveText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 12,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadBox: {
    width: '100%',
    height: 180,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  detailImagesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  detailImagesBtnText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  detailImagesPanel: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailImagesHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 18,
  },
  detailImagesScroll: {
    flexGrow: 0,
  },
  detailImageThumbWrap: {
    position: 'relative',
    marginRight: 10,
  },
  detailImageThumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  detailImageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImageAdd: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  detailImageAddText: {
    marginTop: 4,
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  deleteBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtnSmall: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  // 客户操作样式（直接在卡片上）
  customerActionContainer: {
    marginTop: 10,
    gap: 8,
  },
  smallQuantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 2,
    alignSelf: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  bulkBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(241, 245, 249, 0.8)',
  },
  bulkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bulkSelectBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bulkSelectText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '800',
  },
  bulkCountBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bulkCountText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '700',
  },
  bulkActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bulkActionBtn: {
    flexBasis: '48%',
    height: 42,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bulkActionText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '800',
  },
  // 详情模态框样式
  detailImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f1f5f9',
  },
  detailImagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailInfoContainer: {
    padding: 24,
    flex: 1,
  },
  detailHeader: {
    marginBottom: 20,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  detailPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  detailPrice: {
    fontSize: 22,
    color: '#10b981',
    fontWeight: '900',
  },
  detailOriginalPrice: {
    fontSize: 16,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  detailScroll: {
    flex: 1,
    marginBottom: 20,
  },
  detailScrollingImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#e2e8f0',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 10,
  },
  detailSection: {
    marginBottom: 16,
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
    color: '#64748b',
    lineHeight: 22,
  },
  detailFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  detailAddBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailAddGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAddText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
});


import React, { useState, useEffect } from 'react';
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
  Dimensions,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../contexts/AppContext';
import { merchantService, Product, ProductCategory } from '../services/supabase';
import { theme } from '../config/theme';
import Toast from '../components/Toast';

const { width } = Dimensions.get('window');

export default function MerchantProductsScreen({ route, navigation }: any) {
  const { storeId } = route.params;
  const { language } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 商品表单状态
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '-1',
    image_url: '',
    is_available: true,
  });

  // Toast状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const t = {
    zh: {
      title: '商品管理',
      addProduct: '添加商品',
      editProduct: '编辑商品',
      name: '商品名称',
      price: '售价',
      stock: '库存',
      available: '已上架',
      unavailable: '已下架',
      deleteConfirm: '确定要删除这个商品吗？',
      deleteSuccess: '商品已删除',
      saveSuccess: '保存成功',
      noProducts: '暂无商品，点击右上角添加',
      infinite: '无限',
    },
    en: {
      title: 'Products',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      name: 'Name',
      price: 'Price',
      stock: 'Stock',
      available: 'On Sale',
      unavailable: 'Off Shelf',
      deleteConfirm: 'Are you sure to delete this product?',
      deleteSuccess: 'Product deleted',
      saveSuccess: 'Saved successfully',
      noProducts: 'No products yet, tap + to add',
      infinite: 'Infinite',
    },
    my: {
      title: 'ကုန်ပစ္စည်းစီမံခန့်ခွဲမှု',
      addProduct: 'ကုန်ပစ္စည်းအသစ်ထည့်ရန်',
      editProduct: 'ပြင်ဆင်ရန်',
      name: 'အမည်',
      price: 'စျေးနှုန်း',
      stock: 'လက်ကျန်',
      available: 'ရောင်းချနေသည်',
      unavailable: 'ခေတ္တရပ်နားထားသည်',
      deleteConfirm: 'ဤကုန်ပစ္စည်းကို ဖျက်ရန် သေချာပါသလား?',
      deleteSuccess: 'ကုန်ပစ္စည်းဖျက်ပြီးပါပြီ',
      saveSuccess: 'သိမ်းဆည်းပြီးပါပြီ',
      noProducts: 'ကုန်ပစ္စည်းမရှိသေးပါ။ အသစ်ထည့်ရန် + ကိုနှိပ်ပါ',
      infinite: 'အကန့်အသတ်မရှိ',
    }
  };

  const currentT = t[language as keyof typeof t] || t.zh;

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await merchantService.getStoreProducts(storeId);
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册权限才能选择图片');
        return;
      }

      // 使用兼容性写法，优先尝试新版 API，失败则回退
      const options: any = {
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      };

      // 尝试使用字符串数组，这是新版 Expo 推荐的写法
      options.mediaTypes = ['images'];

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setProductForm(prev => ({ ...prev, image_url: uri }));
      }
    } catch (error) {
      console.error('Pick image error:', error);
      // 如果 ['images'] 报错，尝试回退到旧版 MediaTypeOptions
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setProductForm(prev => ({ ...prev, image_url: result.assets[0].uri }));
        }
      } catch (retryError) {
        Alert.alert('错误', '无法打开相册，请检查权限');
      }
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: '',
      stock: '-1',
      image_url: '',
      is_available: true,
    });
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      image_url: product.image_url || '',
      is_available: product.is_available,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) {
      showToast(language === 'zh' ? '请填写名称和价格' : 'Please fill name and price', 'warning');
      return;
    }

    try {
      setFormLoading(true);
      let finalImageUrl = productForm.image_url;

      // 如果是本地图片路径，先上传
      if (productForm.image_url && (productForm.image_url.startsWith('file://') || productForm.image_url.startsWith('content://'))) {
        const uploadedUrl = await merchantService.uploadProductImage(storeId, productForm.image_url);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          Alert.alert('错误', '图片上传失败，请检查网络或重试');
          setFormLoading(false);
          return;
        }
      }

      const productData = {
        store_id: storeId,
        name: productForm.name,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock),
        image_url: finalImageUrl,
        is_available: productForm.is_available,
      };

      let result;
      if (editingProduct) {
        result = await merchantService.updateProduct(editingProduct.id, productData);
      } else {
        result = await merchantService.addProduct(productData);
      }

      if (result.success) {
        showToast(currentT.saveSuccess, 'success');
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

  const toggleProductStatus = async (product: Product) => {
    try {
      const success = await merchantService.toggleAvailability(product.id, !product.is_available);
      if (success) {
        setProducts(products.map(p => 
          p.id === product.id ? { ...p, is_available: !p.is_available } : p
        ));
        showToast(currentT.saveSuccess, 'success');
      }
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => handleOpenEditProduct(item)}
    >
      <View style={styles.productImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
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
        <Text style={styles.productPrice}>{item.price.toLocaleString()} MMK</Text>
        <View style={styles.stockRow}>
          <Ionicons name="cube-outline" size={14} color="#64748b" />
          <Text style={styles.productStock}>
            {currentT.stock}: {item.stock === -1 ? currentT.infinite : item.stock}
          </Text>
        </View>
      </View>

      <View style={styles.productActions}>
        <Switch
          value={item.is_available}
          onValueChange={() => toggleProductStatus(item)}
          trackColor={{ false: '#cbd5e1', true: '#10b981' }}
          thumbColor="#ffffff"
        />
        <View style={styles.editBtn}>
          <Ionicons name="create-outline" size={20} color="#3b82f6" />
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>{currentT.title}</Text>
          <TouchableOpacity 
            onPress={handleOpenAddProduct}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
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
                  <Image source={{ uri: productForm.image_url }} style={styles.uploadedImage} />
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
                <Text style={styles.formLabel}>{currentT.stock} (-1代表无限)</Text>
                <TextInput
                  style={styles.formInput}
                  value={productForm.stock}
                  onChangeText={(text) => setProductForm({ ...productForm, stock: text })}
                  placeholder="输入库存数量"
                  keyboardType="numeric"
                />
              </View>

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

      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    ...theme.shadows.small,
  },
  productImageContainer: {
    width: 70,
    height: 70,
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
    marginLeft: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    color: '#10b981',
    fontWeight: '700',
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#64748b',
  },
  productActions: {
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
});


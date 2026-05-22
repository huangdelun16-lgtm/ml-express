import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate } from 'react-router-dom';
import { merchantService, deliveryStoreService, Product, DeliveryStore } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/merchantProductsPage.css';

const StoreProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, t: allT } = useLanguage();
  const t = allT.profile;
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // 🚀 商品编辑状态
  const [showAddEditProductModal, setShowAddEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    discount_percent: '',
    stock: '-1',
    image_url: '',
    is_available: true
  });

  const loadStoreData = useCallback(async (storeId: string) => {
    setLoading(true);
    try {
      const [storeData, productsData] = await Promise.all([
        deliveryStoreService.getStoreById(storeId),
        merchantService.getStoreProducts(storeId)
      ]);
      setStore(storeData);
      setProducts(productsData);
    } catch (error) {
      LoggerService.error('Failed to load store data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        const storeId = user.store_id || user.id;
        if (storeId) {
          loadStoreData(storeId);
        }
      } catch (e) {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate, loadStoreData]);

  // 🚀 操作函数
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: '',
      discount_percent: '',
      stock: '-1',
      image_url: '',
      is_available: true
    });
    setShowAddEditProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    
    let discountPercent = '';
    if (product.original_price && product.original_price > product.price) {
      discountPercent = Math.round((1 - product.price / product.original_price) * 100).toString();
    }

    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      discount_percent: discountPercent,
      stock: product.stock.toString(),
      image_url: product.image_url || '',
      is_available: product.is_available
    });
    setShowAddEditProductModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const storeId = currentUser?.store_id || currentUser?.id;
    if (!file || !storeId) return;

    try {
      setIsUploading(true);
      const url = await merchantService.uploadProductImage(storeId, file);
      if (url) {
        setProductForm(prev => ({ ...prev, image_url: url }));
      }
    } catch (error) {
      LoggerService.error('图片上传失败:', error);
      alert(language === 'zh' ? '图片上传失败，请重试' : 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    const storeId = currentUser?.store_id || currentUser?.id;
    if (!productForm.name || !productForm.price || !storeId) {
      alert(language === 'zh' ? '请填写必要信息' : 'Please fill required fields');
      return;
    }

    try {
      setIsSaving(true);
      
      const price = parseFloat(productForm.price);
      const discountPercent = parseFloat(productForm.discount_percent);
      let originalPrice = undefined;
      
      if (!isNaN(discountPercent) && discountPercent > 0 && discountPercent < 100) {
        originalPrice = Math.round(price / (1 - discountPercent / 100));
      }

      let productData: Record<string, unknown> = {
        store_id: storeId,
        name: productForm.name,
        price: price,
        original_price: originalPrice,
        stock: parseInt(productForm.stock),
        image_url: productForm.image_url,
        is_available: productForm.is_available,
        description: productForm.description
      };

      let result;
      if (editingProduct) {
        if (editingProduct.listing_status === 'rejected') {
          productData = { ...productData, listing_status: 'pending' };
        }
        result = await merchantService.updateProduct(editingProduct.id, productData as Partial<Product>);
      } else {
        result = await merchantService.addProduct(productData as Omit<Product, 'id' | 'created_at' | 'updated_at' | 'sales_count'>);
      }

      if (result.success) {
        setShowAddEditProductModal(false);
        await loadStoreData(storeId);
        if (!editingProduct) {
          alert(language === 'zh' ? '商品已提交，待后台审核通过后将展示给顾客。' : 'Submitted. Visible to customers after admin approval.');
        }
      } else {
        alert(language === 'zh' ? '保存失败，请重试' : 'Save failed');
      }
    } catch (error) {
      LoggerService.error('保存商品失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm(language === 'zh' ? '确定要删除该商品吗？' : 'Delete this product?')) return;
    
    try {
      setIsSaving(true);
      const result = await merchantService.deleteProduct(productId);
      if (result.success) {
        setShowAddEditProductModal(false);
        const storeId = currentUser?.store_id || currentUser?.id;
        if (storeId) await loadStoreData(storeId);
      } else {
        alert(language === 'zh' ? '删除失败' : 'Delete failed');
      }
    } catch (error) {
      LoggerService.error('删除商品失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      const result = await merchantService.toggleAvailability(product.id, !product.is_available);
      if (result.success) {
        const storeId = currentUser?.store_id || currentUser?.id;
        if (storeId) await loadStoreData(storeId);
      }
    } catch (error) {
      LoggerService.error('切换状态失败:', error);
    }
  };

  const productStats = useMemo(() => {
    const onSale = products.filter((p) => p.is_available).length;
    const pending = products.filter((p) => p.listing_status === 'pending').length;
    return { total: products.length, onSale, pending };
  }, [products]);

  const saleLabel =
    language === 'zh' ? '在售' : language === 'en' ? 'On sale' : 'ရောင်းချ中';
  const pendingLabel =
    language === 'zh' ? '待审核' : language === 'en' ? 'Pending' : 'စောင့်ဆိုင်း';

  return (
    <div className="merchant-products-page">
      <header className="merchant-products-hero">
        <div className="merchant-products-hero__brand">
          <div className="merchant-products-hero__icon" aria-hidden>
            🛍️
          </div>
          <div className="merchant-products-hero__titles">
            <h1>{t?.myProducts || '商品管理'}</h1>
            <p>
              {store?.store_name || currentUser?.name || '—'}
              {' · '}
              {language === 'zh'
                ? `共 ${productStats.total} 件商品`
                : `${productStats.total} products`}
            </p>
          </div>
        </div>

        <div className="merchant-products-hero__actions">
          {!loading && productStats.total > 0 ? (
            <div className="merchant-products-stats">
              <span className="merchant-products-stat">
                {language === 'zh' ? '全部' : 'All'} {productStats.total}
              </span>
              <span className="merchant-products-stat merchant-products-stat--sale">
                {saleLabel} {productStats.onSale}
              </span>
              {productStats.pending > 0 ? (
                <span className="merchant-products-stat merchant-products-stat--pending">
                  {pendingLabel} {productStats.pending}
                </span>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className="merchant-products-btn-primary"
            onClick={handleOpenAddProduct}
          >
            <span aria-hidden>+</span>
            {t?.addProduct || '添加商品'}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="merchant-products-loading">
          <div className="merchant-products-loading__spinner" />
        </div>
      ) : products.length === 0 ? (
        <div className="merchant-products-empty">
          <div className="merchant-products-empty__icon" aria-hidden>
            🛍️
          </div>
          <h3>{t?.noProducts || '暂无商品数据'}</h3>
          <button
            type="button"
            className="merchant-products-btn-primary"
            onClick={handleOpenAddProduct}
          >
            {language === 'zh' ? '立即添加商品' : 'Add your first product'}
          </button>
        </div>
      ) : (
        <div className="merchant-products-grid">
          {products.map((product) => (
            <article key={product.id} className="merchant-product-card">
              <div className="merchant-product-card__media">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} loading="lazy" />
                ) : (
                  <span className="merchant-product-card__placeholder" aria-hidden>
                    📦
                  </span>
                )}
                <button
                  type="button"
                  className={`merchant-product-card__badge ${
                    product.is_available
                      ? 'merchant-product-card__badge--on'
                      : 'merchant-product-card__badge--off'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleAvailability(product);
                  }}
                >
                  {product.is_available
                    ? language === 'zh'
                      ? '在售'
                      : 'ON'
                    : language === 'zh'
                      ? '下架'
                      : 'OFF'}
                </button>
                {product.original_price && product.original_price > product.price ? (
                  <span className="merchant-product-card__discount">
                    {Math.round((1 - product.price / product.original_price) * 100)}% OFF
                  </span>
                ) : null}
              </div>

              <div className="merchant-product-card__body">
                <h3 className="merchant-product-card__name" title={product.name}>
                  {product.name}
                </h3>

                <div className="merchant-product-card__price-row">
                  <span className="merchant-product-card__price">
                    {product.price.toLocaleString()}
                  </span>
                  <span className="merchant-product-card__currency">MMK</span>
                  {product.original_price && product.original_price > product.price ? (
                    <span className="merchant-product-card__original">
                      {product.original_price.toLocaleString()}
                    </span>
                  ) : null}
                </div>

                <div className="merchant-product-card__meta">
                  <div>
                    <span className="merchant-product-card__meta-label">
                      {t?.productStock || '库存'}
                    </span>
                    <span className="merchant-product-card__meta-value">
                      {product.stock === -1
                        ? t?.stockInfinite || '无限'
                        : `${product.stock}`}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="merchant-product-card__meta-label">
                      {language === 'zh' ? '销量' : 'Sales'}
                    </span>
                    <span className="merchant-product-card__meta-value merchant-product-card__meta-value--sales">
                      {product.sales_count || 0}
                    </span>
                  </div>
                </div>

                {(product.listing_status === 'pending' ||
                  product.listing_status === 'rejected') && (
                  <div
                    className={`merchant-product-card__status ${
                      product.listing_status === 'pending'
                        ? 'merchant-product-card__status--pending'
                        : 'merchant-product-card__status--rejected'
                    }`}
                  >
                    {product.listing_status === 'pending'
                      ? language === 'zh'
                        ? '⏳ 待后台审核'
                        : '⏳ Pending approval'
                      : language === 'zh'
                        ? '✕ 审核未通过'
                        : '✕ Rejected'}
                  </div>
                )}

                <button
                  type="button"
                  className="merchant-product-card__edit"
                  onClick={() => handleOpenEditProduct(product)}
                >
                  {t?.editProduct || '编辑商品'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showAddEditProductModal && (
        <div
          className="merchant-product-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddEditProductModal(false);
          }}
        >
          <div className="merchant-product-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="merchant-product-modal__close"
              onClick={() => setShowAddEditProductModal(false)}
              aria-label={language === 'zh' ? '关闭' : 'Close'}
            >
              ×
            </button>

            <h2 className="merchant-product-modal__title">
              {editingProduct ? t?.editProduct : t?.addProduct}
            </h2>

            <div className="merchant-product-modal__form">
              <div
                className="merchant-product-modal__upload"
                onClick={() => productFileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    productFileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {productForm.image_url ? (
                  <img src={productForm.image_url} alt="" />
                ) : (
                  <>
                    <span style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }} aria-hidden>
                      📸
                    </span>
                    <span className="merchant-product-modal__upload-hint">
                      {isUploading
                        ? t?.uploading || '上传中...'
                        : t?.uploadImage || '上传商品图片'}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  ref={productFileInputRef}
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
              </div>

              <div>
                <label className="merchant-product-modal__label" htmlFor="product-name">
                  {t?.productName} *
                </label>
                <input
                  id="product-name"
                  type="text"
                  className="merchant-product-modal__input"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder={language === 'zh' ? '输入商品名称' : 'Product name'}
                />
              </div>

              <div>
                <label className="merchant-product-modal__label" htmlFor="product-desc">
                  {language === 'zh' ? '商品描述' : 'Description'}
                </label>
                <textarea
                  id="product-desc"
                  className="merchant-product-modal__textarea"
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description: e.target.value })
                  }
                  placeholder={language === 'zh' ? '输入商品详情描述...' : 'Details...'}
                />
              </div>

              <div className="merchant-product-modal__row">
                <div>
                  <label className="merchant-product-modal__label" htmlFor="product-price">
                    {t?.productPrice} (MMK) *
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    className="merchant-product-modal__input"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="merchant-product-modal__label" htmlFor="product-discount">
                    {t?.productDiscount} (%)
                  </label>
                  <input
                    id="product-discount"
                    type="number"
                    className="merchant-product-modal__input"
                    value={productForm.discount_percent}
                    onChange={(e) =>
                      setProductForm({ ...productForm, discount_percent: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="merchant-product-modal__label" htmlFor="product-stock">
                  {t?.productStock} (-1={t?.stockInfinite})
                </label>
                <input
                  id="product-stock"
                  type="number"
                  className="merchant-product-modal__input"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                />
              </div>

              <div className="merchant-product-modal__toggle-row">
                <span className="merchant-product-modal__toggle-label">
                  {t?.isAvailable || '是否上架'}
                </span>
                <button
                  type="button"
                  className={`merchant-product-modal__toggle ${
                    productForm.is_available
                      ? 'merchant-product-modal__toggle--on'
                      : 'merchant-product-modal__toggle--off'
                  }`}
                  onClick={() =>
                    setProductForm({ ...productForm, is_available: !productForm.is_available })
                  }
                  aria-pressed={productForm.is_available}
                >
                  <span
                    className={`merchant-product-modal__toggle-knob ${
                      productForm.is_available
                        ? 'merchant-product-modal__toggle-knob--on'
                        : 'merchant-product-modal__toggle-knob--off'
                    }`}
                  />
                </button>
              </div>

              <div className="merchant-product-modal__actions">
                {editingProduct ? (
                  <button
                    type="button"
                    className="merchant-product-modal__btn-delete"
                    onClick={() => handleDeleteProduct(editingProduct.id)}
                    disabled={isSaving}
                  >
                    🗑️ {t?.delete}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="merchant-product-modal__btn-save"
                  onClick={handleSaveProduct}
                  disabled={isSaving || isUploading}
                >
                  {isSaving
                    ? '...'
                    : editingProduct
                      ? `💾 ${t?.save}`
                      : `✨ ${t?.addProduct}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreProductsPage;

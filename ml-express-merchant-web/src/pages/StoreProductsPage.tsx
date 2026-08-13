import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate } from 'react-router-dom';
import { merchantService, deliveryStoreService, Product, DeliveryStore, hasPendingProductUpdate } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { autoPrepareProductImageForUpload } from '../utils/productImagePrepare';
import ProductVariantsEditor from '../components/ProductVariantsEditor';
import '../styles/productVariantsEditor.css';
import {
  defaultMerchantProductForm,
  merchantProductFormFromProduct,
  buildMerchantProductDraft,
  type MerchantProductFormState,
} from '../utils/merchantProductForm';
import { formatProductPriceLabel, productHasVariants } from '../utils/productVariants';
import '../styles/merchantProductsPage.css';
import { feedbackService } from '../services/FeedbackService';

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
  const detailImagesFileInputRef = useRef<HTMLInputElement>(null);
  
  const [productForm, setProductForm] = useState<MerchantProductFormState>(defaultMerchantProductForm());
  const [showDetailImagesPanel, setShowDetailImagesPanel] = useState(false);
  const [isUploadingDetailImages, setIsUploadingDetailImages] = useState(false);

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
    setProductForm(defaultMerchantProductForm());
    setShowDetailImagesPanel(false);
    setShowAddEditProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm(merchantProductFormFromProduct(product));
    setShowDetailImagesPanel((product.detail_image_urls?.length ?? 0) > 0);
    setShowAddEditProductModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const storeId = currentUser?.store_id || currentUser?.id;
    if (!file || !storeId) return;

    try {
      setIsUploading(true);
      const prepared = await autoPrepareProductImageForUpload(file);
      const url = await merchantService.uploadProductImage(storeId, prepared);
      if (url) {
        setProductForm((prev) => ({ ...prev, image_url: url }));
      }
    } catch (error) {
      LoggerService.error('图片上传失败:', error);
      feedbackService.notify(language === 'zh' ? '图片上传失败，请重试' : 'Image upload failed');
    } finally {
      setIsUploading(false);
      if (productFileInputRef.current) productFileInputRef.current.value = '';
    }
  };

  const handleDetailImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const storeId = currentUser?.store_id || currentUser?.id;
    if (!files.length || !storeId) return;

    try {
      setIsUploadingDetailImages(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const prepared = await autoPrepareProductImageForUpload(file);
        const url = await merchantService.uploadProductImage(storeId, prepared);
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        setProductForm((prev) => ({
          ...prev,
          detail_image_urls: [...prev.detail_image_urls, ...uploadedUrls],
        }));
        setShowDetailImagesPanel(true);
      }
    } catch (error) {
      LoggerService.error('详细介绍图上传失败:', error);
      feedbackService.notify(language === 'zh' ? '图片上传失败，请重试' : 'Image upload failed');
    } finally {
      setIsUploadingDetailImages(false);
      if (detailImagesFileInputRef.current) detailImagesFileInputRef.current.value = '';
    }
  };

  const handleRemoveDetailImage = (index: number) => {
    setProductForm((prev) => ({
      ...prev,
      detail_image_urls: prev.detail_image_urls.filter((_, i) => i !== index),
    }));
  };

  const handleSaveProduct = async () => {
    const storeId = currentUser?.store_id || currentUser?.id;
    const { draft, error: formError } = buildMerchantProductDraft(productForm);
    if (!storeId) return;
    if (formError) {
      feedbackService.notify(language === 'zh' ? formError : formError);
      return;
    }

    try {
      setIsSaving(true);

      const result = await merchantService.saveMerchantProduct({
        mode: editingProduct ? 'edit' : 'create',
        product: editingProduct ?? null,
        storeId,
        draft: { ...draft, store_id: storeId },
      });

      if (result.success) {
        setShowAddEditProductModal(false);
        await loadStoreData(storeId);
        if (!editingProduct || ('pendingReview' in result && result.pendingReview)) {
          feedbackService.notify(
            language === 'zh'
              ? editingProduct
                ? '修改已提交，待后台审核通过后客户才能看到新内容。'
                : '商品已提交，待后台审核通过后将展示给顾客。'
              : editingProduct
                ? 'Changes submitted. Customers will see updates after admin approval.'
                : 'Submitted. Visible to customers after admin approval.',
          );
        }
      } else {
        feedbackService.notify(language === 'zh' ? '保存失败，请重试' : 'Save failed');
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
        feedbackService.notify(language === 'zh' ? '删除失败' : 'Delete failed');
      }
    } catch (error) {
      LoggerService.error('删除商品失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      const result = await merchantService.toggleAvailability(product);
      if (result.success) {
        const storeId = currentUser?.store_id || currentUser?.id;
        if (storeId) await loadStoreData(storeId);
        if ('pendingReview' in result && result.pendingReview) {
          feedbackService.notify(
            language === 'zh'
              ? '上下架变更已提交，待后台审核通过后生效。'
              : 'Availability change submitted for admin approval.',
          );
        }
      }
    } catch (error) {
      LoggerService.error('切换状态失败:', error);
    }
  };

  const productStats = useMemo(() => {
    const onSale = products.filter((p) => p.is_available).length;
    const pending = products.filter(
      (p) => p.listing_status === 'pending' || hasPendingProductUpdate(p),
    ).length;
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
                    {formatProductPriceLabel(product, language === 'en' ? 'en' : 'zh')}
                  </span>
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
                  product.listing_status === 'rejected' ||
                  hasPendingProductUpdate(product)) && (
                  <div
                    className={`merchant-product-card__status ${
                      hasPendingProductUpdate(product) && product.listing_status === 'approved'
                        ? 'merchant-product-card__status--pending'
                        : product.listing_status === 'pending'
                        ? 'merchant-product-card__status--pending'
                        : 'merchant-product-card__status--rejected'
                    }`}
                  >
                    {hasPendingProductUpdate(product) && product.listing_status === 'approved'
                      ? language === 'zh'
                        ? '⏳ 修改待审核'
                        : '⏳ Edit pending'
                      : product.listing_status === 'pending'
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
                        : language === 'zh'
                          ? '上传图片（自动原比例压缩）'
                          : 'Upload (auto compress)'}
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

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <button
                  type="button"
                  className="merchant-product-modal__detail-btn"
                  onClick={() => setShowDetailImagesPanel((v) => !v)}
                >
                  <span aria-hidden="true">🖼️</span>
                  {language === 'zh' ? '详细介绍' : 'Detail pics'}
                  {productForm.detail_image_urls.length > 0 ? (
                    <span className="merchant-product-modal__detail-btn-count">
                      {productForm.detail_image_urls.length}
                    </span>
                  ) : null}
                </button>
                {showDetailImagesPanel ? (
                  <div className="merchant-product-modal__detail-panel">
                    <p className="merchant-product-modal__detail-hint">
                      {language === 'zh'
                        ? '上传多张介绍图，顾客在商品详情页可纵向滚动浏览'
                        : 'Upload detail images for vertical scrolling in product view'}
                    </p>
                    <div className="merchant-product-modal__detail-scroll">
                      {productForm.detail_image_urls.map((url, idx) => (
                        <div key={`${url}-${idx}`} className="merchant-product-modal__detail-thumb">
                          <img src={url} alt="" />
                          <button
                            type="button"
                            className="merchant-product-modal__detail-remove"
                            onClick={() => handleRemoveDetailImage(idx)}
                            aria-label={language === 'zh' ? '删除图片' : 'Remove image'}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="merchant-product-modal__detail-add"
                        onClick={() => detailImagesFileInputRef.current?.click()}
                        disabled={isUploadingDetailImages}
                      >
                        {isUploadingDetailImages
                          ? '...'
                          : language === 'zh'
                            ? '+ 添加图片'
                            : '+ Add'}
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={detailImagesFileInputRef}
                      onChange={handleDetailImagesUpload}
                      style={{ display: 'none' }}
                      accept="image/*"
                      multiple
                    />
                  </div>
                ) : null}
              </div>

              <ProductVariantsEditor
                enabled={productForm.use_variants}
                onEnabledChange={(use_variants) =>
                  setProductForm((prev) => ({ ...prev, use_variants }))
                }
                variants={productForm.variants}
                onChange={(variants) => setProductForm((prev) => ({ ...prev, variants }))}
                language={language === 'en' ? 'en' : 'zh'}
                theme="merchant"
              />

              {!productForm.use_variants ? (
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
              ) : null}

              {!productForm.use_variants ? (
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
              ) : null}

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

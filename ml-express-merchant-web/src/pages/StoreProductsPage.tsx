import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate } from 'react-router-dom';
import { merchantService, deliveryStoreService, Product, DeliveryStore } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';

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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* 🚀 页眉区域 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2.5rem',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '1.5rem 2rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '16px', 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 10px 20px rgba(5, 150, 105, 0.3)'
          }}>🏪</div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '950', margin: 0, letterSpacing: '-0.5px', color: '#ffffff' }}>
              {t?.myProducts || '商品管理'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
              {store?.store_name} · {language === 'zh' ? `在线商品 ${products.length} 件` : `${products.length} Products Online`}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleOpenAddProduct}
          style={{
            padding: '12px 24px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            color: 'white',
            fontWeight: '800',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(5, 150, 105, 0.3)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(5, 150, 105, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(5, 150, 105, 0.3)';
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>+</span> {t?.addProduct || '添加商品'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '10rem 0' }}>
          <div className="spinner" style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid rgba(255,255,255,0.1)', 
            borderTop: '4px solid #10b981', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite', 
            margin: '0 auto' 
          }}></div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
          gap: '2rem' 
        }}>
          {products.map((product) => (
            <div 
              key={product.id} 
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '28px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                overflow: 'hidden', 
                backdropFilter: 'blur(15px)',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* 图片区域 */}
              <div style={{ width: '100%', aspectRatio: '1', position: 'relative', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '3rem', opacity: 0.2 }}>📦</div>
                )}
                
                {/* 悬浮操作：状态切换 */}
                <div 
                  onClick={(e) => { e.stopPropagation(); handleToggleAvailability(product); }}
                  style={{ 
                    position: 'absolute', 
                    top: '15px', 
                    right: '15px', 
                    background: product.is_available ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)', 
                    color: 'white', 
                    padding: '6px 12px', 
                    borderRadius: '10px', 
                    fontSize: '0.7rem', 
                    fontWeight: '900',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 2
                  }}
                >
                  {product.is_available ? 'ON SALE' : 'OFF SHELF'}
                </div>

                {/* 折扣标签 */}
                {product.original_price && product.original_price > product.price && (
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '15px', 
                    left: '15px', 
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                    color: 'white', 
                    padding: '4px 10px', 
                    borderRadius: '8px', 
                    fontSize: '0.7rem', 
                    fontWeight: '900',
                    boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)'
                  }}>
                    {Math.round((1 - product.price / product.original_price) * 100)}% OFF
                  </div>
                )}
              </div>

              {/* 信息区域 */}
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {product.name}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '1rem' }}>
                  <span style={{ color: '#fbbf24', fontSize: '1.4rem', fontWeight: '950' }}>{product.price.toLocaleString()}</span>
                  <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: '700' }}>MMK</span>
                  {product.original_price && product.original_price > product.price && (
                    <span style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'line-through', fontSize: '0.85rem', marginLeft: '4px' }}>
                      {product.original_price.toLocaleString()}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>{t?.productStock || '库存'}</span>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>
                      {product.stock === -1 ? (t?.stockInfinite || '无限') : `${product.stock} 件`}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>{language === 'zh' ? '销量' : 'Sales'}</span>
                    <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.9rem', display: 'block' }}>{product.sales_count || 0}</span>
                  </div>
                </div>

                {(product.listing_status === 'pending' || product.listing_status === 'rejected') && (
                  <div style={{
                    marginBottom: '0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: product.listing_status === 'pending' ? '#fbbf24' : '#f87171',
                  }}>
                    {product.listing_status === 'pending'
                      ? (language === 'zh' ? '待后台审核' : 'Pending approval')
                      : (language === 'zh' ? '审核未通过' : 'Rejected')}
                  </div>
                )}

                <button 
                  onClick={() => handleOpenEditProduct(product)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  {t?.editProduct || '编辑商品'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '8rem 0', 
          background: 'rgba(255,255,255,0.02)', 
          borderRadius: '40px', 
          border: '2px dashed rgba(255,255,255,0.1)' 
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '1.5rem', opacity: 0.2 }}>🛍️</div>
          <h3 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.5rem', fontWeight: '700' }}>
            {t?.noProducts || '暂无商品数据'}
          </h3>
          <button 
            onClick={handleOpenAddProduct}
            style={{ marginTop: '1.5rem', padding: '12px 30px', borderRadius: '14px', background: '#3b82f6', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer' }}
          >
            立即添加商品
          </button>
        </div>
      )}

      {/* 🚀 添加/编辑商品模态框 */}
      {showAddEditProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 30000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '32px',
            padding: '2.5rem',
            width: '100%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowAddEditProductModal(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>

            <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '900', margin: '0 0 2rem 0', textAlign: 'center' }}>
              {editingProduct ? t?.editProduct : t?.addProduct}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 图片上传 */}
              <div 
                onClick={() => productFileInputRef.current?.click()}
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '24px',
                  border: '2px dashed rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {productForm.image_url ? (
                  <img src={productForm.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📸</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                      {isUploading ? (t?.uploading || '上传中...') : (t?.uploadImage || '上传商品图片')}
                    </div>
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
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{t?.productName} *</label>
                <input 
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  placeholder={language === 'zh' ? '输入商品名称' : 'Product name'}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{language === 'zh' ? '商品描述' : 'Description'}</label>
                <textarea 
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  placeholder={language === 'zh' ? "输入商品详情描述..." : "Details..."}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none', minHeight: '80px', resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{t?.productPrice} (MMK) *</label>
                  <input 
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{t?.productDiscount} (%)</label>
                  <input 
                    type="number"
                    value={productForm.discount_percent}
                    onChange={(e) => setProductForm({...productForm, discount_percent: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>{t?.productStock} (-1={t?.stockInfinite})</label>
                <input 
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>{t?.isAvailable || '是否上架'}</span>
                <button 
                  onClick={() => setProductForm({...productForm, is_available: !productForm.is_available})}
                  style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    backgroundColor: productForm.is_available ? '#10b981' : 'rgba(255,255,255,0.2)',
                    position: 'relative',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.3s ease',
                    padding: 0
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: productForm.is_available ? '27px' : '3px',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {editingProduct && (
                  <button 
                    onClick={() => handleDeleteProduct(editingProduct.id)}
                    disabled={isSaving}
                    style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontWeight: '800', cursor: 'pointer' }}
                  >🗑️ {t?.delete}</button>
                )}
                <button 
                  onClick={handleSaveProduct}
                  disabled={isSaving || isUploading}
                  style={{ flex: 2, padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', color: 'white', fontWeight: '900', fontSize: '1rem', cursor: (isSaving || isUploading) ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)', opacity: (isSaving || isUploading) ? 0.7 : 1 }}
                >
                  {isSaving ? '...' : (editingProduct ? `💾 ${t?.save}` : `✨ ${t?.addProduct}`)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinner { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default StoreProductsPage;

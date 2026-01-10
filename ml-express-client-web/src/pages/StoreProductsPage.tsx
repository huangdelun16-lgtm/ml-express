import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchantService, deliveryStoreService, Product, DeliveryStore } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import NavigationBar from '../components/home/NavigationBar';
import LoggerService from '../services/LoggerService';

const StoreProductsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { addToCart, cartCount } = useCart();
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  const t = {
    zh: {
      loading: '正在加载...',
      addToCart: '加入购物车',
      noProducts: '该商店暂无商品',
      stock: '库存',
      infinite: '无限',
      addedToCart: '已加入购物车',
      cart: '购物车',
      back: '返回'
    },
    en: {
      loading: 'Loading...',
      addToCart: 'Add to Cart',
      noProducts: 'No products in this store',
      stock: 'Stock',
      infinite: 'Infinite',
      addedToCart: 'Added to cart',
      cart: 'Cart',
      back: 'Back'
    },
    my: {
      loading: 'ခေတ္တစောင့်ဆိုင်းပါ...',
      addToCart: 'ခြင်းထဲသို့ထည့်ရန်',
      noProducts: 'ဤဆိုင်တွင် ကုန်ပစ္စည်းမရှိသေးပါ',
      stock: 'လက်ကျန်',
      infinite: 'အကန့်အသတ်မရှိ',
      addedToCart: 'ခြင်းထဲသို့ထည့်ပြီးပါပြီ',
      cart: 'ခြင်း',
      back: 'နောက်သို့'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    loading: 'Loading...',
    addToCart: 'Add to Cart',
    noProducts: 'No products in this store',
    stock: 'Stock',
    infinite: 'Infinite',
    addedToCart: 'Added to cart',
    cart: 'Cart',
    back: 'Back'
  };

  useEffect(() => {
    if (storeId) {
      loadStoreData();
    }
  }, [storeId]);

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const [storeData, productsData] = await Promise.all([
        deliveryStoreService.getStoreById(storeId!),
        merchantService.getStoreProducts(storeId!)
      ]);
      setStore(storeData);
      setProducts(productsData);
    } catch (error) {
      LoggerService.error('Failed to load store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setItemQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const handleAddToCart = (product: Product) => {
    const qty = itemQuantities[product.id] || 0;
    if (qty > 0) {
      addToCart(product, qty);
      setItemQuantities(prev => ({ ...prev, [product.id]: 0 }));
      alert(t.addedToCart);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <NavigationBar />
      
      {/* 商店头部 */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={() => navigate('/mall')}
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                border: 'none', 
                color: 'white', 
                padding: '0.5rem 1rem', 
                borderRadius: '50px', 
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              ← {t.back}
            </button>
            {store && <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{store.store_name}</h1>}
          </div>
          <button 
            onClick={() => navigate('/cart')}
            style={{ 
              background: '#fbbf24', 
              border: 'none', 
              color: '#92400e', 
              padding: '0.8rem 1.5rem', 
              borderRadius: '50px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}
          >
            🛒 {t.cart} ({cartCount})
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>
            <p style={{ color: '#64748b' }}>{t.loading}</p>
          </div>
        ) : (
          <>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {products.map(product => {
                const qty = itemQuantities[product.id] || 0;
                return (
                  <div 
                    key={product.id}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ height: '200px', background: '#f8fafc', position: 'relative' }}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '3rem' }}>
                          📦
                        </div>
                      )}
                    </div>
                    
                    <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>{product.name}</h3>
                      <p style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: '900', marginBottom: '0.8rem' }}>{product.price.toLocaleString()} MMK</p>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                        {t.stock}: {product.stock === -1 ? t.infinite : product.stock}
                      </div>

                      <div style={{ marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => updateQuantity(product.id, -1)}
                            style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
                          >-</button>
                          <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                          <button 
                            onClick={() => updateQuantity(product.id, 1)}
                            style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
                          >+</button>
                        </div>
                        <button 
                          disabled={qty === 0}
                          onClick={() => handleAddToCart(product)}
                          style={{ 
                            width: '100%', 
                            padding: '0.8rem', 
                            borderRadius: '12px', 
                            border: 'none', 
                            background: qty > 0 ? '#3b82f6' : '#e2e8f0', 
                            color: 'white', 
                            fontWeight: 'bold', 
                            cursor: qty > 0 ? 'pointer' : 'default' 
                          }}
                        >
                          {t.addToCart}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {products.length === 0 && (
              <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧺</div>
                <p>{t.noProducts}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StoreProductsPage;

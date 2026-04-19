import React, { useState } from 'react';
import Logo from '../Logo';

interface OrderModalProps {
  showOrderForm: boolean;
  setShowOrderForm: (show: boolean) => void;
  language: string;
  t: any;
  currentUser: any;
  senderName: string;
  setSenderName: (val: string) => void;
  senderPhone: string;
  setSenderPhone: (val: string) => void;
  senderAddressText: string;
  setSenderAddressText: (val: string) => void;
  receiverName: string;
  setReceiverName: (val: string) => void;
  receiverPhone: string;
  setReceiverPhone: (val: string) => void;
  receiverAddressText: string;
  setReceiverAddressText: (val: string) => void;
  codAmount: string;
  setCodAmount: (val: string) => void;
  selectedDeliverySpeed: string;
  setSelectedDeliverySpeed: (val: string) => void;
  setShowTimePickerModal: (show: boolean) => void;
  scheduledDeliveryTime: string;
  showWeightInput: boolean;
  setShowWeightInput: (show: boolean) => void;
  isCalculated: boolean;
  calculatedPriceDetail: number;
  calculatedDistanceDetail: number;
  pricingSettings: any;
  handleOpenMapModal: (type: 'sender' | 'receiver') => void;
  handleOrderSubmit: (e: React.FormEvent) => void;
  selectedPackageType: string;
  setSelectedPackageType: (v: string) => void;
  orderWeight: string;
  setOrderWeight: (v: string) => void;
  handleCancelOrder?: () => void; // 🚀 新增：取消订单处理
  // 🚀 优化：坐标自动选择相关
  setSelectedSenderLocation?: (loc: {lat: number, lng: number} | null) => void;
  setSelectedReceiverLocation?: (loc: {lat: number, lng: number} | null) => void;
  // 🚀 新增：商家选货相关
  merchantProducts?: any[];
  selectedProducts?: Record<string, number>;
  handleProductQuantityChange?: (productId: string, delta: number) => void;
  cartTotal?: number;
  hasCOD?: boolean;
  setHasCOD?: (val: boolean) => void;
  isFromCart?: boolean;
  description?: string; // 🚀 新增：物品描述
  setDescription?: (val: string) => void; // 🚀 新增：设置描述
  paymentMethod?: 'qr' | 'cash' | 'balance'; // 🚀 新增：支付方式（非商家下单时用于跑腿费等）
  setPaymentMethod?: (val: 'qr' | 'cash' | 'balance') => void;
  /** 商家「立即下单」：仅用于商品费用；跑腿费固定现金 */
  productPaymentMethod?: 'cash' | 'balance';
  setProductPaymentMethod?: (val: 'cash' | 'balance') => void;
  merchantStore?: any; // 🚀 新增：商家店铺信息
}

const OrderModal: React.FC<OrderModalProps> = ({
  showOrderForm,
  setShowOrderForm,
  language,
  t,
  currentUser,
  senderName,
  setSenderName,
  senderPhone,
  setSenderPhone,
  senderAddressText,
  setSenderAddressText,
  receiverName,
  setReceiverName,
  receiverPhone,
  setReceiverPhone,
  receiverAddressText,
  setReceiverAddressText,
  codAmount,
  setCodAmount,
  selectedDeliverySpeed,
  setSelectedDeliverySpeed,
  setShowTimePickerModal,
  scheduledDeliveryTime,
  showWeightInput,
  setShowWeightInput,
  isCalculated,
  calculatedPriceDetail,
  calculatedDistanceDetail,
  pricingSettings,
  handleOpenMapModal,
  handleOrderSubmit,
  selectedPackageType,
  setSelectedPackageType,
  orderWeight,
  setOrderWeight,
  handleCancelOrder = () => setShowOrderForm(false),
  setSelectedSenderLocation = () => {},
  setSelectedReceiverLocation = () => {},
  merchantProducts = [],
  selectedProducts = {},
  handleProductQuantityChange = () => {},
  cartTotal = 0,
  hasCOD = true,
  setHasCOD = () => {},
  isFromCart = false,
  description = '',
  setDescription = () => {},
  paymentMethod = 'cash',
  setPaymentMethod = () => {},
  productPaymentMethod = 'balance',
  setProductPaymentMethod = () => {},
  merchantStore = null
}) => {
  const isMerchant = currentUser?.user_type === 'merchant';
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false); // 🚀 新增：商品选择器显示状态

  if (!showOrderForm) return null;

  const packageTypes = [
    { value: t.ui.document, label: t.ui.document, icon: '📄', description: t.ui.packageTypeInfo.document },
    { value: t.ui.standardPackageDetail, label: t.ui.standardPackage, icon: '📦', description: t.ui.packageTypeInfo.standard },
    { value: t.ui.overweightPackageDetail, label: t.ui.overweightPackage, icon: '⚖️', description: t.ui.packageTypeInfo.overweight },
    { value: t.ui.oversizedPackageDetail, label: t.ui.oversizedPackage, icon: '🐘', description: t.ui.packageTypeInfo.oversized },
    { value: t.ui.fragile, label: t.ui.fragile, icon: '🍷', description: t.ui.packageTypeInfo.fragile },
    { value: t.ui.foodDrinks, label: t.ui.foodDrinks, icon: '🍱', description: t.ui.packageTypeInfo.foodDrinks },
  ];

  const deliverySpeeds = [
    { value: t.ui.onTimeDelivery, label: t.ui.onTimeDelivery, icon: '🕒' },
    { value: t.ui.urgentDelivery, label: t.ui.urgentDelivery, icon: '⚡' },
    { value: t.ui.scheduledDelivery, label: t.ui.scheduledDelivery, icon: '📅' },
    { value: 'Eco Way', label: t.ui.waySideDeliveryLabel, icon: '🌿' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        backdropFilter: 'blur(15px)',
        padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
        borderRadius: '15px',
        maxWidth: '420px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo size="medium" />
        </div>
        <h2 style={{ color: 'white', marginBottom: '2rem', textAlign: 'center' }}>
          {t.order.title}
        </h2>

        {/* 🚀 新增：身份识别标签 (对齐 App) */}
        {currentUser && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', gap: '10px' }}>
            {currentUser.user_type === 'merchant' ? (
              <div style={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                color: 'white', 
                padding: '6px 16px', 
                borderRadius: '20px', 
                fontSize: '0.85rem', 
                fontWeight: '900',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                🏪 {language === 'zh' ? '商家' : 'MERCHANTS'}
              </div>
            ) : (currentUser.balance > 0 || currentUser.user_type === 'vip') ? (
              <div style={{ 
                background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', 
                color: 'white', 
                padding: '6px 16px', 
                borderRadius: '20px', 
                fontSize: '0.85rem', 
                fontWeight: '900',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                👑 VIP MEMBER
              </div>
            ) : (
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.2)', 
                color: 'white', 
                padding: '6px 16px', 
                borderRadius: '20px', 
                fontSize: '0.85rem', 
                fontWeight: '700',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                👤 {language === 'zh' ? '普通会员' : 'MEMBER'}
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleOrderSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>{t.order.sender}</h3>
            <input
              type="text"
              name="senderName"
              placeholder={t.order.senderName}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: 'var(--spacing-3) var(--spacing-4)',
                border: '2px solid var(--color-border-dark)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-base)',
                lineHeight: 'var(--line-height-normal)',
                textAlign: 'left',
                transition: 'all var(--transition-base)',
                fontFamily: 'var(--font-family-base)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <input
              type="tel"
              name="senderPhone"
              placeholder={t.order.senderPhone}
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              required
              style={{
                width: '100%',
                padding: 'var(--spacing-3) var(--spacing-4)',
                border: '2px solid var(--color-border-dark)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-base)',
                lineHeight: 'var(--line-height-normal)',
                textAlign: 'left',
                transition: 'all var(--transition-base)',
                fontFamily: 'var(--font-family-base)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div style={{ position: 'relative' }}>
              <textarea
                name="senderAddress"
                placeholder={t.order.senderAddress}
                required
                value={senderAddressText}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  border: '2px solid var(--color-border-dark)',
                  borderRadius: 'var(--radius-md)',
                  height: '80px',
                  resize: 'vertical',
                  fontSize: 'var(--font-size-base)',
                  lineHeight: 'var(--line-height-normal)',
                  textAlign: 'left',
                  transition: 'all var(--transition-base)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(5px)',
                  fontFamily: 'var(--font-family-base)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  // 如果用户手动编辑地址，移除坐标信息并清除坐标状态
                  const lines = value.split('\n');
                  const addressLines = lines.filter(line => !line.includes('📍 坐标:'));
                  setSenderAddressText(addressLines.join('\n'));
                  
                  // 🚀 优化：如果用户手动修改了非坐标部分的地址，清除精确坐标状态
                  if (value.includes('📍 坐标:')) {
                    // 说明只是在带有坐标的地址上删除了东西，或者增加了东西
                    // 如果删除了坐标行，清除状态
                    if (!value.includes('📍 坐标:')) {
                      setSelectedSenderLocation(null);
                    }
                  } else {
                    // 如果地址里本来就没有坐标，每次编辑都确保状态为null（除非是从地图选的）
                    setSelectedSenderLocation(null);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleOpenMapModal('sender')}
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(44, 82, 130, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(44, 82, 130, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(44, 82, 130, 0.3)';
                }}
              >
                📍 {t.order.selectOnMap}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>{t.order.receiver}</h3>
            <input
              type="text"
              name="receiverName"
              placeholder={t.order.receiverName}
              required
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--spacing-3) var(--spacing-4)',
                border: '2px solid var(--color-border-dark)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-base)',
                lineHeight: 'var(--line-height-normal)',
                textAlign: 'left',
                transition: 'all var(--transition-base)',
                fontFamily: 'var(--font-family-base)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <input
              type="tel"
              name="receiverPhone"
              placeholder={t.order.receiverPhone}
              required
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--spacing-3) var(--spacing-4)',
                border: '2px solid var(--color-border-dark)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-base)',
                lineHeight: 'var(--line-height-normal)',
                textAlign: 'left',
                transition: 'all var(--transition-base)',
                fontFamily: 'var(--font-family-base)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div style={{ position: 'relative' }}>
              <textarea
                name="receiverAddress"
                placeholder={t.order.receiverAddress}
                required
                value={receiverAddressText}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  border: '2px solid var(--color-border-dark)',
                  borderRadius: 'var(--radius-md)',
                  height: '80px',
                  resize: 'vertical',
                  fontSize: 'var(--font-size-base)',
                  lineHeight: 'var(--line-height-normal)',
                  textAlign: 'left',
                  transition: 'all var(--transition-base)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(5px)',
                  fontFamily: 'var(--font-family-base)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  const lines = value.split('\n');
                  const addressLines = lines.filter(line => !line.includes('📍 坐标:'));
                  setReceiverAddressText(addressLines.join('\n'));
                  
                  // 🚀 优化：如果用户手动修改地址，清除精确坐标状态
                  if (!value.includes('📍 坐标:')) {
                    setSelectedReceiverLocation(null);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleOpenMapModal('receiver')}
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(44, 82, 130, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(44, 82, 130, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(44, 82, 130, 0.3)';
                }}
              >
                📍 {t.order.selectOnMap}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>
              📦 {language === 'zh' ? '包裹类型' : language === 'en' ? 'Package Type' : 'ပက်ကေ့ဂျ်အမျိုးအစား'}
            </h3>

            {/* 🚀 新增：商家商品选择按钮 (仅限 MERCHANTS 账号，放在包裹类型标题下) */}
            {currentUser?.user_type === 'merchant' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ color: 'white', fontSize: '0.9rem', fontWeight: '700' }}>
                    🛍️ {language === 'zh' ? '选择商品' : language === 'en' ? 'Select Product' : 'ကုန်ပစ္စည်းရွေးရန်'}
                  </label>
                  {!isFromCart && (
                    <button 
                      type="button"
                      onClick={() => setShowProductSelector(true)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: 'white',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {language === 'zh' ? '+ 从库中选择' : language === 'en' ? '+ From Library' : '+ ပစ္စည်းရွေးရန်'}
                    </button>
                  )}
                </div>

                {/* 已选商品列表 */}
                {Object.keys(selectedProducts).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {Object.entries(selectedProducts).map(([id, qty]) => {
                      const product = merchantProducts.find(p => p.id === id);
                      if (!product) return null;
                      return (
                        <div key={id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '10px'
                        }}>
                          <div style={{ flex: 1, marginRight: '10px' }}>
                            <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>{product.name}</div>
                            <div style={{ color: '#10b981', fontSize: '0.8rem' }}>{product.price.toLocaleString()} MMK</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                              type="button"
                              onClick={() => handleProductQuantityChange(id, -1)}
                              style={{ width: '24px', height: '24px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
                            >-</button>
                            <span style={{ color: 'white', fontWeight: 'bold' }}>{qty}</span>
                            <button 
                              type="button"
                              onClick={() => handleProductQuantityChange(id, 1)}
                              style={{ width: '24px', height: '24px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                    {/* 🚀 新增：Web端代收款移动到“商品小计”上面 (仅限 MERCHANTS) */}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <label style={{ 
                          fontWeight: 'bold', 
                          color: 'white',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          💰 {language === 'zh' ? '代收款 (COD)' : language === 'en' ? 'Collection Amount (COD)' : 'ငွေကောက်ခံရန် (COD)'}
                        </label>
                        
                        {/* 开关按钮 */}
                        <div 
                          onClick={() => setHasCOD(!hasCOD)}
                          style={{
                            width: '44px',
                            height: '24px',
                            borderRadius: '12px',
                            backgroundColor: hasCOD ? '#10b981' : 'rgba(255,255,255,0.2)',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '9px',
                            backgroundColor: 'white',
                            position: 'absolute',
                            top: '3px',
                            left: hasCOD ? '23px' : '3px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
                        💡 {hasCOD 
                          ? (language === 'zh' ? '有代收' : language === 'en' ? 'With collection' : 'ငွေကောက်ခံမည်')
                          : (language === 'zh' ? '无代收' : language === 'en' ? 'No collection' : 'ငွေမကောက်ခံပါ')}
                      </div>

                      {hasCOD && (
                        <div style={{ position: 'relative', marginBottom: '10px' }}>
                          <input
                            type="number"
                            name="codAmount"
                            value={codAmount}
                            onChange={(e) => setCodAmount(e.target.value)}
                            placeholder={language === 'zh' ? '请输入代收金额' : language === 'en' ? 'Enter amount' : 'ပမာဏထည့်ပါ'}
                            style={{
                              width: '100%',
                              padding: '10px 15px',
                              paddingRight: '3.5rem',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '10px',
                              fontSize: '0.95rem',
                              background: 'white',
                              color: '#1e293b',
                              outline: 'none'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#64748b',
                            fontWeight: 'bold',
                            fontSize: '0.8rem'
                          }}>
                            MMK
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => !isFromCart && setShowProductSelector(true)}
                    style={{ textAlign: 'center', padding: '1rem', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', cursor: isFromCart ? 'default' : 'pointer' }}
                  >
                    {language === 'zh' ? '未选择商品' : language === 'en' ? 'No items selected' : 'ပစ္စည်းမရွေးချယ်ရသေးပါ'}
                  </div>
                )}
              </div>
            )}
            
            {/* 自定义包裹类型下拉框 */}
            <div style={{ position: 'relative', marginBottom: 'var(--spacing-2)' }}>
              <input type="hidden" name="packageType" value={selectedPackageType} required />
              <div
                onClick={() => {
                  if (selectedDeliverySpeed === 'Eco Way') return;
                  setShowPackageDropdown(!showPackageDropdown);
                }}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  border: '2px solid var(--color-border-dark)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-base)',
                  background: selectedDeliverySpeed === 'Eco Way' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(5px)',
                  cursor: selectedDeliverySpeed === 'Eco Way' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: selectedDeliverySpeed === 'Eco Way' ? 'rgba(0,0,0,0.35)' : (selectedPackageType ? 'var(--color-text-primary)' : 'rgba(0,0,0,0.4)'),
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all 0.3s'
                }}
              >
                <span>
                  {selectedDeliverySpeed === 'Eco Way'
                    ? `🌿 ${t.ui.waySideDeliveryLabel}`
                    : selectedPackageType 
                    ? packageTypes.find(p => p.value === selectedPackageType)?.icon + ' ' + packageTypes.find(p => p.value === selectedPackageType)?.label
                    : t.order.selectType}
                </span>
                {selectedDeliverySpeed !== 'Eco Way' && (
                <span style={{ 
                  transform: showPackageDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }}>▼</span>
                )}
              </div>

              {showPackageDropdown && selectedDeliverySpeed !== 'Eco Way' && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  zIndex: 100,
                  maxHeight: '250px',
                  overflowY: 'auto',
                  border: '1px solid rgba(0,0,0,0.1)',
                  padding: '8px'
                }}>
                  {packageTypes.map((type) => (
                    <div
                      key={type.value}
                      onClick={() => {
                        setSelectedPackageType(type.value);
                        setShowPackageDropdown(false);

                        const isOversized = type.value === t.ui.oversizedPackageDetail || type.value === '超规件（45x60x15cm）以上';
                        const isOverweight = type.value === t.ui.overweightPackageDetail || type.value === '超重件（5KG）以上';
                        const isTransit = type.value === '中转包裹';
                        
                        if (isOversized || isOverweight || isTransit) {
                          setShowWeightInput(true);
                        } else {
                          setShowWeightInput(false);
                        }
                      }}
                      style={{
                        padding: '10px 15px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        background: selectedPackageType === type.value ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        color: selectedPackageType === type.value ? '#2563eb' : '#4a5568',
                        fontWeight: selectedPackageType === type.value ? '600' : '400',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (selectedPackageType !== type.value) {
                          e.currentTarget.style.background = '#f8fafc';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedPackageType !== type.value) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{type.icon}</span>
                      <span>{type.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 显示包裹类型说明 */}
            {selectedPackageType && (
              <div style={{
                marginTop: '-0.5rem',
                marginBottom: '1rem',
                padding: '0.8rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                borderLeft: '4px solid #f59e0b',
                color: 'white',
                fontSize: '0.85rem',
                lineHeight: '1.4'
              }}>
                <span style={{ marginRight: '5px' }}>💡</span>
                {selectedPackageType === t.ui.waySide
                  ? t.ui.packageTypeInfo.waySide
                  : packageTypes.find(p => p.value === selectedPackageType)?.description}
              </div>
            )}
            
            {showWeightInput && (
              <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                <label style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.2rem', display: 'block' }}>
                  {language === 'zh' ? '包裹重量 (kg)' : language === 'en' ? 'Weight (kg)' : 'အလေးချိန် (kg)'}
                </label>
                <input
                  type="number"
                  name="weight"
                  value={orderWeight}
                  onChange={(e) => setOrderWeight(e.target.value)}
                  placeholder="0.0"
                  step="0.1"
                  min="0"
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    border: '2px solid var(--color-border-dark)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-base)',
                    lineHeight: 'var(--line-height-normal)',
                    textAlign: 'left',
                    transition: 'all var(--transition-base)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(5px)',
                    fontFamily: 'var(--font-family-base)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}

            {/* 🚀 新增：物品描述 (对齐 App) */}
            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.2rem', display: 'block' }}>
                📝 {language === 'zh' ? '物品描述' : language === 'en' ? 'Description' : 'ပစ္စည်းဖော်ပြချက်'}
              </label>
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'zh' ? '如：衣服、食品等' : language === 'en' ? 'e.g. Clothes, Food...' : 'ဥပမာ- အဝတ်အစား၊ အစားအစာ...'}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  border: '2px solid var(--color-border-dark)',
                  borderRadius: 'var(--radius-md)',
                  height: '80px',
                  fontSize: 'var(--font-size-base)',
                  lineHeight: 'var(--line-height-normal)',
                  textAlign: 'left',
                  transition: 'all var(--transition-base)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(5px)',
                  fontFamily: 'var(--font-family-base)',
                  resize: 'vertical'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* 🚀 新增：商品费用 (仅余额支付) - 对齐 App */}
            {isFromCart && cartTotal > 0 && currentUser?.user_type !== 'merchant' && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  background: 'rgba(251, 191, 36, 0.1)',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      🛍️ {language === 'zh' ? '商品费用（仅余额支付）' : language === 'en' ? 'Item Cost (Balance Only)' : 'ကုန်ပစ္စည်းဖိုး (လက်ကျန်ငွေဖြင့်သာ)'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                      {language === 'zh' ? '该金额将从账户余额中预扣' : language === 'en' ? 'Deducted from balance' : 'လက်ကျန်ငွေမှ နုတ်ယူမည်'}
                    </span>
                  </div>
                  <span style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.2rem' }}>
                    {cartTotal.toLocaleString()} MMK
                  </span>
                </div>

                {/* 🚀 新增：此处也显示一次实时余额 */}
                <div style={{ 
                  padding: '0.75rem 1rem', 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    💰 {language === 'zh' ? '账户余额' : language === 'en' ? 'Account Balance' : 'လက်ကျန်ငွေ'}:
                  </span>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {currentUser?.balance?.toLocaleString() || 0} MMK
                  </span>
                </div>
              </div>
            )}

            {/* 速度部分 */}
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>{t.ui.speed || '速度'}</h3>
            
            <div style={{ position: 'relative', marginBottom: 'var(--spacing-2)' }}>
              <input type="hidden" name="deliverySpeed" value={selectedDeliverySpeed} required />
              <div
                onClick={() => setShowSpeedDropdown(!showSpeedDropdown)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  border: '2px solid var(--color-border-dark)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-base)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(5px)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: selectedDeliverySpeed ? 'var(--color-text-primary)' : 'rgba(0,0,0,0.4)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all 0.3s'
                }}
              >
                <span>
                  {selectedDeliverySpeed 
                    ? deliverySpeeds.find(s => s.value === selectedDeliverySpeed)?.icon + ' ' + deliverySpeeds.find(s => s.value === selectedDeliverySpeed)?.label
                    : t.ui.selectDeliverySpeed}
                </span>
                <span style={{ 
                  transform: showSpeedDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }}>▼</span>
              </div>

              {showSpeedDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  zIndex: 100,
                  padding: '8px'
                }}>
                  {deliverySpeeds.map((speed) => (
                    <div
                      key={speed.value}
                      onClick={() => {
                        if (speed.value === 'Eco Way') {
                          setSelectedDeliverySpeed('Eco Way');
                          setSelectedPackageType(t.ui.waySide);
                          setShowWeightInput(false);
                        } else {
                          setSelectedDeliverySpeed(speed.value);
                          if (selectedPackageType === t.ui.waySide) {
                            setSelectedPackageType('');
                          }
                        }
                        setShowSpeedDropdown(false);
                        if (speed.value === t.ui.scheduledDelivery) {
                          setShowTimePickerModal(true);
                        }
                      }}
                      style={{
                        padding: '10px 15px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        background: selectedDeliverySpeed === speed.value ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        color: selectedDeliverySpeed === speed.value ? '#2563eb' : '#4a5568',
                        fontWeight: selectedDeliverySpeed === speed.value ? '600' : '400',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (selectedDeliverySpeed !== speed.value) {
                          e.currentTarget.style.background = '#f8fafc';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedDeliverySpeed !== speed.value) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{speed.icon}</span>
                      <span>{speed.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 代收款 (仅VIP可见，Partner已移入商品卡片) */}
            {currentUser?.user_type === 'vip' && (
              <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ 
                    fontWeight: 'bold', 
                    color: 'white',
                    fontSize: 'var(--font-size-base)'
                  }}>
                    {language === 'zh' ? '代收款 (COD)' : language === 'en' ? 'Collection Amount (COD)' : 'ငွေကောက်ခံရန် (COD)'}
                  </label>
                  
                  {/* 开关按钮 */}
                  <div 
                    onClick={() => setHasCOD(!hasCOD)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: hasCOD ? '#10b981' : 'rgba(255,255,255,0.2)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '9px',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: hasCOD ? '23px' : '3px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>

                {hasCOD && (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      name="codAmount"
                      value={codAmount}
                      onChange={(e) => setCodAmount(e.target.value)}
                      placeholder={language === 'zh' ? '请输入代收金额' : language === 'en' ? 'Enter amount' : 'ပမာဏထည့်ပါ'}
                      style={{
                        width: '100%',
                        padding: 'var(--spacing-3) var(--spacing-4)',
                        paddingRight: '3.5rem',
                        border: '2px solid var(--color-border-dark)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-base)',
                        lineHeight: 'var(--line-height-normal)',
                        textAlign: 'left',
                        transition: 'all var(--transition-base)',
                        fontFamily: 'var(--font-family-base)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(5px)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#4a5568',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      MMK
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* 显示选择的时间 */}
            {selectedDeliverySpeed === t.ui.scheduledDelivery && scheduledDeliveryTime && (
              <div style={{
                padding: '0.8rem',
                background: 'rgba(72, 187, 120, 0.1)',
                border: '2px solid rgba(72, 187, 120, 0.3)',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                color: '#2c5282',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🕐</span>
                <span style={{ fontWeight: '500' }}>{t.ui.selectedTime}: {scheduledDeliveryTime}</span>
              </div>
            )}
            
            <div style={{
              fontSize: '0.8rem',
              color: '#e74c3c',
              marginTop: '0.5rem',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              ***{t.ui.packageInfoMismatch}***
            </div>
          </div>

          {/* 💰 价格估算部分 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>
              💰 {language === 'zh' ? '价格估算' : language === 'en' ? 'Price Estimate' : 'စျေးနှုန်းခန့်မှန်းခြင်း'}
            </h3>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              {!isCalculated ? (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    📊 {language === 'zh' ? '填写地址、包裹与配送选项后将自动显示费用' :
                        language === 'en' ? 'Fee updates automatically when address, package and delivery are set' :
                        'လိပ်စာ၊ ပါဆယ်နှင့် ပို့ဆောင်ရွေးချယ်မှု ပြီးပါက အလိုအလျောက် ပြသပါမည်'}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    {language === 'zh' ? '超重/超规件请填写重量；建议在地图上选择地址以精准计费' :
                     language === 'en' ? 'Enter weight for overweight/oversized items; map pick is recommended for accuracy' :
                     'အလေးချိန်ပိုပါဆယ် သို့မဟုတ် အရွယ်ပိုပါဆယ်အတွက် အလေးချိန်ကို ဖြည့်ပါ၊ တိကျစေရန် မြေပုံမှ ရွေးချယ်ရန် အကြံပြုပါသည်'}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      {language === 'zh' ? '配送距离' : language === 'en' ? 'Delivery Distance' : 'ပို့ဆောင်အကွာအဝေး'}:
                    </span>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>
                      {Math.ceil(calculatedDistanceDetail)} {language === 'zh' ? '公里' : language === 'en' ? 'km' : 'ကီလိုမီတာ'}
                    </span>
                  </div>
                  {/* 基础费用始终显示 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      {language === 'zh' ? '基础费用' : language === 'en' ? 'Base Fee' : 'အခြေခံအခကြေး'}:
                    </span>
                    <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                      {pricingSettings.baseFee} MMK
                    </span>
                  </div>

                  {/* 如果不是顺路递，显示其他费用明细 */}
                  {selectedPackageType !== t.ui.waySide && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '距离费用' : language === 'en' ? 'Distance Fee' : 'အကွာအဝေးအခ'}:
                        </span>
                        <span style={{ color: '#8b5cf6', fontWeight: '600' }}>
                          {Math.round(Math.max(0, Math.ceil(calculatedDistanceDetail) - pricingSettings.freeKmThreshold) * pricingSettings.perKmFee)} MMK
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '超重费' : language === 'en' ? 'Overweight Fee' : 'အလေးချိန်ပိုအခ'}:
                        </span>
                        <span style={{ color: '#ef4444', fontWeight: '600' }}>
                          {(() => {
                            const weightNum = parseFloat(orderWeight) || 0;
                            const weightThreshold = 5;
                            const isOverweight = selectedPackageType === t.ui.overweightPackageDetail || selectedPackageType === '超重件（5KG）以上';
                            return Math.round((isOverweight && weightNum > weightThreshold) ? (weightNum - weightThreshold) * pricingSettings.weightSurcharge : 0);
                          })()} MMK
                        </span>
                      </div>
                      {/* 超规费 - 仅超规件显示 */}
                      {(selectedPackageType === t.ui.oversizedPackageDetail || selectedPackageType === '超规件（45x60x15cm）以上') && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {language === 'zh' ? '超规费' : language === 'en' ? 'Oversize Fee' : 'အရွယ်အစားပိုအခ'}:
                          </span>
                          <span style={{ color: '#f97316', fontWeight: '600' }}>
                            {Math.round(Math.ceil(calculatedDistanceDetail) * pricingSettings.oversizeSurcharge)} MMK
                          </span>
                        </div>
                      )}
                      
                      {/* 易碎品费 - 仅易碎品显示 */}
                      {(selectedPackageType === t.ui.fragile || selectedPackageType === '易碎品') && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {language === 'zh' ? '易碎品费' : language === 'en' ? 'Fragile Fee' : 'ပျက်စီးလွယ်သောအခ'}:
                          </span>
                          <span style={{ color: '#f97316', fontWeight: '600' }}>
                            {Math.round(Math.ceil(calculatedDistanceDetail) * pricingSettings.fragileSurcharge)} MMK
                          </span>
                        </div>
                      )}
                      
                      {/* 食品饮料费 - 仅食品饮料显示 */}
                      {(selectedPackageType === t.ui.foodDrinks || selectedPackageType === '食品和饮料') && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {language === 'zh' ? '食品饮料费' : language === 'en' ? 'Food & Drinks Fee' : 'အစားအသောက်အခ'}:
                          </span>
                          <span style={{ color: '#f97316', fontWeight: '600' }}>
                            {Math.round(Math.ceil(calculatedDistanceDetail) * pricingSettings.foodBeverageSurcharge)} MMK
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '配送速度费用' : language === 'en' ? 'Delivery Speed Fee' : 'ပို့ဆောင်မြန်နှုန်းအခ'}:
                        </span>
                        <span style={{ color: '#06b6d4', fontWeight: '600' }}>
                          {(() => {
                            let speedFee = 0;
                            if (selectedDeliverySpeed === t.ui.urgentDelivery || selectedDeliverySpeed === '加急配送' || selectedDeliverySpeed === '急送达') {
                              speedFee = pricingSettings.urgentSurcharge;
                            } else if (selectedDeliverySpeed === t.ui.scheduledDelivery || selectedDeliverySpeed === '定时达' || selectedDeliverySpeed === '预约配送') {
                              speedFee = pricingSettings.scheduledSurcharge;
                            }
                            return Math.round(speedFee);
                          })()} MMK
                        </span>
                      </div>
                    </>
                  )}
                  <div style={{ 
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)', 
                    paddingTop: '0.5rem', 
                    marginTop: '0.5rem', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    {/* 🚀 跑腿费显示 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        🚚 {language === 'zh' ? '跑腿费' : language === 'en' ? 'Delivery Fee' : 'ပို့ဆောင်ခ'}
                      </span>
                      <span style={{ color: 'white', fontWeight: '950', fontSize: '1.4rem' }}>
                        {Math.round(calculatedPriceDetail).toLocaleString()} MMK
                      </span>
                    </div>

                    {/* 商家：跑腿费仅现金；商品费用另选。非商家：跑腿费可选余额/现金 */}
                    {isMerchant ? (
                      <>
                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: '12px',
                            fontSize: '0.82rem',
                            fontWeight: '700',
                            border: '2px solid rgba(16, 185, 129, 0.5)',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'white',
                            marginBottom: cartTotal > 0 ? '10px' : '0.5rem',
                            lineHeight: 1.45,
                          }}
                        >
                          💵{' '}
                          {language === 'zh'
                            ? '跑腿费仅支持现金支付（骑手取件时收取），不能使用余额。'
                            : language === 'en'
                              ? 'Delivery fee is cash only (paid to courier at pickup), not from balance.'
                              : 'ပို့ဆောင်ခ သည် ငွေသားဖြင့်သာ၊ ကောင်ရီယာလာယူစဉ် ပေးချေရမည်။ လက်ကျန်ငွေဖြင့် မရပါ။'}
                        </div>
                        {cartTotal > 0 && (
                          <>
                            <div
                              style={{
                                color: 'rgba(255,255,255,0.95)',
                                fontSize: '0.85rem',
                                fontWeight: '800',
                                marginBottom: '6px',
                              }}
                            >
                              {language === 'zh'
                                ? '🛒 商品费用支付方式'
                                : language === 'en'
                                  ? '🛒 Product payment'
                                  : '🛒 ကုန်ပစ္စည်းဖိုး ပေးချေမှု'}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => setProductPaymentMethod('balance')}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  borderRadius: '12px',
                                  fontSize: '0.85rem',
                                  fontWeight: '800',
                                  border: '2px solid',
                                  borderColor:
                                    productPaymentMethod === 'balance'
                                      ? '#fbbf24'
                                      : 'rgba(255,255,255,0.15)',
                                  background:
                                    productPaymentMethod === 'balance'
                                      ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)'
                                      : 'rgba(255,255,255,0.05)',
                                  color:
                                    productPaymentMethod === 'balance' ? '#1e293b' : 'white',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  boxShadow:
                                    productPaymentMethod === 'balance'
                                      ? '0 4px 15px rgba(251, 191, 36, 0.3)'
                                      : 'none',
                                }}
                              >
                                💳 {language === 'zh' ? '余额支付' : 'Balance'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductPaymentMethod('cash')}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  borderRadius: '12px',
                                  fontSize: '0.85rem',
                                  fontWeight: '800',
                                  border: '2px solid',
                                  borderColor:
                                    productPaymentMethod === 'cash'
                                      ? '#10b981'
                                      : 'rgba(255,255,255,0.15)',
                                  background:
                                    productPaymentMethod === 'cash'
                                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                      : 'rgba(255,255,255,0.05)',
                                  color: 'white',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  boxShadow:
                                    productPaymentMethod === 'cash'
                                      ? '0 4px 15px rgba(16, 185, 129, 0.3)'
                                      : 'none',
                                }}
                              >
                                💵 {language === 'zh' ? '现金支付' : 'Cash'}
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('balance')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '800',
                            border: '2px solid',
                            borderColor: paymentMethod === 'balance' ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                            background: paymentMethod === 'balance' ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : 'rgba(255,255,255,0.05)',
                            color: paymentMethod === 'balance' ? '#1e293b' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: paymentMethod === 'balance' ? '0 4px 15px rgba(251, 191, 36, 0.3)' : 'none'
                          }}
                        >
                          💳 {language === 'zh' ? '余额支付' : 'Balance'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '800',
                            border: '2px solid',
                            borderColor: paymentMethod === 'cash' ? '#10b981' : 'rgba(255,255,255,0.15)',
                            background: paymentMethod === 'cash' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: paymentMethod === 'cash' ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none'
                          }}
                        >
                          💵 {language === 'zh' ? '现金支付' : 'Cash'}
                        </button>
                      </div>
                    )}

                    {/* 🚀 余额信息 (仅限会员) */}
                    {currentUser && currentUser.user_type !== 'merchant' && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '10px'
                      }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                          💰 {language === 'zh' ? '账户余额' : language === 'en' ? 'Account Balance' : 'လက်ကျန်ငွေ'}:
                        </span>
                        <span style={{ 
                          color: (currentUser.balance - (isFromCart ? cartTotal : 0)) >= 0 ? '#4ade80' : '#f87171', 
                          fontWeight: 'bold' 
                        }}>
                          {(currentUser.balance - (isFromCart ? cartTotal : 0)).toLocaleString()} MMK
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'center', 
            flexDirection: window.innerWidth < 768 ? 'column' : 'row'
          }}>
            <button
              type="button"
              onClick={handleCancelOrder}
              style={{
                background: '#e2e8f0',
                color: '#4a5568',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                width: window.innerWidth < 768 ? '100%' : 'auto',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
              onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
            >
              {t.order.cancel}
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                width: window.innerWidth < 768 ? '100%' : 'auto',
                boxShadow: '0 4px 15px rgba(44, 82, 130, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(44, 82, 130, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(44, 82, 130, 0.3)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span>{t.order.submit}</span>
                {isCalculated && (
                  <span style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '0.2rem' }}>
                    {calculatedPriceDetail} MMK
                  </span>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>

      {/* 🚀 新增：商家商品选择模态框 */}
      {showProductSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: '#1e293b',
            padding: '2rem',
            borderRadius: '24px',
            maxWidth: '600px',
            width: '95%',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'white', margin: 0 }}>🛍️ {language === 'zh' ? '选择商品' : language === 'en' ? 'Select Product' : 'ပစ္စည်းရွေးရန်'}</h2>
              <button 
                onClick={() => setShowProductSelector(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '18px', cursor: 'pointer' }}
              >✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
              {merchantProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                  <div>{language === 'zh' ? '该店铺暂无商品' : language === 'en' ? 'No products in this store' : 'ပစ္စည်းမရှိသေးပါ'}</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {merchantProducts.map((item) => (
                    <div key={item.id} style={{
                      display: 'flex',
                      gap: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '1rem',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#0f172a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1.5rem' }}>📦</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '4px' }}>{item.name}</div>
                        <div style={{ color: '#10b981', fontWeight: 'bold' }}>{item.price.toLocaleString()} MMK</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                          {language === 'zh' ? '库存' : language === 'en' ? 'Stock' : 'လက်ကျန်'}: {item.stock === -1 ? (language === 'zh' ? '无限' : 'Infinite') : item.stock}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                          type="button"
                          onClick={() => handleProductQuantityChange(item.id, -1)}
                          disabled={!selectedProducts[item.id]}
                          style={{ width: '32px', height: '32px', borderRadius: '16px', border: 'none', background: selectedProducts[item.id] ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: 'white', cursor: selectedProducts[item.id] ? 'pointer' : 'default' }}
                        >-</button>
                        <span style={{ color: 'white', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{selectedProducts[item.id] || 0}</span>
                        <button 
                          type="button"
                          onClick={() => handleProductQuantityChange(item.id, 1)}
                          disabled={item.stock !== -1 && (selectedProducts[item.id] || 0) >= item.stock}
                          style={{ width: '32px', height: '32px', borderRadius: '16px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowProductSelector(false)}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)'
              }}
            >
              {language === 'zh' ? '确 定' : language === 'en' ? 'Confirm' : 'အတည်ပြုသည်'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderModal;


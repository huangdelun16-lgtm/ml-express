import React from 'react';
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
  calculatePriceEstimate: () => void;
  handleOrderSubmit: (e: React.FormEvent) => void;
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
  calculatePriceEstimate,
  handleOrderSubmit
}) => {
  if (!showOrderForm) return null;

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
                  // 如果用户手动编辑地址，移除坐标信息
                  const lines = value.split('\n');
                  const addressLines = lines.filter(line => !line.includes('📍 坐标:'));
                  setSenderAddressText(addressLines.join('\n'));
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
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>{t.order.packageInfo}</h3>
            <select
              name="packageType"
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
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(5px)',
                fontFamily: 'var(--font-family-base)',
                cursor: 'pointer',
                appearance: 'none',
                color: 'var(--color-text-primary)',
                fontWeight: 'var(--font-weight-medium)',
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right var(--spacing-3) center',
                backgroundSize: '1em',
                paddingRight: '2.5rem'
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
                if (value === t.ui.oversizedPackage) {
                  setShowWeightInput(true);
                } else {
                  setShowWeightInput(false);
                }
              }}
            >
              <option value="">{t.order.selectType}</option>
              <option value={t.ui.document}>{t.ui.document}</option>
              <option value={t.ui.smallPackage}>{t.ui.smallPackage}</option>
              <option value={t.ui.mediumPackage}>{t.ui.mediumPackage}</option>
              <option value={t.ui.largePackage}>{t.ui.largePackage}</option>
              <option value={t.ui.oversizedPackage}>{t.ui.oversizedPackage}</option>
              <option value={t.ui.fragile}>{t.ui.fragile}</option>
              <option value={t.ui.foodDrinks}>{t.ui.foodDrinks}</option>
            </select>
            
            {showWeightInput && (
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.2rem', display: 'block' }}>
                  {language === 'zh' ? '包裹重量 (kg)' : language === 'en' ? 'Weight (kg)' : 'အလေးချိန် (kg)'}
                </label>
                <input
                  type="number"
                  name="weight"
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

            {/* 速度部分 */}
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>{t.ui.speed || '速度'}</h3>
            <select
              name="deliverySpeed"
              required
              value={selectedDeliverySpeed}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDeliverySpeed(value);
                // 如果选择了"定时达"，打开时间选择器
                if (value === t.ui.scheduledDelivery) {
                  setShowTimePickerModal(true);
                }
              }}
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
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(5px)',
                fontFamily: 'var(--font-family-base)',
                cursor: 'pointer',
                appearance: 'none',
                color: 'var(--color-text-primary)',
                fontWeight: 'var(--font-weight-medium)',
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right var(--spacing-3) center',
                backgroundSize: '1em',
                paddingRight: '2.5rem'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 140, 201, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-dark)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="">{t.ui.selectDeliverySpeed}</option>
              <option value={t.ui.onTimeDelivery}>{t.ui.onTimeDelivery}</option>
              <option value={t.ui.urgentDelivery}>{t.ui.urgentDelivery}</option>
              <option value={t.ui.scheduledDelivery}>{t.ui.scheduledDelivery}</option>
            </select>

            {/* 代收款 (仅Partner或VIP可见) */}
            {((currentUser && currentUser.user_type === 'partner') || (currentUser && currentUser.user_type === 'vip')) && (
              <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold', 
                  color: 'white',
                  fontSize: 'var(--font-size-base)'
                }}>
                  {language === 'zh' ? '代收款 (COD)' : language === 'en' ? 'Collection Amount (COD)' : 'ငွေကောက်ခံရန် (COD)'}
                </label>
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
            <h3 style={{ color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>💰 {language === 'zh' ? '价格估算' : language === 'en' ? 'Price Estimate' : 'စျေးနှုန်းခန့်မှန်းခြင်း'}</span>
              <button
                type="button"
                onClick={calculatePriceEstimate}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                }}
              >
                🧮 {language === 'zh' ? '计算' : language === 'en' ? 'Calculate' : 'တွက်ချက်ရန်'}
              </button>
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
                    📊 {language === 'zh' ? '点击"计算"按钮获取精准费用' : 
                        language === 'en' ? 'Click "Calculate" button to get accurate pricing' : 
                        'တိကျသော စျေးနှုန်းရရှိရန် "တွက်ချက်ရန်" ခလုတ်ကို နှိပ်ပါ'}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    {language === 'zh' ? '需要先填写寄件和收件地址' : 
                     language === 'en' ? 'Please fill in sender and receiver addresses first' : 
                     'ပို့ဆောင်သူနှင့် လက်ခံသူ လိပ်စာများကို ဦးစွာ ဖြည့်စွက်ပါ'}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      {language === 'zh' ? '配送距离' : language === 'en' ? 'Delivery Distance' : 'ပို့ဆောင်အကွာအဝေး'}:
                    </span>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>
                      {calculatedDistanceDetail} {language === 'zh' ? '公里' : language === 'en' ? 'km' : 'ကီလိုမီတာ'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      {language === 'zh' ? '基础费用' : language === 'en' ? 'Base Fee' : 'အခြေခံအခကြေး'}:
                    </span>
                    <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                      {pricingSettings.baseFee} MMK
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      {language === 'zh' ? '距离费用' : language === 'en' ? 'Distance Fee' : 'အကွာအဝေးအခ'}:
                    </span>
                    <span style={{ color: '#8b5cf6', fontWeight: '600' }}>
                      {Math.max(0, calculatedDistanceDetail - pricingSettings.freeKmThreshold) * pricingSettings.perKmFee} MMK
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      {language === 'zh' ? '超重费' : language === 'en' ? 'Overweight Fee' : 'အလေးချိန်ပိုအခ'}:
                    </span>
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>
                      {(() => {
                        const form = document.querySelector('form') as HTMLFormElement;
                        if (!form) return 0;
                        const formData = new FormData(form);
                        const weight = formData.get('weight') as string;
                        const weightNum = parseFloat(weight) || 1;
                        const weightThreshold = 5;
                        const weightFee = weightNum > weightThreshold ? (weightNum - weightThreshold) * pricingSettings.weightSurcharge : 0;
                        return weightFee;
                      })()} MMK
                    </span>
                  </div>
                  {/* 超规费 - 仅超规件显示 */}
                  {(() => {
                    const form = document.querySelector('form') as HTMLFormElement;
                    if (!form) return null;
                    const formData = new FormData(form);
                    const packageType = formData.get('packageType') as string;
                    const isOversized = packageType === t.ui.oversizedPackage || packageType === '超规件';
                    if (!isOversized) return null;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '超规费' : language === 'en' ? 'Oversize Fee' : 'အရွယ်အစားပိုအခ'}:
                        </span>
                        <span style={{ color: '#f97316', fontWeight: '600' }}>
                          {calculatedDistanceDetail * pricingSettings.oversizeSurcharge} MMK
                        </span>
                      </div>
                    );
                  })()}
                  
                  {/* 易碎品费 - 仅易碎品显示 */}
                  {(() => {
                    const form = document.querySelector('form') as HTMLFormElement;
                    if (!form) return null;
                    const formData = new FormData(form);
                    const packageType = formData.get('packageType') as string;
                    const isFragile = packageType === t.ui.fragile || packageType === '易碎品';
                    if (!isFragile) return null;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '易碎品费' : language === 'en' ? 'Fragile Fee' : 'ပျက်စီးလွယ်သောအခ'}:
                        </span>
                        <span style={{ color: '#f97316', fontWeight: '600' }}>
                          {calculatedDistanceDetail * pricingSettings.fragileSurcharge} MMK
                        </span>
                      </div>
                    );
                  })()}
                  
                  {/* 食品饮料费 - 仅食品饮料显示 */}
                  {(() => {
                    const form = document.querySelector('form') as HTMLFormElement;
                    if (!form) return null;
                    const formData = new FormData(form);
                    const packageType = formData.get('packageType') as string;
                    const isFoodDrinks = packageType === t.ui.foodDrinks || packageType === '食品和饮料';
                    if (!isFoodDrinks) return null;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          {language === 'zh' ? '食品饮料费' : language === 'en' ? 'Food & Drinks Fee' : 'အစားအသောက်အခ'}:
                        </span>
                        <span style={{ color: '#f97316', fontWeight: '600' }}>
                          {calculatedDistanceDetail * pricingSettings.foodBeverageSurcharge} MMK
                        </span>
                      </div>
                    );
                  })()}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      {language === 'zh' ? '配送速度费用' : language === 'en' ? 'Delivery Speed Fee' : 'ပို့ဆောင်မြန်နှုန်းအခ'}:
                    </span>
                    <span style={{ color: '#06b6d4', fontWeight: '600' }}>
                      {(() => {
                        const form = document.querySelector('form') as HTMLFormElement;
                        if (!form) return 0;
                        const formData = new FormData(form);
                        const deliverySpeed = formData.get('deliverySpeed') as string;
                        let speedFee = 0;
                        if (deliverySpeed === t.ui.urgentDelivery || deliverySpeed === '加急配送') {
                          speedFee = pricingSettings.urgentSurcharge;
                        } else if (deliverySpeed === t.ui.scheduledDelivery || deliverySpeed === '定时达') {
                          speedFee = pricingSettings.scheduledSurcharge;
                        }
                        // 准时达不加费，所以不需要处理 t.ui.onTimeDelivery
                        return speedFee;
                      })()} MMK
                    </span>
                  </div>
                  <div style={{ 
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)', 
                    paddingTop: '0.5rem', 
                    marginTop: '0.5rem', 
                    display: 'flex', 
                    justifyContent: 'space-between' 
                  }}>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {language === 'zh' ? '总费用' : language === 'en' ? 'Total Cost' : 'စုစုပေါင်းကုန်ကျစရိတ်'}:
                    </span>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      {calculatedPriceDetail} MMK
                    </span>
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
              onClick={() => setShowOrderForm(false)}
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
    </div>
  );
};

export default OrderModal;


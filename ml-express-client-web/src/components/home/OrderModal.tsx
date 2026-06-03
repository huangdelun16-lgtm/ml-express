import React, { useState, useEffect, useCallback, type CSSProperties } from 'react';
import OrderWizardProgress from './OrderWizardProgress';
import {
  WIZARD_LAST_STEP,
  getWizardCopy,
  getWizardStepLabels,
  validateAddressStep,
  validateDeliveryStep,
  validatePackageStep,
  type OrderWizardStepIndex,
} from './orderModalWizard';

/** 创建订单弹窗：与商家端 Web 统一视觉 */
const MODAL_OVERLAY: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
  background: 'rgba(15, 23, 42, 0.78)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

/** 创建订单弹窗设计尺寸（与商家端 Web 一致）；小屏用 min 夹在视口内 */
const ORDER_MODAL_WIDTH_PX = 680;
const ORDER_MODAL_HEIGHT_PX = 828;

const MODAL_PANEL: CSSProperties = {
  position: 'relative',
  width: `min(100%, ${ORDER_MODAL_WIDTH_PX}px)`,
  height: `min(${ORDER_MODAL_HEIGHT_PX}px, calc(100vh - 24px))`,
  maxHeight: `min(${ORDER_MODAL_HEIGHT_PX}px, calc(100vh - 24px))`,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxSizing: 'border-box',
  padding: 0,
  borderRadius: 20,
  background: 'linear-gradient(180deg, #0f172a 0%, #1e3a8a 38%, #334155 100%)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow:
    '0 25px 50px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 1px 0 rgba(255,255,255,0.08) inset',
};

const MODAL_CHROME: CSSProperties = {
  flexShrink: 0,
  position: 'relative',
  padding: 'clamp(1rem, 3vw, 1.35rem) clamp(1.1rem, 3.5vw, 1.5rem) 0.75rem',
  paddingRight: 'clamp(2.75rem, 6vw, 3.25rem)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

const MODAL_CLOSE_BTN: CSSProperties = {
  position: 'absolute',
  top: 'clamp(0.65rem, 2vw, 0.85rem)',
  right: 'clamp(0.65rem, 2vw, 0.85rem)',
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid rgba(255, 255, 255, 0.28)',
  background: 'rgba(15, 23, 42, 0.55)',
  color: '#f8fafc',
  fontSize: '1.35rem',
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 5,
  padding: 0,
};

const MODAL_BODY: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  padding: 'clamp(0.85rem, 3vw, 1.15rem) clamp(1.1rem, 3.5vw, 1.5rem) clamp(1.25rem, 4vw, 1.5rem)',
};

const SECTION_CARD: CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  padding: '1rem 1.05rem',
  marginBottom: '1rem',
  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)',
  border: '1px solid rgba(226, 232, 240, 0.9)',
};

const SECTION_CARD_TITLE: CSSProperties = {
  color: '#1e293b',
  fontSize: '1rem',
  fontWeight: 700,
  marginBottom: '0.85rem',
  letterSpacing: '0.02em',
};

const WIZARD_ACTION_BAR: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  marginBottom: 4,
};

const WIZARD_BTN_BACK: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255, 255, 255, 0.22)',
  background: 'rgba(15, 23, 42, 0.35)',
  color: '#e2e8f0',
  fontWeight: 700,
  fontSize: '0.88rem',
  cursor: 'pointer',
};

const WIZARD_BTN_PRIMARY: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '10px 16px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
  color: '#fff',
  fontWeight: 800,
  fontSize: '0.92rem',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
  minWidth: 108,
};

const MODAL_HEADING: CSSProperties = {
  color: '#f8fafc',
  textAlign: 'center',
  margin: '0 0 0.5rem 0',
  fontSize: 'clamp(1.2rem, 3.8vw, 1.4rem)',
  fontWeight: 800,
  letterSpacing: '0.02em',
  textShadow: '0 1px 2px rgba(0,0,0,0.35)',
};

const SECTION_HEADING: CSSProperties = {
  color: 'rgba(248, 250, 252, 0.92)',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: '0.7rem',
};

const BLOCK_TITLE: CSSProperties = {
  color: 'rgba(248, 250, 252, 0.96)',
  fontSize: '1rem',
  fontWeight: 700,
  marginBottom: '0.85rem',
  letterSpacing: '0.02em',
};

const PRICE_ESTIMATE_CARD: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.55)',
  borderRadius: 14,
  padding: '1rem 1.05rem',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2) inset',
};

const FORM_ACTIONS_ROW: CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'center',
  marginTop: '0.5rem',
  flexWrap: 'wrap' as const,
};

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
  selectedPackageType: string;
  setSelectedPackageType: (v: string) => void;
  orderWeight: string;
  setOrderWeight: (v: string) => void;
  isCalculated: boolean;
  calculatedPriceDetail: number;
  calculatedDistanceDetail: number;
  pricingSettings: any;
  handleOpenMapModal: (type: 'sender' | 'receiver') => void;
  handleOrderSubmit: (e: React.FormEvent) => void;
  handleCancelOrder?: () => void; // 🚀 新增：取消订单处理
  // 🚀 优化：坐标自动选择相关
  setSelectedSenderLocation?: (loc: {lat: number, lng: number} | null) => void;
  setSelectedReceiverLocation?: (loc: {lat: number, lng: number} | null) => void;
  selectedSenderLocation?: { lat: number; lng: number } | null;
  selectedReceiverLocation?: { lat: number; lng: number } | null;
  onWizardStepChange?: (step: OrderWizardStepIndex) => void;
  cartTotal?: number;
  hasCOD?: boolean;
  setHasCOD?: (val: boolean) => void;
  isFromCart?: boolean;
  description?: string; // 🚀 新增：物品描述
  setDescription?: (val: string) => void; // 🚀 新增：设置描述
  paymentMethod?: 'qr' | 'cash' | 'balance'; // 🚀 新增：支付方式
  setPaymentMethod?: (val: 'qr' | 'cash' | 'balance') => void; // 🚀 新增：设置支付方式
  setScheduledDeliveryTime?: (val: string) => void; // 顺路递与定时达互斥时清空预约时间
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
  selectedPackageType,
  setSelectedPackageType,
  orderWeight,
  setOrderWeight,
  isCalculated,
  calculatedPriceDetail,
  calculatedDistanceDetail,
  pricingSettings,
  handleOpenMapModal,
  handleOrderSubmit,
  handleCancelOrder = () => setShowOrderForm(false),
  setSelectedSenderLocation = () => {},
  setSelectedReceiverLocation = () => {},
  selectedSenderLocation = null,
  selectedReceiverLocation = null,
  onWizardStepChange,
  cartTotal = 0,
  hasCOD = true,
  setHasCOD = () => {},
  isFromCart = false,
  description = '',
  setDescription = () => {},
  paymentMethod = 'cash',
  setPaymentMethod = () => {},
  setScheduledDeliveryTime = () => {}
}) => {
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
  const [wizardStep, setWizardStep] = useState<OrderWizardStepIndex>(0);
  /** 进入确认步后短暂禁用「提交」，避免与「下一步」同位置误触 */
  const [confirmStepArmed, setConfirmStepArmed] = useState(false);

  const wizardCopy = getWizardCopy(language);
  const wizardLabels = getWizardStepLabels(language);

  const goToStep = useCallback(
    (step: OrderWizardStepIndex) => {
      setWizardStep(step);
      onWizardStepChange?.(step);
    },
    [onWizardStepChange]
  );

  const isVipMember = Boolean(
    currentUser && (currentUser.balance > 0 || currentUser.user_type === 'vip'),
  );
  const balanceAfterCart = (currentUser?.balance ?? 0) - (isFromCart ? cartTotal : 0);
  const courierFeeMmk = Math.round(calculatedPriceDetail);
  const canPayCourierFeeByBalance =
    isVipMember && balanceAfterCart >= courierFeeMmk && courierFeeMmk > 0;

  useEffect(() => {
    if (showOrderForm) {
      goToStep(0);
    }
  }, [showOrderForm, goToStep]);

  useEffect(() => {
    if (!showOrderForm) {
      setConfirmStepArmed(false);
      return;
    }
    if (wizardStep !== WIZARD_LAST_STEP) {
      setConfirmStepArmed(false);
      return;
    }
    setConfirmStepArmed(false);
    const timer = window.setTimeout(() => setConfirmStepArmed(true), 480);
    return () => window.clearTimeout(timer);
  }, [showOrderForm, wizardStep]);

  useEffect(() => {
    if (!showOrderForm) return;
    if (paymentMethod === 'balance' && !canPayCourierFeeByBalance) {
      setPaymentMethod('cash');
    }
  }, [showOrderForm, paymentMethod, canPayCourierFeeByBalance, setPaymentMethod]);

  const handleWizardBack = () => {
    if (wizardStep > 0) goToStep((wizardStep - 1) as OrderWizardStepIndex);
  };

  const handleWizardNext = () => {
    if (wizardStep === 0) {
      const err = validateAddressStep(
        {
          senderName,
          senderPhone,
          senderAddress: senderAddressText,
          receiverName,
          receiverPhone,
          receiverAddress: receiverAddressText,
          senderLocation: selectedSenderLocation,
          receiverLocation: selectedReceiverLocation,
        },
        wizardCopy
      );
      if (err) {
        window.alert(err);
        return;
      }
    }
    if (wizardStep === 1) {
      if (selectedDeliverySpeed !== 'Eco Way' && !selectedPackageType?.trim()) {
        window.alert(wizardCopy.fillRequired);
        return;
      }
      const err = validatePackageStep(showWeightInput, orderWeight, wizardCopy);
      if (err) {
        window.alert(err);
        return;
      }
    }
    if (wizardStep === 2) {
      const err = validateDeliveryStep(
        selectedDeliverySpeed,
        scheduledDeliveryTime,
        t.ui.scheduledDelivery,
        wizardCopy
      );
      if (err) {
        window.alert(err);
        return;
      }
    }
    if (wizardStep < WIZARD_LAST_STEP) {
      setConfirmStepArmed(false);
      goToStep((wizardStep + 1) as OrderWizardStepIndex);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep !== WIZARD_LAST_STEP) {
      handleWizardNext();
      return;
    }
    if (!isCalculated) {
      window.alert(
        language === 'zh'
          ? '请稍候，正在计算跑腿费…'
          : language === 'en'
            ? 'Please wait for the delivery fee estimate.'
            : 'ပို့ဆောင်ခ ခန့်မှန်းချက် စောင့်ပါ',
      );
      return;
    }
    if (!confirmStepArmed) {
      return;
    }
    handleOrderSubmit(e);
  };

  const handleExplicitSubmit = () => {
    handleFormSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

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
    { value: 'Eco Way', label: t.ui.waySideDeliveryOption, icon: '🌿' },
  ];

  const orderTitle =
    language === 'zh' ? '立即下单' : language === 'en' ? 'Place Order' : 'အမှာစာတင်';

  return (
    <div style={MODAL_OVERLAY}>
      <div style={MODAL_PANEL}>
        <div style={MODAL_CHROME}>
          <button
            type="button"
            style={MODAL_CLOSE_BTN}
            onClick={handleCancelOrder}
            aria-label={
              language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်မည်'
            }
            title={
              language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်မည်'
            }
          >
            ×
          </button>
          <h2 style={{ ...MODAL_HEADING, marginBottom: '0.35rem' }}>{orderTitle}</h2>
          <p
            style={{
              textAlign: 'center',
              margin: '0 0 0.65rem',
              color: 'rgba(255, 255, 255, 0.88)',
              fontSize: '0.92rem',
            }}
          >
            {wizardCopy.subtitle}
          </p>
          <div
            style={{
              height: 3,
              width: 40,
              background: '#fbbf24',
              borderRadius: 2,
              margin: '0 auto 1rem',
            }}
          />

          <OrderWizardProgress currentStep={wizardStep} labels={wizardLabels} />

          <div style={WIZARD_ACTION_BAR}>
            <div style={{ flex: 1, minWidth: 72 }}>
              {wizardStep > 0 ? (
                <button type="button" style={WIZARD_BTN_BACK} onClick={handleWizardBack}>
                  ← {wizardCopy.back}
                </button>
              ) : (
                <button
                  type="button"
                  style={{ ...WIZARD_BTN_BACK, visibility: 'hidden' }}
                  tabIndex={-1}
                  aria-hidden
                >
                  ←
                </button>
              )}
            </div>
            <span
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
              }}
            >
              {wizardStep + 1} / {WIZARD_LAST_STEP + 1}
            </span>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {wizardStep < WIZARD_LAST_STEP ? (
                <button type="button" style={WIZARD_BTN_PRIMARY} onClick={handleWizardNext}>
                  {wizardCopy.next} →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!confirmStepArmed || !isCalculated}
                  onClick={handleExplicitSubmit}
                  style={{
                    ...WIZARD_BTN_PRIMARY,
                    opacity: !confirmStepArmed || !isCalculated ? 0.55 : 1,
                    cursor: !confirmStepArmed || !isCalculated ? 'not-allowed' : 'pointer',
                  }}
                  title={
                    !isCalculated
                      ? language === 'zh'
                        ? '请先完成价格估算'
                        : 'Complete price estimate first'
                      : !confirmStepArmed
                        ? language === 'zh'
                          ? '请选择支付方式后再提交'
                          : 'Choose payment method first'
                        : undefined
                  }
                >
                  🚚 {t.order.submit}
                  {isCalculated
                    ? ` · ${Math.round(calculatedPriceDetail).toLocaleString()} MMK`
                    : ''}
                </button>
              )}
            </div>
          </div>

        {/* 🚀 身份识别标签 (对齐 App) */}
        {currentUser && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem', gap: '10px' }}>
            {(currentUser.balance > 0 || currentUser.user_type === 'vip') ? (
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
        </div>

        <form
          id="client-order-wizard-form"
          onSubmit={handleFormSubmit}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (wizardStep !== WIZARD_LAST_STEP || !confirmStepArmed) {
              e.preventDefault();
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          {/* 确认步各向导字段不在 DOM 中，隐藏域保证 FormData/提交逻辑始终能读到值 */}
          <input type="hidden" name="senderName" value={senderName} readOnly />
          <input type="hidden" name="senderPhone" value={senderPhone} readOnly />
          <input type="hidden" name="receiverName" value={receiverName} readOnly />
          <input type="hidden" name="receiverPhone" value={receiverPhone} readOnly />
          <input
            type="hidden"
            name="packageType"
            value={selectedDeliverySpeed === 'Eco Way' ? t.ui.waySide : selectedPackageType}
            readOnly
          />
          <input type="hidden" name="weight" value={orderWeight} readOnly />
          <input type="hidden" name="deliverySpeed" value={selectedDeliverySpeed} readOnly />
          <input type="hidden" name="description" value={description} readOnly />
          <div style={MODAL_BODY}>
          {wizardStep === 0 && (
          <div style={SECTION_CARD}>
            <h3 style={SECTION_CARD_TITLE}>{t.order.sender}</h3>
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
          )}

          {wizardStep === 0 && (
          <div style={SECTION_CARD}>
            <h3 style={SECTION_CARD_TITLE}>{t.order.receiver}</h3>
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
          )}

          {wizardStep === 1 && (
          <div style={SECTION_CARD}>
            <h3 style={SECTION_CARD_TITLE}>
              📦 {language === 'zh' ? '包裹信息' : language === 'en' ? 'Package' : 'ပါဆယ်အချက်အလက်'}
            </h3>

            {/* 自定义包裹类型：选择「顺路递（24小时内）」配送时固定为顺路递 */}
            <div style={{ position: 'relative', marginBottom: 'var(--spacing-2)' }}>
              {selectedDeliverySpeed === 'Eco Way' ? (
                <>
                  <input type="hidden" name="packageType" value={t.ui.waySide} />
                  <div
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-3) var(--spacing-4)',
                      border: '2px solid rgba(16, 185, 129, 0.5)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-base)',
                      background: 'rgba(255, 255, 255, 0.85)',
                      color: 'var(--color-text-primary)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🌿</span>
                    <span>{t.ui.waySideDeliveryOption}</span>
                  </div>
                </>
              ) : (
                <>
              <input type="hidden" name="packageType" value={selectedPackageType} required />
              <div
                onClick={() => setShowPackageDropdown(!showPackageDropdown)}
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
                  color: selectedPackageType ? 'var(--color-text-primary)' : 'rgba(0,0,0,0.4)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all 0.3s'
                }}
              >
                <span>
                  {selectedPackageType 
                    ? packageTypes.find(p => p.value === selectedPackageType)?.icon + ' ' + packageTypes.find(p => p.value === selectedPackageType)?.label
                    : t.order.selectType}
                </span>
                <span style={{ 
                  transform: showPackageDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }}>▼</span>
              </div>

              {showPackageDropdown && (
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
                </>
              )}
            </div>

            {/* 显示包裹类型说明 */}
            {(selectedPackageType || selectedDeliverySpeed === 'Eco Way') && (
              <div style={{
                marginTop: '-0.5rem',
                marginBottom: '1rem',
                padding: '0.8rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                borderLeft: '4px solid #f59e0b',
                color: '#334155',
                fontSize: '0.85rem',
                lineHeight: '1.4'
              }}>
                <span style={{ marginRight: '5px' }}>💡</span>
                {selectedDeliverySpeed === 'Eco Way'
                  ? t.ui.packageTypeInfo.waySide
                  : packageTypes.find(p => p.value === selectedPackageType)?.description}
              </div>
            )}
            
            {showWeightInput && (
              <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                <label style={{ color: '#334155', fontSize: '0.9rem', marginBottom: '0.2rem', display: 'block' }}>
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
              <label style={{ color: '#334155', fontSize: '0.9rem', marginBottom: '0.2rem', display: 'block' }}>
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
            {isFromCart && cartTotal > 0 && currentUser && (
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
          </div>
          )}

          {wizardStep === 2 && (
          <div style={SECTION_CARD}>
            <h3 style={SECTION_CARD_TITLE}>{t.ui.deliveryOptions || t.ui.speed || '配送选项'}</h3>
            
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
                        setSelectedDeliverySpeed(speed.value);
                        setShowSpeedDropdown(false);
                        if (speed.value === t.ui.scheduledDelivery) {
                          setShowTimePickerModal(true);
                        }
                        if (speed.value === 'Eco Way') {
                          setSelectedPackageType(t.ui.waySide);
                          setShowWeightInput(false);
                          setScheduledDeliveryTime('');
                        } else {
                          if (selectedPackageType === t.ui.waySide) {
                            setSelectedPackageType(t.ui.standardPackageDetail);
                            setShowWeightInput(false);
                          }
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
                    color: '#1e293b',
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
          )}

          {wizardStep === 3 && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ ...SECTION_HEADING, marginBottom: '0.75rem' }}>
              💰 {language === 'zh' ? '价格估算' : language === 'en' ? 'Price Estimate' : 'စျေးနှုန်းခန့်မှန်းခြင်း'}
            </h3>
            
            <div style={PRICE_ESTIMATE_CARD}>
              {!isCalculated ? (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    📊 {language === 'zh' ? '填写地址、包裹与配送选项后将自动显示费用' :
                        language === 'en' ? 'Fee updates automatically when address, package and delivery are set' :
                        'လိပ်စာ၊ ပါဆယ်နှင့် ပို့ဆောင်ရွေးချယ်မှု ပြီးပါက အလိုအလျောက် ပြသပါမည်'}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    {language === 'zh' ? '超重/超规件请填写重量' :
                     language === 'en' ? 'Enter weight for overweight/oversized items' :
                     'အလေးချိန်ပိုပါဆယ် သို့မဟုတ် အရွယ်ပိုပါဆယ်အတွက် အလေးချိန်ကို ဖြည့်ပါ'}
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
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        🚚 {language === 'zh' ? '跑腿费' : language === 'en' ? 'Delivery Fee' : 'ပို့ဆောင်ခ'}
                      </span>
                      <span style={{ color: 'white', fontWeight: '950', fontSize: '1.4rem' }}>
                        {Math.round(calculatedPriceDetail).toLocaleString()} MMK
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <h3 style={{ ...SECTION_HEADING, marginTop: '1rem', marginBottom: '0.65rem' }}>
              💳 {language === 'zh' ? '跑腿费支付方式' : language === 'en' ? 'Pay delivery fee with' : 'ပို့ဆောင်ခ ပေးချေမှု'}
            </h3>
            <div style={PRICE_ESTIMATE_CARD}>
              <p style={{ margin: '0 0 0.75rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem' }}>
                {language === 'zh'
                  ? '请选择余额或现金支付跑腿费，确认后再点右上角「提交订单」。'
                  : language === 'en'
                    ? 'Choose balance or cash for the delivery fee, then tap Submit.'
                    : 'ပို့ဆောင်ခ အတွက် လက်ကျန်ငွေ သို့မဟုတ် ငွေသား ရွေးချယ်ပါ'}
              </p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  disabled={!canPayCourierFeeByBalance}
                  title={
                    !isVipMember
                      ? language === 'zh'
                        ? '仅 VIP 会员可使用余额支付跑腿费'
                        : language === 'en'
                          ? 'Balance payment for delivery fee is for VIP members only'
                          : 'VIP အဖွဲ့ဝင်များသာ လက်ကျန်ငွေဖြင့် ပို့ဆောင်ခ ပေးချေနိုင်ပါသည်'
                      : !canPayCourierFeeByBalance
                        ? language === 'zh'
                          ? `余额不足（需 ${courierFeeMmk.toLocaleString()} MMK，可用 ${Math.max(0, balanceAfterCart).toLocaleString()} MMK）`
                          : language === 'en'
                            ? `Insufficient balance (need ${courierFeeMmk.toLocaleString()} MMK)`
                            : 'လက်ကျန်ငွေ မလုံလောက်ပါ'
                        : language === 'zh'
                          ? '使用账户余额支付跑腿费'
                          : language === 'en'
                            ? 'Pay delivery fee from balance'
                            : 'လက်ကျန်ငွေဖြင့် ပို့ဆောင်ခ ပေးချေရန်'
                  }
                  onClick={() => canPayCourierFeeByBalance && setPaymentMethod('balance')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    border: '2px solid',
                    borderColor: paymentMethod === 'balance' ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                    background:
                      paymentMethod === 'balance'
                        ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)'
                        : canPayCourierFeeByBalance
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(255,255,255,0.06)',
                    color:
                      paymentMethod === 'balance'
                        ? '#1e293b'
                        : canPayCourierFeeByBalance
                          ? 'white'
                          : 'rgba(255,255,255,0.4)',
                    cursor: canPayCourierFeeByBalance ? 'pointer' : 'not-allowed',
                    opacity: canPayCourierFeeByBalance ? 1 : 0.65,
                    transition: 'all 0.3s ease',
                    boxShadow:
                      paymentMethod === 'balance'
                        ? '0 4px 15px rgba(251, 191, 36, 0.3)'
                        : 'none',
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
                    boxShadow: paymentMethod === 'cash' ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none',
                  }}
                >
                  💵 {language === 'zh' ? '现金支付' : 'Cash'}
                </button>
              </div>

              {currentUser ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '10px',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                    💰 {language === 'zh' ? '账户余额' : language === 'en' ? 'Account Balance' : 'လက်ကျန်ငွေ'}:
                  </span>
                  <span
                    style={{
                      color: balanceAfterCart >= 0 ? '#4ade80' : '#f87171',
                      fontWeight: 'bold',
                    }}
                  >
                    {balanceAfterCart.toLocaleString()} MMK
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          )}

          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;


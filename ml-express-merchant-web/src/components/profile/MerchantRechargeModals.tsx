import React, { RefObject } from 'react';
import type { MerchantLanguage } from '../../constants/merchantOrderStatus';

const PRESET_AMOUNTS = [10000, 50000, 100000, 300000, 500000, 1000000];

export interface MerchantRechargeModalsProps {
  language: MerchantLanguage;
  showRechargeModal: boolean;
  showPaymentQRModal: boolean;
  rechargeAmount: string;
  selectedRechargeAmount: number | null;
  rechargeProofPreview: string | null;
  loading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onCloseRecharge: () => void;
  onClosePayment: () => void;
  onSelectAmount: (amount: string) => void;
  onNextStep: () => void;
  onSaveQR: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmRecharge: () => void;
}

const MerchantRechargeModals: React.FC<MerchantRechargeModalsProps> = ({
  language,
  showRechargeModal,
  showPaymentQRModal,
  rechargeAmount,
  selectedRechargeAmount,
  rechargeProofPreview,
  loading,
  fileInputRef,
  onCloseRecharge,
  onClosePayment,
  onSelectAmount,
  onNextStep,
  onSaveQR,
  onFileChange,
  onConfirmRecharge,
}) => {
  const zh = language === 'zh';

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(15px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    padding: 20,
  };

  const panel: React.CSSProperties = {
    backgroundColor: '#1e293b',
    borderRadius: 32,
    padding: '2.5rem',
    width: '100%',
    maxWidth: 450,
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
    position: 'relative',
  };

  return (
    <>
      {showRechargeModal ? (
        <div style={overlay}>
          <div style={panel}>
            <button type="button" onClick={onCloseRecharge} style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: 12, cursor: 'pointer' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💰</div>
              <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 900, margin: 0 }}>{zh ? '账户充值' : 'Recharge Balance'}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>{zh ? '请选择充值卡金额' : 'Select recharge amount'}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => onSelectAmount(amount.toString())}
                  style={{
                    padding: '1.2rem',
                    borderRadius: 18,
                    background: rechargeAmount === amount.toString() ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${rechargeAmount === amount.toString() ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                    color: 'white',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {amount.toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>MMK</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onNextStep}
              disabled={loading || !rechargeAmount || parseFloat(rechargeAmount) <= 0}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: 18,
                borderRadius: 18,
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 800,
                cursor: loading || !rechargeAmount ? 'not-allowed' : 'pointer',
                opacity: loading || !rechargeAmount ? 0.6 : 1,
              }}
            >
              {zh ? '下一步' : 'Next Step'}
            </button>
          </div>
        </div>
      ) : null}

      {showPaymentQRModal && selectedRechargeAmount ? (
        <div style={{ ...overlay, zIndex: 100000 }}>
          <div style={{ ...panel, maxWidth: 480, padding: '1.5rem' }}>
            <button type="button" onClick={onClosePayment} style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: 12, cursor: 'pointer' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>扫描二维码支付</h3>
              <p style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 900, marginTop: '0.5rem' }}>{selectedRechargeAmount.toLocaleString()} MMK</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'white', padding: 15, borderRadius: 24, position: 'relative' }}>
                <img src={`/kbz_qr_${selectedRechargeAmount}.png`} alt="KBZPay QR" style={{ width: 220, height: 220, objectFit: 'contain' }} />
                <button type="button" onClick={onSaveQR} title="保存图片" style={{ position: 'absolute', top: 10, right: 10, background: '#3b82f6', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer' }}>💾</button>
              </div>
              <div style={{ width: '100%' }}>
                <p style={{ color: 'white', fontSize: '0.9rem', marginBottom: 10, fontWeight: 600 }}>上传支付凭证截图：</p>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: 140,
                    border: '2px dashed rgba(255,255,255,0.2)',
                    borderRadius: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: rechargeProofPreview ? `url(${rechargeProofPreview}) center/contain no-repeat` : 'rgba(255,255,255,0.02)',
                    backgroundColor: rechargeProofPreview ? '#000' : 'transparent',
                  }}
                >
                  {!rechargeProofPreview ? <><span style={{ fontSize: '1.75rem' }}>📸</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>点击上传汇款记录</span></> : null}
                </div>
                <input type="file" ref={fileInputRef as RefObject<HTMLInputElement>} onChange={onFileChange} accept="image/*" style={{ display: 'none' }} />
              </div>
              <button
                type="button"
                onClick={onConfirmRecharge}
                disabled={loading || !rechargeProofPreview}
                style={{
                  width: '100%',
                  padding: 18,
                  borderRadius: 18,
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  fontWeight: 800,
                  cursor: loading || !rechargeProofPreview ? 'not-allowed' : 'pointer',
                  opacity: loading || !rechargeProofPreview ? 0.6 : 1,
                }}
              >
                {loading ? '...' : '确认已支付'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default MerchantRechargeModals;

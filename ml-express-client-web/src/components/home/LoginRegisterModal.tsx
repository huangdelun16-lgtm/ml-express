import React from 'react';

export interface RegisterFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
}

export interface LoginRegisterModalProps {
  language: string;
  isLoginMode: boolean;
  setIsLoginMode: (v: boolean) => void;
  registerMethod: 'phone' | 'email';
  setRegisterMethod: (m: 'phone' | 'email') => void;
  registerForm: RegisterFormState;
  setRegisterForm: React.Dispatch<React.SetStateAction<RegisterFormState>>;
  setCodeSent: (v: boolean) => void;
  countdown: number;
  setCountdown: (v: number) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  onSendVerificationCode: () => void | Promise<void>;
}

const LoginRegisterModal: React.FC<LoginRegisterModalProps> = ({
  language,
  isLoginMode,
  setIsLoginMode,
  registerMethod,
  setRegisterMethod,
  registerForm,
  setRegisterForm,
  setCodeSent,
  setCountdown,
  onClose,
  onSubmit,
  onSendVerificationCode,
  countdown
}) => {
  const resetForm = () => {
    setRegisterForm({ name: '', phone: '', email: '', address: '', password: '', confirmPassword: '', verificationCode: '' });
    setCodeSent(false);
    setCountdown(0);
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.75) 100%)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999,
        animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)', padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          resetForm();
        }
      }}
    >
      <div style={{
        background: 'rgba(255, 255, 255, 0.98)', padding: window.innerWidth < 768 ? '2rem 1.5rem' : '3.5rem 2.75rem',
        borderRadius: '32px', width: window.innerWidth < 768 ? '100%' : '520px', maxWidth: '95vw', maxHeight: '92vh',
        overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.3)',
        position: 'relative', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1)'
      }}>
        <button
          type="button"
          onClick={() => { onClose(); resetForm(); }}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', zIndex: 10 }}
        >✕</button>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '80px', height: '80px', marginBottom: '1.25rem', objectFit: 'contain' }} />
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: '850' }}>
            {isLoginMode ? (language === 'zh' ? '欢迎回来' : 'Welcome Back') : (language === 'zh' ? '创建账户' : 'Create Account')}
          </h2>
        </div>

        {!isLoginMode && (
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '16px', marginBottom: '2rem' }}>
              <button type="button" onClick={() => setRegisterMethod('phone')} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer', background: registerMethod === 'phone' ? 'white' : 'transparent', color: registerMethod === 'phone' ? '#2563eb' : '#64748b' }}>📱 {language === 'zh' ? '手机号' : 'Phone'}</button>
              <button type="button" onClick={() => setRegisterMethod('email')} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer', background: registerMethod === 'email' ? 'white' : 'transparent', color: registerMethod === 'email' ? '#2563eb' : '#64748b' }}>📧 {language === 'zh' ? '邮箱' : 'Email'}</button>
        </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isLoginMode ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '700' }}>{language === 'zh' ? '邮箱或手机号' : 'Email/Phone'}</label>
                <input type="text" value={registerForm.email || registerForm.phone} onChange={(e) => { const v = e.target.value; if (v.includes('@')) setRegisterForm({...registerForm, email: v, phone: ''}); else setRegisterForm({...registerForm, phone: v, email: ''}); }} required style={{ padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '700' }}>{language === 'zh' ? '密码' : 'Password'}</label>
                <input type="password" value={registerForm.password} onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})} required style={{ padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none' }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '700' }}>{language === 'zh' ? '姓名' : 'Name'}</label>
                <input type="text" value={registerForm.name} onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})} required placeholder={language === 'zh' ? '请输入您的姓名' : 'Your Full Name'} style={{ padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '700' }}>{language === 'zh' ? '密码' : 'Password'}</label>
                  <input type="password" value={registerForm.password} onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})} required minLength={6} style={{ padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none', width: '100%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '700' }}>{language === 'zh' ? '确认密码' : 'Confirm'}</label>
                  <input type="password" value={registerForm.confirmPassword} onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})} required minLength={6} style={{ padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none', width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '700' }}>{registerMethod === 'phone' ? (language === 'zh' ? '电话号码' : 'Phone') : (language === 'zh' ? '邮箱' : 'Email')}</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {registerMethod === 'phone' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 1rem',
                      background: '#f8fafc',
                      border: '2px solid #e2e8f0',
                      borderRadius: '16px',
                      color: '#475569',
                      fontWeight: '800',
                      fontSize: '1rem'
                    }}>
                      +95
                    </div>
                  )}
                  <input
                    type={registerMethod === 'phone' ? 'tel' : 'email'}
                    value={registerMethod === 'phone' ? registerForm.phone : registerForm.email}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (registerMethod === 'phone') {
                        if (val.startsWith('0')) {
                          val = val.substring(1);
                        }
                        setRegisterForm({...registerForm, phone: val});
                      } else {
                        setRegisterForm({...registerForm, email: val});
                      }
                    }}
                    required
                    placeholder={registerMethod === 'phone' ? '9xxxxxxxx' : 'example@gmail.com'}
                    style={{ flex: 1, padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none' }}
                  />
                  <button type="button" onClick={() => void onSendVerificationCode()} disabled={countdown > 0} style={{ padding: '0 1.25rem', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '16px', fontWeight: '800', cursor: 'pointer' }}>{countdown > 0 ? countdown + 's' : (language === 'zh' ? '获取验证码' : 'Get Code')}</button>
                </div>
                {registerMethod === 'phone' && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: '600', fontStyle: 'italic' }}>
                    {language === 'zh' ? '备注***目前只有 MYTEL Sim卡 能收到验证码***' :
                     language === 'en' ? 'Note: Currently only MYTEL Sim cards can receive codes' :
                     'မှတ်ချက် - လက်ရှိတွင် MYTEL Sim ကတ်များသာ ကုဒ်လက်ခံရရှိနိုင်ပါသည်'}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '700' }}>{language === 'zh' ? '验证码' : 'Code'}</label>
                <input type="text" value={registerForm.verificationCode} onChange={(e) => setRegisterForm({...registerForm, verificationCode: e.target.value})} placeholder="000000" maxLength={6} required style={{ padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none', textAlign: 'center', letterSpacing: '0.5rem', fontWeight: '900', fontSize: '1.25rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '700' }}>{language === 'zh' ? '详细地址' : 'Address'}</label>
                <textarea value={registerForm.address} onChange={(e) => setRegisterForm({...registerForm, address: e.target.value})} placeholder={language === 'zh' ? '收货或寄件地址' : 'Full Address'} rows={2} style={{ padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none', resize: 'none' }} />
              </div>
            </>
          )}
          <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white', border: 'none', padding: '1.125rem', borderRadius: '18px', cursor: 'pointer', fontWeight: '800', fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.3)', marginTop: '1rem' }}>{isLoginMode ? (language === 'zh' ? '立即登录' : 'Sign In') : (language === 'zh' ? '创建账户' : 'Create Account')}</button>
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}><span onClick={() => { setIsLoginMode(!isLoginMode); }} style={{ color: '#64748b', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '600' }}>{isLoginMode ? (language === 'zh' ? '还没有账号？点此注册' : 'No account? Sign Up') : (language === 'zh' ? '已有账号？点此登录' : 'Have account? Login')}</span></div>
        </form>
      </div>
    </div>
  );
};

export default LoginRegisterModal;

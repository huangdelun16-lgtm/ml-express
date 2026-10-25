import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getMerchantLoginBlockReason,
  type MerchantLoginLang,
} from '../services/_shared/merchantLoginGuard';
import Logo from '../components/Logo';
import './LoginPage.css';

type RecoverCode =
  | 'contact_admin'
  | 'not_found'
  | 'transit_station'
  | 'inactive'
  | 'missing_code'
  | 'unavailable';

type RecoverHelp = {
  code: RecoverCode;
  hasPhone?: boolean;
  hasEmail?: boolean;
};

const RECOVER_CODES: RecoverCode[] = [
  'contact_admin',
  'not_found',
  'transit_station',
  'inactive',
  'missing_code',
];

const LoginPage: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const { language, setLanguage, t: siteCopy } = useLanguage();
  const navigate = useNavigate();
  const [storeCode, setStoreCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const [help, setHelp] = useState<RecoverHelp | null>(null);
  const supportPhone = String(siteCopy?.contact?.phoneValue || '(+95) 09788848928');

  const t = {
    zh: {
      title: '商户管理系统',
      subtitle: '欢迎使用 MARKET LINK EXPRESS 经营指挥中心',
      storeCode: '店铺代码 (Store ID)',
      password: '安全密码',
      login: '立即登录系统',
      error: '登录失败，请检查店铺代码或密码',
      network: '连不上数据库。请刷新后再试，或检查网络。',
      storePlaceholder: '请输入 MDY00X 格式代码',
      passPlaceholder: '请输入您的登录密码',
      forgot: '忘记密码？',
      recoverHint: '请填写店铺代码。系统只核对账号是否存在，不会在这里发送或显示新密码。',
      recoverSubmit: '查询重置方式',
      backToLogin: '返回登录',
      missingCode: '请输入店铺代码',
      notFound: '没有找到这个店铺代码，请核对后再试。',
      transit: '该账号是跨境中转站账号，不能在商家端重置密码，请联系平台管理员。',
      inactive: '账号当前不可用，不能在这里重置，请联系平台管理员。',
      contactPhone: '该店铺已登记手机号。平台目前不能短信自助重置。请联系平台管理员，核对登记手机号后修改密码。',
      contactEmail: '该店铺未登记手机号，已登记邮箱。平台目前不能邮件自助重置。请联系平台管理员，核对登记邮箱后修改密码。',
      contactNone: '该店铺未登记手机号或邮箱。请联系平台管理员，并提供店铺代码以便重置密码。',
      unavailable: '暂时无法核对店铺。请稍后再试，或直接联系平台管理员。',
      phoneLabel: '客服电话'
    },
    en: {
      title: 'Merchant System',
      subtitle: 'Welcome to MARKET LINK EXPRESS Command Center',
      storeCode: 'Store ID',
      password: 'Security Password',
      login: 'Login to System',
      error: 'Login failed, please check credentials',
      network: 'Cannot reach the database. Refresh and try again.',
      storePlaceholder: 'Enter store code (e.g. MDY001)',
      passPlaceholder: 'Enter your password',
      forgot: 'Forgot password?',
      recoverHint: 'Enter the store code. This page only checks whether the account exists. It does not send or show a new password.',
      recoverSubmit: 'Check how to reset',
      backToLogin: 'Back to login',
      missingCode: 'Enter the store code',
      notFound: 'No store was found for this code. Check it and try again.',
      transit: 'This is a cross-border hub account and cannot be reset on the merchant site. Please contact the platform admin.',
      inactive: 'This account is not active and cannot be reset here. Please contact the platform admin.',
      contactPhone: 'A mobile number is on file for this store. Self-service SMS reset is not available. Contact the platform admin to verify that number and reset the password.',
      contactEmail: 'No mobile number is on file. An email is on file. Self-service email reset is not available. Contact the platform admin to verify that email and reset the password.',
      contactNone: 'No mobile number or email is on file. Contact the platform admin and give them the store code.',
      unavailable: 'The store could not be checked just now. Try again later, or contact the platform admin directly.',
      phoneLabel: 'Support'
    },
    my: {
      title: 'ကုန်သည်စနစ်',
      subtitle: 'MARKET LINK EXPRESS စီမံခန့်ခွဲမှုစင်တာသို့ ကြိုဆိုပါသည်',
      storeCode: 'ဆိုင်ကုဒ်',
      password: 'စကားဝှက်',
      login: 'စနစ်သို့ဝင်ရောက်ရန်',
      error: 'ဝင်ရောက်မှု မအောင်မြင်ပါ၊ ကုဒ် သို့မဟုတ် စကားဝှက်ကို စစ်ဆေးပါ',
      network: 'ဒေတာဘေ့စ်သို့ ချိတ်ဆက်မရပါ။ ပြန်လည်စမ်းကြည့်ပါ။',
      storePlaceholder: 'ဆိုင်ကုဒ် ရိုက်ထည့်ပါ',
      passPlaceholder: 'စကားဝှက် ရိုက်ထည့်ပါ',
      forgot: 'စကားဝှက် မေ့နေပါသလား?',
      recoverHint: 'ဆိုင်ကုဒ်ကို ဖြည့်ပါ။ ဤစာမျက်နှာသည် အကောင့်ရှိမရှိသာ စစ်သည်။ စကားဝှက်အသစ် မပို့ပါ၊ မပြပါ။',
      recoverSubmit: 'ပြန်လည်သတ်မှတ်နည်း စစ်ရန်',
      backToLogin: 'အကောင့်ဝင်ရန် ပြန်သွားမည်',
      missingCode: 'ဆိုင်ကုဒ် ရိုက်ထည့်ပါ',
      notFound: 'ဤဆိုင်ကုဒ်ကို မတွေ့ပါ။ ပြန်စစ်ပြီး ထပ်ကြိုးစားပါ။',
      transit: 'ဤအကောင့်သည် နယ်စပ်ကူးသန်းပို့ဆောင်ရေး ကြားခံစခန်းအကောင့်ဖြစ်ပြီး ကုန်သည်စာမျက်နှာတွင် စကားဝှက် ပြန်မသတ်မှတ်နိုင်ပါ။ ပလက်ဖောင်း အက်ဒမင်ကို ဆက်သွယ်ပါ။',
      inactive: 'အကောင့်ကို လက်ရှိ အသုံးမပြုနိုင်ပါ။ ဤနေရာတွင် ပြန်မသတ်မှတ်နိုင်ပါ။ ပလက်ဖောင်း အက်ဒမင်ကို ဆက်သွယ်ပါ။',
      contactPhone: 'ဤဆိုင်တွင် ဖုန်းနံပါတ် မှတ်ထားပြီးဖြစ်သည်။ လက်ရှိ SMS ဖြင့် ကိုယ်တိုင် ပြန်မသတ်မှတ်နိုင်ပါ။ မှတ်ထားသောဖုန်းကို အတည်ပြုပြီး စကားဝှက်ပြင်ရန် ပလက်ဖောင်း အက်ဒမင်ကို ဆက်သွယ်ပါ။',
      contactEmail: 'ဤဆိုင်တွင် ဖုန်းမမှတ်ထားပါ။ အီးမေးလ် မှတ်ထားသည်။ လက်ရှိ အီးမေးလ်ဖြင့် ကိုယ်တိုင် ပြန်မသတ်မှတ်နိုင်ပါ။ မှတ်ထားသောအီးမေးလ်ကို အတည်ပြုပြီး စကားဝှက်ပြင်ရန် အက်ဒမင်ကို ဆက်သွယ်ပါ။',
      contactNone: 'ဤဆိုင်တွင် ဖုန်း သို့မဟုတ် အီးမေးလ် မမှတ်ထားပါ။ ဆိုင်ကုဒ်ကို ပြောပြီး ပလက်ဖောင်း အက်ဒမင်ကို ဆက်သွယ်ပါ။',
      unavailable: 'ဆိုင်ကို ယာယီ စစ်ဆေးမရပါ။ နောက်မှ ထပ်ကြိုးစားပါ၊ သို့မဟုတ် အက်ဒမင်ကို တိုက်ရိုက် ဆက်သွယ်ပါ။',
      phoneLabel: 'ဝန်ဆောင်မှုဖုန်း'
    }
  };

  const currentT = (t as any)[language] || t.zh;
  const loginLang: MerchantLoginLang =
    language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/merchant-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          storeCode: storeCode.trim().toUpperCase(),
          password,
        }),
      });
      const result = await response.json().catch(() => null);
      const store = result && result.store ? result.store : null;
      if (!response.ok || !result || !result.success || !store || !store.id) {
        const message = String((result && result.error) || '');
        if (/中转站|Inventory App/.test(message)) {
          throw new Error(
            getMerchantLoginBlockReason({ store_type: 'transit_station' }, loginLang) || message,
          );
        }
        if (/状态异常/.test(message)) throw new Error(message);
        throw new Error(currentT.error);
      }

      const merchantsUser = {
        id: store.id,
        name: store.store_name,
        user_type: 'merchant',
        store_code: store.store_code,
        store_id: store.id,
      };

      localStorage.setItem('ml-express-customer', JSON.stringify(merchantsUser));
      localStorage.setItem('userType', 'merchant');
      
      onLogin(merchantsUser);
      navigate('/');
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      if (/failed to fetch|networkerror|load failed|err_connection|timeout/i.test(raw)) {
        setError(currentT.network);
      } else {
        setError(raw || currentT.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const openRecover = () => {
    setMode('recover');
    setError('');
    setHelp(null);
    setLoading(false);
  };

  const backToLogin = () => {
    setMode('login');
    setError('');
    setHelp(null);
    setLoading(false);
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setHelp(null);
    setError('');

    const code = storeCode.trim();
    if (!code) {
      setError(currentT.missingCode);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/merchant-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          action: 'requestPasswordHelp',
          storeCode: code,
        }),
      });
      const result = await response.json().catch(() => null);
      const codeName = String(result && result.code ? result.code : '');
      if (RECOVER_CODES.indexOf(codeName as RecoverCode) !== -1) {
        setHelp({
          code: codeName as RecoverCode,
          hasPhone: Boolean(result && result.hasPhone),
          hasEmail: Boolean(result && result.hasEmail),
        });
        return;
      }
      setHelp({ code: 'unavailable' });
    } catch {
      setHelp({ code: 'unavailable' });
    } finally {
      setLoading(false);
    }
  };

  const recoverText = () => {
    if (!help) return '';
    if (help.code === 'not_found') return currentT.notFound;
    if (help.code === 'transit_station') return currentT.transit;
    if (help.code === 'inactive') return currentT.inactive;
    if (help.code === 'missing_code') return currentT.missingCode;
    if (help.code === 'unavailable') return currentT.unavailable;
    if (help.hasPhone) return currentT.contactPhone;
    if (help.hasEmail) return currentT.contactEmail;
    return currentT.contactNone;
  };

  const helpIsError = Boolean(
    help && (help.code === 'not_found' || help.code === 'missing_code'),
  );

  return (
    <div className="login-page">
      {/* 🚀 背景装饰 */}
      <div className="bg-decoration-1"></div>
      <div className="bg-decoration-2"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <Logo size="medium" />
          </div>
          <div className="badge">MERCHANTS</div>
          <h1>{currentT.title}</h1>
          <p>{currentT.subtitle}</p>
        </div>

        {mode === 'login' ? (
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>{currentT.storeCode}</label>
            <div className="input-wrapper">
              <span className="input-icon">🏪</span>
              <input 
                type="text" 
                value={storeCode} 
                onChange={(e) => setStoreCode(e.target.value)} 
                placeholder={currentT.storePlaceholder}
                required 
              />
            </div>
          </div>
          <div className="form-group">
            <label>{currentT.password}</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={currentT.passPlaceholder}
                required 
              />
            </div>
            <div className="login-forgot-row">
              <button type="button" className="login-forgot" onClick={openRecover}>
                {currentT.forgot}
              </button>
            </div>
          </div>
          
          {error && <div className="error-message">⚠️ {error}</div>}
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <div className="spinner-small"></div>
            ) : (
              currentT.login
            )}
          </button>
        </form>
        ) : (
        <form onSubmit={handleRecover}>
          <p className="login-recover-hint">{currentT.recoverHint}</p>
          <div className="form-group">
            <label>{currentT.storeCode}</label>
            <div className="input-wrapper">
              <span className="input-icon">🏪</span>
              <input
                type="text"
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value)}
                placeholder={currentT.storePlaceholder}
                autoComplete="username"
              />
            </div>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}
          {help && (
            <div className={helpIsError ? 'error-message' : 'login-help-message'} role="status">
              <p>{helpIsError ? `⚠️ ${recoverText()}` : recoverText()}</p>
              <p className="login-help-phone-line">
                {currentT.phoneLabel}{' '}
                <a href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`}>{supportPhone}</a>
              </p>
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <div className="spinner-small"></div> : currentT.recoverSubmit}
          </button>
          <div className="login-back-row">
            <button type="button" className="login-back" onClick={backToLogin}>
              {currentT.backToLogin}
            </button>
          </div>
        </form>
        )}

        {/* 🚀 语言选择 */}
        <div className="language-selector-login">
          {[
            { id: 'zh', label: '中文' },
            { id: 'en', label: 'English' },
            { id: 'my', label: 'မြန်မာ' }
          ].map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => setLanguage(lang.id)}
              className={language === lang.id ? 'active' : ''}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="login-footer">
        © 2026 MARKET LINK EXPRESS. All Rights Reserved.
      </div>
    </div>
  );
};

export default LoginPage;

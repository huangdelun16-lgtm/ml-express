import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getMerchantLoginBlockReason,
  type MerchantLoginLang,
} from '../services/_shared/merchantLoginGuard';
import Logo from '../components/Logo';
import './LoginPage.css';

const LoginPage: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [storeCode, setStoreCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      passPlaceholder: '请输入您的登录密码'
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
      passPlaceholder: 'Enter your password'
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
      passPlaceholder: 'စကားဝှက် ရိုက်ထည့်ပါ'
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
      const { data: store, error: storeError } = await supabase
        .from('delivery_stores')
        .select('*')
        .eq('store_code', storeCode.trim().toUpperCase())
        .maybeSingle();

      if (storeError) {
        const detail = String(storeError.message || '');
        if (/failed to fetch|networkerror|load failed|err_connection|timeout/i.test(detail)) {
          throw new Error(currentT.network);
        }
        throw new Error(currentT.error);
      }
      if (!store) {
        throw new Error(currentT.error);
      }

      const blockReason = getMerchantLoginBlockReason(store, loginLang);
      if (blockReason) {
        throw new Error(blockReason);
      }

      if (store.status && store.status !== 'active') {
        throw new Error(
          loginLang === 'en'
            ? `Account status issue (${store.status}). Please contact admin.`
            : loginLang === 'my'
              ? `အကောင့်အခြေအနေ (${store.status})။ Admin ကို ဆက်သွယ်ပါ။`
              : `账号状态异常（${store.status}），请联系管理员。`,
        );
      }

      // 🚀 支持明文和哈希对比 (后续可完善)
      if (store.password !== password) {
        throw new Error('Invalid password');
      }

      const merchantsUser = {
        id: store.id,
        name: store.store_name,
        user_type: 'merchant',
        store_code: store.store_code,
        store_id: store.id
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

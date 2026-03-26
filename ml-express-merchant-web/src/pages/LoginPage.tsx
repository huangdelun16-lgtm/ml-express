import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [storeCode, setStoreCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = {
    zh: {
      title: '商户管理后台',
      subtitle: '登录以管理您的店铺',
      storeCode: '店铺代码',
      password: '密码',
      login: '登录',
      error: '登录失败，请检查您的凭据',
    },
    en: {
      title: 'Merchant Backoffice',
      subtitle: 'Login to manage your store',
      storeCode: 'Store Code',
      password: 'Password',
      login: 'Login',
      error: 'Login failed, please check your credentials',
    },
    my: {
      title: 'ကုန်သည် စီမံခန့်ခွဲမှု',
      subtitle: 'သင့်ဆိုင်ကို စီမံခန့်ခွဲရန် ဝင်ရောက်ပါ',
      storeCode: 'ဆိုင်ကုဒ်',
      password: 'စကားဝှက်',
      login: 'ဝင်ရောက်ရန်',
      error: 'ဝင်ရောက်မှု မအောင်မြင်ပါ',
    }
  };

  const currentT = (t as any)[language] || t.zh;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: store, error: storeError } = await supabase
        .from('delivery_stores')
        .select('*')
        .eq('store_code', storeCode.trim())
        .maybeSingle();

      if (storeError || !store) {
        throw new Error('Store not found');
      }

      if (store.password !== password) {
        throw new Error('Invalid password');
      }

      const merchantsUser = {
        id: store.id,
        name: store.store_name,
        user_type: 'merchant',
        store_code: store.store_code,
      };

      localStorage.setItem('currentUser', JSON.stringify(merchantsUser));
      localStorage.setItem('userType', 'merchant');
      
      navigate('/');
    } catch (err) {
      setError(currentT.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>{currentT.title}</h1>
          <p>{currentT.subtitle}</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>{currentT.storeCode}</label>
            <input 
              type="text" 
              value={storeCode} 
              onChange={(e) => setStoreCode(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>{currentT.password}</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '...' : currentT.login}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

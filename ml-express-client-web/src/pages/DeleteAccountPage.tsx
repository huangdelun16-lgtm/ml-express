import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';

const DeleteAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 从本地存储加载用户信息
  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    }
  }, []);

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    setCurrentUser(null);
    window.location.reload();
  };
  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
    setShowLanguageDropdown(false);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showLanguageDropdown && !target.closest('[data-language-dropdown]')) {
        setShowLanguageDropdown(false);
      }
    };

    if (showLanguageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageDropdown]);

  const translations = {
    zh: {
      nav: {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: window.innerWidth < 768 ? '12px' : '20px',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out'
    }}>
      {/* 导航栏 */}
      <NavigationBar
        language={language}
        onLanguageChange={handleLanguageChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }}
        
      />

      {/* 主要内容 */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
      }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#2E86AB',
            marginBottom: '10px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.title}
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#666',
            marginBottom: '10px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.subtitle}
          </p>
          <p style={{
            fontSize: '14px',
            color: '#999',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.lastUpdated}
          </p>
        </div>

        {/* 引言 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.introduction.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.introduction.content}
          </p>
        </section>

        {/* 删除步骤 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.steps.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.steps.subtitle}
          </p>
          <ol style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.steps.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ol>
        </section>

        {/* 删除的数据类型 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.dataTypes.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.dataTypes.subtitle}
          </p>
          <ul style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.dataTypes.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 保留的数据 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.retainedData.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.retainedData.subtitle}
          </p>
          <ul style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            color: '#333',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.retainedData.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ul>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.8',
            color: '#666',
            fontStyle: 'italic',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.retainedData.note}
          </p>
        </section>

        {/* 处理时间 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.processingTime.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.processingTime.content}
          </p>
        </section>

        {/* 删除后果 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#2E86AB',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.consequences.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.consequences.subtitle}
          </p>
          <ul style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.consequences.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 联系方式 */}
        <section style={{
          marginBottom: '40px',
          padding: '30px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '15px',
          color: 'white'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.contact.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            marginBottom: '20px',
            opacity: 0.95,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.contact.subtitle}
          </p>
          <ul style={{
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '2',
            opacity: 0.95,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.contact.items.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                {item}
              </li>
            ))}
          </ul>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.8',
            marginTop: '20px',
            opacity: 0.9,
            fontStyle: 'italic',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {t.contact.note}
          </p>
        </section>

        {/* 返回首页按钮 */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            {t.backToHome}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountPage;


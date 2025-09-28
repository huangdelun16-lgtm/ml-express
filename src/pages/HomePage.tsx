import React, { useState, useEffect } from 'react';
import { packageService, testConnection } from '../services/supabase';

const HomePage: React.FC = () => {
  const [language, setLanguage] = useState('zh');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  // const [orderData, setOrderData] = useState<any>(null);

  // 测试数据库连接
  useEffect(() => {
    testConnection();
  }, []);

  const translations = {
    zh: {
      nav: {
        home: '首页',
        services: '服务',
        tracking: '包裹跟踪',
        contact: '联系我们',
        admin: '管理后台'
      },
      hero: {
        title: '曼德勒同城快递',
        subtitle: '快速、安全、可靠的同城快递服务',
        cta: '立即下单'
      },
      features: {
        title: '服务特色',
        fast: '快速配送',
        safe: '安全可靠',
        convenient: '便捷服务',
        affordable: '价格实惠'
      },
      process: {
        title: '使用流程',
        step1: '在线下单',
        step2: '上门取件',
        step3: '快速配送',
        step4: '签收确认'
      },
      tracking: {
        title: '包裹跟踪',
        placeholder: '请输入包裹单号',
        track: '查询',
        notFound: '未找到包裹信息'
      },
      order: {
        title: '创建订单',
        sender: '寄件人信息',
        receiver: '收件人信息',
        package: '包裹信息',
        submit: '提交订单',
        cancel: '取消'
      },
      footer: {
        company: 'MARKET LINK EXPRESS',
        address: '缅甸曼德勒',
        phone: '+95 9 123 456 789',
        email: 'info@marketlinkexpress.com'
      }
    },
    en: {
      nav: {
        home: 'Home',
        services: 'Services',
        tracking: 'Tracking',
        contact: 'Contact',
        admin: 'Admin'
      },
      hero: {
        title: 'Mandalay Same-Day Delivery',
        subtitle: 'Fast, Safe, and Reliable Same-Day Delivery Service',
        cta: 'Order Now'
      },
      features: {
        title: 'Service Features',
        fast: 'Fast Delivery',
        safe: 'Safe & Secure',
        convenient: 'Convenient',
        affordable: 'Affordable'
      },
      process: {
        title: 'How It Works',
        step1: 'Place Order',
        step2: 'Pickup',
        step3: 'Fast Delivery',
        step4: 'Confirmation'
      },
      tracking: {
        title: 'Package Tracking',
        placeholder: 'Enter tracking number',
        track: 'Track',
        notFound: 'Package not found'
      },
      order: {
        title: 'Create Order',
        sender: 'Sender Information',
        receiver: 'Receiver Information',
        package: 'Package Information',
        submit: 'Submit Order',
        cancel: 'Cancel'
      },
      footer: {
        company: 'MARKET LINK EXPRESS',
        address: 'Mandalay, Myanmar',
        phone: '+95 9 123 456 789',
        email: 'info@marketlinkexpress.com'
      }
    },
    my: {
      nav: {
        home: 'ပင်မ',
        services: 'ဝန်ဆောင်မှု',
        tracking: 'ထုပ်ပိုးခြင်း',
        contact: 'ဆက်သွယ်ရန်',
        admin: 'စီမံခန့်ခွဲမှု'
      },
      hero: {
        title: 'မန္တလေးမြို့တွင်းပို့ဆောင်ရေး',
        subtitle: 'မြန်ဆန်၊ လုံခြုံ၊ ယုံကြည်စိတ်ချရသော မြို့တွင်းပို့ဆောင်ရေး',
        cta: 'အခုပဲအမှာတင်ပါ'
      },
      features: {
        title: 'ဝန်ဆောင်မှုအထူးခြားမှု',
        fast: 'မြန်ဆန်သောပို့ဆောင်မှု',
        safe: 'လုံခြုံသော',
        convenient: 'အဆင်ပြေသော',
        affordable: 'စျေးနှုန်းသင့်တင့်သော'
      },
      process: {
        title: 'အသုံးပြုပုံ',
        step1: 'အွန်လိုင်းအမှာတင်ခြင်း',
        step2: 'အိမ်တွင်းလာယူခြင်း',
        step3: 'မြန်ဆန်သောပို့ဆောင်မှု',
        step4: 'လက်ခံအတည်ပြုခြင်း'
      },
      tracking: {
        title: 'ထုပ်ပိုးခြင်းစောင့်ကြည့်ခြင်း',
        placeholder: 'ထုပ်ပိုးနံပါတ်ထည့်ပါ',
        track: 'ရှာဖွေပါ',
        notFound: 'ထုပ်ပိုးအချက်အလက်မတွေ့ပါ'
      },
      order: {
        title: 'အမှာတင်ခြင်း',
        sender: 'ပို့သူအချက်အလက်',
        receiver: 'လက်ခံသူအချက်အလက်',
        package: 'ထုပ်ပိုးအချက်အလက်',
        submit: 'အမှာတင်ပါ',
        cancel: 'ပယ်ဖျက်ပါ'
      },
      footer: {
        company: 'MARKET LINK EXPRESS',
        address: 'မန္တလေး၊ မြန်မာ',
        phone: '+95 9 123 456 789',
        email: 'info@marketlinkexpress.com'
      }
    }
  };

  const t = translations[language as keyof typeof translations];

  const handleTracking = () => {
    if (trackingNumber) {
      // 模拟跟踪结果
      setTrackingResult({
        number: trackingNumber,
        status: 'In Transit',
        location: 'Mandalay Distribution Center',
        estimatedDelivery: 'Today 3:00 PM'
      });
    }
  };

  // 生成缅甸时间格式的包裹ID
  const generateMyanmarPackageId = () => {
    const now = new Date();
    // 缅甸时间 (UTC+6:30)
    const myanmarTime = new Date(now.getTime() + (6.5 * 60 * 60 * 1000));
    
    const year = myanmarTime.getFullYear();
    const month = String(myanmarTime.getMonth() + 1).padStart(2, '0');
    const day = String(myanmarTime.getDate()).padStart(2, '0');
    const hour = String(myanmarTime.getHours()).padStart(2, '0');
    const minute = String(myanmarTime.getMinutes()).padStart(2, '0');
    const random1 = Math.floor(Math.random() * 10);
    const random2 = Math.floor(Math.random() * 10);
    
    return `MDY${year}${month}${day}${hour}${minute}${random1}${random2}`;
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const orderInfo = {
      senderName: formData.get('senderName') as string,
      senderPhone: formData.get('senderPhone') as string,
      senderAddress: formData.get('senderAddress') as string,
      receiverName: formData.get('receiverName') as string,
      receiverPhone: formData.get('receiverPhone') as string,
      receiverAddress: formData.get('receiverAddress') as string,
      packageType: formData.get('packageType') as string,
      weight: formData.get('weight') as string,
      description: formData.get('description') as string
    };
    
    // 存储订单信息到localStorage，支付完成后使用
    localStorage.setItem('pendingOrder', JSON.stringify(orderInfo));
    setShowOrderForm(false);
    setShowPaymentModal(true);
  };

  // LOGO组件
  const Logo = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
    const logoSize = size === 'small' ? '40px' : size === 'large' ? '80px' : '60px';
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* LOGO图标 */}
        <div style={{
          width: logoSize,
          height: logoSize,
          background: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 50%, #A8A8A8 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {/* ML字母 */}
          <div style={{
            color: '#2C3E50',
            fontWeight: 'bold',
            fontSize: size === 'small' ? '16px' : size === 'large' ? '28px' : '20px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            letterSpacing: '-1px'
          }}>
            ML
          </div>
          {/* 卡车图标 */}
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: size === 'small' ? '8px' : size === 'large' ? '16px' : '12px',
            height: size === 'small' ? '6px' : size === 'large' ? '12px' : '8px',
            background: '#2C3E50',
            borderRadius: '1px',
            opacity: 0.8
          }}></div>
        </div>
        
        {/* 公司名称 - 放大字体 */}
        <div style={{
          color: 'white',
          fontSize: size === 'small' ? '1.2rem' : size === 'large' ? '2rem' : '1.5rem',
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          MARKET LINK EXPRESS
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      {/* 顶部导航栏 */}
      <nav style={{
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        flexWrap: 'wrap'
      }}>
        <Logo size="small" />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: window.innerWidth < 768 ? '1rem' : '2rem',
          flexWrap: 'wrap'
        }}>
          <a href="#home" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.home}</a>
          <a href="#services" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.services}</a>
          <a href="#tracking" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.tracking}</a>
          <a href="#contact" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.contact}</a>
          <a href="/admin/login" style={{ 
          color: 'white',
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem',
            transition: 'color 0.3s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#C0C0C0'}
          onMouseOut={(e) => e.currentTarget.style.color = 'white'}
          >{t.nav.admin}</a>
          
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.5rem',
              borderRadius: '5px',
              fontWeight: 'bold',
              fontSize: window.innerWidth < 768 ? '0.8rem' : '1rem',
              backdropFilter: 'blur(10px)'
            }}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="my">မြန်မာ</option>
          </select>
        </div>
      </nav>

      {/* 英雄区域 */}
      <section id="home" style={{
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
                color: 'white',
        padding: window.innerWidth < 768 ? '2rem 1rem' : '4rem 2rem',
        textAlign: 'center',
        minHeight: window.innerWidth < 768 ? '60vh' : '70vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '200px',
          height: '200px',
          background: 'rgba(192, 192, 192, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: '10%',
          width: '150px',
          height: '150px',
          background: 'rgba(192, 192, 192, 0.1)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Logo size="large" />
          <h1 style={{ 
            fontSize: window.innerWidth < 768 ? '2rem' : '3rem', 
            marginBottom: '1rem', 
            fontWeight: 'bold',
            lineHeight: '1.2',
            marginTop: '1rem'
          }}>
            {t.hero.title}
          </h1>
          <p style={{ 
            fontSize: window.innerWidth < 768 ? '1.1rem' : '1.5rem', 
            marginBottom: '2rem', 
            opacity: 0.9,
            maxWidth: '600px',
            lineHeight: '1.4'
          }}>
            {t.hero.subtitle}
          </p>
          <button
            onClick={() => setShowOrderForm(true)}
            style={{
              background: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%)',
              color: '#2C3E50',
              border: 'none',
              padding: window.innerWidth < 768 ? '0.8rem 1.5rem' : '1rem 2rem',
              fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem',
              fontWeight: 'bold',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(192, 192, 192, 0.4)',
              transition: 'all 0.3s ease',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(192, 192, 192, 0.6)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(192, 192, 192, 0.4)';
            }}
          >
            {t.hero.cta}
          </button>
        </div>
      </section>

      {/* 服务特色 */}
      <section id="services" style={{ 
        padding: window.innerWidth < 768 ? '2rem 1rem' : '4rem 2rem', 
        background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: window.innerWidth < 768 ? '2rem' : '2.5rem', 
          marginBottom: '3rem', 
          color: '#2c5282' 
        }}>
          {t.features.title}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {[
            { icon: '🚀', title: t.features.fast, desc: '30分钟内上门取件' },
            { icon: '🛡️', title: t.features.safe, desc: '全程保险保障' },
            { icon: '📱', title: t.features.convenient, desc: '在线下单，实时跟踪' },
            { icon: '💰', title: t.features.affordable, desc: '价格透明，无隐藏费用' }
          ].map((feature, index) => (
            <div key={index} style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '15px',
                  textAlign: 'center',
              boxShadow: '0 8px 25px rgba(44, 82, 130, 0.1)',
                  transition: 'all 0.3s ease',
              border: '1px solid rgba(192, 192, 192, 0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(44, 82, 130, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(44, 82, 130, 0.1)';
            }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
              <h3 style={{ color: '#2c5282', marginBottom: '1rem' }}>{feature.title}</h3>
              <p style={{ color: '#666' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 使用流程 */}
      <section style={{ 
        padding: window.innerWidth < 768 ? '2rem 1rem' : '4rem 2rem', 
        background: 'white' 
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: window.innerWidth < 768 ? '2rem' : '2.5rem', 
          marginBottom: '3rem', 
          color: '#2c5282' 
        }}>
          {t.process.title}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {[
            { step: '1', title: t.process.step1, desc: '填写寄件信息' },
            { step: '2', title: t.process.step2, desc: '快递员上门取件' },
            { step: '3', title: t.process.step3, desc: '快速安全配送' },
            { step: '4', title: t.process.step4, desc: '收件人签收确认' }
          ].map((process, index) => (
            <div key={index} style={{
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                margin: '0 auto 1rem',
                boxShadow: '0 4px 15px rgba(44, 82, 130, 0.3)'
              }}>
                {process.step}
              </div>
              <h3 style={{ color: '#2c5282', marginBottom: '0.5rem' }}>{process.title}</h3>
              <p style={{ color: '#666' }}>{process.desc}</p>
              {index < 3 && (
                <div style={{
                  position: 'absolute',
                  top: '30px',
                  right: '-50%',
                  width: '100%',
                  height: '2px',
                  background: 'linear-gradient(90deg, #2c5282 0%, #3182ce 100%)',
                  zIndex: -1
                }}></div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 包裹跟踪 */}
      <section id="tracking" style={{ 
        padding: window.innerWidth < 768 ? '2rem 1rem' : '4rem 2rem', 
        background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: window.innerWidth < 768 ? '2rem' : '2.5rem', 
          marginBottom: '3rem', 
          color: '#2c5282' 
        }}>
          {t.tracking.title}
        </h2>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: 'white',
          padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
          borderRadius: '15px',
          boxShadow: '0 8px 25px rgba(44, 82, 130, 0.1)',
          border: '1px solid rgba(192, 192, 192, 0.2)'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '2rem',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row'
          }}>
            <input
              type="text"
              placeholder={t.tracking.placeholder}
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              style={{
                flex: 1,
                padding: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '1rem',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={handleTracking}
              style={{
                background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                minWidth: window.innerWidth < 768 ? '100%' : 'auto',
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
              {t.tracking.track}
            </button>
          </div>
          
          {trackingResult && (
            <div style={{
              background: 'linear-gradient(135deg, #e6f3ff 0%, #f0f8ff 100%)',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid #2c5282'
            }}>
              <h3 style={{ color: '#2c5282', marginBottom: '1rem' }}>包裹信息</h3>
              <p><strong>单号：</strong>{trackingResult.number}</p>
              <p><strong>状态：</strong>{trackingResult.status}</p>
              <p><strong>当前位置：</strong>{trackingResult.location}</p>
              <p><strong>预计送达：</strong>{trackingResult.estimatedDelivery}</p>
            </div>
          )}
        </div>
      </section>

      {/* 页脚 */}
      <footer id="contact" style={{
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
                    color: 'white',
        padding: window.innerWidth < 768 ? '2rem 1rem' : '3rem 2rem',
        textAlign: 'center'
      }}>
        <Logo size="medium" />
        <p style={{ fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem', marginTop: '1rem' }}>{t.footer.address}</p>
        <p style={{ fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem' }}>电话：{t.footer.phone}</p>
        <p style={{ fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem' }}>邮箱：{t.footer.email}</p>
        <p style={{ 
          marginTop: '2rem', 
          opacity: 0.8,
          fontSize: window.innerWidth < 768 ? '0.8rem' : '1rem'
        }}>
          © 2024 MARKET LINK EXPRESS. All rights reserved.
        </p>
      </footer>

      {/* 订单表单模态窗口 */}
      {showOrderForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(26, 54, 93, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'white',
            padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
            borderRadius: '15px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(26, 54, 93, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Logo size="medium" />
            </div>
            <h2 style={{ color: '#2c5282', marginBottom: '2rem', textAlign: 'center' }}>
              {t.order.title}
            </h2>
            
            <form onSubmit={handleOrderSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#2c5282', marginBottom: '1rem' }}>{t.order.sender}</h3>
                <input
                  type="text"
                  name="senderName"
                  placeholder="寄件人姓名"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <input
                  type="tel"
                  name="senderPhone"
                  placeholder="联系电话"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <textarea
                  name="senderAddress"
                  placeholder="寄件地址"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    height: '80px',
                    resize: 'vertical',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#2c5282', marginBottom: '1rem' }}>{t.order.receiver}</h3>
                <input
                  type="text"
                  name="receiverName"
                  placeholder="收件人姓名"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <input
                  type="tel"
                  name="receiverPhone"
                  placeholder="联系电话"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <textarea
                  name="receiverAddress"
                  placeholder="收件地址"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    height: '80px',
                    resize: 'vertical',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#2c5282', marginBottom: '1rem' }}>{t.order.package}</h3>
                <select
                  name="packageType"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease',
                    background: 'white'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <option value="文件">文件</option>
                  <option value="衣服">衣服</option>
                  <option value="易碎品">易碎品</option>
                  <option value="食品">食品</option>
                </select>
                <input
                  type="text"
                  name="description"
                  placeholder="包裹描述"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <input
                  type="text"
                  name="weight"
                  placeholder="重量（kg）"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
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
                  {t.order.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 支付二维码模态窗口 */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(26, 54, 93, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'white',
            padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
            borderRadius: '15px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(26, 54, 93, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Logo size="medium" />
            </div>
            <h2 style={{ color: '#2c5282', marginBottom: '1rem' }}>
              预付取货费
            </h2>
            <p style={{ color: '#4a5568', marginBottom: '2rem', fontSize: '1.1rem' }}>
              请扫描二维码支付 <strong>2000 MMK</strong> 取货费
            </p>
            
            {/* 二维码占位符 */}
            <div style={{
              width: '200px',
              height: '200px',
              background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              margin: '0 auto 2rem',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              color: '#666'
            }}>
              支付二维码
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center',
              flexDirection: window.innerWidth < 768 ? 'column' : 'row'
            }}>
              <button
                onClick={async () => {
                  setShowPaymentModal(false);
                  
                  // 获取存储的订单信息
                  const pendingOrder = localStorage.getItem('pendingOrder');
                  if (!pendingOrder) {
                    alert('订单信息丢失，请重新下单');
                    return;
                  }
                  
                  const orderInfo = JSON.parse(pendingOrder);
                  const packageId = generateMyanmarPackageId();
                  
                  // 创建包裹数据 - 使用数据库字段名
                  const packageData = {
                    id: packageId,
                    sender_name: orderInfo.senderName,
                    sender_phone: orderInfo.senderPhone,
                    sender_address: orderInfo.senderAddress,
                    receiver_name: orderInfo.receiverName,
                    receiver_phone: orderInfo.receiverPhone,
                    receiver_address: orderInfo.receiverAddress,
                    package_type: orderInfo.packageType,
                    weight: orderInfo.weight,
                    description: orderInfo.description,
                    status: '待取件',
                    create_time: new Date().toLocaleString('zh-CN'),
                    pickup_time: '',
                    delivery_time: '',
                    courier: '待分配',
                    price: '5000 MMK'
                  };
                  
                  // 保存到数据库
                  console.log('准备保存包裹数据:', packageData);
                  const result = await packageService.createPackage(packageData);
                  
                  if (result) {
                    // 清除临时订单信息
                    localStorage.removeItem('pendingOrder');
                    alert(`支付成功！包裹ID: ${packageId}\n我们会在1小时内联系您取件。`);
                  } else {
                    console.error('包裹创建失败，检查控制台获取详细错误信息');
                    alert('包裹创建失败，请检查网络连接或联系客服。\n错误信息已记录在控制台。');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                    color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  width: window.innerWidth < 768 ? '100%' : 'auto',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                }}
              >
                支付完成
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
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
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

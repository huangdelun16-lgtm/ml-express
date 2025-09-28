import React, { useState } from 'react';

const HomePage: React.FC = () => {
  const [language, setLanguage] = useState('zh');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);

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

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('订单提交成功！我们会尽快联系您。');
    setShowOrderForm(false);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      {/* 顶部导航栏 */}
      <nav style={{
        background: '#2E86AB',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: window.innerWidth < 768 ? '1.2rem' : '1.5rem', 
            fontWeight: 'bold' 
          }}>
            MARKET LINK EXPRESS
          </h1>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: window.innerWidth < 768 ? '1rem' : '2rem',
          flexWrap: 'wrap'
        }}>
          <a href="#home" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem'
          }}>{t.nav.home}</a>
          <a href="#services" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem'
          }}>{t.nav.services}</a>
          <a href="#tracking" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem'
          }}>{t.nav.tracking}</a>
          <a href="#contact" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem'
          }}>{t.nav.contact}</a>
          <a href="/admin/login" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem'
          }}>{t.nav.admin}</a>
          
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: 'white',
              color: '#2E86AB',
              border: 'none',
              padding: '0.5rem',
              borderRadius: '5px',
              fontWeight: 'bold',
              fontSize: window.innerWidth < 768 ? '0.8rem' : '1rem'
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
        background: 'linear-gradient(135deg, #2E86AB 0%, #A23B72 100%)',
        color: 'white',
        padding: window.innerWidth < 768 ? '2rem 1rem' : '4rem 2rem',
        textAlign: 'center',
        minHeight: window.innerWidth < 768 ? '60vh' : '70vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1 style={{ 
          fontSize: window.innerWidth < 768 ? '2rem' : '3rem', 
          marginBottom: '1rem', 
          fontWeight: 'bold',
          lineHeight: '1.2'
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
            background: '#FF6B35',
            color: 'white',
            border: 'none',
            padding: window.innerWidth < 768 ? '0.8rem 1.5rem' : '1rem 2rem',
            fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem',
            fontWeight: 'bold',
            borderRadius: '50px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
          }}
        >
          {t.hero.cta}
        </button>
      </section>

      {/* 服务特色 */}
      <section id="services" style={{ 
        padding: window.innerWidth < 768 ? '2rem 1rem' : '4rem 2rem', 
        background: '#f8f9fa' 
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: window.innerWidth < 768 ? '2rem' : '2.5rem', 
          marginBottom: '3rem', 
          color: '#2E86AB' 
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
              boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
              <h3 style={{ color: '#2E86AB', marginBottom: '1rem' }}>{feature.title}</h3>
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
          color: '#2E86AB' 
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
                background: '#2E86AB',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                margin: '0 auto 1rem'
              }}>
                {process.step}
              </div>
              <h3 style={{ color: '#2E86AB', marginBottom: '0.5rem' }}>{process.title}</h3>
              <p style={{ color: '#666' }}>{process.desc}</p>
              {index < 3 && (
                <div style={{
                  position: 'absolute',
                  top: '30px',
                  right: '-50%',
                  width: '100%',
                  height: '2px',
                  background: '#2E86AB',
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
        background: '#f8f9fa' 
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: window.innerWidth < 768 ? '2rem' : '2.5rem', 
          marginBottom: '3rem', 
          color: '#2E86AB' 
        }}>
          {t.tracking.title}
        </h2>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: 'white',
          padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
          borderRadius: '15px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
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
                border: '2px solid #ddd',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            />
            <button
              onClick={handleTracking}
              style={{
                background: '#2E86AB',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                minWidth: window.innerWidth < 768 ? '100%' : 'auto'
              }}
            >
              {t.tracking.track}
            </button>
          </div>
          
          {trackingResult && (
            <div style={{
              background: '#e8f4f8',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid #2E86AB'
            }}>
              <h3 style={{ color: '#2E86AB', marginBottom: '1rem' }}>包裹信息</h3>
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
        background: '#2E86AB',
        color: 'white',
        padding: window.innerWidth < 768 ? '2rem 1rem' : '3rem 2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ 
          marginBottom: '1rem',
          fontSize: window.innerWidth < 768 ? '1.2rem' : '1.5rem'
        }}>{t.footer.company}</h3>
        <p style={{ fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem' }}>{t.footer.address}</p>
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
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'white',
            padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
            borderRadius: '15px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ color: '#2E86AB', marginBottom: '2rem', textAlign: 'center' }}>
              {t.order.title}
            </h2>
            
            <form onSubmit={handleOrderSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#2E86AB', marginBottom: '1rem' }}>{t.order.sender}</h3>
                <input
                  type="text"
                  placeholder="寄件人姓名"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '0.5rem'
                  }}
                />
                <input
                  type="tel"
                  placeholder="联系电话"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '0.5rem'
                  }}
                />
                <textarea
                  placeholder="寄件地址"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    height: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#2E86AB', marginBottom: '1rem' }}>{t.order.receiver}</h3>
                <input
                  type="text"
                  placeholder="收件人姓名"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '0.5rem'
                  }}
                />
                <input
                  type="tel"
                  placeholder="联系电话"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '0.5rem'
                  }}
                />
                <textarea
                  placeholder="收件地址"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    height: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#2E86AB', marginBottom: '1rem' }}>{t.order.package}</h3>
                <input
                  type="text"
                  placeholder="包裹描述"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '0.5rem'
                  }}
                />
                <input
                  type="text"
                  placeholder="重量（kg）"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px'
                  }}
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
                    background: '#ccc',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    width: window.innerWidth < 768 ? '100%' : 'auto'
                  }}
                >
                  {t.order.cancel}
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#2E86AB',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    width: window.innerWidth < 768 ? '100%' : 'auto'
                  }}
                >
                  {t.order.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

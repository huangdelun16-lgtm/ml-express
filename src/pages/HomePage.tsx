import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { packageService, testConnection, userService } from '../services/supabase';
import QRCode from 'qrcode';

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Google Maps Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '300px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '10px',
          color: '#4a5568'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>地图加载失败</h3>
          <p style={{ margin: '0', opacity: 0.8, textAlign: 'center' }}>
            Google Maps API 配置问题<br/>
            请检查 API Key 设置
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

const HomePage: React.FC = () => {
  const [language, setLanguage] = useState('zh');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapSelectionType, setMapSelectionType] = useState<'sender' | 'receiver' | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [mapClickPosition, setMapClickPosition] = useState<{lat: number, lng: number} | null>(null);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  // const [orderData, setOrderData] = useState<any>(null);

  // 生成二维码
  const generateQRCode = async (orderId: string) => {
    try {
      const qrCodeUrl = await QRCode.toDataURL(orderId, {
        width: 200,
        margin: 2,
        color: {
          dark: '#2c5282',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrCodeUrl);
    } catch (error) {
      console.error('生成二维码失败:', error);
    }
  };

  // 下载二维码
  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    setDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `订单二维码_${generatedOrderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 模拟发送给客户
      alert('二维码已下载到本地，并已发送给客户！');
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    } finally {
      setDownloading(false);
    }
  };

  // 生成订单ID
  const generateOrderId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const random1 = Math.floor(Math.random() * 10);
    const random2 = Math.floor(Math.random() * 10);
    
    return `MDY${year}${month}${day}${hour}${minute}${random1}${random2}`;
  };

  // 测试数据库连接
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await testConnection();
        if (!isConnected) {
          console.warn('数据库连接失败，应用将在离线模式下运行');
        }
      } catch (error) {
        console.error('连接测试出错:', error);
      }
    };
    
    checkConnection();
  }, []);

  // 自动保存客户信息到用户管理
  const saveCustomerToUsers = async (orderInfo: any) => {
    try {
      console.log('开始保存客户信息:', orderInfo);
      
      // 检查客户是否已存在
      const existingUser = await userService.getUserByPhone(orderInfo.senderPhone);
      
      if (existingUser) {
        console.log('客户已存在，更新统计信息:', existingUser);
        // 更新现有客户的订单统计
        await userService.updateUserStats(existingUser.id, 5000);
      } else {
        console.log('创建新客户:', orderInfo);
        // 创建新客户
        const newCustomer = await userService.createCustomer({
          name: orderInfo.senderName,
          phone: orderInfo.senderPhone,
          address: orderInfo.senderAddress
        });
        
        if (newCustomer) {
          // 更新新客户的订单统计
          await userService.updateUserStats(newCustomer.id, 5000);
        }
      }
    } catch (error) {
      console.error('保存客户信息失败:', error);
    }
  };

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
        cancel: '取消',
        selectOnMap: '在地图中选择',
        senderName: '寄件人姓名',
        senderPhone: '联系电话',
        senderAddress: '寄件地址',
        receiverName: '收件人姓名',
        receiverPhone: '联系电话',
        receiverAddress: '收件地址',
        packageType: '包裹类型',
        packageDescription: '包裹描述',
        packageWeight: '重量',
        mapTitle: '选择地址',
        mapTip: '💡 提示：点击地图标注位置，系统将自动填充地址。您可在此基础上补充门牌号等详细信息。',
        mapPlaceholder: '输入详细地址或在地图上点击选择位置',
        confirmSelection: '确认选择',
        getMyLocation: '获取我的位置'
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
        cancel: 'Cancel',
        selectOnMap: 'Select on Map',
        senderName: 'Sender Name',
        senderPhone: 'Contact Phone',
        senderAddress: 'Sender Address',
        receiverName: 'Receiver Name',
        receiverPhone: 'Contact Phone',
        receiverAddress: 'Receiver Address',
        packageType: 'Package Type',
        packageDescription: 'Package Description',
        packageWeight: 'Weight',
        mapTitle: 'Select Address',
        mapTip: '💡 Tip: Click on the map to mark location, the system will automatically fill in the address. You can add house numbers and other details.',
        mapPlaceholder: 'Enter detailed address or click on the map to select location',
        confirmSelection: 'Confirm Selection',
        getMyLocation: 'Get My Location'
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
        cancel: 'ပယ်ဖျက်ပါ',
        selectOnMap: 'မြေပုံတွင်ရွေးချယ်ပါ',
        senderName: 'ပို့သူအမည်',
        senderPhone: 'ဆက်သွယ်ရေးဖုန်းနံပါတ်',
        senderAddress: 'ပို့သူလိပ်စာ',
        receiverName: 'လက်ခံသူအမည်',
        receiverPhone: 'ဆက်သွယ်ရေးဖုန်းနံပါတ်',
        receiverAddress: 'လက်ခံသူလိပ်စာ',
        packageType: 'ထုပ်ပိုးအမျိုးအစား',
        packageDescription: 'ထုပ်ပိုးဖော်ပြချက်',
        packageWeight: 'အလေးချိန်',
        mapTitle: 'ရွေးချယ်ပါ',
        mapTip: '💡 အကြံပြုချက်: မြေပုံပေါ်တွင် နေရာကို နှိပ်ပြီး လိပ်စာကို အလိုအလျောက် ဖြည့်စွက်ပါ။ သင်သည် အိမ်နံပါတ်နှင့် အသေးစိတ်အချက်အလက်များကို ထပ်မံ ဖြည့်စွက်နိုင်သည်။',
        mapPlaceholder: 'အသေးစိတ်လိပ်စာ ထည့်ပါ သို့မဟုတ် မြေပုံပေါ်တွင် နေရာကို ရွေးချယ်ပါ',
        confirmSelection: 'ရွေးချယ်မှုကို အတည်ပြုပါ',
        getMyLocation: 'ကျွန်ုပ်၏တည်နေရာကို ရယူပါ'
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
    const logoSize = size === 'small' ? '80px' : size === 'large' ? '160px' : '120px';
    
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center',
          gap: '15px',
          cursor: 'pointer',
          transition: 'opacity 0.3s ease'
        }}
        onClick={() => window.location.href = '/'}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
      >
        {/* LOGO药丸标签 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          color: '#2c5282',
          padding: '8px 16px',
          borderRadius: '25px',
          border: '1px solid rgba(44, 82, 130, 0.3)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          fontSize: size === 'small' ? '0.9rem' : size === 'large' ? '1.3rem' : '1.1rem',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          <img 
            src="/logo.png" 
            alt="ML Express Logo"
            style={{
              width: size === 'small' ? '24px' : size === 'large' ? '36px' : '30px',
              height: size === 'small' ? '24px' : size === 'large' ? '36px' : '30px',
              objectFit: 'contain',
              marginRight: '8px'
            }}
          />
          ML
        </div>
        
        {/* 公司名称药丸标签 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
          color: 'white',
          padding: '8px 20px',
          borderRadius: '25px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 2px 8px rgba(44, 82, 130, 0.3)',
          fontSize: size === 'small' ? '1.0rem' : size === 'large' ? '1.4rem' : '1.2rem',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
        }}>
          MARKET LINK EXPRESS
        </div>
      </div>
    );
  };

  return (
    <div className="homepage" style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      {/* 顶部导航栏 */}
      <nav style={{
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
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
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
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
            maxWidth: '800px',
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
          color: '#000000' 
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
            { icon: '⚡', title: t.features.fast, desc: '30分钟内上门取件' },
        { icon: '🔒', title: t.features.safe, desc: '全程保险保障' },
        { icon: '📲', title: t.features.convenient, desc: '在线下单，实时跟踪' },
        { icon: '💎', title: t.features.affordable, desc: '价格透明，无隐藏费用' }
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
          color: '#000000' 
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
          color: '#000000' 
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
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
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
            maxWidth: '500px',
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
                  placeholder={t.order.senderPhone}
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
                <div style={{ position: 'relative' }}>
                  <textarea
                    name="senderAddress"
                    placeholder={t.order.senderAddress}
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      height: '80px',
                      resize: 'vertical',
                      transition: 'border-color 0.3s ease',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(5px)'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMapSelectionType('sender');
                      setShowMapModal(true);
                    }}
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
                  placeholder={t.order.receiverPhone}
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
                <div style={{ position: 'relative' }}>
                  <textarea
                    name="receiverAddress"
                    placeholder={t.order.receiverAddress}
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      height: '80px',
                      resize: 'vertical',
                      transition: 'border-color 0.3s ease',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(5px)'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#2c5282'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMapSelectionType('receiver');
                      setShowMapModal(true);
                    }}
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

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>{t.order.package}</h3>
                <select
                  name="packageType"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    transition: 'all 0.3s ease',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer',
                    appearance: 'none',
                    color: '#2c5282',
                    fontWeight: '500',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232c5282' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.7rem center',
                    backgroundSize: '1em',
                    paddingRight: '2.5rem',
                    boxShadow: '0 4px 15px rgba(44, 82, 130, 0.1)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(44, 82, 130, 0.6)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(44, 82, 130, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(44, 82, 130, 0.1)';
                  }}
                >
                  <option value="文件">文件</option>
                  <option value="标准件（45x60x15cm）以内">标准件（45x60x15cm）以内</option>
                  <option value="超重件（10 KG）以上">超重件（10 KG）以上</option>
                  <option value="超规件（45x60x15cm）以上">超规件（45x60x15cm）以上</option>
                  <option value="易碎品">易碎品</option>
                </select>
                <input
                  type="text"
                  name="description"
                  placeholder={t.order.packageDescription}
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
                  placeholder={t.order.packageWeight}
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
                <div style={{
                  fontSize: '0.8rem',
                  color: '#e74c3c',
                  marginTop: '0.5rem',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  ***如实物和包裹信息内容不一致会导致报价失误***
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
                    // 自动保存客户信息到用户管理
                    await saveCustomerToUsers(orderInfo);
                    
                    // 清除临时订单信息
                    localStorage.removeItem('pendingOrder');
                    
                    // 生成订单ID和二维码
                    const orderId = generateOrderId();
                    setGeneratedOrderId(orderId);
                    await generateQRCode(orderId);
                    
                    // 关闭支付模态框，显示订单成功模态框
                    setShowPaymentModal(false);
                    setShowOrderSuccessModal(true);
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

      {/* 订单成功模态框 */}
      {showOrderSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h2 style={{
                margin: 0,
                color: '#A5C7FF',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                🎉 订单创建成功！
              </h2>
              <button
                onClick={() => setShowOrderSuccessModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 订单信息 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#A5C7FF',
                fontSize: '1.2rem'
              }}>
                订单信息
              </h3>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '1rem'
              }}>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#2c5282',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  订单号: {generatedOrderId}
                </p>
                <p style={{
                  margin: 0,
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  订单已发送给客户，我们会在1小时内联系您取件
                </p>
              </div>
            </div>

            {/* 二维码显示 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#A5C7FF',
                fontSize: '1.2rem'
              }}>
                订单二维码
              </h3>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                display: 'inline-block',
                marginBottom: '1rem'
              }}>
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="订单二维码" 
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(44, 82, 130, 0.3)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '200px',
                    height: '200px',
                    background: '#f8f9fa',
                    border: '2px dashed #2c5282',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    正在生成二维码...
                  </div>
                )}
              </div>
              <p style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                快递员将扫描此二维码进行取件<br/>
                请妥善保管此二维码
              </p>
            </div>

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={downloadQRCode}
                disabled={downloading || !qrCodeDataUrl}
                style={{
                  background: downloading ? '#94a3b8' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (!downloading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!downloading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                  }
                }}
              >
                {downloading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    下载中...
                  </>
                ) : (
                  <>
                    📥 下载二维码
                  </>
                )}
              </button>
              <button
                onClick={() => setShowOrderSuccessModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 地图选择模态窗口 */}
      {showMapModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
            padding: window.innerWidth < 768 ? '1.5rem' : '2rem',
            borderRadius: '15px',
            width: window.innerWidth < 768 ? '95%' : '80%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ color: 'white', marginBottom: '1rem' }}>
                选择{mapSelectionType === 'sender' ? t.order.sender : t.order.receiver}
              </h2>
            </div>
            
            {/* Google Maps 嵌入 */}
            <div style={{
              width: '100%',
              height: '400px',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '2rem',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              position: 'relative'
            }}>
              {/* 交互式地图容器 */}
              <div 
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  cursor: 'crosshair'
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  
                  // 将点击位置转换为大致的经纬度坐标（仰光地区）
                  // 这是一个简化的转换，实际应用中需要更精确的地图API
                  const lat = 16.7758 + (0.5 - y / rect.height) * 0.1; // 仰光纬度范围
                  const lng = 96.1561 + (x / rect.width - 0.5) * 0.1; // 仰光经度范围
                  
                  setMapClickPosition({ lat, lng });
                  
                  // 模拟反向地理编码获取地址
                  const simulateReverseGeocode = async () => {
                    try {
                      // 模拟地址数据
                      const addresses = [
                        '仰光市中心商业区',
                        '仰光大学附近',
                        '茵雅湖畔',
                        '昂山市场周边',
                        '仰光国际机场附近',
                        '皇家湖公园旁',
                        '仰光火车站区域'
                      ];
                      
                      const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
                      const fullAddress = `${randomAddress}, 坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                      
                      // 自动填充到地址输入框
                      const addressInput = document.querySelector('input[placeholder*="输入详细地址"]') as HTMLInputElement;
                      if (addressInput) {
                        addressInput.value = fullAddress;
                        addressInput.style.borderColor = 'rgba(56, 161, 105, 0.6)';
                        addressInput.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
                      }
                      
                      // 更新选中位置
                      setSelectedLocation({ lat, lng, address: fullAddress });
                      
                    } catch (error) {
                      console.error('地址获取失败:', error);
                    }
                  };
                  
                  simulateReverseGeocode();
                }}
              >
                {/* 真正的Google Maps */}
                <ErrorBoundary>
                  <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY"}>
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ lat: 16.8661, lng: 96.1951 }} // 仰光中心
                      zoom={12}
                      onClick={(e) => {
                        if (e.latLng) {
                          const lat = e.latLng.lat();
                          const lng = e.latLng.lng();
                          setMapClickPosition({ lat, lng });
                          
                          // 显示坐标信息
                          const addressInput = document.querySelector('input[placeholder*="输入详细地址"]') as HTMLInputElement;
                          if (addressInput) {
                            addressInput.value = `纬度: ${lat.toFixed(6)}, 经度: ${lng.toFixed(6)}`;
                          }
                        }
                      }}
                    >
                      {mapClickPosition && (
                        <Marker
                          position={{ lat: mapClickPosition.lat, lng: mapClickPosition.lng }}
                          title="选择的位置"
                        />
                      )}
                    </GoogleMap>
                  </LoadScript>
                </ErrorBoundary>
              
              {/* 自动定位按钮 */}
              <button
                onClick={async () => {
                  if (navigator.geolocation) {
                    try {
                      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                          enableHighAccuracy: true,
                          timeout: 10000,
                          maximumAge: 60000
                        });
                      });
                      
                      const { latitude, longitude } = position.coords;
                      
                      // 简单显示坐标，用户可以手动输入地址
                      const addressInput = document.querySelector('input[placeholder*="输入详细地址"]') as HTMLInputElement;
                      if (addressInput) {
                        addressInput.value = `纬度: ${latitude.toFixed(6)}, 经度: ${longitude.toFixed(6)}`;
                      }
                      alert(`已获取您的位置坐标：\n纬度: ${latitude.toFixed(6)}\n经度: ${longitude.toFixed(6)}\n\n请在地址框中输入详细地址`);
                      
                    } catch (error) {
                      alert('无法获取您的位置，请检查浏览器权限设置');
                    }
                  } else {
                    alert('您的浏览器不支持地理定位功能');
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(56, 161, 105, 0.3)',
                  transition: 'all 0.3s ease',
                  zIndex: 10
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(56, 161, 105, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(56, 161, 105, 0.3)';
                }}
                title={t.order.getMyLocation}
              >
                📍
              </button>
            </div>
            </div>

            {/* 地址输入框 */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                {t.order.mapTip}
              </div>
              <input
                type="text"
                placeholder={t.order.mapPlaceholder}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
              />
            </div>

            {/* 按钮组 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => {
                  // 确认选择地址的逻辑
                  const addressInput = document.querySelector('input[placeholder*="输入详细地址"]') as HTMLInputElement;
                  if (addressInput && addressInput.value.trim()) {
                    // 获取完整地址（包含用户补充的详细信息）
                    const completeAddress = addressInput.value.trim();
                    
                    // 将地址填入对应的表单字段
                    const targetField = mapSelectionType === 'sender' ? 
                      document.querySelector('textarea[name="senderAddress"]') as HTMLTextAreaElement :
                      document.querySelector('textarea[name="receiverAddress"]') as HTMLTextAreaElement;
                    
                    if (targetField) {
                      targetField.value = completeAddress;
                      // 添加视觉反馈
                      targetField.style.borderColor = '#38a169';
                      targetField.style.boxShadow = '0 0 10px rgba(56, 161, 105, 0.3)';
                      
                      // 短暂显示成功提示
                      setTimeout(() => {
                        targetField.style.borderColor = '#e2e8f0';
                        targetField.style.boxShadow = 'none';
                      }, 2000);
                    }
                    
                    // 显示成功消息
                    alert(`✅ 地址已成功填入${mapSelectionType === 'sender' ? '寄件' : '收件'}地址字段！\n\n📍 ${completeAddress}`);
                    
                    // 清理状态并关闭模态窗口
                    setMapClickPosition(null);
                    setSelectedLocation(null);
                    setShowMapModal(false);
                    setMapSelectionType(null);
                  } else {
                    alert('⚠️ 请先在地图上点击选择位置，或在地址框中输入地址信息');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {t.order.confirmSelection}
              </button>
              
              <button
                onClick={() => {
                  setShowMapModal(false);
                  setMapSelectionType(null);
                }}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
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

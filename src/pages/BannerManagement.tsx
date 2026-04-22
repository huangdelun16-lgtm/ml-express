import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bannerService, tutorialService, welcomeScreenService, systemSettingsService, Banner, Tutorial, WelcomeScreen } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';

const CLIENT_RECHARGE_QR_SETTING_KEY = 'client.recharge_qr_urls';
const RECHARGE_QR_TIERS = [10000, 50000, 100000, 300000, 500000, 1000000] as const;

const defaultRechargeQrUrlMap = (): Record<number, string> => {
  const base = 'https://market-link-express.com';
  return {
    10000: `${base}/kbz_qr_10000.png`,
    50000: `${base}/kbz_qr_50000.png`,
    100000: `${base}/kbz_qr_100000.png`,
    300000: `${base}/kbz_qr_300000.png`,
    500000: `${base}/kbz_qr_500000.png`,
    1000000: `${base}/kbz_qr_1000000.png`,
  };
};

const BannerManagement: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tutorialFileInputRef = useRef<HTMLInputElement>(null); // 🚀 新增：专门给教学图片用的 Ref
  const [banners, setBanners] = useState<Banner[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [welcomeScreens, setWelcomeScreens] = useState<WelcomeScreen[]>([]);
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showTutorialMainModal, setShowTutorialMainModal] = useState(false); // 🚀 窗口1：使用教学管理
  const [showTutorialEditModal, setShowTutorialEditModal] = useState(false); // 🚀 窗口2：配置教学步骤
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [showWelcomeMainModal, setShowWelcomeMainModal] = useState(false); // 🚀 窗口3：欢迎页面管理
  const [showWelcomeEditModal, setShowWelcomeEditModal] = useState(false); // 🚀 窗口4：编辑欢迎页面
  const [editingWelcomeScreen, setEditingWelcomeScreen] = useState<WelcomeScreen | null>(null);
  const rechargeQrFileInputRef = useRef<HTMLInputElement>(null);
  const rechargeQrPickAmountRef = useRef<number | null>(null);
  const [showRechargeQRModal, setShowRechargeQRModal] = useState(false);
  const [rechargeQrMap, setRechargeQrMap] = useState<Record<number, string>>(() => defaultRechargeQrUrlMap());
  const [rechargeQrSaving, setRechargeQrSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    burmese_title: '',
    image_url: '',
    link_url: '',
    bg_color_start: '#3b82f6',
    bg_color_end: '#60a5fa',
    display_order: 0,
    is_active: true
  });

  const [tutorialFormData, setTutorialFormData] = useState({
    title_zh: '',
    title_en: '',
    title_my: '',
    content_zh: '',
    content_en: '',
    content_my: '',
    image_url: '',
    image_urls: [] as string[], // 🚀 新增：多图数组
    display_order: 0,
    is_active: true
  });

  const [welcomeFormData, setWelcomeFormData] = useState({
    title_zh: '',
    title_en: '',
    title_my: '',
    description_zh: '',
    description_en: '',
    description_my: '',
    button_text_zh: '',
    button_text_en: '',
    button_text_my: '',
    image_url: '',
    bg_color_start: '#b0d3e8',
    bg_color_end: '#7895a3',
    button_color_start: '#ffffff',
    button_color_end: '#f0f9ff',
    countdown: 5,
    is_active: false
  });

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('读取文件失败'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [bannerData, tutorialData, welcomeData] = await Promise.all([
      bannerService.getAllBanners(),
      tutorialService.getAllTutorials(),
      welcomeScreenService.getAllWelcomeScreens()
    ]);
    setBanners(bannerData);
    setTutorials(tutorialData);
    setWelcomeScreens(welcomeData);
    setLoading(false);
  };

  const loadBanners = async () => {
    const data = await bannerService.getAllBanners();
    setBanners(data);
  };

  const loadTutorials = async () => {
    const data = await tutorialService.getAllTutorials();
    setTutorials(data);
  };

  const loadWelcomeScreens = async () => {
    const data = await welcomeScreenService.getAllWelcomeScreens();
    setWelcomeScreens(data);
  };

  const loadRechargeQrSettings = async () => {
    const rows = await systemSettingsService.getSettingsByKeys([CLIENT_RECHARGE_QR_SETTING_KEY]);
    const merged = defaultRechargeQrUrlMap();
    const row = rows[0];
    if (row?.settings_value != null) {
      let raw: unknown = row.settings_value;
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch {
          raw = {};
        }
      }
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          const n = Number(k);
          if (Number.isFinite(n) && typeof v === 'string' && v.trim()) {
            merged[n] = v.trim();
          }
        }
      }
    }
    setRechargeQrMap(merged);
  };

  const saveRechargeQrSettings = async () => {
    setRechargeQrSaving(true);
    const ok = await systemSettingsService.upsertSetting({
      category: 'client',
      settings_key: CLIENT_RECHARGE_QR_SETTING_KEY,
      settings_value: rechargeQrMap,
      description: '客户端 App/Web 余额充值扫码支付图片 URL（按 MMK 档位，后台可更换）',
      updated_by:
        sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName') || 'admin',
    });
    setRechargeQrSaving(false);
    if (ok) {
      alert('已保存。用户端打开「余额充值 → 扫码支付」时会从服务器拉取最新图片。');
    } else {
      alert('保存失败，请检查网络与权限后重试');
    }
  };

  const triggerRechargeQrUpload = (amount: number) => {
    rechargeQrPickAmountRef.current = amount;
    rechargeQrFileInputRef.current?.click();
  };

  const handleRechargeQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const amount = rechargeQrPickAmountRef.current;
    if (!file || amount == null) {
      rechargeQrPickAmountRef.current = null;
      if (rechargeQrFileInputRef.current) rechargeQrFileInputRef.current.value = '';
      return;
    }
    try {
      setUploading(true);
      const base64 = await readFileAsBase64(file);
      const response = await fetch('/.netlify/functions/upload-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, base64 }),
      });
      const result = await response.json();
      if (!response.ok || !result?.url) throw new Error(result?.error || '上传失败');
      setRechargeQrMap((prev) => ({ ...prev, [amount]: result.url as string }));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
      rechargeQrPickAmountRef.current = null;
      if (rechargeQrFileInputRef.current) rechargeQrFileInputRef.current.value = '';
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const base64 = await readFileAsBase64(file);
      const response = await fetch('/.netlify/functions/upload-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, base64 })
      });

      const result = await response.json();
      if (!response.ok || !result?.url) throw new Error(result?.error || '上传失败');

      setFormData(prev => ({ ...prev, image_url: result.url }));
    } catch (error) {
      console.error('上传图片异常:', error);
      alert(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleWelcomeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const base64 = await readFileAsBase64(file);
      const response = await fetch('/.netlify/functions/upload-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, base64 })
      });
      const result = await response.json();
      if (!response.ok || !result?.url) throw new Error(result?.error || '上传失败');
      setWelcomeFormData(prev => ({ ...prev, image_url: result.url }));
    } catch (error) {
      console.error('上传图片异常:', error);
      alert('上传失败');
    } finally {
      setUploading(false);
      if (tutorialFileInputRef.current) tutorialFileInputRef.current.value = '';
    }
  };

  const handleTutorialFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await readFileAsBase64(file);
        const response = await fetch('/.netlify/functions/upload-banner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, contentType: file.type, base64 })
        });

        const result = await response.json();
        if (response.ok && result?.url) {
          uploadedUrls.push(result.url);
        }
      }

      setTutorialFormData(prev => {
        const nextImageUrls = [...prev.image_urls, ...uploadedUrls];
        return {
          ...prev,
          image_urls: nextImageUrls,
          image_url: nextImageUrls.length > 0 ? nextImageUrls[0] : prev.image_url
        };
      });
    } catch (error) {
      console.error('上传教学图片异常:', error);
      alert('部分图片上传失败，请重试');
    } finally {
      setUploading(false);
      if (tutorialFileInputRef.current) tutorialFileInputRef.current.value = '';
    }
  };

  const removeTutorialImage = (indexToRemove: number) => {
    setTutorialFormData(prev => {
      const nextImageUrls = prev.image_urls.filter((_, index) => index !== indexToRemove);
      return {
        ...prev,
        image_urls: nextImageUrls,
        image_url: nextImageUrls.length > 0 ? nextImageUrls[0] : ''
      };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as any).checked : value
    }));
  };

  const handleTutorialInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setTutorialFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as any).checked : value
    }));
  };

  const handleWelcomeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setWelcomeFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as any).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        const success = await bannerService.updateBanner(editingBanner.id!, formData);
        if (success) {
          alert('广告更新成功！');
          setEditingBanner(null);
          setShowForm(false);
          loadBanners();
        }
      } else {
        const success = await bannerService.createBanner(formData);
        if (success) {
          alert('广告创建成功！');
          setShowForm(false);
          loadBanners();
        }
      }
    } catch (error) {
      console.error('保存广告失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这张广告吗？')) {
      const success = await bannerService.deleteBanner(id);
      if (success) {
        loadBanners();
      }
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      burmese_title: banner.burmese_title || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      bg_color_start: banner.bg_color_start || '#3b82f6',
      bg_color_end: banner.bg_color_end || '#60a5fa',
      display_order: banner.display_order || 0,
      is_active: banner.is_active ?? true
    });
    setShowTutorialMainModal(false);
    setShowTutorialEditModal(false);
    setShowForm(true);
  };

  const handleTutorialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTutorial) {
        const success = await tutorialService.updateTutorial(editingTutorial.id!, tutorialFormData);
        if (success) {
          alert('教学步骤更新成功！');
          setEditingTutorial(null);
          setShowTutorialEditModal(false);
          loadTutorials();
        }
      } else {
        const success = await tutorialService.createTutorial(tutorialFormData);
        if (success) {
          alert('教学步骤创建成功！');
          setShowTutorialEditModal(false);
          loadTutorials();
        }
      }
    } catch (error) {
      console.error('保存教学失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleTutorialEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setTutorialFormData({
      title_zh: tutorial.title_zh,
      title_en: tutorial.title_en || '',
      title_my: tutorial.title_my || '',
      content_zh: tutorial.content_zh,
      content_en: tutorial.content_en || '',
      content_my: tutorial.content_my || '',
      image_url: tutorial.image_url || '',
      image_urls: tutorial.image_urls || (tutorial.image_url ? [tutorial.image_url] : []),
      display_order: tutorial.display_order || 0,
      is_active: tutorial.is_active ?? true
    });
    setShowForm(false);
    setShowTutorialEditModal(true);
  };

  const handleTutorialDelete = async (id: string) => {
    if (window.confirm('确定要删除这个教学步骤吗？')) {
      const success = await tutorialService.deleteTutorial(id);
      if (success) {
        loadTutorials();
      }
    }
  };

  const handleWelcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWelcomeScreen) {
        const success = await welcomeScreenService.updateWelcomeScreen(editingWelcomeScreen.id!, welcomeFormData);
        if (success) {
          alert('欢迎页面更新成功！');
          setEditingWelcomeScreen(null);
          setShowWelcomeEditModal(false);
          loadWelcomeScreens();
        }
      } else {
        const success = await welcomeScreenService.createWelcomeScreen(welcomeFormData);
        if (success) {
          alert('欢迎页面创建成功！');
          setShowWelcomeEditModal(false);
          loadWelcomeScreens();
        }
      }
    } catch (error) {
      console.error('保存欢迎页面失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleWelcomeEdit = (screen: WelcomeScreen) => {
    setEditingWelcomeScreen(screen);
    setWelcomeFormData({
      title_zh: screen.title_zh,
      title_en: screen.title_en || '',
      title_my: screen.title_my || '',
      description_zh: screen.description_zh,
      description_en: screen.description_en || '',
      description_my: screen.description_my || '',
      button_text_zh: screen.button_text_zh,
      button_text_en: screen.button_text_en || '',
      button_text_my: screen.button_text_my || '',
      image_url: screen.image_url || '',
      bg_color_start: screen.bg_color_start || '#b0d3e8',
      bg_color_end: screen.bg_color_end || '#7895a3',
      button_color_start: screen.button_color_start || '#ffffff',
      button_color_end: screen.button_color_end || '#f0f9ff',
      countdown: screen.countdown || 5,
      is_active: screen.is_active ?? false
    });
    setShowForm(false);
    setShowTutorialMainModal(false);
    setShowWelcomeEditModal(true);
  };

  const handleWelcomeDelete = async (id: string) => {
    if (window.confirm('确定要删除这个欢迎页面吗？')) {
      const success = await welcomeScreenService.deleteWelcomeScreen(id);
      if (success) {
        loadWelcomeScreens();
      }
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    marginBottom: '24px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: 'white',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.3s'
  };

  return (
    <div style={{ padding: isMobile ? '10px' : '40px', background: '#0f172a', minHeight: '100vh', color: 'white' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '32px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => navigate('/admin/dashboard')}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '12px', 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              color: 'white',
              fontSize: '1.2rem'
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 800, margin: 0, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            页面管理
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => {
              setShowForm(false);
              setShowTutorialMainModal(false);
              setShowRechargeQRModal(false);
              setShowWelcomeMainModal(!showWelcomeMainModal);
            }}
            style={{ padding: '12px 24px', borderRadius: '14px', background: showWelcomeMainModal ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: showWelcomeMainModal ? 'none' : '0 4px 12px rgba(245, 158, 11, 0.3)', transition: 'all 0.3s' }}
          >
            {showWelcomeMainModal ? '取消' : '+ 欢迎页面'}
          </button>
          <button 
            onClick={() => {
              setShowForm(false);
              setShowWelcomeMainModal(false);
              setShowRechargeQRModal(false);
              setShowTutorialMainModal(!showTutorialMainModal);
            }}
            style={{ padding: '12px 24px', borderRadius: '14px', background: showTutorialMainModal ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: showTutorialMainModal ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'all 0.3s' }}
          >
            {showTutorialMainModal ? '取消' : '+ 使用教学'}
          </button>
          <button 
            onClick={() => {
              setEditingBanner(null);
              setFormData({
                title: '',
                subtitle: '',
                burmese_title: '',
                image_url: '',
                link_url: '',
                bg_color_start: '#3b82f6',
                bg_color_end: '#60a5fa',
                display_order: 0,
                is_active: true
              });
              setShowTutorialMainModal(false);
              setShowTutorialEditModal(false);
              setShowWelcomeMainModal(false);
              setShowWelcomeEditModal(false);
              setShowRechargeQRModal(false);
              setShowForm(!showForm);
            }}
            style={{ padding: '12px 24px', borderRadius: '14px', background: showForm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: showForm ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)', transition: 'all 0.3s' }}
          >
            {showForm ? '取消' : '新建广告'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setShowTutorialMainModal(false);
              setShowWelcomeMainModal(false);
              setShowTutorialEditModal(false);
              setShowWelcomeEditModal(false);
              loadRechargeQrSettings();
              setShowRechargeQRModal(true);
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #059669, #047857)',
              border: 'none',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)',
              transition: 'all 0.3s',
            }}
          >
            + 余额充值QR
          </button>
        </div>
      </div>

      <input
        ref={rechargeQrFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleRechargeQrFileChange}
      />

      {showRechargeQRModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() => !uploading && !rechargeQrSaving && setShowRechargeQRModal(false)}
        >
          <div
            style={{
              ...cardStyle,
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>余额充值扫码图（客户端账户页）</h2>
              <button
                type="button"
                onClick={() => !uploading && !rechargeQrSaving && setShowRechargeQRModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ opacity: 0.85, fontSize: '0.9rem', marginTop: 0, marginBottom: 16 }}>
              按充值档位上传收款码图片，保存后 App / Web 用户打开「扫描二维码支付」窗口时会显示此处配置的图片（未配置档位仍使用 market-link-express.com 默认静态图）。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {RECHARGE_QR_TIERS.map((amt) => (
                <div
                  key={amt}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ minWidth: 100, fontWeight: 800 }}>{amt.toLocaleString()} MMK</div>
                  <img
                    src={rechargeQrMap[amt] || defaultRechargeQrUrlMap()[amt]}
                    alt={`qr ${amt}`}
                    style={{ width: 72, height: 72, objectFit: 'contain', background: '#fff', borderRadius: 8 }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                    <button
                      type="button"
                      disabled={uploading || rechargeQrSaving}
                      onClick={() => triggerRechargeQrUpload(amt)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#2563eb',
                        color: 'white',
                        fontWeight: 600,
                        cursor: uploading ? 'wait' : 'pointer',
                      }}
                    >
                      上传图片
                    </button>
                    <button
                      type="button"
                      disabled={uploading || rechargeQrSaving}
                      onClick={() =>
                        setRechargeQrMap((prev) => ({ ...prev, [amt]: defaultRechargeQrUrlMap()[amt] }))
                      }
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'transparent',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      恢复默认
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button
                type="button"
                disabled={uploading || rechargeQrSaving}
                onClick={() => setShowRechargeQRModal(false)}
                style={{
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                关闭
              </button>
              <button
                type="button"
                disabled={uploading || rechargeQrSaving}
                onClick={saveRechargeQrSettings}
                style={{
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  fontWeight: 700,
                  cursor: rechargeQrSaving ? 'wait' : 'pointer',
                }}
              >
                {rechargeQrSaving ? '保存中…' : '保存到服务器'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTutorialMainModal && (
        <div style={{ ...cardStyle, border: '1px solid rgba(16, 185, 129, 0.2)', position: 'relative', overflow: 'hidden', maxWidth: '400px', margin: '0 auto 24px' }}>
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: 700 }}>配置新教学步骤</h2>
            <button 
              onClick={() => {
                setEditingTutorial(null);
                setTutorialFormData({
                  title_zh: '',
                  title_en: '',
                  title_my: '',
                  content_zh: '',
                  content_en: '',
                  content_my: '',
                  image_url: '',
                  image_urls: [],
                  display_order: 0,
                  is_active: true
                });
                setShowTutorialEditModal(true);
              }}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'white', color: '#10b981', border: '2px dashed #10b981', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0fff4';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              + 新增教学步骤
            </button>
          </div>
        </div>
      )}

      {showWelcomeMainModal && (
        <div style={{ ...cardStyle, border: '1px solid rgba(245, 158, 11, 0.2)', position: 'relative', overflow: 'hidden', maxWidth: '400px', margin: '0 auto 24px' }}>
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: 700 }}>配置欢迎页面</h2>
            <button 
              onClick={() => {
                setEditingWelcomeScreen(null);
                setWelcomeFormData({
                  title_zh: '',
                  title_en: '',
                  title_my: '',
                  description_zh: '',
                  description_en: '',
                  description_my: '',
                  button_text_zh: '',
                  button_text_en: '',
                  button_text_my: '',
                  image_url: '',
                  bg_color_start: '#b0d3e8',
                  bg_color_end: '#7895a3',
                  button_color_start: '#ffffff',
                  button_color_end: '#f0f9ff',
                  countdown: 5,
                  is_active: false
                });
                setShowWelcomeEditModal(true);
              }}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'white', color: '#f59e0b', border: '2px dashed #f59e0b', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fffbeb';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              + 新增欢迎页面
            </button>
          </div>
        </div>
      )}

      {showWelcomeEditModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{ 
            background: '#1e293b',
            borderRadius: '28px',
            border: '1px solid rgba(245, 158, 11, 0.4)', 
            width: '100%', 
            maxWidth: '600px', 
            maxHeight: '90vh', 
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
          }}>
            {/* 固定头部 */}
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', margin: 0 }}>配置欢迎页面内容</h2>
              <button 
                onClick={() => setShowWelcomeEditModal(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
            
            {/* 可滚动内容区 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <form id="welcomeForm" onSubmit={handleWelcomeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 标题部分 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: '1 / span 2' }}>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>欢迎标题 (中文)</label>
                    <input name="title_zh" value={welcomeFormData.title_zh} onChange={handleWelcomeInputChange} placeholder="例如：欢迎使用 MARKET LINK EXPRESS" style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>标题 (英文)</label>
                    <input name="title_en" value={welcomeFormData.title_en} onChange={handleWelcomeInputChange} placeholder="Welcome to..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>标题 (缅文)</label>
                    <input name="title_my" value={welcomeFormData.title_my} onChange={handleWelcomeInputChange} placeholder="ကြိုဆိုပါတယ်" style={inputStyle} />
                  </div>
                </div>

                {/* 描述部分 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>描述内容 (中文)</label>
                    <textarea name="description_zh" value={welcomeFormData.description_zh} onChange={handleWelcomeInputChange} placeholder="描述信息..." style={{ ...inputStyle, height: '80px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>描述 (英文)</label>
                    <textarea name="description_en" value={welcomeFormData.description_en} onChange={handleWelcomeInputChange} style={{ ...inputStyle, height: '80px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>描述 (缅文)</label>
                    <textarea name="description_my" value={welcomeFormData.description_my} onChange={handleWelcomeInputChange} style={{ ...inputStyle, height: '80px' }} />
                  </div>
                </div>

                {/* 按钮文字部分 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>按钮 (中)</label>
                    <input name="button_text_zh" value={welcomeFormData.button_text_zh} onChange={handleWelcomeInputChange} placeholder="立即体验" style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>按钮 (英)</label>
                    <input name="button_text_en" value={welcomeFormData.button_text_en} onChange={handleWelcomeInputChange} placeholder="Start" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>按钮 (缅)</label>
                    <input name="button_text_my" value={welcomeFormData.button_text_my} onChange={handleWelcomeInputChange} style={inputStyle} />
                  </div>
                </div>

                {/* 图片上传区域 */}
                <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '12px', fontWeight: 700 }}>欢迎页 Logo/展示图</label>
                  <button 
                    type="button" 
                    onClick={() => tutorialFileInputRef.current?.click()} 
                    disabled={uploading} 
                    style={{ 
                      width: '100%',
                      padding: '18px', 
                      borderRadius: '16px', 
                      background: uploading ? 'rgba(255,255,255,0.1)' : 'rgba(245, 158, 11, 0.1)', 
                      border: '2px dashed #f59e0b', 
                      color: '#f59e0b', 
                      fontWeight: 800,
                      cursor: uploading ? 'wait' : 'pointer', 
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {uploading ? '⌛ 正在上传中...' : '📸 点击选择图片并上传'}
                  </button>
                  <input 
                    type="file" 
                    ref={tutorialFileInputRef} 
                    onChange={handleWelcomeFileChange} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                  {welcomeFormData.image_url && (
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700 }}>
                      <span>✅ 图片已就绪</span>
                      <img src={welcomeFormData.image_url} alt="preview" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                {/* 颜色与倒计时设置 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px' }}>背景渐变(起)</label>
                    <input type="color" name="bg_color_start" value={welcomeFormData.bg_color_start} onChange={handleWelcomeInputChange} style={{ ...inputStyle, height: '45px', padding: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px' }}>背景渐变(终)</label>
                    <input type="color" name="bg_color_end" value={welcomeFormData.bg_color_end} onChange={handleWelcomeInputChange} style={{ ...inputStyle, height: '45px', padding: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px' }}>倒计时(秒)</label>
                    <input type="number" name="countdown" value={welcomeFormData.countdown} onChange={handleWelcomeInputChange} style={inputStyle} />
                  </div>
                </div>

                {/* 设置部分 */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <input type="checkbox" id="welcome_is_active" name="is_active" checked={welcomeFormData.is_active} onChange={handleWelcomeInputChange} style={{ width: '20px', height: '20px' }} />
                  <label htmlFor="welcome_is_active" style={{ fontSize: '0.9rem', fontWeight: 600 }}>立即启用该欢迎页 (注意：只能有一个活跃欢迎页)</label>
                </div>
              </form>
            </div>

            {/* 固定底部按钮 */}
            <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowWelcomeEditModal(false)}
                  style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer' }}
                >取消</button>
                <button 
                  form="welcomeForm"
                  type="submit" 
                  style={{ flex: 2, padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)' }}
                >
                  {editingWelcomeScreen ? '保存修改' : '确认发布'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTutorialEditModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{ 
            background: '#1e293b',
            borderRadius: '28px',
            border: '1px solid rgba(16, 185, 129, 0.4)', 
            width: '100%', 
            maxWidth: '520px', 
            maxHeight: '85vh', 
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
          }}>
            {/* 固定头部 */}
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', margin: 0 }}>配置教学步骤</h2>
              <button 
                onClick={() => setShowTutorialEditModal(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
            
            {/* 可滚动内容区 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <form id="tutorialForm" onSubmit={handleTutorialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 标题部分 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>标题 (中文)</label>
                    <input name="title_zh" value={tutorialFormData.title_zh} onChange={handleTutorialInputChange} placeholder="例如：注册与登录" style={inputStyle} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>标题 (英文)</label>
                    <input name="title_en" value={tutorialFormData.title_en} onChange={handleTutorialInputChange} placeholder="Register & Login" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>标题 (缅文)</label>
                    <input name="title_my" value={tutorialFormData.title_my} onChange={handleTutorialInputChange} placeholder="အကောင့်ဖွင့်ပါ" style={inputStyle} />
                  </div>
                </div>

                {/* 上传区域 */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '12px', fontWeight: 700 }}>教学展示图片 (支持多张)</label>
                  <button 
                    type="button" 
                    onClick={() => tutorialFileInputRef.current?.click()} 
                    disabled={uploading} 
                    style={{ 
                      width: '100%',
                      padding: '18px', 
                      borderRadius: '16px', 
                      background: uploading ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.1)', 
                      border: '2px dashed #10b981', 
                      color: '#10b981', 
                      fontWeight: 800,
                      cursor: uploading ? 'wait' : 'pointer', 
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {uploading ? '⌛ 正在上传中...' : '📸 点击选择图片并上传 (可多选)'}
                  </button>
                  <input 
                    type="file" 
                    ref={tutorialFileInputRef} 
                    onChange={handleTutorialFileChange} 
                    accept="image/*" 
                    multiple
                    style={{ display: 'none' }} 
                  />
                  
                  {tutorialFormData.image_urls.length > 0 && (
                    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px' }}>
                      {tutorialFormData.image_urls.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                          <img src={url} alt={`preview-${idx}`} style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                          <button 
                            type="button"
                            onClick={() => removeTutorialImage(idx)}
                            style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 内容描述部分 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>详细描述 (中文)</label>
                    <textarea name="content_zh" value={tutorialFormData.content_zh} onChange={handleTutorialInputChange} placeholder="详细步骤..." style={{ ...inputStyle, height: '100px', resize: 'none' }} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>详细描述 (英文)</label>
                    <textarea name="content_en" value={tutorialFormData.content_en} onChange={handleTutorialInputChange} placeholder="English details..." style={{ ...inputStyle, height: '100px', resize: 'none' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>详细描述 (缅文)</label>
                    <textarea name="content_my" value={tutorialFormData.content_my} onChange={handleTutorialInputChange} placeholder="အသေးစိတ်..." style={{ ...inputStyle, height: '100px', resize: 'none' }} />
                  </div>
                </div>

                {/* 设置部分 */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>排序权重</label>
                    <input type="number" name="display_order" value={tutorialFormData.display_order} onChange={handleTutorialInputChange} style={{ ...inputStyle, padding: '10px' }} />
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <input type="checkbox" id="tut_is_active" name="is_active" checked={tutorialFormData.is_active} onChange={handleTutorialInputChange} style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="tut_is_active" style={{ fontSize: '0.9rem', fontWeight: 600 }}>启用状态</label>
                  </div>
                </div>
              </form>
            </div>

            {/* 固定底部按钮 */}
            <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowTutorialEditModal(false)}
                  style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer' }}
                >取消</button>
                <button 
                  form="tutorialForm"
                  type="submit" 
                  style={{ flex: 2, padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)' }}
                >
                  {editingTutorial ? '保存修改' : '确认添加步骤'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ ...cardStyle, border: '1px solid rgba(255,255,255,0.2)', position: 'relative', overflow: 'hidden' }}>
          {/* 背景装饰光效 */}
          <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', zIndex: 0 }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '32px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '4px', height: '24px', background: '#3b82f6', borderRadius: '2px' }} />
              {editingBanner ? '编辑广告内容' : '配置新广告'}
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 350px', gap: '40px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>标题 (中文)</label>
                  <input name="title" value={formData.title} onChange={handleInputChange} placeholder="例如：曼德勒同城快递" style={inputStyle} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>标题 (缅文)</label>
                  <input name="burmese_title" value={formData.burmese_title} onChange={handleInputChange} placeholder="例如：မန္တလေးမြို့တွင်း ပို့ဆောင်ရေး" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: isMobile ? 'auto' : '1 / span 2' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>子标题 (中文)</label>
                  <input name="subtitle" value={formData.subtitle} onChange={handleInputChange} placeholder="例如：5分钟接单 · 实时定位" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>图片 (可选)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      name="image_url" 
                      value={formData.image_url} 
                      onChange={handleInputChange} 
                      placeholder="https://..." 
                      style={{ ...inputStyle, flex: 1 }} 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        padding: '0 16px',
                        borderRadius: '12px',
                        background: uploading ? 'rgba(255,255,255,0.1)' : '#3b82f6',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {uploading ? '上传中...' : '上传图片'}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleBannerFileChange} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>跳转链接 (可选)</label>
                  <input name="link_url" value={formData.link_url} onChange={handleInputChange} placeholder="https://..." style={inputStyle} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>渐变色 (起)</label>
                    <div style={{ position: 'relative' }}>
                      <input type="color" name="bg_color_start" value={formData.bg_color_start} onChange={handleInputChange} style={{ ...inputStyle, height: '45px', padding: '4px', cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>渐变色 (终)</label>
                    <input type="color" name="bg_color_end" value={formData.bg_color_end} onChange={handleInputChange} style={{ ...inputStyle, height: '45px', padding: '4px', cursor: 'pointer' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>显示顺序</label>
                  <input type="number" name="display_order" value={formData.display_order} onChange={handleInputChange} style={inputStyle} />
                </div>

                <div style={{ gridColumn: isMobile ? 'auto' : '1 / span 2', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <label htmlFor="is_active" style={{ cursor: 'pointer', fontWeight: 500 }}>立即启用此广告 (用户可见)</label>
                </div>

                <div style={{ gridColumn: isMobile ? 'auto' : '1 / span 2', marginTop: '12px' }}>
                  <button type="submit" style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'white', color: '#0f172a', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                    {editingBanner ? '保存修改' : '确认发布'}
                  </button>
                </div>
              </form>

              {/* 实时预览区域 */}
              {!isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>实时预览 (App 效果)</label>
                  <div style={{ 
                    width: '100%', 
                    height: '200px', 
                    borderRadius: '20px', 
                    background: `linear-gradient(135deg, ${formData.bg_color_start}, ${formData.bg_color_end})`,
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>ML</div>
                      <div style={{ height: '2px', flex: 1, background: 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'white' }}>{formData.title || '标题展示区'}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', margin: '4px 0' }}>{formData.subtitle || '子标题展示区'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: 0 }}>{formData.burmese_title || 'Burmese text here'}</p>
                    
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚀</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.5 }}>
                    预览仅供参考，实际效果以手机端渲染为准。<br/>建议使用高对比度颜色组合。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="loader" style={{ margin: '0 auto 20px auto' }}></div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>正在获取广告列表...</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', marginTop: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '4px', height: '24px', background: '#f59e0b', borderRadius: '2px' }} />
              当前欢迎页面
            </h2>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
              {welcomeScreens.length} 个配置
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            {welcomeScreens.map(screen => (
              <div key={screen.id} style={{ ...cardStyle, padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '140px', background: `linear-gradient(135deg, ${screen.bg_color_start}, ${screen.bg_color_end})`, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {screen.image_url ? (
                    <img src={screen.image_url} style={{ width: '60px', height: '60px', objectFit: 'contain' }} alt="welcome" />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>👋</span>
                  )}
                  {screen.is_active && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', color: 'white', fontWeight: 700 }}>活跃中</div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'white' }}>{screen.title_zh}</h3>
                  </div>
                </div>
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{screen.description_zh.substring(0, 50)}...</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>倒计时: {screen.countdown}s</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleWelcomeEdit(screen)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>编辑</button>
                      <button onClick={() => screen.id && handleWelcomeDelete(screen.id)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}>删除</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', marginTop: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '4px', height: '24px', background: '#10b981', borderRadius: '2px' }} />
              当前使用教学步骤
            </h2>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
              {tutorials.length} 个步骤
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            {tutorials.map(tutorial => (
              <div key={tutorial.id} style={{ ...cardStyle, padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '160px', background: '#1e293b', position: 'relative', overflow: 'hidden' }}>
                  {tutorial.image_urls && tutorial.image_urls.length > 0 ? (
                    <>
                      <img src={tutorial.image_urls[0]} alt={tutorial.title_zh} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {tutorial.image_urls.length > 1 && (
                        <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', color: 'white', fontWeight: 700 }}>
                          +{tutorial.image_urls.length - 1} 张图片
                        </div>
                      )}
                    </>
                  ) : tutorial.image_url ? (
                    <img src={tutorial.image_url} alt={tutorial.title_zh} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '3rem' }}>📖</div>
                  )}
                  {!tutorial.is_active && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', color: 'white' }}>已停用</div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'white' }}>{tutorial.title_zh}</h3>
                  </div>
                </div>
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineBreak: 'anywhere' }}>{tutorial.content_zh.substring(0, 60)}...</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.75rem', color: '#10b981' }}>权重: {tutorial.display_order}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleTutorialEdit(tutorial)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>编辑</button>
                      <button onClick={() => tutorial.id && handleTutorialDelete(tutorial.id)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}>删除</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '4px', height: '24px', background: '#a78bfa', borderRadius: '2px' }} />
              当前在线广告
            </h2>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600 }}>
              {banners.length} 个项目
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
            {banners.map(banner => (
              <div key={banner.id} style={{ ...cardStyle, padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                {/* 广告卡片预览图 */}
                <div style={{ 
                  height: '160px', 
                  background: `linear-gradient(135deg, ${banner.bg_color_start}, ${banner.bg_color_end})`,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {!banner.is_active && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', color: 'white', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      已停用
                    </div>
                  )}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'white' }}>{banner.title}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', margin: '4px 0' }}>{banner.subtitle}</p>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>{banner.burmese_title}</p>
                </div>

                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                      排序权重: <span style={{ color: 'white', fontWeight: 600 }}>{banner.display_order}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
                      状态: <span style={{ color: banner.is_active ? '#10b981' : '#ef4444', fontWeight: 600 }}>{banner.is_active ? '正在展示' : '下线'}</span>
                    </div>
                  </div>

                  {banner.link_url && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px' }}>
                      🔗 {banner.link_url}
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button 
                      onClick={() => handleEdit(banner)}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      编辑配置
                    </button>
                    <button 
                      onClick={() => banner.id && handleDelete(banner.id)}
                      style={{ padding: '10px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {banners.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', padding: '80px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '2px dashed rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                <h3 style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>暂无广告内容，点击上方按钮发布首条广告</h3>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BannerManagement;


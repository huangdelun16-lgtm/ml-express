import React, { useState, useEffect } from 'react';
import { bannerService, Banner } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';

const BannerManagement: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
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

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    const data = await bannerService.getAllBanners();
    setBanners(data);
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
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
    setShowForm(true);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          广告管理
        </h1>
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
            setShowForm(!showForm);
          }}
          style={{ padding: '12px 24px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
        >
          {showForm ? '取消' : '新建广告'}
        </button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>{editingBanner ? '编辑广告' : '创建新广告'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>标题 (中文)</label>
              <input name="title" value={formData.title} onChange={handleInputChange} style={inputStyle} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>子标题 (中文)</label>
              <input name="subtitle" value={formData.subtitle} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>标题 (缅文)</label>
              <input name="burmese_title" value={formData.burmese_title} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>图片 URL (可选)</label>
              <input name="image_url" value={formData.image_url} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>跳转链接 (可选)</label>
              <input name="link_url" value={formData.link_url} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>显示顺序</label>
              <input type="number" name="display_order" value={formData.display_order} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>背景颜色 (起始)</label>
              <input type="color" name="bg_color_start" value={formData.bg_color_start} onChange={handleInputChange} style={{ ...inputStyle, height: '45px', padding: '5px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>背景颜色 (结束)</label>
              <input type="color" name="bg_color_end" value={formData.bg_color_end} onChange={handleInputChange} style={{ ...inputStyle, height: '45px', padding: '5px' }} />
            </div>
            <div style={{ gridColumn: isMobile ? 'auto' : '1 / span 2', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} style={{ width: '20px', height: '20px' }} />
              <label>启用此广告</label>
            </div>
            <div style={{ gridColumn: isMobile ? 'auto' : '1 / span 2' }}>
              <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'white', color: '#0f172a', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                {editingBanner ? '更新广告' : '立即发布'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {banners.map(banner => (
            <div key={banner.id} style={{ ...cardStyle, background: `linear-gradient(135deg, ${banner.bg_color_start}44, ${banner.bg_color_end}44)`, position: 'relative' }}>
              {!banner.is_active && (
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>
                  未启用
                </div>
              )}
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>{banner.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 16px 0' }}>{banner.subtitle}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontStyle: 'italic' }}>{banner.burmese_title}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>排序: {banner.display_order}</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => handleEdit(banner)} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}>编辑</button>
                  <button onClick={() => handleDelete(banner.id!)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>删除</button>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
              暂无广告内容，点击右上方“新建广告”添加。
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BannerManagement;


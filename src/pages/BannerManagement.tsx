import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bannerService, Banner } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import { fileUploadService } from '../services/FileUploadService';

const BannerManagement: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    const data = await bannerService.getAllBanners();
    setBanners(data);
    setLoading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const base64 = await readFileAsBase64(file);
      const response = await fetch('/.netlify/functions/upload-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          base64
        })
      });

      const result = await response.json();
      if (!response.ok || !result?.url) {
        throw new Error(result?.error || '上传失败，请重试');
      }

      setFormData(prev => ({
        ...prev,
        image_url: result.url
      }));
    } catch (error) {
      console.error('上传图片异常:', error);
      alert(error instanceof Error ? error.message : '上传异常，请检查网络连接');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
            广告管理
          </h1>
        </div>
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
          style={{ padding: '12px 24px', borderRadius: '14px', background: showForm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: showForm ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)', transition: 'all 0.3s' }}
        >
          {showForm ? '取消' : '新建广告'}
        </button>
      </div>

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
                      onChange={handleFileChange} 
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


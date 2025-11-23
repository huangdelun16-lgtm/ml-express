import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageService, Package, supabase, auditLogService, deliveryPhotoService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import QRCode from 'qrcode';
import { SkeletonCard } from '../components/SkeletonLoader';
import { useResponsive } from '../hooks/useResponsive';

const CityPackages: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [courierDetail, setCourierDetail] = useState<any>(null);
  const [courierLoading, setCourierLoading] = useState(false);
  
  // 新增状态管理
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);
  const [showDeliveryScanModal, setShowDeliveryScanModal] = useState(false);
  const [showUploadPhotoModal, setShowUploadPhotoModal] = useState(false);
  const [deliveryScanTab, setDeliveryScanTab] = useState('pickup');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // 新增功能状态
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [packagePhotos, setPackagePhotos] = useState<any[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  
  // 查询单号功能状态
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Package | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // 状态过滤功能状态
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // 寄件码功能状态
  const [selectedPackageForPickup, setSelectedPackageForPickup] = useState<Package | null>(null);
  
  // 批量删除功能状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // 加载包裹数据
  useEffect(() => {
    loadPackages();
    
    // 设置定时刷新，每30秒刷新一次包裹状态
    const refreshInterval = setInterval(() => {
      loadPackages();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await packageService.getAllPackages();
      setPackages(data);
    } catch (error) {
      console.error('加载包裹数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算包裹统计信息
  const getPackageStatistics = () => {
    const total = packages.length;
    const pending = packages.filter(p => p.status === '待取件').length;
    const pickedUp = packages.filter(p => p.status === '已取件').length;
    const delivering = packages.filter(p => p.status === '配送中' || p.status === '配送进行中').length;
    const delivered = packages.filter(p => p.status === '已送达').length;
    const cancelled = packages.filter(p => p.status === '已取消').length;

    return {
      total,
      pending,
      pickedUp,
      delivering,
      delivered,
      cancelled
    };
  };

  // 按日期和状态过滤包裹
  const getFilteredPackages = () => {
    let filteredPackages = [...packages];
    
    // 按状态过滤
    if (selectedStatus) {
      filteredPackages = filteredPackages.filter(pkg => {
        if (selectedStatus === '配送中') {
          return pkg.status === '配送中' || pkg.status === '配送进行中';
        }
        return pkg.status === selectedStatus;
      });
    }
    
    // 按日期过滤
    if (selectedDate) {
      filteredPackages = filteredPackages.filter(pkg => {
        const dateStr = pkg.created_at || pkg.create_time;
        if (!dateStr) return false;
        const pkgDate = new Date(dateStr).toLocaleDateString('zh-CN');
        return pkgDate === selectedDate;
      });
    }
    
    // 按创建时间倒序排列
    return filteredPackages.sort((a, b) => {
      const dateStrA = a.created_at || a.create_time;
      const dateStrB = b.created_at || b.create_time;
      const dateA = dateStrA ? new Date(dateStrA).getTime() : 0;
      const dateB = dateStrB ? new Date(dateStrB).getTime() : 0;
      return dateB - dateA;
    });
  };

  // 获取可用日期列表
  const getAvailableDates = () => {
    const dates = new Set<string>();
    packages.forEach(pkg => {
      const dateStr = pkg.created_at || pkg.create_time;
      if (dateStr) {
        const date = new Date(dateStr).toLocaleDateString('zh-CN');
        dates.add(date);
      }
    });
    return Array.from(dates).sort((a, b) => {
      // 按日期倒序排列（最新的在前）
      return new Date(b).getTime() - new Date(a).getTime();
    });
  };

  // 格式化日期显示
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `今天 (${dateStr})`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 (${dateStr})`;
    } else {
      return dateStr;
    }
  };

  // 处理状态卡片点击
  const handleStatusClick = (status: string) => {
    if (selectedStatus === status) {
      // 如果点击的是当前选中的状态，则取消选择
      setSelectedStatus(null);
    } else {
      // 否则选择新状态
      setSelectedStatus(status);
    }
  };

  // 清除所有过滤
  const clearAllFilters = () => {
    setSelectedStatus(null);
    setSelectedDate(null);
  };

  // 切换批量模式
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedPackages(new Set());
  };

  // 切换包裹选择
  const togglePackageSelection = (packageId: string) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(packageId)) {
      newSelected.delete(packageId);
    } else {
      newSelected.add(packageId);
    }
    setSelectedPackages(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const filtered = getFilteredPackages();
    if (selectedPackages.size === filtered.length) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(filtered.map(pkg => pkg.id)));
    }
  };

  // 批量删除包裹
  const handleBatchDelete = async () => {
    if (selectedPackages.size === 0) {
      alert(language === 'zh' ? '请先选择要删除的包裹' : language === 'en' ? 'Please select packages to delete' : 'ဖျက်ရန်ပက်ကေ့ဂျ်များကို ရွေးချယ်ပါ');
      return;
    }

    setShowDeleteConfirm(true);
  };

  // 确认批量删除
  const confirmBatchDelete = async () => {
    if (selectedPackages.size === 0) return;

    setDeleting(true);
    try {
      const packageIds = Array.from(selectedPackages);
      const result = await packageService.deletePackages(packageIds);

      // 记录审计日志
      const currentUser = localStorage.getItem('currentUser') || 'unknown';
      const currentUserName = localStorage.getItem('currentUserName') || '未知用户';
      await auditLogService.log({
        user_id: currentUser,
        user_name: currentUserName,
        action_type: 'delete',
        module: 'packages',
        target_id: packageIds.join(', '),
        target_name: `批量删除 ${packageIds.length} 个包裹`,
        action_description: `批量删除包裹，成功：${result.success} 个，失败：${result.failed} 个`,
        new_value: JSON.stringify({
          success: result.success,
          failed: result.failed,
          errors: result.errors
        })
      });

      if (result.failed === 0) {
        alert(language === 'zh' 
          ? `成功删除 ${result.success} 个包裹` 
          : language === 'en' 
          ? `Successfully deleted ${result.success} packages`
          : `ပက်ကေ့ဂျ် ${result.success} ခု ဖျက်ပြီးပါပြီ`);
      } else {
        alert(language === 'zh' 
          ? `删除完成：成功 ${result.success} 个，失败 ${result.failed} 个` 
          : language === 'en' 
          ? `Delete completed: ${result.success} succeeded, ${result.failed} failed`
          : `ဖျက်ပြီး: ${result.success} ခု အောင်မြင်, ${result.failed} ခု မအောင်မြင်`);
      }

      // 重新加载包裹列表
      await loadPackages();
      
      // 退出批量模式
      setBatchMode(false);
      setSelectedPackages(new Set());
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('批量删除失败:', error);
      alert(language === 'zh' ? '批量删除失败，请重试' : language === 'en' ? 'Batch delete failed, please try again' : 'ဖျက်ရန် မအောင်မြင်၊ ထပ်စမ်းကြည့်ပါ');
    } finally {
      setDeleting(false);
    }
  };
  
  // 显示寄件码
  const showPickupCode = async (pkg: Package) => {
    setSelectedPackageForPickup(pkg);
    await generateQRCode(pkg.id);
    setShowPickupCodeModal(true);
  };
  
  // 关闭寄件码模态框
  const closePickupCodeModal = () => {
    setShowPickupCodeModal(false);
    setSelectedPackageForPickup(null);
    setQrCodeDataUrl('');
  };
  
  // 保存二维码
  const saveQRCode = () => {
    if (qrCodeDataUrl && selectedPackageForPickup) {
      const link = document.createElement('a');
      link.download = `寄件码_${selectedPackageForPickup.id}.png`;
      link.href = qrCodeDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 查找包裹照片
  const findPackagePhotos = async (packageId: string) => {
    try {
      setPhotoLoading(true);
      
      // 从数据库获取真实照片
      const photos = await deliveryPhotoService.getPackagePhotos(packageId);
      
      if (photos.length === 0) {
        // 如果没有照片，显示空状态
        setPackagePhotos([]);
        setShowPhotoModal(true);
        return;
      }

      // 转换数据格式以匹配UI
      const formattedPhotos = photos.map((photo, index) => ({
        id: photo.id.toString(),
        url: photo.photo_base64 ? `data:image/jpeg;base64,${photo.photo_base64}` : photo.photo_url,
        timestamp: new Date(photo.upload_time).toLocaleString('zh-CN'),
        courier: photo.courier_name,
        location: photo.location_name || `${photo.latitude?.toFixed(4)}, ${photo.longitude?.toFixed(4)}`
      }));
      
      setPackagePhotos(formattedPhotos);
      setShowPhotoModal(true);
    } catch (error) {
      console.error('查找包裹照片失败:', error);
      setPackagePhotos([]);
      setShowPhotoModal(true);
    } finally {
      setPhotoLoading(false);
    }
  };

  // 查询包裹单号
  const searchPackage = async () => {
    if (!searchQuery.trim()) {
      alert('请输入包裹单号');
      return;
    }

    try {
      setSearchLoading(true);
      // 在当前包裹列表中搜索
      const foundPackage = packages.find(pkg => 
        pkg.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.receiver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.sender_phone.includes(searchQuery) ||
        pkg.receiver_phone.includes(searchQuery)
      );

      if (foundPackage) {
        setSearchResult(foundPackage);
        setShowSearchModal(false);
        setShowDetailModal(true);
        setSelectedPackage(foundPackage);
      } else {
        alert('未找到相关包裹，请检查单号是否正确');
      }
    } catch (error) {
      console.error('查询包裹失败:', error);
      alert('查询失败，请重试');
    } finally {
      setSearchLoading(false);
    }
  };

  const updatePackageStatus = async (id: string, newStatus: string) => {
    const success = await packageService.updatePackageStatus(id, newStatus);
    if (success) {
      await loadPackages();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      case '已送达': return '#27ae60';
      case '已取消': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '待取件': return '待取件';
      case '已取件': return '已取件';
      case '配送中': return '配送中';
      case '已送达': return '已送达';
      case '已取消': return '已取消';
      default: return status;
    }
  };

  const handleViewDetail = async (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPackage(null);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: isMobile ? '12px' : '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        color: 'white',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            {language === 'zh' ? '同城包裹管理' : language === 'en' ? 'City Package Management' : 'မြို့တွင်းပက်ကေ့ဂျ်စီမံခန့်ခွဲမှု'}
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              {language === 'zh' ? '管理缅甸同城快递包裹' : 'Manage local express packages in Myanmar'}
            </p>
            
            {/* 包裹统计信息 - 可点击过滤器 */}
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              marginTop: '15px',
              flexWrap: 'wrap'
            }}>
              {(() => {
                const stats = getPackageStatistics();
                return (
                  <>
                    <div 
                      onClick={() => handleStatusClick('all')}
                      style={{ 
                        background: selectedStatus === 'all' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)', 
                        padding: '12px 20px', 
                        borderRadius: '25px',
                        backdropFilter: 'blur(10px)',
                        border: selectedStatus === 'all' ? '2px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: selectedStatus === 'all' ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: selectedStatus === 'all' ? '0 4px 15px rgba(255, 255, 255, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        {language === 'zh' ? '总包裹: ' : language === 'en' ? 'Total: ' : 'စုစုပေါင်း: '}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{stats.total}</span>
        </div>
                    <div 
                      onClick={() => handleStatusClick('待取件')}
          style={{
                        background: selectedStatus === '待取件' ? 'rgba(243, 156, 18, 0.4)' : 'rgba(243, 156, 18, 0.2)', 
                        padding: '12px 20px', 
                        borderRadius: '25px',
                        backdropFilter: 'blur(10px)',
                        border: selectedStatus === '待取件' ? '2px solid rgba(243, 156, 18, 0.6)' : '1px solid rgba(243, 156, 18, 0.3)',
            cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: selectedStatus === '待取件' ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: selectedStatus === '待取件' ? '0 4px 15px rgba(243, 156, 18, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        {language === 'zh' ? '待取件: ' : language === 'en' ? 'Pending: ' : 'စောင့်ဆိုင်းဆဲ: '}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#f39c12' }}>{stats.pending}</span>
                    </div>
                    <div 
                      onClick={() => handleStatusClick('已取件')}
                      style={{ 
                        background: selectedStatus === '已取件' ? 'rgba(52, 152, 219, 0.4)' : 'rgba(52, 152, 219, 0.2)', 
                        padding: '12px 20px', 
                        borderRadius: '25px',
            backdropFilter: 'blur(10px)',
                        border: selectedStatus === '已取件' ? '2px solid rgba(52, 152, 219, 0.6)' : '1px solid rgba(52, 152, 219, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: selectedStatus === '已取件' ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: selectedStatus === '已取件' ? '0 4px 15px rgba(52, 152, 219, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        {language === 'zh' ? '已取件: ' : language === 'en' ? 'Picked Up: ' : 'ကောက်ယူပြီး: '}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#3498db' }}>{stats.pickedUp}</span>
                    </div>
                    <div 
                      onClick={() => handleStatusClick('配送中')}
                      style={{ 
                        background: selectedStatus === '配送中' ? 'rgba(155, 89, 182, 0.4)' : 'rgba(155, 89, 182, 0.2)', 
                        padding: '12px 20px', 
                        borderRadius: '25px',
                        backdropFilter: 'blur(10px)',
                        border: selectedStatus === '配送中' ? '2px solid rgba(155, 89, 182, 0.6)' : '1px solid rgba(155, 89, 182, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: selectedStatus === '配送中' ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: selectedStatus === '配送中' ? '0 4px 15px rgba(155, 89, 182, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        {language === 'zh' ? '配送中: ' : language === 'en' ? 'Delivering: ' : 'ပို့ဆောင်နေဆဲ: '}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#9b59b6' }}>{stats.delivering}</span>
                    </div>
                    <div 
                      onClick={() => handleStatusClick('已送达')}
                      style={{ 
                        background: selectedStatus === '已送达' ? 'rgba(39, 174, 96, 0.4)' : 'rgba(39, 174, 96, 0.2)', 
                        padding: '12px 20px', 
                        borderRadius: '25px',
                        backdropFilter: 'blur(10px)',
                        border: selectedStatus === '已送达' ? '2px solid rgba(39, 174, 96, 0.6)' : '1px solid rgba(39, 174, 96, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: selectedStatus === '已送达' ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: selectedStatus === '已送达' ? '0 4px 15px rgba(39, 174, 96, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        {language === 'zh' ? '已送达: ' : language === 'en' ? 'Delivered: ' : 'ပေးပို့ပြီး: '}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#27ae60' }}>{stats.delivered}</span>
      </div>
                  </>
                );
              })()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {batchMode ? (
              <>
                <button
                  onClick={toggleSelectAll}
                  style={{
                    background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(155, 89, 182, 0.3)',
                    transition: 'all 0.3s ease',
                    textShadow: 'none'
                  }}
                >
                  {selectedPackages.size === getFilteredPackages().length ? '☐' : '☑'} {language === 'zh' ? '全选' : language === 'en' ? 'Select All' : 'အားလုံးရွေးချယ်ရန်'}
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedPackages.size === 0}
                  style={{
                    background: selectedPackages.size === 0 
                      ? 'rgba(231, 76, 60, 0.3)' 
                      : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: selectedPackages.size === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: selectedPackages.size === 0 ? 'none' : '0 4px 12px rgba(231, 76, 60, 0.3)',
                    transition: 'all 0.3s ease',
                    textShadow: 'none',
                    opacity: selectedPackages.size === 0 ? 0.5 : 1
                  }}
                >
                  🗑️ {language === 'zh' ? `批量删除 (${selectedPackages.size})` : language === 'en' ? `Batch Delete (${selectedPackages.size})` : `ဖျက်ရန် (${selectedPackages.size})`}
                </button>
                <button
                  onClick={toggleBatchMode}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    textShadow: 'none'
                  }}
                >
                  ✕ {language === 'zh' ? '取消批量' : language === 'en' ? 'Cancel Batch' : 'ဖျက်သိမ်းရန်'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleBatchMode}
                  style={{
                    background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(243, 156, 18, 0.3)',
                    transition: 'all 0.3s ease',
                    textShadow: 'none'
                  }}
                >
                  ☑️ {language === 'zh' ? '批量操作' : language === 'en' ? 'Batch Mode' : 'အစုလိုက်လုပ်ဆောင်ရန်'}
                </button>
                <button
                  onClick={() => setShowSearchModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
        display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
                    transition: 'all 0.3s ease',
                    textShadow: 'none'
                  }}
                >
                  🔍 {language === 'zh' ? '查询单号' : language === 'en' ? 'Search Package' : 'ပါဆယ်ရှာဖွေရန်'}
                </button>
              </>
            )}
            
        <button
              onClick={() => setShowDatePicker(true)}
          style={{
                background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
            cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
            backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                textShadow: 'none'
          }}
        >
              📅 {language === 'zh' ? '日期筛选' : language === 'en' ? 'Date Filter' : 'ရက်စွဲစစ်ထုတ်ရန်'}
              {selectedDate && <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>({formatDateDisplay(selectedDate)})</span>}
        </button>
            
        <button
              onClick={loadPackages}
          style={{
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
            color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
            cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
                transition: 'all 0.3s ease',
                textShadow: 'none'
              }}
            >
              🔄 {language === 'zh' ? '刷新状态' : language === 'en' ? 'Refresh Status' : 'အခြေအနေမွမ်းမံရန်'}
            </button>
            
            <button
              onClick={() => {
                try {
                  // 添加加载状态，防止页面闪烁
                  const button = document.querySelector('[data-back-button]') as HTMLButtonElement;
                  if (button) {
                    button.style.opacity = '0.7';
                    button.style.pointerEvents = 'none';
                    button.style.transform = 'scale(0.98)';
                  }
                  
                  // 确保页面样式不会丢失
                  const body = document.body;
                  if (body) {
                    body.style.transition = 'background-color 0.3s ease';
                  }
                  
                  // 延迟跳转，确保按钮状态更新
                  setTimeout(() => {
                    navigate('/admin/dashboard', { 
                      replace: true,
                      state: { fromCityPackages: true }
                    });
                  }, 150);
                } catch (error) {
                  console.error('导航错误:', error);
                  // 如果导航失败，恢复按钮状态
                  const button = document.querySelector('[data-back-button]') as HTMLButtonElement;
                  if (button) {
                    button.style.opacity = '1';
                    button.style.pointerEvents = 'auto';
                    button.style.transform = 'scale(1)';
                  }
                }
              }}
              data-back-button
              style={{
                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
                transition: 'all 0.3s ease',
                textShadow: 'none',
                position: 'relative',
                overflow: 'hidden',
                minWidth: '120px',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                if (e.currentTarget.style.pointerEvents !== 'none') {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(231, 76, 60, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (e.currentTarget.style.pointerEvents !== 'none') {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.3)';
                }
              }}
            >
              ← {language === 'zh' ? '返回后台' : language === 'en' ? 'Back to Admin' : 'စီမံခန့်ခွဲမှုသို့ပြန်သွားရန်'}
        </button>
          </div>
        </div>
      </div>

      {/* 包裹列表 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '15px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)',
          position: 'relative',
          zIndex: 1
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
              <p>加载中...</p>
            </div>
          ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {/* 过滤状态提示 */}
            {(selectedStatus || selectedDate) && (
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '15px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ color: 'white', fontSize: '0.9rem' }}>
                    <span style={{ opacity: 0.8 }}>当前筛选: </span>
                    {selectedStatus && selectedStatus !== 'all' && (
                      <span style={{ 
                        background: getStatusColor(selectedStatus), 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem',
                        marginRight: '8px'
                      }}>
                        {getStatusText(selectedStatus)}
                      </span>
                    )}
                    {selectedDate && (
                      <span style={{ 
                        background: 'rgba(52, 152, 219, 0.3)', 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem'
                      }}>
                        {formatDateDisplay(selectedDate)}
                      </span>
                    )}
                    <span style={{ opacity: 0.8, marginLeft: '8px' }}>
                      ({getFilteredPackages().length} 个包裹)
                    </span>
                  </div>
                  <button
                    onClick={clearAllFilters}
                    style={{
                      background: 'rgba(231, 76, 60, 0.2)',
                      color: '#e74c3c',
                      border: '1px solid rgba(231, 76, 60, 0.3)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    ✕ 清除筛选
                  </button>
                </div>
              </div>
            )}
            
            {getFilteredPackages().length === 0 ? (
                <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                <p>{
                  selectedStatus || selectedDate 
                    ? `没有找到符合条件的包裹` 
                    : '暂无包裹数据'
                }</p>
                {(selectedStatus || selectedDate) && (
                  <button
                    onClick={clearAllFilters}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginTop: '10px'
                    }}
                  >
                    清除所有筛选
                  </button>
                )}
                </div>
              ) : (
              getFilteredPackages().map((pkg) => (
              <div key={pkg.id} style={{
                background: batchMode && selectedPackages.has(pkg.id) 
                  ? 'rgba(155, 89, 182, 0.3)' 
                  : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px',
                border: batchMode && selectedPackages.has(pkg.id)
                  ? '2px solid rgba(155, 89, 182, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease'
              }}>
                {/* 第一行：包裹信息和状态 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                    marginBottom: '6px'
                }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {batchMode && (
                      <input
                        type="checkbox"
                        checked={selectedPackages.has(pkg.id)}
                        onChange={() => togglePackageSelection(pkg.id)}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          marginTop: '2px',
                          accentColor: '#9b59b6'
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: 'white', margin: '0 0 2px 0', fontSize: '0.95rem' }}>
                      {pkg.id} - {pkg.package_type}
                    </h3>
                      <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.75rem' }}>
                      创建时间: {pkg.create_time}
                    </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{
                      background: getStatusColor(pkg.status === '待收款' ? '待取件' : pkg.status),
                      color: 'white',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {pkg.status === '待收款' ? '待取件' : getStatusText(pkg.status)}
                    </div>
                    {/* 支付方式标识（在待取件或待收款状态时显示） */}
                    {(pkg.status === '待取件' || pkg.status === '待收款') && (
                      <>
                        {pkg.payment_method === 'cash' && (
                          <span style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}>
                            💵 现金
                          </span>
                        )}
                        {pkg.payment_method === 'qr' && (
                          <span style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}>
                            📱 二维码
                          </span>
                        )}
                        {!pkg.payment_method && (
                          <span style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}>
                            📱 已支付
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* 第二行：操作按钮 */}
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  marginBottom: '6px'
                }}>
                  {/* 状态操作按钮 */}
                  {pkg.status === '待取件' && (
                    <button
                      onClick={() => updatePackageStatus(pkg.id, '已取件')}
                      style={{
                        background: '#3498db',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {language === 'zh' ? '标记已取件' : language === 'en' ? 'Mark Picked Up' : 'ကောက်ယူပြီး မှတ်သားပါ'}
                    </button>
                  )}
                  {pkg.status === '已取件' && (
                    <button
                      onClick={() => updatePackageStatus(pkg.id, '配送中')}
                      style={{
                        background: '#9b59b6',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {language === 'zh' ? '开始配送' : language === 'en' ? 'Start Delivery' : 'ပို့ဆောင်မှု စတင်ပါ'}
                    </button>
                  )}
                  {pkg.status === '配送中' && (
                    <button
                      onClick={() => updatePackageStatus(pkg.id, '已送达')}
                      style={{
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {language === 'zh' ? '标记已送达' : language === 'en' ? 'Mark Delivered' : 'ပို့ဆောင်ပြီး မှတ်သားပါ'}
                    </button>
                  )}
                  
                  {/* 功能按钮 */}
                  <button
                    onClick={() => showPickupCode(pkg)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      minHeight: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    📱 {language === 'zh' ? '寄件码' : language === 'en' ? 'Pickup Code' : 'ကောက်ယူမည့်ကုဒ်'}
                  </button>
                  
                  <button
                    onClick={() => handleViewDetail(pkg)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      minHeight: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    {language === 'zh' ? '查看详情' : language === 'en' ? 'View Details' : 'အသေးစိတ်ကြည့်ရန်'}
                  </button>
                </div>

                {/* 第三行：寄件人和收件人信息 - 横跨整个宽度 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: '8px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <h4 style={{ color: '#C0C0C0', margin: '0 0 2px 0', fontSize: '0.75rem' }}>寄件人</h4>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.8rem' }}>
                      {pkg.sender_name} - {pkg.sender_phone}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#C0C0C0', margin: '0 0 2px 0', fontSize: '0.75rem' }}>收件人</h4>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.8rem' }}>
                      {pkg.receiver_name} - {pkg.receiver_phone}
                    </p>
                  </div>
                </div>
              </div>
                ))
              )}
            </div>
          )}
        </div>

      {/* 寄件码模态框 */}
      {showPickupCodeModal && selectedPackageForPickup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: isMobile ? '12px' : '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
          borderRadius: '15px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>
                📱 {language === 'zh' ? '寄件码' : language === 'en' ? 'Pickup Code' : 'ကောက်ယူမည့်ကုဒ်'}
          </h2>
              <button
                onClick={closePickupCodeModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
              >
                ✕ {language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်ရန်'}
              </button>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: isMobile ? '12px' : '20px',
              borderRadius: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '1.1rem' }}>
                📦 包裹信息
              </h3>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', marginBottom: '15px' }}>
                <p style={{ margin: '5px 0' }}><strong>包裹编号:</strong> {selectedPackageForPickup.id}</p>
                <p style={{ margin: '5px 0' }}><strong>包裹类型:</strong> {selectedPackageForPickup.package_type}</p>
                <p style={{ margin: '5px 0' }}><strong>寄件人:</strong> {selectedPackageForPickup.sender_name}</p>
                <p style={{ margin: '5px 0' }}><strong>收件人:</strong> {selectedPackageForPickup.receiver_name}</p>
              </div>
              
              <div style={{
                background: 'white',
                padding: '25px',
                borderRadius: '15px',
                marginBottom: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0, 0, 0, 0.1)',
                  color: '#666',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: '500'
                }}>
                  {selectedPackageForPickup?.id}
                </div>
                
                {qrCodeDataUrl ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <img 
                      src={qrCodeDataUrl} 
                      alt="寄件码二维码" 
                  style={{
                        width: '220px',
                        height: '220px',
                    borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <p style={{
                      color: '#666',
                      fontSize: '0.8rem',
                      margin: 0,
                      textAlign: 'center'
                    }}>
                      扫描此二维码完成取件
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    width: '220px', 
                    height: '220px', 
                    background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto',
                    borderRadius: '8px',
                    border: '2px dashed #ccc'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: isMobile ? '1.5rem' : '2rem',
                        marginBottom: '10px'
                      }}>⏳</div>
                      <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>生成中...</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '15px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h4 style={{ color: '#A5C7FF', margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                  💡 使用说明
                </h4>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', textAlign: 'left' }}>
                  <p style={{ margin: '5px 0' }}>• 骑手取件时扫描此二维码</p>
                  <p style={{ margin: '5px 0' }}>• 确认包裹信息后完成取件</p>
                  <p style={{ margin: '5px 0' }}>• 二维码包含包裹唯一标识</p>
                  <p style={{ margin: '5px 0' }}>• 请妥善保管，避免泄露</p>
                </div>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                onClick={saveQRCode}
                disabled={!qrCodeDataUrl}
                  style={{
                  background: qrCodeDataUrl ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                    borderRadius: '8px',
                  cursor: qrCodeDataUrl ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: qrCodeDataUrl ? '0 4px 12px rgba(39, 174, 96, 0.3)' : 'none',
                  transition: 'all 0.3s ease',
                  opacity: qrCodeDataUrl ? 1 : 0.6,
                  minWidth: '140px',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(39, 174, 96, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.3)';
                  }
                }}
              >
                💾 保存二维码
              </button>
              
              <button
                onClick={closePickupCodeModal}
                style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  minWidth: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ✕ 退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 查询单号模态框 */}
      {showSearchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
            borderRadius: '15px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '500px',
                    width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>
                🔍 查询包裹单号
              </h2>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResult(null);
                }}
                style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
              >
                ✕ {language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်ရန်'}
              </button>
              </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: isMobile ? '12px' : '20px',
              borderRadius: '15px',
              marginBottom: '20px'
            }}>
              <p style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 15px 0', fontSize: '1rem' }}>
                请输入包裹单号、寄件人姓名、收件人姓名或电话号码
              </p>
              
                <input
                  type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="例如：MDY20251006172107 或 张三 或 13800138000"
                  style={{
                    width: '100%',
                  padding: '12px 16px',
                    borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                  fontSize: '1rem',
                  marginBottom: '15px',
                  outline: 'none'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchPackage();
                  }
                }}
              />
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={searchPackage}
                  disabled={searchLoading}
                  style={{
                    background: searchLoading ? 'rgba(255, 255, 255, 0.3)' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: searchLoading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
                    transition: 'all 0.3s ease',
                    opacity: searchLoading ? 0.7 : 1
                  }}
                >
                  {searchLoading ? '🔍 查询中...' : '🔍 查询包裹'}
                </button>
                
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResult(null);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ရန်'}
                </button>
              </div>
            </div>

            {/* 搜索提示 */}
              <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h4 style={{ color: '#A5C7FF', margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                💡 搜索提示
              </h4>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', textAlign: 'left' }}>
                <p style={{ margin: '5px 0' }}>• 包裹单号：MDY20251006172107</p>
                <p style={{ margin: '5px 0' }}>• 寄件人姓名：张三</p>
                <p style={{ margin: '5px 0' }}>• 收件人姓名：李四</p>
                <p style={{ margin: '5px 0' }}>• 电话号码：13800138000</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 现代化日期筛选模态框 */}
      {showDatePicker && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
            borderRadius: '24px',
            padding: '0',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(49, 130, 206, 0.2)',
            maxWidth: '900px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'hidden',
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* 头部 */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              padding: '24px 32px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #3182ce 0%, #2563eb 100%)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 4px 12px rgba(49, 130, 206, 0.4)'
                }}>
                  📅
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    {language === 'zh' ? '高级筛选' : language === 'en' ? 'Advanced Filter' : 'အဆင့်မြင့်စစ်ထုတ်ရန်'}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                    {language === 'zh' ? '按日期、状态和排序筛选包裹' : language === 'en' ? 'Filter packages by date, status and sort' : 'ရက်စွဲ၊ အခြေအနေနှင့် စီစစ်ရန်'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDatePicker(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                  e.currentTarget.style.transform = 'rotate(90deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'rotate(0deg)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 主体内容 */}
            <div style={{
              padding: '32px',
              maxHeight: 'calc(90vh - 140px)',
              overflow: 'auto'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 左侧：预设日期范围 */}
                <div>
                  <h3 style={{
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px'
                    }}>⚡</span>
                    {language === 'zh' ? '快速选择' : language === 'en' ? 'Quick Select' : 'အမြန်ရွေး'}
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* 全部日期 */}
                    <button
                      onClick={() => {
                        setSelectedDate(null);
                        setSelectedStatus(null);
                      }}
                      style={{
                        background: selectedDate === null ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        border: selectedDate === null ? '2px solid #10b981' : '2px solid rgba(255, 255, 255, 0.15)',
                        padding: '14px 20px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedDate === null ? '600' : '500',
                        transition: 'all 0.3s ease',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: selectedDate === null ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedDate !== null) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedDate !== null) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <span>
                        🗓️ {language === 'zh' ? '全部日期' : language === 'en' ? 'All Dates' : 'ရက်စွဲအားလုံး'}
                      </span>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                      }}>
                        {packages.length}
                      </span>
                    </button>

                    {/* 今天 */}
                    <button
                      onClick={() => {
                        const today = new Date().toLocaleDateString('zh-CN');
                        setSelectedDate(today);
                      }}
                      style={{
                        background: selectedDate === new Date().toLocaleDateString('zh-CN') ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        border: selectedDate === new Date().toLocaleDateString('zh-CN') ? '2px solid #3b82f6' : '2px solid rgba(255, 255, 255, 0.15)',
                        padding: '14px 20px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedDate === new Date().toLocaleDateString('zh-CN') ? '600' : '500',
                        transition: 'all 0.3s ease',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: selectedDate === new Date().toLocaleDateString('zh-CN') ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedDate !== new Date().toLocaleDateString('zh-CN')) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedDate !== new Date().toLocaleDateString('zh-CN')) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <span>
                        ☀️ {language === 'zh' ? '今天' : language === 'en' ? 'Today' : 'ယနေ့'}
                      </span>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                      }}>
                        {packages.filter(pkg => {
                          const dateStr = pkg.created_at || pkg.create_time;
                          if (!dateStr) return false;
                          const pkgDate = new Date(dateStr).toLocaleDateString('zh-CN');
                          return pkgDate === new Date().toLocaleDateString('zh-CN');
                        }).length}
                      </span>
                    </button>

                    {/* 昨天 */}
                    <button
                      onClick={() => {
                        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('zh-CN');
                        setSelectedDate(yesterday);
                      }}
                      style={{
                        background: selectedDate === new Date(Date.now() - 86400000).toLocaleDateString('zh-CN') ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        border: selectedDate === new Date(Date.now() - 86400000).toLocaleDateString('zh-CN') ? '2px solid #8b5cf6' : '2px solid rgba(255, 255, 255, 0.15)',
                        padding: '14px 20px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedDate === new Date(Date.now() - 86400000).toLocaleDateString('zh-CN') ? '600' : '500',
                        transition: 'all 0.3s ease',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: selectedDate === new Date(Date.now() - 86400000).toLocaleDateString('zh-CN') ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedDate !== new Date(Date.now() - 86400000).toLocaleDateString('zh-CN')) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedDate !== new Date(Date.now() - 86400000).toLocaleDateString('zh-CN')) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <span>
                        🌙 {language === 'zh' ? '昨天' : language === 'en' ? 'Yesterday' : 'မနေ့က'}
                      </span>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                      }}>
                        {packages.filter(pkg => {
                          const dateStr = pkg.created_at || pkg.create_time;
                          if (!dateStr) return false;
                          const pkgDate = new Date(dateStr).toLocaleDateString('zh-CN');
                          return pkgDate === new Date(Date.now() - 86400000).toLocaleDateString('zh-CN');
                        }).length}
                      </span>
                    </button>

                    {/* 最近7天 */}
                    <button
                      onClick={() => {
                        // 这里可以实现最近7天的逻辑
                        setSelectedDate('last7days');
                      }}
                      style={{
                        background: selectedDate === 'last7days' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        border: selectedDate === 'last7days' ? '2px solid #f59e0b' : '2px solid rgba(255, 255, 255, 0.15)',
                        padding: '14px 20px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedDate === 'last7days' ? '600' : '500',
                        transition: 'all 0.3s ease',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: selectedDate === 'last7days' ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedDate !== 'last7days') {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedDate !== 'last7days') {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <span>
                        📊 {language === 'zh' ? '最近7天' : language === 'en' ? 'Last 7 Days' : 'ပြီးခဲ့သော ၇ ရက်'}
                      </span>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                      }}>
                        {packages.filter(pkg => {
                          const dateStr = pkg.created_at || pkg.create_time;
                          if (!dateStr) return false;
                          const pkgDate = new Date(dateStr);
                          const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
                          return pkgDate >= sevenDaysAgo;
                        }).length}
                      </span>
                    </button>
                  </div>

                  {/* 状态筛选 */}
                  <h3 style={{
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    marginTop: '24px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px'
                    }}>🎯</span>
                    {language === 'zh' ? '按状态筛选' : language === 'en' ? 'Filter by Status' : 'အခြေအနေအလိုက်'}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { status: null, label: language === 'zh' ? '全部状态' : language === 'en' ? 'All Status' : 'အားလုံး', icon: '📦', color: '#64748b' },
                      { status: '待取件', label: language === 'zh' ? '待取件' : language === 'en' ? 'Pending Pickup' : 'ကောက်ယူရန်', icon: '📮', color: '#f59e0b' },
                      { status: '已取件', label: language === 'zh' ? '已取件' : language === 'en' ? 'Picked Up' : 'ကောက်ယူပြီး', icon: '📬', color: '#3b82f6' },
                      { status: '配送中', label: language === 'zh' ? '配送中' : language === 'en' ? 'In Transit' : 'ပို့ဆောင်နေသည်', icon: '🚚', color: '#8b5cf6' },
                      { status: '已送达', label: language === 'zh' ? '已送达' : language === 'en' ? 'Delivered' : 'ပေးပို့ပြီး', icon: '✅', color: '#10b981' }
                    ].map(({ status, label, icon, color }) => (
                      <button
                        key={status || 'all'}
                        onClick={() => setSelectedStatus(status)}
                        style={{
                          background: selectedStatus === status ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` : 'rgba(255, 255, 255, 0.06)',
                          color: 'white',
                          border: selectedStatus === status ? `2px solid ${color}` : '2px solid rgba(255, 255, 255, 0.1)',
                          padding: '10px 16px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: selectedStatus === status ? '600' : '500',
                          transition: 'all 0.3s ease',
                          textAlign: 'left',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: selectedStatus === status ? `0 4px 12px ${color}40` : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedStatus !== status) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedStatus !== status) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }
                        }}
                      >
                        <span>{icon} {label}</span>
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          {status ? packages.filter(pkg => pkg.status === status).length : packages.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 右侧：所有日期列表 */}
                <div>
                  <h3 style={{
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px'
                    }}>📋</span>
                    {language === 'zh' ? '历史日期' : language === 'en' ? 'Historical Dates' : 'မှတ်တမ်းရက်စွဲများ'}
                  </h3>

                  <div style={{
                    maxHeight: '450px',
                    overflowY: 'auto',
                    paddingRight: '8px'
                  }}>
                    {getAvailableDates().map((date, index) => {
                      const datePackages = packages.filter(pkg => {
                        const dateStr = pkg.created_at || pkg.create_time;
                        if (!dateStr) return false;
                        const pkgDate = new Date(dateStr).toLocaleDateString('zh-CN');
                        return pkgDate === date;
                      });
                      
                      const isSelected = selectedDate === date;
                      
                      return (
                        <button
                          key={date}
                          onClick={() => setSelectedDate(date)}
                          style={{
                            background: isSelected ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' : 'rgba(255, 255, 255, 0.06)',
                            color: 'white',
                            border: isSelected ? '2px solid #06b6d4' : '2px solid rgba(255, 255, 255, 0.1)',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            width: '100%',
                            marginBottom: '8px',
                            transition: 'all 0.3s ease',
                            textAlign: 'left',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: isSelected ? '0 4px 12px rgba(6, 182, 212, 0.3)' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.transform = 'translateX(4px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: '600' }}>
                              📅 {formatDateDisplay(date)}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', opacity: 0.8 }}>
                              <span>📦 {datePackages.length}</span>
                              <span>✅ {datePackages.filter(p => p.status === '已送达').length}</span>
                              <span>🚚 {datePackages.filter(p => p.status === '配送中').length}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <span style={{ fontSize: '1.2rem' }}>✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 底部操作按钮 */}
              <div style={{
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedStatus(null);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  🔄 {language === 'zh' ? '重置筛选' : language === 'en' ? 'Reset Filter' : 'ပြန်လည်သတ်မှတ်'}
                </button>
                <button
                  onClick={() => setShowDatePicker(false)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: '2px solid #10b981',
                    padding: '12px 32px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  ✓ {language === 'zh' ? '应用筛选' : language === 'en' ? 'Apply Filter' : 'သုံးမည်'}
                </button>
              </div>
            </div>
          </div>

          {/* 添加动画样式 */}
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(40px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            
            /* 自定义滚动条 */
            div::-webkit-scrollbar {
              width: 8px;
            }
            
            div::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.05);
              borderRadius: 10px;
            }
            
            div::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.2);
              borderRadius: 10px;
            }
            
            div::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.3);
            }
          `}</style>
        </div>
      )}

      {/* 照片查看模态框 */}
      {showPhotoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
            borderRadius: '15px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>
                🖼️ {language === 'zh' ? '包裹送达图片' : language === 'en' ? 'Delivery Photos' : 'ပို့ဆောင်ပြီးဓာတ်ပုံများ'}
              </h2>
              <button
                onClick={() => setShowPhotoModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
              >
                ✕ {language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်ရန်'}
              </button>
            </div>

            {photoLoading ? (
              <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                <p>正在加载照片...</p>
              </div>
            ) : packagePhotos.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                <p>暂无送达图片</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '10px' }}>
                  骑手送达包裹后拍摄的留底图片将显示在这里
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: isMobile ? '12px' : '20px' }}>
                {packagePhotos.map((photo) => (
                  <div key={photo.id} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '15px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <img 
                      src={photo.url} 
                      alt={`送达图片 ${photo.id}`}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '10px'
                      }}
                    />
                    <div style={{ color: 'white' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>
                        <strong>上传时间:</strong> {photo.timestamp}
                      </p>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>
                        <strong>上传骑手:</strong> {photo.courier}
                      </p>
                      <p style={{ margin: '0', fontSize: '0.9rem' }}>
                        <strong>拍摄位置:</strong> {photo.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 包裹详情模态框 */}
      {showDetailModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
            borderRadius: '15px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>
                📦 包裹详情
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                  onClick={() => findPackagePhotos(selectedPackage.id)}
                style={{
                    background: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)',
                  color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                  cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(230, 126, 34, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 126, 34, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(230, 126, 34, 0.3)';
                  }}
                >
                  🖼️ {language === 'zh' ? '图片' : language === 'en' ? 'Photos' : 'ဓာတ်ပုံများ'}
                </button>
                <button
                  onClick={closeDetailModal}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  ✕ {language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်ရန်'}
              </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: isMobile ? '12px' : '20px' }}>
              {/* 基本信息 */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: isMobile ? '12px' : '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.1rem' }}>
                  📋 基本信息
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>包裹编号:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.id}</span>
              </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>包裹类型:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.package_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>重量:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.weight}kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>状态:</span>
                    <span style={{ 
                      color: 'white', 
                      fontWeight: '500',
                      background: getStatusColor(selectedPackage.status),
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.9rem'
                    }}>
                      {getStatusText(selectedPackage.status)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>创建时间:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.create_time}</span>
                  </div>
                </div>
              </div>

              {/* 寄件人信息 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: isMobile ? '12px' : '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.1rem' }}>
                  📤 寄件人信息
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>姓名:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.sender_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>电话:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.sender_phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>地址:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.sender_address}</span>
                  </div>
              </div>
            </div>

              {/* 收件人信息 */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
              padding: isMobile ? '12px' : '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.1rem' }}>
                  📥 收件人信息
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>姓名:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.receiver_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>电话:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.receiver_phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>地址:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.receiver_address}</span>
                  </div>
              </div>
            </div>

              {/* 配送信息 */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
              padding: isMobile ? '12px' : '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.1rem' }}>
                  🚚 配送信息
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>负责骑手:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.courier || '待分配'}</span>
                  </div>
                  {selectedPackage.pickup_time && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>取件时间:</span>
                      <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.pickup_time}</span>
                    </div>
                  )}
                  {selectedPackage.delivery_time && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>送达时间:</span>
                      <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.delivery_time}</span>
                </div>
              )}
                </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 批量删除确认对话框 */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
            borderRadius: '15px',
            padding: '30px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: 600, color: 'white', textAlign: 'center' }}>
              ⚠️ {language === 'zh' ? '确认删除' : language === 'en' ? 'Confirm Delete' : 'ဖျက်ရန် အတည်ပြုရန်'}
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem', marginBottom: '25px', textAlign: 'center', lineHeight: '1.6' }}>
              {language === 'zh' 
                ? `确定要删除选中的 ${selectedPackages.size} 个包裹吗？此操作不可恢复。`
                : language === 'en'
                ? `Are you sure you want to delete ${selectedPackages.size} selected packages? This action cannot be undone.`
                : `ရွေးချယ်ထားသော ပက်ကေ့ဂျ် ${selectedPackages.size} ခုကို ဖျက်ရန် သေချာပါသလား? ဤလုပ်ဆောင်ချက်ကို ပြန်လည်ရယူ၍မရပါ။`}
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  opacity: deleting ? 0.5 : 1
                }}
              >
                {language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ဖျက်သိမ်းရန်'}
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={deleting}
                style={{
                  background: deleting 
                    ? 'rgba(231, 76, 60, 0.5)' 
                    : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  boxShadow: deleting ? 'none' : '0 4px 12px rgba(231, 76, 60, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                {deleting 
                  ? (language === 'zh' ? '删除中...' : language === 'en' ? 'Deleting...' : 'ဖျက်နေသည်...')
                  : (language === 'zh' ? '确认删除' : language === 'en' ? 'Confirm Delete' : 'ဖျက်ရန် အတည်ပြုရန်')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityPackages;
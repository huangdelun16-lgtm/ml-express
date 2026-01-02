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
  
  // 获取当前用户角色和区域信息
  const currentUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '';
  const currentUserRole = sessionStorage.getItem('currentUserRole') || localStorage.getItem('currentUserRole') || '';
  const currentUserRegion = sessionStorage.getItem('currentUserRegion') || localStorage.getItem('currentUserRegion') || '';
  
  // 领区识别逻辑更新：确保 MDY 和 POL 彻底分开
  const getDetectedRegion = () => {
    const userUpper = currentUser.toUpperCase();
    if (currentUserRegion === 'yangon' || userUpper.startsWith('YGN')) return 'YGN';
    if (currentUserRegion === 'maymyo' || userUpper.startsWith('POL')) return 'POL';
    if (currentUserRegion === 'mandalay' || userUpper.startsWith('MDY')) return 'MDY';
    return '';
  };

  const currentRegionPrefix = getDetectedRegion();
  // 系统管理员角色不开启领区过滤，其他角色如果有领区前缀则强制开启
  const isRegionalUser = currentUserRole !== 'admin' && currentRegionPrefix !== '';

  const [activeTab, setActiveTab] = useState<'list' | 'map' | 'kanban'>('list');
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [deliveryStores, setDeliveryStores] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]); // 🚀 新增：存储骑手列表
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
  
  // 审计日志状态
  const [packageLogs, setPackageLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // 状态过滤功能状态
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // 寄件码功能状态
  const [selectedPackageForPickup, setSelectedPackageForPickup] = useState<Package | null>(null);
  
  // 批量删除功能状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // 分页功能状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    loadDeliveryStores();
    loadCouriers(); // 🚀 新增：加载骑手数据
    
    // 设置定时刷新，每30秒刷新一次包裹状态
    const refreshInterval = setInterval(() => {
      loadPackages();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const loadDeliveryStores = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('id, store_name, store_code');
      if (error) throw error;
      setDeliveryStores(data || []);
    } catch (error) {
      console.error('加载店铺列表失败:', error);
    }
  };

  const loadCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      console.error('加载骑手列表失败:', error);
    }
  };

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
    let displayPackages = [...packages];
    
    // 统计也需要根据领区过滤
    if (isRegionalUser) {
      displayPackages = displayPackages.filter(pkg => pkg.id.startsWith(currentRegionPrefix));
    }

    const total = displayPackages.length;
    const pending = displayPackages.filter(p => p.status === '待取件').length;
    const pickedUp = displayPackages.filter(p => p.status === '已取件').length;
    const delivering = displayPackages.filter(p => p.status === '配送中' || p.status === '配送进行中').length;
    const delivered = displayPackages.filter(p => p.status === '已送达').length;
    const cancelled = displayPackages.filter(p => p.status === '已取消').length;

    return {
      total,
      pending,
      pickedUp,
      delivering,
      delivered,
      cancelled
    };
  };

  // 获取当前账号可见的基础包裹列表（已应用领区过滤）
  const getBaseRegionalPackages = () => {
    if (!isRegionalUser) return packages;
    return packages.filter(pkg => pkg.id.startsWith(currentRegionPrefix));
  };

  // 按日期和状态过滤包裹（返回最终显示用的过滤列表）
  const getFilteredPackages = () => {
    let filteredPackages = getBaseRegionalPackages();
    
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

  // 获取分页后的包裹列表
  const getPaginatedPackages = () => {
    const filteredPackages = getFilteredPackages();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPackages.slice(startIndex, endIndex);
  };

  // 计算总页数
  const getTotalPages = () => {
    const filteredPackages = getFilteredPackages();
    return Math.ceil(filteredPackages.length / itemsPerPage);
  };

  // 处理页码变化
  useEffect(() => {
    const totalPages = getTotalPages();
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [packages, selectedStatus, selectedDate, itemsPerPage]);

  // 处理过滤变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedDate]);

  // 获取可用日期列表
  const getAvailableDates = () => {
    const dates = new Set<string>();
    const visiblePackages = getBaseRegionalPackages();
    visiblePackages.forEach(pkg => {
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
  // 触发重新部署
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
          : 'ပက်ကေ့ဂျ် ' + result.success + ' ခု ဖျက်ပြီးပါပြီ');
      } else {
        alert(language === 'zh' 
          ? `删除完成：成功 ${result.success} 个，失败 ${result.failed} 个` 
          : language === 'en' 
          ? `Delete completed: ${result.success} succeeded, ${result.failed} failed`
          : 'ဖျက်ပြီး: ' + result.success + ' ခု အောင်မြင်, ' + result.failed + ' ခု မအောင်မြင်');
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
      // 在当前【可见】包裹列表中搜索
      const visiblePackages = getBaseRegionalPackages();
      const foundPackage = visiblePackages.find(pkg => 
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
        alert(isRegionalUser 
          ? `在本领区 (${currentRegionPrefix}) 未找到相关包裹` 
          : '未找到相关包裹，请检查单号是否正确');
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
    fetchPackageLogs(pkg.id); // 🚀 新增：获取包裹操作日志
  };

  const fetchPackageLogs = async (packageId: string) => {
    try {
      setLogsLoading(true);
      const logs = await auditLogService.getLogsByTargetId(packageId);
      setPackageLogs(logs || []);
    } catch (error) {
      console.error('获取包裹日志失败:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPackage(null);
  };

  // --- 🚀 看板拖拽逻辑 ---
  const [draggedPackageId, setDraggedPackageId] = useState<string | null>(null);

  const handleDragStart = (packageId: string) => {
    setDraggedPackageId(packageId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 必须调用，否则无法触发 drop
  };

  const handleDrop = async (newStatus: string) => {
    if (!draggedPackageId) return;
    
    const pkg = packages.find(p => p.id === draggedPackageId);
    if (pkg && pkg.status !== newStatus) {
      console.log(`🚚 拖拽更新状态: ${draggedPackageId} -> ${newStatus}`);
      await updatePackageStatus(draggedPackageId, newStatus);
    }
    
    setDraggedPackageId(null);
  };

  const handleCourierAssign = async (packageId: string, courierName: string) => {
    const success = await packageService.updatePackageStatus(packageId, undefined as any, undefined, undefined, courierName);
    if (success) {
      // 记录审计日志
      const currentUserAccount = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'unknown';
      const currentUserNameStr = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName') || '未知用户';
      
      await auditLogService.log({
        user_id: currentUserAccount,
        user_name: currentUserNameStr,
        action_type: 'update',
        module: 'packages',
        target_id: packageId,
        target_name: `包裹 ${packageId}`,
        action_description: `看板分配骑手为：${courierName}`,
        new_value: JSON.stringify({ courier: courierName })
      });
      
      loadPackages();
    }
  };

  // 渲染看板列
  const renderKanbanColumn = (title: string, status: string, color: string) => {
    const columnPackages = getFilteredPackages().filter(p => {
      if (status === '配送中') return p.status === '配送中' || p.status === '配送进行中';
      return p.status === status;
    });

    return (
      <div 
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(status)}
        style={{
          flex: 1,
          minWidth: '300px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '15px',
          padding: '15px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxHeight: '75vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }}></span>
            {title} ({columnPackages.length})
          </h3>
        </div>

        {columnPackages.map(pkg => (
          <div
            key={pkg.id}
            draggable
            onDragStart={() => handleDragStart(pkg.id)}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '18px',
              cursor: 'grab',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
            }}
          >
            {/* 顶部标签栏 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ 
                fontWeight: 'bold', 
                color: '#90cdf4', 
                fontSize: '0.95rem',
                fontFamily: 'monospace',
                background: 'rgba(144, 205, 244, 0.15)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {pkg.id}
              </span>
              <span style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {pkg.package_type}
              </span>
            </div>

            {/* 物流路线 */}
            <div style={{ marginBottom: '15px', position: 'relative', paddingLeft: '15px' }}>
              {/* 装饰连线 */}
              <div style={{ 
                position: 'absolute', 
                left: '4px', 
                top: '10px', 
                bottom: '10px', 
                width: '2px', 
                background: 'rgba(255, 255, 255, 0.1)',
                borderLeft: '1px dashed rgba(255, 255, 255, 0.3)'
              }}></div>
              
              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>●</span>
                <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>{pkg.sender_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: '#f87171' }}>●</span>
                <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>{pkg.receiver_name}</span>
              </div>
            </div>

            <div style={{ 
              fontSize: '0.85rem', 
              color: 'rgba(255, 255, 255, 0.7)', 
              marginBottom: '15px',
              padding: '8px 12px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '10px',
              lineHeight: '1.4'
            }}>
              <span style={{ marginRight: '5px' }}>📍</span>
              {pkg.receiver_address}
            </div>
            
            {/* 底部操作区 */}
            <div style={{ 
              borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
              paddingTop: '15px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: pkg.courier && pkg.courier !== '待分配' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem'
                }}>🛵</div>
                <select
                  value={pkg.courier || '待分配'}
                  onChange={(e) => handleCourierAssign(pkg.id, e.target.value)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.85rem',
                    padding: '6px 10px',
                    flex: 1,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="待分配" style={{ background: '#2c5282' }}>待分配</option>
                  {couriers.map(c => (
                    <option key={c.id} value={c.name} style={{ background: '#2c5282' }}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => handleViewDetail(pkg)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#90cdf4',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '8px',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(144, 205, 244, 0.2)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#90cdf4';
                }}
              >
                查看详细信息
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderKanbanBoard = () => {
    return (
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        overflowX: 'auto', 
        padding: '10px 0',
        minHeight: '70vh'
      }}>
        {renderKanbanColumn('待取件', '待取件', '#f39c12')}
        {renderKanbanColumn('已取件', '已取件', '#3498db')}
        {renderKanbanColumn('配送中', '配送中', '#9b59b6')}
        {renderKanbanColumn('已送达', '已送达', '#27ae60')}
        {renderKanbanColumn('已取消', '已取消', '#e74c3c')}
      </div>
    );
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
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {language === 'zh' ? '同城订单管理' : language === 'en' ? 'City Order Management' : 'မြို့တွင်းအော်ဒါစီမံခန့်ခွဲမှု'}
            {isRegionalUser && (
              <span style={{ 
                background: '#48bb78', 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: '8px', 
                fontSize: '0.9rem',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                📍 {currentRegionPrefix}
              </span>
            )}
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
            {/* 🚀 模式切换按钮 */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', marginRight: '10px' }}>
              <button
                onClick={() => setActiveTab('list')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'list' ? '#3b82f6' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
              >
                📊 列表
              </button>
              <button
                onClick={() => setActiveTab('kanban')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'kanban' ? '#3b82f6' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
              >
                📋 看板
              </button>
            </div>

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
                  🗑️ {language === 'zh' ? `批量删除 (${selectedPackages.size})` : language === 'en' ? `Batch Delete (${selectedPackages.size})` : 'ဖျက်ရန် (' + selectedPackages.size + ')'}
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
          ) : activeTab === 'kanban' ? (
            /* 🚀 看板视图渲染 */
            renderKanbanBoard()
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
              <>
              {getPaginatedPackages().map((pkg) => (
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
                    
                    {/* 代收款显示 */}
                    {(() => {
                      // 检查是否为合伙店铺 (ID匹配 或 名称匹配)
                      const isStoreMatch = deliveryStores.some(store => 
                        store.store_name === pkg.sender_name || 
                        (pkg.sender_name && pkg.sender_name.startsWith(store.store_name))
                      );
                      const isPartnerOrder = !!pkg.delivery_store_id || isStoreMatch;
                      const codAmount = Number(pkg.cod_amount || 0);
                      
                      if (isPartnerOrder) {
                        return (
                          <span style={{
                            background: '#fcd34d', // Amber-300
                            color: '#b45309',     // Amber-700
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            marginLeft: '0.5rem',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                          }}>
                            💰 {language === 'zh' ? '代收' : 'COD'}: {codAmount > 0 ? `${codAmount} MMK` : (language === 'zh' ? '无' : 'None')}
                          </span>
                        );
                      } else if (codAmount > 0) {
                        // 非 Partner 但有金额，仍需显示以防遗漏
                        return (
                          <span style={{
                            background: '#fcd34d',
                            color: '#b45309',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            marginLeft: '0.5rem',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                          }}>
                            💰 {language === 'zh' ? '代收' : 'COD'}: {codAmount} MMK
                          </span>
                        );
                      }
                      return null;
                    })()}
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
                    <h4 style={{ color: '#ffffff', margin: '0 0 2px 0', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                      寄件人
                      {(() => {
                        let userType = language === 'zh' ? '普通账户' : language === 'en' ? 'Normal' : 'သာမန်';
                        let styleProps: any = {
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        };

                        // 检查是否为合伙店铺 (ID匹配 或 名称匹配)
                        const isStoreMatch = deliveryStores.some(store => 
                          store.store_name === pkg.sender_name || 
                          (pkg.sender_name && pkg.sender_name.startsWith(store.store_name))
                        );

                        if (pkg.delivery_store_id || isStoreMatch) {
                          userType = 'Partner';
                          styleProps = {
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)'
                          };
                        } else if (pkg.customer_email || pkg.customer_name) {
                          userType = language === 'zh' ? 'VIP 会员' : language === 'en' ? 'VIP Member' : 'VIP အဖွဲ့ဝင်';
                          styleProps = {
                            background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)'
                          };
                        }

                        return (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle',
                            textShadow: styleProps.color === 'white' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                            ...styleProps
                          }}>
                            {userType}
                          </span>
                        );
                      })()}
                    </h4>
                    <p style={{ color: '#ffffff', margin: 0, fontSize: '0.8rem', fontWeight: '500' }}>
                      {pkg.sender_name} - {pkg.sender_phone}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#ffffff', margin: '0 0 2px 0', fontSize: '0.75rem', fontWeight: '600' }}>收件人</h4>
                    <p style={{ color: '#ffffff', margin: 0, fontSize: '0.8rem', fontWeight: '500' }}>
                      {pkg.receiver_name} - {pkg.receiver_phone}
                    </p>
                  </div>
                </div>
              </div>
                ))}
              
              {/* 分页控件 */}
              {getFilteredPackages().length > itemsPerPage && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  padding: '15px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  {/* 左侧：每页显示数量选择 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'white',
                    fontSize: '0.85rem'
                  }}>
                    <span>{language === 'zh' ? '每页显示' : language === 'en' ? 'Items per page' : 'စာမျက်နှာတစ်ခုတွင်'}:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value={5} style={{ background: '#2c5282', color: 'white' }}>5</option>
                      <option value={10} style={{ background: '#2c5282', color: 'white' }}>10</option>
                      <option value={20} style={{ background: '#2c5282', color: 'white' }}>20</option>
                      <option value={50} style={{ background: '#2c5282', color: 'white' }}>50</option>
                    </select>
                  </div>

                  {/* 中间：页码信息 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'white',
                    fontSize: '0.85rem'
                  }}>
                    <span>
                      {language === 'zh' 
                        ? `第 ${currentPage} / ${getTotalPages()} 页，共 ${getFilteredPackages().length} 条`
                        : language === 'en'
                        ? `Page ${currentPage} / ${getTotalPages()}, Total ${getFilteredPackages().length} items`
                        : 'စာမျက်နှာ ' + currentPage + ' / ' + getTotalPages() + '၊ စုစုပေါင်း ' + getFilteredPackages().length + ' ခု'
                      }
                    </span>
                  </div>

                  {/* 右侧：分页按钮 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      style={{
                        background: currentPage === 1 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        opacity: currentPage === 1 ? 0.5 : 1,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }
                      }}
                    >
                      {language === 'zh' ? '« 首页' : language === 'en' ? '« First' : '« ပထမဆုံး'}
                    </button>
                    
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      style={{
                        background: currentPage === 1 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        opacity: currentPage === 1 ? 0.5 : 1,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }
                      }}
                    >
                      {language === 'zh' ? '‹ 上一页' : language === 'en' ? '‹ Prev' : '‹ ရှေ့သို့'}
                    </button>

                    {/* 页码显示（最多显示5个页码） */}
                    {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                      let pageNum: number;
                      if (getTotalPages() <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= getTotalPages() - 2) {
                        pageNum = getTotalPages() - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          style={{
                            background: currentPage === pageNum
                              ? 'rgba(52, 152, 219, 0.5)'
                              : 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            border: currentPage === pageNum
                              ? '1px solid rgba(52, 152, 219, 0.8)'
                              : '1px solid rgba(255, 255, 255, 0.3)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            minWidth: '36px',
                            transition: 'all 0.3s ease',
                            fontWeight: currentPage === pageNum ? 'bold' : 'normal'
                          }}
                          onMouseOver={(e) => {
                            if (currentPage !== pageNum) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (currentPage !== pageNum) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            }
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                      disabled={currentPage === getTotalPages()}
                      style={{
                        background: currentPage === getTotalPages()
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: currentPage === getTotalPages() ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        opacity: currentPage === getTotalPages() ? 0.5 : 1,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (currentPage !== getTotalPages()) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== getTotalPages()) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }
                      }}
                    >
                      {language === 'zh' ? '下一页 ›' : language === 'en' ? 'Next ›' : 'နောက်သို့ ›'}
                    </button>
                    
                    <button
                      onClick={() => setCurrentPage(getTotalPages())}
                      disabled={currentPage === getTotalPages()}
                      style={{
                        background: currentPage === getTotalPages()
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: currentPage === getTotalPages() ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        opacity: currentPage === getTotalPages() ? 0.5 : 1,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (currentPage !== getTotalPages()) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== getTotalPages()) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }
                      }}
                    >
                      {language === 'zh' ? '末页 »' : language === 'en' ? 'Last »' : 'နောက်ဆုံး »'}
                    </button>
                  </div>
                </div>
              )}
              </>
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr', gap: '32px' }}>
                {/* 左侧：快速选择 */}
                <div>
                  <h3 style={{
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                        padding: '16px 24px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedDate === null ? '600' : '500',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: selectedDate === null ? '0 8px 20px rgba(16, 185, 129, 0.3)' : 'none'
                      }}
                    >
                      <span>📦 {language === 'zh' ? '全部订单' : language === 'en' ? 'All Orders' : 'အမှာစာအားလုံး'}</span>
                      <span style={{ opacity: 0.7 }}>{getBaseRegionalPackages().length}</span>
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
                        padding: '16px 24px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedDate === new Date().toLocaleDateString('zh-CN') ? '600' : '500',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: selectedDate === new Date().toLocaleDateString('zh-CN') ? '0 8px 20px rgba(59, 130, 246, 0.3)' : 'none'
                      }}
                    >
                      <span>☀️ {language === 'zh' ? '今天' : language === 'en' ? 'Today' : 'ယနေ့'}</span>
                      <span style={{ opacity: 0.7 }}>
                        {getBaseRegionalPackages().filter(pkg => {
                          const dateStr = pkg.created_at || pkg.create_time;
                          return dateStr && new Date(dateStr).toLocaleDateString('zh-CN') === new Date().toLocaleDateString('zh-CN');
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
                        padding: '16px 24px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedDate === new Date(Date.now() - 86400000).toLocaleDateString('zh-CN') ? '600' : '500',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: selectedDate === new Date(Date.now() - 86400000).toLocaleDateString('zh-CN') ? '0 8px 20px rgba(139, 92, 246, 0.3)' : 'none'
                      }}
                    >
                      <span>🌙 {language === 'zh' ? '昨天' : language === 'en' ? 'Yesterday' : 'မနေ့က'}</span>
                      <span style={{ opacity: 0.7 }}>
                        {getBaseRegionalPackages().filter(pkg => {
                          const dateStr = pkg.created_at || pkg.create_time;
                          return dateStr && new Date(dateStr).toLocaleDateString('zh-CN') === new Date(Date.now() - 86400000).toLocaleDateString('zh-CN');
                        }).length}
                      </span>
                    </button>
                  </div>

                  <div style={{
                    marginTop: '32px',
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
                      💡 {language === 'zh' ? '小提示：主页面已经提供了“状态筛选”，您可以直接在主页点击状态图标进行快速切换。' : 'Tip: Status filters are available on the main page for quick access.'}
                    </p>
                  </div>
                </div>

                {/* 右侧：历史日期列表 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{
                      color: 'white',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      margin: 0,
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
                      }}>📅</span>
                      {language === 'zh' ? '历史日期查询' : language === 'en' ? 'Historical Dates' : 'မှတ်တမ်းရက်စွဲများ'}
                    </h3>
                    
                    {/* 日期搜索微调 */}
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text"
                        placeholder={language === 'zh' ? '搜索日期...' : 'Search...'}
                        onChange={(e) => {
                          const term = e.target.value;
                          const elements = document.querySelectorAll('[data-date-btn]');
                          elements.forEach((el: any) => {
                            if (el.getAttribute('data-date-btn').includes(term)) {
                              el.style.display = 'flex';
                            } else {
                              el.style.display = 'none';
                            }
                          });
                        }}
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          color: 'white',
                          fontSize: '0.85rem',
                          outline: 'none',
                          width: '120px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    paddingRight: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '12px'
                  }}>
                    {getAvailableDates().map((date) => {
                      const datePackages = getBaseRegionalPackages().filter(pkg => {
                        const dateStr = pkg.created_at || pkg.create_time;
                        return dateStr && new Date(dateStr).toLocaleDateString('zh-CN') === date;
                      });
                      
                      const isSelected = selectedDate === date;
                      
                      return (
                        <button
                          key={date}
                          data-date-btn={date}
                          onClick={() => setSelectedDate(date)}
                          style={{
                            background: isSelected ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' : 'rgba(255, 255, 255, 0.06)',
                            color: 'white',
                            border: isSelected ? '2px solid #06b6d4' : '2px solid rgba(255, 255, 255, 0.1)',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: isSelected ? '0 4px 12px rgba(6, 182, 212, 0.3)' : 'none'
                          }}
                        >
                          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '4px' }}>
                            {formatDateDisplay(date)}
                          </div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            width: '100%'
                          }}>
                            <span>📦 {datePackages.length} {language === 'zh' ? '单' : 'Orders'}</span>
                            {isSelected && <span>✓</span>}
                          </div>
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
                  {selectedPackage.cod_amount && Number(selectedPackage.cod_amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#fcd34d', fontWeight: '500' }}>代收款 (COD):</span>
                      <span style={{ color: '#fcd34d', fontWeight: 'bold' }}>{selectedPackage.cod_amount} MMK</span>
                    </div>
                  )}
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

              {/* 📜 操作痕迹追踪 (Timeline) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: isMobile ? '12px' : '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📜 {language === 'zh' ? '操作痕迹追踪' : language === 'en' ? 'Audit Trail' : 'လုပ်ဆောင်ချက်မှတ်တမ်း'}
                  {logsLoading && <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({language === 'zh' ? '加载中...' : 'Loading...'})</span>}
                </h3>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0', 
                  position: 'relative',
                  paddingLeft: '20px',
                  borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                  marginLeft: '10px'
                }}>
                  {packageLogs.length === 0 && !logsLoading ? (
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>
                      {language === 'zh' ? '暂无详细操作记录' : language === 'en' ? 'No audit logs found' : 'မှတ်တမ်းများမရှိပါ'}
                    </p>
                  ) : (
                    packageLogs.map((log, index) => (
                      <div key={log.id || index} style={{ position: 'relative', marginBottom: '20px' }}>
                        {/* 时间轴圆点 */}
                        <div style={{
                          position: 'absolute',
                          left: '-27px',
                          top: '4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: index === packageLogs.length - 1 ? '#48bb78' : 'rgba(255, 255, 255, 0.3)',
                          border: '3px solid rgba(0, 0, 0, 0.2)',
                          zIndex: 2
                        }}></div>
                        
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                          {new Date(log.action_time || log.created_at || Date.now()).toLocaleString('zh-CN', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            month: '2-digit', 
                            day: '2-digit' 
                          })}
                        </div>
                        <div style={{ 
                          fontSize: '0.95rem', 
                          color: 'white', 
                          fontWeight: 500,
                          lineHeight: '1.4'
                        }}>
                          <span style={{ color: '#90cdf4', marginRight: '8px' }}>{log.user_name}</span>
                          {log.action_description}
                        </div>
                      </div>
                    ))
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
                : 'ရွေးချယ်ထားသော ပက်ကေ့ဂျ် ' + selectedPackages.size + ' ခုကို ဖျက်ရန် သေချာပါသလား? ဤလုပ်ဆောင်ချက်ကို ပြန်လည်ရယူ၍မရပါ။'}
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
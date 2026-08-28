import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { packageService, Package, supabase, auditLogService, deliveryPhotoService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import QRCode from 'qrcode';
import { SkeletonCard } from '../components/SkeletonLoader';
import { useResponsive } from '../hooks/useResponsive';
import SecurityVerificationModal from '../components/SecurityVerificationModal';
import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import '../styles/adminCityPackages.css';
import { feedbackService } from '../services/FeedbackService';

const toLocalYMD = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const CityPackages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const todayYmd = toLocalYMD();
  const yesterdayYmd = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalYMD(d);
  })();

  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    pickedUp: 0,
    delivering: 0,
    delivered: 0,
    cancelled: 0,
  });
  const loadRequestIdRef = useRef(0);
  const [deliveryStores, setDeliveryStores] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]); // 🚀 新增：存储骑手列表
  const [courierDetail, setCourierDetail] = useState<any>(null);
  const [courierLoading, setCourierLoading] = useState(false);
  
  // 新增状态管理
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // 新增功能状态
  const [showDatePicker, setShowDatePicker] = useState(false);
  /** 本地日历日 YYYY-MM-DD；空表示不按日筛 */
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [packagePhotos, setPackagePhotos] = useState<any[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
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
  const [showVerificationModal, setShowVerificationModal] = useState(false); // 🚀 新增：安全验证弹窗
  
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

  // 店铺/骑手一次加载；包裹列表按筛选服务端分页
  useEffect(() => {
    loadDeliveryStores();
    loadCouriers();
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

  const loadPackages = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const requestId = ++loadRequestIdRef.current;
    try {
      if (!silent) setLoading(true);
      const regionPrefix = isRegionalUser ? currentRegionPrefix : undefined;
      const [list, counts] = await Promise.all([
        packageService.listCityPackagesPage({
          page: currentPage,
          pageSize: itemsPerPage,
          status: selectedStatus,
          search: debouncedSearch,
          dateYmd: selectedDate,
          regionPrefix,
        }),
        packageService.getCityPackageStatusCounts(regionPrefix),
      ]);
      if (requestId !== loadRequestIdRef.current) return;
      setPackages(list.data);
      setFilteredTotal(list.total);
      setStats(counts);
      const pages = Math.ceil(list.total / itemsPerPage);
      if (pages > 0 && currentPage > pages) {
        setCurrentPage(pages);
      }
    } catch (error) {
      console.error('加载包裹数据失败:', error);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    currentPage,
    itemsPerPage,
    selectedStatus,
    selectedDate,
    debouncedSearch,
    isRegionalUser,
    currentRegionPrefix,
  ]);

  useEffect(() => {
    const delay = listSearchQuery.trim() ? 350 : 0;
    const timer = window.setTimeout(() => setDebouncedSearch(listSearchQuery), delay);
    return () => window.clearTimeout(timer);
  }, [listSearchQuery]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      void loadPackages({ silent: true });
    }, 30000);
    return () => window.clearInterval(refreshInterval);
  }, [loadPackages]);

  /** 全局搜索带 ?q= 时按单号/电话查一条并打开详情（不扫全表） */
  useEffect(() => {
    const q = searchParams.get('q')?.trim();
    if (!q) return;
    let cancelled = false;
    void (async () => {
      const match = await packageService.findCityPackageByQuery(
        q,
        isRegionalUser ? currentRegionPrefix : undefined,
      );
      if (cancelled || !match) return;
      setSelectedPackage(match);
      setShowDetailModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete('q');
      setSearchParams(next, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, isRegionalUser, currentRegionPrefix]);

  /** URL ?status= 或从其它页面带入 search */
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setSelectedStatus(status);
    }
    const q = searchParams.get('q');
    if (q) setListSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const state = location.state as { search?: string } | null;
    if (state?.search) {
      setListSearchQuery(state.search);
      setCurrentPage(1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const getTotalPages = () => Math.ceil(filteredTotal / itemsPerPage) || 0;

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T00:00:00` : dateStr);
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
    setCurrentPage(1);
    if (selectedStatus === status) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(status);
    }
  };

  const clearAllFilters = () => {
    setSelectedStatus(null);
    setSelectedDate(null);
    setListSearchQuery('');
    setCurrentPage(1);
  };

  const chipClass = (key: string, tone: string) => {
    const active =
      key === 'all' ? !selectedStatus || selectedStatus === 'all' : selectedStatus === key;
    return `cpkg-chip cpkg-chip--${tone}${active ? ' cpkg-chip--active' : ''}`;
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
    if (packages.length > 0 && selectedPackages.size === packages.length) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(packages.map((pkg) => pkg.id)));
    }
  };

  // 批量删除包裹
  const handleBatchDelete = async () => {
    if (selectedPackages.size === 0) {
      feedbackService.notify(language === 'zh' ? '请先选择要删除的包裹' : language === 'en' ? 'Please select packages to delete' : 'ဖျက်ရန်ပက်ကေ့ဂျ်များကို ရွေးချယ်ပါ');
      return;
    }

    // 🚀 安全优化：批量删除时需要二次验证
    setShowVerificationModal(true);
  };

  // 触发删除确认（验证成功后调用）
  const triggerDeleteConfirm = () => {
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
        feedbackService.notify(language === 'zh' 
          ? `成功删除 ${result.success} 个包裹` 
          : language === 'en' 
          ? `Successfully deleted ${result.success} packages`
          : 'ပက်ကေ့ဂျ် ' + result.success + ' ခု ဖျက်ပြီးပါပြီ');
      } else {
        feedbackService.notify(language === 'zh' 
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
      feedbackService.notify(language === 'zh' ? '批量删除失败，请重试' : language === 'en' ? 'Batch delete failed, please try again' : 'ဖျက်ရန် မအောင်မြင်၊ ထပ်စမ်းကြည့်ပါ');
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

  const updatePackageStatus = async (id: string, newStatus: string) => {
    const success = await packageService.updatePackageStatus(id, newStatus);
    if (success) {
      await loadPackages();
      notifyAdminTodosRefresh();
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
      case '待确认': return '待接单'; // 🚀 统一状态显示
      case '待取件': return '待取件';
      case '已取件': return '已取件';
      case '配送中': return '配送中';
      case '已送达': return '已送达';
      case '已取消': return '已取消';
      default: return status;
    }
  };

  // 🚀 获取下单人身份 (识别 商家/VIP/普通会员)
  const getOrdererType = (description: string = '') => {
    if (
      description.includes('[下单身份: 商家]') || 
      description.includes('[Orderer: MERCHANTS]') ||
      description.includes('[အော်ဒါတင်သူ: MERCHANTS]')
    ) {
      return 'MERCHANTS';
    }
    if (
      description.includes('[下单身份: VIP]') || 
      description.includes('[Orderer: VIP]') ||
      description.includes('[အော်ဒါတင်သူ: VIP]')
    ) {
      return 'VIP';
    }
    return 'Member';
  };

  // 🚀 从描述中提取商品费用 (针对 VIP)
  const getItemCost = (description: string = '') => {
    const match = description.match(/\[(?:商品费用（仅余额支付）|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/);
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
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

  return (
    <div className="cpkg-page">
      <header className="cpkg-toolbar">
        <div className="cpkg-heading">
          <h1 className="cpkg-title">
            {language === 'zh' ? '同城订单管理' : language === 'en' ? 'City Orders' : 'မြို့တွင်းအော်ဒါ'}
            {isRegionalUser && <span className="cpkg-region">{currentRegionPrefix}</span>}
          </h1>
          <span className="cpkg-subtitle">
            {language === 'zh'
              ? `共 ${stats.total} 单 · 当前显示 ${filteredTotal} 单`
              : `${stats.total} orders · showing ${filteredTotal}`}
          </span>
        </div>

        <div className="cpkg-stats">
          <button type="button" className={chipClass('all', 'all')} onClick={() => handleStatusClick('all')}>
            全部 {stats.total}
          </button>
          <button type="button" className={chipClass('待取件', 'pending')} onClick={() => handleStatusClick('待取件')}>
            待取件 {stats.pending}
          </button>
          <button type="button" className={chipClass('已取件', 'picked')} onClick={() => handleStatusClick('已取件')}>
            已取件 {stats.pickedUp}
          </button>
          <button type="button" className={chipClass('配送中', 'delivering')} onClick={() => handleStatusClick('配送中')}>
            配送中 {stats.delivering}
          </button>
          <button type="button" className={chipClass('已送达', 'done')} onClick={() => handleStatusClick('已送达')}>
            已送达 {stats.delivered}
          </button>
        </div>

        <div className="cpkg-actions">
          <label className="cpkg-search">
            <span aria-hidden>🔍</span>
            <input
              type="search"
              value={listSearchQuery}
              onChange={(e) => {
                setListSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={language === 'zh' ? '单号 / 姓名 / 电话' : 'ID / name / phone'}
            />
          </label>

          <button type="button" className="cpkg-btn" onClick={() => setShowDatePicker(true)}>
            📅 {selectedDate ? formatDateDisplay(selectedDate) : (language === 'zh' ? '日期' : 'Date')}
          </button>
          <button type="button" className="cpkg-btn cpkg-btn--primary" onClick={() => navigate('/admin/tracking')}>
            📍 {language === 'zh' ? '实时跟踪' : 'Tracking'}
          </button>
          <button type="button" className="cpkg-btn cpkg-btn--success" onClick={() => void loadPackages()}>
            🔄 {language === 'zh' ? '刷新' : 'Refresh'}
          </button>

          {batchMode ? (
            <>
              <button type="button" className="cpkg-btn" onClick={toggleSelectAll}>
                {selectedPackages.size === packages.length && packages.length > 0 ? '取消全选' : '全选本页'}
              </button>
              <button
                type="button"
                className="cpkg-btn cpkg-btn--danger"
                onClick={handleBatchDelete}
                disabled={selectedPackages.size === 0}
              >
                删除 ({selectedPackages.size})
              </button>
              <button type="button" className="cpkg-btn" onClick={toggleBatchMode}>
                退出批量
              </button>
            </>
          ) : (
            <button type="button" className="cpkg-btn cpkg-btn--warn" onClick={toggleBatchMode}>
              ☑️ {language === 'zh' ? '批量' : 'Batch'}
            </button>
          )}
        </div>
      </header>

      <section className="cpkg-panel">
          {loading ? (
            <div className="cpkg-empty">
              <p>加载中...</p>
            </div>
          ) : (
          <div className="cpkg-list">
            {(selectedStatus || selectedDate || listSearchQuery.trim()) && (
            <div className="cpkg-filter-bar">
                <div>
                    <span>当前筛选: </span>
                    {selectedStatus && selectedStatus !== 'all' && (
                      <strong style={{ marginRight: 8 }}>{getStatusText(selectedStatus)}</strong>
                    )}
                    {selectedDate && (
                      <strong style={{ marginRight: 8 }}>{formatDateDisplay(selectedDate)}</strong>
                    )}
                    {listSearchQuery.trim() && (
                      <strong style={{ marginRight: 8 }}>「{listSearchQuery.trim()}」</strong>
                    )}
                    <span>({filteredTotal} 单)</span>
                  </div>
                  <button type="button" className="cpkg-btn" onClick={clearAllFilters}>
                    清除筛选
                  </button>
            </div>
            )}
            
            {filteredTotal === 0 ? (
                <div className="cpkg-empty">
                <p>{
                  selectedStatus || selectedDate || listSearchQuery.trim()
                    ? `没有找到符合条件的包裹` 
                    : '暂无包裹数据'
                }</p>
                {(selectedStatus || selectedDate || listSearchQuery.trim()) && (
                  <button type="button" className="cpkg-btn" onClick={clearAllFilters} style={{ marginTop: 10 }}>
                    清除所有筛选
                  </button>
                )}
                </div>
              ) : (
              <>
              {packages.map((pkg) => (
              <article key={pkg.id} className={`cpkg-card${batchMode && selectedPackages.has(pkg.id) ? ' cpkg-card--selected' : ''}`}>
                <div className="cpkg-card__head">
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {batchMode && (
                      <input
                        type="checkbox"
                        checked={selectedPackages.has(pkg.id)}
                        onChange={() => togglePackageSelection(pkg.id)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          marginTop: '2px',
                          accentColor: '#8b5cf6'
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 className="cpkg-card__id">{pkg.id} · {pkg.package_type}</h3>
                      <p className="cpkg-card__meta">创建: {pkg.create_time || pkg.created_at || '—'}</p>
                    </div>
                  </div>
                  <div className="cpkg-card__badges">
                    <span
                      className="cpkg-badge cpkg-badge--status"
                      style={{ background: getStatusColor(pkg.status === '待收款' ? '待取件' : pkg.status) }}
                    >
                      {pkg.status === '待收款' ? '待取件' : getStatusText(pkg.status)}
                    </span>
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
                    
                    {Number(pkg.cod_amount || 0) > 0 && (
                      <span className="cpkg-badge cpkg-badge--cod">
                        COD代收款 {Number(pkg.cod_amount).toLocaleString()} MMK
                      </span>
                    )}
                  </div>
                </div>

                <div className="cpkg-card__actions">
                  {/* 状态操作按钮 */}
                  {pkg.status === '待取件' && (
                    <button
                      type="button"
                      className="cpkg-card__action"
                      style={{ background: '#3498db' }}
                      onClick={() => updatePackageStatus(pkg.id, '已取件')}
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
                  
                  <button type="button" className="cpkg-card__action cpkg-card__action--muted" onClick={() => showPickupCode(pkg)}>
                    📱 {language === 'zh' ? '寄件码' : 'Pickup'}
                  </button>
                  <button type="button" className="cpkg-card__action cpkg-card__action--muted" onClick={() => handleViewDetail(pkg)}>
                    {language === 'zh' ? '详情' : 'Details'}
                  </button>
                </div>

                <div className="cpkg-card__route">
                  <div>
                    <h4>
                      寄件人
                      {(() => {
                        const isStoreMatch = deliveryStores.some(
                          (store) =>
                            store.store_name === pkg.sender_name ||
                            (pkg.sender_name && pkg.sender_name.startsWith(store.store_name)),
                        );
                        if (pkg.delivery_store_id || isStoreMatch) {
                          return <span className="cpkg-tag-merchant">商家</span>;
                        }
                        if (pkg.customer_email || pkg.customer_name) {
                          return <span className="cpkg-tag-vip">VIP</span>;
                        }
                        return null;
                      })()}
                    </h4>
                    <p>{pkg.sender_name} · {pkg.sender_phone}</p>
                  </div>
                  <div>
                    <h4>收件人</h4>
                    <p>{pkg.receiver_name} · {pkg.receiver_phone}</p>
                  </div>
                </div>
              </article>
                ))}
              
              {/* 分页控件 */}
              {filteredTotal > itemsPerPage && (
                <div className="cpkg-pagination">
                  <div className="cpkg-pagination__size">
                    <span>{language === 'zh' ? '每页显示' : language === 'en' ? 'Items per page' : 'စာမျက်နှာတစ်ခုတွင်'}:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="cpkg-pagination__info">
                    {language === 'zh'
                      ? `第 ${currentPage} / ${getTotalPages()} 页，共 ${filteredTotal} 条`
                      : language === 'en'
                        ? `Page ${currentPage} / ${getTotalPages()}, Total ${filteredTotal} items`
                        : 'စာမျက်နှာ ' + currentPage + ' / ' + getTotalPages() + '၊ စုစုပေါင်း ' + filteredTotal + ' ခု'}
                  </div>

                  <div className="cpkg-pagination__controls">
                    <button
                      type="button"
                      className="cpkg-page-btn"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      {language === 'zh' ? '« 首页' : language === 'en' ? '« First' : '« ပထမဆုံး'}
                    </button>
                    <button
                      type="button"
                      className="cpkg-page-btn"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      {language === 'zh' ? '‹ 上一页' : language === 'en' ? '‹ Prev' : '‹ ရှေ့သို့'}
                    </button>
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
                          type="button"
                          key={pageNum}
                          className={`cpkg-page-btn${currentPage === pageNum ? ' cpkg-page-btn--active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="cpkg-page-btn"
                      onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                      disabled={currentPage === getTotalPages()}
                    >
                      {language === 'zh' ? '下一页 ›' : language === 'en' ? 'Next ›' : 'နောက်သို့ ›'}
                    </button>
                    <button
                      type="button"
                      className="cpkg-page-btn"
                      onClick={() => setCurrentPage(getTotalPages())}
                      disabled={currentPage === getTotalPages()}
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
      </section>

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
                        setCurrentPage(1);
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
                      <span style={{ opacity: 0.7 }}>{stats.total}</span>
                    </button>

                    {/* 今天 */}
                    <button
                      onClick={() => {
                        setSelectedDate(todayYmd);
                        setCurrentPage(1);
                      }}
                      style={{
                        background: selectedDate === todayYmd ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        border: selectedDate === todayYmd ? '2px solid #3b82f6' : '2px solid rgba(255, 255, 255, 0.15)',
                        padding: '16px 24px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedDate === todayYmd ? '600' : '500',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: selectedDate === todayYmd ? '0 8px 20px rgba(59, 130, 246, 0.3)' : 'none'
                      }}
                    >
                      <span>☀️ {language === 'zh' ? '今天' : language === 'en' ? 'Today' : 'ယနေ့'}</span>
                    </button>

                    {/* 昨天 */}
                    <button
                      onClick={() => {
                        setSelectedDate(yesterdayYmd);
                        setCurrentPage(1);
                      }}
                      style={{
                        background: selectedDate === yesterdayYmd ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        border: selectedDate === yesterdayYmd ? '2px solid #8b5cf6' : '2px solid rgba(255, 255, 255, 0.15)',
                        padding: '16px 24px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: selectedDate === yesterdayYmd ? '600' : '500',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: selectedDate === yesterdayYmd ? '0 8px 20px rgba(139, 92, 246, 0.3)' : 'none'
                      }}
                    >
                      <span>🌙 {language === 'zh' ? '昨天' : language === 'en' ? 'Yesterday' : 'မနေ့က'}</span>
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

                {/* 右侧：任选一天（不再枚举历史日期，避免为筛日期全量拉单） */}
                <div>
                  <h3 style={{
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    margin: '0 0 20px 0',
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
                    {language === 'zh' ? '指定日期' : language === 'en' ? 'Pick a date' : 'ရက်ရွေးရန်'}
                  </h3>
                  <input
                    type="date"
                    value={selectedDate || ''}
                    onChange={(e) => {
                      setSelectedDate(e.target.value || null);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                    }}
                  />
                  {selectedDate && (
                    <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: 12, fontSize: '0.9rem' }}>
                      {formatDateDisplay(selectedDate)}
                    </p>
                  )}
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
                    setCurrentPage(1);
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
                  {/* 🚀 优化：下单账号展示 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', paddingTop: '5px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>下单账号:</span>
                    <span style={{ 
                      color: getOrdererType(selectedPackage.description) === 'MERCHANTS' ? '#A5C7FF' : 
                             (getOrdererType(selectedPackage.description) === 'VIP' ? '#fbbf24' : 'white'),
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      {getOrdererType(selectedPackage.description)}
                    </span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#A5C7FF', fontSize: '1.1rem' }}>
                    📤 寄件人信息
                  </h3>
                  {/* 🚀 新增：商家订单显示代收状态 */}
                  {getOrdererType(selectedPackage.description) === 'MERCHANTS' && (
                    <div style={{ 
                      background: selectedPackage.cod_amount ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: selectedPackage.cod_amount ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      border: `1px solid ${selectedPackage.cod_amount ? '#fbbf2444' : 'rgba(255,255,255,0.1)'}`
                    }}>
                      {selectedPackage.cod_amount ? `COD = ${selectedPackage.cod_amount} MMK` : '无代收款'}
                    </div>
                  )}
                </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#A5C7FF', fontSize: '1.1rem' }}>
                    📥 收件人信息
                  </h3>
                  {/* 🚀 新增：VIP订单显示余额支付标识 */}
                  {getOrdererType(selectedPackage.description) === 'VIP' && (
                    <div style={{ 
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      border: '1px solid #10b98144'
                    }}>
                      余额支付
                    </div>
                  )}
                </div>
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
                  {/* 🚀 新增：跑腿费支付方式 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', paddingTop: '5px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>跑腿费支付:</span>
                    <span style={{ 
                      color: (getOrdererType(selectedPackage.description) === 'MERCHANTS' || selectedPackage.payment_method === 'cash') ? '#f59e0b' : '#10b981', 
                      fontWeight: 'bold' 
                    }}>
                      {getOrdererType(selectedPackage.description) === 'MERCHANTS' ? '现金支付' : 
                       (selectedPackage.payment_method === 'balance' ? '余额支付' : '现金支付')}
                    </span>
                  </div>
                </div>
            </div>

              {/* 🚀 新增：统计费用卡片 */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
                borderRadius: '10px',
                padding: isMobile ? '12px' : '20px',
                border: '2px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#10b981', fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 费用统计
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {getOrdererType(selectedPackage.description) === 'VIP' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>商品费用 (余额已付):</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{getItemCost(selectedPackage.description).toLocaleString()} MMK</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>跑腿费:</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{parseFloat(selectedPackage.price?.replace(/[^0-9.]/g, '') || '0').toLocaleString()} MMK</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ color: '#10b981', fontWeight: '900', fontSize: '1rem' }}>费用总计:</span>
                        <span style={{ color: '#10b981', fontWeight: '950', fontSize: '1.2rem' }}>
                          {(getItemCost(selectedPackage.description) + parseFloat(selectedPackage.price?.replace(/[^0-9.]/g, '') || '0')).toLocaleString()} MMK
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>代收款 COD (待收):</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{(selectedPackage.cod_amount || 0).toLocaleString()} MMK</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>跑腿费:</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{parseFloat(selectedPackage.price?.replace(/[^0-9.]/g, '') || '0').toLocaleString()} MMK</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ color: '#10b981', fontWeight: '900', fontSize: '1rem' }}>金额总计:</span>
                        <span style={{ color: '#10b981', fontWeight: '950', fontSize: '1.2rem' }}>
                          {((selectedPackage.cod_amount || 0) + parseFloat(selectedPackage.price?.replace(/[^0-9.]/g, '') || '0')).toLocaleString()} MMK
                        </span>
                      </div>
                    </>
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

      {/* 🚀 安全验证弹窗 */}
      <SecurityVerificationModal 
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerifySuccess={triggerDeleteConfirm}
        title="敏感操作验证"
        description={`您正在尝试批量删除 ${selectedPackages.size} 个订单，此操作不可撤销并会影响财务对账。请验证管理员密码以继续。`}
      />
    </div>
  );
};

export default CityPackages;
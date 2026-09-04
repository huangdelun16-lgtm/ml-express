import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { packageService, Package, supabase, auditLogService, deliveryPhotoService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import QRCode from 'qrcode';
import SecurityVerificationModal from '../components/SecurityVerificationModal';
import { AssignCourierModal } from '../components/AssignCourierModal';
import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import { assignPackagesToCourier } from '../services/batchAssignService';
import { filterAssignableByIds, formatBatchAssignMessage } from '../utils/batchAssign';
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  
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
    return `finance-ov-card finance-ov-card--click finance-ov-card--${tone}${active ? ' is-on' : ''}`;
  };

  const statusChipClass = (status: string) => {
    const s = status === '待收款' ? '待取件' : status;
    if (s === '待取件') return 'cpkg-chip cpkg-chip--pending';
    if (s === '已取件') return 'cpkg-chip cpkg-chip--picked';
    if (s === '配送中' || s === '配送进行中') return 'cpkg-chip cpkg-chip--delivering';
    if (s === '已送达') return 'cpkg-chip cpkg-chip--done';
    if (s === '已取消') return 'cpkg-chip cpkg-chip--cancel';
    return 'cpkg-chip';
  };

  const cardTone = (status: string) => {
    const s = status === '待收款' ? '待取件' : status;
    if (s === '待取件') return 'pending';
    if (s === '已取件') return 'picked';
    if (s === '配送中' || s === '配送进行中') return 'delivering';
    if (s === '已送达') return 'done';
    if (s === '已取消') return 'cancel';
    return 'mute';
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

  const assignableSelected = filterAssignableByIds(packages, selectedPackages);

  const cityAssignCouriers = couriers
    .filter((c) => c?.id && (c.name || c.employee_name))
    .map((c) => ({
      id: String(c.id),
      name: String(c.name || c.employee_name),
      phone: c.phone,
      status:
        c.status === 'inactive' || c.status === 'offline'
          ? 'offline'
          : c.status === 'busy'
            ? 'busy'
            : 'active',
      latitude: c.last_latitude ?? c.latitude ?? null,
      longitude: c.last_longitude ?? c.longitude ?? null,
      currentPackages: 0,
    }));

  const handleOpenBatchAssign = () => {
    if (assignableSelected.length === 0) {
      feedbackService.notify('选中的订单里没有待分配单（待取件/待收款且尚未派骑手）');
      return;
    }
    setShowAssignModal(true);
  };

  const handleConfirmBatchAssign = async (courier: { id: string; name: string }) => {
    if (assigning || assignableSelected.length === 0) return;
    setAssigning(true);
    try {
      const result = await assignPackagesToCourier(assignableSelected, courier);
      feedbackService.notify(formatBatchAssignMessage(result, courier.name));
      if (result.success === 0) return;
      setShowAssignModal(false);
      setSelectedPackages(new Set());
      await loadPackages();
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      feedbackService.notify('❌ 派单失败：' + message);
    } finally {
      setAssigning(false);
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
    <div className="admin-page cpkg-page">
      <div className="admin-page-head">
        <div>
          <h1>
            {language === 'zh' ? '同城订单管理' : language === 'en' ? 'City Orders' : 'မြို့တွင်းအော်ဒါ'}
            {isRegionalUser && <span className="admin-page-head__region">{currentRegionPrefix}</span>}
          </h1>
          <p>
            {language === 'zh'
              ? `共 ${stats.total} 单 · 当前显示 ${filteredTotal} 单`
              : `${stats.total} orders · showing ${filteredTotal}`}
          </p>
        </div>
      </div>

        <div className="cpkg-metrics">
          <button type="button" className={chipClass('all', 'start')} onClick={() => handleStatusClick('all')}>
            <div className="finance-ov-card__label">全部</div>
            <div className="finance-ov-card__value">{stats.total}</div>
          </button>
          <button type="button" className={chipClass('待取件', 'pending')} onClick={() => handleStatusClick('待取件')}>
            <div className="finance-ov-card__label">待取件</div>
            <div className="finance-ov-card__value">{stats.pending}</div>
          </button>
          <button type="button" className={chipClass('已取件', 'platform')} onClick={() => handleStatusClick('已取件')}>
            <div className="finance-ov-card__label">已取件</div>
            <div className="finance-ov-card__value">{stats.pickedUp}</div>
          </button>
          <button type="button" className={chipClass('配送中', 'rider')} onClick={() => handleStatusClick('配送中')}>
            <div className="finance-ov-card__label">配送中</div>
            <div className="finance-ov-card__value">{stats.delivering}</div>
          </button>
          <button type="button" className={chipClass('已送达', 'net')} onClick={() => handleStatusClick('已送达')}>
            <div className="finance-ov-card__label">已送达</div>
            <div className="finance-ov-card__value">{stats.delivered}</div>
          </button>
        </div>

        <div className="cpkg-bar">
          <div className="cpkg-search">
            <label htmlFor="cpkg-search">
              {language === 'zh' ? '搜索订单' : 'Search'}
            </label>
            <input
              id="cpkg-search"
              type="search"
              value={listSearchQuery}
              onChange={(e) => {
                setListSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={language === 'zh' ? '单号 / 姓名 / 电话' : 'ID / name / phone'}
            />
          </div>

          <div className="cpkg-tools">
          <button type="button" className="admin-shell__btn" onClick={() => setShowDatePicker(true)}>
            {selectedDate ? formatDateDisplay(selectedDate) : (language === 'zh' ? '日期' : 'Date')}
          </button>
          <button type="button" className="admin-shell__btn admin-shell__btn--primary" onClick={() => navigate('/admin/tracking')}>
            {language === 'zh' ? '实时跟踪' : 'Tracking'}
          </button>
          <button type="button" className="admin-shell__btn" onClick={() => void loadPackages()}>
            {language === 'zh' ? '刷新' : 'Refresh'}
          </button>

          {batchMode ? (
            <>
              <button type="button" className="admin-shell__btn" onClick={toggleSelectAll}>
                {selectedPackages.size === packages.length && packages.length > 0 ? '取消全选' : '全选本页'}
              </button>
              <button
                type="button"
                className="admin-shell__btn admin-shell__btn--primary"
                onClick={handleOpenBatchAssign}
                disabled={assignableSelected.length === 0 || assigning}
              >
                {assigning ? '派单中…' : `派单 (${assignableSelected.length})`}
              </button>
              <button
                type="button"
                className="admin-shell__btn admin-shell__btn--danger"
                onClick={handleBatchDelete}
                disabled={selectedPackages.size === 0 || assigning}
              >
                删除 ({selectedPackages.size})
              </button>
              <button type="button" className="admin-shell__btn" onClick={toggleBatchMode}>
                退出批量
              </button>
            </>
          ) : (
            <button type="button" className="admin-shell__btn" onClick={toggleBatchMode}>
              {language === 'zh' ? '批量' : 'Batch'}
            </button>
          )}
          </div>
        </div>

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
                  <button type="button" className="admin-shell__btn" onClick={clearAllFilters}>
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
                  <button type="button" className="admin-shell__btn" onClick={clearAllFilters} style={{ marginTop: 10 }}>
                    清除所有筛选
                  </button>
                )}
                </div>
              ) : (
              <>
              {packages.map((pkg) => (
              <article
                key={pkg.id}
                className={`cpkg-card cpkg-card--${cardTone(pkg.status)}${batchMode && selectedPackages.has(pkg.id) ? ' is-on' : ''}`}
              >
                <div className="cpkg-card__head">
                  <div className="cpkg-card__pick">
                    {batchMode && (
                      <input
                        type="checkbox"
                        checked={selectedPackages.has(pkg.id)}
                        onChange={() => togglePackageSelection(pkg.id)}
                      />
                    )}
                    <div>
                      <h3 className="cpkg-card__id">{pkg.id} · {pkg.package_type}</h3>
                      <p className="cpkg-card__meta">创建: {pkg.create_time || pkg.created_at || '—'}</p>
                    </div>
                  </div>
                  <div className="cpkg-card__badges">
                    <span className={statusChipClass(pkg.status)}>
                      {pkg.status === '待收款' ? '待取件' : getStatusText(pkg.status)}
                    </span>
                    {(pkg.status === '待取件' || pkg.status === '待收款') && (
                      <>
                        {pkg.payment_method === 'cash' && (
                          <span className="cpkg-chip cpkg-chip--cash">现金</span>
                        )}
                        {pkg.payment_method === 'qr' && (
                          <span className="cpkg-chip cpkg-chip--pay">二维码</span>
                        )}
                        {!pkg.payment_method && (
                          <span className="cpkg-chip cpkg-chip--pay">已支付</span>
                        )}
                      </>
                    )}
                    
                    {Number(pkg.cod_amount || 0) > 0 && (
                      <span className="cpkg-chip cpkg-chip--cod">
                        COD {Number(pkg.cod_amount).toLocaleString()} MMK
                      </span>
                    )}
                  </div>
                </div>

                <div className="cpkg-card__actions">
                  {pkg.status === '待取件' && (
                    <button
                      type="button"
                      className="admin-shell__btn admin-shell__btn--primary"
                      onClick={() => updatePackageStatus(pkg.id, '已取件')}
                    >
                      {language === 'zh' ? '标记已取件' : language === 'en' ? 'Mark Picked Up' : 'ကောက်ယူပြီး မှတ်သားပါ'}
                    </button>
                  )}
                  {pkg.status === '已取件' && (
                    <button
                      type="button"
                      className="admin-shell__btn admin-shell__btn--primary"
                      onClick={() => updatePackageStatus(pkg.id, '配送中')}
                    >
                      {language === 'zh' ? '开始配送' : language === 'en' ? 'Start Delivery' : 'ပို့ဆောင်မှု စတင်ပါ'}
                    </button>
                  )}
                  {pkg.status === '配送中' && (
                    <button
                      type="button"
                      className="admin-shell__btn admin-shell__btn--primary"
                      onClick={() => updatePackageStatus(pkg.id, '已送达')}
                    >
                      {language === 'zh' ? '标记已送达' : language === 'en' ? 'Mark Delivered' : 'ပို့ဆောင်ပြီး မှတ်သားပါ'}
                    </button>
                  )}
                  
                  <button type="button" className="admin-shell__btn" onClick={() => showPickupCode(pkg)}>
                    {language === 'zh' ? '寄件码' : 'Pickup'}
                  </button>
                  <button type="button" className="admin-shell__btn" onClick={() => handleViewDetail(pkg)}>
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

      {showPickupCodeModal && selectedPackageForPickup && (
        <div className="admin-modal-scrim">
          <div className="admin-modal da-modal" role="dialog" aria-labelledby="cpkg-pickup-title">
            <h2 id="cpkg-pickup-title">
              {language === 'zh' ? '寄件码' : language === 'en' ? 'Pickup Code' : 'ကောက်ယူမည့်ကုဒ်'}
            </h2>

            <div className="cpkg-section">
              <h3>包裹信息</h3>
              <div className="cpkg-kv"><span>包裹编号</span><strong>{selectedPackageForPickup.id}</strong></div>
              <div className="cpkg-kv"><span>包裹类型</span><strong>{selectedPackageForPickup.package_type}</strong></div>
              <div className="cpkg-kv"><span>寄件人</span><strong>{selectedPackageForPickup.sender_name}</strong></div>
              <div className="cpkg-kv"><span>收件人</span><strong>{selectedPackageForPickup.receiver_name}</strong></div>
            </div>

            <div className="cpkg-qr">
              {qrCodeDataUrl ? (
                <>
                  <img src={qrCodeDataUrl} alt="寄件码二维码" />
                  <p>扫描此二维码完成取件 · {selectedPackageForPickup.id}</p>
                </>
              ) : (
                <p>生成中...</p>
              )}
            </div>

            <div className="cpkg-section" style={{ marginTop: 10 }}>
              <h3>使用说明</h3>
              <p className="admin-modal__warn">
                骑手取件时扫描此二维码。确认包裹信息后完成取件。请妥善保管，避免泄露。
              </p>
            </div>

            <div className="admin-modal__actions">
              <button type="button" className="admin-shell__btn" onClick={closePickupCodeModal}>
                {language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်ရန်'}
              </button>
              <button
                type="button"
                className="admin-shell__btn admin-shell__btn--primary"
                onClick={saveQRCode}
                disabled={!qrCodeDataUrl}
              >
                保存二维码
              </button>
            </div>
          </div>
        </div>
      )}

      {showDatePicker && (
        <div className="admin-modal-scrim">
          <div className="admin-modal da-modal" role="dialog" aria-labelledby="cpkg-date-title">
            <h2 id="cpkg-date-title">
              {language === 'zh' ? '按日期筛选' : language === 'en' ? 'Filter by date' : 'ရက်စွဲဖြင့်စစ်ထုတ်ရန်'}
            </h2>
            <div className="cpkg-date-grid">
              <div>
                <label>快速选择</label>
                <div className="cpkg-date-list">
                  <button
                    type="button"
                    className={`cpkg-date-choice${selectedDate === null ? ' is-on' : ''}`}
                    onClick={() => {
                      setSelectedDate(null);
                      setSelectedStatus(null);
                      setCurrentPage(1);
                    }}
                  >
                    <span>{language === 'zh' ? '全部订单' : language === 'en' ? 'All Orders' : 'အမှာစာအားလုံး'}</span>
                    <span>{stats.total}</span>
                  </button>
                  <button
                    type="button"
                    className={`cpkg-date-choice${selectedDate === todayYmd ? ' is-on' : ''}`}
                    onClick={() => {
                      setSelectedDate(todayYmd);
                      setCurrentPage(1);
                    }}
                  >
                    <span>{language === 'zh' ? '今天' : language === 'en' ? 'Today' : 'ယနေ့'}</span>
                  </button>
                  <button
                    type="button"
                    className={`cpkg-date-choice${selectedDate === yesterdayYmd ? ' is-on' : ''}`}
                    onClick={() => {
                      setSelectedDate(yesterdayYmd);
                      setCurrentPage(1);
                    }}
                  >
                    <span>{language === 'zh' ? '昨天' : language === 'en' ? 'Yesterday' : 'မနေ့က'}</span>
                  </button>
                </div>
              </div>
              <div className="admin-modal__field">
                <label htmlFor="cpkg-date-input">
                  {language === 'zh' ? '指定日期' : language === 'en' ? 'Pick a date' : 'ရက်ရွေးရန်'}
                </label>
                <input
                  id="cpkg-date-input"
                  type="date"
                  value={selectedDate || ''}
                  onChange={(e) => {
                    setSelectedDate(e.target.value || null);
                    setCurrentPage(1);
                  }}
                />
                {selectedDate ? <p className="admin-modal__warn">{formatDateDisplay(selectedDate)}</p> : null}
              </div>
            </div>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-shell__btn"
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedStatus(null);
                  setCurrentPage(1);
                }}
              >
                {language === 'zh' ? '重置筛选' : language === 'en' ? 'Reset Filter' : 'ပြန်လည်သတ်မှတ်'}
              </button>
              <button
                type="button"
                className="admin-shell__btn admin-shell__btn--primary"
                onClick={() => setShowDatePicker(false)}
              >
                {language === 'zh' ? '完成' : language === 'en' ? 'Done' : 'သုံးမည်'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoModal && (
        <div className="admin-modal-scrim da-scrim--top">
          <div className="admin-modal da-modal" role="dialog" aria-labelledby="cpkg-photo-title">
            <h2 id="cpkg-photo-title">
              {language === 'zh' ? '包裹送达图片' : language === 'en' ? 'Delivery Photos' : 'ပို့ဆောင်ပြီးဓာတ်ပုံများ'}
            </h2>
            {photoLoading ? (
              <div className="cpkg-empty">正在加载照片...</div>
            ) : packagePhotos.length === 0 ? (
              <div className="cpkg-empty">
                <p>暂无送达图片</p>
                <p>骑手送达包裹后拍摄的留底图片将显示在这里</p>
              </div>
            ) : (
              <div className="cpkg-photos">
                {packagePhotos.map((photo) => (
                  <article key={photo.id}>
                    <img src={photo.url} alt={`送达图片 ${photo.id}`} />
                    <div className="cpkg-kv"><span>上传时间</span><strong>{photo.timestamp}</strong></div>
                    <div className="cpkg-kv"><span>上传骑手</span><strong>{photo.courier}</strong></div>
                    <div className="cpkg-kv"><span>拍摄位置</span><strong>{photo.location}</strong></div>
                  </article>
                ))}
              </div>
            )}
            <div className="admin-modal__actions">
              <button type="button" className="admin-shell__btn" onClick={() => setShowPhotoModal(false)}>
                {language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်ရန်'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedPackage && (
        <div className="admin-modal-scrim">
          <div className="admin-modal da-modal" role="dialog" aria-labelledby="cpkg-detail-title">
            <div className="cpkg-section__head">
              <h2 id="cpkg-detail-title">包裹详情</h2>
              <div className="cpkg-tools" style={{ marginLeft: 0 }}>
                <button
                  type="button"
                  className="admin-shell__btn"
                  onClick={() => findPackagePhotos(selectedPackage.id)}
                >
                  {language === 'zh' ? '图片' : language === 'en' ? 'Photos' : 'ဓာတ်ပုံများ'}
                </button>
                <button type="button" className="admin-shell__btn" onClick={closeDetailModal}>
                  {language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်ရန်'}
                </button>
              </div>
            </div>

            <div className="cpkg-section">
              <h3>基本信息</h3>
              <div className="cpkg-kv"><span>包裹编号</span><strong>{selectedPackage.id}</strong></div>
              <div className="cpkg-kv"><span>包裹类型</span><strong>{selectedPackage.package_type}</strong></div>
              <div className="cpkg-kv"><span>重量</span><strong>{selectedPackage.weight}kg</strong></div>
              <div className="cpkg-kv">
                <span>状态</span>
                <strong><span className={statusChipClass(selectedPackage.status)}>{getStatusText(selectedPackage.status)}</span></strong>
              </div>
              <div className="cpkg-kv"><span>创建时间</span><strong>{selectedPackage.create_time}</strong></div>
              <div className="cpkg-kv"><span>下单账号</span><strong>{getOrdererType(selectedPackage.description)}</strong></div>
            </div>

            <div className="cpkg-section">
              <div className="cpkg-section__head">
                <h3>寄件人信息</h3>
                {getOrdererType(selectedPackage.description) === 'MERCHANTS' && (
                  <span className={selectedPackage.cod_amount ? 'cpkg-chip cpkg-chip--cod' : 'cpkg-chip'}>
                    {selectedPackage.cod_amount ? `COD = ${selectedPackage.cod_amount} MMK` : '无代收款'}
                  </span>
                )}
              </div>
              <div className="cpkg-kv"><span>姓名</span><strong>{selectedPackage.sender_name}</strong></div>
              <div className="cpkg-kv"><span>电话</span><strong>{selectedPackage.sender_phone}</strong></div>
              <div className="cpkg-kv"><span>地址</span><strong>{selectedPackage.sender_address}</strong></div>
            </div>

            <div className="cpkg-section">
              <div className="cpkg-section__head">
                <h3>收件人信息</h3>
                {getOrdererType(selectedPackage.description) === 'VIP' && (
                  <span className="cpkg-chip cpkg-chip--done">余额支付</span>
                )}
              </div>
              <div className="cpkg-kv"><span>姓名</span><strong>{selectedPackage.receiver_name}</strong></div>
              <div className="cpkg-kv"><span>电话</span><strong>{selectedPackage.receiver_phone}</strong></div>
              <div className="cpkg-kv"><span>地址</span><strong>{selectedPackage.receiver_address}</strong></div>
            </div>

            <div className="cpkg-section">
              <h3>配送信息</h3>
              <div className="cpkg-kv"><span>负责骑手</span><strong>{selectedPackage.courier || '待分配'}</strong></div>
              {selectedPackage.pickup_time ? (
                <div className="cpkg-kv"><span>取件时间</span><strong>{selectedPackage.pickup_time}</strong></div>
              ) : null}
              {selectedPackage.delivery_time ? (
                <div className="cpkg-kv"><span>送达时间</span><strong>{selectedPackage.delivery_time}</strong></div>
              ) : null}
              <div className="cpkg-kv">
                <span>跑腿费支付</span>
                <strong>
                  {getOrdererType(selectedPackage.description) === 'MERCHANTS' ? '现金支付' :
                    (selectedPackage.payment_method === 'balance' ? '余额支付' : '现金支付')}
                </strong>
              </div>
            </div>

            <div className="cpkg-section cpkg-fee">
              <h3>费用统计</h3>
              {getOrdererType(selectedPackage.description) === 'VIP' ? (
                <>
                  <div className="cpkg-kv">
                    <span>商品费用 (余额已付)</span>
                    <strong>{getItemCost(selectedPackage.description).toLocaleString()} MMK</strong>
                  </div>
                  <div className="cpkg-kv">
                    <span>跑腿费</span>
                    <strong>{parseFloat(selectedPackage.price?.replace(/[^0-9.]/g, '') || '0').toLocaleString()} MMK</strong>
                  </div>
                  <div className="cpkg-kv">
                    <span>费用总计</span>
                    <strong>
                      {(getItemCost(selectedPackage.description) + parseFloat(selectedPackage.price?.replace(/[^0-9.]/g, '') || '0')).toLocaleString()} MMK
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="cpkg-kv">
                    <span>代收款 COD (待收)</span>
                    <strong>{(selectedPackage.cod_amount || 0).toLocaleString()} MMK</strong>
                  </div>
                  <div className="cpkg-kv">
                    <span>跑腿费</span>
                    <strong>{parseFloat(selectedPackage.price?.replace(/[^0-9.]/g, '') || '0').toLocaleString()} MMK</strong>
                  </div>
                  <div className="cpkg-kv">
                    <span>金额总计</span>
                    <strong>
                      {((selectedPackage.cod_amount || 0) + parseFloat(selectedPackage.price?.replace(/[^0-9.]/g, '') || '0')).toLocaleString()} MMK
                    </strong>
                  </div>
                </>
              )}
            </div>

            <div className="cpkg-section">
              <h3>
                {language === 'zh' ? '操作痕迹追踪' : language === 'en' ? 'Audit Trail' : 'လုပ်ဆောင်ချက်မှတ်တမ်း'}
                {logsLoading ? ` (${language === 'zh' ? '加载中...' : 'Loading...'})` : ''}
              </h3>
              {packageLogs.length === 0 && !logsLoading ? (
                <p className="admin-modal__warn">
                  {language === 'zh' ? '暂无详细操作记录' : language === 'en' ? 'No audit logs found' : 'မှတ်တမ်းများမရှိပါ'}
                </p>
              ) : (
                <ul className="cpkg-timeline">
                  {packageLogs.map((log, index) => (
                    <li key={log.id || index}>
                      <time>
                        {new Date(log.action_time || log.created_at || Date.now()).toLocaleString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </time>
                      <p>
                        <b>{log.user_name}</b>
                        {log.action_description}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="admin-modal-scrim">
          <div className="admin-modal" role="dialog" aria-labelledby="cpkg-del-title">
            <h2 id="cpkg-del-title">
              {language === 'zh' ? '确认删除' : language === 'en' ? 'Confirm Delete' : 'ဖျက်ရန် အတည်ပြုရန်'}
            </h2>
            <p className="admin-modal__warn">
              {language === 'zh'
                ? `确定要删除选中的 ${selectedPackages.size} 个包裹吗？此操作不可恢复。`
                : language === 'en'
                ? `Are you sure you want to delete ${selectedPackages.size} selected packages? This action cannot be undone.`
                : 'ရွေးချယ်ထားသော ပက်ကေ့ဂျ် ' + selectedPackages.size + ' ခုကို ဖျက်ရန် သေချာပါသလား? ဤလုပ်ဆောင်ချက်ကို ပြန်လည်ရယူ၍မရပါ။'}
            </p>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-shell__btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                {language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ဖျက်သိမ်းရန်'}
              </button>
              <button
                type="button"
                className="admin-shell__btn admin-shell__btn--danger"
                onClick={confirmBatchDelete}
                disabled={deleting}
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

      {showAssignModal && assignableSelected.length > 0 && (
        <AssignCourierModal
          packages={assignableSelected}
          couriers={cityAssignCouriers}
          busy={assigning}
          onClose={() => {
            if (!assigning) setShowAssignModal(false);
          }}
          onPick={(courier) => void handleConfirmBatchAssign(courier)}
        />
      )}
    </div>
  );
};

export default CityPackages;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, auditLogService } from '../services/supabase';
import { deliveryAlertService } from '../services/deliveryAlertService';
import { sanitizeHtml, escapeHtml } from '../utils/xssSanitizer';
import { useLanguage } from '../contexts/LanguageContext';
import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import { feedbackService } from '../services/FeedbackService';
import { isBrowserRealtimeAvailable } from '../utils/supabaseBrowserUrl';

interface DeliveryAlert {
  id: string;
  package_id: string;
  courier_id: string;
  courier_name: string;
  alert_type: string;
  severity: string;
  courier_latitude: number;
  courier_longitude: number;
  destination_latitude?: number;
  destination_longitude?: number;
  distance_from_destination?: number;
  title: string;
  description: string;
  action_attempted?: string;
  status: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  violation_type?: string; // 新增：违规类型
  penalty_points?: number; // 新增：扣分
  warning_level?: string; // 新增：警告级别
  admin_action?: string; // 新增：管理员处理动作
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface ViolationRecord {
  id: string;
  courier_id: string;
  courier_name: string;
  violation_type: string;
  severity: string;
  penalty_points: number;
  warning_level: string;
  description: string;
  evidence_photos?: string[];
  admin_action: string;
  admin_notes: string;
  created_at: string;
  created_by: string;
}

interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  target_type: string;
  target_id: string;
  target_name?: string;
  action_description: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function DeliveryAlerts() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  // 多语言翻译
  interface TranslationKeys {
    title: string; subtitle: string; backToDashboard: string; criticalAlerts: string; resolvedToday: string; pendingAlerts: string; totalAlerts: string; newAlert: string; rider: string; alertId: string; alertType: string; severity: string; courier: string; status: string; action: string; actions: string; resolve: string; dismiss: string; detail: string; resolved: string; dismissed: string; pending: string; low: string; medium: string; high: string; critical: string; all: string; filterByStatus: string; filterBySeverity: string; loading: string; cancel: string; refresh: string;
  }

  const translations: Record<'zh' | 'en' | 'my', TranslationKeys> = {
    zh: {
      title: '配送警报管理',
      subtitle: '监控和管理骑手异常操作警报',
      backToDashboard: '返回仪表板',
      criticalAlerts: '紧急警报',
      resolvedToday: '今日已处理',
      pendingAlerts: '待处理警报',
      totalAlerts: '总警报',
      newAlert: '新警报',
      rider: '骑手',
      alertId: '警报ID',
      alertType: '警报类型',
      severity: '严重程度',
      courier: '骑手姓名',
      status: '处理状态',
      action: '操作',
      actions: '操作',
      resolve: '处理',
      dismiss: '忽略',
      detail: '详情',
      resolved: '已处理',
      dismissed: '已忽略',
      pending: '待处理',
      low: '低',
      medium: '中',
      high: '高',
      critical: '紧急',
      all: '全部',
      filterByStatus: '处理状态',
      filterBySeverity: '严重程度',
      loading: '加载中...',
      cancel: '取消',
      refresh: '刷新',
    },
    en: {
      title: 'Delivery Alert Management',
      subtitle: 'Monitor and manage courier anomaly alerts',
      backToDashboard: 'Dashboard',
      criticalAlerts: 'Critical',
      resolvedToday: 'Resolved Today',
      pendingAlerts: 'Pending Alerts',
      totalAlerts: 'Total Alerts',
      newAlert: 'New Alert',
      rider: 'Rider',
      alertId: 'ID',
      alertType: 'Type',
      severity: 'Severity',
      courier: 'Courier',
      status: 'Status',
      action: 'Action',
      actions: 'Actions',
      resolve: 'Resolve',
      dismiss: 'Dismiss',
      detail: 'Detail',
      resolved: 'Resolved',
      dismissed: 'Dismissed',
      pending: 'Pending',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
      all: 'All',
      filterByStatus: 'Status',
      filterBySeverity: 'Severity',
      loading: 'Loading...',
      cancel: 'Cancel',
      refresh: 'Refresh',
    },
    my: {
      title: 'ပို့ဆောင်ရေးသတိပေးချက်စီမံခန့်ခွဲမှု',
      subtitle: 'ပို့ဆောင်သူများ၏ ပုံမှန်မဟုတ်သော လုပ်ဆောင်ချက်များကို စောင့်ကြည့်စီမံပါ',
      backToDashboard: 'ပင်မစာမျက်နှာ',
      criticalAlerts: 'အရေးကြီးသတိပေးချက်',
      resolvedToday: 'ယနေ့ဖြေရှင်းပြီး',
      pendingAlerts: 'စောင့်ဆိုင်းဆဲသတိပေးချက်',
      totalAlerts: 'စုစုပေါင်းသတိပေးချက်',
      newAlert: 'သတိပေးချက်အသစ်',
      rider: 'ပို့ဆောင်သူ',
      alertId: 'နံပါတ်',
      alertType: 'အမျိုးအစား',
      severity: 'ပြင်းထန်မှု',
      courier: 'ပို့ဆောင်သူအမည်',
      status: 'အခြေအနေ',
      action: 'ဆောင်ရွက်ချက်',
      actions: 'ဆောင်ရွက်ချက်များ',
      resolve: 'ဖြေရှင်းရန်',
      dismiss: 'လျစ်လျူရှုရန်',
      detail: 'အသေးစိတ်',
      resolved: 'ဖြေရှင်းပြီး',
      dismissed: 'လျစ်လျူရှုပြီး',
      pending: 'စောင့်ဆိုင်းဆဲ',
      low: 'နိမ့်',
      medium: 'အလယ်အလတ်',
      high: 'မြင့်',
      critical: 'အလွန်မြင့်',
      all: 'အားလုံး',
      filterByStatus: 'အခြေအနေ',
      filterBySeverity: 'ပြင်းထန်မှု',
      loading: 'လုပ်ဆောင်နေဆဲ...',
      cancel: 'ပယ်ဖျက်ရန်',
      refresh: 'ဒေတာ အသစ်လုပ်ရန်',
    }
  };

  const t: TranslationKeys = translations[language as 'zh' | 'en' | 'my'] || translations.zh;

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
  const isRegionalUser = currentUserRole !== 'admin' && currentRegionPrefix !== '';

  const [alerts, setAlerts] = useState<DeliveryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all'); // all, pending, resolved
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState(''); // 🚀 新增：搜索词
  const [selectedAlert, setSelectedAlert] = useState<DeliveryAlert | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPackageDetail, setShowPackageDetail] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packagePhotos, setPackagePhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // 🚀 新增：语音播报开关
  const [realTimeStats, setRealTimeStats] = useState({
    totalAlerts: 0,
    criticalAlerts: 0,
    pendingAlerts: 0,
    resolvedToday: 0
  });
  
  // 🚀 新增：语音播报函数
  const speakNotification = (text: string) => {
    if (voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 违规记录管理状态
  const [violationRecords, setViolationRecords] = useState<ViolationRecord[]>([]);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [selectedCourierViolations, setSelectedCourierViolations] = useState<ViolationRecord[]>([]);
  const [violationForm, setViolationForm] = useState({
    violation_type: '',
    severity: 'medium',
    penalty_points: 0,
    warning_level: 'warning',
    admin_action: '',
    admin_notes: ''
  });

  useEffect(() => {
    loadAlerts();
    loadViolationRecords();
    updateRealTimeStats();
    
    let subscription: ReturnType<typeof supabase.channel> | null = null;
    if (isBrowserRealtimeAvailable()) {
      subscription = supabase
        .channel('delivery_alerts_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'delivery_alerts'
          },
          (payload) => {
            loadAlerts();
            updateRealTimeStats();

            if (payload.eventType === 'INSERT') {
              const newAlert = payload.new as DeliveryAlert;
              showNewAlertNotification(newAlert);

              const alertTypeZh = getAlertTypeText(newAlert.alert_type);
              const distanceInfo = newAlert.distance_from_destination
                ? `，距离目标点 ${Math.round(newAlert.distance_from_destination)} 米`
                : '';
              speakNotification(`发现新配送警报：${newAlert.courier_name}${alertTypeZh}${distanceInfo}。请及时处理。`);
            }
          }
        )
        .subscribe();
    }

    const statsInterval = setInterval(updateRealTimeStats, 60000);
    const pollInterval = isBrowserRealtimeAvailable()
      ? null
      : setInterval(() => {
          loadAlerts();
          updateRealTimeStats();
        }, 20000);

    return () => {
      subscription?.unsubscribe();
      clearInterval(statsInterval);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [filter, severityFilter, searchTerm]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      
      // 使用新的配送警报服务
      const allAlerts = await deliveryAlertService.getAllAlerts();
      
      // 应用过滤器
      let filteredAlerts = allAlerts;
      
      if (filter !== 'all') {
        filteredAlerts = filteredAlerts.filter(alert => alert.status === filter);
      }
      
      if (severityFilter !== 'all') {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severityFilter);
      }
      
      // 🚀 新增：根据搜索词过滤
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        filteredAlerts = filteredAlerts.filter(alert => 
          alert.courier_name.toLowerCase().includes(term) || 
          alert.package_id.toLowerCase().includes(term) ||
          alert.title.toLowerCase().includes(term)
        );
      }
      
      setAlerts(filteredAlerts);
      
      // 更新实时统计
      const totalAlerts = allAlerts.length;
      const criticalAlerts = allAlerts.filter(alert => alert.severity === 'critical').length;
      const pendingAlerts = allAlerts.filter(alert => alert.status === 'pending').length;
      const resolvedToday = allAlerts.filter(alert => {
        if (alert.resolved_at) {
          const resolvedDate = new Date(alert.resolved_at);
          const today = new Date();
          return resolvedDate.toDateString() === today.toDateString();
        }
        return false;
      }).length;
      
      setRealTimeStats({
        totalAlerts,
        criticalAlerts,
        pendingAlerts,
        resolvedToday
      });
      
    } catch (error) {
      console.error('加载警报异常:', error);
    } finally {
      setLoading(false);
    }
  };

  // 📋 加载违规记录
  const loadViolationRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('courier_violations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('加载违规记录失败:', error);
        return;
      }

      setViolationRecords(data || []);
    } catch (error) {
      console.error('加载违规记录异常:', error);
    }
  };

  // ⚠️ 创建违规记录
  const createViolationRecord = async (alert: DeliveryAlert) => {
    try {
      const violationData = {
        courier_id: alert.courier_id,
        courier_name: alert.courier_name,
        violation_type: violationForm.violation_type || alert.alert_type,
        severity: violationForm.severity,
        penalty_points: violationForm.penalty_points,
        warning_level: violationForm.warning_level,
        description: `${alert.title}: ${alert.description}`,
        evidence_photos: packagePhotos,
        admin_action: violationForm.admin_action,
        admin_notes: violationForm.admin_notes,
        created_by: 'admin' // 可以从用户上下文获取
      };

      const { error } = await supabase
        .from('courier_violations')
        .insert([violationData]);

      if (error) {
        console.error('创建违规记录失败:', error);
        feedbackService.notify('创建违规记录失败，请重试');
        return false;
      }

      return true;
    } catch (error) {
      console.error('创建违规记录异常:', error);
      feedbackService.notify('创建违规记录失败，请重试');
      return false;
    }
  };

  // 📊 获取骑手违规统计
  const getCourierViolationStats = (courierId: string) => {
    const violations = violationRecords.filter(v => v.courier_id === courierId);
    const totalPoints = violations.reduce((sum, v) => sum + v.penalty_points, 0);
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    
    return {
      totalViolations: violations.length,
      totalPenaltyPoints: totalPoints,
      criticalViolations: criticalCount,
      lastViolation: violations[0]?.created_at
    };
  };

  // ⚠️ 处理创建违规记录
  const handleCreateViolation = (alert: DeliveryAlert) => {
    setSelectedAlert(alert);
    setShowViolationModal(true);
    setViolationForm({
      violation_type: alert.alert_type,
      severity: alert.severity,
      penalty_points: getSeverityPoints(alert.severity),
      warning_level: getSeverityWarning(alert.severity),
      admin_action: '',
      admin_notes: ''
    });
  };

  // 📋 处理查看骑手违规历史
  const handleViewCourierViolations = (courierId: string) => {
    const violations = violationRecords.filter(v => v.courier_id === courierId);
    setSelectedCourierViolations(violations);
    setShowViolationModal(true);
  };

  // 📊 获取严重程度对应的扣分
  const getSeverityPoints = (severity: string) => {
    switch (severity) {
      case 'low': return 5; // 🚀 调整：最低扣 5 分
      case 'medium': return 15; // 🚀 调整：中等扣 15 分
      case 'high': return 30; // 🚀 调整：高等扣 30 分
      case 'critical': return 50; // 🚀 调整：紧急/虚假妥投扣 50 分
      default: return 5;
    }
  };

  // ⚠️ 获取严重程度对应的警告级别
  const getSeverityWarning = (severity: string) => {
    switch (severity) {
      case 'low': return 'warning';
      case 'medium': return 'warning';
      case 'high': return 'serious_warning';
      case 'critical': return 'final_warning';
      default: return 'warning';
    }
  };

  const logDeliveryAudit = async (
    action_type: 'create' | 'update' | 'delete',
    payload: {
      target_id: string;
      target_name?: string;
      action_description: string;
      old_value?: string;
      new_value?: string;
    }
  ) => {
    const userId = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'admin';
    const userName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName') || '管理员';
    await auditLogService.log({
      user_id: userId,
      user_name: userName,
      action_type,
      module: 'delivery_alerts',
      target_id: payload.target_id,
      target_name: payload.target_name,
      action_description: payload.action_description,
      old_value: payload.old_value,
      new_value: payload.new_value,
    });
  };

  // 💾 保存违规记录
  const handleSaveViolation = async () => {
    if (!selectedAlert) return;

    setProcessing(true);
    try {
      const success = await createViolationRecord(selectedAlert);
      if (success) {
        // 🚀 新增：同步扣除骑手的信用分
        const { data: courierData } = await supabase
          .from('couriers')
          .select('credit_score')
          .eq('id', selectedAlert.courier_id)
          .single();
        
        const currentScore = courierData?.credit_score ?? 100;
        const newScore = Math.max(0, currentScore - violationForm.penalty_points);

        await supabase
          .from('couriers')
          .update({ 
            credit_score: newScore,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAlert.courier_id);

        await logDeliveryAudit('create', {
          target_id: selectedAlert.courier_id,
          target_name: selectedAlert.courier_name,
          action_description: `为骑手 ${selectedAlert.courier_name} 创建违规记录并扣除信用分 ${violationForm.penalty_points} (新分值: ${newScore})`,
          new_value: JSON.stringify({ ...violationForm, new_credit_score: newScore }),
        });

        // 更新警报状态
        await handleUpdateStatus(selectedAlert.id, 'resolved');
        setShowViolationModal(false);
        loadViolationRecords();
        feedbackService.notify(`违规记录创建成功！骑手信用分已降至 ${newScore}`);
      }
    } catch (error) {
      console.error('保存违规记录失败:', error);
    } finally {
      setProcessing(false);
    }
  };

  // 更新实时统计
  const updateRealTimeStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: stats, error } = await supabase
        .from('delivery_alerts')
        .select('severity, status, resolved_at')
        .gte('created_at', today);

      if (error) {
        console.error('获取统计失败:', error);
        return;
      }

      const totalAlerts = stats?.length || 0;
      const criticalAlerts = stats?.filter(s => s.severity === 'critical' && s.status === 'pending').length || 0;
      const pendingAlerts = stats?.filter(s => s.status === 'pending').length || 0;
      const resolvedToday = stats?.filter(s => s.resolved_at && s.resolved_at.startsWith(today)).length || 0;

      setRealTimeStats({
        totalAlerts,
        criticalAlerts,
        pendingAlerts,
        resolvedToday
      });
    } catch (error) {
      console.error('更新统计异常:', error);
    }
  };

  // 显示新警报通知
  const showNewAlertNotification = (newAlert: any) => {
    const notification = document.createElement('div');
    notification.className = 'da-toast';

    const safeTitle = escapeHtml(newAlert.title || '');
    const safeCourierName = escapeHtml(newAlert.courier_name || '');
    notification.innerHTML = sanitizeHtml(`
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">新警报</div>
      <div style="font-size:13px;opacity:.9;">${safeTitle}</div>
      <div style="font-size:12px;opacity:.7;margin-top:4px;">骑手: ${safeCourierName}</div>
    `);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('is-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  };

  // 查看包裹详情
  const handleViewPackageDetail = async (alert: DeliveryAlert) => {
    try {
      setLoadingPhotos(true);
      setSelectedPackage(alert);
      setShowPackageDetail(true);
      
      // 获取包裹照片
      const { data: photos, error } = await supabase
        .from('delivery_photos')
        .select('photo_url')
        .eq('package_id', alert.package_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('获取照片失败:', error);
        setPackagePhotos([]);
      } else {
        setPackagePhotos(photos?.map(p => p.photo_url) || []);
      }
    } catch (error) {
      console.error('查看包裹详情失败:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // 返回仪表板
  const handleBackToDashboard = () => {
    navigate('/admin/dashboard');
  };

  // 批量处理警报
  const handleBatchAction = async (action: 'acknowledge' | 'resolve' | 'dismiss', alertIds: string[]) => {
    try {
      setProcessing(true);
      
      const updates = {
        status: action === 'acknowledge' ? 'acknowledged' : 
                action === 'resolve' ? 'resolved' : 'dismissed',
        resolved_at: new Date().toISOString(),
        resolved_by: 'admin',
        resolution_notes: resolutionNotes || `批量${action === 'acknowledge' ? '确认' : action === 'resolve' ? '解决' : '忽略'}`
      };

      const { error } = await supabase
        .from('delivery_alerts')
        .update(updates)
        .in('id', alertIds);

      if (error) {
        console.error('批量处理失败:', error);
        feedbackService.notify('批量处理失败，请重试');
        return;
      }

      loadAlerts();
      updateRealTimeStats();
      notifyAdminTodosRefresh();
      feedbackService.notify(`成功${action === 'acknowledge' ? '确认' : action === 'resolve' ? '解决' : '忽略'} ${alertIds.length} 个警报`);
    } catch (error) {
      console.error('批量处理异常:', error);
      feedbackService.notify('批量处理失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (
    alertId: string,
    newStatus: 'acknowledged' | 'resolved' | 'dismissed'
  ) => {
    try {
      setProcessing(true);
      
      // 获取当前警报信息用于日志记录
      const currentAlert = alerts.find(alert => alert.id === alertId);
      
      // 使用新的配送警报服务更新状态
      const success = await deliveryAlertService.updateAlertStatus(
        alertId,
        newStatus,
        resolutionNotes,
        'admin' // 需要从认证系统获取当前管理员
      );

      if (!success) {
        feedbackService.notify('更新失败，请重试');
        return;
      }

      await logDeliveryAudit('update', {
        target_id: alertId,
        target_name: currentAlert?.title,
        action_description: `将警报状态从 ${currentAlert?.status} 更新为 ${newStatus}`,
        old_value: JSON.stringify({ status: currentAlert?.status }),
        new_value: JSON.stringify({ status: newStatus, resolution_notes: resolutionNotes }),
      });

      setShowDetailModal(false);
      setResolutionNotes('');
      loadAlerts();
      notifyAdminTodosRefresh();
      feedbackService.notify(`警报状态已更新为: ${newStatus}`);
    } catch (error) {
      console.error('更新警报状态异常:', error);
      feedbackService.notify('更新失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  // 🗑️ 删除所有警报记录
  const handleDeleteAll = async () => {
    if (!window.confirm('确定要删除所有警报记录吗？此操作不可恢复！')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('delivery_alerts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录

      if (error) {
        console.error('删除失败:', error);
        feedbackService.notify('删除失败，请重试');
      } else {
        await logDeliveryAudit('delete', {
          target_id: 'all',
          target_name: 'delivery_alerts',
          action_description: '删除了所有配送警报记录',
        });
        loadAlerts();
        notifyAdminTodosRefresh();
        feedbackService.notify('所有警报已成功清除');
      }
    } catch (err) {
      console.error('删除异常:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 新增：导出 CSV 功能
  const handleExportCSV = () => {
    if (alerts.length === 0) return;
    
    const headers = [
      'ID', 'Time', 'Courier', 'PackageID', 'Type', 'Severity', 'Status', 'Distance(m)', 'Description'
    ];
    
    const rows = alerts.map(alert => [
      alert.id,
      new Date(alert.created_at).toLocaleString('zh-CN'),
      alert.courier_name,
      alert.package_id,
      getAlertTypeText(alert.alert_type),
      alert.severity,
      alert.status,
      alert.distance_from_destination?.toFixed(0) || '',
      alert.description.replace(/,/g, ' ')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `delivery_alerts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical':
        return t.critical;
      case 'high':
        return t.high;
      case 'medium':
        return t.medium;
      case 'low':
        return t.low;
      default:
        return severity;
    }
  };

  const getViolationTypeText = (alertType: string) => {
    switch (alertType) {
      case 'location_violation':
        return '位置异常';
      case 'delivery_confirmation':
        return '确认送达';
      case 'photo_violation':
        return '照片缺失';
      case 'time_violation':
        return '时间异常';
      case 'route_violation':
        return '路线偏差';
      default:
        return '其他记录';
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'rider_report':
        return '骑手申报';
      case 'location_violation':
        return '确认点过远';
      case 'delivery_confirmation':
        return '手动确认';
      case 'distance_violation':
        return '距离违规';
      case 'suspicious_location':
        return '可疑位置';
      case 'location_unavailable':
        return '位置不可用';
      case 'time_violation':
        return '时间异常';
      case 'no_photo':
        return '缺少照片';
      default:
        return type;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t.pending;
      case 'acknowledged':
        return language === 'en' ? 'Confirmed' : language === 'my' ? 'အတည်ပြုပြီး' : '已确认';
      case 'resolved':
        return t.resolved;
      case 'dismissed':
        return t.dismissed;
      default:
        return status;
    }
  };

  const statusChipClass = (status: string) => {
    if (status === 'pending') return 'da-chip da-chip--pending';
    if (status === 'acknowledged') return 'da-chip da-chip--ack';
    if (status === 'resolved') return 'da-chip da-chip--ok';
    return 'da-chip da-chip--mute';
  };

  const sevChipClass = (severity: string) => {
    if (severity === 'critical') return 'da-chip da-chip--critical';
    if (severity === 'high') return 'da-chip da-chip--high';
    if (severity === 'medium') return 'da-chip da-chip--medium';
    return 'da-chip da-chip--low';
  };


  return (
    <div className="admin-page da-page">
        <div className="admin-page-head">
          <div>
            <h1>
              {t.title}
              {isRegionalUser && (
                <span className="admin-page-head__region">{currentRegionPrefix}</span>
              )}
            </h1>
            <p>{t.subtitle}</p>
          </div>
          <div className="admin-page-actions">
            <button
              type="button"
              className="admin-shell__btn"
              onClick={handleBackToDashboard}
            >
              {t.backToDashboard}
            </button>
          </div>
        </div>

        <div className="da-metrics">
          <div className="finance-ov-card finance-ov-card--out">
            <div className="finance-ov-card__label">{t.criticalAlerts}</div>
            <div className="finance-ov-card__value">{realTimeStats.criticalAlerts}</div>
          </div>
          <div className="finance-ov-card finance-ov-card--pending">
            <div className="finance-ov-card__label">{t.pendingAlerts}</div>
            <div className="finance-ov-card__value">{realTimeStats.pendingAlerts}</div>
          </div>
          <div className="finance-ov-card finance-ov-card--platform">
            <div className="finance-ov-card__label">{t.totalAlerts}</div>
            <div className="finance-ov-card__value">{realTimeStats.totalAlerts}</div>
          </div>
          <div className="finance-ov-card finance-ov-card--net">
            <div className="finance-ov-card__label">{t.resolvedToday}</div>
            <div className="finance-ov-card__value">{realTimeStats.resolvedToday}</div>
          </div>
        </div>

        <div className="da-bar">
            <div className="da-field">
              <label htmlFor="da-filter-status">{t.filterByStatus}</label>
              <select
                id="da-filter-status"
                className="finance-cr-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">{t.all}</option>
                <option value="pending">{t.pending}</option>
                <option value="resolved">{t.resolved}</option>
                <option value="dismissed">{t.dismissed}</option>
              </select>
            </div>

            <div className="da-field">
              <label htmlFor="da-filter-sev">{t.filterBySeverity}</label>
              <select
                id="da-filter-sev"
                className="finance-cr-select"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="all">{t.all}</option>
                <option value="critical">{t.critical}</option>
                <option value="high">{t.high}</option>
                <option value="medium">{t.medium}</option>
                <option value="low">{t.low}</option>
              </select>
            </div>

            <div className="da-field da-field--search">
              <label htmlFor="da-search">
                {language === 'zh' ? '搜索骑手/包裹' : language === 'en' ? 'Search Courier/Package' : 'ရှာဖွေရန်'}
              </label>
              <input
                id="da-search"
                className="da-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'zh' ? '搜索姓名、ID...' : language === 'en' ? 'Search name, ID...' : 'ရှာဖွေရန်...'}
              />
            </div>

            <div className="da-tools">
            <button
              type="button"
              className={`admin-shell__btn${voiceEnabled ? ' admin-shell__btn--primary' : ''}`}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled
                ? (language === 'en' ? 'Voice on' : '语音开启')
                : (language === 'en' ? 'Voice off' : '语音关闭')}
            </button>

            <button
              type="button"
              className="admin-shell__btn"
              onClick={loadAlerts}
              disabled={loading}
            >
              {loading ? t.loading : t.refresh}
            </button>

            <button
              type="button"
              className="admin-shell__btn admin-shell__btn--danger"
              onClick={handleDeleteAll}
              disabled={loading}
            >
              {language === 'zh' ? '清空所有' : language === 'en' ? 'Clear All' : 'အားလုံးဖျက်မည်'}
            </button>

            <button
              type="button"
              className="admin-shell__btn"
              onClick={handleExportCSV}
              disabled={loading || alerts.length === 0}
            >
              {language === 'zh' ? '导出报表' : language === 'en' ? 'Export CSV' : 'အစီရင်ခံစာ ထုတ်ရန်'}
            </button>

            <button
              type="button"
              className="admin-shell__btn admin-shell__btn--primary"
              onClick={() => {
                const pendingIds = alerts.filter(a => a.status === 'pending').map(a => a.id);
                if (pendingIds.length > 0) {
                  if (window.confirm(`确定要批量确认 ${pendingIds.length} 个待处理警报吗？`)) {
                    handleBatchAction('acknowledge', pendingIds);
                  }
                } else {
                  feedbackService.notify('没有待处理的警报');
                }
              }}
              disabled={loading || alerts.filter(a => a.status === 'pending').length === 0}
            >
              {language === 'zh' ? '批量确认' : language === 'en' ? 'Bulk Acknowledge' : 'အစုလိုက်အတည်ပြုရန်'}
            </button>
            </div>
        </div>

        <div className="da-panel">
          {loading ? (
            <div className="da-empty">{t.loading}</div>
          ) : alerts.length === 0 ? (
            <div className="da-empty">
              {filter === 'pending' ? '暂无待处理警报' : '暂无警报记录'}
            </div>
          ) : (
            alerts.map((alert) => {
              const stats = getCourierViolationStats(alert.courier_id);
              return (
                <div
                  key={alert.id}
                  className={`da-item da-item--${alert.severity}${alert.status !== 'pending' ? ' is-done' : ''}`}
                  onClick={() => {
                    setSelectedAlert(alert);
                    setShowDetailModal(true);
                  }}
                >
                  <div>
                    <div className="da-item__chips">
                      <span className={sevChipClass(alert.severity)}>{getSeverityText(alert.severity)}</span>
                      <span className="da-chip da-chip--mute">{getViolationTypeText(alert.alert_type)}</span>
                      <span className={statusChipClass(alert.status)}>{getStatusText(alert.status)}</span>
                    </div>
                    <h3 className="da-item__title">{alert.title}</h3>
                    <p className="da-item__desc">
                      {alert.description.length > 200 ? alert.description.substring(0, 200) + '...' : alert.description}
                    </p>
                  </div>
                  <div className="da-item__side">
                    <div>{new Date(alert.created_at).toLocaleString('zh-CN')}</div>
                    <div>
                      <strong>{t.rider}:</strong> {alert.courier_name}
                    </div>
                    {stats.totalViolations > 0 && (
                      <span className={stats.criticalViolations > 0 ? 'da-chip da-chip--critical' : 'da-chip da-chip--warn'}>
                        {stats.totalViolations}{language === 'my' ? 'ကြိမ်ဖောက်ဖျက်မှု' : '次违规'} ({stats.totalPenaltyPoints}{language === 'my' ? 'မှတ်' : '分'})
                      </span>
                    )}
                    <div>
                      <strong>{language === 'my' ? 'ပစ္စည်း' : '包裹'}:</strong> {alert.package_id}
                    </div>
                    {alert.distance_from_destination ? (
                      <div className="da-dist">
                        {language === 'my' ? 'အကွာအဝေး' : '距离'}: {alert.distance_from_destination.toFixed(0)} {language === 'my' ? 'မီတာ' : '米'}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

      {showPackageDetail && selectedPackage && (
        <div
          className="admin-modal-scrim da-scrim--top"
          onClick={() => setShowPackageDetail(false)}
        >
          <div
            className="admin-modal da-modal"
            role="dialog"
            aria-labelledby="da-photo-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="da-photo-title">骑手拍照记录</h2>

            {loadingPhotos ? (
              <div className="da-empty">加载照片中...</div>
            ) : packagePhotos.length > 0 ? (
              <div className="da-photos">
                {packagePhotos.map((photo, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => window.open(photo, '_blank')}
                  >
                    <img src={photo} alt={`包裹照片 ${index + 1}`} />
                    <span>照片 {index + 1}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="da-empty">暂无照片记录</div>
            )}

            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-shell__btn"
                onClick={() => setShowPackageDetail(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedAlert && (
        <div
          className="admin-modal-scrim"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="admin-modal da-modal"
            role="dialog"
            aria-labelledby="da-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="da-detail-title">警报详情</h2>

            <div className="da-item__chips">
              <span className={sevChipClass(selectedAlert.severity)}>{getSeverityText(selectedAlert.severity)}</span>
              <span className="da-chip da-chip--mute">{getAlertTypeText(selectedAlert.alert_type)}</span>
              <span className={statusChipClass(selectedAlert.status)}>{getStatusText(selectedAlert.status)}</span>
            </div>

            <h3>{selectedAlert.title}</h3>
            <p className="da-desc">{selectedAlert.description}</p>

            <dl className="da-facts">
              <div>
                <dt>包裹编号</dt>
                <dd>{selectedAlert.package_id}</dd>
              </div>
              <div>
                <dt>骑手</dt>
                <dd>{selectedAlert.courier_name}</dd>
              </div>
              <div>
                <dt>尝试操作</dt>
                <dd>
                  {selectedAlert.action_attempted === 'mark_delivered' ? '标记已送达' : selectedAlert.action_attempted}
                </dd>
              </div>
              <div>
                <dt>创建时间</dt>
                <dd>{new Date(selectedAlert.created_at).toLocaleString('zh-CN')}</dd>
              </div>
              {selectedAlert.distance_from_destination ? (
                <div>
                  <dt>距离目标</dt>
                  <dd>{selectedAlert.distance_from_destination.toFixed(0)} 米</dd>
                </div>
              ) : null}
            </dl>

            {selectedAlert.courier_latitude && selectedAlert.courier_longitude ? (
              <div className="admin-modal__field">
                <label>位置信息</label>
                <div className="da-maps">
                  <div className="da-map">
                    <div className="da-map__label">骑手位置</div>
                    <div className="da-coords">
                      {selectedAlert.courier_latitude.toFixed(6)}, {selectedAlert.courier_longitude.toFixed(6)}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selectedAlert.courier_latitude},${selectedAlert.courier_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      在地图中查看
                    </a>
                  </div>
                  {selectedAlert.destination_latitude && selectedAlert.destination_longitude ? (
                    <div className="da-map">
                      <div className="da-map__label">收件地址</div>
                      <div className="da-coords">
                        {selectedAlert.destination_latitude.toFixed(6)}, {selectedAlert.destination_longitude.toFixed(6)}
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${selectedAlert.destination_latitude},${selectedAlert.destination_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        在地图中查看
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {selectedAlert.status === 'pending' && (
              <div className="admin-modal__field">
                <label htmlFor="da-resolution-notes">处理备注</label>
                <textarea
                  id="da-resolution-notes"
                  className="da-notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="输入处理备注..."
                />
              </div>
            )}

            {selectedAlert.resolution_notes ? (
              <div className="da-note">
                <strong>处理备注</strong>
                <p>{selectedAlert.resolution_notes}</p>
                {selectedAlert.resolved_by ? (
                  <p>
                    处理人: {selectedAlert.resolved_by}
                    {selectedAlert.resolved_at
                      ? ` · ${new Date(selectedAlert.resolved_at).toLocaleString('zh-CN')}`
                      : ''}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="da-modal-actions">
              <button
                type="button"
                className="admin-shell__btn"
                onClick={() => setShowDetailModal(false)}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="admin-shell__btn"
                onClick={() => handleViewPackageDetail(selectedAlert)}
              >
                {language === 'my' ? 'ဓာတ်ပုံမှတ်တမ်း' : '骑手拍照记录'}
              </button>
              <button
                type="button"
                className="admin-shell__btn admin-shell__btn--danger"
                onClick={() => handleCreateViolation(selectedAlert)}
              >
                {language === 'my' ? 'ဖောက်ဖျက်မှုမှတ်တမ်းပြုလုပ်ရန်' : '创建违规记录'}
              </button>
              <button
                type="button"
                className="admin-shell__btn"
                onClick={() => handleViewCourierViolations(selectedAlert.courier_id)}
              >
                {language === 'my' ? 'ဖောက်ဖျက်မှုသမိုင်း' : '违规历史'}
              </button>
              {selectedAlert.status === 'pending' ? (
                <>
                  <button
                    type="button"
                    className="admin-shell__btn admin-shell__btn--primary"
                    onClick={() => handleUpdateStatus(selectedAlert.id, 'acknowledged')}
                    disabled={processing}
                  >
                    {language === 'my' ? 'အတည်ပြုရန်' : '确认'}
                  </button>
                  <button
                    type="button"
                    className="admin-shell__btn admin-shell__btn--primary"
                    onClick={() => handleUpdateStatus(selectedAlert.id, 'resolved')}
                    disabled={processing}
                  >
                    {t.resolve}
                  </button>
                  <button
                    type="button"
                    className="admin-shell__btn"
                    onClick={() => handleUpdateStatus(selectedAlert.id, 'dismissed')}
                    disabled={processing}
                  >
                    {t.dismiss}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

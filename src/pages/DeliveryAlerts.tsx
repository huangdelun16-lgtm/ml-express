import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { deliveryAlertService } from '../services/deliveryAlertService';
import { sanitizeHtml, escapeHtml } from '../utils/xssSanitizer';
import { useLanguage } from '../contexts/LanguageContext';

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
  const [selectedAlert, setSelectedAlert] = useState<DeliveryAlert | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPackageDetail, setShowPackageDetail] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packagePhotos, setPackagePhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [realTimeStats, setRealTimeStats] = useState({
    totalAlerts: 0,
    criticalAlerts: 0,
    pendingAlerts: 0,
    resolvedToday: 0
  });
  
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
    
    // 设置实时订阅
    const subscription = supabase
      .channel('delivery_alerts_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_alerts'
        },
        (payload) => {
          loadAlerts(); // 重新加载警报
          updateRealTimeStats(); // 更新实时统计
          
          // 显示新警报通知
          if (payload.eventType === 'INSERT') {
            showNewAlertNotification(payload.new);
          }
        }
      )
      .subscribe();

    // 设置定时更新统计
    const statsInterval = setInterval(updateRealTimeStats, 60000); // 每60秒更新一次，优化性能

    return () => {
      subscription.unsubscribe();
      clearInterval(statsInterval);
    };
  }, [filter, severityFilter]);

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
        window.alert('创建违规记录失败，请重试');
        return false;
      }

      return true;
    } catch (error) {
      console.error('创建违规记录异常:', error);
      window.alert('创建违规记录失败，请重试');
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
      case 'low': return 1;
      case 'medium': return 3;
      case 'high': return 5;
      case 'critical': return 10;
      default: return 1;
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

  // 💾 保存违规记录
  const handleSaveViolation = async () => {
    if (!selectedAlert) return;

    setProcessing(true);
    try {
      const success = await createViolationRecord(selectedAlert);
      if (success) {
        // 记录操作日志
        await logAdminAction({
          action_type: 'create_violation',
          target_type: 'courier',
          target_id: selectedAlert.courier_id,
          target_name: selectedAlert.courier_name,
          action_description: `为骑手 ${selectedAlert.courier_name} 创建违规记录：${violationForm.violation_type}`,
          new_values: violationForm
        });

        // 更新警报状态
        await handleUpdateStatus(selectedAlert.id, 'resolved');
        setShowViolationModal(false);
        loadViolationRecords();
        window.alert('违规记录创建成功！');
      }
    } catch (error) {
      console.error('保存违规记录失败:', error);
    } finally {
      setProcessing(false);
    }
  };

  // 📝 记录管理员操作日志
  const logAdminAction = async (actionData: {
    action_type: string;
    target_type: string;
    target_id: string;
    target_name?: string;
    action_description: string;
    old_values?: any;
    new_values?: any;
  }) => {
    try {
      const logData = {
        admin_id: 'admin', // 可以从用户上下文获取
        admin_name: '管理员', // 可以从用户上下文获取
        ...actionData,
        ip_address: null, // 前端无法直接获取
        user_agent: navigator.userAgent
      };

      const { error } = await supabase
        .from('admin_audit_logs')
        .insert([logData]);

      if (error) {
        console.error('记录操作日志失败:', error);
      }
    } catch (error) {
      console.error('记录操作日志异常:', error);
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
    const severityEmoji: { [key: string]: string } = {
      'critical': '🚨',
      'high': '⚠️',
      'medium': '⚡',
      'low': 'ℹ️'
    };

    const alertTypeEmoji: { [key: string]: string } = {
      'distance_violation': '📍',
      'suspicious_location': '🔍',
      'location_unavailable': '📵',
      'time_violation': '⏰',
      'no_photo': '📸'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #dc2626 0%, #f87171 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    const severityIcon = severityEmoji[newAlert.severity as string] || '🚨';
    const alertTypeIcon = alertTypeEmoji[newAlert.alert_type as string] || '⚠️';
    
    // 使用安全的 HTML 设置（清理 XSS）
    const safeTitle = escapeHtml(newAlert.title || '');
    const safeCourierName = escapeHtml(newAlert.courier_name || '');
    notification.innerHTML = sanitizeHtml(`
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 24px;">${severityIcon}</div>
        <div>
          <div style="font-weight: 600; font-size: 16px;">新警报</div>
          <div style="font-size: 14px; opacity: 0.9;">${alertTypeIcon} ${safeTitle}</div>
          <div style="font-size: 12px; opacity: 0.8;">骑手: ${safeCourierName}</div>
        </div>
      </div>
    `);

    document.body.appendChild(notification);

    // 5秒后自动移除
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
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
        window.alert('批量处理失败，请重试');
        return;
      }

      loadAlerts();
      updateRealTimeStats();
      window.alert(`成功${action === 'acknowledge' ? '确认' : action === 'resolve' ? '解决' : '忽略'} ${alertIds.length} 个警报`);
    } catch (error) {
      console.error('批量处理异常:', error);
      window.alert('批量处理失败，请重试');
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
        window.alert('更新失败，请重试');
        return;
      }

      // 记录操作日志
      await logAdminAction({
        action_type: 'update_alert_status',
        target_type: 'alert',
        target_id: alertId,
        target_name: currentAlert?.title,
        action_description: `将警报状态从 ${currentAlert?.status} 更新为 ${newStatus}`,
        old_values: { status: currentAlert?.status },
        new_values: { status: newStatus, resolution_notes: resolutionNotes }
      });

      setShowDetailModal(false);
      setResolutionNotes('');
      loadAlerts();
      window.alert(`警报状态已更新为: ${newStatus}`);
    } catch (error) {
      console.error('更新警报状态异常:', error);
      window.alert('更新失败，请重试');
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
        window.alert('删除失败，请重试');
      } else {
        await logAdminAction({
          action_type: 'delete_all_alerts',
          target_type: 'system',
          target_id: 'all',
          action_description: '删除了所有配送警报记录'
        });
        loadAlerts();
        window.alert('所有警报已成功清除');
      }
    } catch (err) {
      console.error('删除异常:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc2626'; // 红色
      case 'high':
        return '#f59e0b'; // 橙色
      case 'medium':
        return '#eab308'; // 黄色
      case 'low':
        return '#3b82f6'; // 蓝色
      default:
        return '#6b7280'; // 灰色
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨 紧急';
      case 'high':
        return '⚠️ 高';
      case 'medium':
        return '⚡ 中';
      case 'low':
        return 'ℹ️ 低';
      default:
        return severity;
    }
  };

  // 获取违规类型文本
  const getViolationTypeText = (alertType: string) => {
    switch (alertType) {
      case 'location_violation':
        return '📍 位置异常';
      case 'delivery_confirmation':
        return '✅ 确认送达';
      case 'photo_violation':
        return '📸 照片缺失';
      case 'time_violation':
        return '⏰ 时间异常';
      case 'route_violation':
        return '🛣️ 路线偏差';
      default:
        return '⚠️ 其他记录';
    }
  };

  // 获取违规类型颜色
  const getViolationTypeColor = (alertType: string) => {
    switch (alertType) {
      case 'location_violation':
        return '#e53e3e'; // 红色 - 位置违规
      case 'delivery_confirmation':
        return '#38a169'; // 绿色 - 正常操作记录
      case 'photo_violation':
        return '#d69e2e'; // 黄色 - 照片违规
      case 'time_violation':
        return '#3182ce'; // 蓝色 - 时间违规
      case 'route_violation':
        return '#805ad5'; // 紫色 - 路线违规
      default:
        return '#718096'; // 灰色 - 其他
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'location_violation':
        return '📍 确认点过远';
      case 'delivery_confirmation':
        return '📱 手动确认';
      case 'distance_violation':
        return '📍 距离违规';
      case 'suspicious_location':
        return '🔍 可疑位置';
      case 'location_unavailable':
        return '📵 位置不可用';
      case 'time_violation':
        return '⏰ 时间异常';
      case 'no_photo':
        return '📸 缺少照片';
      default:
        return type;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳ 待处理';
      case 'acknowledged':
        return '👀 已确认';
      case 'resolved':
        return '✅ 已解决';
      case 'dismissed':
        return '❌ 已忽略';
      default:
        return status;
    }
  };

  const pendingCount = alerts.filter(a => a.status === 'pending').length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status === 'pending').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* 头部 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '2rem', color: '#1a202c', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  🚨 {t.title}
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
                <p style={{ margin: '8px 0 0 0', color: '#718096', fontSize: '1rem' }}>
                  {t.subtitle}
                </p>
              </div>
              
              {/* 返回仪表板按钮 */}
              <button
                onClick={handleBackToDashboard}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>← </span>
                <span>{t.backToDashboard}</span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {/* 实时统计卡片 */}
              <div style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
                color: 'white',
                padding: '16px 24px',
                borderRadius: '12px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{realTimeStats.criticalAlerts}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{t.criticalAlerts}</div>
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  background: '#10b981',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }}></div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                color: 'white',
                padding: '16px 24px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{realTimeStats.pendingAlerts}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{t.pendingAlerts}</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                color: 'white',
                padding: '16px 24px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{realTimeStats.totalAlerts}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{t.totalAlerts}</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                color: 'white',
                padding: '16px 24px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{realTimeStats.resolvedToday}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{t.resolvedToday}</div>
              </div>
            </div>
          </div>

          {/* 筛选器 */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#4a5568' }}>
                {t.filterByStatus}
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  fontSize: '1rem',
                  minWidth: '150px'
                }}
              >
                <option value="all" style={{ color: '#000' }}>{t.all}</option>
                <option value="pending" style={{ color: '#000' }}>{t.pending}</option>
                <option value="resolved" style={{ color: '#000' }}>{t.resolved}</option>
                <option value="dismissed" style={{ color: '#000' }}>{t.dismissed}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#4a5568' }}>
                {t.filterBySeverity}
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  fontSize: '1rem',
                  minWidth: '150px'
                }}
              >
                <option value="all" style={{ color: '#000' }}>{t.all}</option>
                <option value="critical" style={{ color: '#000' }}>{t.critical}</option>
                <option value="high" style={{ color: '#000' }}>{t.high}</option>
                <option value="medium" style={{ color: '#000' }}>{t.medium}</option>
                <option value="low" style={{ color: '#000' }}>{t.low}</option>
              </select>
            </div>

            <button
              onClick={loadAlerts}
              disabled={loading}
              style={{
                marginTop: '28px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              {loading ? t.loading : '🔄 ' + t.refresh}
            </button>

            <button
              onClick={handleDeleteAll}
              disabled={loading}
              style={{
                marginTop: '28px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1.5px solid #ef4444',
                background: 'white',
                color: '#ef4444',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#ef4444';
              }}
            >
              🗑️ {language === 'zh' ? '清空所有' : language === 'en' ? 'Clear All' : 'အားလုံးဖျက်မည်'}
            </button>
          </div>
        </div>

        {/* 警报列表 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '3rem' }}>⏳</div>
              <p style={{ color: '#718096', marginTop: '16px' }}>加载警报中...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '3rem' }}>✅</div>
              <p style={{ color: '#718096', marginTop: '16px', fontSize: '1.125rem' }}>
                {filter === 'pending' ? '暂无待处理警报' : '暂无警报记录'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    setSelectedAlert(alert);
                    setShowDetailModal(true);
                  }}
                  style={{
                    background: 'white',
                    border: `3px solid ${getSeverityColor(alert.severity)}`,
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: alert.status === 'pending' ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none',
                    opacity: alert.status === 'pending' ? 1 : 0.7
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = alert.status === 'pending' ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{
                          background: getSeverityColor(alert.severity),
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: 600
                        }}>
                          {getSeverityText(alert.severity)}
                        </span>
                        <span style={{
                          background: getViolationTypeColor(alert.alert_type),
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: 600
                        }}>
                          {getViolationTypeText(alert.alert_type)}
                        </span>
                        <span style={{
                          background: alert.status === 'pending' ? '#fef3c7' : '#e2e8f0',
                          color: alert.status === 'pending' ? '#92400e' : '#4a5568',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '0.875rem'
                        }}>
                          {getStatusText(alert.status)}
                        </span>
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#1a202c' }}>
                        {alert.title}
                      </h3>
                      <p style={{ margin: 0, color: '#4a5568', fontSize: '0.9375rem', whiteSpace: 'pre-line' }}>
                        {alert.description.length > 200 ? alert.description.substring(0, 200) + '...' : alert.description}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '200px' }}>
                      <div style={{ fontSize: '0.875rem', color: '#718096' }}>
                        {new Date(alert.created_at).toLocaleString('zh-CN')}
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '0.875rem', color: '#4a5568' }}>
                        <strong>{t.rider}:</strong> {alert.courier_name}
                        {(() => {
                          const stats = getCourierViolationStats(alert.courier_id);
                          if (stats.totalViolations > 0) {
                            return (
                              <span style={{ 
                                marginLeft: '8px', 
                                padding: '2px 6px', 
                                backgroundColor: stats.criticalViolations > 0 ? '#e53e3e' : '#d69e2e',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '10px'
                              }}>
                                ⚠️ {stats.totalViolations}{language === 'my' ? 'ကြိမ်ဖောက်ဖျက်မှု' : '次违规'} ({stats.totalPenaltyPoints}{language === 'my' ? 'မှတ်' : '分'})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '0.875rem', color: '#4a5568' }}>
                        <strong>{language === 'my' ? 'ပစ္စည်း' : '包裹'}:</strong> {alert.package_id}
                      </div>
                      {alert.distance_from_destination && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px',
                          background: '#fee2e2',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          color: '#991b1b',
                          fontWeight: 600
                        }}>
                          {language === 'my' ? 'အကွာအဝေး' : '距离'}: {alert.distance_from_destination.toFixed(0)} {language === 'my' ? 'မီတာ' : '米'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 包裹详情模态框 */}
      {showPackageDetail && selectedPackage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '24px'
          }}
          onClick={() => setShowPackageDetail(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px 0', color: '#1a202c' }}>
              📸 骑手拍照记录
            </h2>
            
            {loadingPhotos ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '2rem' }}>⏳</div>
                <p style={{ color: '#718096', marginTop: '8px' }}>加载照片中...</p>
              </div>
            ) : packagePhotos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {packagePhotos.map((photo, index) => (
                  <div key={index} style={{ textAlign: 'center' }}>
                    <img
                      src={photo}
                      alt={`包裹照片 ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '2px solid #e2e8f0',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(photo, '_blank')}
                    />
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#4a5568' }}>
                      照片 {index + 1}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', background: '#f7fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem' }}>📷</div>
                <p style={{ color: '#718096', marginTop: '8px' }}>暂无照片记录</p>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPackageDetail(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  color: '#4a5568',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetailModal && selectedAlert && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px 0', color: '#1a202c' }}>
              警报详情
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  background: getSeverityColor(selectedAlert.severity),
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600
                }}>
                  {getSeverityText(selectedAlert.severity)}
                </span>
                <span style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  padding: '8px 16px',
                  borderRadius: '8px'
                }}>
                  {getAlertTypeText(selectedAlert.alert_type)}
                </span>
                <span style={{
                  background: selectedAlert.status === 'pending' ? '#fef3c7' : '#e2e8f0',
                  color: selectedAlert.status === 'pending' ? '#92400e' : '#4a5568',
                  padding: '8px 16px',
                  borderRadius: '8px'
                }}>
                  {getStatusText(selectedAlert.status)}
                </span>
              </div>

              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.5rem', color: '#1a202c' }}>
                {selectedAlert.title}
              </h3>
              <p style={{ margin: '0 0 24px 0', color: '#4a5568', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                {selectedAlert.description}
              </p>

              <div style={{ background: '#f7fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <strong style={{ color: '#4a5568' }}>包裹编号:</strong>
                    <div style={{ marginTop: '4px', color: '#1a202c' }}>{selectedAlert.package_id}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#4a5568' }}>骑手:</strong>
                    <div style={{ marginTop: '4px', color: '#1a202c' }}>{selectedAlert.courier_name}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#4a5568' }}>尝试操作:</strong>
                    <div style={{ marginTop: '4px', color: '#1a202c' }}>
                      {selectedAlert.action_attempted === 'mark_delivered' ? '标记已送达' : selectedAlert.action_attempted}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: '#4a5568' }}>创建时间:</strong>
                    <div style={{ marginTop: '4px', color: '#1a202c' }}>
                      {new Date(selectedAlert.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  {selectedAlert.distance_from_destination && (
                    <div>
                      <strong style={{ color: '#4a5568' }}>距离目标:</strong>
                      <div style={{ marginTop: '4px', color: '#dc2626', fontWeight: 600, fontSize: '1.125rem' }}>
                        {selectedAlert.distance_from_destination.toFixed(0)} 米
                      </div>
                    </div>
                  )}
                </div>

                {selectedAlert.courier_latitude && selectedAlert.courier_longitude && (
                  <div style={{ marginTop: '16px' }}>
                    <strong style={{ color: '#4a5568' }}>位置信息:</strong>
                    <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '4px' }}>骑手位置</div>
                        <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#1a202c' }}>
                          {selectedAlert.courier_latitude.toFixed(6)}, {selectedAlert.courier_longitude.toFixed(6)}
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${selectedAlert.courier_latitude},${selectedAlert.courier_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.875rem', color: '#3b82f6', marginTop: '4px', display: 'inline-block' }}
                        >
                          📍 在地图中查看
                        </a>
                      </div>
                      {selectedAlert.destination_latitude && selectedAlert.destination_longitude && (
                        <div style={{ background: 'white', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '4px' }}>收件地址</div>
                          <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#1a202c' }}>
                            {selectedAlert.destination_latitude.toFixed(6)}, {selectedAlert.destination_longitude.toFixed(6)}
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${selectedAlert.destination_latitude},${selectedAlert.destination_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.875rem', color: '#3b82f6', marginTop: '4px', display: 'inline-block' }}
                          >
                            📍 在地图中查看
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedAlert.status === 'pending' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#4a5568' }}>
                    处理备注:
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="输入处理备注..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #e2e8f0',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {selectedAlert.resolution_notes && (
                <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                  <strong style={{ color: '#166534' }}>处理备注:</strong>
                  <p style={{ margin: '8px 0 0 0', color: '#15803d' }}>{selectedAlert.resolution_notes}</p>
                  {selectedAlert.resolved_by && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#16a34a' }}>
                      处理人: {selectedAlert.resolved_by} | 时间: {selectedAlert.resolved_at ? new Date(selectedAlert.resolved_at).toLocaleString('zh-CN') : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  color: '#4a5568',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleViewPackageDetail(selectedAlert)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>📸</span>
                <span>{language === 'my' ? 'ဓာတ်ပုံမှတ်တမ်း' : '骑手拍照记录'}</span>
              </button>
              
              <button
                onClick={() => handleCreateViolation(selectedAlert)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#e53e3e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚠️</span>
                <span>{language === 'my' ? 'ဖောက်ဖျက်မှုမှတ်တမ်းပြုလုပ်ရန်' : '创建违规记录'}</span>
              </button>
              
              <button
                onClick={() => handleViewCourierViolations(selectedAlert.courier_id)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#d69e2e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>📋</span>
                <span>{language === 'my' ? 'ဖောက်ဖျက်မှုသမိုင်း' : '违规历史'}</span>
              </button>
              
              {selectedAlert.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedAlert.id, 'acknowledged')}
                    disabled={processing}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                      color: 'white',
                      fontSize: '1rem',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      fontWeight: 500
                    }}
                  >
                    👀 {language === 'my' ? 'အတည်ပြုရန်' : '确认'}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAlert.id, 'resolved')}
                    disabled={processing}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                      color: 'white',
                      fontSize: '1rem',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      fontWeight: 500
                    }}
                  >
                    ✅ {t.resolve}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAlert.id, 'dismissed')}
                    disabled={processing}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                      color: 'white',
                      fontSize: '1rem',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      fontWeight: 500
                    }}
                  >
                    ❌ {t.dismiss}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS 动画样式 */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
}


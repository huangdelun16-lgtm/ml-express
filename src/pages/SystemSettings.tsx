import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SystemSetting, systemSettingsService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import SecurityVerificationModal from '../components/SecurityVerificationModal';

type SettingCategory = 'general' | 'pricing' | 'notification' | 'automation' | 'tracking' | 'security';

type SettingFieldType = 'text' | 'number' | 'textarea' | 'switch' | 'select';

interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  category: SettingCategory;
  type: SettingFieldType;
  defaultValue: string | number | boolean;
  placeholder?: string;
  suffix?: string;
  options?: Array<{ label: string; value: string }>;
  helpText?: string;
}

type SettingValue = string | number | boolean;

const settingDefinitions: SettingDefinition[] = [
  {
    key: 'company.name',
    label: '公司名称',
    description: '用于系统展示、通知模板和对外显示的公司全称。',
    category: 'general',
    type: 'text',
    defaultValue: 'Market Link Express',
    placeholder: 'Market Link Express'
  },
  {
    key: 'company.contact_phone',
    label: '客服电话',
    description: '接收客户咨询和紧急联系的电话号码。',
    category: 'general',
    type: 'text',
    defaultValue: '(+95) 09788848928 / (+95) 09941118588 / (+95) 09941118688',
    placeholder: '(+95) 09788848928 / (+95) 09941118588 / (+95) 09941118688'
  },
  {
    key: 'company.contact_email',
    label: '客服邮箱',
    description: '对外提供的服务邮箱地址，用于系统通知和邮件提醒。',
    category: 'general',
    type: 'text',
    defaultValue: 'marketlink982@gmail.com',
    placeholder: 'marketlink982@gmail.com'
  },
  {
    key: 'service.operation_hours',
    label: '营业时间',
    description: '展示在客户端的营业时间说明，可设置多段时间。',
    category: 'general',
    type: 'textarea',
    defaultValue: '周一至周日 08:00 - 22:00\n节假日 09:00 - 18:00',
    placeholder: '周一至周日 08:00 - 22:00'
  },
  {
    key: 'service.support_channels',
    label: '客服渠道',
    description: '列出客户可使用的客服渠道，例如电话、邮件、即时聊天等。',
    category: 'general',
    type: 'textarea',
    defaultValue: '电话热线\n官方邮箱\nMessenger 即时聊天',
    placeholder: '电话热线\n官方邮箱\n即时聊天'
  },
  {
    key: 'pricing.base_fee',
    label: '基础起步价 (MMK)',
    description: '所有订单的基础费用，适用于首公里或首重。',
    category: 'pricing',
    type: 'number',
    defaultValue: 1500,
    suffix: 'MMK'
  },
  {
    key: 'pricing.per_km_fee',
    label: '每公里费用 (MMK)',
    description: '超出基础里程后的每公里计费标准。',
    category: 'pricing',
    type: 'number',
    defaultValue: 250,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.weight_surcharge',
    label: '超重附加费',
    description: '当包裹超过默认重量阈值时，每公斤额外增加的费用。',
    category: 'pricing',
    type: 'number',
    defaultValue: 150,
    suffix: 'MMK/公斤'
  },
  {
    key: 'pricing.urgent_surcharge',
    label: '急送达附加费',
    description: '选择急送达配送方式时额外收取的固定费用。',
    category: 'pricing',
    type: 'number',
    defaultValue: 500,
    suffix: 'MMK'
  },
  {
    key: 'pricing.oversize_surcharge',
    label: '超规附加费',
    description: '当包裹尺寸超过标准规格时，每公里额外增加的费用。',
    category: 'pricing',
    type: 'number',
    defaultValue: 300,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.scheduled_surcharge',
    label: '定时达附加费',
    description: '选择定时达配送方式时额外收取的预约服务费。',
    category: 'pricing',
    type: 'number',
    defaultValue: 200,
    suffix: 'MMK'
  },
  {
    key: 'pricing.fragile_surcharge',
    label: '易碎品附加费',
    description: '运输易碎物品时收取的额外保护和小心处理费用，按距离计算（MMK/公里）。',
    category: 'pricing',
    type: 'number',
    defaultValue: 300,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.food_beverage_surcharge',
    label: '食品和饮料附加费',
    description: '配送食品和饮料类包裹时，每公里额外增加的费用。',
    category: 'pricing',
    type: 'number',
    defaultValue: 300,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.free_km_threshold',
    label: '免费公里数',
    description: '订单在该距离内免收每公里费用，用于新用户或促销活动。',
    category: 'pricing',
    type: 'number',
    defaultValue: 3,
    suffix: '公里'
  },
  {
    key: 'pricing.courier_km_rate',
    label: '骑手配送费 (MMK/KM)',
    description: '结算给骑手的配送提成，按每公里送货距离计算。',
    category: 'pricing',
    type: 'number',
    defaultValue: 500,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.delivery_bonus_rate',
    label: '每单配送奖金 (MMK/单)',
    description: '每完成一笔配送订单给予骑手的额外奖金。如果设置为 0 则代表不发放配送奖金。',
    category: 'pricing',
    type: 'number',
    defaultValue: 1000,
    suffix: 'MMK/单'
  },
  {
    key: 'notification.sms_enabled',
    label: '启用短信通知',
    description: '开启后将在订单状态变更时向客户发送短信提醒。',
    category: 'notification',
    type: 'switch',
    defaultValue: true
  },
  {
    key: 'notification.email_enabled',
    label: '启用邮件通知',
    description: '开启后将在重要事件（如配送异常、财务提醒）时发送邮件通知。',
    category: 'notification',
    type: 'switch',
    defaultValue: true
  },
  {
    key: 'notification.customer_template',
    label: '客户通知模板',
    description: '支持变量 {{order_id}}、{{status}}、{{eta}} 用于自动替换。',
    category: 'notification',
    type: 'textarea',
    defaultValue: '您好，您的订单 {{order_id}} 当前状态更新为：{{status}}，预计送达时间 {{eta}}。',
    helpText: '可用变量：{{order_id}}、{{status}}、{{eta}}'
  },
  {
    key: 'notification.internal_template',
    label: '内部通知模板',
    description: '给运营或客服团队的提醒内容，支持 {{courier}}、{{event}}、{{time}} 变量。',
    category: 'notification',
    type: 'textarea',
    defaultValue: '快递员 {{courier}} 触发事件：{{event}}，时间 {{time}}。请及时关注。',
    helpText: '可用变量：{{courier}}、{{event}}、{{time}}'
  },
  {
    key: 'automation.auto_assign_strategy',
    label: '自动派单策略',
    description: '根据距离、评分或工作量自动选择快递员。',
    category: 'automation',
    type: 'select',
    defaultValue: 'distance_first',
    options: [
      { label: '距离优先', value: 'distance_first' },
      { label: '评分优先', value: 'rating_first' },
      { label: '工作量均衡', value: 'workload_balance' }
    ]
  },
  {
    key: 'automation.auto_dispatch_enabled',
    label: '启用自动派单',
    description: '开启后系统会在创建订单后自动根据策略分配快递员。',
    category: 'automation',
    type: 'switch',
    defaultValue: true
  },
  {
    key: 'automation.max_active_orders',
    label: '单个快递员最大活跃订单数',
    description: '避免快递员负载过高，超过该阈值则不会再分配新订单。',
    category: 'automation',
    type: 'number',
    defaultValue: 12
  },
  {
    key: 'automation.reassign_timeout_minutes',
    label: '自动改派超时时间 (分钟)',
    description: '当快递员在指定时间内未接受订单时，系统自动改派。',
    category: 'automation',
    type: 'number',
    defaultValue: 8,
    suffix: '分钟'
  },
  {
    key: 'tracking.refresh_interval_seconds',
    label: '定位刷新间隔 (秒)',
    description: '前端地图界面刷新快递员位置的时间间隔。',
    category: 'tracking',
    type: 'number',
    defaultValue: 15,
    suffix: '秒'
  },
  {
    key: 'tracking.map_theme',
    label: '地图主题',
    description: '可根据运营需求切换不同的地图配色。',
    category: 'tracking',
    type: 'select',
    defaultValue: 'dark',
    options: [
      { label: '暗色主题', value: 'dark' },
      { label: '浅色主题', value: 'light' },
      { label: '卫星图', value: 'satellite' }
    ]
  },
  {
    key: 'tracking.route_prediction_enabled',
    label: '启用路线预测',
    description: '开启后结合历史轨迹推测 ETA，适合高并发场景。',
    category: 'tracking',
    type: 'switch',
    defaultValue: false
  },
  {
    key: 'tracking.webhook_push_enabled',
    label: '推送第三方 Webhook',
    description: '将实时位置信息推送至第三方系统，例如 BI 数据平台。',
    category: 'tracking',
    type: 'switch',
    defaultValue: false
  },
  {
    key: 'security.session_timeout_minutes',
    label: '会话超时时间',
    description: '管理员长时间无操作后自动登出，提升安全性。',
    category: 'security',
    type: 'number',
    defaultValue: 45,
    suffix: '分钟'
  },
  {
    key: 'security.failed_login_limit',
    label: '连续登录失败限制',
    description: '当同一账号连续失败达到该次数后触发锁定机制。',
    category: 'security',
    type: 'number',
    defaultValue: 5,
    suffix: '次'
  },
  {
    key: 'security.audit_log_retention_days',
    label: '审计日志保留天数',
    description: '系统保留后台操作日志的时间，用于追踪问题。',
    category: 'security',
    type: 'number',
    defaultValue: 90,
    suffix: '天'
  },
  {
    key: 'security.ip_whitelist_enabled',
    label: '启用后台 IP 白名单',
    description: '开启后仅允许配置的 IP 地址访问管理后台。',
    category: 'security',
    type: 'switch',
    defaultValue: false
  },
  {
    key: 'security.ip_whitelist',
    label: '后台访问白名单 IP',
    description: '每行一个 IP 或 CIDR 段，启用白名单后只有这些地址可访问后台。',
    category: 'security',
    type: 'textarea',
    defaultValue: '',
    placeholder: '192.168.0.1\n203.0.113.0/24',
    helpText: '支持 IPv4、IPv6，CIDR 段示例：203.0.113.0/24'
  }
];

const categories: Array<{ id: SettingCategory; name: string; description: string; icon: string }> = [
  { id: 'general', name: '基础信息', description: '公司信息、营业时间与客服渠道配置', icon: '🏢' },
  { id: 'pricing', name: '计费规则', description: '配送价格、附加费与优惠策略', icon: '💸' },
  { id: 'notification', name: '通知中心', description: '短信、邮件通知开关与模板', icon: '🔔' },
  { id: 'automation', name: '自动化', description: '派单策略、超时改派等自动化流程', icon: '🤖' },
  { id: 'tracking', name: '实时跟踪', description: '地图刷新、路线预测与数据推送', icon: '🗺️' },
  { id: 'security', name: '安全与合规', description: '后台安全策略与访问控制', icon: '🛡️' }
];

const REGIONS = [
  { id: 'mandalay', name: '曼德勒', prefix: 'MDY' },
  { id: 'maymyo', name: '彬乌伦', prefix: 'POL' },
  { id: 'yangon', name: '仰光', prefix: 'YGN' },
  { id: 'naypyidaw', name: '内比都', prefix: 'NPW' },
  { id: 'taunggyi', name: '东枝', prefix: 'TGI' },
  { id: 'lashio', name: '腊戌', prefix: 'LSO' },
  { id: 'muse', name: '木姐', prefix: 'MUSE' }
];

const SystemSettings: React.FC = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingCategory>('general');
  const [selectedRegion, setSelectedRegion] = useState<string>('mandalay');
  const { isMobile, isTablet, isDesktop, width } = useResponsive();

  const [loading, setLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [settingsMetadata, setSettingsMetadata] = useState<Record<string, { updated_at?: string | null; updated_by?: string | null }>>({});
  const [showVerificationModal, setShowVerificationModal] = useState(false); // 🚀 新增：安全验证弹窗

  const definitionMap = useMemo(() => {
    const map: Record<string, SettingDefinition> = {};
    settingDefinitions.forEach(def => {
      map[def.key] = def;
    });
    return map;
  }, []);

  const defaultValues = useMemo(() => {
    const initial: Record<string, SettingValue> = {};
    settingDefinitions.forEach(def => {
      initial[def.key] = def.defaultValue;
    });
    return initial;
  }, []);

  const [settingsValues, setSettingsValues] = useState<Record<string, SettingValue>>({ ...defaultValues });

  const applyIncomingSettings = useCallback((incoming: SystemSetting[]) => {
    const mergedValues: Record<string, SettingValue> = { ...defaultValues };
    const metadata: Record<string, { updated_at?: string | null; updated_by?: string | null }> = {};

    incoming.forEach(setting => {
      let def = definitionMap[setting.settings_key];
      let settingsKey = setting.settings_key;

      // 特殊处理计费规则的领区化 Key
      if (setting.settings_key.startsWith('pricing.')) {
        // 如果是类似 pricing.mandalay.base_fee 这种
        const parts = setting.settings_key.split('.');
        if (parts.length === 3) {
          const region = parts[1];
          const actualKey = `pricing.${parts[2]}`;
          if (region === selectedRegion) {
            def = definitionMap[actualKey];
            settingsKey = actualKey; // 使用不带区域的 key 作为内部状态的 key
          } else {
            return; // 忽略非当前选中区域的设置
          }
        } else {
          // 原始的 pricing.base_fee，作为所有领区的默认回退值
          // 只有当 mergedValues 中还没有设置值时才应用
          if (mergedValues[setting.settings_key] === definitionMap[setting.settings_key]?.defaultValue) {
            def = definitionMap[setting.settings_key];
          } else {
            return;
          }
        }
      }

      if (!def) return;

      let rawValue = setting.settings_value;

      if (rawValue && typeof rawValue === 'object' && 'value' in rawValue) {
        rawValue = (rawValue as any).value;
      }

      if (settingsKey === 'security.ip_whitelist' && Array.isArray(rawValue)) {
        mergedValues[settingsKey] = (rawValue as string[]).join('\n');
      } else if (def.type === 'switch') {
        mergedValues[settingsKey] = Boolean(rawValue);
      } else if (def.type === 'number') {
        const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
        mergedValues[settingsKey] = Number.isFinite(numericValue) ? numericValue : Number(def.defaultValue);
      } else if ((def.type === 'text' || def.type === 'select') && rawValue !== undefined && rawValue !== null) {
        mergedValues[settingsKey] = String(rawValue);
      } else if (def.type === 'textarea' && rawValue !== undefined && rawValue !== null) {
        mergedValues[settingsKey] = String(rawValue);
      }

      metadata[settingsKey] = {
        updated_at: setting.updated_at,
        updated_by: setting.updated_by
      };
    });

    setSettingsValues(mergedValues);
    setSettingsMetadata(metadata);
    setHasChanges(false);
  }, [defaultValues, definitionMap, selectedRegion]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await systemSettingsService.getAllSettings();
      applyIncomingSettings(data);
      if (data.length > 0) {
        setLastSavedAt(
          data
            .map(item => item.updated_at)
            .filter(Boolean)
            .sort()
            .reverse()[0] || null
        );
      }
    } catch (error) {
      console.error('加载系统设置失败', error);
      setErrorMessage('加载系统设置失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [applyIncomingSettings]);

  useEffect(() => {
    document.title = '系统设置 | 管理后台';
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleValueChange = (key: string, value: SettingValue) => {
    setSettingsValues(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    // 🚀 安全优化：修改计费规则时需要二次验证
    if (activeTab === 'pricing') {
      setShowVerificationModal(true);
      return;
    }
    
    // 执行实际保存
    await executeSave();
  };

  /**
   * 实际执行保存逻辑
   */
  const executeSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload: Array<Omit<SystemSetting, 'id'>> = [];

    for (const def of settingDefinitions) {
      const rawValue = settingsValues[def.key];
      let parsedValue: any = rawValue;

      if (def.type === 'number') {
        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) {
          setErrorMessage(`字段“${def.label}”需要填写数字。`);
          setSaving(false);
          return;
        }
        parsedValue = numeric;
      }

      if (def.type === 'switch') {
        parsedValue = Boolean(rawValue);
      }

      if (def.key === 'security.ip_whitelist') {
        const text = String(rawValue || '').trim();
        parsedValue = text.length === 0 ? [] : text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      }

      // 如果是计费规则，保存带区域前缀的 key
      let settingsKey = def.key;
      if (def.category === 'pricing') {
        settingsKey = `pricing.${selectedRegion}.${def.key.replace('pricing.', '')}`;
      }

      payload.push({
        category: def.category,
        settings_key: settingsKey,
        settings_value: parsedValue,
        description: def.description,
        updated_by: 'admin-dashboard'
      });
    }

    const ok = await systemSettingsService.upsertSettings(payload);

    if (!ok) {
      setErrorMessage('保存失败，请检查网络或稍后重试。');
      setSaving(false);
      return;
    }

    setSuccessMessage('设置已保存。');
    setHasChanges(false);
    setSaving(false);
    setLastSavedAt(new Date().toISOString());
    loadSettings();
  };

  const currentDefinitions = useMemo(
    () => settingDefinitions.filter(def => def.category === activeTab),
    [activeTab]
  );

  const renderInput = (def: SettingDefinition) => {
    const value = settingsValues[def.key];

    const baseInputStyle: React.CSSProperties = {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'rgba(15, 32, 60, 0.55)',
      color: 'white',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'border 0.2s ease, box-shadow 0.2s ease'
    };

    if (def.type === 'textarea') {
      return (
        <textarea
          value={String(value ?? '')}
          placeholder={def.placeholder}
          rows={4}
          onChange={event => handleValueChange(def.key, event.target.value)}
          style={{
            ...baseInputStyle,
            resize: 'vertical',
            minHeight: '120px',
            lineHeight: '1.6'
          }}
        />
      );
    }

    if (def.type === 'switch') {
      const checked = Boolean(value);
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <div
            style={{
              width: '54px',
              height: '28px',
              borderRadius: '16px',
              background: checked ? 'rgba(72, 187, 120, 0.8)' : 'rgba(255,255,255,0.2)',
              position: 'relative',
              transition: 'all 0.3s ease'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '3px',
                left: checked ? '28px' : '3px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'white',
                transition: 'all 0.3s ease'
              }}
            ></div>
            <input
              type="checkbox"
              checked={checked}
              onChange={event => handleValueChange(def.key, event.target.checked)}
              style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%' }}
            />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>{checked ? '已启用' : '已关闭'}</span>
        </label>
      );
    }

    if (def.type === 'select' && def.options) {
      return (
        <select
          value={String(value ?? '')}
          onChange={event => handleValueChange(def.key, event.target.value)}
          style={{
            ...baseInputStyle,
            appearance: 'none',
            WebkitAppearance: 'none' as any,
            MozAppearance: 'none' as any,
            background: 'rgba(15, 32, 60, 0.55)',
            paddingRight: '36px'
          }}
        >
          {def.options.map(option => (
            <option key={option.value} value={option.value} style={{ color: '#0f203c' }}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={def.type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        placeholder={def.placeholder}
        onChange={event => handleValueChange(def.key, def.type === 'number' ? event.target.value : event.target.value)}
        style={baseInputStyle}
      />
    );
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return '尚未更新';
    try {
      return new Date(value).toLocaleString('zh-CN');
    } catch (error) {
      return value;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        padding: isMobile ? '12px' : '20px',
        fontFamily: 'Segoe UI, Arial, sans-serif'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          color: 'white'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 700 }}>系统设置中心</h1>
          <p style={{ margin: '6px 0 0 0', opacity: 0.85 }}>统一管理计费规则、通知策略、自动化流程与安全策略</p>
          {lastSavedAt && (
            <span style={{ marginTop: '8px', display: 'inline-block', fontSize: '0.9rem', opacity: 0.75 }}>
              最近保存时间：{formatTimestamp(lastSavedAt)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '10px 18px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            ← 返回仪表板
          </button>
          <button
            onClick={loadSettings}
            disabled={loading || saving}
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: loading || saving ? 'not-allowed' : 'pointer',
              opacity: loading || saving ? 0.6 : 1
            }}
          >
            重新加载
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{
              background: hasChanges ? 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)' : 'rgba(72, 187, 120, 0.35)',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '10px',
              cursor: !hasChanges || saving ? 'not-allowed' : 'pointer',
              boxShadow: hasChanges ? '0 8px 20px rgba(56, 161, 105, 0.35)' : 'none',
              transition: 'all 0.3s ease',
              opacity: saving ? 0.75 : 1
            }}
          >
            {saving ? '保存中...' : '保存所有更改'}
          </button>
        </div>
      </div>

      {(errorMessage || successMessage) && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.25)',
            background: errorMessage ? 'rgba(245, 101, 101, 0.2)' : 'rgba(72, 187, 120, 0.2)',
            color: 'white'
          }}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: isMobile ? '12px' : '24px' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(40px)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            maxHeight: 'calc(100vh - 160px)',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚙️</div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '800' }}>设置分类</h2>
            </div>
            <p style={{ opacity: 0.6, fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
              按模块管理系统参数，实时同步生效。
            </p>
          </div>
          
          {/* 快捷功能入口 - 优化视觉效果 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => navigate('/admin/accounts')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '16px',
                padding: '12px 16px',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
                e.currentTarget.style.transform = 'translateX(5px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ width: '40px', height: '40px', background: 'rgba(139, 92, 246, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>👥</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>账号管理</div>
                <div style={{ opacity: 0.5, fontSize: '0.75rem' }}>登录账号与权限</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/supervision')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '16px',
                padding: '12px 16px',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                e.currentTarget.style.transform = 'translateX(5px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ width: '40px', height: '40px', background: 'rgba(239, 68, 68, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>👁️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>员工监督</div>
                <div style={{ opacity: 0.5, fontSize: '0.75rem' }}>操作日志与监控</div>
              </div>
            </button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
            <p style={{ opacity: 0.4, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '8px' }}>系统核心配置</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.map(category => {
                const isActive = activeTab === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveTab(category.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: isActive ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.2) 100%)' : 'transparent',
                      border: isActive ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      }
                    }}
                  >
                    <span style={{ fontSize: '1.4rem', filter: isActive ? 'none' : 'grayscale(0.5) opacity(0.7)' }}>{category.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: isActive ? 800 : 600, fontSize: '0.95rem', display: 'block' }}>{category.name}</span>
                      {isActive && (
                        <span style={{ opacity: 0.6, fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>{category.description.slice(0, 15)}...</span>
                      )}
                    </div>
                    {isActive && (
                      <div style={{ width: '4px', height: '20px', background: '#3b82f6', borderRadius: '2px', position: 'absolute', right: '12px' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(40px)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            minHeight: 'calc(100vh - 160px)',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '18px', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '2.4rem',
                boxShadow: '0 8px 20px rgba(30, 64, 175, 0.3)',
                border: '2px solid rgba(255,255,255,0.2)'
              }}>
                {categories.find(category => category.id === activeTab)?.icon}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'white', letterSpacing: '0.5px' }}>
                  {categories.find(category => category.id === activeTab)?.name || '系统设置'}
                </h2>
                <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '1rem', fontWeight: '500' }}>
                  {categories.find(category => category.id === activeTab)?.description}
                </p>
              </div>
            </div>

            {/* 计费规则专属：领区选择器 */}
            {activeTab === 'pricing' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                {lastSavedAt && (
                  <div style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 600 }}>
                    最后修改时间：{formatTimestamp(lastSavedAt)}
                  </div>
                )}
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.08)', 
                  padding: '12px 20px', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    领区中心
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setHasChanges(false); 
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(15, 32, 60, 0.8)',
                      color: 'white',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {REGIONS.map(r => (
                      <option key={r.id} value={r.id} style={{ color: '#000' }}>
                        {r.name} ({r.prefix})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
              <div>正在加载配置...</div>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '24px' 
            }}>
              {currentDefinitions.map(def => {
                const metadata = settingsMetadata[def.key];
                
                // 支持多语言覆盖
                let displayLabel = def.label;
                let displayDesc = def.description;

                return (
                  <div
                    key={def.key}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '24px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{displayLabel}</h3>
                        <p style={{ margin: '4px 0 0 0', opacity: 0.5, fontSize: '0.88rem', lineHeight: 1.5 }}>{displayDesc}</p>
                      </div>
                      {def.suffix && def.type !== 'switch' && (
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6' }}>
                          {def.suffix}
                        </div>
                      )}
                    </div>

                    <div>
                      {renderInput(def)}
                    </div>

                    {(def.helpText) && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        {def.helpText ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                            <span>💡</span>
                            <span>{def.helpText}</span>
                          </div>
                        ) : <div />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 安全验证弹窗 */}
      <SecurityVerificationModal 
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerifySuccess={executeSave}
        title="修改计费规则验证"
        description="修改计费规则将直接影响全平台的运费计算，请验证您的管理员密码以确认此操作。"
      />
    </div>
  );
};

export default SystemSettings;



import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemSetting, systemSettingsService } from '../services/supabase';
import SecurityVerificationModal from '../components/SecurityVerificationModal';
import '../styles/adminSystemSettings.css';

type SettingCategory = 'general' | 'pricing' | 'notification' | 'automation' | 'tracking' | 'security';

type SettingFieldType = 'text' | 'number' | 'textarea' | 'switch' | 'select';

type PricingGroup = 'client' | 'courier' | 'cross_border';

interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  category: SettingCategory;
  /** 仅 category 为 pricing 时有效：区分客户端向客户计费 vs 骑手结算相关 */
  pricingGroup?: PricingGroup;
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
    pricingGroup: 'client',
    type: 'number',
    defaultValue: 1500,
    suffix: 'MMK'
  },
  {
    key: 'pricing.per_km_fee',
    label: '每公里费用 (MMK)',
    description: '超出基础里程后的每公里计费标准。',
    category: 'pricing',
    pricingGroup: 'client',
    type: 'number',
    defaultValue: 250,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.weight_surcharge',
    label: '超重附加费',
    description: '当包裹超过默认重量阈值时，每公斤额外增加的费用。',
    category: 'pricing',
    pricingGroup: 'client',
    type: 'number',
    defaultValue: 150,
    suffix: 'MMK/公斤'
  },
  {
    key: 'pricing.urgent_surcharge',
    label: '急送达附加费',
    description: '选择急送达配送方式时额外收取的固定费用。',
    category: 'pricing',
    pricingGroup: 'client',
    type: 'number',
    defaultValue: 500,
    suffix: 'MMK'
  },
  {
    key: 'pricing.oversize_surcharge',
    label: '超规附加费',
    description: '当包裹尺寸超过标准规格时，每公里额外增加的费用。',
    category: 'pricing',
    pricingGroup: 'client',
    type: 'number',
    defaultValue: 300,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.scheduled_surcharge',
    label: '定时达附加费',
    description: '选择定时达配送方式时额外收取的预约服务费。',
    category: 'pricing',
    pricingGroup: 'client',
    type: 'number',
    defaultValue: 200,
    suffix: 'MMK'
  },
  {
    key: 'pricing.fragile_surcharge',
    label: '易碎品附加费',
    description: '运输易碎物品时收取的额外保护和小心处理费用，按距离计算（MMK/公里）。',
    category: 'pricing',
    pricingGroup: 'client',
    type: 'number',
    defaultValue: 300,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.food_beverage_surcharge',
    label: '食品和饮料附加费',
    description: '配送食品和饮料类包裹时，每公里额外增加的费用。',
    category: 'pricing',
    pricingGroup: 'client',
    type: 'number',
    defaultValue: 300,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.free_km_threshold',
    label: '免费公里数',
    description: '订单在该距离内免收每公里费用，用于新用户或促销活动。',
    category: 'pricing',
    pricingGroup: 'client',
    type: 'number',
    defaultValue: 3,
    suffix: '公里'
  },
  {
    key: 'pricing.courier_km_rate',
    label: '骑手配送费 (MMK/KM)',
    description: '结算给骑手的配送提成，按每公里送货距离计算。',
    category: 'pricing',
    pricingGroup: 'courier',
    type: 'number',
    defaultValue: 500,
    suffix: 'MMK/公里'
  },
  {
    key: 'pricing.delivery_bonus_rate',
    label: '每单配送奖金 (MMK/单)',
    description: '每完成一笔配送订单给予骑手的额外奖金。如果设置为 0 则代表不发放配送奖金。',
    category: 'pricing',
    pricingGroup: 'courier',
    type: 'number',
    defaultValue: 1000,
    suffix: 'MMK/单'
  },
  {
    key: 'pricing.way_side_courier_per_order',
    label: '「顺路递」骑手配送费 (MMK/单)',
    description: '顺路递（Eco Way）订单每单结算给骑手的金额；不超过该单客户实付跑腿费。设为 0 时仍按「跑腿费 − 该单起步价」计算骑手分成。',
    category: 'pricing',
    pricingGroup: 'courier',
    type: 'number',
    defaultValue: 0,
    suffix: 'MMK/单'
  },
  {
    key: 'pricing.cross_border.base_fee',
    label: '跨境起步价 (MMK)',
    description: 'Inventory App 入库「费用计算」中总费用的基础部分，与同城跑腿计费独立。',
    category: 'pricing',
    pricingGroup: 'cross_border',
    type: 'number',
    defaultValue: 2000,
    suffix: 'MMK',
    helpText: 'Inventory 入库总费用 = 本领区跨境起步价 × 重量(kg)（按订单「最终目的地」对应领区读取）'
  },
  {
    key: 'pricing.cross_border.free_weight_kg',
    label: '免费重量 (kg)',
    description: '该重量以内仅收起步价，超出部分按每公斤附加费计费。',
    category: 'pricing',
    pricingGroup: 'cross_border',
    type: 'number',
    defaultValue: 1,
    suffix: 'kg'
  },
  {
    key: 'pricing.cross_border.weight_surcharge',
    label: '超重每公斤费用 (MMK)',
    description: '超出免费重量后，每公斤增加的跨境物流费用。',
    category: 'pricing',
    pricingGroup: 'cross_border',
    type: 'number',
    defaultValue: 200,
    suffix: 'MMK/公斤'
  },
  {
    key: 'pricing.cross_border.per_piece_fee',
    label: '每件附加费 (MMK)',
    description: '同一入库单中，第 2 件起每件额外收取的费用（第 1 件不计）。',
    category: 'pricing',
    pricingGroup: 'cross_border',
    type: 'number',
    defaultValue: 0,
    suffix: 'MMK/件'
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
  { id: 'pricing', name: '计费规则', description: '客户端运费规则与骑手结算参数（分区配置）', icon: '💸' },
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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<SettingCategory>('general');
  const [selectedRegion, setSelectedRegion] = useState<string>('mandalay');

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
  const [loadedSettings, setLoadedSettings] = useState<SystemSetting[]>([]);

  const applyIncomingSettings = useCallback((incoming: SystemSetting[]) => {
    const mergedValues: Record<string, SettingValue> = { ...defaultValues };
    const metadata: Record<string, { updated_at?: string | null; updated_by?: string | null }> = {};

    incoming.forEach(setting => {
      let def = definitionMap[setting.settings_key];
      let settingsKey = setting.settings_key;

      // 特殊处理计费规则的领区化 Key
      if (setting.settings_key.startsWith('pricing.')) {
        const parts = setting.settings_key.split('.');
        if (parts.length === 4 && parts[2] === 'cross_border') {
          const region = parts[1];
          if (region !== selectedRegion) return;
          const actualKey = `pricing.cross_border.${parts[3]}`;
          def = definitionMap[actualKey];
          settingsKey = actualKey;
        } else if (parts.length === 3 && parts[1] === 'cross_border') {
          const actualKey = `pricing.cross_border.${parts[2]}`;
          if (mergedValues[actualKey] === definitionMap[actualKey]?.defaultValue) {
            def = definitionMap[actualKey];
            settingsKey = actualKey;
          } else {
            return;
          }
        } else if (parts.length === 3) {
          const region = parts[1];
          const actualKey = `pricing.${parts[2]}`;
          if (region === selectedRegion) {
            def = definitionMap[actualKey];
            settingsKey = actualKey;
          } else {
            return;
          }
        } else if (parts.length === 2) {
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
      setLoadedSettings(data);
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

  useEffect(() => {
    if (loadedSettings.length > 0) {
      applyIncomingSettings(loadedSettings);
    }
  }, [selectedRegion, loadedSettings, applyIncomingSettings]);

  /** 从实时跟踪页「系统设置」入口携带 state，自动切换到「实时跟踪」分类 */
  useEffect(() => {
    const state = location.state as { activeTab?: SettingCategory } | undefined;
    if (state?.activeTab && categories.some(c => c.id === state.activeTab)) {
      setActiveTab(state.activeTab);
    }
  }, [location.state]);

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
        if (def.key.startsWith('pricing.cross_border.')) {
          const field = def.key.replace('pricing.cross_border.', '');
          settingsKey = `pricing.${selectedRegion}.cross_border.${field}`;
        } else {
          settingsKey = `pricing.${selectedRegion}.${def.key.replace('pricing.', '')}`;
        }
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

  const pricingClientDefinitions = useMemo(
    () => settingDefinitions.filter(d => d.category === 'pricing' && d.pricingGroup === 'client'),
    []
  );

  const pricingCourierDefinitions = useMemo(
    () => settingDefinitions.filter(d => d.category === 'pricing' && d.pricingGroup === 'courier'),
    []
  );

  const pricingCrossBorderDefinitions = useMemo(
    () => settingDefinitions.filter(d => d.category === 'pricing' && d.pricingGroup === 'cross_border'),
    []
  );

  const renderInput = (def: SettingDefinition) => {
    const value = settingsValues[def.key];

    if (def.type === 'textarea') {
      return (
        <textarea
          className="sys-settings__textarea"
          value={String(value ?? '')}
          placeholder={def.placeholder}
          rows={4}
          onChange={event => handleValueChange(def.key, event.target.value)}
        />
      );
    }

    if (def.type === 'switch') {
      const checked = Boolean(value);
      return (
        <label className="sys-settings__switch">
          <div className={`sys-settings__switch-track${checked ? ' is-on' : ''}`}>
            <div className="sys-settings__switch-thumb" />
            <input
              type="checkbox"
              checked={checked}
              onChange={event => handleValueChange(def.key, event.target.checked)}
            />
          </div>
          <span className="sys-settings__switch-label">{checked ? '已启用' : '已关闭'}</span>
        </label>
      );
    }

    if (def.type === 'select' && def.options) {
      return (
        <select
          className="sys-settings__select"
          value={String(value ?? '')}
          onChange={event => handleValueChange(def.key, event.target.value)}
        >
          {def.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        className="sys-settings__input"
        type={def.type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        placeholder={def.placeholder}
        onChange={event => handleValueChange(def.key, def.type === 'number' ? event.target.value : event.target.value)}
      />
    );
  };

  const renderSettingCard = (def: SettingDefinition) => {
    const displayLabel = def.label;
    const displayDesc = def.description;

    return (
      <div key={def.key} className="sys-settings__card">
        <div className="sys-settings__card-head">
          <div>
            <h3 className="sys-settings__card-title">{displayLabel}</h3>
            <p className="sys-settings__card-desc">{displayDesc}</p>
          </div>
          {def.suffix && def.type !== 'switch' && (
            <div className="sys-settings__suffix">{def.suffix}</div>
          )}
        </div>

        <div>{renderInput(def)}</div>

        {def.helpText && (
          <div className="sys-settings__help">
            <span>💡</span>
            <span>{def.helpText}</span>
          </div>
        )}
      </div>
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

  const activeCategory = categories.find((category) => category.id === activeTab);

  return (
    <div className="sys-settings">
      <header className="sys-settings__toolbar">
        <div>
          <h1 className="sys-settings__title">
            ⚙️ 系统设置中心
            {hasChanges && !saving && (
              <span className="sys-settings__dirty">未保存</span>
            )}
          </h1>
          <p className="sys-settings__sub">统一管理计费规则、通知策略、自动化流程与安全策略</p>
          {lastSavedAt && (
            <span className="sys-settings__saved">最近保存：{formatTimestamp(lastSavedAt)}</span>
          )}
        </div>
        <div className="sys-settings__actions">
          <button type="button" className="sys-settings__btn sys-settings__btn--ghost" onClick={() => navigate('/admin/dashboard')}>
            ← 返回仪表板
          </button>
          <button type="button" className="sys-settings__btn" onClick={loadSettings} disabled={loading || saving}>
            重新加载
          </button>
          <button
            type="button"
            className={`sys-settings__btn sys-settings__btn--save${!hasChanges ? ' is-dim' : ''}`}
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? '保存中…' : '保存所有更改'}
          </button>
        </div>
      </header>

      {(errorMessage || successMessage) && (
        <div className={`sys-settings__alert ${errorMessage ? 'sys-settings__alert--error' : 'sys-settings__alert--success'}`}>
          {errorMessage || successMessage}
        </div>
      )}

      <div className="sys-settings__layout">
        <aside className="sys-settings__sidebar">
          <div className="sys-settings__sidebar-head">
            <h2 className="sys-settings__sidebar-title">
              <span aria-hidden>📂</span> 设置分类
            </h2>
            <p className="sys-settings__sidebar-desc">按模块管理系统参数，保存后实时同步生效。</p>
          </div>

          <div className="sys-settings__shortcuts">
            <button type="button" className="sys-settings__shortcut sys-settings__shortcut--accounts" onClick={() => navigate('/admin/accounts')}>
              <div className="sys-settings__shortcut-icon">👥</div>
              <div>
                <div className="sys-settings__shortcut-title">账号管理</div>
                <div className="sys-settings__shortcut-sub">登录账号与权限</div>
              </div>
            </button>
            <button type="button" className="sys-settings__shortcut sys-settings__shortcut--audit" onClick={() => navigate('/admin/supervision')}>
              <div className="sys-settings__shortcut-icon">📜</div>
              <div>
                <div className="sys-settings__shortcut-title">操作审计</div>
                <div className="sys-settings__shortcut-sub">操作日志与追溯</div>
              </div>
            </button>
            <button type="button" className="sys-settings__shortcut sys-settings__shortcut--tracking" onClick={() => navigate('/admin/realtime-tracking')}>
              <div className="sys-settings__shortcut-icon">🗺️</div>
              <div>
                <div className="sys-settings__shortcut-title">实时跟踪工作台</div>
                <div className="sys-settings__shortcut-sub">与「实时跟踪」配置联动</div>
              </div>
            </button>
          </div>

          <p className="sys-settings__nav-label">系统核心配置</p>
          <nav className="sys-settings__nav">
            {categories.map((category) => {
              const isActive = activeTab === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`sys-settings__nav-item${isActive ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(category.id)}
                >
                  <span className="sys-settings__nav-icon">{category.icon}</span>
                  <span>
                    <span className="sys-settings__nav-name">{category.name}</span>
                    {isActive && <span className="sys-settings__nav-desc">{category.description}</span>}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="sys-settings__main">
          <div className="sys-settings__main-head">
            <div className="sys-settings__category">
              <div className="sys-settings__category-icon">{activeCategory?.icon}</div>
              <div>
                <h2 className="sys-settings__category-title">{activeCategory?.name || '系统设置'}</h2>
                <p className="sys-settings__category-desc">{activeCategory?.description}</p>
              </div>
            </div>

            {activeTab === 'tracking' && (
              <button type="button" className="sys-settings__btn sys-settings__btn--primary" onClick={() => navigate('/admin/realtime-tracking')}>
                🗺️ 打开实时跟踪工作台
              </button>
            )}

            {activeTab === 'pricing' && (
              <div className="sys-settings__region-box">
                {lastSavedAt && (
                  <div className="sys-settings__region-meta">最后修改：{formatTimestamp(lastSavedAt)}</div>
                )}
                <div className="sys-settings__region-select-wrap">
                  <label htmlFor="sys-settings-region">领区</label>
                  <select
                    id="sys-settings-region"
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setHasChanges(false);
                      setSuccessMessage(null);
                    }}
                  >
                    {REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.prefix})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="sys-settings__loading">
              <div className="sys-settings__loading-icon">⏳</div>
              <div>正在加载配置…</div>
            </div>
          ) : (
            <div className="sys-settings__grid">
              {activeTab === 'pricing' ? (
                <>
                  <div className="sys-settings__section-banner sys-settings__section-banner--client">
                    <h3>
                      <span>📱</span> 客户端计费
                    </h3>
                    <p>
                      面向客户下单时的跑腿费计价（起步价、里程、附加费等）。当前领区：
                      <strong> {REGIONS.find((r) => r.id === selectedRegion)?.name ?? selectedRegion}</strong>
                      。各领区配置相互独立；财务与骑手预估收入按订单领区选用对应规则。
                    </p>
                  </div>
                  {pricingClientDefinitions.map(renderSettingCard)}

                  <div className="sys-settings__section-banner sys-settings__section-banner--courier">
                    <h3>
                      <span>🚚</span> 骑手端计费
                    </h3>
                    <p>
                      与骑手结算相关的参数（顺路递固定费、每单奖金等）。当前编辑
                      <strong> {REGIONS.find((r) => r.id === selectedRegion)?.name ?? selectedRegion}</strong> 的规则，不影响其他领区。
                    </p>
                  </div>
                  {pricingCourierDefinitions.map(renderSettingCard)}

                  <div className="sys-settings__section-banner sys-settings__section-banner--cross-border">
                    <h3>
                      <span>🌏</span> 跨境物流
                    </h3>
                    <p>
                      控制 Inventory App 入库页「费用计算」中的<strong>总费用</strong>（与上方同城跑腿计费无关）。
                      当前领区：
                      <strong> {REGIONS.find((r) => r.id === selectedRegion)?.name ?? selectedRegion}</strong>
                      。保存后 App 下拉同步或重新进入入库第三步即可生效。
                    </p>
                  </div>
                  {pricingCrossBorderDefinitions.map(renderSettingCard)}
                </>
              ) : (
                currentDefinitions.map(renderSettingCard)
              )}
            </div>
          )}
        </main>
      </div>

      <SecurityVerificationModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerifySuccess={executeSave}
        title="修改计费规则验证"
        description="修改计费规则将影响客户端运费与骑手结算相关参数，请验证您的管理员密码以确认此操作。"
      />
    </div>
  );
};

export default SystemSettings;



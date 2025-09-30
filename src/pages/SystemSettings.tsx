import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SystemSetting, systemSettingsService } from '../services/supabase';

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
    defaultValue: '09-000000000',
    placeholder: '09-000000000'
  },
  {
    key: 'company.contact_email',
    label: '客服邮箱',
    description: '对外提供的服务邮箱地址，用于系统通知和邮件提醒。',
    category: 'general',
    type: 'text',
    defaultValue: 'support@marketlinkexpress.com',
    placeholder: 'support@marketlinkexpress.com'
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
    label: '重量附加费 (每公斤)',
    description: '当包裹超过默认重量阈值时，每公斤额外增加的费用。',
    category: 'pricing',
    type: 'number',
    defaultValue: 150,
    suffix: 'MMK/公斤'
  },
  {
    key: 'pricing.urgent_multiplier',
    label: '加急倍率',
    description: '针对加急配送的价格倍率，例如 1.5 表示价格乘以 1.5。',
    category: 'pricing',
    type: 'number',
    defaultValue: 1.5,
    suffix: 'x'
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

const SystemSettings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingCategory>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [settingsMetadata, setSettingsMetadata] = useState<Record<string, { updated_at?: string | null; updated_by?: string | null }>>({});

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
      const def = definitionMap[setting.settings_key];
      if (!def) return;

      let rawValue = setting.settings_value;

      if (rawValue && typeof rawValue === 'object' && 'value' in rawValue) {
        rawValue = (rawValue as any).value;
      }

      if (def.key === 'security.ip_whitelist' && Array.isArray(rawValue)) {
        mergedValues[def.key] = (rawValue as string[]).join('\n');
      } else if (def.type === 'switch') {
        mergedValues[def.key] = Boolean(rawValue);
      } else if (def.type === 'number') {
        const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
        mergedValues[def.key] = Number.isFinite(numericValue) ? numericValue : Number(def.defaultValue);
      } else if ((def.type === 'text' || def.type === 'select') && rawValue !== undefined && rawValue !== null) {
        mergedValues[def.key] = String(rawValue);
      } else if (def.type === 'textarea' && rawValue !== undefined && rawValue !== null) {
        mergedValues[def.key] = String(rawValue);
      }

      metadata[def.key] = {
        updated_at: setting.updated_at,
        updated_by: setting.updated_by
      };
    });

    setSettingsValues(mergedValues);
    setSettingsMetadata(metadata);
    setHasChanges(false);
  }, [defaultValues, definitionMap]);

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

      payload.push({
        category: def.category,
        settings_key: def.key,
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
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
        padding: '20px',
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
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>系统设置中心</h1>
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

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '18px',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            maxHeight: 'calc(100vh - 160px)',
            overflowY: 'auto'
          }}
        >
          <h2 style={{ fontSize: '1.15rem', margin: '0 0 12px 0' }}>设置分类</h2>
          <p style={{ opacity: 0.75, fontSize: '0.9rem', lineHeight: 1.5 }}>
            按照功能模块集中管理系统参数，点击分类即可切换对应配置。
          </p>
          
          {/* 账号管理快捷入口 */}
          <div style={{ marginTop: '14px', marginBottom: '14px' }}>
            <button
              onClick={() => navigate('/admin/accounts')}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '4px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%)',
                border: '1px solid rgba(167, 139, 250, 0.6)',
                borderRadius: '14px',
                padding: '14px',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.2)';
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>👥</span>
              <span style={{ fontWeight: 600 }}>新增账号</span>
              <span style={{ opacity: 0.85, fontSize: '0.88rem', lineHeight: 1.4 }}>管理员工登录账号与权限</span>
            </button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '14px' }}>
            <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '10px' }}>系统配置</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    background: activeTab === category.id ? 'rgba(49, 130, 206, 0.35)' : 'transparent',
                    border: activeTab === category.id ? '1px solid rgba(144,205,244,0.8)' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '14px',
                    padding: '14px',
                    color: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{category.icon}</span>
                  <span style={{ fontWeight: 600 }}>{category.name}</span>
                  <span style={{ opacity: 0.75, fontSize: '0.88rem', lineHeight: 1.4 }}>{category.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            minHeight: 'calc(100vh - 160px)',
            overflowY: 'auto'
          }}
        >
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>
              {categories.find(category => category.id === activeTab)?.name || '系统设置'}
            </h2>
            <p style={{ margin: '6px 0 0 0', opacity: 0.78 }}>
              {categories.find(category => category.id === activeTab)?.description}
            </p>
          </div>

          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.7)' }}>正在加载配置，请稍候...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {currentDefinitions.map(def => {
                const metadata = settingsMetadata[def.key];
                return (
                  <div
                    key={def.key}
                    style={{
                      background: 'rgba(15, 32, 60, 0.6)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '16px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{def.label}</h3>
                        <p style={{ margin: '4px 0 0 0', opacity: 0.75, fontSize: '0.9rem', lineHeight: 1.5 }}>{def.description}</p>
                      </div>
                      {def.suffix && def.type !== 'switch' && (
                        <span style={{ opacity: 0.65, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{def.suffix}</span>
                      )}
                    </div>

                    {renderInput(def)}

                    {(def.helpText || metadata) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        {def.helpText && (
                          <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>{def.helpText}</span>
                        )}
                        {metadata && (metadata.updated_at || metadata.updated_by) && (
                          <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>
                            最近更新：{formatTimestamp(metadata.updated_at)}
                            {metadata.updated_by ? ` · ${metadata.updated_by}` : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;



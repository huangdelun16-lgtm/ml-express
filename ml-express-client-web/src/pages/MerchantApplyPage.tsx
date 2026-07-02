import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';
import { MERCHANT_STORE_TYPE_OPTIONS } from '../services/_shared/merchantStoreTypes';
import '../styles/merchantApply.css';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

const REGIONS = [
  { id: 'mandalay', zh: '曼德勒', en: 'Mandalay', my: 'မန္တလေး', lat: 21.9588, lng: 96.0891 },
  { id: 'maymyo', zh: '彬乌伦', en: 'Pyin Oo Lwin', my: 'ပြင်ဦးလွင်', lat: 22.0333, lng: 96.4667 },
  { id: 'yangon', zh: '仰光', en: 'Yangon', my: 'ရန်ကုန်', lat: 16.8661, lng: 96.1951 },
  { id: 'naypyidaw', zh: '内比都', en: 'Naypyidaw', my: 'နေပြည်တော်', lat: 19.7633, lng: 96.0785 },
  { id: 'taunggyi', zh: '东枝', en: 'Taunggyi', my: 'တောင်ကြီး', lat: 20.7892, lng: 97.0378 },
  { id: 'lashio', zh: '腊戌', en: 'Lashio', my: 'လားရှိုး', lat: 22.9333, lng: 97.75 },
  { id: 'muse', zh: '木姐', en: 'Muse', my: 'မူဆယ်', lat: 23.9833, lng: 97.9 },
];

const STORE_TYPES = MERCHANT_STORE_TYPE_OPTIONS;

const COD_OPTIONS = [
  { value: '7', zh: '7 天', en: '7 days', my: '၇ ရက်' },
  { value: '10', zh: '10 天', en: '10 days', my: '၁၀ ရက်' },
  { value: '15', zh: '15 天', en: '15 days', my: '၁၅ ရက်' },
  { value: '30', zh: '30 天', en: '30 days', my: '၃၀ ရက်' },
];

const MAX_LICENSE_FILES = 8;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(iso: string, isEn: boolean, isMy: boolean): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  if (isEn) {
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (isMy) {
    return `${d}.${m}.${y}`;
  }
  return `${y}年${m}月${d}日`;
}

function formatDateWeekday(iso: string, isEn: boolean, isMy: boolean): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(y, m - 1, d);
  if (isEn) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  if (isMy) {
    const weekdays = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
    return weekdays[date.getDay()];
  }
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[date.getDay()];
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

type LicenseDocItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type FormState = {
  store_name: string;
  store_type: string;
  region: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  manager_name: string;
  manager_phone: string;
  operating_hours: string;
  cod_settlement_day: string;
  salesperson_name: string;
  application_date: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  store_name: '',
  store_type: 'restaurant',
  region: 'mandalay',
  address: '',
  latitude: 21.9588,
  longitude: 96.0891,
  phone: '',
  email: '',
  manager_name: '',
  manager_phone: '',
  operating_hours: '08:00 - 22:00',
  cod_settlement_day: '7',
  salesperson_name: '',
  application_date: todayISO(),
  notes: '',
};

const MerchantApplyPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const isEn = language === 'en';
  const isMy = language === 'my';
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [licenseDocs, setLicenseDocs] = useState<LicenseDocItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const t = useMemo(
    () =>
      isEn
        ? {
            badge: 'Partner onboarding',
            title: 'Join MARKET LINK Merchant Platform',
            subtitle:
              'Apply to list your store on our City Mall. After review, we will issue your store code and password for the Merchant App and Web.',
            step1: '1. Fill in details',
            step2: '2. Admin review',
            step3: '3. Receive login credentials',
            registration: 'Application registration',
            salesperson: 'Salesperson',
            salespersonPlaceholder: 'MARKET LINK sales contact name',
            applicationDate: 'Date',
            uploadLicense: '+ Upload license',
            uploadHint: 'Business license, shop registration, or other store credentials (required)',
            uploadFormats: 'JPG, PNG, WEBP or PDF · max 5MB each · up to 8 files',
            removeDoc: 'Remove',
            noDocsYet: 'No documents uploaded yet',
            basic: 'Store information',
            storeName: 'Store name',
            storeType: 'Store type',
            region: 'City / region',
            address: 'Full address',
            mapHint: 'Tap or click on the map to pin your store location',
            phone: 'Store phone',
            email: 'Email (optional)',
            manager: 'Manager name',
            managerPhone: 'Manager phone',
            hours: 'Operating hours',
            hoursPlaceholder: 'e.g. 08:00 - 22:00',
            cod: 'COD settlement cycle',
            notes: 'Notes (optional)',
            notesPlaceholder: 'Briefly describe your store or products…',
            submit: 'Submit application',
            submitting: 'Submitting…',
            home: 'Back to home',
            successTitle: 'Application submitted successfully',
            coords: 'Pinned location',
            mapUnavailable: 'Map is unavailable. Please contact support for help with location.',
            mapLoading: 'Loading map…',
            submitError: 'Submission failed. Please try again.',
          }
        : isMy
          ? {
              badge: 'ကုန်သည်လျှောက်ထားမှု',
              title: 'MARKET LINK ကုန်သည်ပလက်ဖောင်းသို့ ချိတ်ဆက်ရန်',
              subtitle:
                'City Mall တွင် ဆိုင်ဖွင့်ရန် လျှောက်လွှာတင်ပါ။ Admin အတည်ပြုပြီးနောက် Merchant App/Web အတွက် ဆိုင်ကုဒ်နှင့် လျှို့ဝှက်နံပါတ် ပေးအပ်ပါမည်။',
              step1: '၁. အချက်အလက်ဖြည့်ပါ',
              step2: '၂. Admin စစ်ဆေးမည်',
              step3: '၃. အကောင့်ရယူပါ',
              registration: 'လျှောက်လွှာ မှတ်တမ်း',
              salesperson: 'အရောင်းနာမည်',
              salespersonPlaceholder: 'MARKET LINK အရောင်းသက်ဆိုင်ရာ အမည်',
              applicationDate: 'ရက်စွဲ',
              uploadLicense: '+ မှတ်ပုံတင်တင်ရန်',
              uploadHint: 'လုပ်ငန်းလိုင်စင်၊ ဆိုင်မှတ်ပုံတင် စသည့် အထောက်အထားများ (မဖြစ်မနေ)',
              uploadFormats: 'JPG, PNG, WEBP သို့ PDF · ဖိုင် 5MB အထိ · ၈ ဖိုင်အထိ',
              removeDoc: 'ဖယ်ရှားရန်',
              noDocsYet: 'မှတ်ပုံတင် မတင်ရသေးပါ',
              basic: 'ဆိုင်အချက်အလက်',
              storeName: 'ဆိုင်အမည်',
              storeType: 'ဆိုင်အမျိုးအစား',
              region: 'ဒေသ / မြို့',
              address: 'လိပ်စာ',
              mapHint: 'မြေပုံပေါ်တွင် ဆိုင်တည်နေရာ ရွေးချယ်ပါ',
              phone: 'ဆိုင်ဖုန်း',
              email: 'Email (မဖြည့်လည်းရ)',
              manager: 'တာဝန်ခံအမည်',
              managerPhone: 'တာဝန်ခံဖုန်း',
              hours: 'ဖွင့်ချိန်',
              hoursPlaceholder: 'ဥပမာ 08:00 - 22:00',
              cod: 'COD ရက်ချိန်သတ်မှတ်ချက်',
              notes: 'မှတ်ချက် (မဖြည့်လည်းရ)',
              notesPlaceholder: 'ဆိုင်နှင့် ရောင်းချသောပစ္စည်းအကြောင်း အကျဉ်းချုပ်…',
              submit: 'လျှောက်လွှာတင်ရန်',
              submitting: 'တင်နေသည်…',
              home: 'ပင်မသို့',
              successTitle: 'လျှောက်လွှာ တင်ပြီးပါပြီ',
              coords: 'ရွေးချယ်ထားသော တည်နေရာ',
              mapUnavailable: 'မြေပုံ မရရှိနိုင်ပါ။ တည်နေရာအတွက် customer service ကို ဆက်သွယ်ပါ။',
              mapLoading: 'မြေပုံ ဖွင့်နေသည်…',
              submitError: 'တင်သွင်းမှု မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။',
            }
          : {
              badge: '商家入驻',
              title: '申请加入 MARKET LINK 商家平台',
              subtitle:
                '填写以下资料申请入驻同城商场。审核通过后，我们将为您开通商家账号（店铺代码 + 密码），可用于商家 App / Web 登录经营。',
              step1: '1. 填写资料',
              step2: '2. 平台审核',
              step3: '3. 获取账号',
              registration: '申请登记',
              salesperson: '推销员',
              salespersonPlaceholder: 'MARKET LINK 推销员姓名',
              applicationDate: '日期',
              uploadLicense: '+ 上传证件',
              uploadHint: '请上传营业执照、店铺登记证等商店证件（必填）',
              uploadFormats: '支持 JPG、PNG、WEBP 或 PDF · 单个不超过 5MB · 最多 8 份',
              removeDoc: '删除',
              noDocsYet: '尚未上传证件',
              basic: '店铺基本信息',
              storeName: '店铺名称',
              storeType: '店铺类型',
              region: '经营区域',
              address: '详细地址',
              mapHint: '在地图上点击选择店铺坐标',
              phone: '店铺电话',
              email: '邮箱（选填）',
              manager: '负责人姓名',
              managerPhone: '负责人手机',
              hours: '营业时间',
              hoursPlaceholder: '例如 08:00 - 22:00',
              cod: 'COD 结清周期',
              notes: '备注（选填）',
              notesPlaceholder: '可简要介绍店铺或主营商品…',
              submit: '提交入驻申请',
              submitting: '提交中…',
              home: '返回首页',
              successTitle: '申请已提交',
              coords: '已选坐标',
              mapUnavailable: '地图暂不可用，请联系客服协助选点。',
              mapLoading: '地图加载中…',
              submitError: '提交失败，请稍后再试',
            },
    [isEn, isMy],
  );

  const labelRegion = (id: string) => {
    const row = REGIONS.find((r) => r.id === id);
    if (!row) return id;
    return isEn ? row.en : isMy ? row.my : row.zh;
  };

  const labelStoreType = (value: string) => {
    const row = STORE_TYPES.find((s) => s.value === value);
    if (!row) return value;
    return isEn ? row.en : isMy ? row.my : row.zh;
  };

  const handleRegionChange = (region: string) => {
    const hub = REGIONS.find((r) => r.id === region) || REGIONS[0];
    setForm((prev) => ({
      ...prev,
      region,
      latitude: hub.lat,
      longitude: hub.lng,
    }));
  };

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
    setForm((prev) => ({
      ...prev,
      latitude: event.latLng!.lat(),
      longitude: event.latLng!.lng(),
    }));
  }, []);

  const handlePickDocuments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (!picked.length) return;

    setError(null);
    const remaining = MAX_LICENSE_FILES - licenseDocs.length;
    if (remaining <= 0) {
      setError(isEn ? 'Maximum 8 documents' : isMy ? 'ဖိုင် ၈ ခု အထိသာ' : '最多上传 8 份证件');
      return;
    }

    const accepted = picked.slice(0, remaining);
    const nextItems: LicenseDocItem[] = [];

    for (const file of accepted) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) {
        setError(isEn ? 'Only JPG, PNG, WEBP or PDF' : isMy ? 'JPG, PNG, WEBP, PDF သာ' : '仅支持 JPG、PNG、WEBP 或 PDF');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(isEn ? 'Each file must be under 5MB' : isMy ? 'ဖိုင် 5MB ထက်မကြီးရ' : '单个文件不能超过 5MB');
        continue;
      }
      nextItems.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : '',
      });
    }

    if (nextItems.length) {
      setLicenseDocs((prev) => [...prev, ...nextItems]);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setLicenseDocs((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearLicenseDocs = () => {
    licenseDocs.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setLicenseDocs([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (licenseDocs.length < 1) {
      setError(isEn ? 'Please upload at least one store license' : isMy ? 'မှတ်ပုံတင် အနည်းဆုံး ၁ ခု တင်ပါ' : '请至少上传一份商店证件');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const license_documents = await Promise.all(
        licenseDocs.map(async (doc) => ({
          fileName: doc.file.name,
          contentType: doc.file.type || 'application/octet-stream',
          base64: await fileToBase64(doc.file),
        })),
      );

      const response = await fetch('/.netlify/functions/merchant-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          license_documents,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || t.submitError);
      }
      setSuccess(payload.message || t.successTitle);
      setForm({ ...DEFAULT_FORM, application_date: todayISO() });
      clearLicenseDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const dateDisplay = formatDateLabel(form.application_date, isEn, isMy);

  return (
    <div className="merchant-apply-page">
      <NavigationBar
        language={language}
        onLanguageChange={(newLanguage) => {
          setLanguage(newLanguage);
          localStorage.setItem('ml-express-language', newLanguage);
        }}
        currentUser={null}
        onLogout={() => {}}
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }}
      />
      <div className="merchant-apply-page__inner">
        <header className="merchant-apply-hero">
          <span className="merchant-apply-hero__badge">{t.badge}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <div className="merchant-apply-steps" aria-hidden="true">
            <span>{t.step1}</span>
            <span>{t.step2}</span>
            <span>{t.step3}</span>
          </div>
        </header>

        <div className="merchant-apply-card">
          {error && (
            <div className="merchant-apply-alert merchant-apply-alert--error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="merchant-apply-alert merchant-apply-alert--success" role="status">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <section className="merchant-apply-section merchant-apply-section--registration">
              <div className="merchant-apply-section__head">
                <span className="merchant-apply-section__icon" aria-hidden="true">
                  📋
                </span>
                <h2>{t.registration}</h2>
              </div>
              <div className="merchant-apply-grid merchant-apply-grid--registration">
                <div className="merchant-apply-field">
                  <label htmlFor="salesperson_name">{t.salesperson}</label>
                  <input
                    id="salesperson_name"
                    value={form.salesperson_name}
                    onChange={(e) => setForm({ ...form, salesperson_name: e.target.value })}
                    placeholder={t.salespersonPlaceholder}
                  />
                </div>
                <div className="merchant-apply-field">
                  <label htmlFor="application_date">{t.applicationDate} *</label>
                  <div className="merchant-apply-date merchant-apply-date--compact">
                    <input
                      id="application_date"
                      type="date"
                      className="merchant-apply-date__input-visible"
                      value={form.application_date}
                      onChange={(e) => setForm({ ...form, application_date: e.target.value })}
                      required
                    />
                    <span className="merchant-apply-date__hint">
                      {formatDateWeekday(form.application_date, isEn, isMy)}
                      {formatDateWeekday(form.application_date, isEn, isMy) ? ' · ' : ''}
                      {dateDisplay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="merchant-apply-upload">
                <div className="merchant-apply-upload__head">
                  <p className="merchant-apply-upload__title">{t.uploadHint}</p>
                  <p className="merchant-apply-upload__formats">{t.uploadFormats}</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  multiple
                  className="merchant-apply-upload__native"
                  onChange={handlePickDocuments}
                />
                <button
                  type="button"
                  className="merchant-apply-upload__add"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={licenseDocs.length >= MAX_LICENSE_FILES || submitting}
                >
                  {t.uploadLicense}
                </button>

                {licenseDocs.length === 0 ? (
                  <p className="merchant-apply-upload__empty">{t.noDocsYet}</p>
                ) : (
                  <ul className="merchant-apply-upload__list">
                    {licenseDocs.map((doc) => (
                      <li key={doc.id} className="merchant-apply-upload__item">
                        {doc.previewUrl ? (
                          <img src={doc.previewUrl} alt="" className="merchant-apply-upload__thumb" />
                        ) : (
                          <div className="merchant-apply-upload__pdf">PDF</div>
                        )}
                        <div className="merchant-apply-upload__meta">
                          <span className="merchant-apply-upload__name">{doc.file.name}</span>
                          <span className="merchant-apply-upload__size">
                            {(doc.file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          className="merchant-apply-upload__remove"
                          onClick={() => handleRemoveDocument(doc.id)}
                          disabled={submitting}
                        >
                          {t.removeDoc}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="merchant-apply-section">
              <div className="merchant-apply-section__head">
                <span className="merchant-apply-section__icon" aria-hidden="true">
                  🏪
                </span>
                <h2>{t.basic}</h2>
              </div>
              <div className="merchant-apply-grid">
                <div className="merchant-apply-field">
                  <label htmlFor="store_name">{t.storeName} *</label>
                  <input
                    id="store_name"
                    value={form.store_name}
                    onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                    required
                  />
                </div>
                <div className="merchant-apply-field">
                  <label htmlFor="phone">{t.phone} *</label>
                  <input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="merchant-apply-field">
                  <label htmlFor="store_type">{t.storeType} *</label>
                  <select
                    id="store_type"
                    value={form.store_type}
                    onChange={(e) => setForm({ ...form, store_type: e.target.value })}
                    required
                  >
                    {STORE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {labelStoreType(type.value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="merchant-apply-field">
                  <label htmlFor="region">{t.region} *</label>
                  <select
                    id="region"
                    value={form.region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    required
                  >
                    {REGIONS.map((region) => (
                      <option key={region.id} value={region.id}>
                        {labelRegion(region.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="merchant-apply-field">
                  <label htmlFor="operating_hours">{t.hours} *</label>
                  <input
                    id="operating_hours"
                    value={form.operating_hours}
                    onChange={(e) => setForm({ ...form, operating_hours: e.target.value })}
                    placeholder={t.hoursPlaceholder}
                    required
                  />
                </div>
                <div className="merchant-apply-field">
                  <label htmlFor="cod_settlement_day">{t.cod} *</label>
                  <select
                    id="cod_settlement_day"
                    value={form.cod_settlement_day}
                    onChange={(e) => setForm({ ...form, cod_settlement_day: e.target.value })}
                    required
                  >
                    {COD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {isEn ? opt.en : isMy ? opt.my : opt.zh}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="merchant-apply-field">
                  <label htmlFor="email">{t.email}</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="merchant-apply-field">
                  <label htmlFor="manager_name">{t.manager} *</label>
                  <input
                    id="manager_name"
                    value={form.manager_name}
                    onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                    required
                  />
                </div>
                <div className="merchant-apply-field">
                  <label htmlFor="manager_phone">{t.managerPhone} *</label>
                  <input
                    id="manager_phone"
                    value={form.manager_phone}
                    onChange={(e) => setForm({ ...form, manager_phone: e.target.value })}
                    required
                  />
                </div>
                <div className="merchant-apply-field merchant-apply-field--full">
                  <label htmlFor="address">{t.address} *</label>
                  <input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>
              </div>
              <p className="merchant-apply-footnote">{t.mapHint}</p>
              <div className="merchant-apply-map-wrap">
                {!GOOGLE_MAPS_API_KEY || mapLoadError ? (
                  <div className="merchant-apply-map-placeholder">{t.mapUnavailable}</div>
                ) : !isMapLoaded ? (
                  <div className="merchant-apply-map-placeholder">{t.mapLoading}</div>
                ) : (
                  <div className="merchant-apply-map">
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ lat: form.latitude, lng: form.longitude }}
                      zoom={13}
                      onClick={handleMapClick}
                    >
                      <Marker position={{ lat: form.latitude, lng: form.longitude }} />
                    </GoogleMap>
                  </div>
                )}
              </div>
              <div className="merchant-apply-coords">
                {t.coords}: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
              </div>
              <div className="merchant-apply-field merchant-apply-field--full merchant-apply-field--notes">
                <label htmlFor="notes">{t.notes}</label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t.notesPlaceholder}
                />
              </div>
            </section>

            <div className="merchant-apply-actions">
              <Link to="/" className="merchant-apply-btn merchant-apply-btn--ghost">
                {t.home}
              </Link>
              <button
                type="submit"
                className="merchant-apply-btn merchant-apply-btn--primary"
                disabled={submitting}
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MerchantApplyPage;

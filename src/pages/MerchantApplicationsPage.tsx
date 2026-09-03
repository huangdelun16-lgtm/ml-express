import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  approveMerchantApplication,
  fetchMerchantApplicationDetail,
  fetchMerchantApplications,
  rejectMerchantApplication,
  type MerchantApplication,
  type MerchantApplicationCredentials,
  type MerchantApplicationNotifyResult,
  type MerchantApplicationStatus,
} from '../services/merchantApplicationService';
import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import { getMerchantStoreTypeLabel } from '../constants/merchantStoreTypes';
import { rewritePublicStorageUrl } from '../utils/supabaseBrowserUrl';
import '../styles/merchantApplications.css';

const REGION_LABELS: Record<string, string> = {
  mandalay: '曼德勒',
  maymyo: '彬乌伦',
  yangon: '仰光',
  naypyidaw: '内比都',
  taunggyi: '东枝',
  lashio: '腊戌',
  muse: '木姐',
};

function statusBadge(status: MerchantApplicationStatus) {
  if (status === 'approved') return 'merchant-apps-badge merchant-apps-badge--approved';
  if (status === 'rejected') return 'merchant-apps-badge merchant-apps-badge--rejected';
  return 'merchant-apps-badge merchant-apps-badge--pending';
}

function statusLabel(status: MerchantApplicationStatus, isEn: boolean) {
  if (isEn) {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  }
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已拒绝';
  return '待审核';
}

function isPdfUrl(url: string) {
  return /\.pdf($|\?)/i.test(url);
}

function docFileName(url: string, index: number) {
  try {
    const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
    if (name && name.length > 2) return name;
  } catch {
    /* ignore */
  }
  return `document-${index + 1}`;
}

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function LicenseDocCard({
  url,
  index,
  isEn,
  onOpen,
}: {
  url: string;
  index: number;
  isEn: boolean;
  onOpen: (previewUrl: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const pdf = isPdfUrl(url);
  const name = docFileName(url, index);
  const previewUrl = rewritePublicStorageUrl(url);

  return (
    <article className="merchant-apps-doc">
      {pdf ? (
        <a
          className="merchant-apps-doc__thumb"
          href={previewUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className="merchant-apps-doc__pdf">PDF</span>
        </a>
      ) : failed ? (
        <div className="merchant-apps-doc__thumb merchant-apps-doc__thumb--failed">
          <span>{isEn ? 'Preview unavailable' : '无法预览'}</span>
        </div>
      ) : (
        <button
          type="button"
          className="merchant-apps-doc__thumb merchant-apps-doc__thumb--btn"
          onClick={() => onOpen(previewUrl)}
        >
          <img src={previewUrl} alt={name} loading="lazy" onError={() => setFailed(true)} />
        </button>
      )}
      <span className="merchant-apps-doc__label" title={name}>
        {name}
      </span>
      <div className="merchant-apps-doc__actions">
        <a href={previewUrl} target="_blank" rel="noreferrer noopener">
          {isEn ? 'Open' : '新窗口打开'}
        </a>
        <a href={previewUrl} download={name} target="_blank" rel="noreferrer noopener">
          {isEn ? 'Download original' : '下载原件'}
        </a>
      </div>
    </article>
  );
}

function parsePackingAckFromNotes(notes?: string | null): string | null {
  const match = String(notes || '').match(/\[平台打包\]\s*已确认：(.+)/);
  const label = match?.[1]?.trim();
  return label || null;
}

function notesWithoutPackingAck(notes?: string | null): string {
  return String(notes || '')
    .replace(/\[平台打包\][^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type DetailItemProps = {
  label: string;
  value: React.ReactNode;
  full?: boolean;
  copyText?: string;
  onCopy?: (text: string) => void;
  copyLabel?: string;
};

const DetailItem: React.FC<DetailItemProps> = ({
  label,
  value,
  full,
  copyText,
  onCopy,
  copyLabel,
}) => (
  <div className={`merchant-apps-detail-item${full ? ' merchant-apps-detail-item--full' : ''}`}>
    <dt>{label}</dt>
    <dd>
      <div className="merchant-apps-detail-item__row">
        <span>{value}</span>
        {copyText && onCopy && (
          <button type="button" className="merchant-apps-copy-btn" onClick={() => onCopy(copyText)}>
            {copyLabel}
          </button>
        )}
      </div>
    </dd>
  </div>
);

type SectionProps = {
  icon: string;
  title: string;
  children: React.ReactNode;
};

const Section: React.FC<SectionProps> = ({ icon, title, children }) => (
  <section className="merchant-apps-modal__section">
    <div className="merchant-apps-modal__section-head">
      <span className="merchant-apps-modal__section-icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="merchant-apps-modal__section-title">{title}</h3>
    </div>
    <div className="merchant-apps-modal__section-body">{children}</div>
  </section>
);

const POLL_MS = 20_000;

function credentialsNotifyText(notify: MerchantApplicationNotifyResult | null, isEn: boolean) {
  if (!notify) {
    return isEn ? 'Share the account with the merchant' : '请复制账号告知商家';
  }
  const parts: string[] = [];
  if (notify.smsSent) {
    parts.push(
      isEn
        ? `SMS sent to ${notify.smsTo.join(', ')}`
        : `已发短信至 ${notify.smsTo.join('、')}`,
    );
  }
  if (notify.emailSent && notify.emailTo) {
    parts.push(isEn ? `Email sent to ${notify.emailTo}` : `已发邮件至 ${notify.emailTo}`);
  }
  if (parts.length > 0) {
    if (notify.errors.length > 0) {
      parts.push(isEn ? 'some messages failed' : '部分发送失败，可再复制告知');
    }
    return parts.join(isEn ? ' · ' : '；');
  }
  if (notify.errors.length > 0) {
    return isEn
      ? 'SMS/email failed — please copy and send manually'
      : '短信/邮件发送失败，请复制账号线下告知';
  }
  return isEn
    ? 'Messaging not configured — please copy and share manually'
    : '未配置短信/邮件，请复制账号线下告知';
}

const MerchantApplicationsPage: React.FC = () => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const storeTypeLang = language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';
  const [filter, setFilter] = useState<MerchantApplicationStatus | 'all'>('pending');
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MerchantApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [previewStoreCode, setPreviewStoreCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<MerchantApplicationCredentials | null>(null);
  const [notifyResult, setNotifyResult] = useState<MerchantApplicationNotifyResult | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const copyLabel = isEn ? 'Copy' : '复制';
  const submittingRef = useRef(false);
  const lastPendingCountRef = useRef<number | null>(null);

  const showToast = useCallback(
    (message: string) => {
      setToast(message);
      window.setTimeout(() => setToast(null), 2200);
    },
    [],
  );

  const copyText = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(isEn ? 'Copied' : '已复制');
      } catch {
        showToast(isEn ? 'Copy failed' : '复制失败');
      }
    },
    [isEn, showToast],
  );

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchMerchantApplications(filter);
      if (
        silent &&
        lastPendingCountRef.current != null &&
        result.pendingCount > lastPendingCountRef.current
      ) {
        const n = result.pendingCount - lastPendingCountRef.current;
        showToast(isEn ? `${n} new application(s)` : `有 ${n} 条新入驻申请`);
      }
      lastPendingCountRef.current = result.pendingCount;
      setApplications(result.applications);
      setPendingCount(result.pendingCount);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : isEn ? 'Load failed' : '加载失败');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filter, isEn, showToast]);

  useEffect(() => {
    lastPendingCountRef.current = null;
    void load();
  }, [load]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      if (submittingRef.current) return;
      void load({ silent: true });
    };
    const timer = window.setInterval(tick, POLL_MS);
    let visTimer: number | undefined;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(visTimer);
      visTimer = window.setTimeout(() => {
        if (!submittingRef.current) void load({ silent: true });
      }, 150);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(visTimer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setSelected(null);
    setLightboxUrl(null);
    setCredentials(null);
    setNotifyResult(null);
  }, [submitting]);

  useEffect(() => {
    if (!selected) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxUrl) setLightboxUrl(null);
        else closeModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, lightboxUrl, closeModal]);

  const openDetail = async (id: string) => {
    setCredentials(null);
    setNotifyResult(null);
    setReviewNotes('');
    setCustomPassword('');
    setPreviewStoreCode('');
    setShowPassword(false);
    setLightboxUrl(null);
    try {
      const { application, suggested_store_code } = await fetchMerchantApplicationDetail(id);
      setSelected(application);
      setPreviewStoreCode(suggested_store_code || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Load failed' : '加载失败');
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    const pwd = customPassword.trim();
    if (pwd && pwd.length < 6) {
      setError(isEn ? 'Password must be at least 6 characters' : '自定义密码至少 6 位');
      return;
    }
    setSubmitting(true);
    submittingRef.current = true;
    setError(null);
    try {
      const result = await approveMerchantApplication({
        applicationId: selected.id,
        review_notes: reviewNotes.trim() || undefined,
        password: pwd || undefined,
        store_code: previewStoreCode.trim() || undefined,
      });
      setSelected(result.application);
      setCredentials(result.credentials);
      setNotifyResult(result.notify);
      await load({ silent: true });
      notifyAdminTodosRefresh();
      const sent = Boolean(result.notify?.smsSent || result.notify?.emailSent);
      showToast(
        sent
          ? isEn
            ? 'Approved — credentials sent'
            : '已通过，账号已发给商家'
          : isEn
            ? 'Approved — copy credentials'
            : '已通过，请复制账号告知商家',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Approve failed' : '审核通过失败');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    const confirmed = window.confirm(
      isEn
        ? `Reject application for "${selected.store_name}"?`
        : `确定拒绝「${selected.store_name}」的入驻申请吗？`,
    );
    if (!confirmed) return;

    setSubmitting(true);
    submittingRef.current = true;
    setError(null);
    try {
      const updated = await rejectMerchantApplication({
        applicationId: selected.id,
        review_notes: reviewNotes.trim() || undefined,
      });
      setSelected(updated);
      await load({ silent: true });
      notifyAdminTodosRefresh();
      showToast(isEn ? 'Application rejected' : '已拒绝该申请');
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Reject failed' : '拒绝失败');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = isEn
      ? `Store: ${credentials.storeName}\nStore code: ${credentials.storeCode}\nPassword: ${credentials.password}\nLogin: https://mlexpress-merchants.com`
      : `店铺：${credentials.storeName}\n店铺代码：${credentials.storeCode}\n登录密码：${credentials.password}\n登录：https://mlexpress-merchants.com`;
    void copyText(text);
  };

  const packingAckLabel = selected ? parsePackingAckFromNotes(selected.notes) : null;
  const merchantNotes = selected ? notesWithoutPackingAck(selected.notes) : '';

  const title = isEn ? 'Merchant onboarding applications' : '商家入驻申请';
  const subtitle = isEn
    ? 'Review online applications. Approved merchants receive a store code and password for Merchant App/Web.'
    : '审核官网提交的入驻申请。通过后自动创建合伙店铺并生成登录账号。';
  const archiveHint = isEn
    ? 'Applications and license files are kept permanently for audit. Approving or rejecting does not delete the record or originals.'
    : '申请记录和证件长期保留，出事可查。通过或拒绝都不会删除申请或证件原件。';

  const rows = useMemo(() => applications, [applications]);

  return (
    <div className="merchant-apps-page">
      <div className="merchant-apps-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <p className="merchant-apps-archive-hint">{archiveHint}</p>
          <p style={{ marginTop: '0.35rem' }}>
            <Link to="/admin/delivery-stores" style={{ color: '#93c5fd' }}>
              {isEn ? '← Back to merchant stores' : '← 返回商家管理'}
            </Link>
          </p>
        </div>
        <div className="merchant-apps-toolbar">
          <select
            className="merchant-apps-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as MerchantApplicationStatus | 'all')}
          >
            <option value="pending">{isEn ? `Pending (${pendingCount})` : `待审核 (${pendingCount})`}</option>
            <option value="approved">{isEn ? 'Approved' : '已通过'}</option>
            <option value="rejected">{isEn ? 'Rejected' : '已拒绝'}</option>
            <option value="all">{isEn ? 'All' : '全部'}</option>
          </select>
          <button
            type="button"
            className="merchant-apps-btn merchant-apps-btn--ghost"
            onClick={() => void load({ silent: applications.length > 0 })}
          >
            {isEn ? 'Refresh' : '刷新'}
          </button>
          <span className="merchant-apps-poll-hint">
            {isEn ? 'Auto-refresh every 20s' : '每 20 秒自动刷新'}
            {lastUpdatedAt
              ? ` · ${isEn ? 'Updated' : '已更新'} ${new Date(lastUpdatedAt).toLocaleTimeString()}`
              : ''}
          </span>
        </div>
      </div>

      {error && (
        <div className="merchant-apply-alert merchant-apply-alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="merchant-apps-table-wrap">
        {loading ? (
          <div className="merchant-apps-empty">{isEn ? 'Loading…' : '加载中…'}</div>
        ) : rows.length === 0 ? (
          <div className="merchant-apps-empty">
            {isEn ? 'No applications in this filter.' : '当前筛选下暂无申请。'}
          </div>
        ) : (
          <table className="merchant-apps-table">
            <thead>
              <tr>
                <th>{isEn ? 'Store' : '店铺'}</th>
                <th>{isEn ? 'Region' : '区域'}</th>
                <th>{isEn ? 'Type' : '类型'}</th>
                <th>{isEn ? 'Phone' : '电话'}</th>
                <th>{isEn ? 'Status' : '状态'}</th>
                <th>{isEn ? 'Submitted' : '提交时间'}</th>
                <th>{isEn ? 'Actions' : '操作'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.store_name}</td>
                  <td>{REGION_LABELS[row.region] || row.region}</td>
                  <td>{getMerchantStoreTypeLabel(row.store_type, storeTypeLang)}</td>
                  <td>{row.phone}</td>
                  <td>
                    <span className={statusBadge(row.status)}>{statusLabel(row.status, isEn)}</span>
                  </td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="merchant-apps-btn merchant-apps-btn--primary"
                      onClick={() => void openDetail(row.id)}
                    >
                      {isEn ? 'Review' : '审核'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div
          className="merchant-apps-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="merchant-apps-modal" role="dialog" aria-modal="true" aria-labelledby="merchant-review-title">
            <header className="merchant-apps-modal__head">
              <div className="merchant-apps-modal__head-main">
                <div className="merchant-apps-modal__title-row">
                  <h2 id="merchant-review-title" className="merchant-apps-modal__title">
                    {selected.store_name}
                  </h2>
                  <span className={statusBadge(selected.status)}>{statusLabel(selected.status, isEn)}</span>
                </div>
                <div className="merchant-apps-modal__meta">
                  <span>
                    🕐 {isEn ? 'Submitted' : '提交'}: {new Date(selected.created_at).toLocaleString()}
                  </span>
                  {selected.application_date && (
                    <span>
                      📅 {isEn ? 'Application date' : '申请日期'}: {selected.application_date}
                    </span>
                  )}
                  {selected.salesperson_name && (
                    <span>
                      👤 {isEn ? 'Salesperson' : '推销员'}: {selected.salesperson_name}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="merchant-apps-modal__close"
                aria-label={isEn ? 'Close' : '关闭'}
                onClick={closeModal}
                disabled={submitting}
              >
                ×
              </button>
            </header>

            <div className="merchant-apps-modal__body">
              {credentials && (
                <div className="merchant-apps-credentials">
                  <div className="merchant-apps-credentials__head">
                    <p className="merchant-apps-credentials__title">
                      {notifyResult?.smsSent || notifyResult?.emailSent
                        ? isEn
                          ? 'Account created and sent to merchant'
                          : '账号已开通，并已发给商家'
                        : isEn
                          ? 'Account created — share with merchant'
                          : '账号已开通，请告知商家'}
                    </p>
                    <button type="button" className="merchant-apps-btn merchant-apps-btn--success" onClick={copyCredentials}>
                      {isEn ? 'Copy all' : '复制全部'}
                    </button>
                  </div>
                  <p
                    className={`merchant-apps-credentials__notify${
                      notifyResult && !notifyResult.smsSent && !notifyResult.emailSent
                        ? ' merchant-apps-credentials__notify--warn'
                        : ''
                    }`}
                  >
                    {credentialsNotifyText(notifyResult, isEn)}
                  </p>
                  <div className="merchant-apps-credentials__grid">
                    <div className="merchant-apps-cred-box">
                      <div className="merchant-apps-cred-box__label">{isEn ? 'Store code' : '店铺代码'}</div>
                      <div className="merchant-apps-cred-box__value">{credentials.storeCode}</div>
                    </div>
                    <div className="merchant-apps-cred-box">
                      <div className="merchant-apps-cred-box__label">{isEn ? 'Password' : '登录密码'}</div>
                      <div className="merchant-apps-cred-box__value">{credentials.password}</div>
                    </div>
                  </div>
                </div>
              )}

              <Section icon="🏪" title={isEn ? 'Store information' : '店铺信息'}>
                <dl className="merchant-apps-detail-grid">
                  <DetailItem
                    label={isEn ? 'Region' : '区域'}
                    value={REGION_LABELS[selected.region] || selected.region}
                  />
                  <DetailItem
                    label={isEn ? 'Store type' : '店铺类型'}
                    value={getMerchantStoreTypeLabel(selected.store_type, storeTypeLang)}
                  />
                  <DetailItem
                    label={isEn ? 'Store phone' : '店铺电话'}
                    value={selected.phone}
                    copyText={selected.phone}
                    onCopy={(t) => void copyText(t)}
                    copyLabel={copyLabel}
                  />
                  <DetailItem
                    label={isEn ? 'Manager' : '负责人'}
                    value={`${selected.manager_name} · ${selected.manager_phone}`}
                    copyText={selected.manager_phone}
                    onCopy={(t) => void copyText(t)}
                    copyLabel={copyLabel}
                  />
                  {selected.email && (
                    <DetailItem label="Email" value={selected.email} copyText={selected.email} onCopy={(t) => void copyText(t)} copyLabel={copyLabel} />
                  )}
                  <DetailItem label={isEn ? 'Hours' : '营业时间'} value={selected.operating_hours} />
                  <DetailItem label="COD" value={`${selected.cod_settlement_day} ${isEn ? 'days' : '天'}`} />
                  <DetailItem label={isEn ? 'Address' : '地址'} value={selected.address} full />
                  {packingAckLabel && (
                    <DetailItem
                      label={isEn ? 'Packing style' : '平台打包'}
                      value={isEn ? `Confirmed: ${packingAckLabel}` : `已确认：${packingAckLabel}`}
                      full
                    />
                  )}
                  <div className="merchant-apps-detail-item merchant-apps-detail-item--full">
                    <dt>{isEn ? 'Location' : '地图位置'}</dt>
                    <dd>
                      <a
                        className="merchant-apps-map-link"
                        href={googleMapsUrl(selected.latitude, selected.longitude)}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        📍 {isEn ? 'Open in Google Maps' : '在 Google 地图中查看'}
                      </a>
                      <div className="merchant-apps-coords">
                        {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                      </div>
                    </dd>
                  </div>
                  {merchantNotes && (
                    <DetailItem label={isEn ? 'Notes' : '备注'} value={merchantNotes} full />
                  )}
                  {selected.provisioned_store_code && (
                    <DetailItem
                      label={isEn ? 'Store code' : '店铺代码'}
                      value={selected.provisioned_store_code}
                      copyText={selected.provisioned_store_code}
                      onCopy={(t) => void copyText(t)}
                      copyLabel={copyLabel}
                    />
                  )}
                </dl>
              </Section>

              {selected.license_document_urls?.length > 0 && (
                <Section icon="📄" title={isEn ? 'Store licenses' : '商店证件'}>
                  <p className="merchant-apps-docs-hint">
                    {isEn
                      ? 'Originals stay on file after review. Open or download if the thumbnail fails.'
                      : '审核后证件原件仍会留底。缩略图打不开时可新窗口打开或下载原件。'}
                  </p>
                  <div className="merchant-apps-docs">
                    {selected.license_document_urls.map((url, index) => (
                      <LicenseDocCard
                        key={`${url}-${index}`}
                        url={url}
                        index={index}
                        isEn={isEn}
                        onOpen={setLightboxUrl}
                      />
                    ))}
                  </div>
                </Section>
              )}

              {selected.status !== 'pending' && (selected.review_notes || selected.reviewed_at) && (
                <Section icon="✅" title={isEn ? 'Review record' : '审核记录'}>
                  <div className="merchant-apps-reviewed">
                    {selected.reviewed_at && (
                      <div style={{ marginBottom: '0.35rem' }}>
                        {isEn ? 'Reviewed at' : '审核时间'}: {new Date(selected.reviewed_at).toLocaleString()}
                      </div>
                    )}
                    {selected.review_notes && (
                      <div>
                        {isEn ? 'Notes' : '备注'}: {selected.review_notes}
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {selected.status === 'pending' && (
                <Section icon="✍️" title={isEn ? 'Review actions' : '审核操作'}>
                  <div className="merchant-apps-review-panel">
                    <div className="merchant-apps-field merchant-apps-field--readonly-code">
                      <label htmlFor="preview_store_code">
                        {isEn ? 'Store code * (auto-generated)' : '店铺代码 *（自动生成）'}
                      </label>
                      <input
                        id="preview_store_code"
                        type="text"
                        value={previewStoreCode}
                        readOnly
                        placeholder={isEn ? 'Generated when review opens' : '打开审核时自动生成'}
                      />
                      <p className="merchant-apps-field-hint">
                        {isEn
                          ? `Based on ${REGION_LABELS[selected.region] || selected.region} region prefix`
                          : `根据「${REGION_LABELS[selected.region] || selected.region}」区域前缀自动分配`}
                      </p>
                    </div>
                    <div className="merchant-apps-field">
                      <label htmlFor="review_notes">{isEn ? 'Review notes (optional)' : '审核备注（选填）'}</label>
                      <textarea
                        id="review_notes"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                        placeholder={isEn ? 'Internal notes for this review…' : '填写审核说明，拒绝时可告知原因…'}
                      />
                    </div>
                    <div className="merchant-apps-field">
                      <label htmlFor="custom_password">
                        {isEn ? 'Custom password (optional)' : '自定义密码（选填）'}
                      </label>
                      <div className="merchant-apps-password-row">
                        <input
                          id="custom_password"
                          type={showPassword ? 'text' : 'password'}
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder={isEn ? 'Leave blank to auto-generate' : '留空则自动生成'}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="merchant-apps-btn merchant-apps-btn--ghost"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? (isEn ? 'Hide' : '隐藏') : isEn ? 'Show' : '显示'}
                        </button>
                        <button
                          type="button"
                          className="merchant-apps-btn merchant-apps-btn--ghost"
                          onClick={() => setCustomPassword(generatePassword())}
                        >
                          {isEn ? 'Generate' : '生成'}
                        </button>
                      </div>
                      <p className="merchant-apps-field-hint">
                        {isEn ? 'Minimum 6 characters if set manually' : '手动设置时至少 6 位；留空将自动生成安全密码'}
                      </p>
                    </div>
                  </div>
                </Section>
              )}
            </div>

            <footer className="merchant-apps-modal__foot">
              {selected.status === 'pending' ? (
                <>
                  <button
                    type="button"
                    className="merchant-apps-btn merchant-apps-btn--ghost"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    {isEn ? 'Close' : '关闭'}
                  </button>
                  <button
                    type="button"
                    className="merchant-apps-btn merchant-apps-btn--danger"
                    onClick={() => void handleReject()}
                    disabled={submitting}
                  >
                    {isEn ? 'Reject' : '拒绝'}
                  </button>
                  <button
                    type="button"
                    className="merchant-apps-btn merchant-apps-btn--primary"
                    onClick={() => void handleApprove()}
                    disabled={submitting}
                  >
                    {submitting
                      ? isEn
                        ? 'Processing…'
                        : '处理中…'
                      : isEn
                        ? 'Approve & create account'
                        : '通过并开通账号'}
                  </button>
                </>
              ) : (
                <>
                  {selected.status === 'approved' && selected.provisioned_store_code && (
                    <Link
                      to="/admin/delivery-stores"
                      className="merchant-apps-btn merchant-apps-btn--ghost"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      {isEn ? 'View in stores' : '查看合伙店铺'}
                    </Link>
                  )}
                  <button type="button" className="merchant-apps-btn merchant-apps-btn--ghost" onClick={closeModal}>
                    {isEn ? 'Close' : '关闭'}
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div
          className="merchant-apps-lightbox"
          role="presentation"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={rewritePublicStorageUrl(lightboxUrl)} alt="" />
        </div>
      )}

      {toast && (
        <div className="merchant-apps-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MerchantApplicationsPage;

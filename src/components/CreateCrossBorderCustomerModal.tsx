import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  CROSS_BORDER_HUBS,
  formatCrossBorderRegionLabel,
} from '../utils/crossBorderHubs';
import {
  buildCrossBorderCustomerCode,
  todayIsoDate,
} from '../utils/crossBorderCustomerCode';
import { hubForRegionId, formatSalespersonEmployeeCodeDisplay } from '../utils/crossBorderSalespersons';
import {
  createCrossBorderRegisteredCustomer,
  fetchCrossBorderSalespersons,
  type CrossBorderRegisteredCustomer,
  type CrossBorderSalesperson,
} from '../services/inventoryConsoleService';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: CrossBorderRegisteredCustomer) => void;
};

type FormState = {
  customer_name: string;
  phone: string;
  delivery_region_id: string;
  delivery_area_code: string;
  address_notes: string;
  salesperson_employee_code: string;
  application_date: string;
};

const CreateCrossBorderCustomerModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [regionId, setRegionId] = useState('mandalay');
  const [form, setForm] = useState<FormState>(() => {
    const hub = hubForRegionId('mandalay');
    return {
      customer_name: '',
      phone: '',
      delivery_region_id: hub.regionId,
      delivery_area_code: hub.prefix,
      address_notes: '',
      salesperson_employee_code: '',
      application_date: todayIsoDate(),
    };
  });
  const [salespersons, setSalespersons] = useState<CrossBorderSalesperson[]>([]);
  const [loadingSalespersons, setLoadingSalespersons] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    const hub = hubForRegionId('mandalay');
    setRegionId('mandalay');
    setForm({
      customer_name: '',
      phone: '',
      delivery_region_id: hub.regionId,
      delivery_area_code: hub.prefix,
      address_notes: '',
      salesperson_employee_code: '',
      application_date: todayIsoDate(),
    });

    setLoadingSalespersons(true);
    fetchCrossBorderSalespersons()
      .then((rows) => setSalespersons(rows.filter((row) => row.status === 'active')))
      .catch(() => setSalespersons([]))
      .finally(() => setLoadingSalespersons(false));
  }, [open]);

  const customerCode = useMemo(
    () =>
      buildCrossBorderCustomerCode(
        form.delivery_area_code,
        form.application_date,
        form.salesperson_employee_code,
      ),
    [form.delivery_area_code, form.application_date, form.salesperson_employee_code],
  );

  if (!open) return null;

  const handleRegionChange = (value: string) => {
    const hub = hubForRegionId(value);
    setRegionId(value);
    setForm((prev) => ({
      ...prev,
      delivery_region_id: hub.regionId,
      delivery_area_code: hub.prefix,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      setError(isEn ? 'Enter customer name.' : '请填写客户名称。');
      return;
    }
    if (customerCode && form.customer_name.trim().toUpperCase() === customerCode) {
      setError(
        isEn
          ? 'Customer name cannot be the same as customer code. Use the real name.'
          : '客户姓名不能与客户编码相同，请填写真实姓名。',
      );
      return;
    }
    if (!form.salesperson_employee_code.trim()) {
      setError(isEn ? 'Select salesperson code.' : '请选择推销员编码。');
      return;
    }
    if (!customerCode) {
      setError(isEn ? 'Cannot generate customer code.' : '无法生成客户编码。');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createCrossBorderRegisteredCustomer({
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        delivery_region_id: form.delivery_region_id,
        delivery_area_code: form.delivery_area_code,
        address_notes: form.address_notes.trim(),
        salesperson_employee_code: form.salesperson_employee_code.trim(),
        application_date: form.application_date,
        customer_code: customerCode,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Create failed' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay cbl-customer-create-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="cbl-pricing-modal cbl-customer-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbl-customer-create-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cbl-pricing-modal__head">
          <div>
            <h2 id="cbl-customer-create-title" className="cbl-pricing-modal__title">
              {isEn ? 'Add customer' : '添加客户'}
            </h2>
            <p className="cbl-pricing-modal__sub">
              {isEn
                ? 'Customer code = delivery area + application date (YYMMDD) + salesperson number, e.g. MDY260812005.'
                : '客户编码 = 送货区域短写 + 申请日期 + 推销员序号，如 MDY260812005。'}
            </p>
          </div>
          <button
            type="button"
            className="cbl-pricing-modal__close"
            onClick={onClose}
            aria-label={isEn ? 'Close' : '关闭'}
            disabled={submitting}
          >
            ✕
          </button>
        </header>

        <form className="cbl-customer-create-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="cbl-customer-create-form__scroll">
            <label className="cbl-manual-entry-field">
              <span>{isEn ? 'Customer name' : '客户名称'}</span>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder={isEn ? 'Full name' : '姓名'}
                required
              />
            </label>

            <label className="cbl-manual-entry-field">
              <span>{isEn ? 'Phone' : '电话号码'}</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={isEn ? '09xxxxxxxxx' : '09xxxxxxxxx'}
              />
            </label>

            <label className="cbl-manual-entry-field">
              <span>{isEn ? 'Delivery city' : '送货地址（城市）'}</span>
              <select value={regionId} onChange={(e) => handleRegionChange(e.target.value)}>
                {CROSS_BORDER_HUBS.map((hub) => (
                  <option key={hub.regionId} value={hub.regionId}>
                    {formatCrossBorderRegionLabel(hub, isEn)}
                  </option>
                ))}
              </select>
            </label>

            <label className="cbl-manual-entry-field">
              <span>{isEn ? 'Notes' : '备注'}</span>
              <textarea
                rows={2}
                value={form.address_notes}
                onChange={(e) => setForm({ ...form, address_notes: e.target.value })}
                placeholder={isEn ? 'Street, landmark, etc.' : '街道、地标等详细说明'}
              />
            </label>

            <label className="cbl-manual-entry-field">
              <span>{isEn ? 'Salesperson code' : '推销员编码'}</span>
              <select
                value={form.salesperson_employee_code}
                onChange={(e) => setForm({ ...form, salesperson_employee_code: e.target.value })}
                required
                disabled={loadingSalespersons}
              >
                <option value="">
                  {loadingSalespersons
                    ? isEn
                      ? 'Loading…'
                      : '加载中…'
                    : isEn
                      ? 'Select salesperson'
                      : '请选择推销员'}
                </option>
                {salespersons.map((row) => (
                  <option key={row.id} value={row.employee_code}>
                    {formatSalespersonEmployeeCodeDisplay(row.employee_code)} · {row.name}
                  </option>
                ))}
              </select>
              {!loadingSalespersons && salespersons.length === 0 ? (
                <small className="cbl-field-hint">
                  {isEn
                    ? 'No active salespersons. Add one under Account management first.'
                    : '暂无在职推销员，请先在「跨境账号管理 → 推销员」中添加。'}
                </small>
              ) : null}
            </label>

            <label className="cbl-manual-entry-field">
              <span>{isEn ? 'Application date' : '申请日期'}</span>
              <input
                type="date"
                value={form.application_date}
                onChange={(e) => setForm({ ...form, application_date: e.target.value })}
                required
              />
            </label>

            <label className="cbl-manual-entry-field">
              <span>{isEn ? 'Customer code' : '客户编码'}</span>
              <input type="text" value={customerCode || '—'} readOnly className="cbl-input-readonly" />
              <small className="cbl-field-hint">
                {isEn
                  ? `${form.delivery_area_code || '—'} + ${form.application_date.replace(/-/g, '').slice(2) || '—'} + salesperson #`
                  : `${form.delivery_area_code || '—'} + 申请日期 + 推销员序号`}
              </small>
            </label>

            {error ? (
              <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{error}</div>
            ) : null}
          </div>

          <footer className="cbl-pricing-modal__foot">
            <button type="button" className="cbl-btn cbl-btn--light" onClick={onClose} disabled={submitting}>
              {isEn ? 'Cancel' : '取消'}
            </button>
            <button type="submit" className="cbl-btn cbl-btn--primary" disabled={submitting}>
              {submitting ? (isEn ? 'Saving…' : '保存中…') : isEn ? 'Create' : '创建'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CreateCrossBorderCustomerModal;

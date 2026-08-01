import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  CROSS_BORDER_HUBS,
  formatCrossBorderRegionLabel,
} from '../utils/crossBorderHubs';
import {
  buildSalespersonDraft,
  nextSalespersonEmployeeCode,
  hubForRegionId,
  type SalespersonRef,
} from '../utils/crossBorderSalespersons';
import {
  createCrossBorderSalesperson,
  fetchCrossBorderSalespersonDetail,
  updateCrossBorderSalesperson,
  type CrossBorderSalesperson,
  type CrossBorderSalespersonDraft,
} from '../services/inventoryConsoleService';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
  existingSalespersons: CrossBorderSalesperson[];
  onCreated: (salesperson: CrossBorderSalesperson) => void;
  editId?: string | null;
  onUpdated?: (salesperson: CrossBorderSalesperson) => void;
};

const CreateSalespersonModal: React.FC<Props> = ({
  open,
  onClose,
  existingSalespersons,
  onCreated,
  editId = null,
  onUpdated,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const isEditMode = Boolean(editId);

  const [regionId, setRegionId] = useState('mandalay');
  const [form, setForm] = useState<CrossBorderSalespersonDraft | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyRegionDefaults = useCallback(
    (nextRegion: string) => {
      const refs = existingSalespersons as SalespersonRef[];
      const draft = buildSalespersonDraft(nextRegion, refs);
      setForm((prev) => ({
        ...draft,
        name: prev?.name ?? draft.name,
        phone: prev?.phone ?? draft.phone,
        address: prev?.address ?? draft.address,
        join_date: prev?.join_date ?? draft.join_date,
        status: prev?.status ?? draft.status,
      }));
    },
    [existingSalespersons],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (editId) {
      setLoadingDetail(true);
      setForm(null);
      fetchCrossBorderSalespersonDetail(editId)
        .then((detail) => {
          setRegionId(detail.region_id);
          setForm({
            name: detail.name,
            region_id: detail.region_id,
            work_area_code: detail.work_area_code,
            employee_code: detail.employee_code,
            phone: detail.phone,
            address: detail.address,
            join_date: detail.join_date,
            status: detail.status,
          });
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : isEn ? 'Load failed' : '加载失败');
        })
        .finally(() => setLoadingDetail(false));
      return;
    }

    setRegionId('mandalay');
    applyRegionDefaults('mandalay');
  }, [open, editId, applyRegionDefaults, isEn]);

  if (!open) return null;

  const handleRegionChange = (value: string) => {
    if (isEditMode) return;
    setRegionId(value);
    const hub = hubForRegionId(value);
    const employee_code = nextSalespersonEmployeeCode(
      hub,
      existingSalespersons as SalespersonRef[],
    );
    setForm((prev) =>
      prev
        ? {
            ...prev,
            region_id: hub.regionId,
            work_area_code: hub.prefix,
            employee_code,
          }
        : prev,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (!form.name.trim()) {
      setError(isEn ? 'Enter salesperson name.' : '请填写推销员名称。');
      return;
    }
    if (!form.join_date.trim()) {
      setError(isEn ? 'Select join date.' : '请选择入职日期。');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEditMode && editId) {
        const updated = await updateCrossBorderSalesperson({
          id: editId,
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          join_date: form.join_date.trim(),
          status: form.status,
        });
        onUpdated?.(updated);
        onClose();
        return;
      }

      const created = await createCrossBorderSalesperson({
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? isEn
              ? 'Save failed'
              : '保存失败'
            : isEn
              ? 'Create failed'
              : '创建失败',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedHub = hubForRegionId(regionId);

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay cbl-salesperson-create-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting && !loadingDetail) onClose();
      }}
    >
      <div
        className="cbl-pricing-modal cbl-salesperson-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbl-salesperson-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cbl-pricing-modal__head">
          <div>
            <h2 id="cbl-salesperson-title" className="cbl-pricing-modal__title">
              {isEditMode
                ? isEn
                  ? 'Edit salesperson'
                  : '编辑推销员'
                : isEn
                  ? 'Create salesperson'
                  : '创建推销员'}
            </h2>
            <p className="cbl-pricing-modal__sub">
              {isEditMode
                ? isEn
                  ? 'Update contact details and status. Employee code and work area cannot be changed.'
                  : '修改联系方式与状态。员工编码与工作区域不可更改。'
                  : isEn
                    ? 'Record company salesperson info. Employee code is auto-generated by work area.'
                    : '记录公司推销员信息。选择工作区域后，员工编码从「短写-001」起自动递增。'}
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

        {loadingDetail || !form ? (
          <div className="cbl-salesperson-modal__loading">{isEn ? 'Loading…' : '加载中…'}</div>
        ) : (
          <form className="cbl-customer-create-form" onSubmit={(e) => void handleSubmit(e)}>
            <div className="cbl-customer-create-form__scroll">
              <label className="cbl-manual-entry-field">
                <span>{isEn ? 'Salesperson name' : '推销员名称'}</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={isEn ? 'Full name' : '姓名'}
                  required
                />
              </label>

              <label className="cbl-manual-entry-field">
                <span>{isEn ? 'Work area' : '工作区域'}</span>
                <select
                  value={regionId}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  disabled={isEditMode}
                >
                  {CROSS_BORDER_HUBS.map((hub) => (
                    <option key={hub.regionId} value={hub.regionId}>
                      {formatCrossBorderRegionLabel(hub, isEn)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="cbl-manual-entry-field">
                <span>{isEn ? 'Employee code' : '员工编码'}</span>
                <input type="text" value={form.employee_code} readOnly className="cbl-input-readonly" />
                <small className="cbl-field-hint">
                  {isEn
                    ? `Auto: ${selectedHub.prefix}-001, ${selectedHub.prefix}-002…`
                    : `自动生成：${selectedHub.prefix}-001、${selectedHub.prefix}-002…`}
                </small>
              </label>

              <label className="cbl-manual-entry-field">
                <span>{isEn ? 'Phone' : '手机号码'}</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={isEn ? '09xxxxxxxxx' : '09xxxxxxxxx'}
                />
              </label>

              <label className="cbl-manual-entry-field">
                <span>{isEn ? 'Address' : '地址'}</span>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={isEn ? 'Work or home address' : '工作地址或住址'}
                />
              </label>

              <label className="cbl-manual-entry-field">
                <span>{isEn ? 'Join date' : '入职日期'}</span>
                <input
                  type="date"
                  value={form.join_date}
                  onChange={(e) => setForm({ ...form, join_date: e.target.value })}
                  required
                />
              </label>

              <label className="cbl-manual-entry-field">
                <span>{isEn ? 'Status' : '状态'}</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value === 'inactive' ? 'inactive' : 'active',
                    })
                  }
                >
                  <option value="active">{isEn ? 'Active' : '在职'}</option>
                  <option value="inactive">{isEn ? 'Inactive' : '离职'}</option>
                </select>
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
                {submitting
                  ? isEn
                    ? 'Saving…'
                    : '保存中…'
                  : isEditMode
                    ? isEn
                      ? 'Save'
                      : '保存'
                    : isEn
                      ? 'Create'
                      : '创建'}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default CreateSalespersonModal;

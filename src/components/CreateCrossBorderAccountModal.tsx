import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useLanguage } from '../contexts/LanguageContext';
import { GOOGLE_MAPS_LIBRARIES } from '../constants/googleMaps';
import {
  CROSS_BORDER_HUBS,
  buildCrossBorderAccountDraft,
  formatCrossBorderRegionLabel,
  generateInventoryPassword,
  type TransitStoreRef,
} from '../utils/crossBorderHubs';
import {
  createCrossBorderAccount,
  fetchCrossBorderAccountDetail,
  updateCrossBorderAccount,
  type CrossBorderAccountDraft,
  type CreateCrossBorderAccountResult,
  type InventoryTransitStore,
  type UpdateCrossBorderAccountResult,
} from '../services/inventoryConsoleService';
import '../styles/adminStoreCreateForm.css';
import '../styles/crossBorderLogistics.css';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

type Props = {
  open: boolean;
  onClose: () => void;
  existingStores: InventoryTransitStore[];
  onCreated: (result: CreateCrossBorderAccountResult) => void;
  editStoreCode?: string | null;
  onUpdated?: (result: UpdateCrossBorderAccountResult) => void;
};

const CreateCrossBorderAccountModal: React.FC<Props> = ({
  open,
  onClose,
  existingStores,
  onCreated,
  editStoreCode = null,
  onUpdated,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const isEditMode = Boolean(editStoreCode);

  const [regionId, setRegionId] = useState('mandalay');
  const [form, setForm] = useState<CrossBorderAccountDraft | null>(null);
  const [accountStatus, setAccountStatus] = useState('active');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 21.9588, lng: 96.0891 });

  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const applyRegionDefaults = useCallback(
    (nextRegion: string) => {
      const draft = buildCrossBorderAccountDraft(
        nextRegion,
        existingStores as TransitStoreRef[],
        isEn,
      );
      setForm({
        store_name: draft.store_name,
        store_code: draft.store_code,
        region: draft.region,
        hubCode: draft.hubCode,
        address: draft.address,
        latitude: draft.latitude,
        longitude: draft.longitude,
        phone: draft.phone,
        email: draft.email,
        manager_name: draft.manager_name,
        manager_phone: draft.manager_phone,
        operating_hours: draft.operating_hours,
        password: draft.password,
        notes: draft.notes,
        service_area_radius: draft.service_area_radius,
        capacity: draft.capacity,
        facilities: draft.facilities,
        cod_settlement_day: draft.cod_settlement_day,
      });
      setMapCenter({ lat: draft.latitude, lng: draft.longitude });
    },
    [existingStores, isEn],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setShowMapModal(false);

    if (editStoreCode) {
      setLoadingDetail(true);
      setForm(null);
      fetchCrossBorderAccountDetail(editStoreCode)
        .then((detail) => {
          setRegionId(detail.region);
          setAccountStatus(detail.status || 'active');
          setForm({
            store_name: detail.store_name,
            store_code: detail.store_code,
            region: detail.region,
            hubCode: detail.hubCode,
            address: detail.address,
            latitude: detail.latitude,
            longitude: detail.longitude,
            phone: detail.phone,
            email: detail.email,
            manager_name: detail.manager_name,
            manager_phone: detail.manager_phone,
            operating_hours: detail.operating_hours,
            password: '',
            notes: detail.notes,
            service_area_radius: detail.service_area_radius,
            capacity: detail.capacity,
            facilities: detail.facilities,
            cod_settlement_day: detail.cod_settlement_day,
          });
          setMapCenter({ lat: detail.latitude, lng: detail.longitude });
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : isEn ? 'Load failed' : '加载失败');
        })
        .finally(() => setLoadingDetail(false));
      return;
    }

    setRegionId('mandalay');
    setAccountStatus('active');
    applyRegionDefaults('mandalay');
  }, [open, editStoreCode, applyRegionDefaults, isEn]);

  if (!open) return null;

  const handleRegionChange = (value: string) => {
    if (isEditMode) return;
    setRegionId(value);
    applyRegionDefaults(value);
  };

  const openMapPicker = () => {
    if (!form) return;
    setMapCenter({ lat: form.latitude, lng: form.longitude });
    setShowMapModal(true);
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    setForm((prev) => (prev ? { ...prev, latitude: lat, longitude: lng } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isEditMode) {
        const result = await updateCrossBorderAccount({
          store_code: form.store_code,
          store_name: form.store_name,
          address: form.address,
          latitude: form.latitude,
          longitude: form.longitude,
          phone: form.phone,
          email: form.email,
          manager_name: form.manager_name,
          manager_phone: form.manager_phone,
          operating_hours: form.operating_hours,
          notes: form.notes,
          service_area_radius: form.service_area_radius,
          capacity: form.capacity,
          facilities: form.facilities,
          cod_settlement_day: form.cod_settlement_day,
          status: accountStatus,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
        onUpdated?.(result);
        onClose();
        return;
      }

      const result = await createCrossBorderAccount(form);
      onCreated(result);
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

  const mapModal =
    showMapModal && form
    ? createPortal(
        <div
          className="store-form-map-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMapModal(false);
          }}
        >
          <div
            className="store-form-map-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cbl-map-title"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <h2
                id="cbl-map-title"
                style={{
                  margin: 0,
                  color: '#A5C7FF',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                }}
              >
                {isEn ? 'Select location on map' : '地图中选择位置'}
              </h2>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
                aria-label={isEn ? 'Close' : '关闭'}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                margin: '0 0 1rem',
                color: 'rgba(255, 255, 255, 0.88)',
                fontSize: '0.86rem',
                lineHeight: 1.5,
              }}
            >
              {isEn
                ? 'Click on the map to set coordinates for this cross-border station.'
                : '在地图上点击选点，将自动更新站点经纬度坐标。'}
            </p>

            <div
              style={{
                width: '100%',
                height: '380px',
                borderRadius: 14,
                overflow: 'hidden',
                marginBottom: '1rem',
                border: '2px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {!GOOGLE_MAPS_API_KEY ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  {isEn
                    ? 'Google Maps API key is not configured.'
                    : '未配置 Google Maps API Key'}
                </div>
              ) : !isMapLoaded ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  {isEn ? 'Loading map…' : '地图加载中…'}
                </div>
              ) : mapLoadError ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fecaca',
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  {isEn ? 'Map failed to load.' : '地图加载失败'}
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={13}
                  onClick={handleMapClick}
                >
                  <Marker position={{ lat: form.latitude, lng: form.longitude }} />
                </GoogleMap>
              )}
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '0.85rem 1rem',
                borderRadius: 10,
                marginBottom: '1rem',
                color: 'rgba(255, 255, 255, 0.92)',
                fontSize: '0.86rem',
              }}
            >
              {isEn ? 'Selected' : '已选坐标'}：
              {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                type="button"
                className="store-form-btn store-form-btn--primary"
                onClick={() => setShowMapModal(false)}
              >
                {isEn ? 'Confirm location' : '确认位置'}
              </button>
              <button
                type="button"
                className="store-form-btn store-form-btn--ghost"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}
                onClick={() => setShowMapModal(false)}
              >
                {isEn ? 'Cancel' : '取消'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return createPortal(
    <>
      <div
        className="store-form-overlay cbl-create-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting && !loadingDetail) onClose();
        }}
      >
        <div
          className="store-form-modal cbl-create-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cbl-create-title"
        >
          <div className="cbl-create-modal__banner">
            <div className="cbl-create-modal__banner-row">
              <div>
                <h2 id="cbl-create-title" className="cbl-create-modal__title">
                  {isEditMode
                    ? isEn
                      ? 'Edit cross-border account'
                      : '编辑跨境账号'
                    : isEn
                      ? 'Create cross-border account'
                      : '创建跨境账号'}
                </h2>
                <p className="cbl-create-modal__sub">
                  {isEditMode
                    ? isEn
                      ? 'Update station details. Login store code and region cannot be changed.'
                      : '修改站点资料。登录店铺代码与区域不可更改。'
                    : isEn
                      ? 'Inventory App login: store code + password. Fill in station details below.'
                      : '用于 Inventory App 登录（店铺代码 + 密码）。请确认站点资料后创建。'}
                </p>
              </div>
              <button
                type="button"
                className="cbl-create-modal__close"
                aria-label="关闭"
                onClick={onClose}
                disabled={submitting}
              >
                ×
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="store-form-modal__form">
            <div className="cbl-create-modal__body" style={{ overflowY: 'auto', minHeight: 0 }}>
              {error && (
                <div className="store-form-alert store-form-alert--error" role="alert">
                  {error}
                </div>
              )}

              {loadingDetail && !form ? (
                <div className="cbl-empty" style={{ padding: '2rem 0' }}>
                  {isEn ? 'Loading account…' : '加载账号信息…'}
                </div>
              ) : form ? (
                <>
              <section className="cbl-create-section">
                <h3 className="cbl-create-section__title">
                  {isEn ? 'Region' : '区域与登录'}
                </h3>
                <div className="cbl-create-grid">
                  <div className="cbl-create-field">
                    <label>{isEn ? 'Region' : '区域'} *</label>
                    <select
                      value={regionId}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      disabled={isEditMode}
                    >
                      {CROSS_BORDER_HUBS.map((h) => (
                        <option key={h.regionId} value={h.regionId}>
                          {formatCrossBorderRegionLabel(h, isEn)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cbl-create-field">
                    <label>{isEn ? 'Login store code' : '登录店铺代码'} *</label>
                    <input value={form.store_code} readOnly />
                  </div>
                  {isEditMode && (
                    <div className="cbl-create-field">
                      <label>{isEn ? 'Status' : '账号状态'}</label>
                      <select
                        value={accountStatus}
                        onChange={(e) => setAccountStatus(e.target.value)}
                      >
                        <option value="active">{isEn ? 'Active' : '启用'}</option>
                        <option value="inactive">{isEn ? 'Inactive' : '停用'}</option>
                      </select>
                    </div>
                  )}
                  <div className="cbl-create-field cbl-create-field--full">
                    <label>{isEn ? 'Station name' : '站点名称'} *</label>
                    <input
                      value={form.store_name}
                      onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="cbl-create-section">
                <h3 className="cbl-create-section__title">
                  {isEn ? 'Station details' : '站点资料'}
                </h3>
                <div className="cbl-create-grid">
                  <div className="cbl-create-field cbl-create-field--full">
                    <label>{isEn ? 'Address' : '地址'} *</label>
                    <input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      required
                    />
                  </div>
                  <div className="cbl-create-field">
                    <label>{isEn ? 'Coordinates' : '坐标'}</label>
                    <div className="cbl-create-coords">
                      <input
                        readOnly
                        value={`${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)}`}
                      />
                      <button
                        type="button"
                        className="cbl-create-coords__btn"
                        onClick={openMapPicker}
                      >
                        {isEn ? 'Pick on map' : '地图中选择'}
                      </button>
                    </div>
                  </div>
                  <div className="cbl-create-field">
                    <label>{isEn ? 'Operating hours' : '营业时间'}</label>
                    <input
                      value={form.operating_hours}
                      onChange={(e) => setForm({ ...form, operating_hours: e.target.value })}
                    />
                  </div>
                  <div className="cbl-create-field">
                    <label>{isEn ? 'Phone' : '联系电话'} *</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="cbl-create-field">
                    <label>{isEn ? 'Manager' : '负责人'} *</label>
                    <input
                      value={form.manager_name}
                      onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="cbl-create-field">
                    <label>{isEn ? 'Manager phone' : '负责人手机'} *</label>
                    <input
                      value={form.manager_phone}
                      onChange={(e) => setForm({ ...form, manager_phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="cbl-create-field">
                    <label>{isEn ? 'Email' : '邮箱'}</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="cbl-create-section">
                <h3 className="cbl-create-section__title">
                  {isEditMode
                    ? isEn
                      ? 'Inventory App password (optional)'
                      : 'Inventory 登录密码（可选）'
                    : isEn
                      ? 'Inventory App password'
                      : 'Inventory 登录密码'}
                </h3>
                <div className="cbl-create-field">
                  <label>
                    {isEn ? 'Password' : '登录密码'}
                    {isEditMode ? (isEn ? ' (leave blank to keep)' : '（留空则不修改）') : ' *'}
                  </label>
                  <div className="cbl-create-password-row">
                    <input
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required={!isEditMode}
                      minLength={isEditMode ? undefined : 6}
                    />
                    <button
                      type="button"
                      className="store-form-btn store-form-btn--ghost"
                      onClick={() =>
                        setForm({ ...form, password: generateInventoryPassword() })
                      }
                    >
                      {isEn ? 'Regenerate' : '重新生成'}
                    </button>
                  </div>
                  <p className="cbl-create-hint">
                    {isEditMode
                      ? isEn
                        ? 'Only fill in when resetting the station login password.'
                        : '仅在需要重置站点登录密码时填写。'
                      : isEn
                        ? 'Station staff uses store code + this password in Inventory App.'
                        : '站点人员在 Inventory App 使用店铺代码 + 此密码登录。'}
                  </p>
                </div>
                <div className="cbl-create-field" style={{ marginTop: 10 }}>
                  <label>{isEn ? 'Notes' : '备注'}</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </section>
                </>
              ) : null}
            </div>

            <div className="cbl-create-modal__foot">
              <button
                type="button"
                className="store-form-btn store-form-btn--ghost"
                onClick={onClose}
                disabled={submitting || loadingDetail}
              >
                {isEn ? 'Cancel' : '取消'}
              </button>
              <button
                type="submit"
                className="store-form-btn store-form-btn--primary"
                disabled={submitting || loadingDetail || !form}
              >
                {submitting
                  ? isEditMode
                    ? isEn
                      ? 'Saving…'
                      : '保存中…'
                    : isEn
                      ? 'Creating…'
                      : '创建中…'
                  : isEditMode
                    ? isEn
                      ? 'Save changes'
                      : '保存修改'
                    : isEn
                      ? 'Create account'
                      : '创建账号'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {mapModal}
    </>,
    document.body,
  );
};

export default CreateCrossBorderAccountModal;
